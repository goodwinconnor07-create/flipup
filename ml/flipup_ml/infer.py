"""Strict flop-domain inference. No solving, size snapping or remote fallback."""
import argparse
import json
from pathlib import Path
import numpy as np
import torch
from . import ROOT, SPOTS
from .features import feature_rows, slots_for
from .model import EVModel, predict as model_predict
from flipup_gto.cards import parse_cards, combo_cards, combo_index, combo_str
from flipup_gto.flop_library import canonical, map_combo

class UnsupportedInput(ValueError): pass

class Predictor:
    def __init__(self,checkpoint=ROOT/'ml/out/model.pt'):
        self.artifact=torch.load(checkpoint,map_location='cpu',weights_only=True)
        self.domain=self.artifact['domain']; self.model=EVModel(self.artifact['input_dim'])
        self.model.load_state_dict(self.artifact['state_dict']); self.model.eval()
        torch.set_num_threads(4)

    def predict(self,spot,board,path,hand=None,*,players=2,street='flop',stack=None,rake=0.,rake_cap=0.):
        if spot not in SPOTS: raise UnsupportedInput('Not one of the six supported spot names')
        if players!=2: raise UnsupportedInput('Only heads-up (two players) supported')
        if street!='flop': raise UnsupportedInput('Only flop street supported')
        if rake!=0 or rake_cap!=0: raise UnsupportedInput('Any rake is outside the domain')
        if spot not in self.domain: raise UnsupportedInput('No training data for this spot')
        info=self.domain[spot]
        if stack is not None:
            try: valid_stack=bool(np.isfinite(stack) and abs(stack-info['stack'])<=.01)
            except (ValueError,TypeError): valid_stack=False
            if not valid_stack: raise UnsupportedInput(f'Stack must equal stored flop-start stack {info["stack"]} bb within 0.01 bb')
        try:
            b=parse_cards(board)
            if len(b)!=3 or any(type(c) is not int or c<0 or c>=52 for c in b): raise ValueError('three distinct cards in 0..51 required')
        except (ValueError,TypeError) as exc: raise UnsupportedInput('Invalid board: '+str(exc)) from exc
        name,perm=canonical(b); cb=tuple(parse_cards(name))
        if any(not set(combo_cards(c))&set(cb) for c in info.get('unresolved_combos',[])):
            raise UnsupportedInput('Root range is unknown for hands blocked on every training board')
        if not isinstance(path,(list,tuple)): raise UnsupportedInput('Path must be a list of exact labels, indices or action objects')
        if len(path)>3: raise UnsupportedInput('Path deeper than three actions')
        key=''
        for token in path:
            n=info['nodes'].get(key)
            if n is None: raise UnsupportedInput('Path leaves the stored flop tree')
            if type(token) is int:
                index=token
            elif isinstance(token,str):
                if token not in n['labels']: raise UnsupportedInput('Action label/size is not in the stored tree')
                index=n['labels'].index(token)
            elif isinstance(token,dict):
                if set(token)-{'type','amount','all_in'} or 'type' not in token: raise UnsupportedInput('Unrecognised action fields')
                if token['type'] in ('bet','raise','call') and 'amount' not in token: raise UnsupportedInput('Action amount required, in bb')
                try:
                    amount=float(token.get('amount',0.))
                    matches=[i for i,a in enumerate(n['actions']) if a['type']==token['type'] and np.isfinite(amount) and abs(a['amount']-amount)<1e-6 and ('all_in' not in token or a['all_in']==token['all_in'])]
                except (ValueError,TypeError): matches=[]
                if len(matches)!=1: raise UnsupportedInput('Action type/size is not exactly in the stored tree')
                index=matches[0]
            else: raise UnsupportedInput('Unrecognised action token')
            if index<0 or index>=len(n['actions']): raise UnsupportedInput('Action index outside stored tree')
            key=(key+'.' if key else '')+str(index)
        if key not in info['nodes']: raise UnsupportedInput('No stored flop decision at this path')
        n=info['nodes'][key]; p=n['player']
        roots=[np.array([v if v is not None else 0. for v in r],np.float32) for r in info['roots']]
        # Block both ranges by the query board; never use deeper solved reaches.
        for r in roots:
            for c in np.flatnonzero(r):
                if set(combo_cards(int(c))) & set(cb): r[c]=0
        if hand is not None:
            try:
                hc=parse_cards(hand)
                if len(hc)!=2 or any(type(c) is not int or c<0 or c>=52 for c in hc): raise ValueError('two distinct hole cards required')
            except (ValueError,TypeError) as exc: raise UnsupportedInput('Invalid hand: '+str(exc)) from exc
            if set(hc)&set(b): raise UnsupportedInput('Hand conflicts with board')
            c=map_combo(combo_index(*hc),perm)
            if roots[p][c]<=0: raise UnsupportedInput('Hand is not in the actor root range')
            cs=np.array([c])
        else: cs=np.flatnonzero(roots[p])
        if not len(cs) or roots[1-p].sum()<=0: raise UnsupportedInput('No compatible root range on this board')
        meta={'nodes':info['nodes'],'pot':info['pot'],'stack':info['stack']}
        x,mask,_,_=feature_rows(spot,cb,meta,key,cs,roots,self.artifact['equity_samples'])
        ev,s=model_predict(self.model,{'x':x,'mask':np.tile(mask,(len(cs),1)),'pot':np.full(len(cs),n['pot'])})
        inverse=tuple(perm.index(i) for i in range(4)); slots=slots_for(meta,key)
        return {'supported':True,'evidence':'synthetic_fixture_only' if self.artifact['synthetic'] else 'experimental_model','spot':spot,'board':board,'path':list(path),'pot_bb':n['pot'],'hands':[{'hand':combo_str(map_combo(int(c),inverse)),'actions':[{'label':label,'ev_bb':float(ev[i,slot]),'strategy':float(s[i,slot])} for label,slot in zip(n['labels'],slots)]} for i,c in enumerate(cs)]}

def predict(spot,board,path,hand=None,**kwargs):
    return Predictor().predict(spot,board,path,hand,**kwargs)

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--checkpoint',default=str(ROOT/'ml/out/model.pt')); ap.add_argument('--spot',required=True); ap.add_argument('--board',required=True); ap.add_argument('--path',default='[]',help='JSON list of exact indices/labels/actions'); ap.add_argument('--hand'); ap.add_argument('--players',type=int,default=2); ap.add_argument('--street',default='flop'); ap.add_argument('--stack',type=float); ap.add_argument('--rake',type=float,default=0); ap.add_argument('--rake-cap',type=float,default=0)
    a=ap.parse_args()
    try: result=Predictor(a.checkpoint).predict(a.spot,a.board,json.loads(a.path),a.hand,players=a.players,street=a.street,stack=a.stack,rake=a.rake,rake_cap=a.rake_cap)
    except UnsupportedInput as exc: ap.exit(2,'UnsupportedInput: '+str(exc)+'\n')
    print(json.dumps(result,indent=2))

if __name__=='__main__': main()

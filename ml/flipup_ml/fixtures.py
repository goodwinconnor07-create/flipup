"""Appendix-B invented ranges. Local solver fixtures, NEVER empirical ML evidence."""
import argparse
import json
from pathlib import Path
import time
import numpy as np
from . import ROOT
from flipup_gto.solver import PostflopSolver
from flipup_gto.custom import explorer_sizing
from flipup_gto.cards import parse_cards, hand_class, all_hand_classes
from flipup_gto.flop_library import canonical

BOARDS=['Ks7d2c','Ah9h4c','QdJs5c','Tc8c6c','AdAc3h','KhKd8s','Jh9h2h','9s6d3c','8d7d4s','QsQc6h','AsTs5s','Jc8d4h']
OOP='22+,A2s+,K5s+,Q8s+,J8s+,T8s+,97s+,87s,76s,65s,A8o+,KTo+,QJo'
IP='22+,A2s+,K2s+,Q4s+,J6s+,T6s+,96s+,85s+,75s+,64s+,54s,A2o+,K8o+,Q9o+,J9o+,T9o'

def generate(out,count=12):
    out=Path(out)/'btn_bb'; out.mkdir(parents=True,exist_ok=True)
    ledger=ROOT/'ml/out/local_solves.json'
    runs=json.loads(ledger.read_text()) if ledger.exists() else []
    for text in BOARDS[:count]:
        name,_=canonical(parse_cards(text))
        target=out/(name+'.npz')
        if target.exists(): continue
        if len(runs)>=20: raise RuntimeError('20 local solve cap reached')
        runs.append({'board':name,'purpose':'synthetic fixture','status':'started'})
        ledger.write_text(json.dumps(runs,indent=2))
        started=time.perf_counter()
        s=PostflopSolver(name,5.5,97.5,OOP,IP,sizing=explorer_sizing('flop',oop_leads=False),compress=True,threads=4)
        st=s.solve(200,.5,20)
        arrays={}; nodes={}; queue=[[]]
        while queue:
            tokens=queue.pop(0)
            n=s.node(tokens,with_equity=False,with_ev=True)
            if n.type!='action' or n.info['street']!=0: continue
            key='.'.join(map(str,tokens)); p=n.player
            for prefix,source in [('s','strategy'),('e','action_ev'),('r',f'reach{p}')]:
                arrays[prefix+':'+key]=np.asarray(n.info[source],dtype=np.float16)
            nodes[key]={'player':p,'labels':n.labels,'pot':float(n.pot),'actions':[{'type':a['type'],'amount':float(a['amount']),'all_in':bool(a['all_in'])} for a in n.actions]}
            if len(tokens)<3: queue += [tokens+[i] for i in range(len(n.actions))]
        root=s.node([],with_equity=True,with_ev=True)
        real=np.zeros((2,3,169),np.float64)
        classes=all_hand_classes()
        for p in (0,1):
            for i,c in enumerate(root.info[f'combos{p}']):
                ci=classes.index(hand_class(c)); w=root.info[f'weight{p}'][i]
                real[p,0,ci]+=w*root.info[f'ev{p}'][i]/5.5
                real[p,1,ci]+=w*root.info[f'equity{p}'][i]
                real[p,2,ci]+=w
            arrays[f'combos{p}']=np.asarray(root.info[f'combos{p}'],np.int16)
            arrays[f'equity{p}']=np.asarray(root.info[f'equity{p}'],np.float16)
        meta={'pot':5.5,'stack':97.5,'nodes':nodes,'iterations':st.iteration,'exploitability_pct':st.exploitability_pct,'synthetic':True,'invented_ranges':{'oop':OOP,'ip':IP}}
        np.savez_compressed(target,meta=json.dumps(meta),realization=real.astype(np.float32),**arrays)
        runs[-1].update(status='completed',seconds=time.perf_counter()-started,exploitability_pct=st.exploitability_pct)
        ledger.write_text(json.dumps(runs,indent=2))
        print(name,runs[-1],flush=True)

if __name__=='__main__':
    ap=argparse.ArgumentParser(); ap.add_argument('--out',default='ml/data/fixtures'); ap.add_argument('--count',type=int,default=12)
    args=ap.parse_args(); generate(args.out,args.count)

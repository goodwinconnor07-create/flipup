"""Pure stored-library extraction. No engine imports, tree builds or solver iterations."""
import hashlib
import json
import numpy as np
from .cards import parse_cards,combo_cards,card_str
from .value_data import digest,split_for

FEATURES='library-flop-policy-v1'
CONTEXT=218
MAX_ACTIONS=16
KINDS=['fold','check','call','bet','raise']


def load_questions(path,per_node=4,max_gap=.5):
    """Return varied decisions with explicit limited-tree provenance, never invented missing EVs."""
    sha=hashlib.sha256(path.read_bytes()).hexdigest()
    board=parse_cards(path.stem)
    if len(board)!=3 or len(set(board))!=3:raise ValueError('invalid flop filename')
    with np.load(path,allow_pickle=False) as data:
        meta=json.loads(str(data['meta']));nodes=meta['nodes']
        gap=float(meta['exploitability_pct'])
        if not np.isfinite(gap) or not 0<=gap<=max_gap:raise ValueError('stored convergence exceeds acceptance threshold')
        combos=[np.asarray(data['combos'+str(p)],dtype=int) for p in (0,1)]
        for cs in combos:
            if len(set(cs))!=len(cs) or any(c<0 or c>=1326 or set(combo_cards(int(c)))&set(board) for c in cs):raise ValueError('invalid/blocked combo list')
        initial={}
        for key in sorted(nodes,key=lambda k:(len(k.split('.')) if k else 0,k)):
            actor=nodes[key]['player']
            if actor not in (0,1):raise ValueError('invalid actor')
            if actor not in initial and (not key or len(key.split('.'))==1):initial[actor]=np.asarray(data['r:'+key],dtype=float)
        if len(initial)!=2:raise ValueError('both initial ranges are required')
        questions=[]
        for key,node in sorted(nodes.items()):
            ranges=[initial[p].copy() for p in (0,1)];wagers=[0.,0.];history=[];checks=0
            for depth,index in enumerate(map(int,key.split('.')) if key else []):
                ancestor='.'.join(key.split('.')[:depth]);prev=nodes[ancestor];actor=prev['player']
                action=prev['actions'][index]
                if action['type']=='fold':raise ValueError('stored decision after fold')
                ranges[actor]*=np.asarray(data['s:'+ancestor],dtype=float)[index]
                if action['type']!='check':wagers[actor]=float(action['amount'])
                closed=(action['type']=='check' and checks==1) or (action['type']=='call' and abs(wagers[0]-wagers[1])<1e-6)
                if closed:raise ValueError('stored decision continues beyond the flop betting boundary')
                checks=checks+1 if action['type']=='check' else 0
                history.append(dict(player=actor,**action))
            actor=node['player'];actions=node['actions'];pot=float(node['pot']);stack=float(meta['stack'])
            if not np.isfinite([pot,stack,*wagers]).all() or pot<=0 or stack<=0:raise ValueError('invalid pot/stack')
            if abs(pot-float(meta['pot'])-sum(wagers))>1e-3:raise ValueError('stored pot/history mismatch')
            policy=np.asarray(data['s:'+key],dtype=float);ev=np.asarray(data['e:'+key],dtype=float)
            if not 2<=len(actions)<=MAX_ACTIONS:continue
            if policy.shape!=(len(actions),len(combos[actor])) or ev.shape!=policy.shape:raise ValueError('invalid action arrays')
            if not np.isfinite(policy).all() or not np.isfinite(ev).all() or (policy<0).any() or not np.allclose(policy.sum(0),1,atol=.003):raise ValueError('invalid stored labels')
            for p in (0,1):
                if ranges[p].shape!=(len(combos[p]),) or not np.isfinite(ranges[p]).all() or (ranges[p]<0).any():raise ValueError('invalid reaches')
            rows=[]
            opp=1-actor;opp_mass=np.zeros(52);opp_pairs={int(c):float(w) for c,w in zip(combos[opp],ranges[opp])}
            for c,w in opp_pairs.items():opp_mass[list(combo_cards(c))]+=w
            for i,combo in enumerate(combos[actor]):
                if ranges[actor][i]<=1e-10:continue
                # Avoid mining apparent mixes from effectively unreachable preflop hands.
                if ranges[actor][i]/max(ranges[actor].sum(),1e-30)<.0001:continue
                cards=combo_cards(int(combo))
                compatible=ranges[opp].sum()-opp_mass[cards[0]]-opp_mass[cards[1]]+opp_pairs.get(int(combo),0)
                if compatible<=1e-10:continue
                probs=policy[:,i]/policy[:,i].sum()
                entropy=float(-np.sum(probs*np.log(np.maximum(probs,1e-30))))
                close=float(np.sort(ev[:,i])[-1]-np.sort(ev[:,i])[-2])/pot
                rows.append((entropy-(min(close,1)),digest([sha,key,int(combo)]),i,probs))
            # Mix difficult and ordinary spots; never sample by displayed percentages alone.
            rows.sort(reverse=True,key=lambda row:(row[0],row[1]))
            selected=rows[:max(1,per_node//2)]
            selected+=sorted(rows[len(selected):],key=lambda row:row[1])[:per_node-len(selected)]
            for score,_,i,probs in selected:
                combo=int(combos[actor][i]);opts=[]
                af=np.zeros((MAX_ACTIONS,8),np.float32);mask=np.zeros(MAX_ACTIONS,bool)
                for j,a in enumerate(actions):
                    kind=a['type'];amount=float(a['amount']);added=0 if kind in ('check','fold') else amount-wagers[actor]
                    if kind not in KINDS or added<0:raise ValueError('invalid action')
                    af[j,KINDS.index(kind)]=1;af[j,5:]=[amount/pot,added/pot,float(a['all_in'])];mask[j]=True
                    opts.append(dict(kind='allin' if a['all_in'] else kind,to=amount,added=added,freq=float(probs[j]),ev=float(ev[j,i])))
                visible=np.zeros((2,52),np.float32);visible[0,board]=1;visible[1,list(combo_cards(combo))]=1
                marginal=np.zeros((2,52),np.float32)
                for p in (0,1):
                    total=ranges[p].sum()
                    if total<=0:raise ValueError('zero reached range')
                    for c,w in zip(combos[p],ranges[p]/total):
                        marginal[p,list(combo_cards(int(c)))]+=w
                state=[actor,np.log1p(pot),stack/pot,*[w/pot for w in wagers],(max(wagers)-wagers[actor])/pot,len(history)/10,1.,0.,0.]
                context=np.concatenate([visible.ravel(),marginal.ravel(),state]).astype(np.float32)
                target=np.zeros(MAX_ACTIONS,np.float32);values=np.zeros(MAX_ACTIONS,np.float32)
                target[:len(actions)]=probs;values[:len(actions)]=ev[:,i]/pot
                q=dict(schema='library-question-v1',id='lq-'+digest([sha,key,combo])[:24],players=2,hero=actor,
                       cards=[card_str(c) for c in combo_cards(combo)],board=[card_str(c) for c in board],
                       pot=pot,stacks=[stack-w for w in wagers],wagers=wagers,toCall=max(wagers)-wagers[actor],history=history,
                       options=opts,difficulty='mixed' if max(probs)<.9 else 'close' if score>-.025 else 'standard',
                       source=dict(file=path.name,matchup=path.parent.name,sha256=sha,node=key,gapPct=gap,iterations=int(meta['iterations']),
                                   heroReach=float(ranges[actor][i]),heroRangeShare=float(ranges[actor][i]/ranges[actor].sum()),
                                   model='existing flop-library betting abstraction; future-street simplifications retained',precision='float16'),
                       publicationApproved=False)
                questions.append((q,dict(context=context,actions=af,mask=mask,target=target,ev=values),board))
        return sha,questions

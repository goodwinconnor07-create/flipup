#!/usr/bin/env python3
"""Read-only legacy flop reuse. Extract real closed betting lines; optionally refine on a laptop.

No absent node is assumed to be a street boundary. Every output stays unapproved:
legacy range provenance and float16 quantization are inherited, not erased by refinement.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
import time
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from flipup_gto.cards import parse_cards,combo_cards
from flipup_gto.value_data import atomic_json


def checkpoint(out, state, backup=None, run=None):
    """Keep local progress even when the private backup service is unavailable."""
    state['updated']=time.time()
    atomic_json(out/'status.json',state)
    if backup is None:
        state['backup']='local only; upload credentials not configured'
    else:
        try:
            backup.push(out,run)
            state['backup']='uploaded'
            state['lastBackup']=time.time()
            state.pop('backupError',None)
        except Exception as exc:
            state['backup']='pending retry'
            state['backupError']=str(exc)
    atomic_json(out/'status.json',state)


def boundaries(data):
    meta=json.loads(str(data['meta']));nodes=meta['nodes'];initial={}
    for key in sorted(nodes,key=lambda k:len(k.split('.')) if k else 0):
        p=nodes[key]['player']
        if p not in initial:
            # Only a player's FIRST decision can contain that player's initial range.
            if key and len(key.split('.'))!=1:continue
            initial[p]=np.asarray(data['r:'+key],dtype=float)
    if set(initial)!={0,1}:return
    pending=[('',[initial[0],initial[1]],[0.,0.],0,[])]
    while pending:
        key,ranges,wagers,checks,path=pending.pop();node=nodes[key];p=node['player']
        policy=np.asarray(data['s:'+key],dtype=float)
        if policy.shape!=(len(node['actions']),len(data['combos'+str(p)])):raise ValueError('invalid policy shape')
        if not np.isfinite(policy).all() or (policy<0).any():raise ValueError('invalid policy values')
        if not np.allclose(policy.sum(0),1,atol=.003):raise ValueError('stored policy does not normalize')
        for i,a in enumerate(node['actions']):
            if a['type']=='fold':continue
            reached=[r.copy() for r in ranges];reached[p]*=policy[i]
            if min(r.sum() for r in reached)<=0:continue
            amounts=list(wagers)
            if a['type'] in ('bet','raise','call'):amounts[p]=float(a['amount'])
            line=path+[dict(player=p,type=a['type'],amount=float(a['amount']))]
            closed=(a['type']=='call' and abs(amounts[0]-amounts[1])<1e-6) or (a['type']=='check' and checks==1)
            if closed:
                if abs(amounts[0]-amounts[1])>1e-6:raise ValueError('unequal closed wagers')
                stack=meta['stack']-amounts[0]
                if stack>1e-8:yield dict(ranges=reached,pot=meta['pot']+sum(amounts),stack=stack,path=line)
                continue
            child=(key+'.' if key else '')+str(i)
            if child in nodes:pending.append((child,reached,amounts,checks+1 if a['type']=='check' else 0,line))


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--library',type=Path,required=True);p.add_argument('--out',type=Path,required=True)
    p.add_argument('--hours',type=float,default=48);p.add_argument('--max-roots',type=int,default=10000)
    p.add_argument('--turns-per-line',type=int,default=2);p.add_argument('--solve',action='store_true');p.add_argument('--memory-mb',type=int,default=1536)
    p.add_argument('--backup-run',help='Private artifact namespace; requires configured coach credentials')
    a=p.parse_args();source=a.library.expanduser().resolve();out=a.out.expanduser().resolve()
    if not source.is_dir():raise ValueError('flop library directory does not exist')
    if source==out or source in out.parents:raise ValueError('output must be outside the original library')
    if min(a.hours,a.max_roots,a.turns_per_line,a.memory_mb)<=0:raise ValueError('positive limits required')
    out.mkdir(parents=True,exist_ok=True);start=time.time();count=0;inventory=[]
    import fcntl
    lock=(out/'.reuse.lock').open('w');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    backup=None
    if a.backup_run and os.environ.get('FLIPUP_UPLOAD_TOKEN') and os.environ.get('FLIPUP_COACH'):
        from campaign_sync import Artifacts
        backup=Artifacts()
    state=dict(stage='starting',roots=0,files=0,publicationApproved=False)
    checkpoint(out,state,backup,a.backup_run)
    last_backup=time.time()
    for path in sorted(source.glob('*/*.npz')):
        if time.time()-start>a.hours*3600 or count>=a.max_roots:break
        row=dict(file=str(path.relative_to(source)),publicationApproved=False)
        try:
            board=parse_cards(path.stem)
            if len(board)!=3:continue
            sha=hashlib.sha256(path.read_bytes()).hexdigest();row['sha256']=sha
            with np.load(path,allow_pickle=False) as data:
                meta=json.loads(str(data['meta']));row.update(iterations=meta.get('iterations'),reportedGapPct=meta.get('exploitability_pct'),engine=meta.get('engine','unknown'))
                for j,b in enumerate(boundaries(data)):
                    remaining=sorted(set(range(52))-set(board),key=lambda c:hashlib.sha256(f'{sha}:{j}:{c}'.encode()).hexdigest())
                    for turn in remaining[:a.turns_per_line]:
                        if count>=a.max_roots or time.time()-start>a.hours*3600:break
                        ranges=[]
                        for actor in range(2):
                            full=np.zeros(1326);full[np.asarray(data['combos'+str(actor)],dtype=int)]=b['ranges'][actor]
                            for combo in np.flatnonzero(full):
                                if turn in combo_cards(int(combo)):full[combo]=0
                            ranges.append(full.tolist())
                        if any(sum(r)<=0 for r in ranges):continue
                        spec=dict(players=2,board=board+[turn],pot=b['pot'],stack=b['stack'],ranges=ranges,path=[],extras=[],
                                  profile=dict(utility='chip-ev',rake_rate=0,rake_cap=0),
                                  range_origin=dict(source='unverified legacy flop library',history=b['path'],synthetic=False,fileSha256=sha),
                                  assumptions='DRAFT: turn ranges inherited from unverified legacy flop strategies, including their float16 rounding. No independent range or rake validation.')
                        ident=hashlib.sha256(f'{sha}:{j}:{turn}'.encode()).hexdigest()[:24];dest=out/(ident+'.root.json')
                        if not dest.exists():atomic_json(dest,dict(publicationApproved=False,spec=spec))
                        count+=1
                        state.update(stage='refining' if a.solve else 'extracting',roots=count,currentFile=row['file'])
                        # Flush before each solve so a long computation is visible to the operator.
                        atomic_json(out/'status.json',dict(state,updated=time.time()))
                        if a.solve and not (out/(ident+'.result.json')).exists():
                            from flipup_gto.scroll_scenarios import VERSION,solve,scenario_from,arrays
                            spec['version']=VERSION
                            try:
                                s,t,q,quality,d,e=solve(spec,maximum=12000,memory=a.memory_mb)
                                _,w,c=arrays(q,2);candidates=[]
                                for combo in c[np.argsort(-w[q['player'],c])[:24]]:
                                    try:candidates.append(scenario_from(s,t,q,spec,quality,int(combo),d,e))
                                    except ValueError:continue
                                    if len(candidates)>=4:break
                                atomic_json(out/(ident+'.result.json'),dict(publicationApproved=False,scenarios=candidates,inheritedLegacyRanges=True))
                            except (ValueError,RuntimeError,MemoryError) as exc:atomic_json(out/(ident+'.result.json'),dict(publicationApproved=False,error=str(exc)))
                        if time.time()-last_backup>=300:
                            checkpoint(out,state,backup,a.backup_run);last_backup=time.time()
            row['status']='inspected'
        except (ValueError,KeyError,TypeError,OSError) as exc:row.update(status='rejected',error=str(exc))
        inventory.append(row)
        atomic_json(out/'inventory.json',dict(files=inventory,roots=count,publicationApproved=False))
        state.update(files=len(inventory),roots=count)
        print(f'{row["file"]}: {row["status"]}; {count} reached turn roots',flush=True)
    state.update(stage='complete',files=len(inventory),roots=count)
    checkpoint(out,state,backup,a.backup_run)
    print(f'Library preserved. Outputs remain draft; private backup: {state["backup"]}. No public publication or training activation.',flush=True)

if __name__=='__main__':main()

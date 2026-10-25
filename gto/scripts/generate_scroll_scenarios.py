#!/usr/bin/env python3
"""Fresh curated Scroll scenarios, independent of model training and old hand files."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import sys
import time
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import numpy as np
from flipup_gto.scroll_contract import require_validation,validate_job,fingerprint
from flipup_gto.cards import hand_class
from flipup_gto.scroll_paths import reached_paths
from flipup_gto.scroll_scenarios import (VERSION,solve,query,arrays,scenario_from,validate_public)
from flipup_gto.value_data import atomic_json,atomic_npz,sample_rng,digest,encode
from flipup_gto.strategy import extract_rows
from generate_value_data import source_fingerprint
import hashlib


def generate(root,players,street,worker,attempts,hours,memory=1536,jobs=None,validation=None):
    require_validation(validation,players,street)
    inputs=[s for s in json.loads(Path(jobs).read_text())["spots"] if s["players"]==players and len(s["board"])=={"river":5,"turn":4}[street]]
    if not inputs:raise ValueError("no imported, range-traceable roots for this player/street profile")
    for spec in inputs:validate_job(spec)
    root=Path(root);root.mkdir(parents=True,exist_ok=True)
    training=root.parent/'training'/f'{players}p-{street}-{worker}'
    training.mkdir(parents=True,exist_ok=True)
    manifest=dict(schema=1,players=players,street=street,worker=worker,seed=20261101,
                  source=digest([source_fingerprint(),hashlib.sha256(Path(__file__).read_bytes()).hexdigest()]),
                  features='strength64-v1',tree=VERSION,target=.1,input_jobs=digest(inputs),validation_engine=fingerprint())
    mp=training/'manifest.json'
    if mp.exists() and json.loads(mp.read_text())!=manifest:raise ValueError('teacher changed; use a new Scroll run directory')
    if not mp.exists():atomic_json(mp,manifest)
    start=time.monotonic();accepted=0;examined=0
    for i in range(attempts):
        if hours and time.monotonic()-start>hours*3600:break
        marker=root/f'{players}p-{street}-{worker}-{i:08d}.result.json'
        if marker.exists():continue
        rng=sample_rng(20261101,street,worker,i)
        # Publication jobs come from traceable reached ranges, never the random training sampler.
        spec={**inputs[i % len(inputs)],'version':VERSION}
        board=spec['board'];pot=spec['pot'];stack=spec['stack']
        ranges=[np.asarray(r) for r in spec['ranges']]
        entries=[];rejected=None;examined+=1
        try:
            # Solve once, then expose different genuinely reached decision types.
            s,_,rootq,quality,_,_=solve(spec,memory=memory)
            if spec.get('path'):raise ValueError('production root jobs must contain reached ranges at an empty root path')
            def at(indices):
                return query(s,[str(i) for i in indices] if players==2 else indices,players,False)
            def masses(q):
                _,w,c=arrays(q,players)
                return w[q['player'],c]
            paths=reached_paths(at,masses)
            for indices in paths:
                pathspec={**spec,'path':[]};tokens=[]
                for idx in indices:
                    before=query(s,tokens,players,False);act=before['actions'][idx]
                    pathspec['path'].append(dict(type=act['type'],amount=act['amount'],player=before['player']))
                    tokens.append(str(idx) if players==2 else idx)
                before=query(s,tokens,players)
                if before['type']!='action':continue
                # Independently refine and check this decision; root stability alone is insufficient.
                old=np.asarray(before['strategy']);old_ev=np.asarray(before['action_ev'])
                if players==2:s.engine.iterate(200);gap=s.exploitability_pct()
                else:s.iterate(200);gap=s.exploitability_pct()*players
                q=query(s,tokens,players);r,w,combos=arrays(q,players)
                drift=np.abs(np.asarray(q['strategy'])-old).max(0)
                edrift=np.abs(np.asarray(q['action_ev'])-old_ev).max(0)/q['pot']
                if gap>.1:continue
                quality={**quality,'gapPct':float(gap),'iterations':int(quality['iterations']+200)}
                # Reach-sampled hands, then curate close/mixed cases. Cap same-context examples.
                weights=w[q['player'],combos];possible=np.flatnonzero(weights>1e-12)
                if not len(possible):continue
                choices=rng.choice(possible,size=min(24,len(possible)),replace=False,p=weights[possible]/weights[possible].sum())
                candidates=[]
                for h in choices:
                    try:
                        public=scenario_from(s,tokens,q,pathspec,quality,int(combos[h]),drift,edrift)
                        validate_public(public);candidates.append(public)
                    except ValueError:continue
                candidates.sort(key=lambda d:({'mixed':0,'close':1,'contrast':2}[d['difficulty']],rng.random()))
                for public in candidates[:2]:
                    if public['difficulty']=='contrast' and rng.random()>.2:continue
                    entry=dict(scenario=public,solve=pathspec)
                    atomic_json(root/(public['id']+'.entry.json'),entry);entries.append(public['id']);accepted+=1
        except (ValueError,MemoryError,RuntimeError) as e:
            if not any(term in str(e) for term in ('converge','unstable','conservation','tree','memory','budget')) and not isinstance(e,MemoryError):raise
            rejected=str(e)
        if entries:
            # Reuse already-paid-for exact solves as future value/policy training data.
            # Network checkpoints never decide which Scroll answers are correct.
            from flipup_gto.value_data import split_for
            root_info=query(s,[],players)
            data=encode(board,*ranges[:2],pot,stack,root_info) if players==2 else dict(board=np.asarray(board),ranges=np.asarray(ranges))
            data.update(extract_rows(lambda path:query(s,path,players),stack,rng,multiway=players==3))
            meta=dict(sample_id=i,worker=worker,street=street,seed=20261101,job=digest(manifest),
                      gap_pct=float(quality['gapPct']),split=split_for(board),pot=pot,stack=stack,origin='scroll-first')
            atomic_npz(training/f'{i:08d}.npz',**data,metadata=np.asarray(json.dumps(meta)))
        atomic_json(marker,dict(accepted=entries,rejected=rejected))
        print(f'{players}p {street} case {i}: {len(entries)} approved; {rejected or "checked"}',flush=True)
    return dict(accepted=accepted,examined=examined)


if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--out',type=Path,required=True)
    ap.add_argument('--players',type=int,choices=[2,3],default=2);ap.add_argument('--street',choices=['river','turn'],default='river')
    ap.add_argument('--jobs',type=Path,required=True);ap.add_argument('--validation',type=Path,required=True)
    ap.add_argument('--worker',type=int,default=0);ap.add_argument('--attempts',type=int,default=1000)
    ap.add_argument('--max-hours',type=float,default=8);ap.add_argument('--memory-mb',type=int,default=1536)
    a=ap.parse_args();print(generate(a.out,a.players,a.street,a.worker,a.attempts,a.max_hours,a.memory_mb,a.jobs,a.validation))

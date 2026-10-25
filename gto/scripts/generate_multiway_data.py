#!/usr/bin/env python3
"""Exact-joint three-player turn/river teachers, with deviation and stability gates."""
from __future__ import annotations
import argparse
import fcntl
import hashlib
import json
import shutil
from pathlib import Path
import sys
import time
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import numpy as np
from flipup_gto import _engine as E, valuenet as vn
from flipup_gto.strategy import extract_rows, FEATURES
from flipup_gto.value_data import atomic_json,atomic_npz,digest,sample_rng,split_for
from generate_value_data import source_fingerprint


def config(board,ranges,pot,stack,memory=2048,active=0):
    c=E.MWConfig();c.players=3;c.board=list(board);c.range=np.asarray(ranges).tolist()
    c.pot=pot;c.stack=stack;c.exact_joint=True;c.initial_active=active
    c.max_memory_mb=memory;c.max_nodes=100000;c.end_street=2;c.deal_subset=[];c.max_raises=1
    for s in range(3):c.set_sizes(s,[.33,.75],[.6])
    return c


def solve_checked(cfg,target=.2,maximum=2000,batch=25):
    s=E.MultiwaySolver(cfg);last=None;stable=False;gap=float('inf')
    for _ in range(0,maximum,batch):
        s.iterate(min(batch,maximum-s.iterations))
        gap=float(s.exploitability_pct());ev=np.asarray(s.root_ev())
        if not np.isfinite(ev).all() or not np.isfinite(gap):raise ValueError('nonfinite multiway teacher')
        stable=bool(last is not None and np.max(np.abs(ev-last))/cfg.pot<=.002)
        last=ev
        if gap<=target and stable:break
    conservation=float(abs(sum(s.root_ev())-cfg.pot)/cfg.pot)
    if gap>target or not stable or conservation>.001:
        raise ValueError(f'teacher gate: deviation={gap:.6f}%, stable={stable}, conservation={conservation:.6f}')
    return s,dict(iterations=s.iterations,gap_pct=gap,conservation=conservation,stable=stable,
                  certificate='measured unilateral deviation/stability; not a multi-player Nash guarantee')


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--street',choices=['river','turn'],required=True);ap.add_argument('--worker',type=int,choices=[0,1],required=True)
    ap.add_argument('--out',type=Path,required=True);ap.add_argument('--samples',type=int,default=1000)
    ap.add_argument('--seed',type=int,default=20261028);ap.add_argument('--max-hours',type=float,default=8)
    ap.add_argument('--memory-mb',type=int,default=2048);ap.add_argument('--target',type=float,default=.2)
    ap.add_argument('--max-iterations',type=int,default=2000)
    args=ap.parse_args()
    if min(args.samples,args.memory_mb,args.target,args.max_iterations)<=0 or args.max_hours<0:ap.error('invalid budget')
    root=args.out.expanduser().resolve();root.mkdir(parents=True,exist_ok=True)
    lock=(root/'job.lock').open('w');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    manifest=dict(schema=1,players=3,street=args.street,worker=args.worker,seed=args.seed,
                  source=digest([source_fingerprint(),hashlib.sha256(Path(__file__).read_bytes()).hexdigest()]),
                  features=FEATURES,tree='exact3-full-future-33-75-raise60-r1',target=args.target,
                  max_iterations=args.max_iterations,memory_mb=args.memory_mb)
    mp=root/'manifest.json'
    if mp.exists() and json.loads(mp.read_text())!=manifest:sys.exit('changed configuration; choose a new job directory')
    if not mp.exists():atomic_json(mp,manifest)
    start=time.monotonic()
    for i in range(args.samples):
        p=root/f'{i:08d}.npz';reject=p.with_suffix('.reject.json')
        if p.exists() or reject.exists():continue
        if args.max_hours and time.monotonic()-start>3600*args.max_hours:break
        if shutil.disk_usage(root).free<2*1024**3:raise RuntimeError('less than 2 GiB free; generation paused')
        rng=sample_rng(args.seed,args.street,args.worker,i)
        n=5 if args.street=='river' else 4
        board=rng.choice(52,n,replace=False).tolist()
        ranks=vn.strength_ranks(board) if n==5 else vn.percentile(vn.turn_stats(board)[0])
        ranges=np.asarray([vn.random_range(ranks,rng) for _ in range(3)])
        pot=float(np.exp(rng.uniform(np.log(6),np.log(100))))
        stack=min(250.,pot*float(np.exp(rng.uniform(np.log(.2),np.log(12)))))
        m=dict(sample_id=i,worker=args.worker,street=args.street,seed=args.seed,origin='synthetic-exact3',
               split=split_for(board),job=digest(manifest),pot=pot,stack=stack)
        t=time.monotonic()
        try:
            s,quality=solve_checked(config(board,ranges,pot,stack,args.memory_mb),args.target,args.max_iterations)
        except (ValueError,RuntimeError,MemoryError) as exc:
            if not any(x in str(exc) for x in ('teacher gate','tree too large','node budget')) and not isinstance(exc,MemoryError):raise
            m.update(reason=str(exc),seconds=time.monotonic()-t)
            atomic_json(reject,m);print(f'{i}: rejected: {exc}',flush=True);continue
        m.update(quality,seconds=time.monotonic()-t)
        policy=extract_rows(lambda path:s.query(path,True,False),stack,rng,multiway=True)
        atomic_npz(p,board=np.asarray(board),ranges=ranges,**policy,metadata=np.asarray(json.dumps(m)))
        atomic_json(root/'status.json',m)
        print(f'{i}: accepted {quality} in {m["seconds"]:.1f}s',flush=True)


if __name__=='__main__':main()

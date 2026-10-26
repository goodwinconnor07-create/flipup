#!/usr/bin/env python3
"""Laptop library -> varied questions -> reviewed policy data. Never runs a poker solver."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
import time
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import numpy as np
from flipup_gto.library_questions import load_questions,FEATURES
from flipup_gto.value_data import atomic_json,atomic_npz,split_for,board_group,digest


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--library',type=Path,required=True);p.add_argument('--out',type=Path,required=True)
    p.add_argument('--review',type=Path,help='JSON reviewed source SHAs and exact model acceptance')
    p.add_argument('--per-node',type=int,default=4);p.add_argument('--max-files',type=int,default=10000)
    p.add_argument('--max-gap',type=float,default=.5);p.add_argument('--shard',type=int,default=0);p.add_argument('--of',type=int,default=1)
    p.add_argument('--backup-run');p.add_argument('--peer-run');p.add_argument('--publish',action='store_true')
    p.add_argument('--train',action='store_true');a=p.parse_args()
    source=a.library.expanduser().resolve();out=a.out.expanduser().resolve()
    if not source.is_dir() or source==out or source in out.parents:raise ValueError('valid library and separate output directory required')
    if not 0<=a.shard<a.of or not 1<=a.per_node<=32 or a.max_files<1 or not np.isfinite(a.max_gap) or a.max_gap<0:raise ValueError('invalid campaign limits')
    out.mkdir(parents=True,exist_ok=True)
    import fcntl
    lock=(out/'.campaign.lock').open('w');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    review=json.loads(a.review.read_text()) if a.review else {}
    approved=set(review.get('sourceSha256',[])) if review.get('rangeAndModelReviewed') is True else set()
    config=dict(features=FEATURES,library=str(source),perNode=a.per_node,maxGap=a.max_gap,shard=a.shard,of=a.of,review=digest(review))
    config_path=out/'config.json'
    if config_path.exists() and json.loads(config_path.read_text())!=config:raise ValueError('changed configuration; use a new output directory')
    atomic_json(config_path,config)
    for name in ('questions','training','receipts'): (out/name).mkdir(exist_ok=True)
    state=dict(stage='extracting stored flop decisions',files=0,rejected=0,questions=0,approved=0,started=time.time(),solvesRun=0)
    backup=None
    if a.backup_run and os.environ.get('FLIPUP_COACH') and os.environ.get('FLIPUP_UPLOAD_TOKEN'):
        from campaign_sync import Artifacts
        backup=Artifacts()
    def save(sync=False):
        state['updated']=time.time();atomic_json(out/'status.json',state)
        if sync and backup:
            try:backup.push(out,a.backup_run);state['backup']='uploaded';state.pop('backupError',None)
            except Exception as exc:state.update(backup='pending retry',backupError=str(exc))
        elif not backup:state['backup']='local only; upload credentials not configured'
        atomic_json(out/'status.json',state)
    last_sync=0
    for index,path in enumerate(sorted(source.glob('*/*.npz'))):
        if index%a.of!=a.shard:continue
        if state['files']>=a.max_files:break
        state['currentFile']=str(path.relative_to(source));save()
        sha=hashlib.sha256(path.read_bytes()).hexdigest();receipt=out/'receipts'/(sha+'.json')
        if receipt.exists():
            prior=json.loads(receipt.read_text());state['questions']+=prior['questions'];state['approved']+=prior['approved']
        else:
            try:
                _,questions=load_questions(path,a.per_node,a.max_gap)
                for q,row,board in questions:
                    q['publicationApproved']=sha in approved
                    atomic_json(out/'questions'/(q['id']+'.json'),q)
                # Training is full-fidelity to the stored labels; never use model guesses as teacher data.
                if sha in approved and questions:
                    rows=[row for _,row,_ in questions];board=questions[0][2]
                    atomic_npz(out/'training'/(sha+'.npz'),**{k:np.stack([r[k] for r in rows]) for k in rows[0]},
                               board=np.asarray(board),metadata=np.asarray(json.dumps(dict(features=FEATURES,source=sha,split=split_for(board),reviewed=True,reviewDigest=digest(review),model=questions[0][0]['source']['model']))))
                counts=dict(questions=len(questions),approved=len(questions) if sha in approved else 0)
                atomic_json(receipt,counts);state['questions']+=counts['questions'];state['approved']+=counts['approved']
            except (ValueError,KeyError,TypeError,OSError) as exc:
                state['rejected']+=1;atomic_json(out/'receipts'/(sha+'.rejected.json'),dict(file=str(path),error=str(exc)))
        state['files']+=1
        print(f"{state['files']} files | {state['questions']} questions | {state['approved']} reviewed | {state['rejected']} rejected",flush=True)
        if time.time()-last_sync>300:save(True);last_sync=time.time()
    state['stage']='extraction complete';save(True)
    atomic_json(out/'review-candidates.json',dict(rangeAndModelReviewed=False,
                sourceSha256=sorted(p.stem for p in (out/'receipts').glob('*.json') if not p.name.endswith('.rejected.json')),
                warning='Review actual range provenance, model limitations and matching comparisons before approving. This file grants no approval.'))
    if a.publish:
        if not approved:raise ValueError('publication requires explicit reviewed source hashes')
        from coach_client import Coach
        coach=Coach();published=out/'.published';published.mkdir(exist_ok=True)
        for path in sorted((out/'questions').glob('*.json')):
            if (published/path.name).exists():continue
            q=json.loads(path.read_text())
            if q['source']['sha256'] not in approved or q['publicationApproved'] is not True:continue
            coach._call('POST','/scroll/library/publish',json.dumps(dict(items=[q]),allow_nan=False).encode())
            (published/path.name).touch()
    if a.peer_run:
        from campaign_sync import Artifacts
        import shutil
        peer=out/'.peer';Artifacts().pull(peer,a.peer_run)
        for path in (peer/'training').glob('*.npz'):
            dest=out/'training'/path.name
            if dest.exists() and dest.read_bytes()!=path.read_bytes():raise ValueError('peer training source collision')
            if not dest.exists():shutil.copyfile(path,dest)
    if a.train:
        import subprocess
        subprocess.run([sys.executable,str(Path(__file__).with_name('train_library_policy.py')),'--data',str(out/'training'),'--out',str(out/'models')],check=True)
        save(True)


if __name__=='__main__':main()

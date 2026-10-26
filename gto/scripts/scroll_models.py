#!/usr/bin/env python3
"""Laptop-only candidate training from version-matched Scroll data. No model activation."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time
import numpy as np
from flipup_gto.scroll_contract import fingerprint
from flipup_gto.value_data import atomic_json,digest,board_group

SCRIPTS=Path(__file__).resolve().parent


def datasets(roots):
    groups={}
    for base in roots:
        for path in sorted((Path(base)/'training').glob('*/manifest.json')):
            manifest=json.loads(path.read_text())
            if manifest.get('validation_engine')!=fingerprint():continue
            key=(manifest['source'],manifest['players'],manifest['street'],manifest['tree'])
            groups.setdefault(key,[]).append(path.parent)
    return groups


def inventory(jobs):
    counts={k:set() for k in ('train','validation','test')};files=[]
    for job in jobs:
        manifest=json.loads((job/'manifest.json').read_text())
        for p in sorted(job.glob('*.npz')):
            with np.load(p,allow_pickle=False) as d:
                m=json.loads(str(d['metadata']))
                if m['job']!=digest(manifest) or not np.isfinite(m['gap_pct']) or not 0<=m['gap_pct']<=manifest['target']:raise ValueError('invalid training provenance')
                if m['split'] not in counts:raise ValueError('invalid training split')
                counts[m['split']].add(tuple(board_group(d['board'])))
            files.append((str(p),hashlib.sha256(p.read_bytes()).hexdigest()))
    return {k:len(v) for k,v in counts.items()},digest(files)


def ready(counts):
    return counts['train']>=100 and counts['validation']>=20 and counts['test']>=20


def execute(script,args,log,deadline):
    with Path(log).open('ab') as output:
        proc=subprocess.Popen([sys.executable,str(SCRIPTS/script),*map(str,args)],stdout=output,stderr=subprocess.STDOUT,start_new_session=True)
        try:return proc.wait(timeout=max(.01,deadline-time.time()))==0
        except subprocess.TimeoutExpired:
            os.killpg(proc.pid,signal.SIGTERM)
            try:proc.wait(timeout=10)
            except subprocess.TimeoutExpired:os.killpg(proc.pid,signal.SIGKILL);proc.wait()
            return False
        except BaseException:
            os.killpg(proc.pid,signal.SIGTERM);proc.wait();raise


def train_one(root,peer,validation,deadline,threads=2):
    root=Path(root);state=root/'models-status.json'
    if importlib.util.find_spec('torch') is None:
        atomic_json(state,dict(stage='waiting for PyTorch',instruction='bash gto/scripts/scroll_laptop.sh setup-models'));return
    for key,jobs in sorted(datasets([root,peer]).items()):
        _,players,street,_=key
        if [players,street] not in validation['coverage']:continue
        counts,data=inventory(jobs)
        atomic_json(state,dict(stage='checking data',players=players,street=street,groups=counts))
        if not ready(counts):continue
        out=root/'models'/data;receipt=out/'completed.json'
        if receipt.exists():continue
        out.mkdir(parents=True,exist_ok=True)
        # Materialize a stable input snapshot: peers can append new samples during training.
        snapshot=root/'.model-inputs'/data
        stable=[]
        for i,job in enumerate(jobs):
            import shutil
            dest=snapshot/str(i)
            if not dest.exists():
                temporary=snapshot/(str(i)+'.partial')
                if temporary.exists():shutil.rmtree(temporary)
                temporary.parent.mkdir(parents=True,exist_ok=True)
                shutil.copytree(job,temporary);temporary.rename(dest)
            stable.append(dest)
        commands=[('train_strategy_model.py',[*stable,'--out',out/'policy.npz','--threads',threads])]
        if players==2:
            commands.extend([('train_value_model.py',[*stable,'--street',street,'--out',out/'value.npz','--threads',threads]),
                             ('evaluate_value_model.py',[*stable,'--model',out/'value.npz','--out',out/'value-test.json'])])
        # Failed/partial candidates retain logs; do not overwrite immutable checkpoints on retries.
        attempt=1
        while (out/str(attempt)).exists():attempt+=1
        if attempt>3:
            atomic_json(state,dict(stage='candidate failed three attempts',data=data,activated=False));continue
        run=out/str(attempt);run.mkdir()
        for script,args in commands:
            args=[run/p.name if isinstance(p,Path) and p.parent==out else p for p in args]
            atomic_json(state,dict(stage='training candidate',players=players,street=street,script=script,activated=False))
            if time.time()>=deadline or not execute(script,args,run/(script+'.log'),deadline):
                atomic_json(state,dict(stage='training incomplete',logs=str(run),activated=False));return
        atomic_json(receipt,dict(data=data,groups=counts,players=players,street=street,activated=False,artifacts=str(run)))
        atomic_json(state,dict(stage='candidate evaluated',activated=False,artifacts=str(run)))
        return # one candidate per generation cycle; never starve fresh Scroll work

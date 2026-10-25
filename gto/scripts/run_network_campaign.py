#!/usr/bin/env python3
"""Budgeted unattended two-laptop campaign: teachers -> models -> gated exact Scroll.

Uses a persistent deadline, checksum uploads and peer snapshots. Never activates
models or replaces the app's Scroll files. Four-player generation is disabled.
"""
from __future__ import annotations
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time
import threading
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from flipup_gto.value_data import atomic_json,digest
from campaign_sync import Artifacts
from generate_value_data import source_fingerprint

SCRIPTS=Path(__file__).resolve().parent


def execute(script,args,log,deadline):
    if time.time()>=deadline:return False
    with Path(log).open('ab') as out:
        p=subprocess.Popen([sys.executable,str(SCRIPTS/script),*map(str,args)],stdout=out,stderr=subprocess.STDOUT,start_new_session=True)
        try:return p.wait(timeout=max(1,deadline-time.time()))==0
        except subprocess.TimeoutExpired:
            os.killpg(p.pid,signal.SIGTERM)
            try:p.wait(timeout=10)
            except subprocess.TimeoutExpired:os.killpg(p.pid,signal.SIGKILL);p.wait()
            return False
        except BaseException:
            os.killpg(p.pid,signal.SIGTERM);p.wait();raise


def attempted(job):
    return len(list(job.glob('*.npz')))+len(list(job.glob('*.reject.json')))


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--role',choices=['fast','slow'],required=True);ap.add_argument('--campaign',required=True)
    ap.add_argument('--root',type=Path,default=Path.home()/'flipup-campaigns')
    ap.add_argument('--library',type=Path,default=Path.home()/'flops')
    ap.add_argument('--hours',type=float,default=168);ap.add_argument('--memory-mb',type=int,default=2048)
    ap.add_argument('--dry-run',action='store_true')
    args=ap.parse_args()
    import re
    if not re.fullmatch('[A-Za-z0-9_-]{1,50}',args.campaign) or args.hours<=0:ap.error('invalid campaign/budget')
    worker=1 if args.role=='fast' else 0;street='turn' if worker else 'river'
    root=args.root.expanduser()/args.campaign/f'worker{worker}';root.mkdir(parents=True,exist_ok=True)
    peer=root.parent/f'peer{1-worker}'
    run=f'{args.campaign}-worker{worker}';peer_run=f'{args.campaign}-worker{1-worker}'
    if args.dry_run:
        print(json.dumps(dict(role=args.role,street=street,hours=args.hours,worker=worker,
                         plan=['25% heads-up data + policy targets','55% repaired three-way data','train and test all models','gated exact Scroll within remaining budget'],
                         upload=run,library=str(args.library),root=str(root)),indent=2));return
    lock=(root/'.campaign.lock').open('w');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    client=Artifacts();client.probe(run)  # fail BEFORE generation if coach routes/auth are not ready
    statefile=root/'campaign.json'
    cfg=dict(role=args.role,campaign=args.campaign,hours=args.hours,memory_mb=args.memory_mb,
             source=digest([source_fingerprint(),[(p.name,hashlib.sha256(p.read_bytes()).hexdigest())
                           for p in sorted(SCRIPTS.glob('*.py'))]]))
    if statefile.exists():
        state=json.loads(statefile.read_text())
        if state['config']!=cfg:raise ValueError('campaign configuration changed; use a new campaign name')
    else:
        state=dict(config=cfg,started=time.time(),stage='created');atomic_json(statefile,state)
    end=state['started']+args.hours*3600
    def status(stage,**kw):
        if stage != 'failed':state.pop('error',None)
        state.update(stage=stage,updated=time.time(),**kw);atomic_json(statefile,state);print(stage,kw,flush=True)
    def sync():
        # An extended outage pauses the campaign after current batch; no unbounded unbacked work.
        print('uploading and checking peer snapshots',flush=True);client.push(root,run);client.pull(peer,peer_run)
    stop_backup=threading.Event()
    def periodic_backup():
        while not stop_backup.wait(900):
            try:
                client.push(root,run)
                atomic_json(root/'backup-status.json',dict(ok=True,updated=time.time()))
            except Exception as exc:
                atomic_json(root/'backup-status.json',dict(ok=False,updated=time.time(),error=str(exc)))
    threading.Thread(target=periodic_backup,daemon=True).start()
    def generate(script,job,until,extra):
        job.mkdir(parents=True,exist_ok=True)
        while time.time()<until:
            before=attempted(job)
            status('generating',job=job.name,attempted=before)
            ok=execute(script,['--street',street,'--worker',worker,'--out',job,'--samples',before+256,
                        '--max-hours',.5,'--memory-mb',args.memory_mb,*extra],root/f'{job.name}.log',until)
            sync()
            after=attempted(job)
            if not ok and time.time()<until:raise RuntimeError(f'{job.name} failed; inspect its uploaded log')
            if after==before and time.time()<until:raise RuntimeError('no new data; inspect job configuration')
    try:
        hu_end=state['started']+.25*args.hours*3600
        mw_end=state['started']+.80*args.hours*3600
        hu=root/'jobs'/f'hu-{street}';mw=root/'jobs'/f'mw3-{street}'
        if time.time()<hu_end:
            generate('generate_value_data.py',hu,hu_end,['--strategy',*(['--library',args.library] if worker else [])])
        audit=root/'multiway-audit.json'
        if not audit.exists():
            status('auditing-multiway')
            if not execute('audit_multiway_teacher.py',['--cases',100,'--out',audit],root/'audit.log',end):
                raise RuntimeError('exact multiway audit failed; later stages blocked')
        if not json.loads(audit.read_text()).get('passed'):raise RuntimeError('multiway audit failed; later stages blocked')
        if time.time()<mw_end:generate('generate_multiway_data.py',mw,mw_end,[])
        sync()
        jobs=[p for base in (root,peer) for p in (base/'jobs').glob('*') if (p/'manifest.json').exists()]
        models=root/'models';models.mkdir(exist_ok=True)
        gates=[]
        # Each laptop can train missing peer models independently; model names remain under its own run.
        for players in (2,3):
            for st in ('river','turn'):
                matching=[p for p in jobs if json.loads((p/'manifest.json').read_text()).get('players',2)==players
                          and json.loads((p/'manifest.json').read_text())['street']==st]
                policy=models/f'policy-{players}p-{st}.npz'
                report=policy.with_suffix('.report.json')
                if matching and not report.exists():
                    status('training-policy',players=players,street=st)
                    execute('train_strategy_model.py',[*matching,'--out',policy],root/f'policy-{players}p-{st}.log',end)
                gates.append(bool(report.exists() and json.loads(report.read_text()).get('gate_passed')))
                if players==2:
                    value=models/f'value-{st}.npz';test=models/f'value-{st}-test.json'
                    if matching and not value.exists():
                        status('training-value',street=st)
                        execute('train_value_model.py',[*matching,'--street',st,'--out',value],root/f'value-{st}.log',end)
                    if value.exists() and not test.exists():
                        execute('evaluate_value_model.py',[*matching,'--model',value,'--out',test],root/f'value-{st}-test.log',end)
                    result=json.loads(test.read_text()) if test.exists() else {}
                    gates.append(result.get('samples',0)>=20 and result.get('mean',1)<=.01 and result.get('p95',1)<=.03)
        approved=all(gates) and len(gates)==6 and audit.exists() and json.loads(audit.read_text())['passed']
        approval=root/'quality-gates.json'
        atomic_json(approval,dict(scroll_allowed=approved,gates=gates,
                    note='No gate is waived because time elapsed. Models remain candidates; Scroll uses full exact teachers.'))
        sync()
        if approved and time.time()<end:
            # Fast laptop exports. Slow laptop backs up its own candidates; avoid duplicate preflop work.
            if worker==1:
                scroll=root/'scroll';scroll.mkdir(exist_ok=True)
                status('generating-scroll')
                ok=execute('generate_scroll_verified.py',['--out',scroll/'hands.jsonl','--approval',approval,
                           '--max-hours',max(.001,(end-time.time())/3600),'--memory-mb',args.memory_mb],root/'scroll.log',end)
                if ok and (scroll/'hands.jsonl').exists():
                    execute('export_quiz.py',[scroll/'hands.jsonl','--out',scroll/'packed'],root/'scroll-pack.log',end)
                status('complete' if ok else 'scroll-blocked',reason='See Scroll log; no simplified/unconverged replacements')
            else:status('complete',reason='Fast laptop handles gated Scroll export')
        else:status('blocked',reason='Insufficient data/failed quality gates or deadline reached; artifacts preserved, no Scroll fabricated')
        sync()
    except BaseException as exc:
        status('failed',error=str(exc))
        try:client.push(root,run)
        except Exception:pass
        raise
    finally:
        stop_backup.set()


if __name__=='__main__':main()

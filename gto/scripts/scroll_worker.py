#!/usr/bin/env python3
"""Scroll-first laptop daemon: fresh scenarios, automatic publication/backups, queued refinements."""
from __future__ import annotations
import argparse
import copy
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import threading
import time
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import numpy as np
from coach_client import Coach
from campaign_sync import Artifacts
from scroll_models import train_one
from flipup_gto.cards import parse_combo
from flipup_gto.scroll_schedule import choose_work
from flipup_gto.scroll_contract import require_validation,validate_job
from flipup_gto.scroll_scenarios import solve,solve_entry,query,arrays,scenario_from
from flipup_gto.value_data import atomic_json

SCRIPTS=Path(__file__).resolve().parent


def call(client,path,payload=None):
    return json.loads(client._call('GET' if payload is None else 'POST','/scroll'+path,
                     None if payload is None else json.dumps(payload,allow_nan=False).encode())[1])


def process(client,job,memory):
    stopped=threading.Event()
    def renew():
        while not stopped.wait(60):
            try:call(client,'/heartbeat/'+job['id'],{'lease':job['lease']})
            except Exception:return
    threading.Thread(target=renew,daemon=True).start()
    try:
        p=job['payload'];validate_job(p['spec']);maximum=4000*2**(job['attempt']-1)
        if job['kind']=='size':
            value=solve_entry(p['spec'],parse_combo(''.join(p['cards'])),maximum,memory)
            selected=next((o for o in value['options'] if (o['kind']==p['kind'] or o['kind']=='allin') and abs(o['to']-p['to'])<1e-4),None)
            if selected is None:raise ValueError('requested size not retained in tree')
            call(client,'/publish',dict(items=[{'scenario':value,'solve':p['spec']}]))
            value={'scenario':value,'option':selected,'quality':value['quality']}
        else:
            s,tokens,q,quality,drift,edrift=solve(p['spec'],maximum,memory)
            response=copy.deepcopy(p['response']);r,w,combos=arrays(q,2);actor=q['player']
            own=w[actor,combos];own=own/own.sum()
            strategy=np.asarray(q['strategy']);ev=np.asarray(q['action_ev'])
            h=None
            if response.get('hand_specific'):
                combo=parse_combo(response['hand']);h=int(np.flatnonzero(combos==combo)[0])
                if drift[h]>.03 or edrift[h]>.01:raise ValueError('hero answer is not stable')
            for old in response['options']:
                match=next((i for i,a in enumerate(q['actions']) if
                            ('allin' if a['all_in'] else a['type'])==old['kind'] and abs(a['amount']-old.get('to_bb',0))<=.011),None)
                if match is None:
                    old.update(freq=None,ev_bb=None,off_tree=True);continue
                old['range_freq']=float(np.dot(strategy[match],own))
                old['freq']=float(strategy[match,h]) if h is not None else old['range_freq']
                old['ev_bb']=float(ev[match,h]) if h is not None else None
                old['off_tree']=False
            response.update(refining=False,presolved=True,accuracy='verified',status='ready')
            response.setdefault('notes',[]).append('Refined offline with a full future-street solve for these ranges and bet sizes.')
            value=dict(response=response,quality={**quality,'heroFrequencyDrift':float(drift[h]) if h is not None else quality['rangeFrequencyDrift'],
                                                 'heroEvDrift':float(edrift[h]) if h is not None else float(np.dot(edrift,own))})
        call(client,'/complete/'+job['id'],dict(lease=job['lease'],result=value))
    except (ValueError,MemoryError,RuntimeError) as exc:
        call(client,'/complete/'+job['id'],dict(lease=job['lease'],error=str(exc)))
    finally:stopped.set()


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--role',choices=['fast','slow'],required=True);ap.add_argument('--out',type=Path,required=True)
    ap.add_argument('--hours',type=float,default=168);ap.add_argument('--memory-mb',type=int,default=1536)
    ap.add_argument('--models',choices=['auto','off'],default='auto')
    ap.add_argument('--offline',action='store_true',help='generate and back up locally; no coach publication')
    ap.add_argument('--jobs',type=Path,required=True);ap.add_argument('--validation',type=Path,required=True)
    a=ap.parse_args();validation=require_validation(a.validation);jobs=json.loads(a.jobs.read_text());choose_work(jobs,validation,a.role,0);root=a.out.expanduser();root.mkdir(parents=True,exist_ok=True)
    import fcntl
    lock=(root/'.worker.lock').open('w');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    client=None if a.offline else Coach();backup=None if a.offline else Artifacts()
    worker=1 if a.role=='fast' else 0
    if client:print(call(client,'/status'),flush=True)
    statepath=root/'worker.json'
    cfg=dict(role=a.role,hours=a.hours,memory=a.memory_mb,offline=a.offline,jobs=jobs,validation=validation,models=a.models)
    if statepath.exists():
        state=json.loads(statepath.read_text())
        if state['config']!=cfg:raise ValueError('changed worker configuration; use a new output directory')
    else:state=dict(started=time.time(),config=cfg,cycles=0)
    end=state['started']+a.hours*3600
    stop=threading.Event()
    def back_up():
        while not stop.wait(900):
            try:backup.push(root,'scroll-'+root.parent.name+f'-{a.role}')
            except Exception as exc:atomic_json(root/'backup-error.json',{'error':str(exc)})
    if backup:threading.Thread(target=back_up,daemon=True).start()
    try:
        while time.time()<end:
            if client and call(client,'/status')['paused']:
                state['stage']='paused remotely';atomic_json(statepath,state);time.sleep(30);continue
            cycle=state['cycles']
            # Accurate Scroll is always the first workload, not conditional on a network checkpoint.
            # Interleave multiway/turn cases so one expensive class cannot starve the feed.
            validation=require_validation(a.validation)
            players,street=choose_work(jobs,validation,a.role,cycle)
            folder=root/'scenarios'
            attempted=len(list(folder.glob(f'{players}p-{street}-{worker}-*.result.json')))
            cmd=[sys.executable,str(SCRIPTS/'generate_scroll_scenarios.py'),'--out',str(folder),
                 '--players',str(players),'--street',street,'--worker',str(worker),'--attempts',str(attempted+4),
                 '--jobs',str(a.jobs.resolve()),'--validation',str(a.validation.resolve()),'--max-hours','.25','--memory-mb',str(a.memory_mb)]
            state.update(stage=f'generating {players}-way {street} scenarios');atomic_json(statepath,state)
            with (root/'generation.log').open('ab') as log:
                proc=subprocess.Popen(cmd,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
                try:code=proc.wait(timeout=min(1800,max(1,end-time.time())))
                except subprocess.TimeoutExpired:
                    os.killpg(proc.pid,signal.SIGTERM);proc.wait();code=0
                except BaseException:
                    os.killpg(proc.pid,signal.SIGTERM);proc.wait();raise
            if code:raise RuntimeError('generator failed; inspect generation.log')
            if client:
                receipts=root/'.published';receipts.mkdir(exist_ok=True)
                for p in sorted(folder.glob('s-*.entry.json')):
                    if (receipts/p.name).exists():continue
                    call(client,'/publish',dict(items=[json.loads(p.read_text())]));(receipts/p.name).touch()
                # Download approved packs onto BOTH laptops, not only the generating machine.
                import urllib.request
                with urllib.request.urlopen(client.url+'/scroll/catalogue',timeout=120) as r:cat=json.load(r)
                download=root/'downloaded';download.mkdir(exist_ok=True)
                for item in cat['items']:
                    dest=download/(item['id']+'.json')
                    if dest.exists():continue
                    with urllib.request.urlopen(client.url+'/scroll/scenarios/'+item['id'],timeout=120) as r:atomic_json(dest,json.load(r))
                atomic_json(download/'catalogue.json',cat)
                # Bounded work queue prevents simultaneous live solves for every repeated custom hand.
                job=call(client,'/lease',{})
                if job:
                    state.update(stage='refining queued spot',job=job['id']);atomic_json(statepath,state)
                    process(client,job,a.memory_mb)
                backup.push(root,'scroll-'+root.parent.name+f'-{a.role}')
            if a.role=='slow' and a.models=='auto' and time.time()<end:
                peer=root/'.peer'/'fast'
                if backup:backup.pull(peer,'scroll-'+root.parent.name+'-fast')
                state.update(stage='checking network training data');atomic_json(statepath,state)
                train_one(root,peer,validation,min(end,time.time()+1200))
                if backup:backup.push(root,'scroll-'+root.parent.name+'-slow')
            state.update(cycles=cycle+1,stage='batch complete',updated=time.time());atomic_json(statepath,state)
    finally:
        stop.set()
        if backup:backup.push(root,'scroll-'+root.parent.name+f'-{a.role}')


if __name__=='__main__':main()

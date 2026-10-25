#!/usr/bin/env python3
"""Laptop-only, quarantined river study generation. NEVER publishes to Scroll.

Starting ranges follow the internal approximate preflop model. Intervening postflop
streets are NOT simulated: these are range-conditioned river studies, not whole hands.
"""
import argparse
import json
import os
from pathlib import Path
import random
import signal
import subprocess
import sys
import time
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from flipup_gto.value_data import atomic_json


def make_batch(out,players,stack,seed,memory,whole=False):
    import numpy as np
    from flipup_gto import _engine
    from flipup_gto.preflop import PreflopSpot,CLASS_INDEX
    from flipup_gto.cards import hand_class,parse_combo
    from flipup_gto.review import class_reach_to_combos
    from flipup_gto.scroll_scenarios import VERSION,solve,scenario_from,arrays
    rng=random.Random(seed)
    spot=PreflopSpot(num_players=6,stack=stack,rake_rate=0)
    print(f'Preparing preflop model at {stack}bb',flush=True)
    spot.solve(max_iterations=4000,target_bb=.005,callback=lambda it,gap:print(f'Preflop {it}: model deviation {gap}',flush=True))
    gap,per=spot.engine.nash_conv()
    if not np.isfinite(gap) or gap<0 or gap>.005:raise ValueError('preflop model did not meet its deviation threshold')
    accepted=0
    for attempt in range(2000):
        deck=list(range(52));rng.shuffle(deck);holes=[(deck.pop(),deck.pop()) for _ in range(6)]
        path=[];history=[]
        for _ in range(64):
            q=spot.engine.query(path)
            if q['terminal']:break
            p=q['player'];h=CLASS_INDEX[hand_class(int(_engine.combo_index(*holes[p])))]
            probs=np.asarray(q['strategy'])[:,h]
            if probs.sum()<=0:break
            a=rng.choices(range(len(probs)),weights=probs,k=1)[0]
            history.append(dict(player=p,**q['actions'][a]));path.append(a)
        else:continue
        if not q['terminal']:continue
        seats=[p for p in [4,5,0,1,2,3] if not q['folded'][p]]
        if len(seats)!=players:continue
        behind=[stack-float(q['invested'][p]) for p in seats]
        if min(behind)<=0 or max(behind)-min(behind)>1e-6:continue
        runout=[deck.pop() for _ in range(5)]
        board=runout[:3] if whole else runout
        ranges=[class_reach_to_combos(np.asarray(q['reach'][p])).tolist() for p in seats]
        spec=dict(version=VERSION,players=players,board=board,pot=float(q['pot']),stack=behind[0],ranges=ranges,path=[],extras=[],
                  profile=dict(utility='chip-ev',rake_rate=0,rake_cap=0),
                  range_origin=dict(source='internal approximate preflop model',synthetic=False,history=history),
                  assumptions='DRAFT range-conditioned river study. Internal approximate preflop ranges; intervening streets were not simulated. No rake. Not a whole hand or independently verified GTO.')
        if whole:spec['assumptions']='DRAFT full hand: internal approximate preflop-model ranges; all future postflop cards and betting are solved in one tree. No rake. Pending independent validation.'
        # Save the inputs BEFORE the expensive postflop solve so rejection remains auditable.
        ident=f'{seed}-{attempt}';atomic_json(out/(ident+'.input.json'),spec)
        try:
            if whole:
                from scroll_whole import full_hand
                actual={i:int(_engine.combo_index(*holes[p])) for i,p in enumerate(seats)}
                result=full_hand(spec,actual,seats,runout[3:]+deck,history,stack,rng,memory)
                atomic_json(out/(ident+'.fullhand.draft.json'),result);accepted+=1
                print(f'{ident}: saved complete quarantined hand',flush=True)
                if accepted>=4:return
                continue
            s,tokens,node,quality,drift,edrift=solve(spec,maximum=12000,memory=memory)
            _,weights,combos=arrays(node,players);actor=node['player']
            candidates=[i for i,c in enumerate(combos) if weights[actor,c]>1e-12]
            rng.shuffle(candidates)
            saved=0
            for i in candidates[:64]:
                try:scenario=scenario_from(s,tokens,node,spec,quality,int(combos[i]),drift,edrift)
                except ValueError:continue
                atomic_json(out/(ident+f'-{saved}.draft.json'),dict(publicationApproved=False,scenario=scenario,solve=spec))
                saved+=1
                if saved==4:break
            accepted+=saved
            print(f'{ident}: saved {saved} quarantined candidates',flush=True)
        except (ValueError,MemoryError,RuntimeError) as exc:
            atomic_json(out/(ident+'.rejected.json'),dict(error=str(exc),publicationApproved=False))
            print(f'{ident}: rejected: {exc}',flush=True)
        if accepted>=16:return
    if not accepted:raise RuntimeError('No stable candidate decisions produced within the batch budget')
    print(f'Batch complete: {accepted} candidates; no public publication',flush=True)


def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--out',type=Path,required=True)
    ap.add_argument('--role',choices=['fast','slow'],required=True);ap.add_argument('--hours',type=float,default=48)
    ap.add_argument('--backup-run');ap.add_argument('--audit',type=Path);ap.add_argument('--memory-mb',type=int,default=1536)
    ap.add_argument('--whole-hands',action='store_true');ap.add_argument('--preflight',action='store_true')
    ap.add_argument('--child',action='store_true');ap.add_argument('--players',type=int,default=2)
    ap.add_argument('--stack',type=int,default=40);ap.add_argument('--seed',type=int,default=1)
    a=ap.parse_args();a.out.mkdir(parents=True,exist_ok=True)
    if a.child:make_batch(a.out,a.players,a.stack,a.seed,a.memory_mb,a.whole_hands);return
    report=json.loads(a.audit.read_text())
    if report.get('passed') is not True or len(report.get('steps',[]))!=3 or any(s['exitCode'] for s in report['steps']):
        raise SystemExit('A completed passing internal audit is required for draft computation')
    if a.whole_hands:
        from flipup_gto.scroll_contract import fingerprint
        if report.get('engine')!=fingerprint():raise SystemExit('Whole-hand mode requires a fresh laptop audit after rebuilding the current engine')
    if a.preflight:
        print('Draft preflight passed; no computation started',flush=True);return
    import fcntl
    lock=(a.out/'.draft.lock').open('w');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    statepath=a.out/'status.json'
    state=json.loads(statepath.read_text()) if statepath.exists() else dict(started=time.time(),nextBatch=0,role=a.role,hours=a.hours,wholeHands=a.whole_hands)
    if state['role']!=a.role or state['hours']!=a.hours or state.get('wholeHands',False)!=a.whole_hands:raise ValueError('changed run configuration; choose a new run name')
    state['internalAuditEngine']=report.get('engine');state['publicationApproved']=False
    end=state['started']+a.hours*3600
    backup=None
    if os.environ.get('FLIPUP_UPLOAD_TOKEN') and os.environ.get('FLIPUP_COACH'):
        from campaign_sync import Artifacts
        backup=Artifacts()
    while time.time()<end:
        i=state['nextBatch'];players=3 if a.role=='fast' and i%3==2 else 2;stack=[20,40,100][(i//3)%3]
        folder=a.out/f'batch-{i:06d}';folder.mkdir(exist_ok=True)
        state.update(nextBatch=i+1,stage='computing drafts',players=players,stack=stack,publicationApproved=False,updated=time.time(),batchStarted=time.time())
        atomic_json(statepath,state)
        cmd=[sys.executable,'-u',str(Path(__file__).resolve()),'--child','--out',str(folder),'--role',a.role,
             '--players',str(players),'--stack',str(stack),'--seed',str(1000000*(1 if a.role=='fast' else 2)+i),'--memory-mb',str(a.memory_mb)]
        if a.whole_hands:cmd.append('--whole-hands')
        with (folder/'worker.log').open('ab') as log:
            p=subprocess.Popen(cmd,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
            try:
                batch_end=min(end,time.time()+1800)
                while True:
                    remaining=batch_end-time.time()
                    if remaining<=0:raise subprocess.TimeoutExpired(cmd,1800)
                    try:code=p.wait(timeout=min(30,remaining));break
                    except subprocess.TimeoutExpired:
                        if time.time()>=batch_end:raise
                        state['updated']=time.time();atomic_json(statepath,state)
                        print(f'Batch {i} still running: {players} players, {stack}bb; log {folder}/worker.log',flush=True)
            except subprocess.TimeoutExpired:
                os.killpg(p.pid,signal.SIGTERM)
                try:p.wait(timeout=10)
                except subprocess.TimeoutExpired:os.killpg(p.pid,signal.SIGKILL);p.wait()
                code=124
            except BaseException:
                os.killpg(p.pid,signal.SIGTERM);p.wait();raise
        state.update(lastExitCode=code,updated=time.time())
        if backup:
            try:
                backup.push(a.out,a.backup_run or ('whole-' if a.whole_hands else 'draft-')+a.out.parent.name+'-'+a.role)
                state.update(backup='uploaded',lastBackup=time.time());state.pop('backupError',None)
            except Exception as exc:state.update(backup='pending retry',backupError=str(exc))
        else:state['backup']='local only; upload credentials not configured'
        atomic_json(statepath,state)
        failures=state.get('consecutiveFailures',0)+1 if code else 0
        state['consecutiveFailures']=failures;atomic_json(statepath,state)
        if failures>=3:
            state.update(stage='stopped after three failures');atomic_json(statepath,state)
            raise SystemExit('Three failed/timed-out batches. Stopped to avoid wasting the run; inspect batch logs.')
    state.update(stage='time budget complete');atomic_json(statepath,state)

if __name__=='__main__':main()

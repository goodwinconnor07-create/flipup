#!/usr/bin/env python3
"""Read-only Ubuntu terminal dashboard. Standard library only; never imports a solver."""
import argparse
from collections import Counter
from datetime import datetime
import json
import math
from pathlib import Path
import shutil
import sys
import time


def read_json(path):
    try:
        value=json.loads(path.read_text())
        return value if isinstance(value,dict) else {}
    except (OSError,ValueError):return {}


def duration(seconds):
    if seconds is None:return 'unavailable'
    seconds=max(0,int(seconds));hours,rest=divmod(seconds,3600);minutes,seconds=divmod(rest,60)
    return f'{hours:02d}:{minutes:02d}:{seconds:02d}'


def compact(record):
    """Do not retain full private ranges/trees in a monitoring process."""
    def scenario(s):return {k:s[k] for k in ('players','board','quality') if k in s}
    if 'hand' in record:
        h=record['hand']
        return dict(hand=dict(id=h.get('id'),decisions=[dict(scenario=scenario(d.get('scenario',{}))) for d in h.get('decisions',[])]))
    if 'scenario' in record:return dict(scenario=scenario(record['scenario']))
    return dict(error=record.get('error','unspecified'))


def tail(path):
    try:
        with path.open('rb') as log:
            log.seek(0,2);log.seek(max(0,log.tell()-4096))
            return log.read().decode('utf-8',errors='replace').splitlines()[-3:]
    except OSError:return []


class Monitor:
    def __init__(self,root):
        self.root=Path(root).expanduser();self.cache={}

    def snapshot(self,now=None):
        now=time.time() if now is None else now
        root=self.root
        data=root/'candidates' if (root/'candidates').is_dir() else root
        state=read_json(data/'status.json');bootstrap=read_json(root/'bootstrap-status.json')
        files=[]
        # Only count candidate outputs, never downloaded/backup copies of them.
        for batch in data.glob('batch-*'):
            if batch.is_dir():files.extend(batch.glob('*.json'))
        counts=Counter();reasons=Counter();times=[];gaps=[];iterations=[];boards=Counter();players=Counter()
        latest=None;pending=set();finished=set();last_hand=None
        for path in files:
            try:stat=path.stat()
            except OSError:continue
            latest=max(latest or 0,stat.st_mtime)
            name=path.name
            if name.endswith('.input.json'):
                counts['attempts']+=1;pending.add(str(path)[:-len('.input.json')]);continue
            if not name.endswith(('.fullhand.draft.json','.draft.json','.rejected.json')):continue
            cached=self.cache.get(path)
            if cached is None or cached[0]!=(stat.st_mtime_ns,stat.st_size):
                record=read_json(path)
                if not record:continue
                record=compact(record)
                self.cache[path]=((stat.st_mtime_ns,stat.st_size),record)
            else:record=cached[1]
            if name.endswith('.rejected.json'):
                counts['rejected']+=1;reasons[str(record.get('error','unspecified'))]+=1
                finished.add(str(path)[:-len('.rejected.json')]);continue
            hand=record.get('hand')
            if hand:
                counts['hands']+=1;scenarios=[d.get('scenario',{}) for d in hand.get('decisions',[])]
                prefix=str(path)[:-len('.fullhand.draft.json')]
                if last_hand is None or stat.st_mtime>last_hand[0]:last_hand=(stat.st_mtime,hand.get('id','unknown'))
            else:
                scenarios=[record.get('scenario',{})];counts['standalone']+=1
                # A river root may yield several numbered decisions.
                prefix=str(path)[:-len('.draft.json')].rsplit('-',1)[0]
            finished.add(prefix)
            input_path=Path(prefix+'.input.json')
            if hand and input_path.exists():
                elapsed=stat.st_mtime-input_path.stat().st_mtime
                if elapsed>=0:times.append(elapsed)
            for scenario in scenarios:
                if not scenario:continue
                counts['questions']+=1;players[scenario.get('players','?')]+=1
                boards[{3:'flop',4:'turn',5:'river'}.get(len(scenario.get('board',[])),'unknown')]+=1
                quality=scenario.get('quality',{})
                for field,target in [('gapPct',gaps),('iterations',iterations)]:
                    value=quality.get(field)
                    if isinstance(value,(int,float)) and math.isfinite(value):target.append(value)
        # Bound cached data after files have been removed externally.
        known=set(files);self.cache={p:v for p,v in self.cache.items() if p in known}
        started=state.get('started');budget=state.get('hours')
        elapsed=max(0,now-started) if isinstance(started,(int,float)) else None
        remaining=max(0,budget*3600-elapsed) if elapsed is not None and isinstance(budget,(int,float)) else None
        stage=state.get('stage') if state else bootstrap.get('stage','waiting for progress files')
        if bootstrap.get('state') in ('failed','interrupted'):stage=f"{bootstrap.get('stage')}: {bootstrap['state']}"
        updated=max([v for v in (state.get('updated'),bootstrap.get('updated'),latest) if isinstance(v,(int,float))],default=None)
        logs=sorted(data.glob('batch-*/worker.log'))
        current_log=logs[-1] if logs else root/(str(bootstrap.get('stage','bootstrap'))+'.log')
        return dict(state=state,bootstrap=bootstrap,counts=counts,reasons=reasons,times=times,
                    gaps=gaps,iterations=iterations,boards=boards,players=players,elapsed=elapsed,
                    remaining=remaining,stage=stage,lastUpdateAge=now-updated if updated else None,
                    unresolved=len(pending-finished),lastHand=last_hand,data=data,logLines=tail(current_log))


def render(root,s):
    c=s['counts'];state=s['state'];elapsed=s['elapsed']
    def rate(n):return f'{n*3600/elapsed:.2f}/hour' if elapsed and elapsed>0 else 'unavailable'
    total=c['hands']+c['standalone']+c['rejected']
    rejection=f"{100*c['rejected']/total:.1f}%" if total else 'unavailable'
    lines=[
        'FLIPUP — LIVE SCROLL GENERATION',
        datetime.now().strftime('%a %d %b %H:%M:%S')+' | Ctrl+C closes this view only',
        f'Run: {root}',
        f"Stage: {s['stage']}",
        f"Role: {state.get('role','waiting')} | Current profile: {state.get('players','?')} players / {state.get('stack','?')}bb",
        f"Elapsed generation: {duration(elapsed)} | Budget remaining: {duration(s['remaining'])}",
        f"Current/last batch elapsed: {duration(time.time()-state['batchStarted'] if state.get('batchStarted') else None)}",
        '',
        f"Complete hands: {c['hands']}   Hero questions: {c['questions']}   Standalone scenarios: {c['standalone']}",
        f"Rejected roots: {c['rejected']} ({rejection} of recorded outcomes) | Inputs saved: {c['attempts']}",
        f"Hand throughput: {rate(c['hands'])} | Question throughput: {rate(c['questions'])}",
        f"Unresolved input files: {s['unresolved']} (may include interrupted attempts)",
    ]
    times=s['times']
    lines.append('Observed time per saved hand: '+(f'average {duration(sum(times)/len(times))} | fastest {duration(min(times))} | slowest {duration(max(times))}' if times else 'waiting for completed hands'))
    lines.extend([
        'Timing uses input/output timestamps; excludes preflop preparation and failed attempts.',
        'Questions by street: '+(' | '.join(f'{k}: {v}' for k,v in sorted(s['boards'].items())) or 'none yet'),
        'Questions by player count: '+(' | '.join(f'{k}p: {v}' for k,v in sorted(s['players'].items(),key=lambda x:str(x[0]))) or 'none yet'),
        f"Last recorded update: {duration(s['lastUpdateAge'])} ago (not a process-alive check)",
        f"Batch failures in a row: {state.get('consecutiveFailures',0)} | Last exit code: {state.get('lastExitCode','none')}",
        'Private backup: '+('pending retry / last upload failed' if state.get('backupError') else state.get('backup','not yet reported')),
        'Publication: PRIVATE CANDIDATES — counts do not certify accuracy',
    ])
    if s['gaps']:lines.append(f"Saved-question deviation: max {max(s['gaps']):.5f}% pot (within model/tree)")
    if s['iterations']:lines.append(f"Saved-question iterations: {min(s['iterations']):,.0f}–{max(s['iterations']):,.0f}")
    if state.get('lastBackup'):lines.append('Last successful backup: '+datetime.fromtimestamp(state['lastBackup']).strftime('%d %b %H:%M:%S'))
    if s['lastHand']:lines.append('Latest hand: '+s['lastHand'][1])
    try:lines.append(f'Free disk: {shutil.disk_usage(root).free/1024**3:.1f} GiB')
    except OSError:pass
    try:
        import os
        lines.append('System load (1/5/15 min): '+' / '.join(f'{v:.2f}' for v in os.getloadavg()))
        memory={line.split(':')[0]:int(line.split()[1]) for line in Path('/proc/meminfo').read_text().splitlines() if line.startswith(('MemTotal:','MemAvailable:'))}
        lines.append(f"System RAM available: {memory['MemAvailable']/1024**2:.1f} / {memory['MemTotal']/1024**2:.1f} GiB")
    except (OSError,KeyError,AttributeError):pass
    if s['reasons']:
        lines.append('Most common rejection reasons:')
        lines.extend(f'  {count} × {reason}' for reason,count in s['reasons'].most_common(3))
    lines.append('Solver output: '+str(s['data']/'batch-*'/'worker.log'))
    if s['logLines']:
        lines.append('Latest worker output:')
        lines.extend('  '+line for line in s['logLines'])
    if not s['state']:lines.append('Startup/audit may still be running; generation timer starts afterwards.')
    return '\n'.join(''.join(ch if ch.isprintable() else ' ' for ch in line) for line in lines)


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root',type=Path,required=True);p.add_argument('--refresh',type=float,default=5)
    p.add_argument('--once',action='store_true');a=p.parse_args()
    if not math.isfinite(a.refresh) or a.refresh<1:p.error('--refresh must be at least one second')
    monitor=Monitor(a.root)
    try:
        while True:
            view=render(monitor.root,monitor.snapshot())
            if sys.stdout.isatty() and not a.once:
                width=shutil.get_terminal_size().columns
                view='\n'.join(line[:width] for line in view.splitlines())
                print('\033[2J\033[H'+view,flush=True)
            else:print(view,flush=True)
            if a.once:break
            time.sleep(a.refresh)
    except KeyboardInterrupt:print('\nDashboard closed. Generator unchanged.')


if __name__=='__main__':main()

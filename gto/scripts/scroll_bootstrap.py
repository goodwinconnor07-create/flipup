#!/usr/bin/env python3
"""ON LAPTOP: rebuild, audit, then start whole-hand candidate generation in sequence."""
import argparse
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
def atomic_json(path,value):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    temporary=path.with_suffix(path.suffix+'.part')
    temporary.write_text(json.dumps(value,allow_nan=False));temporary.replace(path)


def run_stage(name,cmd,root,out):
    status=out/'bootstrap-status.json'
    atomic_json(status,dict(stage=name,state='running',updated=time.time()))
    print(f'Starting {name}; see {out}/{name}.log',flush=True)
    with (out/(name+'.log')).open('ab') as log:
        child=subprocess.Popen(list(map(str,cmd)),cwd=root,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
        try:code=child.wait()
        except BaseException:
            os.killpg(child.pid,signal.SIGTERM)
            try:child.wait(timeout=10)
            except subprocess.TimeoutExpired:os.killpg(child.pid,signal.SIGKILL);child.wait()
            atomic_json(status,dict(stage=name,state='interrupted',updated=time.time()));raise
    atomic_json(status,dict(stage=name,state='failed' if code else 'complete',exitCode=code,updated=time.time()))
    if code:raise SystemExit(f'{name} failed. Later stages blocked. Read {out}/{name}.log')


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--role',choices=['fast','slow'],required=True)
    p.add_argument('--out',type=Path,required=True);p.add_argument('--hours',type=float,default=48)
    p.add_argument('--memory-mb',type=int,default=1536);a=p.parse_args()
    root=Path(__file__).resolve().parents[1];out=a.out.expanduser().resolve();out.mkdir(parents=True,exist_ok=True)
    import fcntl
    lock=(out/'.bootstrap.lock').open('w');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    stages=[('configure',['cmake','-S',root/'engine','-B',root/'build-network',f'-DPython3_EXECUTABLE={sys.executable}']),
            ('build',['cmake','--build',root/'build-network','-j','2','--target','_engine','test_solver']),
            ('audit',[sys.executable,'-u',root/'scripts/laptop_engine_audit.py','--out',out/'audit']),
            ('whole-hands',[sys.executable,'-u',root/'scripts/scroll_drafts.py','--whole-hands','--role',a.role,
                            '--out',out/'candidates','--backup-run','whole-'+out.parent.name+'-'+a.role,'--audit',out/'audit/internal-audit.json','--hours',a.hours,'--memory-mb',a.memory_mb])]
    for name,cmd in stages:
        if name=='whole-hands':
            import shutil
            # Include the numerical audit and setup logs in automatic candidate backups.
            destination=out/'candidates'/'audit'
            if destination.exists():shutil.rmtree(destination)
            shutil.copytree(out/'audit',destination)
            for source in out.glob('*.log'):shutil.copyfile(source,out/'candidates'/('bootstrap-'+source.name))
        run_stage(name,cmd,root,out)
    print('Whole-hand run complete; candidates remain unapproved pending independent checks.',flush=True)

if __name__=='__main__':main()

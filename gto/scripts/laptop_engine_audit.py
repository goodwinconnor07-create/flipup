#!/usr/bin/env python3
"""Run ONLY on a laptop: internal engine regressions, without producing Scroll content.

This is a diagnostic report, NOT an external-reference publication approval.
"""
import argparse
import json
from pathlib import Path
import subprocess
import sys
import time
import os
import signal
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from flipup_gto.scroll_contract import fingerprint
from flipup_gto.value_data import atomic_json


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--out',type=Path,required=True)
    a=p.parse_args();root=Path(__file__).resolve().parents[1];a.out.mkdir(parents=True,exist_ok=True)
    steps=[['./build-network/test_solver'],
           [sys.executable,'-m','pytest','-q','tests/test_solver.py','tests/test_scroll_multistreet.py','tests/test_multiway.py','tests/test_scroll_scenarios.py::test_zero_opponent_reach_does_not_freeze_off_path_average_strategy'],
           [sys.executable,'scripts/audit_multiway_teacher.py','--cases','100','--out',str((a.out/'card-removal.json').resolve())]]
    report=dict(engine=fingerprint(),started=time.time(),steps=[],passed=False,publicationApproved=False)
    atomic_json(a.out/'internal-audit.json',report)
    for i,cmd in enumerate(steps):
        print(f'Stage {i+1}/{len(steps)} starting. Log: {a.out}/step-{i}.log',flush=True)
        report.update(stage=i+1,status='running',updated=time.time());atomic_json(a.out/'internal-audit.json',report)
        with (a.out/f'step-{i}.log').open('w') as log:
            proc=subprocess.Popen(cmd,cwd=root,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
            try:
                while True:
                    try:code=proc.wait(timeout=15);break
                    except subprocess.TimeoutExpired:
                        report['updated']=time.time();atomic_json(a.out/'internal-audit.json',report)
                        print(f'Stage {i+1} still running; details are in step-{i}.log',flush=True)
            except BaseException:
                os.killpg(proc.pid,signal.SIGTERM)
                try:proc.wait(timeout=10)
                except subprocess.TimeoutExpired:os.killpg(proc.pid,signal.SIGKILL);proc.wait()
                report.update(status='interrupted',passed=False);atomic_json(a.out/'internal-audit.json',report)
                raise
        report.update(status='failed' if code else 'stage completed');report['steps'].append(dict(command=cmd,exitCode=code));atomic_json(a.out/'internal-audit.json',report)
        if code:raise SystemExit(f'Engine audit failed; see {a.out}/step-{i}.log. Do not generate Scroll.')
    report.update(passed=True,completed=time.time());atomic_json(a.out/'internal-audit.json',report)
    print('Internal checks passed. Matching external comparisons and production range inputs are still required.')

if __name__=='__main__':main()

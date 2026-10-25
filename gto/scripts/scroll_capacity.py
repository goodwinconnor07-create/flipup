#!/usr/bin/env python3
"""LAPTOP ONLY: build one saved input tree without running any solver iterations."""
import argparse
import json
from pathlib import Path
import subprocess
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--input',type=Path,required=True);p.add_argument('--memory-mb',type=int)
    p.add_argument('--child',action='store_true');p.add_argument('--out',type=Path)
    a=p.parse_args()
    if a.child:
        from flipup_gto.scroll_scenarios import build
        spec=json.loads(a.input.read_text());spec=spec.get('spec',spec)
        try:
            solver=build(spec,a.memory_mb)
            engine=getattr(solver,'engine',solver)
            print(json.dumps(dict(fits=True,nodes=engine.num_nodes,memoryBytes=engine.memory_bytes,iterationsRun=0)))
        except (ValueError,RuntimeError,MemoryError) as exc:
            print(json.dumps(dict(fits=False,error=str(exc),iterationsRun=0)))
        return
    from scroll_resources import detect
    memory=a.memory_mb or detect()[1]
    print(f'Building saved tree with {memory} MiB budget; no solving. Maximum check time: 90 seconds.',flush=True)
    command=[sys.executable,str(Path(__file__).resolve()),'--child','--input',str(a.input.resolve()),'--memory-mb',str(memory)]
    try:
        run=subprocess.run(command,capture_output=True,text=True,timeout=90)
        try:report=json.loads(run.stdout.strip().splitlines()[-1])
        except (ValueError,IndexError):report=dict(fits=False,error='Tree process failed: '+run.stderr[-1500:],exitCode=run.returncode)
    except subprocess.TimeoutExpired:report=dict(fits=False,error='Tree construction exceeded 90 seconds')
    report.update(input=str(a.input),memoryBudgetMiB=memory,solverIterationsRun=0,publicationApproved=False)
    if a.out:
        a.out.parent.mkdir(parents=True,exist_ok=True);a.out.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))
    if not report['fits']:raise SystemExit(1)


if __name__=='__main__':main()

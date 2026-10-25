#!/usr/bin/env python3
"""RUN ON THE LAPTOP ONLY. Validate the engine before allowing Scroll publication.

Runs the existing analytical HU and independent 3p card-removal regressions, then
compares exact matching externally supplied reference cases. No reference answers
are manufactured. The receipt is invalidated when the engine or validation code changes.
"""
import argparse
import json
from pathlib import Path
import subprocess
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from flipup_gto.scroll_contract import fingerprint,validate_job
from flipup_gto.value_data import atomic_json,digest


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--references',type=Path,required=True)
    ap.add_argument('--out',type=Path,required=True)
    ap.add_argument('--memory-mb',type=int,default=1536)
    a=ap.parse_args();root=Path(__file__).resolve().parents[1]
    # Write failure first: an interrupted audit cannot leave an old success receipt.
    report=dict(engine=fingerprint(),passed=False,coverage=[],cases=[])
    atomic_json(a.out,report)
    subprocess.run([str(root/'build-network/test_solver')],check=True,cwd=root)
    subprocess.run([sys.executable,'-m','pytest','-q','tests/test_multiway.py'],check=True,cwd=root)
    from flipup_gto.scroll_scenarios import solve_entry,VERSION
    from flipup_gto.cards import parse_combo
    cases=json.loads(a.references.read_text())['cases']
    if not cases:raise ValueError('no external reference cases supplied')
    for case in cases:
        spec=case['spec'];spec['version']=VERSION;validate_job(spec)
        if case.get('source')!='gto-wizard' or case.get('matching_settings_confirmed') is not True:
            raise ValueError('reference ranges, rake, history and bet menu must actually match')
        # Explicit full input digest guards against comparing similar-looking different games.
        if case['input_digest']!=digest(spec):raise ValueError('reference inputs changed')
        actual=solve_entry(spec,parse_combo(''.join(case['hero_cards'])),maximum=20000,memory=a.memory_mb)
        worst=0.
        for ref in case['actions']:
            matches=[o for o in actual['options'] if o['kind']==ref['kind'] and abs(o['to']-ref['to'])<1e-6]
            if len(matches)!=1:raise ValueError('reference action missing from computed menu')
            worst=max(worst,abs(matches[0]['ev']-ref['ev'])/actual['pot'])
        if len(case['actions'])!=len(actual['options']):raise ValueError('reference must cover the whole computed menu')
        # Frequencies need not agree in degenerate equal-EV equilibria; compare action values.
        passed=worst<=.005
        report['cases'].append(dict(id=case['id'],passed=passed,maxActionEvErrorPot=worst))
        if passed:report['coverage'].append([spec['players'],{3:'flop',4:'turn',5:'river'}[len(spec['board'])]])
        atomic_json(a.out,report)
    report['passed']=all(c['passed'] for c in report['cases'])
    atomic_json(a.out,report)
    if not report['passed']:raise SystemExit('reference disagreement: publication blocked')

if __name__=='__main__':main()

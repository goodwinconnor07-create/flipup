#!/usr/bin/env python3
"""Publish only explicitly reviewed complete hands after independent laptop validation.

A normal draft run never calls this script. The approval plan lists exact file hashes
and a current validation receipt; editing a hand after review invalidates its approval.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from coach_client import Coach
from flipup_gto.scroll_contract import require_validation,validate_job
from flipup_gto.scroll_scenarios import validate_public


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--plan',type=Path,required=True)
    p.add_argument('--validation',type=Path,required=True);p.add_argument('--jobs-out',type=Path);a=p.parse_args()
    validation=require_validation(a.validation);plan=json.loads(a.plan.read_text())
    client=Coach()
    # Preflight the whole plan before sending any publications.
    entries=[]
    for row in plan['hands']:
        path=(a.plan.parent/row['file']).resolve();body=path.read_bytes()
        if hashlib.sha256(body).hexdigest()!=row['sha256']:raise ValueError('reviewed hand content changed')
        if row.get('rangeModelIndependentlyChecked') is not True:raise ValueError('preflop range model requires independent review')
        entry=json.loads(body);validate_job(entry['root'])
        for d in entry['privateDecisions']:
            s=validate_public(d['scenario']);require_validation(a.validation,s['players'],{3:'flop',4:'turn',5:'river'}[len(s['board'])])
        entry['hand']['publicationApproved']=True
        # Preserve the scope of the source model, even after a review has approved it.
        entry['hand']['validation']=validation
        selected={d['scenario']['id'] for d in entry['hand']['decisions']}
        entry['privateDecisions']=[d for d in entry['privateDecisions'] if d['scenario']['id'] in selected]
        entries.append(entry)
    for entry in entries:
        client._call('POST','/scroll/hands/publish',json.dumps(dict(items=[entry],validation=validation),allow_nan=False).encode())
    if a.jobs_out:
        from flipup_gto.value_data import atomic_json
        roots=[s for e in entries for s in e.get('trainingRoots',[])]
        for s in roots:validate_job(s)
        atomic_json(a.jobs_out,dict(spots=roots,source='reviewed complete-hand reached ranges'))
    print(f'{len(entries)} reviewed hands published')

if __name__=='__main__':main()

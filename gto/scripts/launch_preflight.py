#!/usr/bin/env python3
"""Read-only HTTP launch checks. Never queues, solves, uploads, or publishes a hand."""
import argparse
import json
import sys
import urllib.request
from pathlib import Path


def inspect(app, coach):
    checks=[]
    def get(label,base,path):
        try:
            with urllib.request.urlopen(base.rstrip('/')+path,timeout=20) as response:
                value=json.load(response)
            checks.append(dict(check=label,passed=True))
            return value
        except Exception as exc:
            checks.append(dict(check=label,passed=False,error=str(exc)))
            return None
    app_health=get('app',app,'/api/health')
    health=get('coach',coach,'/health')
    proxy=get('app-to-coach',app,'/api/gto/health')
    catalogue=get('scenario-catalogue',coach,'/scroll/catalogue')
    hands=get('hand-catalogue',coach,'/scroll/hands/catalogue')
    checks.extend([
        dict(check='app-healthy',passed=bool(app_health and app_health.get('ok') is True)),
        dict(check='coach-healthy',passed=bool(health and health.get('ok') is True)),
        dict(check='proxy-matches-coach',passed=bool(health and proxy and health.get('engine') and proxy.get('engine')==health['engine'])),
        dict(check='approved-scenarios-available',passed=bool(catalogue and catalogue.get('count',0)>0)),
        dict(check='approved-whole-hands-available',passed=bool(hands and hands.get('count',0)>0)),
    ])
    # HTTP checks cannot establish the correctness of private ranges or external references.
    return dict(httpChecksPassed=all(c['passed'] for c in checks),launchApproved=False,
                checks=checks,coach=health,
                remainingReview='Matching external solver references, ranges, content quality, supported profiles, and device testing must be reviewed separately.')


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--app',default='https://gtoduel.online')
    p.add_argument('--coach',default='https://flipup-gto.fly.dev')
    p.add_argument('--out',type=Path,required=True)
    a=p.parse_args();report=inspect(a.app,a.coach)
    a.out.parent.mkdir(parents=True,exist_ok=True)
    a.out.write_text(json.dumps(report,indent=2)+'\n')
    for check in report['checks']:print(('PASS ' if check['passed'] else 'BLOCKED ')+check['check'])
    print('Report:',a.out)
    if not report['httpChecksPassed']:sys.exit(1)


if __name__=='__main__':main()

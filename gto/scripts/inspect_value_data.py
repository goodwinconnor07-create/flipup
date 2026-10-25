#!/usr/bin/env python3
"""Summarize pilot coverage, rejection reasons and measured cost without loading torch."""
import argparse
from collections import Counter
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import numpy as np
from flipup_gto.value_data import atomic_json, board_group


def summarize(root):
    root = Path(root).expanduser()
    manifest = json.loads((root / 'manifest.json').read_text())
    accepted, rejected = [], []
    groups = set()
    for path in sorted(root.glob('*.npz')):
        with np.load(path, allow_pickle=False) as d:
            accepted.append(json.loads(str(d['metadata'])))
            groups.add(board_group(d['board']))
    for path in root.glob('*.reject.json'):
        rejected.append(json.loads(path.read_text()))
    times = [r['seconds'] for r in accepted + rejected]
    times_good = [r['seconds'] for r in accepted]
    gaps = [r['gap_pct'] for r in accepted]
    n = len(accepted) + len(rejected)
    def quantiles(v):
        return dict(median=float(np.median(v)), p95=float(np.quantile(v, .95)), worst=float(max(v))) if v else None
    return dict(job=str(root), street=manifest['street'], worker=manifest['worker'],
                accepted=len(accepted), rejected=len(rejected), rejection_fraction=len(rejected)/n if n else None,
                rejection_reasons=dict(Counter(r['reason'] for r in rejected)),
                splits=dict(Counter(r['split'] for r in accepted)), distinct_parent_flops=len(groups),
                origins=dict(Counter('synthetic' if r['origin']=='synthetic' else r['origin'].split('/')[0] for r in accepted)),
                accepted_gap_pct=quantiles(gaps), accepted_solve_seconds=quantiles(times_good),
                measured_hours_per_1000_accepted=sum(times)/len(accepted)/3.6 if accepted else None,
                note='Time estimate includes measured rejected solves, excludes downtime. Inspect rejected coverage before scaling.')


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('jobs', nargs='+')
    ap.add_argument('--out', type=Path)
    args = ap.parse_args()
    report = [summarize(root) for root in args.jobs]
    if args.out:
        atomic_json(args.out, report)
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()

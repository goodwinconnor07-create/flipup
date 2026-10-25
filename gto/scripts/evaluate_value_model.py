#!/usr/bin/env python3
"""Independent held-out test metrics; does not select or modify a checkpoint."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import numpy as np
from train_value_model import load_jobs
from flipup_gto import valuenet as vn
from flipup_gto.value_data import atomic_json


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('jobs', nargs='+')
    ap.add_argument('--model', type=Path, required=True)
    ap.add_argument('--out', type=Path, required=True)
    args = ap.parse_args()
    with np.load(args.model, allow_pickle=False) as data:
        meta = json.loads(str(data['metadata']))
    rows, manifests = load_jobs(args.jobs, meta['street'])
    if any(m['source'] != meta['teacher'] for m in manifests):
        raise ValueError('checkpoint and test set teacher versions differ')
    used = {tuple(g) for g in meta['train_groups'] + meta['selection_groups']}
    test = [r for r in rows if r['meta']['split'] == 'test']
    if not test or any(tuple(r['group']) in used for r in test):
        raise ValueError('no untouched test boards, or test groups overlap training/selection')
    net = vn.load(args.model)
    results = []
    for r in test:
        pred = vn.predict(net, r['x'])
        mask = np.isfinite(r['y'])
        w = r['x'][:128].reshape(2, 64) * mask
        err = np.abs(pred - np.nan_to_num(r['y']))
        results.append(dict(sample=r['meta']['sample_id'], worker=r['meta']['worker'], origin=r['meta']['origin'],
                            weighted_mae=float((err * w).sum() / w.sum()), max_bucket_error=float(err[mask].max())))
    errors = [r['weighted_mae'] for r in results]
    report = dict(model=str(args.model), samples=len(test), mean=float(np.mean(errors)),
                  p95=float(np.quantile(errors, .95)), worst=float(max(errors)),
                  note='Value error only; does not certify strategy quality or full-game exploitability.', results=results)
    atomic_json(args.out, report)
    print(json.dumps({k: v for k, v in report.items() if k != 'results'}, indent=2))


if __name__ == '__main__':
    main()

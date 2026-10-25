#!/usr/bin/env python3
"""Train versioned data, hold out entire suit-equivalent parent flops, export engine-compatible weights."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import numpy as np
import torch
from train_value_net import Net
from flipup_gto import valuenet as vn
from flipup_gto.value_data import atomic_json, atomic_npz, board_group, canonical_board, digest, split_for


def remove_root_board_leaks(rows):
    # The same final board can be reached from different parent flops. Quarantine
    # every copy when these parents assigned it to different splits.
    assignments = {}
    for r in rows:
        assignments.setdefault(tuple(r['root_group']), set()).add(r['meta']['split'])
    bad = {key for key, splits in assignments.items() if len(splits) > 1}
    return [r for r in rows if tuple(r['root_group']) not in bad], len(bad)


def load_jobs(roots, street):
    rows, ids, manifests = [], set(), []
    for root in sorted(set(Path(r).expanduser().resolve() for r in roots)):
        manifest = json.loads((root / 'manifest.json').read_text())
        if manifest['street'] != street or manifest['schema'] != 1:
            raise ValueError(f'{root}: wrong street or data schema')
        manifests.append(manifest)
        for path in sorted(root.glob('*.npz')):
            with np.load(path, allow_pickle=False) as d:
                meta = json.loads(str(d['metadata']))
                uid = (meta['seed'], meta['street'], meta['worker'], meta['sample_id'])
                if uid in ids:
                    raise ValueError(f'duplicate sample identity: {path}')
                ids.add(uid)
                if meta['job'] != digest(manifest) or not np.isfinite(meta['gap_pct']) or meta['gap_pct'] > manifest['target']:
                    raise ValueError(f'{path}: teacher quality/provenance mismatch')
                if meta['split'] != split_for(d['board']):
                    raise ValueError(f'{path}: split mismatch')
                x, y = d['x'].copy(), d['y'].copy()
                if x.shape != (129,) or y.shape != (2, 64) or not np.isfinite(x).all():
                    raise ValueError(f'{path}: invalid features')
                if np.isinf(y).any() or not np.isfinite(y).any():
                    raise ValueError(f'{path}: invalid labels')
                rows.append(dict(x=x, y=y, meta=meta, group=list(board_group(d['board'])), path=str(path),
                                 root_group=list(canonical_board(d['board'])),
                                 sha=hashlib.sha256(path.read_bytes()).hexdigest()))
    if not rows:
        raise ValueError('no accepted data; run generation first')
    signatures = {(m['source'], m['tree'], m['features']) for m in manifests}
    if len(signatures) != 1:
        raise ValueError('different teacher/feature versions; do not merge these datasets')
    rows, overlaps = remove_root_board_leaks(rows)
    if overlaps:
        print(f'Quarantined {overlaps} final-board groups that occurred in multiple splits.', flush=True)
    if not rows:
        raise ValueError('no data remains after board leakage checks')
    return rows, manifests


def tensors(rows):
    x = torch.tensor(np.asarray([r['x'] for r in rows]))
    raw = np.asarray([r['y'] for r in rows])
    mask = torch.tensor(np.isfinite(raw), dtype=torch.float32)
    y = torch.tensor(np.nan_to_num(raw))
    mass = x[:, :128].reshape(-1, 2, 64) * mask
    return x, y, mask, mass


def metrics(net, rows):
    if not rows:
        return {'samples': 0}
    x, y, mask, mass = tensors(rows)
    with torch.no_grad():
        error = (net(x) - y).abs()
    sample_error = (error * mass).sum((1, 2)) / mass.sum((1, 2)).clamp_min(1e-12)
    return dict(samples=len(rows), bucket_mae=float((error * mask).sum() / mask.sum()),
                range_weighted_mae=float((error * mass).sum() / mass.sum()),
                sample_error_p95=float(torch.quantile(sample_error, .95)),
                sample_error_max=float(sample_error.max()))


def export_model(out, net, metadata, street):
    state = {k: v.detach().numpy().copy() for k, v in net.state_dict().items()}
    extra = {'s_edges': np.asarray(vn.TURN_S_EDGES, dtype=np.float32)} if street == 'turn' else {}
    atomic_npz(out, k=np.asarray(64), names=np.asarray(list(state)),
               **{f'w{i}': v for i, v in enumerate(state.values())}, **extra,
               metadata=np.asarray(json.dumps(metadata)))


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('jobs', nargs='+', help='job directories, each containing manifest.json')
    ap.add_argument('--street', choices=['river', 'turn'], required=True)
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--epochs', type=int, default=300)
    ap.add_argument('--hidden', type=int, default=256)
    ap.add_argument('--seed', type=int, default=7)
    ap.add_argument('--threads', type=int, default=2)
    args = ap.parse_args()
    if min(args.epochs, args.hidden, args.threads) < 1:
        ap.error('epochs, hidden and threads must be positive')
    torch.set_num_threads(args.threads)
    torch.manual_seed(args.seed)
    np.random.seed(args.seed)
    rows, manifests = load_jobs(args.jobs, args.street)
    tr = [r for r in rows if r['meta']['split'] == 'train']
    va = [r for r in rows if r['meta']['split'] == 'validation']
    if len(tr) < 2 or len(va) < 2:
        ap.error('need at least two training and two validation samples (different held-out flop groups); generate more')
    args.out = args.out.expanduser().resolve()
    args.out.parent.mkdir(parents=True, exist_ok=True)
    if args.out.exists():
        ap.error('output already exists; choose a new checkpoint name to preserve previous results')
    net = Net(64, hidden=args.hidden)
    opt = torch.optim.Adam(net.parameters(), lr=1e-3)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(opt, args.epochs)
    x, y, mask, mass = tensors(tr)
    # Range-weighted primary objective, plus a small uniform term to protect rare hands.
    weights = mass + .1 * mask / 64
    best, history = float('inf'), []
    provenance = digest([(r['meta']['job'], r['meta']['sample_id'], r['sha']) for r in rows])
    for epoch in range(args.epochs):
        net.train()
        perm = torch.randperm(len(x))
        for start in range(0, len(x), 256):
            ix = perm[start:start + 256]
            opt.zero_grad()
            loss = torch.nn.functional.huber_loss(net(x[ix]), y[ix], reduction='none', delta=.5)
            loss = (loss * weights[ix]).sum() / weights[ix].sum().clamp_min(1e-12)
            if not torch.isfinite(loss):
                raise ValueError('nonfinite training loss; checkpoint was not published')
            loss.backward()
            opt.step()
        scheduler.step()
        if (epoch + 1) % 10 == 0 or epoch + 1 == args.epochs:
            net.eval()
            score = metrics(net, va)
            print(f'epoch {epoch + 1}: {score}', flush=True)
            history.append({'epoch': epoch + 1, **score})
            if score['range_weighted_mae'] < best:
                best = score['range_weighted_mae']
                metadata = dict(schema=1, street=args.street, features='strength64-v1', players=2, rake=0,
                                teacher=manifests[0]['source'], seed=args.seed, data=provenance,
                                split_policy='parent-flop; cross-split final-board overlaps quarantined',
                                validation=score, epoch=epoch + 1, status='candidate-not-approved',
                                train_groups=sorted({tuple(r['group']) for r in tr}),
                                selection_groups=sorted({tuple(r['group']) for r in va}))
                export_model(args.out, net, metadata, args.street)
                atomic_json(args.out.with_suffix('.report.json'), dict(metadata=metadata, history=history,
                            train_samples=len(tr), validation_samples=len(va),
                            untouched_test_samples=sum(r['meta']['split'] == 'test' for r in rows), manifests=manifests))
    print(f'Candidate saved: {args.out}. Test and full-tree benchmarks are still required.', flush=True)


if __name__ == '__main__':
    main()

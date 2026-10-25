#!/usr/bin/env python3
"""Reliable heads-up teachers. See docs/NETWORK_PLAN.md for the two-laptop runbook."""
from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import numpy as np
from flipup_gto import valuenet as vn
from flipup_gto import _engine
from flipup_gto.solver import PostflopSolver
from flipup_gto.value_data import (SCHEMA, LibrarySampler, atomic_json, atomic_npz, converge,
                                   digest, encode, rich_sizing, sample_rng, split_for)


def source_fingerprint():
    root = Path(__file__).resolve().parents[1]
    paths = sorted([*root.joinpath('engine/src').glob('*.cpp'), *root.joinpath('engine/include/flipup').glob('*.h'),
                    *root.joinpath('flipup_gto').glob('*.py'), Path(__file__).resolve()])
    return digest([(str(p.relative_to(root)), hashlib.sha256(p.read_bytes()).hexdigest()) for p in paths])


def random_spot(rng, street):
    n = 4 if street == 'turn' else 5
    board = [int(c) for c in rng.choice(52, n, replace=False)]
    ranks = vn.percentile(vn.turn_stats(board)[0]) if n == 4 else vn.strength_ranks(board)
    r0, r1 = vn.random_range(ranks, rng), vn.random_range(ranks, rng)
    pot = float(np.exp(rng.uniform(np.log(4), np.log(120))))
    spr = float(np.exp(rng.uniform(np.log(.1), np.log(25))))
    return board, r0, r1, pot, min(250., pot * spr), 'synthetic'


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--street', choices=['river', 'turn'], required=True)
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--worker', type=int, choices=[0, 1], required=True)
    ap.add_argument('--seed', type=int, default=20261025)
    ap.add_argument('--samples', type=int, default=10000, help='total attempted sample ids; increasing resumes the job')
    ap.add_argument('--library', default='', help='local flop root; required for turn unless --synthetic-only')
    ap.add_argument('--synthetic-only', action='store_true', help='testing/river baseline; not the production turn curriculum')
    ap.add_argument('--library-share', type=float, default=.7)
    ap.add_argument('--target', type=float, default=.2, help='maximum exact-tree gap in percent of pot')
    ap.add_argument('--max-iterations', type=int, default=3000)
    ap.add_argument('--memory-mb', type=int, default=2048, help='engine regret/strategy storage cap; leave additional RAM for tree/OS')
    ap.add_argument('--max-hours', type=float, default=8, help='wall budget, checked between samples')
    args = ap.parse_args()
    if args.samples <= 0 or args.max_iterations <= 0 or args.target <= 0 or args.memory_mb <= 0:
        ap.error('samples, iterations, target and memory must be positive')
    if args.seed < 0 or args.max_hours < 0 or not 0 < args.library_share <= 1:
        ap.error('invalid seed, hours or library share')
    if args.street == 'turn' and not args.library and not args.synthetic_only:
        ap.error('turn production needs --library; --synthetic-only is explicitly for a baseline/smoke test')
    if args.library and (args.street != 'turn' or args.synthetic_only):
        ap.error('--library applies to turn and cannot be combined with --synthetic-only')
    args.out = args.out.expanduser().resolve()
    args.out.mkdir(parents=True, exist_ok=True)
    lock = (args.out / 'job.lock').open('w')
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        sys.exit('another generator owns this job directory')
    lib = LibrarySampler(args.library) if args.library else None
    config = dict(schema=SCHEMA, street=args.street, worker=args.worker, seed=args.seed,
                  source=source_fingerprint(), library=lib.fingerprint if lib else None,
                  engine_binary=hashlib.sha256(Path(_engine.__file__).read_bytes()).hexdigest(),
                  numpy_version=np.__version__,
                  library_share=args.library_share if lib else 0, target=args.target,
                  max_iterations=args.max_iterations, memory_mb=args.memory_mb,
                  tree='rich-33-75-125-raise60-r2-norake', features='strength64-v1')
    manifest = args.out / 'manifest.json'
    if manifest.exists():
        if json.loads(manifest.read_text()) != config:
            sys.exit('job configuration/source/library changed; use a NEW --out directory. Existing data is untouched.')
    else:
        atomic_json(manifest, config)
    accepted = rejected = 0
    started = time.monotonic()
    try:
        for i in range(args.samples):
            stem = args.out / f'{i:08d}'
            if stem.with_suffix('.npz').exists():
                accepted += 1
                continue
            if stem.with_suffix('.reject.json').exists():
                rejected += 1
                continue
            if args.max_hours and time.monotonic() - started >= args.max_hours * 3600:
                break
            if shutil.disk_usage(args.out).free < 2 * 1024**3:
                raise RuntimeError('less than 2 GiB free; free disk space before resuming')
            rng = sample_rng(args.seed, args.street, args.worker, i)
            t0 = time.monotonic()
            # Bad/corrupt library files and programming errors stop the run. Never silently substitute random data.
            spot = lib.sample(rng) if lib and rng.random() < args.library_share else random_spot(rng, args.street)
            board, r0, r1, pot, stack, origin = spot
            meta = dict(sample_id=i, worker=args.worker, street=args.street, seed=args.seed, origin=origin,
                        split=split_for(board), pot=pot, stack=stack, job=digest(config))
            try:
                solver = PostflopSolver(board, pot, stack, r0, r1, sizing=rich_sizing(),
                                        compress=False, max_memory_mb=args.memory_mb)
                iterations, gap = converge(solver, args.target, args.max_iterations)
            except (MemoryError, OverflowError) as exc:
                # pybind translates the engine's length_error to ValueError; handled below.
                meta.update(reason=str(exc), seconds=time.monotonic() - t0)
                atomic_json(stem.with_suffix('.reject.json'), meta)
                rejected += 1
                continue
            except ValueError as exc:
                if 'tree needs' not in str(exc):
                    raise
                meta.update(reason=str(exc), seconds=time.monotonic() - t0)
                atomic_json(stem.with_suffix('.reject.json'), meta)
                rejected += 1
                continue
            meta.update(iterations=iterations, gap_pct=gap, seconds=time.monotonic() - t0)
            if gap > args.target:
                meta['reason'] = 'convergence target not reached'
                atomic_json(stem.with_suffix('.reject.json'), meta)
                rejected += 1
            else:
                arrays = encode(board, r0, r1, pot, stack, solver.engine.query([], False, True))
                atomic_npz(stem.with_suffix('.npz'), **arrays, metadata=np.asarray(json.dumps(meta)))
                accepted += 1
            elapsed = time.monotonic() - started
            atomic_json(args.out / 'status.json', dict(accepted=accepted, rejected=rejected,
                        last_id=i, last=meta, elapsed_seconds=elapsed, updated_utc=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())))
            print(f'{i}: {accepted} accepted / {rejected} rejected; gap {gap:.4f}% in {meta["seconds"]:.1f}s ({origin})', flush=True)
    except KeyboardInterrupt:
        print('Stopped; completed samples are safe. Repeat the same command to resume.', flush=True)
    print(f'Finished: {accepted} accepted, {rejected} rejected. Data: {args.out}', flush=True)


if __name__ == '__main__':
    main()

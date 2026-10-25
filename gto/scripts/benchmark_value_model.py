#!/usr/bin/env python3
"""Compare neural-leaf root decisions to a converged full-tree reference on one case.

--case is an accepted turn data sample (for a river model). --flop-file is a
stored flop library entry (for a turn model). No full-game certification is implied.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import sys
import time
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import numpy as np
from flipup_gto import valuenet as vn
from flipup_gto.cards import parse_cards
from flipup_gto.solver import PostflopSolver
from flipup_gto.value_data import atomic_json, converge, rich_sizing, split_for


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--model', type=Path, required=True)
    group = ap.add_mutually_exclusive_group(required=True)
    group.add_argument('--case', type=Path)
    group.add_argument('--flop-file', type=Path)
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--memory-mb', type=int, default=2048)
    ap.add_argument('--max-iterations', type=int, default=3000)
    ap.add_argument('--leaf-iterations', type=int, default=300)
    ap.add_argument('--target', type=float, default=.1)
    args = ap.parse_args()
    if args.case:
        with np.load(args.case, allow_pickle=False) as d:
            board, ranges = d['board'].tolist(), d['ranges'].copy()
            meta = json.loads(str(d['metadata']))
            pot, stack = meta['pot'], meta['stack']
    else:
        board = parse_cards(args.flop_file.stem)
        with np.load(args.flop_file, allow_pickle=False) as d:
            meta = json.loads(str(d['meta']))
            pot, stack = meta['pot'], meta['stack']
            ranges = np.zeros((2, 1326), dtype=np.float32)
            seen = set()
            for key, node in sorted(meta['nodes'].items(), key=lambda v: len(v[0])):
                p = node['player']
                if p not in seen:
                    ranges[p, d[f'combos{p}']] = d[f'r:{key}']
                    seen.add(p)
            if seen != {0, 1}:
                raise ValueError('flop entry needs both starting ranges')
    if split_for(board) != 'test':
        raise ValueError('benchmark requires a held-out test flop group; choose another file')
    if len(board) not in (3, 4):
        raise ValueError('benchmark needs a flop or turn root')
    leaf = vn.load(args.model)
    kw = dict(board=board, pot=pot, stack=stack, oop_range=ranges[0], ip_range=ranges[1],
              sizing=rich_sizing(), compress=False, max_memory_mb=args.memory_mb)
    t = time.monotonic()
    full = PostflopSolver(**kw)
    iterations, gap = converge(full, args.target, args.max_iterations)
    if gap > args.target:
        raise ValueError(f'reference did not converge ({gap:.4f}%); no comparison accepted')
    reference_seconds = time.monotonic() - t
    ref = full.engine.query([], False, True)
    t = time.monotonic()
    fast = PostflopSolver(**kw, leaf=leaf)
    fast.engine.iterate(args.leaf_iterations)
    got = fast.engine.query([], False, True)
    fast_seconds = time.monotonic() - t
    if ref['actions'] != got['actions'] or ref['combos0'] != got['combos0']:
        raise ValueError('root menus/combo order do not match')
    reach = np.asarray(ref['weight0'], dtype=float)
    reach /= reach.sum()
    a, b = np.asarray(ref['strategy']), np.asarray(got['strategy'])
    ev = np.asarray(ref['action_ev']) / pot
    # Local deviation cost with the full reference continuation held fixed.
    loss = np.maximum(0, ev.max(0) - (b * ev).sum(0))
    report = dict(board=board, split='test', reference_gap_pct=gap, reference_iterations=iterations,
                  reference_seconds=reference_seconds, neural_seconds=fast_seconds,
                  weighted_root_total_variation=float((.5 * np.abs(a - b).sum(0) * reach).sum()),
                  local_root_loss_fraction_pot=float((loss * reach).sum()),
                  reference_mix=(a * reach).sum(1).tolist(), neural_mix=(b * reach).sum(1).tolist(),
                  note='Root comparison only, using reference continuations; not full-game exploitability. Neural internal gap is not a certificate.')
    atomic_json(args.out, report)
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()

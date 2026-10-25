#!/usr/bin/env python3
"""Exact small-range river checkdown oracle versus the existing multiway approximation.

Diagnostic only. Legal joint deals are enumerated, not independent opponents.
Failure means do not start large multiway training. Passing this narrow test is
necessary but insufficient: betting, deviations, folded cards and side pots need their own audits.
"""
from __future__ import annotations
import argparse
import hashlib
import itertools
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import numpy as np
from flipup_gto import _engine as E
from flipup_gto.value_data import atomic_json


def exact_checkdown(board, ranges, pot):
    options = [np.flatnonzero(r > 0) for r in ranges]
    total = 0.
    pay = np.zeros(len(ranges))
    for deal in itertools.product(*options):
        used, valid = set(board), True
        weight = 1.
        scores = []
        for p, combo in enumerate(deal):
            cards = E.combo_cards(int(combo))
            if used.intersection(cards):
                valid = False
                break
            used.update(cards)
            weight *= ranges[p][combo]
            scores.append(E.evaluate(list(board) + list(cards)))
        if not valid:
            continue
        winners = np.flatnonzero(np.asarray(scores) == max(scores))
        pay[winners] += weight * pot / len(winners)
        total += weight
    if total <= 0:
        raise ValueError('no legal joint deals')
    return pay / total


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--cases', type=int, default=20)
    ap.add_argument('--hands-per-player', type=int, default=6)
    ap.add_argument('--seed', type=int, default=17)
    ap.add_argument('--tolerance', type=float, default=.001, help='fraction of pot, per player')
    ap.add_argument('--out', type=Path, required=True)
    args = ap.parse_args()
    if not 1 <= args.hands_per_player <= 20 or args.cases < 1:
        ap.error('use 1..20 hands per player and positive case count')
    rng = np.random.default_rng(args.seed)
    results = []
    for i in range(args.cases):
        cards = rng.choice(52, 17, replace=False).tolist()
        board, pool = cards[:5], cards[5:]
        combos = [E.combo_index(a, b) for a, b in itertools.combinations(pool, 2)]
        ranges = np.zeros((3, 1326), dtype=np.float32)
        for p in range(3):
            choices = rng.choice(combos, args.hands_per_player, replace=False)
            ranges[p, choices] = rng.uniform(.1, 1., len(choices))
        exact = exact_checkdown(board, ranges, 10.)
        cfg = E.MWConfig()
        cfg.players, cfg.board, cfg.pot, cfg.stack, cfg.range = 3, board, 10., 20., ranges.tolist()
        for street in range(3):
            cfg.set_sizes(street, [], [])
        solver = E.MultiwaySolver(cfg)
        solver.iterate(1)  # check only; there is no strategic learning problem
        approximate = np.asarray(solver.root_ev())
        error = float(np.max(np.abs(exact - approximate)) / 10)
        results.append(dict(case=i, board=board, exact=exact.tolist(), approximate=approximate.tolist(),
                            ranges=[[[int(c), float(r[c])] for c in np.flatnonzero(r)] for r in ranges],
                            worst_player_error_fraction_pot=error,
                            approximate_conservation_error_fraction_pot=float(abs(approximate.sum() - 10) / 10)))
    worst = max(r['worst_player_error_fraction_pot'] for r in results)
    passed = worst <= args.tolerance
    atomic_json(args.out, dict(seed=args.seed, passed=passed, tolerance=args.tolerance,
                              hands_per_player=args.hands_per_player, pot=10.,
                              teacher_sha256=hashlib.sha256((Path(__file__).resolve().parents[1] / 'engine/src/multiway.cpp').read_bytes()).hexdigest(),
                              worst_error_fraction_pot=worst, cases=results,
                              scope='Three-player equal-stack river checkdown only. No production certification.'))
    print(f'Exact checkdown audit: {"PASS" if passed else "FAIL"}; worst player error {100 * worst:.3f}% of pot. Report: {args.out}')
    return 0 if passed else 2


if __name__ == '__main__':
    raise SystemExit(main())

"""Training data for the turn value network: random turn spots solved exactly (turn and river).

Like value_net_river.py, on 4-card boards. Hands are bucketed by expected river strength and its
spread (flipup_gto.valuenet.turn_buckets); each sample's labels are the bucket mean EV / pot for both
players, from a full solve of the turn and river (33/75/125% bets, 60% raises, two raises, all-in).

    python3 scripts/value_net_turn.py --n 500 --seed 1 --out data/valuenet/turn_1.npz
"""
from __future__ import annotations

import argparse
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from flipup_gto import valuenet as vn  # noqa: E402
from flipup_gto.solver import BetSizing, PostflopSolver, StreetSizing  # noqa: E402

RICH = StreetSizing("33%, 75%, 125%", "60%")
SIZING = BetSizing(oop={"flop": StreetSizing(), "turn": RICH, "river": RICH},
                   ip={"flop": StreetSizing(), "turn": RICH, "river": RICH}, max_raises=2)
K = vn.TURN_M * vn.TURN_S


def sample(rng):
    board = [int(c) for c in rng.choice(52, 4, replace=False)]
    m, s = vn.turn_stats(board)
    ranks = vn.percentile(m)
    r0, r1 = vn.random_range(ranks, rng), vn.random_range(ranks, rng)
    pot = float(np.exp(rng.uniform(np.log(4), np.log(120))))
    spr = float(np.exp(rng.uniform(np.log(0.1), np.log(12))))
    spr = min(spr, 250.0 / pot)
    return board, vn.turn_buckets(m, s, vn.TURN_S_EDGES), r0, r1, pot, spr


def masses(rng_w, buckets):
    ok = buckets >= 0
    mm = np.bincount(buckets[ok], weights=rng_w[ok], minlength=K)
    return mm / mm.sum()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=100)
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--out", required=True)
    ap.add_argument("--iterations", type=int, default=300)
    ap.add_argument("--target", type=float, default=0.3)
    args = ap.parse_args()
    rng = np.random.default_rng(args.seed)
    X, Y, E, B, M = [], [], [], [], []
    t0 = time.time()
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    for i in range(args.n):
        board, buckets, r0, r1, pot, spr = sample(rng)
        s = PostflopSolver(board, pot, spr * pot, r0, r1, sizing=SIZING, compress=True)
        st = s.solve(args.iterations, args.target, 50)
        info = s.engine.query([], False, True)
        y = np.zeros((2, K), dtype=np.float32)
        ev_all = np.full((2, 1326), np.nan, dtype=np.float16)
        for p in (0, 1):
            combos = np.asarray(info[f"combos{p}"]); ev = np.asarray(info[f"ev{p}"]) / pot
            ev_all[p, combos] = ev
            b = buckets[combos]
            sums = np.bincount(b, weights=ev, minlength=K); cnt = np.bincount(b, minlength=K)
            # Empty buckets (no hand of that strength and spread): marked NaN, ignored in training.
            y[p] = np.where(cnt > 0, sums / np.maximum(cnt, 1), np.nan)
        x = np.concatenate([masses(r0, buckets), masses(r1, buckets), [np.log1p(spr)]]).astype(np.float32)
        X.append(x); Y.append(y); E.append(ev_all); B.append(board); M.append([pot, spr, st.exploitability_pct, time.time() - t0])
        if (i + 1) % 10 == 0 or i + 1 == args.n:
            print(f"{i + 1}/{args.n} {time.time() - t0:.0f}s (last {st.exploitability_pct:.2f}% in {st.iteration} its)", flush=True)
            np.savez_compressed(args.out, x=np.asarray(X), y=np.asarray(Y), combo_ev=np.asarray(E),
                                board=np.asarray(B, dtype=np.int8), meta=np.asarray(M, dtype=np.float32))


if __name__ == "__main__":
    main()

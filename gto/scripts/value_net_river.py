"""Training data for the river value network: random river spots solved exactly.

Each sample: a random 5-card board, random ranges (flipup_gto.valuenet.random_range), a random pot and
stack-to-pot ratio, solved on the rich river tree (33/75/125% bets, 60% raises, two raises, all-in).
Saved per shard: features [N, 2K+1] and labels [N, 2, K] (bucket mean EV / pot for OOP and IP),
plus per-combo labels for checking card-removal error.

    python3 scripts/value_net_river.py --n 2000 --seed 1 --out data/valuenet/river_1.npz
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

RIVER = StreetSizing("33%, 75%, 125%", "60%")
SIZING = BetSizing(oop={"flop": StreetSizing(), "turn": StreetSizing(), "river": RIVER},
                   ip={"flop": StreetSizing(), "turn": StreetSizing(), "river": RIVER}, max_raises=2)


def sample(rng: np.random.Generator):
    board = [int(c) for c in rng.choice(52, 5, replace=False)]
    ranks = vn.strength_ranks(board)
    r0, r1 = vn.random_range(ranks, rng), vn.random_range(ranks, rng)
    pot = float(np.exp(rng.uniform(np.log(4), np.log(150))))
    spr = float(np.exp(rng.uniform(np.log(0.1), np.log(15))))
    stack = min(spr * pot, 250.0)
    return board, ranks, r0, r1, pot, stack / pot


def solve(board, ranks, r0, r1, pot, spr, iterations, target):
    s = PostflopSolver(board, pot, spr * pot, r0, r1, sizing=SIZING)
    st = s.solve(iterations, target, 50)
    info = s.engine.query([], False, True)
    buckets = vn.bucket_of(ranks)
    y = np.zeros((2, vn.K), dtype=np.float32)
    combo_ev = np.full((2, 1326), np.nan, dtype=np.float32)
    for p in (0, 1):
        combos = np.asarray(info[f"combos{p}"]); ev = np.asarray(info[f"ev{p}"]) / pot
        combo_ev[p, combos] = ev
        b = buckets[combos]
        sums = np.bincount(b, weights=ev, minlength=vn.K); cnt = np.bincount(b, minlength=vn.K)
        y[p] = np.where(cnt > 0, sums / np.maximum(cnt, 1), np.nan)
        # Empty buckets (rare: big ties) take their neighbours' values.
        bad = np.isnan(y[p])
        if bad.any():
            idx = np.arange(vn.K)
            y[p, bad] = np.interp(idx[bad], idx[~bad], y[p, ~bad])
    return vn.features(r0, r1, buckets, spr), y, combo_ev, st


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=100)
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--out", required=True, help="path prefix: chunks are written as <out>_000.npz, <out>_001.npz, ...")
    ap.add_argument("--chunk", type=int, default=1000, help="samples per chunk file")
    ap.add_argument("--iterations", type=int, default=400)
    ap.add_argument("--target", type=float, default=0.2)
    args = ap.parse_args()
    rng = np.random.default_rng(args.seed)
    X, Y, E, B, M = [], [], [], [], []
    t0 = time.time()
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    for i in range(args.n):
        board, ranks, r0, r1, pot, spr = sample(rng)
        x, y, ev, st = solve(board, ranks, r0, r1, pot, spr, args.iterations, args.target)
        X.append(x); Y.append(y); E.append(ev.astype(np.float16)); B.append(board); M.append([pot, spr, st.exploitability_pct])
        if (i + 1) % 25 == 0 or i + 1 == args.n:
            print(f"{i + 1}/{args.n} {time.time() - t0:.0f}s (last {st.exploitability_pct:.2f}% in {st.iteration} its)", flush=True)
        if len(X) == args.chunk or i + 1 == args.n:
            out = f"{args.out}_{i // args.chunk:03d}.npz"
            np.savez_compressed(out + ".tmp.npz", x=np.asarray(X), y=np.asarray(Y), combo_ev=np.asarray(E),
                                board=np.asarray(B, dtype=np.int8), meta=np.asarray(M, dtype=np.float32))
            os.replace(out + ".tmp.npz", out)  # a stopped run never leaves a half-written chunk
            X, Y, E, B, M = [], [], [], [], []


if __name__ == "__main__":
    main()

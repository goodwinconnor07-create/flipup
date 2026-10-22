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
    spr = float(np.exp(rng.uniform(np.log(0.1), np.log(25))))
    spr = min(spr, 250.0 / pot)
    return board, vn.turn_buckets(m, s, vn.TURN_S_EDGES), r0, r1, pot, spr


class LibraryRanges:
    """Turn spots with the ranges real play brings there: a pre-solved flop (scripts/flop_library.py), a
    flop line sampled from both players' strategies (checks, bets, raises, calls), both ranges after it,
    and a random turn card. Random strength-sorted ranges never look like the polarized ranges after a
    raise, so a network trained only on them undervalues raising."""

    def __init__(self, root: str):
        from flipup_gto.flop_library import SPOTS, Entry
        from flipup_gto.review import PreflopCache, class_reach_to_combos
        self.root, self.Entry = root, Entry
        self.spots = [n for n in SPOTS if os.path.isdir(os.path.join(root, n))]
        self.files = {n: sorted(os.listdir(os.path.join(root, n))) for n in self.spots}
        spot = PreflopCache(os.environ.get("PREFLOP_CACHE", os.path.join(root, "preflop"))).get(6, 100)
        self.init = {}
        for n in self.spots:
            path, ip, oop, _ = SPOTS[n]
            info = spot.engine.query(spot.resolve(path))
            self.init[n] = ({0: class_reach_to_combos(info["reach"][oop]), 1: class_reach_to_combos(info["reach"][ip])},
                            float(info["pot"]), 100.0 - max(info["invested"]))

    def sample(self, rng):
        from flipup_gto.cards import parse_cards
        for _ in range(50):
            name = self.spots[rng.integers(len(self.spots))]
            fname = self.files[name][rng.integers(len(self.files[name]))]
            flop = parse_cards(fname[:-4])
            entry = self.Entry(np.load(os.path.join(self.root, name, fname)), (0, 1, 2, 3))
            init, pot, stack = self.init[name]
            tokens, wager = [], [0.0, 0.0]
            closed = False
            while not closed:
                node = entry.node(tokens)
                if node is None:
                    break
                w = node["reach"].astype(np.float64)
                freq = (node["strategy"] * w).sum(1) / max(w.sum(), 1e-12)
                # Flattened (square root) so bets and raises, rare at GTO's own frequencies, show up often.
                q = np.sqrt(np.maximum(freq, 0))
                a = int(rng.choice(len(q), p=q / q.sum()))
                act = node["actions"][a]
                p = node["player"]
                if act["type"] == "fold":
                    break
                if act["type"] in ("bet", "raise"):
                    wager[p] = act["amount"]
                elif act["type"] == "call":
                    wager[p] = max(wager)
                    closed = True
                elif act["type"] == "check" and len(tokens) == 1:
                    closed = True  # check-check
                tokens.append(a)
            if not closed or max(wager) >= stack - 1e-6:
                continue
            ranges = entry.ranges_after(tokens, init)
            if ranges is None:
                continue
            turn = int(rng.choice([c for c in range(52) if c not in flop]))
            board = flop + [turn]
            m, s = vn.turn_stats(board)
            new_pot = pot + 2 * max(wager)
            return (board, vn.turn_buckets(m, s, vn.TURN_S_EDGES), np.asarray(ranges[0], dtype=np.float32),
                    np.asarray(ranges[1], dtype=np.float32), new_pot, (stack - max(wager)) / new_pot)
        return sample(rng)


def masses(rng_w, buckets):
    ok = buckets >= 0
    mm = np.bincount(buckets[ok], weights=rng_w[ok], minlength=K)
    return mm / mm.sum()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=100)
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--out", required=True, help="path prefix: chunks are written as <out>_000.npz, <out>_001.npz, ...")
    ap.add_argument("--chunk", type=int, default=100, help="samples per chunk file")
    ap.add_argument("--iterations", type=int, default=300)
    ap.add_argument("--target", type=float, default=0.3)
    ap.add_argument("--library", default="", help="flop library dir: half the spots get ranges from real flop lines")
    args = ap.parse_args()
    rng = np.random.default_rng(args.seed)
    lib = LibraryRanges(args.library) if args.library else None
    X, Y, E, B, M = [], [], [], [], []
    t0 = time.time()
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    for i in range(args.n):
        board, buckets, r0, r1, pot, spr = lib.sample(rng) if lib and rng.random() < 0.5 else sample(rng)
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
        if len(X) == args.chunk or i + 1 == args.n:
            out = f"{args.out}_{i // args.chunk:03d}.npz"
            np.savez_compressed(out + ".tmp.npz", x=np.asarray(X), y=np.asarray(Y), combo_ev=np.asarray(E),
                                board=np.asarray(B, dtype=np.int8), meta=np.asarray(M, dtype=np.float32))
            os.replace(out + ".tmp.npz", out)  # a stopped run never leaves a half-written chunk
            X, Y, E, B, M = [], [], [], [], []


if __name__ == "__main__":
    main()

"""Collect per-class realization data from postflop solves, for fitting the preflop realization model.

For each spot (opener vs caller, heads-up single-raised pot) and each flop in a fixed random sample,
solve the flop with both players' ranges from the cached preflop solution and save every class's EV
share, equity and weight for both players. Results go to one .npz per spot and are resumable: run it
again and it carries on from the last saved flop.

    python3 scripts/realization_dataset.py --spots utg_bb,co_bb,btn_bb,sb_bb --flops 40
"""
from __future__ import annotations

import argparse
import os
import random
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from calibrate_eqr import class_to_combos  # noqa: E402
from flipup_gto.cards import card_str, hand_class  # noqa: E402
from flipup_gto.preflop import CLASS_INDEX  # noqa: E402
from flipup_gto.solver import BetSizing, PostflopSolver, StreetSizing  # noqa: E402

F = "fold"
# (preflop path, IP seat, OOP seat), 6-max seats 0 UTG .. 5 BB.
SPOTS = {
    "utg_bb": (["raise", F, F, F, F, "call"], 0, 5),
    "hj_bb": ([F, "raise", F, F, F, "call"], 1, 5),
    "co_bb": ([F, F, "raise", F, F, "call"], 2, 5),
    "btn_bb": ([F, F, F, "raise", F, "call"], 3, 5),
    "sb_bb": ([F, F, F, F, "raise", "call"], 5, 4),   # BB is IP against the SB's raise
    "btn_utg": (["raise", F, F, "call", F, F], 3, 0),  # BTN flats UTG
}
# Lean tree: realization at the flop root barely depends on the exact sizes (scripts/tree_bias.py).
STREET = {"flop": StreetSizing("50%", "60%"), "turn": StreetSizing("75%", ""), "river": StreetSizing("75%", "")}
OUT = os.path.join(os.path.dirname(__file__), "..", "research", "realization")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--spots", default="utg_bb,co_bb,btn_bb,sb_bb")
    ap.add_argument("--flops", type=int, default=40)
    ap.add_argument("--iterations", type=int, default=100)
    ap.add_argument("--seed", type=int, default=11)
    args = ap.parse_args()
    from flipup_gto.review import PreflopCache
    spot = PreflopCache(os.path.join(os.path.dirname(__file__), "..", "flipup_gto", "data", "cache")).get(6, 100)
    rng = random.Random(args.seed)
    flops = [tuple(rng.sample(range(52), 3)) for _ in range(args.flops)]
    os.makedirs(OUT, exist_ok=True)
    # Round-robin over spots so every spot gets data early.
    data = {}
    for name in args.spots.split(","):
        path = os.path.join(OUT, f"{name}.npz")
        if os.path.exists(path):
            d = np.load(path)
            data[name] = {k: list(d[k]) for k in ("ev", "eq", "w", "flop")}
        else:
            data[name] = {"ev": [], "eq": [], "w": [], "flop": []}
    for k, f in enumerate(flops):
        for name in args.spots.split(","):
            if k < len(data[name]["flop"]):
                continue
            pre, ip_idx, oop_idx = SPOTS[name]
            info = spot.engine.query(spot.resolve(pre))
            pot, stack = info["pot"], 100.0 - max(info["invested"])
            r_oop = np.asarray(info["reach"][oop_idx], float)
            r_ip = np.asarray(info["reach"][ip_idx], float)
            t0 = time.time()
            s = PostflopSolver(list(f), pot, stack, class_to_combos(r_oop), class_to_combos(r_ip),
                               sizing=BetSizing(oop=dict(STREET), ip=dict(STREET), max_raises=1), compress=True)
            s.solve(args.iterations, 0.5, 25)
            root = s.node([])
            ev, eq, w = np.zeros((2, 169)), np.zeros((2, 169)), np.zeros((2, 169))
            for p in (0, 1):
                for i, c in enumerate(root.info[f"combos{p}"]):
                    ci = CLASS_INDEX[hand_class(c)]
                    wt = root.info[f"weight{p}"][i]
                    ev[p, ci] += wt * root.info[f"ev{p}"][i] / pot
                    eq[p, ci] += wt * root.info[f"equity{p}"][i]
                    w[p, ci] += wt
            d = data[name]
            d["ev"].append(ev); d["eq"].append(eq); d["w"].append(w); d["flop"].append(np.array(f))
            np.savez_compressed(os.path.join(OUT, f"{name}.npz"), ev=np.array(d["ev"]), eq=np.array(d["eq"]),
                                w=np.array(d["w"]), flop=np.array(d["flop"]),
                                r_oop=r_oop, r_ip=r_ip, pot=pot, stack=stack)
            print(f"{name} flop {k + 1}/{len(flops)} {' '.join(card_str(c) for c in f)}: OOP share "
                  f"{root.range_ev(0) / pot:.3f} ({time.time() - t0:.0f}s)", flush=True)


if __name__ == "__main__":
    main()

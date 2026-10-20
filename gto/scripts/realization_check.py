"""Does the preflop model's flop value match what postflop solves give?

For a heads-up single-raised pot, compare the out-of-position caller's share of the pot that the
preflop solver assumes (equity + additive class adjustments) with the share measured by solving a
random sample of flops with both players' actual ranges. A gap that depends on the opener (UTG vs
BTN) means the realization model is off for that spot.

    python3 scripts/realization_check.py --spots utg_bb,btn_bb --flops 12
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
from postflop_bench import SPOTS  # noqa: E402
from flipup_gto.cards import card_str, hand_class  # noqa: E402
from flipup_gto.preflop import CLASS_INDEX, CLASSES, load_calibration, tables  # noqa: E402
from flipup_gto.solver import BetSizing, PostflopSolver, StreetSizing  # noqa: E402

LEAN = {"flop": StreetSizing("50%", "60%"), "turn": StreetSizing("75%", "a"), "river": StreetSizing("75%", "a")}


def model_share(r_oop, r_ip):
    """OOP's expected share under the additive model, over both ranges (card removal via pair counts)."""
    eq, pairs, _ = tables(with_tensor=False)
    cal = load_calibration()
    a_ip = np.array([cal["ip"][c] for c in CLASSES])
    a_oop = np.array([cal["oop"][c] for c in CLASSES])
    w = r_oop[:, None] * r_ip[None, :] * pairs
    share_oop = 1.0 - (eq.T + a_ip[None, :] - a_oop[:, None])  # [h_oop, o_ip]
    eq_oop = eq  # equity of h vs o
    return float((w * share_oop).sum() / w.sum()), float((w * eq_oop).sum() / w.sum())


def model_class_share(r_ip):
    """OOP's modelled share for each of its classes against IP's range."""
    eq, pairs, _ = tables(with_tensor=False)
    cal = load_calibration()
    a_ip = np.array([cal["ip"][c] for c in CLASSES])
    a_oop = np.array([cal["oop"][c] for c in CLASSES])
    w = pairs * r_ip[None, :]
    share = 1.0 - (eq.T + a_ip[None, :] - a_oop[:, None])
    return (w * share).sum(1) / np.maximum(w.sum(1), 1e-12), (w * eq).sum(1) / np.maximum(w.sum(1), 1e-12)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--spots", default="utg_bb,btn_bb")
    ap.add_argument("--flops", type=int, default=12)
    ap.add_argument("--iterations", type=int, default=150)
    ap.add_argument("--seed", type=int, default=7)
    args = ap.parse_args()
    from flipup_gto.review import PreflopCache
    spot = PreflopCache(os.path.join(os.path.dirname(__file__), "..", "flipup_gto", "data", "cache")).get(6, 100)
    rng = random.Random(args.seed)
    flops = [tuple(rng.sample(range(52), 3)) for _ in range(args.flops)]
    for name in args.spots.split(","):
        path, ip_idx, oop_idx = SPOTS[name]
        info = spot.engine.query(spot.resolve(path))
        pot, stack = info["pot"], 100.0 - max(info["invested"])
        r_oop, r_ip = np.asarray(info["reach"][oop_idx], float), np.asarray(info["reach"][ip_idx], float)
        pred, pred_eq = model_share(r_oop, r_ip)
        print(f"{name}: model OOP share {pred:.3f} (equity {pred_eq:.3f})", flush=True)
        shares, eqs = [], []
        cls_ev, cls_eq, cls_w = np.zeros(169), np.zeros(169), np.zeros(169)
        t0 = time.time()
        for f in flops:
            s = PostflopSolver(list(f), pot, stack, class_to_combos(r_oop), class_to_combos(r_ip),
                               sizing=BetSizing(oop=dict(LEAN), ip=dict(LEAN), max_raises=1), compress=True)
            s.solve(args.iterations, 0.5, 25)
            root = s.node([])
            combos, wts = root.info["combos0"], root.info["weight0"]
            for i, c in enumerate(combos):
                ci = CLASS_INDEX[hand_class(c)]
                cls_ev[ci] += wts[i] * root.info["ev0"][i] / pot
                cls_eq[ci] += wts[i] * root.info["equity0"][i]
                cls_w[ci] += wts[i]
            shares.append(root.range_ev(0) / pot)
            eqs.append(root.range_equity(0))
            print(f"  {' '.join(card_str(c) for c in f)}: share {shares[-1]:.3f} equity {eqs[-1]:.3f} "
                  f"({time.time() - t0:.0f}s)", flush=True)
        m, se = np.mean(shares), np.std(shares) / np.sqrt(len(shares))
        print(f"{name}: measured OOP share {m:.3f} +- {se:.3f} (equity {np.mean(eqs):.3f}); model {pred:.3f}; "
              f"gap {pred - m:+.3f} of the pot", flush=True)
        # Per class: measured minus modelled share, over the OOP range by how often each class defends.
        ms, me = model_class_share(r_ip)
        meas = np.where(cls_w > 0, cls_ev / np.maximum(cls_w, 1e-12), np.nan)
        rows = [(CLASSES[c], r_oop[c], meas[c], ms[c], cls_eq[c] / cls_w[c]) for c in range(169) if cls_w[c] > 0 and r_oop[c] > 0.05]
        rows.sort(key=lambda r: r[2] - r[3])
        print("  class  reach  measured  model  (equity)   -- most over-credited by the model first")
        for r in rows[:15] + [None] + rows[-15:]:
            print("  ..." if r is None else f"  {r[0]:5s} {r[1]:.2f}  {r[2]:.3f}  {r[3]:.3f}  ({r[4]:.3f})  {r[2] - r[3]:+.3f}")
        # Group by kind of hand.
        def grp(c):
            return "pair" if len(c) == 2 else ("suited" if c[2] == "s" else "offsuit")
        for g in ("pair", "suited", "offsuit"):
            idx = [i for i, r in enumerate(CLASSES) if grp(r) == g and cls_w[i] > 0]
            ww = cls_w[idx]
            print(f"  {g}: measured {np.sum(ww * meas[idx]) / ww.sum():.3f} model {np.sum(ww * ms[idx]) / ww.sum():.3f}", flush=True)


if __name__ == "__main__":
    main()

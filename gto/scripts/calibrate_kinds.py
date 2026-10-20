"""Calibrate equity realization separately for each kind of heads-up pot.

calibrate_eqr.py fits one realization model from BTN-vs-BB single-raised pots and the preflop solver
used it everywhere. Limped pots, single-raised pots where the raiser is out of position (SB vs BB),
3-bet pots and 4-bet pots play very differently (stack-to-pot ratio, who has the initiative), and
using one model for all of them made the SB limp far too often and turned small 4-bets into shoves.

For each pot kind this script takes both players' ranges at a representative 6-max line from the
current preflop solution, solves a fixed set of flops with the postflop solver, records each class's
EV share and equity, and fits additive adjustments (IP share = equity + adj_ip[h] - adj_oop[o]) with
the same smooth hand-feature model as calibrate_eqr.py. The preflop solver then uses the table that
matches each heads-up flop (PreflopConfig.kind_eqr_*).

    python3 scripts/calibrate_kinds.py --out flipup_gto/data/eqr_kinds.json

Iterate: re-solve preflop (the cache key changes with the file), then run this again.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from calibrate_eqr import class_to_combos, fit_additive  # noqa: E402
from flipup_gto.cards import card_str, hand_class, parse_cards  # noqa: E402
from flipup_gto.preflop import CLASS_COMBOS, CLASS_INDEX, CLASSES, PreflopSpot, tables  # noqa: E402
from flipup_gto.solver import BetSizing, PostflopSolver, StreetSizing  # noqa: E402

# 6-max seats: 0 UTG, 1 HJ, 2 CO, 3 BTN, 4 SB, 5 BB.
F = "fold"
KINDS = {
    0: ("limped pot, SB limps, BB checks", [F, F, F, F, "call", "check"], 5, 4),
    1: ("single-raised, raiser IP (BTN vs BB)", [F, F, F, "raise", F, "call"], 3, 5),
    2: ("single-raised, raiser OOP (SB vs BB)", [F, F, F, F, "raise", "call"], 5, 4),
    3: ("3-bet pot, 3-bettor IP (CO vs BTN)", [F, F, "raise", "raise", F, F, "call"], 3, 2),
    4: ("3-bet pot, 3-bettor OOP (BTN vs BB)", [F, F, F, "raise", F, "raise", "call"], 3, 5),
    5: ("4-bet pot, 4-bettor IP (BB vs BTN)", [F, F, F, "raise", F, "raise", "raise", "call"], 3, 5),
    6: ("4-bet pot, 4-bettor OOP (BTN vs CO)", [F, F, "raise", "raise", F, F, "raise", "call"], 3, 2),
}
# Varied textures; the first --flops are used (A-high dry, K-high dry, two-tone, connected, low).
FLOPS = ["As 7h 2d", "Ks 8d 3c", "Qh 9h 4c", "Jd 8c 7s", "8c 5d 3h", "Th 6s 2h", "7s 7d 2c", "Kh Qd 5s"]


def top_range(frac):
    """Class weights for roughly the top `frac` of hands by equity against a random hand."""
    eq, pairs, _ = tables(with_tensor=False)
    er = (eq * (pairs / pairs.sum(axis=1, keepdims=True))).sum(axis=1)
    order = np.argsort(-er)
    r = np.zeros(169)
    acc, target = 0.0, frac * 1326
    for c in order:
        if acc >= target:
            break
        take = min(1.0, (target - acc) / CLASS_COMBOS[c])
        r[c] = take
        acc += take * CLASS_COMBOS[c]
    return r


def ranges_for(spot, path, ip_idx, oop_idx, log):
    info = spot.engine.query(spot.resolve(path))
    reach = [np.asarray(info["reach"][i], dtype=float) for i in range(spot.num_players)]
    for idx, fallback in ((ip_idx, 0.06), (oop_idx, 0.05)):
        combos = float((reach[idx] * CLASS_COMBOS).sum())
        if combos < 15:
            # A line GTO (almost) never takes: its ranges are noise. Use a tight value range instead.
            log(f"    seat {idx} reaches with only {combos:.1f} combos; using the top {100 * fallback:.0f}% instead")
            reach[idx] = top_range(fallback)
    return info, reach


def measure(info, reach, ip_idx, oop_idx, flops, iterations, target, log):
    pot = info["pot"]
    stack = 100.0 - max(info["invested"])
    oop_r, ip_r = class_to_combos(reach[oop_idx]), class_to_combos(reach[ip_idx])
    # Lean tree: what each class realizes at the flop root is robust to simplified bet sizes.
    street = {"flop": StreetSizing("50%", "60%"), "turn": StreetSizing("75%", ""),
              "river": StreetSizing("75%", "")}
    sizing = BetSizing(oop=dict(street), ip=dict(street), max_raises=1)
    acc = {p: {"ev": np.zeros(169), "eq": np.zeros(169), "w": np.zeros(169)} for p in (0, 1)}
    t0 = time.time()
    for k, flop in enumerate(flops):
        s = PostflopSolver(flop, pot, stack, oop_r, ip_r, sizing=sizing, compress=True)
        st = s.solve(iterations, target, 25)
        root = s.node([])
        for p in (0, 1):
            combos, w = root.info[f"combos{p}"], root.info[f"weight{p}"]
            ev, eq = root.info[f"ev{p}"], root.info[f"equity{p}"]
            for i, c in enumerate(combos):
                ci = CLASS_INDEX[hand_class(c)]
                acc[p]["ev"][ci] += w[i] * ev[i] / pot
                acc[p]["eq"][ci] += w[i] * eq[i]
                acc[p]["w"][ci] += w[i]
        log(f"    flop {k + 1}/{len(flops)} {' '.join(card_str(c) for c in flop)}: expl {st.exploitability_pct:.2f}% "
            f"({time.time() - t0:.0f}s), OOP EV share {root.range_ev(0) / pot:.3f}, equity {root.range_equity(0):.3f}")
    out = {}
    for p in (0, 1):
        w = acc[p]["w"]
        with np.errstate(invalid="ignore", divide="ignore"):
            out[p] = {"share": np.where(w > 0, acc[p]["ev"] / w, np.nan),
                      "equity": np.where(w > 0, acc[p]["eq"] / w, np.nan), "weight": w}
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--kinds", default="0,1,2,3,4,5,6")
    ap.add_argument("--flops", type=int, default=5)
    ap.add_argument("--iterations", type=int, default=120)
    ap.add_argument("--target", type=float, default=1.5)
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "flipup_gto", "data",
                                                   "eqr_kinds.json"))
    args = ap.parse_args()
    log = lambda m: print(m, flush=True)  # noqa: E731

    from flipup_gto.review import PreflopCache
    cache = PreflopCache(os.path.join(os.path.dirname(__file__), "..", "flipup_gto", "data", "cache"))
    log("loading/solving the 6-max preflop game...")
    spot = cache.get(6, 100)
    flops = [parse_cards(f) for f in FLOPS[: args.flops]]
    result = json.load(open(args.out)) if os.path.exists(args.out) else {"kinds": {}}
    for k in [int(x) for x in args.kinds.split(",")]:
        name, path, ip_idx, oop_idx = KINDS[k]
        log(f"kind {k}: {name}")
        info, reach = ranges_for(spot, path, ip_idx, oop_idx, log)
        measured = measure(info, reach, ip_idx, oop_idx, flops, args.iterations, args.target, log)
        adj_ip, adj_oop, err_ip, err_oop = fit_additive(measured, {"reach": reach}, ip_idx, oop_idx)
        eqr = {}
        for p, label in ((1, "ip"), (0, "oop")):
            w = np.nan_to_num(measured[p]["weight"])
            eqr[label] = float(np.nansum(w * measured[p]["share"]) / max(np.nansum(w * measured[p]["equity"]), 1e-9))
        log(f"  fit error IP {err_ip:.4f} OOP {err_oop:.4f}; range EQR IP {eqr['ip']:.3f} OOP {eqr['oop']:.3f}")
        result["kinds"][str(k)] = {
            "name": name, "ip": {c: round(float(adj_ip[i]), 4) for i, c in enumerate(CLASSES)},
            "oop": {c: round(float(adj_oop[i]), 4) for i, c in enumerate(CLASSES)},
            "fit_error": [round(err_ip, 4), round(err_oop, 4)], "range_eqr": eqr}
        result["version"] = f"kinds-{int(time.time())}"
        json.dump(result, open(args.out, "w"), indent=1)
        log(f"  saved {args.out}")


if __name__ == "__main__":
    main()

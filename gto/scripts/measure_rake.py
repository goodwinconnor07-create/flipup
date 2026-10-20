"""Measure how much rake a heads-up pot really pays once it's played out after the flop.

Rake is a share of the final pot, but the preflop solver only sees the pot on the flop. This solves
flops for each pot kind with rake on and off and records E[rake] / pot on the flop, for uncapped
rake (the pot's expected growth) and for a given capped structure.

    python3 scripts/measure_rake.py
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from calibrate_eqr import class_to_combos  # noqa: E402
from calibrate_kinds import FLOPS, KINDS, ranges_for  # noqa: E402
from flipup_gto.cards import parse_cards  # noqa: E402
from flipup_gto.solver import BetSizing, PostflopSolver, StreetSizing  # noqa: E402


def rake_paid(flop, pot, stack, oop_r, ip_r, rate, cap, iterations):
    # Lean tree plus all-ins: how big pots get barely depends on the exact sizes.
    street = {"flop": StreetSizing("50%", "60%"), "turn": StreetSizing("75%", "a"),
              "river": StreetSizing("75%", "a")}
    sizing = BetSizing(oop=dict(street), ip=dict(street), max_raises=1)
    s = PostflopSolver(flop, pot, stack, oop_r, ip_r, sizing=sizing, rake_rate=rate, rake_cap=cap, compress=True)
    s.solve(iterations, 0.5, 25)
    root = s.node([])
    return pot - root.range_ev(0) - root.range_ev(1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--flops", type=int, default=2)
    ap.add_argument("--iterations", type=int, default=100)
    ap.add_argument("--rate", type=float, default=0.05)
    ap.add_argument("--cap", type=float, default=4.0)
    ap.add_argument("--kinds", default="0,1,2,4,6")
    args = ap.parse_args()
    log = lambda m: print(m, flush=True)  # noqa: E731
    from flipup_gto.review import PreflopCache
    cache = PreflopCache(os.path.join(os.path.dirname(__file__), "..", "flipup_gto", "data", "cache"))
    spot = cache.get(6, 100)
    out = {}
    for k in [int(x) for x in args.kinds.split(",")]:
        name, path, ip_idx, oop_idx = KINDS[k]
        info, reach = ranges_for(spot, path, ip_idx, oop_idx, log)
        pot, stack = info["pot"], 100.0 - max(info["invested"])
        oop_r, ip_r = class_to_combos(reach[oop_idx]), class_to_combos(reach[ip_idx])
        free = unc = capped = 0.0
        t0 = time.time()
        for f in FLOPS[: args.flops]:
            flop = parse_cards(f)
            free += rake_paid(flop, pot, stack, oop_r, ip_r, 0.0, 0.0, args.iterations)
            unc += rake_paid(flop, pot, stack, oop_r, ip_r, args.rate, 0.0, args.iterations)
            capped += rake_paid(flop, pot, stack, oop_r, ip_r, args.rate, args.cap, args.iterations)
        n = args.flops
        free, unc, capped = free / n, (unc - free) / n, (capped - free) / n
        row = {"name": name, "pot": round(pot, 2), "spr": round(stack / pot, 2),
               "growth": round(unc / (args.rate * pot), 3),
               "capped_rake": round(capped, 3), "flop_pot_rake": round(min(args.cap, args.rate * pot), 3)}
        out[k] = row
        log(f"kind {k} {name}: pot {pot:.1f} spr {stack / pot:.1f} | uncapped growth x{row['growth']} | "
            f"capped rake {capped:.3f}bb vs {row['flop_pot_rake']}bb on the flop pot  (control {free:.4f}, {time.time() - t0:.0f}s)")
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()

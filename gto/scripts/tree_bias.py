"""Does the lean postflop tree used for realization calibration favour one player?

For one pot kind, solve the same flops with the lean calibration tree and with a rich GTO Wizard-like
tree, and compare each player's EV share of the pot (and equity) at the flop root.

    python3 scripts/tree_bias.py --kind 2 --flops 4
"""
from __future__ import annotations

import argparse
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from calibrate_eqr import class_to_combos  # noqa: E402
from calibrate_kinds import FLOPS, KINDS, ranges_for  # noqa: E402
from flipup_gto.cards import parse_cards  # noqa: E402
from flipup_gto.solver import BetSizing, PostflopSolver, StreetSizing  # noqa: E402

TREES = {
    "lean": (BetSizing(oop={"flop": StreetSizing("50%", "60%"), "turn": StreetSizing("75%", ""),
                            "river": StreetSizing("75%", "")},
                       ip={"flop": StreetSizing("50%", "60%"), "turn": StreetSizing("75%", ""),
                           "river": StreetSizing("75%", "")}, max_raises=1)),
    # About 4x the lean tree's memory (5.3GB at 100bb in a 6bb pot): GTO Wizard's flop sizes, two raises.
    "rich": (BetSizing(oop={"flop": StreetSizing("33%, 75%, 125%", "60%"), "turn": StreetSizing("66%", "a"),
                            "river": StreetSizing("75%", "a")},
                       ip={"flop": StreetSizing("33%, 75%, 125%", "60%"), "turn": StreetSizing("66%", "a"),
                           "river": StreetSizing("75%", "a")}, max_raises=2)),
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--kind", type=int, default=2)
    ap.add_argument("--flops", type=int, default=4)
    ap.add_argument("--iterations", type=int, default=200)
    ap.add_argument("--target", type=float, default=0.5)
    ap.add_argument("--trees", default="lean,rich")
    args = ap.parse_args()
    log = lambda m: print(m, flush=True)  # noqa: E731
    from flipup_gto.review import PreflopCache
    cache = PreflopCache(os.path.join(os.path.dirname(__file__), "..", "flipup_gto", "data", "cache"))
    spot = cache.get(6, 100)
    name, path, ip_idx, oop_idx = KINDS[args.kind]
    info, reach = ranges_for(spot, path, ip_idx, oop_idx, log)
    pot, stack = info["pot"], 100.0 - max(info["invested"])
    oop_r, ip_r = class_to_combos(reach[oop_idx]), class_to_combos(reach[ip_idx])
    log(f"kind {args.kind} {name}: pot {pot:.1f}, stack {stack:.1f}")
    for f in FLOPS[: args.flops]:
        for t in args.trees.split(","):
            t0 = time.time()
            s = PostflopSolver(parse_cards(f), pot, stack, oop_r, ip_r, sizing=TREES[t], compress=True)
            st = s.solve(args.iterations, args.target, 25)
            root = s.node([])
            log(f"  {f} {t}: OOP share {root.range_ev(0) / pot:.3f} (eq {root.range_equity(0):.3f}) "
                       f"expl {st.exploitability_pct:.2f}% {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()

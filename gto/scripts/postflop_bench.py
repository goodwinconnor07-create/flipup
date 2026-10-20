"""Flop strategies for benchmark spots, to compare with published solver numbers.

For each flop: the preflop raiser's c-bet frequency and size split when checked to, and the caller's
response to a small c-bet. Ranges come from the app's cached preflop solution (6-max, 100bb).

    python3 scripts/postflop_bench.py --spot btn_bb --tree explorer --flops "As7h2d,Ks8d3c"

Trees: "explorer" is what Custom hand / reviews solve on the flop (river checked down, one turn
size); "full" adds real turn and river betting with all-ins, to measure the explorer's error.
"""
from __future__ import annotations

import argparse
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from calibrate_eqr import class_to_combos  # noqa: E402
from flipup_gto.cards import parse_cards  # noqa: E402
from flipup_gto.solver import BetSizing, PostflopSolver, StreetSizing  # noqa: E402

F = "fold"
# (preflop path, IP seat, OOP seat): 6-max seats 0 UTG .. 5 BB.
SPOTS = {
    "btn_bb": ([F, F, F, "raise", F, "call"], 3, 5),
    "co_bb": ([F, F, "raise", F, F, "call"], 2, 5),
    "utg_bb": (["raise", F, F, F, F, "call"], 0, 5),
    "btn_bb_3bet": ([F, F, F, "raise", F, "raise", "call"], 3, 5),  # BB is the OOP 3-bettor
}
RICH = StreetSizing("33%, 75%, 125%", "60%")
TREES = {
    "explorer": BetSizing(oop={"flop": StreetSizing("", "60%"), "turn": StreetSizing("75%", ""), "river": StreetSizing("", "")},
                          ip={"flop": RICH, "turn": StreetSizing("75%", ""), "river": StreetSizing("", "")}, max_raises=1),
    # River betting kept with one size; one turn size; one raise per street.
    "mid": BetSizing(oop={"flop": StreetSizing("", "60%"), "turn": StreetSizing("75%", ""), "river": StreetSizing("75%", "")},
                     ip={"flop": RICH, "turn": StreetSizing("75%", ""), "river": StreetSizing("75%", "")}, max_raises=1),
    "full": BetSizing(oop={"flop": StreetSizing("", "60%"), "turn": StreetSizing("66%", "a"), "river": StreetSizing("75%", "a")},
                      ip={"flop": RICH, "turn": StreetSizing("66%", "a"), "river": StreetSizing("75%", "a")}, max_raises=2),
}
DEFAULT_FLOPS = "As7h2d,Ks8d3c,Qh9h4c,Jd8c7s,8c5d3h,Th6s2h,7s7d2c,KhQd5s,9s8s7s,AdKc4h"


def pct(d: dict) -> str:
    return " ".join(f"{k.split(' (')[0]} {100 * v:.0f}" for k, v in d.items())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--spot", default="btn_bb")
    ap.add_argument("--tree", default="explorer")
    ap.add_argument("--flops", default=DEFAULT_FLOPS)
    ap.add_argument("--iterations", type=int, default=300)
    ap.add_argument("--target", type=float, default=0.3)
    ap.add_argument("--rake", default="", help='"nl50" (5%%, 4bb cap) or "nl500" (5%%, 0.6bb) for raked ranges')
    args = ap.parse_args()
    from flipup_gto.review import PreflopCache
    rake = {"": (0.0, 0.0), "nl50": (0.05, 4.0), "nl500": (0.05, 0.6)}[args.rake]
    cache = PreflopCache(os.path.join(os.path.dirname(__file__), "..", "flipup_gto", "data", "cache"))
    spot = cache.get(6, 100, rake_rate=rake[0], rake_cap=rake[1])
    path, ip_idx, oop_idx = SPOTS[args.spot]
    info = spot.engine.query(spot.resolve(path))
    pot, stack = info["pot"], 100.0 - max(info["invested"])
    oop_r, ip_r = class_to_combos(info["reach"][oop_idx]), class_to_combos(info["reach"][ip_idx])
    print(f"{args.spot} tree={args.tree} rake={args.rake or 'none'}: pot {pot:.1f}bb, stack {stack:.1f}bb", flush=True)
    for f in args.flops.split(","):
        t0 = time.time()
        s = PostflopSolver(parse_cards(f), pot, stack, oop_r, ip_r, sizing=TREES[args.tree], compress=True)
        st = s.solve(args.iterations, args.target, 25)
        root = s.node([])
        ip = s.node(["check"])
        rs = ip.range_strategy()
        small = next(lab for lab in ip.labels if lab.startswith("bet 33"))
        vs = s.node(["check", small]).range_strategy()
        print(f"  {f}: OOP root [{pct(root.range_strategy())}] | IP vs check [{pct(rs)}] | OOP vs 33% [{pct(vs)}] "
              f"| eq OOP {root.range_equity(0):.3f} share {root.range_ev(0) / pot:.3f} | expl {st.exploitability_pct:.2f}% "
              f"{time.time() - t0:.0f}s", flush=True)


if __name__ == "__main__":
    main()

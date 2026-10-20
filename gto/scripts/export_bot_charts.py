"""Exports the preflop charts the app's bots play from (src/game/botCharts.json).

For each solved table size and stack depth it reads the spots a bot meets before the flop and keeps,
for each of the 169 hand classes, how often GTO calls and how often it raises (folding is the rest):

  rfi.<hero>                 everyone folded to the hero
  open.<opener>.<hero>       one raise in front, folded to the hero
  3bet.<opener>.<threebettor>  the hero opened and got 3-bet, folded back round
  4bet.<threebettor>.<opener>  the hero 3-bet and the opener 4-bet
  limp                       the big blind after the small blind limps (call = check)

Seats are numbered in preflop acting order (0 acts first, the big blind is last).
Each spot is a 338-character string: for every class, call then raise, as one base-36 digit
(0 to 35, so 35 is 100%).

    python3 scripts/export_bot_charts.py --solved /tmp/pf --out ../src/game/botCharts.json
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import re
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from flipup_gto.preflop import CLASS_COMBOS, CLASSES, PreflopSpot  # noqa: E402

DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz"


def encode(call: np.ndarray, raise_: np.ndarray) -> str:
    out = []
    for c in range(169):
        out.append(DIGITS[int(round(float(np.clip(call[c], 0, 1)) * 35))])
        out.append(DIGITS[int(round(float(np.clip(raise_[c], 0, 1)) * 35))])
    return "".join(out)


def spot_at(spot: PreflopSpot, path: list[str], hero: int):
    """(call, raise) per class at the end of a line, or None if the line isn't in the tree or GTO never plays it."""
    try:
        idx = spot.resolve(path)
    except ValueError:
        return None
    info = spot.engine.query(idx)
    if info["terminal"] or info["player"] != hero:
        return None
    reach = info["reach"][hero]
    if float((reach * CLASS_COMBOS).sum()) <= 1e-3:
        return None
    strat = info["strategy"]
    kinds = [a["type"] for a in info["actions"]]
    call = np.zeros(169)
    raise_ = np.zeros(169)
    for i, k in enumerate(kinds):
        if k in ("call", "check"):
            call += strat[i]
        elif k in ("raise", "allin"):
            raise_ += strat[i]
    return call, raise_


def export_one(n: int, stack: float, path: str) -> dict:
    spot = PreflopSpot(num_players=n, stack=stack)
    d = np.load(path)
    spot.engine.load_cumulative_strategy(d["cum"].astype(np.float32), int(d["iterations"]),
                                         d["regret"].astype(np.float32) if "regret" in d else None)
    out: dict[str, str] = {}

    def put(key, line, hero):
        got = spot_at(spot, line, hero)
        if got is not None:
            out[key] = encode(*got)

    folds = lambda a, b: ["fold"] * (b - a)  # noqa: E731
    for hero in range(n - 1):
        put(f"rfi.{hero}", folds(0, hero), hero)
    for opener in range(n - 1):
        for hero in range(opener + 1, n):
            put(f"open.{opener}.{hero}", folds(0, opener) + ["raise"] + folds(opener + 1, hero), hero)
            # The hero 3-bets and everyone behind folds: the action is back on the opener.
            three = folds(0, opener) + ["raise"] + folds(opener + 1, hero) + ["raise"] + folds(hero + 1, n)
            put(f"3bet.{opener}.{hero}", three, opener)
            put(f"4bet.{hero}.{opener}", three + ["raise"], hero)
    sb = 0 if n == 2 else n - 2
    put("limp", folds(0, sb) + ["call"], n - 1)
    return {"names": list(spot.names), "spots": out}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--solved", default="/tmp/pf")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    charts = {}
    for path in sorted(glob.glob(os.path.join(args.solved, "*p_*.npz"))):
        m = re.search(r"(\d)p_(\d+)\.npz$", path)
        n, stack = int(m.group(1)), int(m.group(2))
        charts[f"{n}p{stack}"] = export_one(n, stack, path)
        print(f"{n}p {stack}bb: {len(charts[f'{n}p{stack}']['spots'])} spots", flush=True)
    data = {"classes": CLASSES, "note": "see gto/scripts/export_bot_charts.py", "charts": charts}
    with open(args.out, "w") as f:
        json.dump(data, f, separators=(",", ":"))
    print(f"{os.path.getsize(args.out) / 1024:.0f} KB -> {args.out}")


if __name__ == "__main__":
    main()

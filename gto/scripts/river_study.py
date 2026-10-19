"""River study: does GTO's river betting follow the textbook value-to-bluff ratios?

Solves river spots (BTN vs BB ranges from the preflop solution, a fixed pot and stack, several
bet sizes) on random boards and measures, for each bet size the in-position player uses after a
check:
  - the share of the betting range that is a bluff (loses to most of the calling range), compared
    with the theory value bet / (pot + 2 bet);
  - how often the out-of-position player defends against it, compared with MDF = pot / (pot + bet).

    python3 scripts/river_study.py --boards 12 --out research/river_study.json
"""
from __future__ import annotations

import argparse
import json
import os
import random
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from flipup_gto import _engine  # noqa: E402
from flipup_gto.cards import card_str, combo_cards  # noqa: E402
from flipup_gto.concepts import mdf, river_bluff_share  # noqa: E402
from flipup_gto.review import Reviewer, class_reach_to_combos  # noqa: E402
from flipup_gto.solver import BetSizing, PostflopSolver, StreetSizing  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--boards", type=int, default=12)
    ap.add_argument("--seed", type=int, default=3)
    ap.add_argument("--out", default="research/river_study.json")
    args = ap.parse_args()

    rv = Reviewer()
    spot = rv.preflop.get(6, 100)
    info = spot.engine.query(spot.resolve(["fold", "fold", "fold", "raise", "fold", "call"]))
    ip_r = class_reach_to_combos(info["reach"][3])
    oop_r = class_reach_to_combos(info["reach"][5])
    pot, stack = 20.0, 60.0
    river = StreetSizing("33%, 75%, 150%", "")
    sizing = BetSizing(oop={"river": StreetSizing("", "")}, ip={"river": river}, max_raises=0,
                       add_allin_threshold=0.0, force_allin_threshold=0.0, merge_threshold=0.0)
    rng = random.Random(args.seed)
    rows = []
    for k in range(args.boards):
        board = rng.sample(range(52), 5)
        s = PostflopSolver(board, pot, stack, oop_r, ip_r, sizing=sizing)
        st = s.solve(600, 0.1, 50)
        after_check = s.node(["check"])
        combos = after_check.info["combos1"]
        reach = after_check.info["weight1"]
        strat = after_check.info["strategy"]
        equity = after_check.info["equity1"]
        for i, lab in enumerate(after_check.labels):
            if not lab.startswith("bet"):
                continue
            facing = s.node(["check", i])
            frac = after_check.actions[i]["added"] / pot
            # Bluff = a hand that wins less than half the time against the calling range.
            call_i = facing.labels.index("call")
            caller_w = np.zeros(1326, dtype=np.float32)
            caller_w[facing.info["combos0"]] = facing.info["reach0"] * facing.info["strategy"][call_i]
            bet_w = reach * strat[i]
            if bet_w.sum() < 1e-6 or caller_w.sum() < 1e-6:
                continue
            hero_w = np.zeros(1326, dtype=np.float32)
            hero_w[combos] = bet_w
            eq_vs_calls = _engine.range_equities(hero_w.tolist(), caller_w.tolist(), board)
            bluff = sum(w for c, w in zip(combos, bet_w) if eq_vs_calls[c] < 0.5)
            defend = 1 - facing.range_strategy()["fold"]
            rows.append({"board": " ".join(card_str(c) for c in board), "size": round(frac, 2),
                         "bet_freq": round(float(bet_w.sum() / reach.sum()), 4),
                         "bluff_share": round(float(bluff / bet_w.sum()), 4),
                         "theory_bluff_share": round(river_bluff_share(1, frac), 4),
                         "defend": round(defend, 4), "mdf": round(mdf(1, frac), 4),
                         "exploitability_pct": round(st.exploitability_pct, 3)})
            print(f"{rows[-1]['board']} bet {100 * frac:.0f}%: freq {rows[-1]['bet_freq']:.2f}, bluffs "
                  f"{100 * rows[-1]['bluff_share']:.0f}% (theory {100 * rows[-1]['theory_bluff_share']:.0f}%), "
                  f"defend {100 * defend:.0f}% (MDF {100 * rows[-1]['mdf']:.0f}%)", flush=True)
    by_size: dict = {}
    for r in rows:
        by_size.setdefault(r["size"], []).append(r)
    summary = {}
    for size, rs in sorted(by_size.items()):
        w = np.array([r["bet_freq"] for r in rs])
        summary[str(size)] = {
            "spots": len(rs),
            "avg_bluff_share": round(float(np.average([r["bluff_share"] for r in rs], weights=w)), 4),
            "theory_bluff_share": rs[0]["theory_bluff_share"],
            "avg_defend": round(float(np.mean([r["defend"] for r in rs])), 4),
            "mdf": rs[0]["mdf"],
        }
        print(f"size {size}: bluffs {100 * summary[str(size)]['avg_bluff_share']:.0f}% vs theory "
              f"{100 * summary[str(size)]['theory_bluff_share']:.0f}%, defend "
              f"{100 * summary[str(size)]['avg_defend']:.0f}% vs MDF {100 * summary[str(size)]['mdf']:.0f}%")
    json.dump({"rows": rows, "summary": summary}, open(args.out, "w"), indent=1)


if __name__ == "__main__":
    main()

"""Flop study: how GTO plays a single-raised pot across many flops.

Solves BTN-open vs BB-call (6-max, 100bb, ranges from our preflop solution) on a sample of flops
and records, per flop: range and nut advantage, the BB's lead frequency, the BTN's c-bet frequency
and size split, the BB's response to a c-bet (fold / call / raise), and which hand types bet.
Results go to a JSON file and a markdown summary grouped by board texture.

    python3 scripts/flop_study.py --flops 24 --out research/flop_study.json
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time


sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from flipup_gto import _engine  # noqa: E402
from flipup_gto.cards import card_str, combo_cards  # noqa: E402
from flipup_gto.concepts import board_texture  # noqa: E402
from flipup_gto.review import Reviewer, class_reach_to_combos, range_by_category  # noqa: E402
from flipup_gto.solver import BetSizing, PostflopSolver, StreetSizing  # noqa: E402

TEXTURE_FLOPS = [
    "As7d2c", "Ks8h3d", "Qh9c4s", "JdTs3h", "9h8c7d", "7s6h5d", "6d4c2h", "AhKdQc", "KsQhJd", "Ad5s3h",
    "Th7h2h", "8s8d3c", "KdKh5s", "5c5h2d", "Ac9c6c", "Js9s4h", "Qd6s6h", "AcJs4c", "Tc9d4h", "8h6c3s",
    "Kc7c2d", "4s3d2c", "AdTd9s", "QcJc8h",
]


def strong_share(node, p, board) -> float:
    combos = node.info[f"combos{p}"]
    w = node.info[f"weight{p}"]
    tot = float(w.sum())
    s = 0.0
    for i, c in enumerate(combos):
        a, b = combo_cards(c)
        if w[i] <= 0 or a in board or b in board:
            continue
        if (_engine.evaluate([a, b] + list(board)) >> 20) >= 2:
            s += w[i]
    return s / tot if tot else 0.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--flops", type=int, default=24)
    ap.add_argument("--iterations", type=int, default=150)
    ap.add_argument("--target", type=float, default=0.7)
    ap.add_argument("--out", default="research/flop_study.json")
    args = ap.parse_args()
    log = lambda m: print(m, flush=True)  # noqa: E731

    rv = Reviewer()
    spot = rv.preflop.get(6, 100)
    info = spot.engine.query(spot.resolve(["fold", "fold", "fold", "raise", "fold", "call"]))
    ip_r = class_reach_to_combos(info["reach"][3])
    oop_r = class_reach_to_combos(info["reach"][5])
    pot = info["pot"]
    stack = 100 - max(info["invested"])
    log(f"BTN {ip_r.sum():.0f} combos vs BB {oop_r.sum():.0f} combos, pot {pot:.2f}bb, stack {stack:.1f}bb")
    flop_size = StreetSizing("33%, 75%", "60%")
    later = StreetSizing("75%", "a")
    sizing = BetSizing(oop={"flop": StreetSizing("33%", "60%"), "turn": later, "river": later},
                       ip={"flop": flop_size, "turn": later, "river": later}, max_raises=1)

    flops = TEXTURE_FLOPS[:args.flops]
    results = []
    t0 = time.time()
    for k, f in enumerate(flops):
        s = PostflopSolver(f, pot, stack, oop_r, ip_r, sizing=sizing, compress=True, max_memory_mb=6000)
        st = s.solve(args.iterations, args.target, 25)
        board = s.board
        root = s.node([])
        after_check = s.node(["check"])
        facing_small = s.node(["check", "bet 33%"])
        tex = board_texture(board)
        res = {
            "flop": " ".join(card_str(c) for c in board), "texture": tex.tags, "wetness": tex.wetness,
            "height": tex.height, "paired": tex.paired, "monotone": tex.monotone,
            "exploitability_pct": round(st.exploitability_pct, 3),
            "btn_equity": round(root.range_equity(1), 4), "bb_equity": round(root.range_equity(0), 4),
            "btn_ev_share": round(root.range_ev(1) / pot, 4), "bb_ev_share": round(root.range_ev(0) / pot, 4),
            "btn_strong": round(strong_share(root, 1, board), 4), "bb_strong": round(strong_share(root, 0, board), 4),
            "bb_root": {k2: round(v, 4) for k2, v in root.range_strategy().items()},
            "btn_after_check": {k2: round(v, 4) for k2, v in after_check.range_strategy().items()},
            "bb_vs_33": {k2: round(v, 4) for k2, v in facing_small.range_strategy().items()},
            "btn_cbet_by_category": range_by_category(after_check, board),
        }
        results.append(res)
        cbet = 1 - res["btn_after_check"].get("check", 0)
        log(f"[{k + 1}/{len(flops)}] {res['flop']} ({', '.join(tex.tags)}): BTN eq {res['btn_equity']:.2f}, "
            f"c-bet {100 * cbet:.0f}% {res['btn_after_check']}, BB lead "
            f"{100 * (1 - res['bb_root'].get('check', 0)):.0f}%, expl {st.exploitability_pct:.2f}% "
            f"({time.time() - t0:.0f}s)")
        json.dump(results, open(args.out, "w"), indent=1)


if __name__ == "__main__":
    main()

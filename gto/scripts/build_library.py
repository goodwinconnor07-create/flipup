"""Precompute postflop spots for the poker library (data/library/*.json).

For each board it solves the flop for a preflop matchup (ranges from our preflop solution), saves
the flop decision spots, then re-solves the turn and river along common lines (with ranges from
the street before) and saves those spots too. Each spot stores every hand in the deciding player's
range with GTO's frequencies, the EV of each action and the hand's equity.

    python3 scripts/build_library.py --boards 6 --groups btn_bb,sb_bb,threebet_ip,threebet_oop
"""
from __future__ import annotations

import argparse
import json
import os
import random
import sys
import time

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from flipup_gto import coach  # noqa: E402
from flipup_gto.cards import card_str, combo_str  # noqa: E402
from flipup_gto.review import Reviewer, class_reach_to_combos, range_by_category  # noqa: E402
from flipup_gto.solver import BetSizing, PostflopSolver, StreetSizing  # noqa: E402

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "flipup_gto", "data", "library")

# matchup: preflop path in the 6-max tree, the two players' indices (OOP, IP), names
GROUPS = {
    "btn_bb": (["fold", "fold", "fold", "raise", "fold", "call"], 5, 3, "BB", "BTN", "BTN"),
    "sb_bb": (["fold", "fold", "fold", "fold", "raise", "call"], 4, 5, "SB", "BB", "SB"),
    "threebet_ip": (["fold", "fold", "raise", "raise", "fold", "fold", "call"], 2, 3, "CO", "BTN", "BTN"),
    "threebet_oop": (["fold", "fold", "fold", "raise", "fold", "raise", "call"], 5, 3, "BB", "BTN", "BB"),
}


def sizing(flop="33%, 75%", turn="50%, 100%", river="33%, 75%, 125%", lean_later=True):
    later_turn = StreetSizing("75%", "a") if lean_later else StreetSizing(turn, "60%")
    s = {"flop": StreetSizing(flop, "60%"), "turn": StreetSizing(turn, "60%") if not lean_later else later_turn,
         "river": StreetSizing("75%", "a") if lean_later else StreetSizing(river, "60%")}
    # Two raises, so a bet can re-raise a check-raise (with one, betting looked far worse than in the
    # full game; see docs/GTO_PLAYBOOK.md section 12).
    return BetSizing(oop=dict(s), ip=dict(s), max_raises=2)


# Saved in every spot. --skip-existing only skips spots built with this tree, so after a tree change
# an interrupted rebuild resumes instead of keeping old spots.
TREE_VERSION = "two-raises"


def save_spot(scenario, node, board, hero, villain, history, stack, pot, extra=None):
    p = node.player
    combos = node.info[f"combos{p}"]
    reach = node.info[f"reach{p}"]
    eq = node.info[f"equity{p}"]
    hands = {}
    for i, c in enumerate(combos):
        if reach[i] < 0.01:
            continue
        hands[combo_str(c)] = [round(float(reach[i]), 3),
                               [round(float(node.info["strategy"][j][i]), 3) for j in range(len(node.labels))],
                               [round(float(node.info["action_ev"][j][i]), 3) for j in range(len(node.labels))],
                               round(float(eq[i]), 3)]
    to_call = 0.0
    contrib = node.info["contrib"]
    to_call = round(abs(contrib[0] - contrib[1]), 2)
    spot = {"scenario": scenario, "street": ["flop", "turn", "river"][len(board) - 3],
            "board": [card_str(c) for c in board], "hero": hero, "villain": villain, "history": history,
            "pot_bb": round(node.pot, 2), "stack_bb": round(stack, 2), "to_call_bb": to_call,
            "actions": node.labels, "action_data": node.actions,
            "range_strategy": {k: round(v, 4) for k, v in node.range_strategy().items()},
            "by_category": range_by_category(node, board), "grid": coach.grid_from_node(node), "hands": hands,
            "tree": TREE_VERSION}
    if extra:
        spot.update(extra)
    name = f"{scenario}_{''.join(card_str(c) for c in board)}.json"
    json.dump(spot, open(os.path.join(OUT, name), "w"), separators=(",", ":"))
    return name


def villain_folds(solver, node):
    out = {}
    for i, lab in enumerate(node.labels):
        if coach.action_kind(lab) not in ("bet", "raise"):
            continue
        child = solver.engine.query(node.tokens + [str(i)], False, False)
        if child["type"] != "action":
            continue
        types = [x["type"] for x in child["actions"]]
        if "fold" in types:
            q = child["player"]
            r = child[f"reach{q}"]
            out[lab] = round(float((child["strategy"][types.index("fold")] * r).sum() / max(float(r.sum()), 1e-9)), 4)
    return out


def node_or_none(solver, path):
    try:
        n = solver.node(path)
        return n if n.type == "action" else None
    except (ValueError, IndexError):
        return None


def run_group(rv, group, board, log, iters):
    path, oop_i, ip_i, oop_name, ip_name, aggressor = GROUPS[group]
    spot6 = rv.preflop.get(6, 100)
    info = spot6.engine.query(spot6.resolve(path))
    oop_r = class_reach_to_combos(info["reach"][oop_i])
    ip_r = class_reach_to_combos(info["reach"][ip_i])
    pot = float(info["pot"])
    stack = 100 - max(info["invested"])
    pre = [f"{ip_name if aggressor == ip_name else oop_name} raises preflop",
           f"{oop_name if aggressor == ip_name else ip_name} calls"]
    t0 = time.time()
    s = PostflopSolver(board, pot, stack, oop_r, ip_r, sizing=sizing(), compress=True, max_memory_mb=7000)
    st = s.solve(iters, 0.7, 25)
    flop_txt = " ".join(card_str(c) for c in board)
    log(f"  {group} {flop_txt}: flop solved {st.exploitability_pct:.2f}% in {time.time() - t0:.0f}s")
    hist = pre + [f"Flop {flop_txt}"]
    saved = []
    if group == "btn_bb":
        n = node_or_none(s, ["check"])
        if n:
            saved.append(save_spot("cbet_ip", n, board, ip_name, oop_name, hist + ["BB checks"], stack, pot,
                                   {"villain_folds": villain_folds(s, n)}))
        n = node_or_none(s, ["check", "bet 33%"])
        if n:
            saved.append(save_spot("vs_cbet_oop", n, board, oop_name, ip_name,
                                   hist + ["BB checks", "BTN bets 33%"], stack, pot, {"villain_folds": villain_folds(s, n)}))
        n = node_or_none(s, ["check", "bet 33%", "raise"])
        if n:
            saved.append(save_spot("vs_checkraise", n, board, ip_name, oop_name,
                                   hist + ["BB checks", "BTN bets 33%", "BB raises"], stack, pot))
    elif group == "sb_bb":
        n = node_or_none(s, [])
        if n:
            saved.append(save_spot("cbet_oop", n, board, oop_name, ip_name, hist, stack, pot,
                                   {"villain_folds": villain_folds(s, n)}))
        n = node_or_none(s, ["bet 33%"])
        if n:
            saved.append(save_spot("vs_cbet_ip", n, board, ip_name, oop_name, hist + ["SB bets 33%"], stack, pot,
                                   {"villain_folds": villain_folds(s, n)}))
    elif group == "threebet_ip":
        n = node_or_none(s, ["check"])
        if n:
            saved.append(save_spot("3bet_pot_ip", n, board, ip_name, oop_name, hist + ["CO checks"], stack, pot,
                                   {"villain_folds": villain_folds(s, n)}))
    elif group == "threebet_oop":
        n = node_or_none(s, [])
        if n:
            saved.append(save_spot("3bet_pot_oop", n, board, oop_name, ip_name, hist, stack, pot,
                                   {"villain_folds": villain_folds(s, n)}))

    if group != "btn_bb":
        return saved
    # Turn and river spots along common lines, each re-solved from the ranges the line reaches.
    rng = random.Random(sum(board))
    deck = [c for c in range(52) if c not in board]
    for line, label in ((["check", "bet 33%", "call"], "bet-call"), (["check", "check"], "check-check")):
        end = s.node(line, with_equity=False, with_ev=False)
        if end.type != "chance":
            continue
        turn = rng.choice(deck)
        tboard = list(board) + [turn]
        tpot = end.pot
        tstack = min(end.info["stack"])
        ts = PostflopSolver(tboard, tpot, tstack, end.range_weights(0), end.range_weights(1),
                            sizing=sizing(turn="50%, 100%", lean_later=False), compress=True, max_memory_mb=7000)
        tst = ts.solve(iters, 0.5, 25)
        th = hist + (["BB checks", "BTN bets 33%", "BB calls"] if label == "bet-call" else ["BB checks", "BTN checks"]) \
            + [f"Turn {card_str(turn)}"]
        log(f"    turn {card_str(turn)} after {label}: {tst.exploitability_pct:.2f}%")
        if label == "check-check":
            n = node_or_none(ts, ["check"])
            if n:
                saved.append(save_spot("probe_or_delay", n, tboard, ip_name, oop_name, th + ["BB checks"], tstack, tpot,
                                       {"villain_folds": villain_folds(ts, n)}))
            continue
        n = node_or_none(ts, ["check"])
        if n:
            saved.append(save_spot("double_barrel", n, tboard, ip_name, oop_name, th + ["BB checks"], tstack, tpot,
                                   {"villain_folds": villain_folds(ts, n)}))
        bet_lab = next((lab for lab in (n.labels if n else []) if lab.startswith("bet")), None)
        if not n or not bet_lab:
            continue
        n2 = node_or_none(ts, ["check", bet_lab])
        if n2:
            saved.append(save_spot("vs_double_barrel", n2, tboard, oop_name, ip_name,
                                   th + ["BB checks", f"BTN {bet_lab.split(' (')[0]}"], tstack, tpot))
        rend = ts.node(["check", bet_lab, "call"], with_equity=False, with_ev=False)
        if rend.type != "chance":
            continue
        river = rng.choice([c for c in deck if c != turn])
        rboard = tboard + [river]
        rs = PostflopSolver(rboard, rend.pot, min(rend.info["stack"]), rend.range_weights(0), rend.range_weights(1),
                            sizing=sizing(river="33%, 75%, 125%", lean_later=False))
        rst = rs.solve(600, 0.3, 50)
        rh = th + ["BB checks", f"BTN {bet_lab.split(' (')[0]}", "BB calls", f"River {card_str(river)}"]
        log(f"    river {card_str(river)}: {rst.exploitability_pct:.2f}%")
        n = node_or_none(rs, ["check"])
        if n:
            saved.append(save_spot("triple_barrel", n, rboard, ip_name, oop_name, rh + ["BB checks"],
                                   min(rend.info["stack"]), rend.pot, {"villain_folds": villain_folds(rs, n)}))
            for lab in n.labels:
                if lab.startswith("bet 75") or (lab.startswith("bet") and "75" in lab):
                    n2 = node_or_none(rs, ["check", lab])
                    if n2:
                        saved.append(save_spot("vs_triple_barrel", n2, rboard, oop_name, ip_name,
                                               rh + ["BB checks", f"BTN {lab.split(' (')[0]}"], min(rend.info["stack"]),
                                               rend.pot))
                    break
    return saved


BOARDS = ["Ks 8d 3c", "As 7h 2d", "Qh Jh 4c", "9s 8s 6d", "Td 5c 2h", "Ac Kd 9h", "7c 6d 5h", "Kh Kd 4s",
          "Jc 9c 2s", "8h 4d 3s", "Ad Qs 5d", "6s 6h 2c"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--boards", type=int, default=6)
    ap.add_argument("--groups", default="btn_bb,sb_bb,threebet_ip,threebet_oop")
    ap.add_argument("--iterations", type=int, default=150)
    ap.add_argument("--skip-existing", action="store_true",
                    help="skip board/group pairs whose flop spot is already saved with the current tree (resume)")
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    log = lambda m: print(m, flush=True)  # noqa: E731
    from flipup_gto.cards import parse_cards
    rv = Reviewer()
    flop_spot = {"btn_bb": "cbet_ip", "sb_bb": "cbet_oop", "threebet_ip": "3bet_pot_ip", "threebet_oop": "3bet_pot_oop"}
    for b in BOARDS[:args.boards]:
        for g in args.groups.split(","):
            done = os.path.join(OUT, f"{flop_spot.get(g, g)}_{b.replace(' ', '')}.json")
            if args.skip_existing and os.path.exists(done) and json.load(open(done)).get("tree") == TREE_VERSION:
                log(f"  {g} {b}: already built, skipping")
                continue
            try:
                names = run_group(rv, g, parse_cards(b), log, args.iterations)
                log(f"  saved {', '.join(names)}")
            except Exception as e:  # keep going with the other boards
                log(f"  {g} {b} failed: {type(e).__name__}: {e}")


if __name__ == "__main__":
    main()

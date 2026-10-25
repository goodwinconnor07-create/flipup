"""Multiway full-hand quizzes, solved ahead of time: three or four players see the flop.

Preflop is the solved 6-max game (flipup_gto.custom.Explorer): every seat plays its own GTO mix for the
cards it holds, nobody is forced to fold, and only hands where at least three players see the flop are
kept. After the flop each street is solved for everyone still in with the multiway solver
(_engine.MultiwaySolver), from ranges narrowed by every move so far:

- flop: flop and turn betting, the river checked down, over a spread of 13 turn and river cards;
- turn: turn and river betting, every river;
- river: river betting.

Every player picks each move from their own solved mix, so the line is one GTO could really play. At
each of the quiz player's decisions the record keeps every option with GTO's frequency for that exact
hand and its EV, and the hand's equity against the players still in, so the phone grades any answer
instantly. Output: one JSON line per hand.

    python3 scripts/quiz_multiway.py --n 50 --seed 1 --out quizmw_1.jsonl
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

from flipup_gto import _engine  # noqa: E402
from flipup_gto.cards import card_str, combo_index, hand_class  # noqa: E402
from flipup_gto.custom import Explorer  # noqa: E402
from flipup_gto.preflop import CLASS_INDEX  # noqa: E402
from flipup_gto.review import Reviewer, class_reach_to_combos  # noqa: E402

N = 6
STACK = 100.0
POS = ["UTG", "HJ", "CO", "BTN", "SB", "BB"]
POSTFLOP_ORDER = [4, 5, 0, 1, 2, 3]  # SB acts first after the flop, BTN last
STREETS = ["preflop", "flop", "turn", "river"]
# Bet sizes after the flop (pot fractions) and raises (pot fraction after calling): small bets suit
# multiway pots, where ranges are tighter and bluffs work less often.
BET = {0: [0.33, 0.75], 1: [0.66], 2: [0.75]}
RAISE = {0: [0.7], 1: [0.7], 2: [0.7]}
# The quiz player's own menu on the street being solved: four bet sizes, two raise sizes and all-in
# always, so every move they might want has a solved answer.
HERO_BET = [0.33, 0.5, 0.75, 1.25]
HERO_RAISE = [0.6, 1.0]
ITERATIONS = {0: 80, 1: 120, 2: 200}
VERBOSE = False
# Share of hands kept by the street the quiz player's hand ends on (they fold or it's over).
KEEP = {"preflop": 0.0, "flop": 0.4, "turn": 0.8, "river": 1.0}


def bb(x: float) -> str:
    return f"{x:.1f}".rstrip("0").rstrip(".") + "bb"


def spread(board: list) -> list:
    """One card per rank clear of the board, suits rotating (matches the solver's own spread)."""
    out = []
    for rank in range(13):
        for k in range(4):
            c = rank * 4 + (rank + k) % 4
            if c not in board:
                out.append(c)
                break
    return out


def pick(freqs, rng: random.Random) -> int:
    total = float(sum(freqs))
    x = rng.random() * total
    for i, f in enumerate(freqs):
        x -= f
        if x <= 0:
            return i
    return len(freqs) - 1


def label(a: dict, pot: float) -> tuple[str, str]:
    t = a["type"]
    if t in ("fold", "check"):
        return t.capitalize(), t
    if t == "call":
        return f"Call {bb(a['amount'])}", "call"
    if a["all_in"]:
        return f"All-in {bb(a['amount'])}", "allin"
    if t == "bet":
        return f"Bet {100 * a['added'] / pot:.0f}% ({bb(a['amount'])})", "bet"
    return f"Raise to {bb(a['amount'])}", "raise"


_QUERIES: dict = {}


def preflop_query(spot, path: list) -> dict:
    """The solved preflop game at a line (lines repeat a lot, so they're kept)."""
    key = tuple(path)
    if key not in _QUERIES:
        q = spot.engine.query(path)
        _QUERIES[key] = {"terminal": q["terminal"], "player": q.get("player"), "actions": q.get("actions"),
                         "strategy": np.asarray(q["strategy"]) if not q["terminal"] else None,
                         "folded": q["folded"], "invested": q["invested"], "pot": q["pot"],
                         "reach": [np.asarray(r) for r in q["reach"]] if q["terminal"] else None}
    return _QUERIES[key]


def play_preflop(spot, rng: random.Random, cards: dict):
    """Everyone plays their own GTO mix from the solved preflop game. Returns (steps, path, terminal info)."""
    path: list = []
    steps: list = []
    for _ in range(40):
        q = preflop_query(spot, path)
        if q["terminal"]:
            return steps, path, q
        p = q["player"]
        cls = CLASS_INDEX[hand_class(combo_index(*cards[p]))]
        k = pick(q["strategy"][:, cls], rng)
        a = q["actions"][k]
        steps.append({"street": "preflop", "seat": p, "kind": a["type"], "to_bb": round(float(a["to"]), 2),
                      "path": list(path)})
        path.append(k)
    return None


def preflop_decision(ex: Explorer, step: dict, seat: int, cards: tuple) -> dict:
    """The quiz player's preflop decision with every option, GTO's frequency for their hand and its EV."""
    req = {"players": N, "stacks_bb": [STACK] * N, "preflop": step["path"], "flop": [], "turn": [], "river": [],
           "board": [], "hero": seat, "hero_cards": "".join(card_str(c) for c in cards)}
    mine = ex.spot(req, solve=True)
    return {"street": "preflop", "pot_bb": mine.get("pot_bb"), "to_call_bb": mine.get("to_call_bb"),
            "options": [{"label": x["label"], "kind": x["kind"], "to_bb": x["to_bb"], "freq": x["freq"],
                         "ev_bb": x.get("ev_bb")} for x in mine["options"]],
            "equity": None}


def solve_street(street: int, board: list, seats: list, ranges: dict, pot: float, behind: float, hero: int = -1):
    mc = _engine.MWConfig()
    mc.players = len(seats)
    mc.board = board
    mc.pot = pot
    mc.stack = behind
    mc.range = [list(map(float, ranges[s])) for s in seats]
    mc.max_raises = 1
    mc.end_street = 1 if street == 0 else 2
    mc.deal_subset = spread(board) if street == 0 else []
    for st in range(3):
        mc.set_sizes(st, BET[st], RAISE[st])
        mc.set_hero_sizes(st, HERO_BET, HERO_RAISE)
    mc.hero = seats.index(hero) if hero in seats else -1
    solver = _engine.MultiwaySolver(mc)
    solver.iterate(ITERATIONS[street])
    return solver


def play_hand(ex: Explorer, rng: random.Random, hand_id: str, max_players: int):
    deck = list(range(52))
    rng.shuffle(deck)
    cards = {s: (deck.pop(), deck.pop()) for s in range(N)}
    board_cards = [deck.pop() for _ in range(5)]
    spot = ex._preflop(N, int(STACK), True)
    pre = play_preflop(spot, rng, cards)
    if pre is None:
        return None
    steps, path, info = pre
    live = [s for s in range(N) if not info["folded"][s]]
    if VERBOSE:
        print(f"  preflop: {len(live)} see the flop ({'/'.join(POS[s] for s in live)})", flush=True)
    if not 3 <= len(live) <= max_players:
        return None
    behind = {s: STACK - float(info["invested"][s]) for s in live}
    if max(behind.values()) - min(behind.values()) > 1e-6 or min(behind.values()) <= 0:
        return None  # uneven stacks or someone all in preflop: not a spot for the multiway solver
    hero = rng.choice(live)
    hero_combo = combo_index(*cards[hero])
    combo_of = {s: combo_index(*cards[s]) for s in live}
    seats = sorted(live, key=POSTFLOP_ORDER.index)
    ranges = {s: class_reach_to_combos(info["reach"][s]).astype(np.float64) for s in live}
    for s in live:
        ranges[s][combo_of[s]] = max(ranges[s][combo_of[s]], 1e-4)  # the cards they hold stay possible
    pot = float(info["pot"])
    stack = behind[live[0]]
    decisions = []
    for k, st in enumerate(steps):
        if st["seat"] == hero:
            decisions.append({"step": k, **preflop_decision(ex, st, hero, cards[hero])})
    for st in steps:
        st.pop("path", None)
    hero_folded = False
    last_street = "preflop"
    board: list = []
    for street in (0, 1, 2):
        board = board_cards[:3 + street]
        name = STREETS[street + 1]
        last_street = name
        if len(seats) < 2:
            break
        # Each player's own cards must be possible given the board (they are: dealt from one deck).
        t = time.time()
        solver = solve_street(street, board, seats, ranges, pot, stack, hero)
        if VERBOSE:
            print(f"  {name}: {len(seats)} players, {solver.num_nodes} nodes, {time.time() - t:.0f}s, "
                  f"gain {solver.exploitability_pct():.2f}% pot", flush=True)
        qpath: list = []
        while True:
            q = solver.query(qpath, False, False)
            if q["type"] != "action":
                break
            actor = seats[q["player"]]
            strat = [s[combo_of[actor]] for s in q["strategy"]]
            k = pick(strat, rng)
            a = q["actions"][k]
            if actor == hero:
                full = solver.query(qpath, True, True)
                to_call = max(full["wager"]) - full["wager"][q["player"]]
                opts = []
                for j, act in enumerate(full["actions"]):
                    lab, kind = label(act, full["pot"])
                    opts.append({"label": lab, "kind": kind, "to_bb": round(act["amount"], 2),
                                 "freq": round(float(full["strategy"][j][hero_combo]), 4),
                                 "ev_bb": round(float(full["action_ev"][j][hero_combo]), 3)})
                if to_call <= 1e-9:
                    # Folding when you could check is always a mistake, but it's a button: it's worth 0.
                    opts.append({"label": "Fold", "kind": "fold", "to_bb": 0.0, "freq": 0.0, "ev_bb": 0.0})
                decisions.append({"step": len(steps), "street": name, "pot_bb": round(full["pot"], 2),
                                  "to_call_bb": round(to_call, 2), "options": opts,
                                  "equity": round(float(full["equity"][q["player"]][hero_combo]), 4),
                                  "players": sum(1 for x in full["active"] if x)})
            lab, kind = label(a, q["pot"])
            steps.append({"street": name, "seat": actor, "kind": kind, "to_bb": round(a["amount"], 2)})
            qpath.append(k)
            if actor == hero and a["type"] == "fold":
                hero_folded = True
                break
        if hero_folded:
            break
        q = solver.query(qpath, False, False)
        active = [seats[i] for i, x in enumerate(q["active"]) if x]
        if q["type"] == "fold" or len(active) < 2:
            break
        # Narrow every range by the moves made, then carry the pot and stacks to the next street.
        for i, s in enumerate(seats):
            ranges[s] = np.asarray(q["reach"][i], dtype=np.float64)
            ranges[s][combo_of[s]] = max(ranges[s][combo_of[s]], 1e-6)
        pot = q["pot"]
        stack = stack - q["contrib"][seats.index(active[0])]
        seats = active
        if street == 2 or q["type"] == "showdown" and len(board) == 5:
            break
        if stack <= 1e-9:
            # Everyone left is all in: the board runs out with no more decisions.
            board = board_cards[:5]
            last_street = "river"
            break
        nxt = board_cards[3 + street]
        # Zero the combos the next card blocks (the solver also skips them).
        blocked = [combo_index(nxt, x) for x in range(52) if x != nxt]
        for s in seats:
            ranges[s][blocked] = 0
    hero_decisions = [d for d in decisions if d["street"] != "preflop"]
    if not hero_decisions:
        return None
    if rng.random() > KEEP[last_street]:
        return None
    board = board_cards[:max(len(board), 3)]
    if hero_folded:
        result = {"showdown": False, "winners": []}
    else:
        alive = seats
        if len(alive) >= 2 and len(board) == 5:
            best = {s: _engine.evaluate(list(board) + list(cards[s])) for s in alive}
            top = max(best.values())
            result = {"showdown": True, "winners": [POS[s] for s, v in best.items() if v == top]}
        else:
            result = {"showdown": False, "winners": [POS[alive[0]]] if alive else []}
    return {
        "id": hand_id, "players": N, "stack_bb": STACK,
        "hero": {"seat": hero, "position": POS[hero], "cards": [card_str(c) for c in cards[hero]]},
        "villains": [{"seat": s, "position": POS[s], "cards": [card_str(c) for c in cards[s]]}
                     for s in live if s != hero],
        "board": [card_str(c) for c in board], "steps": steps, "decisions": decisions, "result": result,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=20)
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--out", required=True)
    ap.add_argument("--max-hours", type=float, default=0)
    ap.add_argument("--max-players", type=int, default=4)
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()
    global VERBOSE
    VERBOSE = args.verbose
    rng = random.Random(args.seed)
    ex = Explorer(Reviewer())
    t0 = time.time()
    done = tries = 0
    with open(args.out, "a") as f:
        while done < args.n:
            if args.max_hours and time.time() - t0 > args.max_hours * 3600:
                break
            tries += 1
            t = time.time()
            hand = play_hand(ex, rng, f"m{args.seed}-{tries}", args.max_players)
            if hand is None:
                continue
            f.write(json.dumps(hand, separators=(",", ":")) + "\n")
            f.flush()
            done += 1
            print(f"{done}/{args.n} {hand['hero']['position']} vs {'+'.join(v['position'] for v in hand['villains'])}, "
                  f"{len(hand['decisions'])} decisions, board {''.join(hand['board'])} in {time.time() - t:.0f}s "
                  f"({tries} tried)", flush=True)


if __name__ == "__main__":
    raise SystemExit('Legacy sampled/checkdown Scroll generation is disabled. Use the gated '
                     'run_network_campaign.py -> generate_scroll_verified.py pipeline instead. '
                     'This module remains available for preflop/format helpers.')

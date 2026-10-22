"""Full-hand quizzes, solved ahead of time: preflop to river, every decision with the solver's answer.

Each hand is played through the same engine as Custom hand (flipup_gto.custom.Explorer): the solved
preflop game, the pre-solved flop library where it has the flop (a live solve otherwise, refined to the
end), and full turn and river solves. Every player picks each move from their own GTO mix for the cards
they hold, so the line is one GTO could really play. At each of the quiz player's decisions the record
keeps every option with GTO's frequency for that exact hand and its EV, so the phone can grade any
answer instantly; the hand then carries on along the solved line.

Hands that end early are mostly skipped (KEEP: every hand that reaches the river, fewer shorter ones).
Output: one JSON line per hand.

    python3 scripts/quiz_hands.py --n 50 --seed 1 --out quiz_1.jsonl
"""
from __future__ import annotations

import argparse
import json
import os
import random
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from flipup_gto import _engine  # noqa: E402
from flipup_gto.cards import card_str, parse_cards  # noqa: E402
from flipup_gto.custom import Explorer  # noqa: E402
from flipup_gto.review import Reviewer  # noqa: E402

N = 6
POS = ["UTG", "HJ", "CO", "BTN", "SB", "BB"]
# (quiz player, opponent) pairs and how often to use them: the common heads-up matchups, from both sides.
PAIRS = [((3, 5), 6), ((5, 3), 6), ((2, 5), 4), ((5, 2), 4), ((0, 5), 3), ((5, 0), 3), ((1, 5), 2),
         ((5, 1), 2), ((4, 5), 4), ((5, 4), 4), ((3, 4), 2), ((4, 3), 2), ((2, 3), 2), ((3, 2), 2)]
STREETS = ["preflop", "flop", "turn", "river"]
# Share of hands kept by the last street reached: full hands are the point, shorter ones add variety.
KEEP = {"preflop": 0.05, "flop": 0.2, "turn": 0.5, "river": 1.0}


def solved(ex: Explorer, req: dict) -> dict:
    """The spot, solved to the end (flop solves refine in the background: wait for them)."""
    r = ex.spot(req, solve=True)
    for _ in range(600):
        if not r.get("refining"):
            return r
        time.sleep(1)
        r = ex.spot(req)
    return r


def pick(options: list, rng: random.Random) -> dict:
    live = [o for o in options if o.get("freq", 0) > 0]
    x = rng.random() * sum(o["freq"] for o in live)
    for o in live:
        x -= o["freq"]
        if x <= 0:
            return o
    return live[-1]


def showdown(cards: dict, board: list) -> list:
    best = {s: _engine.evaluate(board + list(c)) for s, c in cards.items()}
    top = max(best.values())
    return [s for s, v in best.items() if v == top]


def play_hand(ex: Explorer, rng: random.Random, hand_id: str):
    (hero, opp), = rng.choices([p for p, _ in PAIRS], weights=[w for _, w in PAIRS])
    deck = list(range(52))
    rng.shuffle(deck)
    cards = {s: (deck.pop(), deck.pop()) for s in range(N)}
    board_cards = [deck.pop() for _ in range(5)]
    req = {"players": N, "stacks_bb": [100.0] * N, "preflop": [], "flop": [], "turn": [], "river": [], "board": []}
    steps, decisions = [], []
    for _ in range(60):
        base = solved(ex, {**req, "hero": hero, "hero_cards": "".join(card_str(c) for c in cards[hero])})
        street = base["street"]
        if street == "done":
            break
        need = base.get("needs_cards")
        if need:
            req["board"] = [card_str(c) for c in board_cards[:len(req["board"]) + need["count"]]]
            continue
        actor = base["to_act"]
        if actor not in (hero, opp):
            # Everyone else folds: the quiz is a heads-up hand between the two chosen seats.
            fold = next((o for o in base["options"] if o["kind"] == "fold"), None)
            if fold is None:
                return None
            req[street].append(fold["id"])
            continue
        mine = solved(ex, {**req, "hero": actor, "hero_cards": "".join(card_str(c) for c in cards[actor])})
        choice = pick(mine["options"], rng)
        if actor == hero:
            decisions.append({
                "step": len(steps), "street": street, "pot_bb": mine.get("pot_bb"), "to_call_bb": mine.get("to_call_bb"),
                "options": [{"id": o["id"], "label": o["label"], "kind": o["kind"], "to_bb": o["to_bb"],
                             "freq": o["freq"], "ev_bb": o.get("ev_bb")} for o in mine["options"]],
                "equity": mine.get("equity"),
            })
        steps.append({"street": street, "position": POS[actor], "seat": actor, "action": choice["label"],
                      "kind": choice["kind"], "to_bb": choice["to_bb"]})
        req[street].append(choice["id"])
        if choice["kind"] == "fold" and actor in (hero, opp):
            break
    else:
        return None
    if not decisions:
        return None
    last = max((s["street"] for s in steps), key=STREETS.index)
    if rng.random() > KEEP[last]:
        return None
    folded = next((s["seat"] for s in steps if s["kind"] == "fold" and s["seat"] in (hero, opp)), None)
    board = req["board"]
    if folded is None and len(board) == 5:
        winners = showdown({hero: cards[hero], opp: cards[opp]}, parse_cards(board))
        result = {"showdown": True, "winners": [POS[s] for s in winners]}
    else:
        result = {"showdown": False, "winners": [POS[opp if folded == hero else hero]]}
    return {
        "id": hand_id, "players": N, "stack_bb": 100, "hero": {"seat": hero, "position": POS[hero],
                                                              "cards": [card_str(c) for c in cards[hero]]},
        "villain": {"seat": opp, "position": POS[opp], "cards": [card_str(c) for c in cards[opp]]},
        "board": board, "steps": steps, "decisions": decisions, "result": result,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=20)
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--out", required=True)
    ap.add_argument("--max-hours", type=float, default=0)
    args = ap.parse_args()
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
            hand = play_hand(ex, rng, f"q{args.seed}-{tries}")
            if hand is None:
                continue
            f.write(json.dumps(hand, separators=(",", ":")) + "\n")
            f.flush()
            done += 1
            print(f"{done}/{args.n} {hand['hero']['position']} vs {hand['villain']['position']} "
                  f"{len(hand['decisions'])} decisions, board {''.join(hand['board'])} in {time.time() - t:.0f}s "
                  f"({tries} tried)", flush=True)


if __name__ == "__main__":
    main()

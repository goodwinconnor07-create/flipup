"""The poker library: practice drills by situation.

Preflop drills come straight from the solved preflop game (instant). Postflop drills come from
spots precomputed by scripts/build_library.py into data/library/*.json; each spot stores, for
every hand in the player's range, GTO's action frequencies, the EV of each action and the
hand's equity, so a drill can deal a hand from the realistic range and grade the answer at once.
"""
from __future__ import annotations

import glob
import json
import os
import random

import numpy as np

from . import coach
from .cards import class_combos, combo_str, hand_class, parse_cards, parse_combo
from .concepts import alpha, board_texture, hand_features, mdf, required_equity
from .preflop import CLASS_COMBOS, CLASSES

LIB_DIR = os.path.join(os.path.dirname(__file__), "data", "library")

# id -> (group, title, description)
SCENARIOS = {
    "rfi": ("Preflop", "Opening the pot", "Everyone folds to you. Raise, or fold?"),
    "vs_open_ip": ("Preflop", "Facing an open in position", "Someone opened in front of you. 3-bet, call or fold?"),
    "vs_open_blinds": ("Preflop", "Defending the blinds", "You're in the small or big blind facing an open."),
    "vs_3bet": ("Preflop", "Facing a 3-bet", "You opened and got re-raised."),
    "vs_4bet": ("Preflop", "Facing a 4-bet", "You 3-bet and the opener came back over the top."),
    "vs_limp": ("Preflop", "Facing a limp", "The small blind limped into your big blind."),
    "cbet_ip": ("Flop", "C-betting in position", "You raised on the button and the big blind checks to you."),
    "cbet_oop": ("Flop", "C-betting out of position", "You raised from the small blind and the big blind called."),
    "vs_cbet_oop": ("Flop", "Facing a c-bet out of position", "You defended the big blind and face a c-bet. "
                    "Fold, call or check-raise?"),
    "vs_cbet_ip": ("Flop", "Facing a c-bet in position", "The small blind c-bets into your big blind."),
    "vs_checkraise": ("Flop", "Facing a check-raise", "You c-bet on the button and the big blind check-raised."),
    "3bet_pot_ip": ("Flop", "3-bet pot in position", "You 3-bet on the button and the cutoff called."),
    "3bet_pot_oop": ("Flop", "3-bet pot out of position", "You 3-bet from the big blind and the button called."),
    "double_barrel": ("Turn", "Double barrelling", "You c-bet the flop, got called, and it's checked to you."),
    "vs_double_barrel": ("Turn", "Facing a double barrel", "You called a flop c-bet and face a turn bet."),
    "probe_or_delay": ("Turn", "After the flop checks through", "The flop went check-check. Bet the turn?"),
    "triple_barrel": ("River", "Triple barrelling", "You bet flop and turn, got called twice: bet the river?"),
    "vs_triple_barrel": ("River", "Facing a triple barrel", "You called flop and turn and face a river bet."),
}

# Review scenario labels that don't have a drill of their own practise in a related one.
DRILL_FOR = {"check_raise": "vs_cbet_oop", "river_decision": "vs_triple_barrel", "multiway": None}

PREFLOP = {"rfi", "vs_open_ip", "vs_open_blinds", "vs_3bet", "vs_4bet", "vs_limp"}

_spots: dict | None = None


def load_spots() -> dict:
    global _spots
    if _spots is None:
        _spots = {}
        for path in sorted(glob.glob(os.path.join(LIB_DIR, "*.json"))):
            try:
                spot = json.load(open(path))
            except (OSError, ValueError):
                continue
            _spots.setdefault(spot["scenario"], []).append(spot)
    return _spots


def catalogue() -> list:
    spots = load_spots()
    out = []
    for sid, (group, title, desc) in SCENARIOS.items():
        n = None if sid in PREFLOP else len(spots.get(sid, []))
        out.append({"id": sid, "group": group, "title": title, "description": desc,
                    "available": sid in PREFLOP or bool(n), "spots": n})
    return out


def drill_for(scenario: str) -> str | None:
    if scenario in SCENARIOS:
        return scenario
    return DRILL_FOR.get(scenario)


# ---------------------------------------------------------------------------
# Drills
# ---------------------------------------------------------------------------

def _answer(labels, strat, evs, pot, in_range=True, actions=None) -> dict:
    best_i = int(np.argmax(evs))
    options = []
    for i, lab in enumerate(labels):
        loss = max(0.0, evs[best_i] - evs[i])
        pct = 100 * loss / pot if pot > 0 else 0
        g = ("best" if i == best_i or pct <= 0.5 else "correct" if strat[i] >= 0.035 and pct <= 1.0 else
             "inaccuracy" if pct <= 2.5 else "mistake" if pct <= 8 else "blunder")
        colour, reason = coach.colour_for(g, labels, strat, evs, i, pot, in_range, actions)
        options.append({"action": lab, "frequency": round(float(strat[i]), 3), "ev_bb": round(float(evs[i]), 3),
                        "ev_loss_bb": round(loss, 3), "colour": colour, "why": reason})
    return {"options": options, "best_action": labels[best_i]}


def _line_is_played(spot, path: list, min_freq: float = 0.02) -> bool:
    """Every raise or limp in the line is something GTO actually does (at least min_freq of the range).

    Spots behind a line GTO never takes have no range to speak of, so their strategies mean nothing.
    """
    for k, step in enumerate(path):
        if step == "fold":
            continue
        node = spot.node(path[:k])
        kinds = [a["type"] for a in node.actions]
        want = ("raise", "allin") if step == "raise" else (step,)
        freq = sum(v for lab, v, t in zip(node.labels, node.range_strategy().values(), kinds) if t in want)
        if freq < min_freq:
            return False
    return True


def preflop_drill(reviewer, scenario: str, rng: random.Random, players: int = 6, stack: float = 100,
                  attempts: int = 40) -> dict:
    if attempts <= 0:
        raise ValueError(f"couldn't find a {scenario} spot that GTO actually reaches")
    retry = lambda: preflop_drill(reviewer, scenario, rng, players, stack, attempts - 1)  # noqa: E731
    spot = reviewer.preflop.get(players, stack)
    names = spot.names
    n = players
    hero = None
    path: list = []
    history: list = []

    def fold_to(target_idx, start=0):
        for i in range(start, target_idx):
            path.append("fold")
            history.append(f"{names[i]} folds")

    if scenario == "rfi":
        hero = rng.randrange(0, n - 1)  # anyone but the BB
        fold_to(hero)
    elif scenario in ("vs_open_ip", "vs_open_blinds"):
        last_ip = n - 3  # BTN
        if scenario == "vs_open_ip":
            opener = rng.randrange(0, max(1, last_ip))
            hero = rng.randrange(opener + 1, last_ip + 1)
        else:
            opener = rng.randrange(0, n - 2)
            hero = rng.choice([n - 2, n - 1])
        fold_to(opener)
        path.append("raise")
        history.append(f"{names[opener]} raises")
        fold_to(hero, opener + 1)
    elif scenario == "vs_3bet":
        hero = rng.randrange(0, n - 2)
        threebettor = rng.randrange(hero + 1, n)
        fold_to(hero)
        path.append("raise")
        history.append(f"{names[hero]} (you) raises")
        fold_to(threebettor, hero + 1)
        path.append("raise")
        history.append(f"{names[threebettor]} 3-bets")
        for i in range(threebettor + 1, n):
            path.append("fold")
            history.append(f"{names[i]} folds")
    elif scenario == "vs_4bet":
        opener = rng.randrange(0, n - 2)
        hero = rng.randrange(opener + 1, n)
        fold_to(opener)
        path.append("raise")
        history.append(f"{names[opener]} raises")
        fold_to(hero, opener + 1)
        path.append("raise")
        history.append(f"{names[hero]} (you) 3-bets")
        for i in range(hero + 1, n):
            path.append("fold")
            history.append(f"{names[i]} folds")
        path.append("raise")
        history.append(f"{names[opener]} 4-bets")
    elif scenario == "vs_limp":
        hero = n - 1
        fold_to(n - 2)
        path.append("call")
        history.append(f"{names[n - 2]} completes (limps)")
    else:
        raise ValueError(f"not a preflop drill: {scenario}")
    try:
        node = spot.node(path)
    except ValueError:
        return retry()
    if node.terminal or node.player != hero or not _line_is_played(spot, path):
        return retry()
    reach = node.info["reach"][hero]
    # Half the time deal from hands GTO plays here, otherwise any hand that can reach the spot.
    weights = reach * CLASS_COMBOS
    if scenario == "rfi" and rng.random() < 0.5:
        raise_i = next((i for i, a in enumerate(node.actions) if a["type"] in ("raise", "allin")), None)
        if raise_i is not None:
            weights = weights * (0.15 + node.info["strategy"][raise_i])
    if weights.sum() <= 0:
        return retry()
    c = rng.choices(range(169), weights=list(weights))[0]
    cls = CLASSES[c]
    combo = rng.choice(class_combos(cls))
    labels = node.labels
    strat = [float(node.info["strategy"][i][c]) for i in range(len(labels))]
    evs = [float(node.info["action_ev"][i][c]) for i in range(len(labels))]
    pot = float(node.info["pot"])
    invested = node.info["invested"]
    to_call = max(invested) - invested[hero]
    answer = _answer(labels, strat, evs, pot)
    er = float(_er()[c])
    tips = [f"{combo_str(combo)} ({cls}) has {100 * er:.0f}% equity against a random hand.",
            f"From the {names[hero]} GTO plays: " + ", ".join(f"{k} {100 * v:.0f}%" for k, v in
                                                            node.range_strategy().items() if v >= 0.005) + "."]
    if to_call > 0 and max(invested) > 1:
        tips.append(f"You'd need {100 * to_call / (pot + to_call):.0f}% equity to call {to_call:.1f}bb into "
                    f"{pot:.1f}bb at showdown; position and playability move that threshold.")
    return {"scenario": scenario, "street": "preflop", "position": names[hero], "players": n, "stack_bb": stack,
            "history": history, "board": [], "pot_bb": round(pot, 2), "to_call_bb": round(to_call, 2),
            "hand": combo_str(combo), "hand_class": cls, "actions": labels, "answer": answer, "tips": tips,
            "grid": coach.grid_from_preflop(node, CLASSES)}


_er_cache = None


def _er():
    global _er_cache
    if _er_cache is None:
        from .preflop import tables
        eq, pairs, _ = tables(with_tensor=False)
        _er_cache = (eq * (pairs / pairs.sum(axis=1, keepdims=True))).sum(axis=1)
    return _er_cache


def postflop_drill(scenario: str, rng: random.Random) -> dict:
    spots = load_spots().get(scenario)
    if not spots:
        raise ValueError(f"no spots for {scenario}")
    spot = rng.choice(spots)
    hands = spot["hands"]
    keys = list(hands)
    weights = [hands[k][0] for k in keys]
    combo = rng.choices(keys, weights=weights)[0]
    w, strat, evs, eq = hands[combo]
    labels = spot["actions"]
    pot = spot["pot_bb"]
    to_call = spot["to_call_bb"]
    board = parse_cards(spot["board"])
    feats = hand_features(parse_cards(combo), board)
    answer = _answer(labels, strat, evs, pot, True, spot.get("action_data"))
    tips = [f"You have {feats.summary().lower()} ({feats.strength_name}), with {100 * eq:.0f}% equity against their "
            "range.", f"Board: {', '.join(board_texture(board).tags)}. SPR {spot['stack_bb'] / pot:.1f}."]
    if to_call > 0:
        before = pot - to_call
        tips.append(f"Pot odds: you need {100 * required_equity(before, to_call, to_call):.0f}% equity to call; "
                    f"MDF against this bet is {100 * mdf(before, to_call):.0f}%.")
    for lab, f in spot.get("villain_folds", {}).items():
        tips.append(f"If you {lab}, GTO's opponent folds {100 * f:.0f}% of the time.")
    tips.append("With its whole range GTO plays: " + ", ".join(f"{k} {100 * v:.0f}%" for k, v in
                                                            spot["range_strategy"].items() if v >= 0.01) + ".")
    return {"scenario": scenario, "street": spot["street"], "position": spot["hero"], "villain": spot["villain"],
            "history": spot["history"], "board": spot["board"], "pot_bb": pot, "to_call_bb": to_call,
            "stack_bb": spot["stack_bb"], "hand": combo, "hand_class": hand_class(parse_combo(combo)),
            "actions": labels, "answer": answer, "tips": tips, "by_category": spot.get("by_category"),
            "grid": spot.get("grid")}


def drill(reviewer, scenario: str, seed: int | None = None) -> dict:
    rng = random.Random(seed)
    if scenario in PREFLOP:
        return preflop_drill(reviewer, scenario, rng)
    return postflop_drill(scenario, rng)


__all__ = ["SCENARIOS", "catalogue", "drill", "drill_for", "load_spots", "alpha"]

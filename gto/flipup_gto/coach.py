"""Coaching layer on top of the solvers: colours, lessons, practice hands and strategy grids.

Every decision the review produces gets:
  colour    green (GTO, or close enough, including bet size), yellow (close: small EV loss or the
            right action with the wrong size), red (a real mistake)
  scenario  which library drill it belongs to ("vs_cbet_oop", "rfi", ...), for weakness tracking
  lesson    titled sections written like a coach would talk you through it: the spot, the ranges,
            your hand, the math (pot odds, MDF, SPR, fold equity), what GTO does, and the verdict
  practice  similar hands from the same solved spot, to quiz the player on
  grid      the acting player's strategy for every hand class (13x13), for range charts
"""
from __future__ import annotations

import random

import numpy as np

from .cards import RANKS, card_str, combo_cards, combo_str, hand_class
from .concepts import (alpha, hand_features, mdf, preflop_hand_description, required_equity, river_bluff_share,
                       value_to_bluff)

SCENARIOS = {
    "rfi": "Opening the pot (first in)",
    "vs_open_ip": "Facing an open in position",
    "vs_open_blinds": "Defending the blinds vs an open",
    "vs_3bet": "Facing a 3-bet",
    "vs_4bet": "Facing a 4-bet",
    "vs_limp": "Facing limpers",
    "cbet_ip": "C-betting in position",
    "cbet_oop": "C-betting out of position",
    "vs_cbet_oop": "Facing a c-bet out of position",
    "vs_cbet_ip": "Facing a c-bet in position",
    "vs_checkraise": "Facing a check-raise",
    "check_raise": "Check-raising",
    "double_barrel": "Double barrelling (turn bet)",
    "vs_double_barrel": "Facing a double barrel",
    "triple_barrel": "Triple barrelling (river bet)",
    "vs_triple_barrel": "Facing a triple barrel",
    "probe_or_delay": "Betting after the flop checks through",
    "river_decision": "River decisions",
    "multiway": "Multiway pots",
}

ACTION_COLOURS = {"fold": "fold", "check": "check", "call": "call", "bet": "bet", "raise": "raise", "all-in": "allin"}


def action_kind(label: str | None) -> str:
    if not label:
        return "?"
    head = label.split()[0]
    if head in ("all-in", "allin"):
        return "raise"
    if "all-in" in label:
        return "bet" if head == "bet" else "raise"
    return head


def size_fraction(label: str, actions: list | None, pot: float, i: int) -> float | None:
    """Bet size as a fraction of the pot for an aggressive action, from the tree action data."""
    if actions is None or i >= len(actions):
        return None
    a = actions[i]
    added = a.get("added")
    if added is None:
        return None
    return float(added) / pot if pot > 0 else None


def colour_for(grade: str | None, labels: list, strat: list, evs: list, idx: int | None, pot: float,
               in_range: bool, actions: list | None = None, size_note: str | None = None) -> tuple:
    """(colour, reason) for a graded decision."""
    if grade is None or idx is None:
        return ("red", "not one of GTO's options here") if idx is None and grade else (None, None)
    best_i = int(np.argmax(evs))
    loss = max(0.0, evs[best_i] - evs[idx])
    pct = 100 * loss / pot if pot > 0 else 0.0
    kind = action_kind(labels[idx])
    best_kind = action_kind(labels[best_i])
    if grade in ("best", "correct"):
        if size_note:
            return "yellow", "right action, but your size is well away from GTO's"
        return "green", "matches GTO"
    aggressive = kind in ("bet", "raise")
    if aggressive and best_kind in ("bet", "raise"):
        mine = size_fraction(labels[idx], actions, pot, idx)
        # Close enough: another size GTO really uses with this hand, within a quarter pot of yours.
        for j, lab in enumerate(labels):
            if j == idx or action_kind(lab) not in ("bet", "raise"):
                continue
            other = size_fraction(lab, actions, pot, j)
            used = (strat[j] if in_range else (1.0 if j == best_i else 0.0)) >= 0.2
            if mine is not None and other is not None and abs(mine - other) <= 0.25 and used and pct <= 1.5:
                return "green", "close enough to GTO's size"
        if pct <= 5.0:
            return "yellow", "right idea, wrong bet size"
    if grade == "inaccuracy":
        return "yellow", "close to GTO, small EV loss"
    return "red", "a clear mistake"


# ---------------------------------------------------------------------------
# Scenarios
# ---------------------------------------------------------------------------

def preflop_scenario(raises_before: int, limpers: int, position: str, facing_raise_by: str | None) -> str:
    if raises_before == 0:
        return "vs_limp" if limpers > 0 and position not in ("SB",) else "rfi"
    if raises_before == 1:
        return "vs_open_blinds" if position in ("SB", "BB") else "vs_open_ip"
    if raises_before == 2:
        return "vs_3bet"
    return "vs_4bet"


def postflop_scenario(street: str, live: int, hero_is_aggressor_prev: bool, facing_bet: bool, bets_this_street: int,
                      in_position: bool, prev_streets_bet_by_villain: int, prev_checked_through: bool,
                      hero_raised_this_street: bool) -> str:
    if live > 2:
        return "multiway"
    if street == "flop":
        if hero_raised_this_street and facing_bet:
            return "vs_checkraise"
        if hero_is_aggressor_prev and not facing_bet:
            return "cbet_ip" if in_position else "cbet_oop"
        if facing_bet and bets_this_street >= 1:
            if not hero_is_aggressor_prev and not in_position and bets_this_street == 1:
                return "vs_cbet_oop"
            if not hero_is_aggressor_prev and in_position:
                return "vs_cbet_ip"
            return "vs_checkraise"
        return "check_raise" if not in_position else "probe_or_delay"
    if street == "turn":
        if facing_bet:
            return "vs_checkraise" if hero_raised_this_street else (
                "vs_double_barrel" if prev_streets_bet_by_villain >= 1 else "probe_or_delay")
        if hero_is_aggressor_prev:
            return "double_barrel"
        return "probe_or_delay"
    if facing_bet:
        if hero_raised_this_street:
            return "vs_checkraise"
        return "vs_triple_barrel" if prev_streets_bet_by_villain >= 2 else "river_decision"
    if hero_is_aggressor_prev:
        return "triple_barrel"
    return "river_decision"


# ---------------------------------------------------------------------------
# Range descriptions
# ---------------------------------------------------------------------------

def range_text(w169: dict | list, classes: list, threshold: float = 0.5) -> str:
    """Compact range notation for class weights: '77+, A2s+, KTs+, AJo+, ...'."""
    w = dict(zip(classes, w169)) if not isinstance(w169, dict) else w169
    inn = {c for c, x in w.items() if x >= threshold}
    parts = []
    pairs = [r for r in RANKS if r * 2 in inn]
    if pairs:
        lo = min(pairs, key=RANKS.index)
        if all(RANKS[k] * 2 in inn for k in range(RANKS.index(lo), 13)):
            parts.append(f"{lo}{lo}+" if lo != "A" else "AA")
        else:
            parts.extend(r * 2 for r in sorted(pairs, key=RANKS.index, reverse=True))
    for kind in ("s", "o"):
        for hi in range(12, 0, -1):
            have = [lo for lo in range(hi - 1, -1, -1) if f"{RANKS[hi]}{RANKS[lo]}{kind}" in inn]
            if not have:
                continue
            # Run from the top kicker down.
            run = []
            for lo in range(hi - 1, -1, -1):
                if lo in have:
                    run.append(lo)
                else:
                    break
            if run and len(run) >= 2:
                parts.append(f"{RANKS[hi]}{RANKS[run[-1]]}{kind}+" if run[-1] != 0 or hi != 12 else f"A2{kind}+")
                rest = [lo for lo in have if lo not in run]
            else:
                rest = have
            parts.extend(f"{RANKS[hi]}{RANKS[lo]}{kind}" for lo in rest)
    return ", ".join(parts)


def composition(node, p: int, board: list) -> dict:
    """Share of player p's range (card-removal weighted) in each hand category at this node."""
    from .review import CATEGORY_ORDER, hand_category
    combos = node.info[f"combos{p}"]
    w = node.info[f"weight{p}"]
    acc: dict = {}
    examples: dict = {}
    for i, c in enumerate(combos):
        if w[i] <= 0:
            continue
        a, b = combo_cards(c)
        if a in board or b in board:
            continue
        cat = hand_category(hand_features([a, b], board))
        acc[cat] = acc.get(cat, 0.0) + float(w[i])
        examples.setdefault(cat, {})
        cls = hand_class(c)
        examples[cat][cls] = examples[cat].get(cls, 0.0) + float(w[i])
    tot = sum(acc.values()) or 1.0
    out = {}
    for cat in CATEGORY_ORDER:
        if cat in acc:
            top = sorted(examples[cat].items(), key=lambda kv: -kv[1])[:4]
            out[cat] = {"share": round(acc[cat] / tot, 3), "examples": [k for k, _ in top]}
    return out


def strength_percentile(node, p: int, combo: int) -> float | None:
    """Share of player p's range (weighted) with more equity than this combo: 0 = the nuts."""
    combos = node.info[f"combos{p}"]
    if combo not in combos:
        return None
    eq = node.info[f"equity{p}"]
    w = node.info[f"weight{p}"]
    if len(eq) == 0:
        return None
    mine = eq[list(combos).index(combo)]
    tot = float(w.sum())
    return float(w[eq > mine + 1e-6].sum() / tot) if tot > 0 else None


def grid_from_node(node) -> dict:
    """{class: {"w": weight, action: freq}} for the actor at a postflop node."""
    out = {}
    for cls, v in node.class_strategy().items():
        out[cls] = {k: round(float(x), 3) for k, x in v.items()}
    return out


def grid_from_preflop(node, classes: list) -> dict:
    out = {}
    reach = node.info["reach"][node.player]
    for c, cls in enumerate(classes):
        if reach[c] <= 1e-4:
            continue
        out[cls] = {"weight": round(float(reach[c]), 3),
                    **{lab: round(float(node.info["strategy"][i][c]), 3) for i, lab in enumerate(node.labels)}}
    return out


# ---------------------------------------------------------------------------
# Practice hands
# ---------------------------------------------------------------------------

def practice_postflop(node, hero_combo: int, category: str, board: list, k: int = 3, seed: int = 0) -> list:
    """Hands from the same solved spot and hand category as the player's, with GTO's answer."""
    from .review import hand_category
    p = node.player
    combos = list(node.info[f"combos{p}"])
    reach = node.info[f"reach{p}"]
    strat = node.info["strategy"]
    aev = node.info["action_ev"]
    hero_cls = hand_class(hero_combo)
    cands = []
    for i, c in enumerate(combos):
        if c == hero_combo or reach[i] < 0.02:
            continue
        a, b = combo_cards(c)
        if a in board or b in board:
            continue
        if hand_category(hand_features([a, b], board)) != category:
            continue
        cands.append((i, c))
    rng = random.Random(seed or hero_combo)
    rng.shuffle(cands)
    # Prefer different hand classes from the player's own.
    cands.sort(key=lambda x: hand_class(x[1]) == hero_cls)
    out = []
    seen = set()
    for i, c in cands:
        cls = hand_class(c)
        if cls in seen:
            continue
        seen.add(cls)
        evs = [float(aev[j][i]) for j in range(len(node.labels))]
        out.append({"hand": combo_str(c), "category": category,
                    "options": [{"action": lab, "frequency": round(float(strat[j][i]), 3), "ev_bb": round(evs[j], 3)}
                                for j, lab in enumerate(node.labels)],
                    "best_action": node.labels[int(np.argmax(evs))]})
        if len(out) >= k:
            break
    return out


def practice_preflop(node, hero_cls: str, classes: list, er: np.ndarray, k: int = 3, seed: int = 0) -> list:
    """Hand classes close in strength and type to the player's, from the same preflop spot."""
    from .cards import class_combos
    p = node.player
    reach = node.info["reach"][p]
    idx = classes.index(hero_cls)
    kind = "p" if len(hero_cls) == 2 else hero_cls[2]
    cands = []
    for c, cls in enumerate(classes):
        if cls == hero_cls or reach[c] < 0.05:
            continue
        ck = "p" if len(cls) == 2 else cls[2]
        cands.append((abs(er[c] - er[idx]) + (0.0 if ck == kind else 0.05), c, cls))
    cands.sort()
    rng = random.Random(seed or idx)
    out = []
    for _, c, cls in cands[:k]:
        combo = rng.choice(class_combos(cls))
        evs = [float(node.info["action_ev"][j][c]) for j in range(len(node.labels))]
        out.append({"hand": combo_str(combo), "class": cls,
                    "options": [{"action": lab, "frequency": round(float(node.info["strategy"][j][c]), 3),
                                 "ev_bb": round(evs[j], 3)} for j, lab in enumerate(node.labels)],
                    "best_action": node.labels[int(np.argmax(evs))]})
    return out


# ---------------------------------------------------------------------------
# Lessons
# ---------------------------------------------------------------------------

def _pct(x: float) -> str:
    return f"{100 * x:.0f}%"


def _mix(labels, strat, threshold=0.01) -> str:
    return ", ".join(f"{lab} {_pct(f)}" for lab, f in zip(labels, strat) if f >= threshold)


def postflop_lesson(d: dict, labels: list, strat: list, evs: list, idx: int, in_range: bool, feats, tex,
                    pot: float, to_call: float, street: str, comp_hero: dict, comp_opp: dict,
                    villain_fold: dict, percentile: float | None, spr_value: float, villain_pos: str) -> list:
    """The coach's walkthrough for one postflop decision, as titled sections."""
    sec = []
    pos = d["position"]
    ip = d.get("in_position")
    best_i = int(np.argmax(evs))
    rng = d["range"]

    # 1. The spot
    spot = [f"{street.capitalize()} on {' '.join(d['board'])} ({', '.join(tex.tags)}). You're in the {pos}, "
            f"{'in position' if ip else 'out of position'} against the {villain_pos}."]
    spot.append(f"Pot {d['pot_bb']:.1f}bb, effective stack {d['effective_stack_bb']:.1f}bb, so the stack-to-pot "
                f"ratio (SPR) is {spr_value:.1f}. "
                + ("At an SPR this low, top pair or better is usually happy to get all in."
                   if spr_value <= 2 else "With this much behind, one pair is a hand for pot control; you want two "
                   "pair or better (or a big draw) to play for stacks." if spr_value >= 6 else
                   "This medium SPR means strong one-pair hands can often get the money in by the river."))
    if to_call > 1e-9:
        spot.append(f"You're facing a bet of {to_call:.1f}bb.")
    if not ip:
        spot.append("Being out of position means acting first on every street, so you realize less of your "
                    "equity and check more often.")
    sec.append({"title": "The spot", "body": spot})

    # 2. Ranges
    rbody = []
    def comp_line(c):
        return "; ".join(f"{cat} {_pct(v['share'])} (e.g. {', '.join(v['examples'][:3])})" for cat, v in c.items())
    if comp_opp:
        rbody.append(f"Given how the {villain_pos} has played, their range here is roughly: {comp_line(comp_opp)}.")
    if comp_hero:
        rbody.append(f"Your range looks like: {comp_line(comp_hero)}.")
    adv = rng["your_range_equity"] - rng["opponent_range_equity"]
    nut = rng["your_strong_share"] - rng["opponent_strong_share"]
    rbody.append(f"Range equity: you {_pct(rng['your_range_equity'])} vs them {_pct(rng['opponent_range_equity'])}. "
                 + ("You have the range advantage, so you can bet more often." if adv > 0.04 else
                    "They have the range advantage, so expect to check and defend more." if adv < -0.04 else
                    "Neither side has a big range advantage."))
    rbody.append(f"Strong hands (two pair+): you {_pct(rng['your_strong_share'])} vs them "
                 f"{_pct(rng['opponent_strong_share'])}. "
                 + ("Holding more of the nuts lets you use bigger bets." if nut > 0.04 else
                    "They hold more of the nuts, which is a reason to be careful with big pots." if nut < -0.04 else
                    "Nut hands are split fairly evenly."))
    sec.append({"title": "Ranges", "body": rbody})

    # 3. Your hand
    hbody = [f"{d['hand']}: {feats.summary().lower()} ({feats.strength_name})."]
    if d.get("equity") is not None:
        hbody.append(f"Against their range you have {_pct(d['equity'])} equity (your share of the pot if all the cards "
                     "were dealt with no more betting).")
    if percentile is not None:
        hbody.append(f"That puts you in the top {_pct(max(percentile, 0.01))} of your own range here."
                     if percentile < 0.5 else
                     f"About {_pct(percentile)} of your range is stronger, so this is one of your weaker holdings here.")
    if feats.draws:
        hbody.append(f"Draws: {', '.join(feats.draws)} (roughly {feats.outs} outs to improve).")
    if feats.blockers:
        hbody.append(f"Blockers: {', '.join(feats.blockers)}.")
    sec.append({"title": "Your hand", "body": hbody})

    # 4. The math
    mbody = []
    if to_call > 1e-9:
        before = pot - to_call
        need = required_equity(before, to_call, to_call)
        mbody.append(f"Pot odds: call {to_call:.1f}bb to win {pot:.1f}bb, which is {pot / to_call:.1f} to 1, so you "
                     f"need {_pct(need)} equity to break even on a call (ignoring later streets).")
        if d.get("equity") is not None:
            eq = d["equity"]
            mbody.append(f"You have {_pct(eq)}: " + (
                "comfortably more than you need, before even counting position and implied odds." if eq > need + 0.1 else
                "about what you need, so position, draws and how well the hand plays on later streets decide it."
                if eq > need - 0.05 else
                "less than you need, so calling only works if you'll win extra on later streets (implied odds)."))
        mbody.append(f"Minimum defense frequency: against this size you'd need to keep {_pct(mdf(before, to_call))} of "
                     "your range to stop any two cards bluffing profitably. GTO often defends a bit less out of "
                     "position or when your range is weak here.")
        mbody.append(f"Their bet risks {to_call:.1f}bb to win {before:.1f}bb, so a pure bluff needs to work "
                     f"{_pct(alpha(before, to_call))} of the time.")
    for i, lab in enumerate(labels):
        if action_kind(lab) not in ("bet", "raise") or lab not in villain_fold:
            continue
        a = d.get("_actions", [None] * len(labels))[i]
        added = a.get("added") if a else None
        if not added:
            continue
        f = villain_fold[lab]
        risk_pot = pot if to_call <= 1e-9 else pot
        mbody.append(f"Fold equity with {lab}: GTO's opponent folds {_pct(f)} to it, which is worth about "
                     f"{f * risk_pot:.1f}bb straight away. It needs to fold {_pct(alpha(risk_pot, added))} for a "
                     "pure bluff to break even" + (" (it does)." if f >= alpha(risk_pot, added) else " (it doesn't, so "
                     "bluffs at this size need equity too)."))
        if street == "river" and to_call <= 1e-9:
            frac = added / pot
            mbody.append(f"A balanced river bet of {frac * 100:.0f}% pot has about {value_to_bluff(1, frac):.1f} value "
                         f"hands for each bluff ({_pct(river_bluff_share(1, frac))} bluffs).")
    if not mbody:
        mbody.append("No bet to call and no fold equity in play: the choice is about value and protection versus "
                     "keeping the pot small.")
    sec.append({"title": "The math", "body": mbody})

    # 5. What GTO does
    gbody = []
    if in_range:
        gbody.append(f"With exactly this hand GTO plays: {_mix(labels, strat)}.")
    else:
        gbody.append("A GTO player wouldn't usually hold this hand here, so compare the EV of each option.")
    gbody.append("With its whole range: " + ", ".join(f"{k} {_pct(v)}" for k, v in rng["range_strategy"].items()
                                                     if v >= 0.01) + ".")
    cats = rng.get("by_category") or {}
    aggressive = [lab for lab in labels if action_kind(lab) in ("bet", "raise")]
    if cats and aggressive:
        verb = "bets" if action_kind(aggressive[0]) == "bet" else "raises"
        gbody.append(f"How often it {verb}, by hand type: " + ", ".join(
            f"{cat} {_pct(sum(v.get(lab, 0.0) for lab in aggressive))}" for cat, v in cats.items()) + ".")
    gbody.append("EV of each option for your hand: " + ", ".join(f"{lab} {evs[i]:+.2f}bb" for i, lab in enumerate(labels))
                 + ".")
    sec.append({"title": "What GTO does", "body": gbody})

    # 6. Verdict
    sec.append({"title": "Verdict", "body": _verdict(d, labels, strat, evs, idx, best_i, in_range, feats, pot, street)})
    return sec


def _verdict(d, labels, strat, evs, idx, best_i, in_range, feats, pot, street) -> list:
    best = labels[best_i]
    loss = evs[best_i] - evs[idx]
    out = []
    colour = d.get("colour")
    if colour == "green":
        out.append(f"Good play. {labels[idx].capitalize()} is " + ("exactly what GTO does." if idx == best_i else
                   f"fine: GTO takes it {_pct(strat[idx])} of the time with this hand and it costs almost nothing."
                   if in_range and strat[idx] >= 0.035 else "within a whisker of the best option."))
    elif colour == "yellow":
        out.append(f"Close. {labels[idx].capitalize()} costs {loss:.2f}bb ({100 * loss / pot:.1f}% of the pot) "
                   f"compared with {best}" + (f": {d['colour_reason']}." if d.get("colour_reason") else "."))
    else:
        out.append(f"This one costs real money: {labels[idx]} loses {loss:.2f}bb ({100 * loss / pot:.1f}% of the pot) "
                   f"compared with {best}.")
    kind = action_kind(best)
    eq = d.get("equity") or 0.0
    if kind in ("bet", "raise"):
        if eq >= 0.6 or feats.is_nutted:
            out.append("Why: you're ahead of most hands that continue, so betting builds the pot while worse hands "
                       "still pay you.")
        elif feats.draws:
            out.append("Why: a semi-bluff. You win the pot when they fold and still have outs when they call.")
        else:
            out.append("Why: your hand rarely wins at showdown, so turning it into a bet that folds out better hands "
                       "is worth more than giving up.")
    elif kind == "check":
        out.append("Why: checking keeps the pot small with a hand that has some showdown value but gets called "
                   "mostly by better hands." if eq > 0.35 else
                   "Why: this hand isn't strong enough to bet for value and isn't one of the better bluffs.")
    elif kind == "call":
        out.append("Why: you have enough equity for the price, but raising would only get called by hands that "
                   "beat you or fold out hands you already beat.")
    elif kind == "fold":
        out.append("Why: you don't have the equity for the price, and this hand makes a poor bluff-raise.")
    takeaways = {
        "bet": "Takeaway: bet when worse hands call or better hands fold; size up with more strong hands.",
        "raise": "Takeaway: raise strong hands and your best draws; just call with medium hands.",
        "check": "Takeaway: medium hands with showdown value usually check; bet the strong and the best bluffs.",
        "call": "Takeaway: compare your equity with the pot odds, then adjust for position and later streets.",
        "fold": "Takeaway: don't pay off bets with hands that only beat bluffs when the price is too high.",
    }
    if kind in takeaways:
        out.append(takeaways[kind])
    return out


def preflop_lesson(d: dict, labels: list, strat: list, evs: list, idx: int | None, in_range: bool, cls: str,
                   pos: str, n_players: int, stack: float, to_call: float, pot: float, range_pct: float,
                   opener: dict | None, fold_after_raise: dict, er: float) -> list:
    sec = []
    best_i = int(np.argmax(evs))
    desc = preflop_hand_description(cls)
    spot = [f"Preflop at a {n_players}-handed table, about {stack:.0f}bb deep. You're in the {pos}."]
    if opener:
        spot.append(f"The {opener['position']} {opener['action']} to {opener['to']:.1f}bb. Pot {pot:.1f}bb, "
                    f"{to_call:.1f}bb for you to call.")
    elif to_call > 1e-9 and pos not in ("BB",):
        spot.append(f"Everyone before you folded. Pot {pot:.1f}bb.")
    sec.append({"title": "The spot", "body": spot})

    rbody = [f"From the {pos}, GTO continues with about {_pct(range_pct)} of hands in this spot."]
    if opener:
        rbody.append(f"The {opener['position']}'s range for this action is about {_pct(opener['pct'])} of hands: "
                     f"{opener['text']}.")
    rbody.append("Later positions play wider because fewer players are left to act behind them and they'll have "
                 "position after the flop.")
    sec.append({"title": "Ranges", "body": rbody})

    hbody = [f"{d['hand']} is {desc.lower()} ({cls}). Against a random hand it has {_pct(er)} equity."]
    traits = []
    if len(cls) == 2:
        traits.append("pairs flop a set about 12% of the time, which pays off big when stacks are deep")
    elif cls.endswith("s"):
        traits.append("suited hands make flushes and play well after the flop")
    if len(cls) == 3 and abs(RANKS.index(cls[0]) - RANKS.index(cls[1])) <= 2:
        traits.append("connected cards make straights")
    if len(cls) == 3 and cls.endswith("o") and RANKS.index(cls[1]) < 8:
        traits.append("weak offsuit hands make dominated pairs and realize little of their equity")
    if traits:
        hbody.append("Playability: " + "; ".join(traits) + ".")
    if opener and d.get("equity_vs_opener") is not None:
        hbody.append(f"Against the {opener['position']}'s range you have about {_pct(d['equity_vs_opener'])} all-in "
                     "equity.")
    sec.append({"title": "Your hand", "body": hbody})

    mbody = []
    if to_call > 1e-9 and opener:
        need = to_call / (pot + to_call)
        mbody.append(f"Pot odds: {to_call:.1f}bb to win {pot:.1f}bb, so a call needs {_pct(need)} equity at showdown. "
                     "Out of position you realize less than your raw equity, so real thresholds are higher.")
    for lab, f in fold_after_raise.items():
        mbody.append(f"Fold equity: if you {lab}, the next player folds about {_pct(f)} of the time in the GTO "
                     "solution, and you win the pot right there.")
    if not mbody:
        mbody.append("Opening is about stealing the blinds now and playing the pot with the initiative later.")
    sec.append({"title": "The math", "body": mbody})

    gbody = [f"With {cls} GTO plays: {_mix(labels, strat)}." if in_range else
             "GTO wouldn't usually have this hand here, so compare the EV of each option."]
    gbody.append("EV of each option (from the start of the hand): " +
                 ", ".join(f"{lab} {evs[i]:+.2f}bb" for i, lab in enumerate(labels)) + ".")
    sec.append({"title": "What GTO does", "body": gbody})

    vbody = []
    colour = d.get("colour")
    if idx is None:
        vbody.append(f"Your action isn't one GTO uses here. The best option was {labels[best_i]}.")
    else:
        loss = evs[best_i] - evs[idx]
        if colour == "green":
            vbody.append(f"Good play: {labels[idx]} matches GTO.")
        elif colour == "yellow":
            vbody.append(f"Close: {labels[idx]} costs {loss:.2f}bb versus {labels[best_i]}"
                         + (f" ({d['colour_reason']})." if d.get("colour_reason") else "."))
        else:
            vbody.append(f"Mistake: {labels[idx]} costs {loss:.2f}bb versus {labels[best_i]}.")
    if d.get("note"):
        vbody.append(d["note"])
    vbody.append("Takeaway: play tighter from early position, wider on the button, and prefer raising or folding "
                 "to limping or flat-calling outside the blinds.")
    sec.append({"title": "Verdict", "body": vbody})
    return sec


def flatten(sections: list) -> list:
    return [line for s in sections for line in s["body"]]


__all__ = ["SCENARIOS", "colour_for", "postflop_lesson", "preflop_lesson", "practice_postflop", "practice_preflop",
           "grid_from_node", "grid_from_preflop", "composition", "strength_percentile", "range_text",
           "preflop_scenario", "postflop_scenario", "card_str"]

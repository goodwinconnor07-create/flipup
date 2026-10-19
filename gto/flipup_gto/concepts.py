"""Poker math and hand/board descriptions used to explain GTO decisions.

Formulas (see research/02_practical_gto_strategy.md, section 1):
    required equity to call = call / (pot + bet + call)       (pot before the bet)
    MDF (minimum defense frequency) = pot / (pot + bet)
    alpha (bluff break-even fold %) = bet / (pot + bet)
    river bluff share of a polar betting range = bet / (pot + 2 * bet)
    geometric bet fraction over n streets = ((1 + 2 * SPR) ** (1/n) - 1) / 2
"""
from __future__ import annotations

from collections import Counter
from dataclasses import dataclass

from . import _engine
from .cards import RANKS, card_str, rank, suit

RANK_NAMES = ["Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Jack", "Queen", "King", "Ace"]
RANK_PLURAL = ["Twos", "Threes", "Fours", "Fives", "Sixes", "Sevens", "Eights", "Nines", "Tens", "Jacks", "Queens",
               "Kings", "Aces"]


# ---------------------------------------------------------------------------
# Bet math
# ---------------------------------------------------------------------------

def required_equity(pot_before_bet: float, bet: float, to_call: float | None = None) -> float:
    """Equity needed to break even on a call (ignores future streets)."""
    call = bet if to_call is None else to_call
    return call / (pot_before_bet + bet + call)


def pot_odds_ratio(pot_before_bet: float, bet: float, to_call: float | None = None) -> float:
    """'x to 1' pot odds."""
    call = bet if to_call is None else to_call
    return (pot_before_bet + bet) / call


def mdf(pot_before_bet: float, bet: float) -> float:
    """Minimum defense frequency: defend this often or any two cards can bluff profitably."""
    return pot_before_bet / (pot_before_bet + bet)


def alpha(pot_before_bet: float, bet: float) -> float:
    """How often a pure bluff must work to break even."""
    return bet / (pot_before_bet + bet)


def river_bluff_share(pot_before_bet: float, bet: float) -> float:
    """Share of bluffs in a balanced (polar) river betting range."""
    return bet / (pot_before_bet + 2 * bet)


def value_to_bluff(pot_before_bet: float, bet: float) -> float:
    b = river_bluff_share(pot_before_bet, bet)
    return (1 - b) / b


def spr(effective_stack: float, pot: float) -> float:
    return effective_stack / pot if pot > 0 else float("inf")


def geometric_fraction(pot: float, effective_stack: float, streets: int) -> float:
    return ((1 + 2 * effective_stack / pot) ** (1.0 / streets) - 1) / 2


# ---------------------------------------------------------------------------
# Board texture
# ---------------------------------------------------------------------------

@dataclass
class BoardTexture:
    cards: list
    high_card: str            # e.g. "A", "K"
    paired: bool
    trips: bool
    monotone: bool
    two_tone: bool
    rainbow: bool
    flush_possible: bool      # 3+ of a suit on board
    connected: bool           # 3 cards within a 5-rank window
    straight_possible: bool   # some two-card holding makes a straight
    wetness: str              # "dry", "semi-wet", "wet"
    height: str               # "high" (2+ broadway), "medium", "low"
    tags: list

    def describe(self) -> str:
        return ", ".join(self.tags)


def _straight_possible(board_ranks: set) -> bool:
    ranks = set(board_ranks)
    if 12 in ranks:
        ranks.add(-1)  # wheel ace
    for lo in range(-1, 9):
        window = set(range(lo, lo + 5))
        if len(window & ranks) >= 3:
            return True
    return False


def board_texture(board) -> BoardTexture:
    rs = [rank(c) for c in board]
    ss = [suit(c) for c in board]
    rc = Counter(rs)
    sc = Counter(ss)
    max_suit = max(sc.values())
    n = len(board)
    paired = max(rc.values()) >= 2
    trips = max(rc.values()) >= 3
    monotone = max_suit >= 3 and len(sc) == 1
    flush_possible = max_suit >= 3
    two_tone = max_suit == 2 and n == 3 or (n > 3 and max_suit == 2)
    rainbow = max_suit == 1
    uniq = sorted(set(rs))
    connected = any(sum(1 for r in uniq if lo <= r < lo + 5) >= 3 for lo in range(-1, 9))
    straight_possible = _straight_possible(set(rs))
    broadways = sum(1 for r in rs if r >= 8)
    height = "high" if broadways >= 2 else ("medium" if max(rs) >= 8 else "low")
    score = 0
    score += 2 if flush_possible else (1 if max_suit == 2 else 0)
    score += 2 if connected else (1 if straight_possible else 0)
    score -= 1 if paired else 0
    wetness = "wet" if score >= 3 else ("semi-wet" if score >= 1 else "dry")
    tags = []
    tags.append(f"{RANK_NAMES[max(rs)]}-high")
    if trips:
        tags.append("trips on board")
    elif paired:
        tags.append("paired")
    if monotone:
        tags.append("monotone")
    elif flush_possible:
        tags.append("flush possible")
    elif two_tone:
        tags.append("two-tone (flush draws)")
    elif rainbow:
        tags.append("rainbow")
    if connected:
        tags.append("connected")
    tags.append(wetness)
    return BoardTexture(list(board), RANKS[max(rs)], paired, trips, monotone, two_tone, rainbow, flush_possible,
                        connected, straight_possible, wetness, height, tags)


# ---------------------------------------------------------------------------
# Hand features
# ---------------------------------------------------------------------------

@dataclass
class HandFeatures:
    made: str                 # "Top pair, good kicker", "Overpair", "Set", "Flush", ...
    category: int             # evaluator category (0 high card .. 8 straight flush)
    strength_name: str        # "Pair of Kings"
    draws: list               # ["flush draw", "open-ended straight draw", ...]
    blockers: list            # notable blockers (e.g. "nut flush blocker")
    outs: int                 # rough clean-ish outs to improve (turn/flop only)
    is_nutted: bool           # very strong made hand (straight or better, sets on safe boards)

    def summary(self) -> str:
        parts = [self.made]
        if self.draws:
            parts.append(" + ".join(self.draws))
        return " with ".join(parts) if len(parts) > 1 else parts[0]


def _has_straight(ranks: set) -> bool:
    r = set(ranks)
    if 12 in r:
        r.add(-1)
    return any(all(x in r for x in range(lo, lo + 5)) for lo in range(-1, 9))


def _straight_draw(hole_ranks, board_ranks) -> str | None:
    """'open-ended straight draw', 'gutshot' or None (only counts draws that use a hole card)."""
    all_r = set(hole_ranks) | set(board_ranks)
    if _has_straight(all_r):
        return None
    completing = []
    for r in range(13):
        if r in all_r:
            continue
        test = all_r | {r}
        if _has_straight(test) and not _has_straight(set(board_ranks) | {r}):
            completing.append(r)
    if len(completing) >= 2:
        return "open-ended straight draw"
    if len(completing) == 1:
        return "gutshot"
    return None


def hand_features(hole, board) -> HandFeatures:
    hole = list(hole)
    board = list(board)
    strength = _engine.evaluate(hole + board) if len(board) >= 3 else 0
    cat = strength >> 20 if strength else 0
    hr = sorted((rank(c) for c in hole), reverse=True)
    br = sorted((rank(c) for c in board), reverse=True)
    board_counts = Counter(br)
    draws: list = []
    blockers: list = []
    outs = 0
    made = ""

    pocket_pair = hr[0] == hr[1]
    top, second = br[0], (sorted(set(br), reverse=True)[1] if len(set(br)) > 1 else None)
    bottom = br[-1]

    if cat >= 4:
        made = {4: "Straight", 5: "Flush", 6: "Full house", 7: "Quads", 8: "Straight flush"}[cat]
        # Does the hole card matter?
        board_only = _engine.evaluate(board) if len(board) == 5 else 0
        if len(board) == 5 and board_only == strength:
            made += " (playing the board)"
    elif cat == 3:
        if pocket_pair and hr[0] in br:
            made = "Set"
        else:
            made = "Trips"
    elif cat == 2:
        hole_in = [r for r in hr if r in br]
        if pocket_pair and hr[0] > top:
            made = "Overpair (board paired)"
        elif len(set(hole_in)) == 2:
            made = "Two pair (top two)" if set(hole_in) == {top, second} else "Two pair"
        elif len(hole_in) == 1:
            made = "Two pair (one card + board pair)"
        else:
            made = "Two pair on board"
    elif cat == 1:
        if pocket_pair:
            if hr[0] > top:
                made = "Overpair"
            elif hr[0] > (second if second is not None else -1):
                made = "Pocket pair below top card"
            else:
                made = "Underpair"
        else:
            paired_rank = next((r for r in hr if r in br), None)
            if paired_rank is None:
                made = "Pair on board"
            else:
                kicker = hr[1] if hr[0] == paired_rank else hr[0]
                if paired_rank == top:
                    if kicker >= 11 or (kicker == 10 and top == 12):
                        made = "Top pair, top kicker" if kicker == 12 or (top == 12 and kicker == 11) else \
                            "Top pair, good kicker"
                    elif kicker >= 8:
                        made = "Top pair, good kicker"
                    else:
                        made = "Top pair, weak kicker"
                elif second is not None and paired_rank == second:
                    made = "Second pair"
                elif paired_rank == bottom:
                    made = "Bottom pair"
                else:
                    made = "Middle pair"
    else:
        overs = sum(1 for r in hr if r > top)
        made = {2: "Two overcards", 1: "One overcard"}.get(overs, "No pair") if len(board) < 5 else "No pair"
        if len(board) == 5:
            made = f"{RANK_NAMES[hr[0]]} high"

    if len(board) in (3, 4) and cat < 5:
        suits = Counter(suit(c) for c in hole + board)
        for s_, cnt in suits.items():
            hole_s = sum(1 for c in hole if suit(c) == s_)
            if cnt == 4 and hole_s >= 1:
                draws.append("nut flush draw" if any(rank(c) == 12 and suit(c) == s_ for c in hole) else "flush draw")
                outs += 9
            elif cnt == 3 and hole_s >= 1 and len(board) == 3 and hole_s == 2:
                draws.append("backdoor flush draw")
        if cat < 4:
            sd = _straight_draw(hr, br)
            if sd:
                draws.append(sd)
                outs += 8 if sd.startswith("open") else 4
        if cat == 0:
            outs += 3 * sum(1 for r in hr if r > top)

    # Blockers: holding the ace of a 3+ suit on board, or top-set blockers on paired boards.
    suit_board = Counter(suit(c) for c in board)
    for s_, cnt in suit_board.items():
        if cnt >= 3:
            for c in hole:
                if suit(c) == s_ and rank(c) == 12:
                    blockers.append("nut flush blocker")
                elif suit(c) == s_ and rank(c) >= 10 and cat < 5:
                    blockers.append("flush blocker")
    if len(board) >= 3:
        for c in hole:
            if rank(c) == top and cat <= 1 and not pocket_pair and board_counts[top] == 1 and made.startswith("No"):
                blockers.append(f"blocks top pair ({card_str(c)})")

    is_nutted = cat >= 4 or (made == "Set" and not any(board_counts[r] > 1 for r in br))
    return HandFeatures(made=made, category=cat, strength_name=_engine.describe_strength(strength) if strength else "",
                        draws=draws, blockers=sorted(set(blockers)), outs=outs, is_nutted=is_nutted)


def preflop_hand_description(cls: str) -> str:
    """'AKs' -> 'Ace-King suited'."""
    r1, r2 = RANKS.index(cls[0]), RANKS.index(cls[1])
    if r1 == r2:
        return f"Pocket {RANK_PLURAL[r1].lower()}"
    kind = {"s": " suited", "o": " offsuit"}.get(cls[2:], "")
    return f"{RANK_NAMES[r1]}-{RANK_NAMES[r2]}{kind}"

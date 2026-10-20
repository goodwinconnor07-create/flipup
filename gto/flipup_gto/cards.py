"""Card, combo and hand-class helpers (pure Python, mirrors engine/include/flipup/cards.h).

Card index = rank * 4 + suit, ranks "23456789TJQKA", suits "cdhs".
Combo index for cards a > b is a * (a - 1) / 2 + b (0..1325).
"""
from __future__ import annotations

from functools import lru_cache

RANKS = "23456789TJQKA"
SUITS = "cdhs"
NUM_COMBOS = 1326


def parse_card(s: str) -> int:
    if not isinstance(s, str):
        raise ValueError(f"bad card: {s!r}")
    s = s.strip()
    if len(s) != 2 or s[0].upper() not in RANKS or s[1].lower() not in SUITS:
        raise ValueError(f"bad card: {s!r}")
    return RANKS.index(s[0].upper()) * 4 + SUITS.index(s[1].lower())


def card_str(c: int) -> str:
    return RANKS[c >> 2] + SUITS[c & 3]


def parse_cards(s: str | list) -> list[int]:
    if isinstance(s, (list, tuple)):
        out = [c if isinstance(c, int) and not isinstance(c, bool) else parse_card(c) for c in s]
        if any(not 0 <= c < 52 for c in out):
            raise ValueError(f"bad card index in {s!r}")  # the engine indexes tables with these
    elif not isinstance(s, str):
        raise ValueError(f"bad card list: {s!r}")
    else:
        compact = "".join(ch for ch in s if not ch.isspace() and ch != ",")
        if len(compact) % 2:
            raise ValueError(f"bad card list: {s!r}")
        out = [parse_card(compact[i:i + 2]) for i in range(0, len(compact), 2)]
    if len(set(out)) != len(out):
        raise ValueError(f"duplicate cards: {s!r}")
    return out


def cards_str(cards) -> str:
    return " ".join(card_str(c) for c in cards)


def rank(c: int) -> int:
    return c >> 2


def suit(c: int) -> int:
    return c & 3


def combo_index(a: int, b: int) -> int:
    if a == b:
        raise ValueError("combo needs two different cards")
    if a < b:
        a, b = b, a
    return a * (a - 1) // 2 + b


@lru_cache(maxsize=None)
def _combo_table() -> list[tuple[int, int]]:
    table = [None] * NUM_COMBOS
    for a in range(1, 52):
        for b in range(a):
            table[combo_index(a, b)] = (a, b)
    return table


def combo_cards(i: int) -> tuple[int, int]:
    """Cards of a combo, higher card index first."""
    return _combo_table()[i]


def combo_str(i: int) -> str:
    a, b = combo_cards(i)
    # Show the higher rank first ("AhKd", not "KdAh").
    if rank(b) > rank(a):
        a, b = b, a
    return card_str(a) + card_str(b)


def parse_combo(s: str) -> int:
    cards = parse_cards(s)
    if len(cards) != 2:
        raise ValueError(f"combo needs exactly two cards: {s!r}")
    return combo_index(*cards)


def hand_class(i: int) -> str:
    """'AKs', 'AKo' or 'QQ' for a combo index."""
    a, b = combo_cards(i)
    ra, rb = rank(a), rank(b)
    if ra < rb:
        ra, rb = rb, ra
    if ra == rb:
        return RANKS[ra] * 2
    return RANKS[ra] + RANKS[rb] + ("s" if suit(a) == suit(b) else "o")


@lru_cache(maxsize=None)
def all_hand_classes() -> list[str]:
    """The 169 hand classes in the usual 13x13 grid order (row-major, AA top-left)."""
    out = []
    for i in range(12, -1, -1):
        for j in range(12, -1, -1):
            if i == j:
                out.append(RANKS[i] * 2)
            elif j < i:
                out.append(RANKS[i] + RANKS[j] + "s")
            else:
                out.append(RANKS[j] + RANKS[i] + "o")
    return out


@lru_cache(maxsize=None)
def class_combos(cls: str) -> tuple[int, ...]:
    """All combo indices of a hand class ('AKs' -> 4 combos, 'AKo' -> 12, 'QQ' -> 6)."""
    r1, r2 = RANKS.index(cls[0]), RANKS.index(cls[1])
    kind = cls[2] if len(cls) > 2 else ""
    out = []
    for s1 in range(4):
        for s2 in range(4):
            a, b = r1 * 4 + s1, r2 * 4 + s2
            if a == b:
                continue
            if r1 == r2 and s2 <= s1:
                continue
            if kind == "s" and s1 != s2:
                continue
            if kind == "o" and s1 == s2:
                continue
            out.append(combo_index(a, b))
    return tuple(sorted(set(out)))


def combos_conflict(i: int, cards) -> bool:
    a, b = combo_cards(i)
    return a in cards or b in cards

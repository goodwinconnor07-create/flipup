"""Hand ranges: 1326 per-combo weights in [0, 1].

Accepted notation (comma separated, optional ":weight" suffix on any token):
    QQ, 22+, 99-66, AKs, AKo, AK, A2s+, KTo+, K9s-K6s, AhKh, AKs:0.5
"""
from __future__ import annotations

import re

import numpy as np

from .cards import (NUM_COMBOS, RANKS, all_hand_classes, class_combos, combo_cards, combos_conflict,
                    hand_class, parse_combo)

_CLASS = r"[2-9TJQKA]{2}[so]?"


def _expand_token(tok: str) -> list[str]:
    """Expand one range token into hand classes (or a single explicit combo)."""
    tok = tok.strip()
    if re.fullmatch(r"([2-9TJQKA][cdhs]){2}", tok, flags=re.I):
        return [tok]  # explicit combo
    tok = tok.upper().replace("S", "s").replace("O", "o")
    m = re.fullmatch(rf"({_CLASS})(\+)?", tok)
    if m:
        cls, plus = m.group(1), m.group(2)
        r1, r2 = RANKS.index(cls[0]), RANKS.index(cls[1])
        kind = cls[2:] if len(cls) > 2 else ""
        if r1 == r2:
            if len(cls) > 2:
                raise ValueError(f"pairs cannot be suited/offsuit: {tok}")
            return [RANKS[r] * 2 for r in range(r1, 13)] if plus else [cls]
        if r2 > r1:
            r1, r2 = r2, r1
        kinds = [kind] if kind else ["s", "o"]
        tops = range(r2, r1) if plus else [r2]
        return [RANKS[r1] + RANKS[k] + kd for k in tops for kd in kinds]
    m = re.fullmatch(rf"({_CLASS})-({_CLASS})", tok)
    if m:
        a, b = m.group(1), m.group(2)
        ra1, ra2, rb1, rb2 = (RANKS.index(x) for x in (a[0], a[1], b[0], b[1]))
        if ra1 == ra2 and rb1 == rb2:
            lo, hi = sorted((ra1, rb1))
            return [RANKS[r] * 2 for r in range(lo, hi + 1)]
        if ra1 != rb1 or a[2:] != b[2:]:
            raise ValueError(f"bad range span: {tok}")
        kinds = [a[2:]] if a[2:] else ["s", "o"]
        lo, hi = sorted((ra2, rb2))
        return [RANKS[ra1] + RANKS[k] + kd for k in range(lo, hi + 1) for kd in kinds]
    raise ValueError(f"cannot parse range token: {tok!r}")


class Range:
    """A weighted set of two-card combos."""

    def __init__(self, weights=None):
        self.w = np.zeros(NUM_COMBOS, dtype=np.float32) if weights is None else np.asarray(weights, np.float32).copy()
        if self.w.shape != (NUM_COMBOS,):
            raise ValueError("range needs 1326 weights")
        if not np.all((self.w >= 0) & (self.w <= 1)):  # also rejects nan
            raise ValueError("range weights must be between 0 and 1")

    # -- construction ------------------------------------------------------
    @classmethod
    def parse(cls, text: str) -> "Range":
        r = cls()
        for raw in re.split(r"[,\s]+", text.strip()):
            if not raw:
                continue
            weight = 1.0
            if ":" in raw:
                raw, ws = raw.split(":", 1)
                weight = float(ws)
                if not 0.0 <= weight <= 1.0:  # also rejects nan
                    raise ValueError(f"range weight must be between 0 and 1: {raw!r}")
            for item in _expand_token(raw):
                if len(item) == 4 and item[1].lower() in "cdhs":
                    r.w[parse_combo(item)] = weight
                else:
                    for c in class_combos(item):
                        r.w[c] = weight
        return r

    @classmethod
    def from_classes(cls, freqs: dict) -> "Range":
        """{'AKs': 1.0, 'A5s': 0.5, ...} -> Range."""
        r = cls()
        for k, v in freqs.items():
            for c in class_combos(k):
                r.w[c] = v
        return r

    @classmethod
    def full(cls) -> "Range":
        return cls(np.ones(NUM_COMBOS, dtype=np.float32))

    def copy(self) -> "Range":
        return Range(self.w)

    # -- queries -------------------------------------------------------------
    def combos(self, dead=()) -> float:
        """Weighted number of combos, excluding combos that use dead cards."""
        if not dead:
            return float(self.w.sum())
        return float(sum(self.w[i] for i in np.nonzero(self.w)[0] if not combos_conflict(int(i), dead)))

    def fraction(self) -> float:
        """Share of all 1326 starting hands (e.g. 0.42 for a 42% BTN open)."""
        return float(self.w.sum()) / NUM_COMBOS

    def class_weights(self) -> dict:
        """Average weight per hand class."""
        out = {}
        for cls in all_hand_classes():
            cs = class_combos(cls)
            out[cls] = float(np.mean(self.w[list(cs)]))
        return out

    def without(self, dead) -> "Range":
        r = self.copy()
        for i in np.nonzero(r.w)[0]:
            if combos_conflict(int(i), dead):
                r.w[i] = 0
        return r

    def to_string(self, precision: int = 3) -> str:
        """Compact class-level string (falls back to explicit combos for partial classes)."""
        parts = []
        for cls in all_hand_classes():
            cs = list(class_combos(cls))
            ws = self.w[cs]
            if np.all(ws == 0):
                continue
            if np.allclose(ws, ws[0]):
                v = round(float(ws[0]), precision)
                parts.append(cls if v == 1 else f"{cls}:{v}")
            else:
                for c, v in zip(cs, ws):
                    if v > 0:
                        from .cards import combo_str
                        v = round(float(v), precision)
                        parts.append(combo_str(c) if v == 1 else f"{combo_str(c)}:{v}")
        return ",".join(parts)

    def __add__(self, other: "Range") -> "Range":
        return Range(np.clip(self.w + other.w, 0, 1))

    def __mul__(self, other) -> "Range":
        if isinstance(other, Range):
            return Range(self.w * other.w)
        return Range(np.clip(self.w * float(other), 0, 1))

    def __repr__(self) -> str:
        return f"Range({self.combos():.1f} combos, {100 * self.fraction():.1f}%)"


def describe_combo_class(combo: int) -> str:
    return hand_class(combo)


__all__ = ["Range", "combo_cards", "hand_class"]

"""Pre-solved flops (scripts/flop_library.py) for instant Custom hand answers.

Files live in <root>/<spot>/<flop>.npz, one per suit-isomorphic flop. A real flop maps to its stored
class by relabelling suits; hands are translated the same way. Each file holds the flop-street
decisions up to a few actions deep: the actor, the options, and every combo's frequencies and EVs.
When the flop's betting ends inside the stored decisions, both players' ranges are rebuilt from
the stored strategies, so the turn can be solved without re-solving the flop.
"""
from __future__ import annotations

import itertools
import json
import os
import threading
from collections import OrderedDict

import numpy as np

from .cards import NUM_COMBOS, card_str, combo_cards, combo_index

_PERMS = list(itertools.permutations(range(4)))

F = "fold"
# name: (preflop line in the 6-max 100bb solution, IP seat, OOP seat, preflop aggressor seat or None).
# Seats: 0 UTG, 1 HJ, 2 CO, 3 BTN, 4 SB, 5 BB. scripts/flop_library.py solves these.
SPOTS = {
    "btn_bb": ([F, F, F, "raise", F, "call"], 3, 5, 3),
    "co_bb": ([F, F, "raise", F, F, "call"], 2, 5, 2),
    "utg_bb": (["raise", F, F, F, F, "call"], 0, 5, 0),
    "sb_bb": ([F, F, F, F, "raise", "call"], 5, 4, 4),
    "sb_limp": ([F, F, F, F, "call", "check"], 5, 4, None),
    "bb_btn_3bet": ([F, F, F, "raise", F, "raise", "call"], 3, 5, 5),
}


def canonical(board3) -> tuple[str, tuple[int, ...]]:
    """(stored flop name, suit map real -> stored) for three flop cards."""
    best = None
    for p in _PERMS:
        key = tuple(sorted(((c // 4) * 4 + p[c % 4]) for c in board3))
        if best is None or key < best[0]:
            best = (key, p)
    key, perm = best
    return "".join(card_str(c) for c in sorted(key, reverse=True)), perm


def map_combo(combo: int, perm) -> int:
    a, b = combo_cards(combo)
    return combo_index((a // 4) * 4 + perm[a % 4], (b // 4) * 4 + perm[b % 4])


class Entry:
    """One stored (spot, flop) solution, seen through the real board's suits."""

    def __init__(self, data, perm):
        self.meta = json.loads(str(data["meta"]))
        self.data = data
        self.perm = perm
        self.combos = [np.asarray(data["combos0"], dtype=np.int64), np.asarray(data["combos1"], dtype=np.int64)]
        self.index = [{int(c): i for i, c in enumerate(cs)} for cs in self.combos]
        # Real combo id -> stored index, per player (-1 when blocked by the board).
        self.real_to_idx = []
        for p in (0, 1):
            m = np.full(NUM_COMBOS, -1, dtype=np.int64)
            for real in range(NUM_COMBOS):
                m[real] = self.index[p].get(map_combo(real, perm), -1)
            self.real_to_idx.append(m)

    def node(self, tokens):
        key = ".".join(map(str, tokens))
        info = self.meta["nodes"].get(key)
        if info is None:
            return None
        return {**info, "strategy": self.data[f"s:{key}"].astype(np.float32),
                "ev": self.data[f"e:{key}"].astype(np.float32), "reach": self.data[f"r:{key}"].astype(np.float32)}

    def combo_row(self, player: int, real_combo: int) -> int:
        return int(self.real_to_idx[player][real_combo])

    def ranges_after(self, tokens, init):
        """Both players' 1326-vectors (real suits) after the flop line `tokens`, from the starting
        ranges `init` = {0: oop, 1: ip} times each player's stored strategy along the line."""
        out = {p: np.asarray(init[p], dtype=np.float64).copy() for p in (0, 1)}
        for k in range(len(tokens)):
            n = self.node(tokens[:k])
            if n is None:
                return None
            p = n["player"]
            prob = n["strategy"][tokens[k]]
            idx = self.real_to_idx[p]
            factor = np.where(idx >= 0, prob[np.maximum(idx, 0)], 0.0)
            out[p] *= factor
        return {p: out[p].astype(np.float32) for p in (0, 1)}


class FlopLibrary:
    def __init__(self, root: str, keep: int = 64):
        self.root = root
        self.keep = keep
        self.cache: OrderedDict = OrderedDict()
        self.lock = threading.Lock()

    def available(self, spot: str) -> bool:
        return os.path.isdir(os.path.join(self.root, spot))

    def get(self, spot: str, board3) -> Entry | None:
        name, perm = canonical(board3)
        path = os.path.join(self.root, spot, f"{name}.npz")
        key = (spot, name, perm)
        with self.lock:
            if key in self.cache:
                self.cache.move_to_end(key)
                return self.cache[key]
        if not os.path.exists(path):
            return None
        entry = Entry(np.load(path), perm)
        with self.lock:
            self.cache[key] = entry
            while len(self.cache) > self.keep:
                self.cache.popitem(last=False)
        return entry

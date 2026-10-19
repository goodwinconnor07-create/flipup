"""Preflop solver wrapper: N-player (2-9) charts with EVs.

>>> from flipup_gto.preflop import PreflopSpot
>>> spot = PreflopSpot(num_players=6, stack=100)
>>> spot.solve()
>>> spot.node([]).chart()            # UTG's opening strategy per hand class
>>> spot.node(["fold", "raise"])     # HJ facing... (labels or indices)
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field

import numpy as np

from . import _engine
from .cards import all_hand_classes, hand_class

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
CLASSES = all_hand_classes()
CLASS_INDEX = {c: i for i, c in enumerate(CLASSES)}
CLASS_COMBOS = np.array([6 if len(c) == 2 else (4 if c[2] == "s" else 12) for c in CLASSES], dtype=np.float64)

_tables: dict = {}


TENSOR_RANK = 4


def tables(with_tensor: bool = True):
    """(equity 169x169, pairs 169x169, (A, B) low-rank 3-way factors or None), cached on disk.

    The 3-way equity tensor T[h][o1][o2] is stored as T[h] ~= sum_r A[h,r,:] (x) B[h,r,:].
    Rank 4 keeps the error at the level of the tensor's own Monte Carlo noise.
    """
    if "matrix" not in _tables:
        path = os.path.join(DATA_DIR, "preflop_matrix.npz")
        if not os.path.exists(path):
            eq, pairs = _engine.preflop_class_matrix(100000, 7)
            os.makedirs(DATA_DIR, exist_ok=True)
            np.savez_compressed(path, equity=eq, pairs=pairs)
        d = np.load(path)
        _tables["matrix"] = (d["equity"].astype(np.float32), d["pairs"].astype(np.float32))
    eq, pairs = _tables["matrix"]
    tensor = None
    if with_tensor:
        if "tensor" not in _tables:
            path = os.path.join(DATA_DIR, "preflop_tensor3.npz")
            if not os.path.exists(path):
                t = _engine.preflop_class_tensor3(400, 11)
                np.savez_compressed(path, tensor=t.astype(np.float16))
            T = np.load(path)["tensor"].astype(np.float32)
            U, S, Vt = np.linalg.svd(T, full_matrices=False)
            A = np.ascontiguousarray(np.transpose(U[:, :, :TENSOR_RANK] * S[:, None, :TENSOR_RANK], (0, 2, 1)))
            B = np.ascontiguousarray(Vt[:, :TENSOR_RANK, :])
            _tables["tensor"] = (A.astype(np.float32), B.astype(np.float32))
        tensor = _tables["tensor"]
    return eq, pairs, tensor


def load_calibration():
    """Per-class equity-realization multipliers fitted from postflop solves (scripts/calibrate_eqr.py)."""
    import json
    path = os.path.join(DATA_DIR, "eqr_calibration.json")
    if "calibration" not in _tables:
        _tables["calibration"] = json.load(open(path)) if os.path.exists(path) else None
    return _tables["calibration"]


def default_open_sizes(names: list[str], stack: float) -> list[float]:
    """Common solver open sizes (raise-to, bb): 2.0-2.5bb, SB 3bb; smaller when shallow."""
    out = []
    for n in names:
        if n == "BB":
            out.append(3.5)
        elif n == "SB":
            out.append(3.0 if stack > 40 else 2.5)
        elif n == "BTN":
            out.append(2.5 if stack > 40 else 2.0)
        else:
            out.append(2.3 if stack > 40 else 2.0)
    return out


@dataclass
class PreflopSpot:
    num_players: int = 6
    stack: float | list = 100.0          # bb, one value for everyone or a list per player
    sb: float = 0.5
    bb: float = 1.0
    ante: float = 0.0
    rake_rate: float = 0.0
    rake_cap: float = 0.0
    open_size: list | None = None
    sb_can_limp: bool = True
    max_players_flop: int = 3
    options: dict = field(default_factory=dict)  # any other PreflopConfig field
    use_calibration: bool = True                 # load data/eqr_calibration.json if present

    def __post_init__(self):
        n = self.num_players
        self.names = list(_engine.position_names(n))
        stacks = self.stack if isinstance(self.stack, (list, tuple)) else [float(self.stack)] * n
        eff = min(stacks)
        eq, pairs, tensor = tables(with_tensor=self.max_players_flop >= 3)
        cfg = _engine.PreflopConfig()
        cfg.num_players = n
        cfg.stacks = [float(s) for s in stacks]
        cfg.sb, cfg.bb, cfg.ante = self.sb, self.bb, self.ante
        cfg.rake_rate, cfg.rake_cap = self.rake_rate, self.rake_cap
        cfg.open_size = self.open_size or default_open_sizes(self.names, eff)
        limp = [0] * n
        if self.sb_can_limp and n >= 2:
            limp[0 if n == 2 else n - 2] = 1
        cfg.can_limp = limp
        cfg.max_players_flop = self.max_players_flop
        if eff <= 30:
            cfg.allin_threshold = 0.35
        cal = load_calibration() if self.use_calibration else None
        if cal:
            cfg.eqr_ip = [cfg.eqr_ip[0], cfg.eqr_ip[1], cfg.eqr_ip[2], cal["base_ip"]]
            cfg.eqr_oop = [cfg.eqr_oop[0], cfg.eqr_oop[1], cfg.eqr_oop[2], cal["base_oop"]]
            cfg.class_eqr_ip = [float(cal["ip"][c]) for c in CLASSES]
            cfg.class_eqr_oop = [float(cal["oop"][c]) for c in CLASSES]
        for k, v in self.options.items():
            setattr(cfg, k, v)
        if tensor is None:
            cfg.set_tables(eq, pairs)
        else:
            cfg.set_tables(eq, pairs, tensor[0], tensor[1])
        self.config = cfg
        self.engine = _engine.PreflopSolver(cfg)

    def solve(self, max_iterations: int = 600, target_bb: float = 0.005, check_every: int = 50, callback=None):
        return self.engine.solve(max_iterations, target_bb, check_every, callback)

    def resolve(self, path) -> list[int]:
        idx: list[int] = []
        for step in path:
            info = self.engine.query(idx)
            if info["terminal"]:
                raise ValueError("path continues past the end of the preflop action")
            if isinstance(step, int):
                idx.append(step)
                continue
            s = str(step).lower().strip()
            kind = s.split()[0]
            kind = {"limp": "call", "complete": "call", "jam": "allin", "shove": "allin", "open": "raise",
                    "3bet": "raise", "4bet": "raise", "bet": "raise"}.get(kind, kind)
            cands = [i for i, a in enumerate(info["actions"]) if a["type"] == kind]
            if not cands and kind == "raise":
                cands = [i for i, a in enumerate(info["actions"]) if a["type"] == "allin"]
            if not cands:
                raise ValueError(f"{step!r} not available: {[a['type'] for a in info['actions']]}")
            parts = s.split()
            if len(parts) > 1 and len(cands) > 1:
                target = float(parts[1].rstrip("bb"))
                cands.sort(key=lambda i: abs(info["actions"][i]["to"] - target))
            idx.append(cands[0])
        return idx

    def node(self, path=()) -> "PreflopNode":
        idx = self.resolve(path)
        return PreflopNode(self, idx, self.engine.query(idx))


def _action_label(a: dict) -> str:
    if a["type"] in ("fold", "check", "call"):
        return a["type"]
    if a["type"] == "allin":
        return f"all-in {a['to']:.1f}"
    return f"raise {a['to']:.1f}"


class PreflopNode:
    def __init__(self, spot: PreflopSpot, path: list[int], info: dict):
        self.spot = spot
        self.path = path
        self.info = info
        self.terminal = info["terminal"]
        self.player = info["player"]
        self.position = spot.names[self.player] if self.player >= 0 else None
        self.actions = info["actions"]
        self.labels = [_action_label(a) for a in self.actions]

    def range_strategy(self) -> dict:
        """Action frequencies over the actor's whole range (combo weighted)."""
        r = self.info["reach"][self.player] * CLASS_COMBOS
        tot = r.sum()
        return {lab: float((self.info["strategy"][i] * r).sum() / tot) for i, lab in enumerate(self.labels)}

    def chart(self) -> dict:
        """{class: {action: freq}} for hands that reach this node."""
        out = {}
        reach = self.info["reach"][self.player]
        for c, cls in enumerate(CLASSES):
            if reach[c] <= 1e-6:
                continue
            out[cls] = {lab: float(self.info["strategy"][i][c]) for i, lab in enumerate(self.labels)}
        return out

    def hand(self, cls_or_combo) -> dict:
        cls = cls_or_combo if cls_or_combo in CLASS_INDEX else hand_class(int(cls_or_combo))
        c = CLASS_INDEX[cls]
        return {
            "class": cls,
            "reach": float(self.info["reach"][self.player][c]),
            "strategy": {lab: float(self.info["strategy"][i][c]) for i, lab in enumerate(self.labels)},
            "ev": {lab: float(self.info["action_ev"][i][c]) for i, lab in enumerate(self.labels)},
        }

    def range_string(self, action: str | int, threshold: float = 0.0) -> str:
        """Range taking an action, in standard notation with weights."""
        i = action if isinstance(action, int) else self.labels.index(action) if action in self.labels else \
            next(k for k, lab in enumerate(self.labels) if lab.startswith(action))
        parts = []
        reach = self.info["reach"][self.player]
        for c, cls in enumerate(CLASSES):
            f = float(self.info["strategy"][i][c] * reach[c])
            if f > threshold:
                parts.append(cls if f > 0.995 else f"{cls}:{f:.2f}")
        return ",".join(parts)

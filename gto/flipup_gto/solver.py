"""High-level wrapper around the C++ postflop solver.

Example
-------
>>> from flipup_gto.solver import PostflopSolver, BetSizing
>>> s = PostflopSolver(board="Ks 9d 5c", pot=5.5, stack=97.5,
...                    oop_range="22+,A2s+,...", ip_range="...",
...                    sizing=BetSizing.standard())
>>> s.solve(max_iterations=300, target_pct=0.3)
>>> s.node([]).range_strategy()          # OOP's root strategy
>>> s.node(["check", "bet 33%"]).hand("AhKd")
"""
from __future__ import annotations

import os
import re
from dataclasses import dataclass, field

import numpy as np

from . import _engine
from .cards import NUM_COMBOS, card_str, combo_str, hand_class, parse_cards, parse_combo
from .ranges import Range

STREETS = ("flop", "turn", "river")
_KIND = {"pct": 0, "x": 1, "allin": 2, "geo": 3}


def parse_sizes(spec: str | list | None) -> list:
    """'33%, 75%, 2.5x, a, e, 2e' -> list of engine BetSize."""
    if spec is None:
        return []
    items = spec if isinstance(spec, (list, tuple)) else [t for t in re.split(r"[,\s]+", spec.strip()) if t]
    out = []
    for it in items:
        it = str(it).strip().lower()
        if it in ("a", "allin", "all-in", "ai"):
            out.append(_engine.BetSize(_KIND["allin"], 0.0))
        elif it.endswith("%"):
            out.append(_engine.BetSize(_KIND["pct"], float(it[:-1]) / 100.0))
        elif it.endswith("x"):
            out.append(_engine.BetSize(_KIND["x"], float(it[:-1])))
        elif it.endswith("e"):
            out.append(_engine.BetSize(_KIND["geo"], float(it[:-1]) if it[:-1] else 0.0))
        else:
            raise ValueError(f"bad bet size {it!r} (use '33%', '2.5x', 'a', 'e')")
    return out


@dataclass
class StreetSizing:
    bet: str = "33%, 75%"
    raise_: str = "60%"
    donk: str = ""


@dataclass
class BetSizing:
    """Bet-size abstraction per player ('oop'/'ip') and street."""

    oop: dict = field(default_factory=dict)
    ip: dict = field(default_factory=dict)
    max_raises: int = 3
    add_allin_threshold: float = 1.5
    force_allin_threshold: float = 0.15
    merge_threshold: float = 0.1

    def get(self, player: int, street: int) -> StreetSizing:
        d = self.oop if player == 0 else self.ip
        return d.get(STREETS[street], StreetSizing())

    def with_extra(self, player: int, street: int, kind: str, size: str) -> "BetSizing":
        """Copy with an extra size (used to insert the exact size a player actually chose)."""
        import copy
        new = copy.deepcopy(self)
        d = new.oop if player == 0 else new.ip
        cur = d.get(STREETS[street], StreetSizing())
        cur = StreetSizing(cur.bet, cur.raise_, cur.donk)
        attr = {"bet": "bet", "raise": "raise_", "donk": "donk"}[kind]
        existing = getattr(cur, attr)
        setattr(cur, attr, f"{existing}, {size}" if existing else size)
        d[STREETS[street]] = cur
        return new

    @classmethod
    def standard(cls) -> "BetSizing":
        """Reasonable default tree, similar in spirit to common solver presets.

        Flop: 33% / 75% bets, 3x-ish raise. Turn: 50% / 100%. River: 33% / 75% / 125%.
        OOP has no donk bets into the previous street's aggressor.
        """
        flop = StreetSizing(bet="33%, 75%", raise_="60%")
        turn = StreetSizing(bet="50%, 100%", raise_="60%")
        river = StreetSizing(bet="33%, 75%, 125%", raise_="60%")
        sizes = {"flop": flop, "turn": turn, "river": river}
        return cls(oop=dict(sizes), ip=dict(sizes), max_raises=2)

    @classmethod
    def review(cls, street: int, lean: int = 0, oop_leads: bool = True) -> "BetSizing":
        """Trees for re-solving one street of a real hand (the actual sizes get added on top).

        The street being reviewed gets GTO Wizard-style sizes (33% / 75% / 125% pot, a raise, and
        all-in); later streets are simplified because they are re-solved exactly when the hand gets
        there. `oop_leads=False` drops the out-of-position player's lead sizes when leading would be
        a donk bet into the previous aggressor (a donk actually made in the hand is still added).
        `lean` 1/2 shrinks the tree further when memory is tight.
        """
        rich = "33%, 75%, 125%"
        if street == 0:
            flop = (StreetSizing(rich, "60%") if lean == 0 else StreetSizing("33%, 75%", "60%") if lean == 1
                    else StreetSizing("50%", ""))
            # River betting is checked down inside flop solves (re-solved exactly when the hand gets
            # there): about half the time, with the flop strategy close to the full tree.
            # Two raises so a bet can re-raise a check-raise (one made c-betting look much worse).
            sizes = {"flop": flop, "turn": StreetSizing("75%", ""), "river": StreetSizing("", "")}
            out = cls(oop=dict(sizes), ip=dict(sizes), max_raises=2 if lean == 0 else 1)
        elif street == 1:
            turn = StreetSizing(rich, "60%") if lean == 0 else StreetSizing("66%", "a")
            sizes = {"flop": StreetSizing(), "turn": turn, "river": StreetSizing("75%", "60%")}
            out = cls(oop=dict(sizes), ip=dict(sizes), max_raises=2 if lean == 0 else 1)
        else:
            river = StreetSizing(rich, "60%") if lean == 0 else StreetSizing("66%", "a")
            sizes = {"flop": StreetSizing(), "turn": StreetSizing(), "river": river}
            out = cls(oop=dict(sizes), ip=dict(sizes), max_raises=2)
        if not oop_leads:
            name = STREETS[street]
            cur = out.oop[name]
            out.oop = {**out.oop, name: StreetSizing("", cur.raise_)}
        return out

    @classmethod
    def light(cls) -> "BetSizing":
        """Small tree for fast flop solves (one size per street)."""
        sizes = {"flop": StreetSizing("50%", "60%"), "turn": StreetSizing("75%", "60%"),
                 "river": StreetSizing("75%", "60%")}
        return cls(oop=dict(sizes), ip=dict(sizes), max_raises=1)


def _to_weights(r) -> list:
    if isinstance(r, Range):
        return r.w.tolist()
    if isinstance(r, str):
        return Range.parse(r).w.tolist()
    arr = np.asarray(r, dtype=np.float32)
    if arr.shape != (NUM_COMBOS,):
        raise ValueError("range must be a Range, a range string or 1326 weights")
    return arr.tolist()


class PostflopSolver:
    def __init__(self, board, pot: float, stack: float, oop_range, ip_range,
                 sizing: BetSizing | None = None, rake_rate: float = 0.0, rake_cap: float = 0.0,
                 min_bet: float = 1.0, threads: int | None = None, compress: bool = False,
                 max_memory_mb: float = 0.0, leaf: dict | None = None):
        if threads:
            os.environ["OMP_NUM_THREADS"] = str(threads)
        self.board = parse_cards(board)
        self.pot = float(pot)
        self.stack = float(stack)
        self.sizing = sizing or BetSizing.standard()
        cfg = _engine.TreeConfig()
        cfg.board = self.board
        cfg.starting_pot = self.pot
        cfg.effective_stack = self.stack
        cfg.max_raises = self.sizing.max_raises
        cfg.add_allin_threshold = self.sizing.add_allin_threshold
        cfg.force_allin_threshold = self.sizing.force_allin_threshold
        cfg.merge_threshold = self.sizing.merge_threshold
        cfg.min_bet = min_bet
        cfg.rake_rate = rake_rate
        cfg.rake_cap = rake_cap
        cfg.compress = compress
        cfg.max_memory_mb = max_memory_mb
        if leaf is not None:
            # Depth-limited: the next street is valued by a network (flipup_gto.valuenet.load) instead of
            # dealt: the river in a turn solve, the turn in a flop solve.
            cfg.leaf_street = 2 if len(self.board) == 4 else 1
            cfg.leaf_s_edges = list(leaf.get("s_edges", ()))
            cfg.leaf_k = leaf["k"]
            cfg.leaf_w = [w.ravel().tolist() for w in leaf["w"]]
            cfg.leaf_b = [b.tolist() for b in leaf["b"]]
            cfg.leaf_alpha = list(leaf["alpha"])
        for p in range(2):
            for st in range(3):
                ss = self.sizing.get(p, st)
                es = _engine.StreetSizes()
                es.bet = parse_sizes(ss.bet)
                es.raise_ = parse_sizes(ss.raise_)
                es.donk = parse_sizes(ss.donk)
                cfg.set_sizes(p, st, es)
        cfg.set_range(0, _to_weights(oop_range))
        cfg.set_range(1, _to_weights(ip_range))
        self._cfg = cfg
        self.engine = _engine.Solver(cfg)
        self.status = None

    # -- solving -------------------------------------------------------------
    @property
    def memory_mb(self) -> float:
        return self.engine.memory_bytes / 1e6

    def solve(self, max_iterations: int = 500, target_pct: float = 0.3, check_every: int = 10,
              callback=None):
        self.status = self.engine.solve(max_iterations, target_pct, check_every, callback)
        return self.status

    def exploitability_pct(self) -> float:
        return 100.0 * self.engine.exploitability() / self.pot

    # -- navigation ----------------------------------------------------------
    def resolve_path(self, path) -> list[str]:
        """Translate human labels ('check', 'bet 75%', 'raise 12', 'Kh') to engine tokens."""
        tokens: list[str] = []
        for step in path:
            info = self.engine.query(tokens, False, False)
            if info["type"] == "chance":
                tokens.append(card_str(parse_cards(step)[0]) if not isinstance(step, int) else card_str(step))
                continue
            if info["type"] != "action":
                raise ValueError(f"path continues past a terminal node at {step!r}")
            tokens.append(str(match_action(info, step)))
        return tokens

    def node(self, path=(), with_equity: bool = True, with_ev: bool = True) -> "NodeView":
        tokens = self.resolve_path(path)
        return NodeView(self, tokens, self.engine.query(tokens, with_equity, with_ev))


def action_label(a: dict, pot: float) -> str:
    t = a["type"]
    if t in ("fold", "check", "call"):
        return t
    if a["all_in"]:
        return f"{t} all-in ({a['amount']:.2f})"
    frac = a["added"] / pot if t == "bet" else None
    if frac is not None:
        return f"bet {100 * frac:.0f}% ({a['amount']:.2f})"
    return f"raise to {a['amount']:.2f}"


def match_action(info: dict, step) -> int:
    """Find the action index matching a label / index / amount description.

    Accepted: int index, 'fold', 'check', 'call', 'allin', 'bet 75%', 'bet 7.5', 'raise 22',
    'raise 2.5x', ('bet', 7.5) tuples with chip amounts (street wager after the action).
    Sizes snap to the nearest available action of that type.
    """
    actions = info["actions"]
    if isinstance(step, int):
        return step
    if isinstance(step, tuple):
        kind, amount = step
    else:
        s = str(step).strip().lower()
        if s.isdigit():
            return int(s)
        parts = s.replace("to ", "").split()
        kind = parts[0]
        amount = parts[1] if len(parts) > 1 else None
    kind = {"b": "bet", "r": "raise", "c": "call", "x": "check", "f": "fold"}.get(kind, kind)
    if kind in ("allin", "all-in", "jam", "shove"):
        cands = [i for i, a in enumerate(actions) if a["all_in"] and a["type"] in ("bet", "raise", "call")]
        if not cands:
            raise ValueError("no all-in action here")
        return cands[-1]
    cands = [i for i, a in enumerate(actions) if a["type"] == kind]
    if not cands and kind == "bet":
        cands = [i for i, a in enumerate(actions) if a["type"] == "raise"]
    if not cands and kind == "raise":
        cands = [i for i, a in enumerate(actions) if a["type"] == "bet"]
    if not cands:
        raise ValueError(f"no {kind!r} action here (have {[a['type'] for a in actions]})")
    if amount is None or len(cands) == 1:
        return cands[0]
    pot = info["pot"]
    facing = max(info["contrib"])  # not used for exact chip amounts
    del facing
    if isinstance(amount, str) and amount.endswith("%"):
        target_added = float(amount[:-1]) / 100.0 * pot
        return min(cands, key=lambda i: abs(actions[i]["added"] - target_added))
    if isinstance(amount, str) and amount.endswith("x"):
        mult = float(amount[:-1])
        return min(cands, key=lambda i: abs(actions[i]["amount"] - mult * _opp_wager(info)))
    target = float(amount)
    return min(cands, key=lambda i: abs(actions[i]["amount"] - target))


def _opp_wager(info: dict) -> float:
    # Street wager of the player being raised = the largest current street wager is not tracked in
    # NodeInfo, so approximate with the call amount of the cheapest call action.
    for a in info["actions"]:
        if a["type"] == "call":
            return a["amount"]
    return 0.0


class NodeView:
    """Convenient accessors for one solved node."""

    def __init__(self, solver: PostflopSolver, tokens: list[str], info: dict):
        self.solver = solver
        self.tokens = tokens
        self.info = info
        self.type = info["type"]
        self.player = info["player"]
        self.pot = info["pot"]
        self.board = info["board"]
        self.actions = info["actions"]
        self.labels = [action_label(a, self.pot) for a in self.actions]

    def _index(self, p: int) -> dict:
        return {c: i for i, c in enumerate(self.info[f"combos{p}"])}

    def range_weights(self, p: int) -> np.ndarray:
        """1326-length reach weights for player p at this node."""
        w = np.zeros(NUM_COMBOS, dtype=np.float32)
        w[self.info[f"combos{p}"]] = self.info[f"reach{p}"]
        return w

    def range_strategy(self) -> dict:
        """Overall action frequencies for the actor's whole range here."""
        if self.type != "action":
            return {}
        reach = self.info[f"reach{self.player}"]
        tot = float(reach.sum())
        strat = self.info["strategy"]
        return {lab: (float((strat[i] * reach).sum()) / tot if tot > 0 else 0.0)
                for i, lab in enumerate(self.labels)}

    def hand(self, combo) -> dict:
        """Strategy, per-action EV and equity for one specific combo of the actor (or anyone)."""
        c = parse_combo(combo) if isinstance(combo, str) else int(combo)
        out = {"combo": combo_str(c), "class": hand_class(c)}
        for p in range(2):
            idx = self._index(p).get(c)
            if idx is None:
                continue
            reach = float(self.info[f"reach{p}"][idx])
            out[f"p{p}"] = {"reach": reach, "ev": float(self.info[f"ev{p}"][idx]),
                            "equity": float(self.info[f"equity{p}"][idx]) if len(self.info[f"equity{p}"]) else None}
            if self.type == "action" and p == self.player:
                out["strategy"] = {lab: float(self.info["strategy"][i][idx]) for i, lab in enumerate(self.labels)}
                out["action_ev"] = {lab: float(self.info["action_ev"][i][idx]) for i, lab in enumerate(self.labels)}
        return out

    def class_strategy(self) -> dict:
        """Strategy aggregated per hand class (reach-weighted), for 13x13 grid displays."""
        if self.type != "action":
            return {}
        p = self.player
        combos = self.info[f"combos{p}"]
        reach = self.info[f"reach{p}"]
        strat = self.info["strategy"]
        acc: dict = {}
        for i, c in enumerate(combos):
            r = float(reach[i])
            if r <= 0:
                continue
            cls = hand_class(c)
            d = acc.setdefault(cls, [0.0, np.zeros(len(self.labels))])
            d[0] += r
            d[1] += r * strat[:, i]
        return {cls: {"weight": w, **{lab: float(v / w) for lab, v in zip(self.labels, vec)}}
                for cls, (w, vec) in acc.items()}

    def _average(self, p: int, values) -> float:
        # Weight each hand by reach x compatible opponent combos (card-removal aware).
        w = self.info[f"weight{p}"]
        tot = float(w.sum())
        return float((w * values).sum()) / tot if tot > 0 else 0.0

    def range_equity(self, p: int) -> float:
        return self._average(p, self.info[f"equity{p}"])

    def range_ev(self, p: int) -> float:
        return self._average(p, self.info[f"ev{p}"])

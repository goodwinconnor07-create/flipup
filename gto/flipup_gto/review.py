"""Hand review: what GTO does at each decision, the EV each option is worth, and what a
player's choice cost them.

    from flipup_gto.review import Reviewer
    from flipup_gto.handhistory import HandHistory
    report = Reviewer().review(HandHistory.from_dict(data), hero="p1")

Method
------
Preflop decisions are compared with a solved N-player preflop game for the table size and the
nearest stack depth (cached on disk). If the hand reaches a heads-up flop on a line the preflop
solution covers, both players' ranges come from that solution and each street is re-solved with
the exact bet sizes that were used, so the actual line is always in the tree. Turn and river are
re-solved from the ranges reached at the end of the previous street (nested subgame re-solving).

Spots the solvers don't cover (multiway postflop, preflop lines GTO never takes such as open
limps) get a heuristic review: equity against estimated ranges and the price of the bet, with
softer grades and `"method": "heuristic"`.

Grades follow GTO Wizard's categories, judged by EV loss as a share of the pot so that choosing
any action that GTO mixes at equal EV is never a mistake:
    best        the top-EV action (or within the tolerance of it)
    correct     EV loss <= 0.5% of the pot, or an action GTO plays at least 3.5% of the time
                losing <= 1% of the pot
    inaccuracy  EV loss <= 2.5% of the pot
    mistake     EV loss <= 8% of the pot
    blunder     more
"""
from __future__ import annotations

import hashlib
import json
import os
from dataclasses import dataclass

import numpy as np

from . import _engine
from .cards import NUM_COMBOS, card_str, cards_str, combo_index, hand_class
from .concepts import (alpha, board_texture, hand_features, mdf, preflop_hand_description, required_equity,
                       river_bluff_share, spr)
from .handhistory import STREETS, HandHistory
from .preflop import CLASS_COMBOS, CLASS_INDEX, CLASSES, MODEL_VERSION, PreflopSpot, load_calibration, tables
from .ranges import Range
from .solver import BetSizing, PostflopSolver, StreetSizing

_NO_TREE = object()  # sentinel: the street could not be solved within the memory budget
STACK_BUCKETS = [8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 60, 75, 100, 125, 150, 200, 250]
GRADES = ["best", "correct", "inaccuracy", "mistake", "blunder"]


def grade(ev_loss: float, pot: float, freq: float, is_top_freq: bool) -> str:
    pct = 100.0 * ev_loss / pot if pot > 0 else 0.0
    tol = max(0.5, 100.0 * 0.03 / pot) if pot > 0 else 0.5  # never grade differences under ~0.03bb
    if pct <= tol and (is_top_freq or pct <= tol / 2):
        return "best"
    if pct <= tol or (freq >= 0.035 and pct <= 1.0):
        return "correct"
    if pct <= 2.5:
        return "inaccuracy"
    if pct <= 8.0:
        return "mistake"
    return "blunder"


def nearest_bucket(stack_bb: float) -> int:
    return min(STACK_BUCKETS, key=lambda b: abs(np.log(b) - np.log(max(stack_bb, 1.0))))


# ---------------------------------------------------------------------------
# Preflop solution cache
# ---------------------------------------------------------------------------

class PreflopCache:
    def __init__(self, cache_dir: str, iterations: int = 600):
        self.cache_dir = cache_dir
        self.iterations = iterations
        self.mem: dict = {}

    def get(self, num_players: int, stack: float, ante: float = 0.0, rake_rate: float = 0.0,
            rake_cap: float = 0.0) -> PreflopSpot:
        key = (num_players, round(stack, 2), round(ante, 3), round(rake_rate, 4), round(rake_cap, 2))
        if key in self.mem:
            return self.mem[key]
        spot = PreflopSpot(num_players=num_players, stack=stack, ante=ante, rake_rate=rake_rate, rake_cap=rake_cap)
        cal = load_calibration()
        h = hashlib.sha1(json.dumps([key, spot.engine.num_nodes, MODEL_VERSION,
                                     cal.get("scenario") if cal else None]).encode()).hexdigest()[:16]
        path = os.path.join(self.cache_dir, f"preflop_{num_players}p_{stack:g}bb_{h}.npz")
        if os.path.exists(path):
            d = np.load(path)
            spot.engine.load_cumulative_strategy(d["cum"].astype(np.float32), int(d["iterations"]))
        else:
            spot.solve(self.iterations, 0.002, 100)
            os.makedirs(self.cache_dir, exist_ok=True)
            np.savez_compressed(path, cum=spot.engine.cumulative_strategy().astype(np.float32),
                                iterations=spot.engine.iterations)
        self.mem[key] = spot
        return spot


# ---------------------------------------------------------------------------
# Range helpers
# ---------------------------------------------------------------------------

def class_reach_to_combos(reach169) -> np.ndarray:
    w = np.zeros(NUM_COMBOS, dtype=np.float32)
    for c in range(NUM_COMBOS):
        w[c] = reach169[CLASS_INDEX[hand_class(c)]]
    return w


_strength_order = None


def top_percent_range(pct: float) -> np.ndarray:
    """Top pct (0-100) of starting hands by all-in equity vs a random hand (combo weighted)."""
    global _strength_order
    if _strength_order is None:
        eq, pairs, _ = tables(with_tensor=False)
        pn = pairs / pairs.sum(axis=1, keepdims=True)
        vs_random = (eq * pn).sum(axis=1)
        _strength_order = np.argsort(-vs_random)
    target = pct / 100.0 * NUM_COMBOS
    w169 = np.zeros(169)
    acc = 0.0
    for c in _strength_order:
        if acc >= target:
            break
        take = min(1.0, (target - acc) / CLASS_COMBOS[c])
        w169[c] = take
        acc += take * CLASS_COMBOS[c]
    return class_reach_to_combos(w169)


def top_percent_169(pct: float) -> np.ndarray:
    """Top pct (0-100) of starting hands as 169 class weights (combo-weighted cut)."""
    global _strength_order
    if _strength_order is None:
        top_percent_range(1.0)
    target = pct / 100.0 * NUM_COMBOS
    w = np.zeros(169)
    acc = 0.0
    for c in _strength_order:
        if acc >= target:
            break
        take = min(1.0, (target - acc) / CLASS_COMBOS[c])
        w[c] = take
        acc += take * CLASS_COMBOS[c]
    return w


# Assumed ranges for preflop actions that GTO never takes (typical small-stakes tendencies).
POPULATION_RANGES = {
    "limp": (55.0, 7.0, "a typical limping range (roughly the top 55% of hands minus premiums, which get raised)"),
    "cold_call": (25.0, 5.0, "a typical flatting range (roughly the top 25% of hands minus the strongest)"),
    "iso_raise": (20.0, 0.0, "a typical raising range over limpers (roughly the top 20% of hands)"),
    "three_bet": (7.0, 0.0, "a typical 3-bet range (roughly the top 7% of hands)"),
    "four_bet": (3.0, 0.0, "a typical 4-bet range (roughly the top 3% of hands)"),
}


def population_range(kind: str) -> np.ndarray:
    top, minus, _ = POPULATION_RANGES[kind]
    return np.clip(top_percent_169(top) - top_percent_169(minus), 0.0, 1.0)


def preflop_equity_vs(cls_idx: int, opp_reach169) -> float:
    eq, pairs, _ = tables(with_tensor=False)
    w = pairs[cls_idx] * opp_reach169
    tot = w.sum()
    return float((eq[cls_idx] * w).sum() / tot) if tot > 0 else 0.5


# ---------------------------------------------------------------------------
# Reviewer
# ---------------------------------------------------------------------------

@dataclass
class ReviewSettings:
    preflop_iterations: int = 600
    flop_iterations: int = 300
    turn_iterations: int = 300
    river_iterations: int = 500
    target_pct: float = 0.5
    flop_target_pct: float = 1.0
    max_memory_mb: float = 3000.0
    rake_rate: float = 0.0
    rake_cap: float = 0.0


class Reviewer:
    def __init__(self, settings: ReviewSettings | None = None, cache_dir: str | None = None):
        self.settings = settings or ReviewSettings()
        cache_dir = cache_dir or os.path.join(os.path.dirname(__file__), "data", "cache")
        self.preflop = PreflopCache(cache_dir, self.settings.preflop_iterations)
        self.custom_cache: dict = {}

    # -- public ---------------------------------------------------------------
    def review(self, hh: HandHistory, hero: str | None = None) -> dict:
        """Review every decision by players whose cards are known (or only `hero`'s)."""
        ctx = _HandContext(hh, self, hero)
        ctx.run()
        return ctx.report()


class _HandContext:
    def __init__(self, hh: HandHistory, reviewer: Reviewer, hero: str | None):
        self.hh = hh
        self.rv = reviewer
        self.bb = hh.big_blind
        self.order = hh.preflop_order()
        self.N = len(self.order)
        self.positions = hh.positions()
        self.index = {pid: i for i, pid in enumerate(self.order)}
        self.reviewed = {p.id for p in hh.players if p.cards and (hero is None or p.id == hero)}
        self.decisions: list = []
        self.notes: list = []
        # Chip state (in bb).
        self.stack = {p.id: p.stack / self.bb for p in hh.players}
        self.total_in = {p.id: 0.0 for p in hh.players}
        self.street_bet = {p.id: 0.0 for p in hh.players}
        self.folded: set = set()

    # -- chip bookkeeping --------------------------------------------------------
    def pot(self) -> float:
        return sum(self.total_in.values())

    def put(self, pid: str, to_bb: float):
        add = max(0.0, to_bb - self.street_bet[pid])
        add = min(add, self.stack[pid])
        self.stack[pid] -= add
        self.street_bet[pid] += add
        self.total_in[pid] += add

    def new_street(self):
        for pid in self.street_bet:
            self.street_bet[pid] = 0.0

    def cards(self, pid):
        return self.hh.player(pid).cards

    # -- main flow ---------------------------------------------------------------
    def run(self):
        hh = self.hh
        sb_id = self.order[0] if self.N == 2 else self.order[-2]
        bb_id = self.order[-1]
        for pid in self.order:
            if hh.ante:
                a = min(hh.ante / self.bb, self.stack[pid])
                self.stack[pid] -= a
                self.total_in[pid] += a
        self.put(sb_id, hh.small_blind / self.bb)
        self.put(bb_id, 1.0)

        by_street = {s: [a for a in hh.actions if a.street == s] for s in STREETS}
        preflop_path = self.review_preflop(by_street["preflop"])

        live = [pid for pid in self.order if pid not in self.folded]
        if len(live) < 2 or not hh.board or len(hh.board) < 3:
            return
        ranges = None
        if len(live) == 2 and preflop_path is not None:
            ranges = self._ranges_after_preflop(live, preflop_path)
        elif len(live) == 2:
            ranges = self._ranges_after_custom_line(live, by_street["preflop"])
        if ranges is not None:
            self.review_postflop_solved(live, ranges, by_street)
        else:
            reason = "multiway pot" if len(live) > 2 else "preflop line outside the GTO tree"
            self.notes.append(f"Postflop reviewed heuristically ({reason}).")
            self.review_postflop_heuristic(live, by_street)

    # -- preflop --------------------------------------------------------------------
    def review_preflop(self, actions) -> list | None:
        hh = self.hh
        stacks_bb = [self.stack[pid] + self.total_in[pid] for pid in self.order]
        hero_ids = [pid for pid in self.order if pid in self.reviewed]
        if hero_ids:
            h = hero_ids[0]
            others = [s for pid, s in zip(self.order, stacks_bb) if pid != h]
            eff = min(stacks_bb[self.index[h]], max(others))
        else:
            eff = float(np.median(stacks_bb))
        bucket = nearest_bucket(eff)
        self.preflop_stack = bucket
        spot = self.rv.preflop.get(self.N, bucket, hh.ante / self.bb, self.rv.settings.rake_rate,
                                   self.rv.settings.rake_cap)
        self.preflop_spot = spot
        if abs(bucket - eff) / eff > 0.15:
            self.notes.append(f"Preflop compared with a {bucket}bb solution (effective stack {eff:.0f}bb).")

        path: list | None = []
        self.offtree = None  # (action index, reach of all players where the line left the tree)
        for k, a in enumerate(actions):
            pid = a.player
            to_bb = a.to / self.bb
            pot_before = self.pot()
            to_call = max(self.street_bet.values()) - self.street_bet[pid]
            info = None
            if path is not None:
                info = spot.engine.query(path)
                if info["terminal"] or self.order[info["player"]] != pid:
                    self.notes.append("Preflop action left the solved tree (unexpected order).")
                    self.offtree = (k, None)
                    path = None
                    info = None
            if info is not None:
                idx, size_note = self._match_preflop_action(info, a, to_bb)
                if idx is None:
                    self.offtree = (k, np.array(info["reach"]))
                    if pid in self.reviewed:
                        self.decisions.append(self._custom_preflop_decision(actions, k, pot_before, to_call))
                    self.notes.append(f"{self.positions[pid]} {_move_words(a, to_bb)} isn't part of the GTO "
                                      "preflop strategy, so later decisions use custom solves with assumed ranges.")
                    path = None
                else:
                    if pid in self.reviewed:
                        self.decisions.append(self._preflop_decision(spot, path, info, pid, a, idx, size_note,
                                                                     pot_before, to_call))
                    path = path + [idx]
            elif pid in self.reviewed:
                self.decisions.append(self._custom_preflop_decision(actions, k, pot_before, to_call))
            if a.move == "fold":
                self.folded.add(pid)
            elif a.move in ("call", "bet", "raise", "allin"):
                self.put(pid, to_bb)
        self.new_street()
        return path

    @staticmethod
    def _match_preflop_action_static(info, a):
        """Fold/check/call matching without chip state (used for blinds' passive actions)."""
        types = [x["type"] for x in info["actions"]]
        if a.move in types:
            return types.index(a.move), None
        return None, None

    def _match_preflop_action(self, info, a, to_bb):
        acts = info["actions"]
        types = [x["type"] for x in acts]
        move = a.move
        if move == "fold":
            return (types.index("fold") if "fold" in types else None), None
        if move == "check":
            return (types.index("check") if "check" in types else None), None
        if move == "call" or (move == "allin" and to_bb <= max(self.street_bet.values()) + 1e-9):
            return (types.index("call") if "call" in types else None), None
        raises = [i for i, x in enumerate(acts) if x["type"] in ("raise", "allin")]
        if not raises:
            return None, None
        is_allin = move == "allin" or abs(self.stack[a.player] - (to_bb - self.street_bet[a.player])) < 1e-6
        if is_allin:
            ai = [i for i in raises if acts[i]["type"] == "allin"]
            if ai:
                return ai[0], None
        best = min(raises, key=lambda i: abs(np.log(max(acts[i]["to"], 1e-6)) - np.log(max(to_bb, 1e-6))))
        note = None
        tree_to = acts[best]["to"]
        if abs(tree_to - to_bb) / max(tree_to, 1e-9) > 0.12:
            note = f"You raised to {to_bb:.1f}bb; compared with the solution's {tree_to:.1f}bb size."
        return best, note

    def _preflop_decision(self, spot, path, info, pid, a, idx, size_note, pot, to_call):
        node = spot.node(path)
        cls = hand_class(combo_index(*self.cards(pid)))
        c = CLASS_INDEX[cls]
        labels = node.labels
        strat = [float(node.info["strategy"][i][c]) for i in range(len(labels))]
        evs = [float(node.info["action_ev"][i][c]) for i in range(len(labels))]
        reach = float(node.info["reach"][node.player][c])
        in_range = reach > 1e-3
        best_i = int(np.argmax(evs))
        top_i = int(np.argmax(strat)) if in_range else best_i
        gto_actions = [{"action": labels[i], "frequency": strat[i] if in_range else None, "ev_bb": evs[i]}
                       for i in range(len(labels))]
        d = {
            "street": "preflop", "player": pid, "position": self.positions[pid],
            "hand": cards_str(self.cards(pid)), "hand_class": cls, "board": [],
            "pot_bb": round(pot, 2), "to_call_bb": round(to_call, 2),
            "action": {"move": a.move, "to_bb": round(a.to / self.bb, 2)},
            "method": "preflop_solver",
            "solution": f"{self.N}-handed, {self.preflop_stack}bb",
            "gto": gto_actions, "in_gto_range": in_range,
        }
        if idx is None:
            # The chosen action isn't in the tree (e.g. an open limp): compare with the best option.
            d.update({"matched_action": None, "ev_loss_bb": None, "grade": "mistake",
                      "best_action": labels[best_i]})
            d["explanation"] = self._explain_preflop(node, pid, cls, labels, strat, evs, None, in_range, to_call, pot,
                                                     size_note, off_tree=True)
            return d
        loss = max(0.0, evs[best_i] - evs[idx])
        g = grade(loss, pot, strat[idx] if in_range else 0.0, idx == top_i)
        d.update({"matched_action": labels[idx], "ev_loss_bb": round(loss, 3),
                  "ev_loss_pct_pot": round(100 * loss / pot, 2), "grade": g, "best_action": labels[best_i]})
        if size_note:
            d["note"] = size_note
        d["explanation"] = self._explain_preflop(node, pid, cls, labels, strat, evs, idx, in_range, to_call, pot,
                                                 size_note)
        return d

    def _explain_preflop(self, node, pid, cls, labels, strat, evs, idx, in_range, to_call, pot, size_note,
                         off_tree=False):
        pos = self.positions[pid]
        desc = preflop_hand_description(cls)
        lines = []
        rs = node.range_strategy()
        mix = ", ".join(f"{lab} {100 * f:.0f}%" for lab, f in zip(labels, strat) if f >= 0.005) if in_range else None
        if in_range:
            lines.append(f"GTO plays {desc} from the {pos} like this: {mix}.")
        else:
            lines.append(f"{desc} wouldn't normally reach this spot in a GTO strategy, so this compares the EV of "
                         "each option instead.")
        overall = ", ".join(f"{lab} {100 * f:.0f}%" for lab, f in rs.items() if f >= 0.005)
        lines.append(f"Across all hands the {pos} plays: {overall}.")
        ev_txt = ", ".join(f"{lab} {evs[i]:+.2f}bb" for i, lab in enumerate(labels))
        lines.append(f"EV of each option (from the start of the hand): {ev_txt}.")
        # Price and equity when facing a raise.
        if to_call > 1e-9 and max(self.street_bet.values()) > 1.0 + 1e-9:
            # Opponent with the most money in is the aggressor.
            aggressor = max((p for p in self.order if p != pid and p not in self.folded),
                            key=lambda p: self.street_bet[p], default=None)
            if aggressor is not None:
                opp_reach = node.info["reach"][self.index[aggressor]]
                eq = preflop_equity_vs(CLASS_INDEX[cls], opp_reach)
                need = to_call / (pot + to_call)
                lines.append(f"You need to call {to_call:.1f}bb into a {pot:.1f}bb pot, so you need {100 * need:.0f}% "
                             f"equity if the hand went to showdown. {desc} has about {100 * eq:.0f}% all-in equity "
                             f"against the {self.positions[aggressor]}'s range here (before position and "
                             "playability, which GTO also accounts for).")
        if off_tree:
            lines.append("Your action isn't one GTO uses here (for example, open-limping outside the small blind). "
                         f"The best option was {labels[int(np.argmax(evs))]}.")
        elif idx is not None:
            best_i = int(np.argmax(evs))
            if idx == best_i or evs[best_i] - evs[idx] < 0.02:
                lines.append(f"Your {labels[idx]} matches GTO.")
            else:
                lines.append(f"Your {labels[idx]} gives up {evs[best_i] - evs[idx]:.2f}bb compared with "
                             f"{labels[best_i]}.")
        if size_note:
            lines.append(size_note)
        return lines

    def _heuristic_preflop_decision(self, pid, a, pot, to_call):
        cls = hand_class(combo_index(*self.cards(pid)))
        return {"street": "preflop", "player": pid, "position": self.positions[pid],
                "hand": cards_str(self.cards(pid)), "hand_class": cls, "board": [],
                "pot_bb": round(pot, 2), "to_call_bb": round(to_call, 2),
                "action": {"move": a.move, "to_bb": round(a.to / self.bb, 2)},
                "method": "not_graded", "grade": None,
                "explanation": ["Earlier action left the solved preflop tree, so this decision isn't graded."]}

    def _custom_preflop_decision(self, actions, k, pot, to_call):
        """Grade preflop decision k with a solve that forces the real line up to it."""
        a = actions[k]
        pid = a.player
        try:
            spot, assumptions = self._custom_spot(actions, k)
        except (ValueError, RuntimeError) as e:
            d = self._heuristic_preflop_decision(pid, a, pot, to_call)
            d["explanation"] = [f"This line couldn't be rebuilt in the preflop solver ({e}), so it isn't graded."]
            return d
        path = [0] * k
        info = spot.engine.query(path)
        idx, size_note = self._match_preflop_action(info, a, a.to / self.bb)
        d = self._preflop_decision(spot, path, info, pid, a, idx, size_note, pot, to_call)
        d["method"] = "preflop_custom"
        d["solution"] += ", custom line"
        if assumptions:
            d["assumptions"] = assumptions
            d["explanation"].append("Assumes " + "; ".join(assumptions) + ".")
        return d

    def _custom_spot(self, actions, k, final: bool = False):
        """Preflop spot replaying actions[:k] exactly (forced), then free play from decision k.

        With final=True every action in `actions` is forced (k = len(actions)); used to get both
        players' ranges at the flop after a line the standard solution doesn't cover.
        """
        key = (final,) + tuple((x.player, x.move, round(x.to / self.bb, 2)) for x in actions[:k + 1])
        cache = self.rv.custom_cache
        if key in cache:
            return cache[key]
        from . import _engine
        types = {"fold": 0, "check": 1, "call": 2, "raise": 3, "bet": 3, "allin": 4}
        start_k, start_reach = self.offtree if self.offtree else (k, None)
        if start_reach is None:
            start_reach = np.ones((self.N, 169), dtype=np.float32)
        ranges = [list(map(float, start_reach[i])) for i in range(self.N)]
        assumptions = []
        forced = []
        street_bet = {pid: 0.0 for pid in self.order}
        sb_id = self.order[0] if self.N == 2 else self.order[-2]
        street_bet[sb_id] = self.hh.small_blind / self.bb
        street_bet[self.order[-1]] = 1.0
        raises = 0
        callers_in = set()
        for j, x in enumerate(actions[:k]):
            i = self.index[x.player]
            to = x.to / self.bb
            cur = max(street_bet.values())
            t = types[x.move]
            if x.move == "allin":
                t = 2 if to <= cur + 1e-9 else 4
            forced.append(_engine.PreflopForced(i, t, to))
            kind = None
            if j >= start_k and t == 2:
                kind = "limp" if raises == 0 and i < self.N - 2 else ("cold_call" if x.player not in callers_in
                                                                       and i < self.N - 2 else None)
            elif j >= start_k and t in (3, 4) and to > cur:
                kind = {0: "iso_raise", 1: "three_bet"}.get(raises, "four_bet")
            if kind:
                ranges[i] = list(np.minimum(np.array(ranges[i]), population_range(kind)))
                text = f"the {self.positions[x.player]} holds {POPULATION_RANGES[kind][2]}"
                if text not in assumptions:
                    assumptions.append(text)
            if t in (3, 4) and to > cur:
                raises += 1
            if t in (2, 3, 4):
                callers_in.add(x.player)
                street_bet[x.player] = max(street_bet[x.player], to)
        if final:
            # Blinds checking or completing behind limpers: GTO would raise its strong hands, so
            # narrow their range by how often the solver takes the action they took.
            for j in range(start_k, k):
                x = actions[j]
                i = self.index[x.player]
                if i < self.N - 2 or x.move not in ("check", "call"):
                    continue
                if x.move == "call" and any(a.move in ("raise", "bet", "allin") for a in actions[:j]):
                    continue
                spot_j, _ = self._custom_spot(actions, j)
                info_j = spot_j.engine.query([0] * j)
                if info_j["terminal"]:
                    continue
                idx, _ = self._match_preflop_action_static(info_j, x)
                if idx is not None:
                    ranges[i] = list(np.array(ranges[i]) * np.array(info_j["strategy"][idx]))
        limp = [1 if (i == (0 if self.N == 2 else self.N - 2)) else 0 for i in range(self.N)]
        if not final:
            limp[self.index[actions[k].player]] = 1
        live_now = len(callers_in) + 2
        spot = PreflopSpot(num_players=self.N, stack=self.preflop_stack, ante=self.hh.ante / self.bb,
                           rake_rate=self.rv.settings.rake_rate, rake_cap=self.rv.settings.rake_cap,
                           max_players_flop=min(self.N, max(3, live_now + 1)),
                           options={"forced": forced, "initial_range": ranges, "can_limp": limp,
                                    "multiway_blinds_only": False})
        spot.engine.solve(300, 0.005, 100)
        cache[key] = (spot, assumptions)
        return spot, assumptions

    # -- postflop (solver) -----------------------------------------------------------
    def _ranges_after_preflop(self, live, path):
        info = self.preflop_spot.engine.query(path)
        return {pid: class_reach_to_combos(info["reach"][self.index[pid]]) for pid in live}

    def _ranges_after_custom_line(self, live, actions):
        """Both players' flop ranges after an off-tree preflop line (all actions forced)."""
        try:
            spot, assumptions = self._custom_spot(actions, len(actions), final=True)
            info = spot.engine.query([0] * len(actions))
        except (ValueError, RuntimeError) as e:
            self.notes.append(f"Couldn't rebuild the preflop line for postflop ranges ({e}).")
            return None
        if not info["terminal"]:
            return None
        if assumptions:
            self.notes.append("Postflop ranges assume " + "; ".join(assumptions) + ".")
        return {pid: class_reach_to_combos(info["reach"][self.index[pid]]) for pid in live}

    def review_postflop_solved(self, live, ranges, by_street):
        rank = lambda pid: (_postflop_rank(self.index[pid], self.N))  # noqa: E731
        oop, ip = sorted(live, key=rank)
        ranges = {pid: np.array(r, dtype=np.float32) for pid, r in ranges.items()}
        for pid in live:
            if pid in self.reviewed:
                # Keep the actual hand in its range (tiny weight) so the solver has a strategy for it.
                c = combo_index(*self.cards(pid))
                ranges[pid][c] = max(ranges[pid][c], 1e-3)
        for street_i, street in enumerate(["flop", "turn", "river"]):
            board = self.hh.board_at(street)
            if len(board) < 3 + street_i:
                return
            acts = by_street[street]
            if any(self.stack[p] <= 1e-9 for p in live):
                return  # someone is all in: no decisions left
            if not acts:
                return
            ranges = self._solve_street(street_i, board, oop, ip, ranges, acts)
            if ranges is _NO_TREE:
                self.review_postflop_heuristic(live, by_street, start=street_i)
                return
            if ranges is None:
                return
            self.new_street()
            if any(p in self.folded for p in live):
                return

    def _review_sizing(self, street_i, lean, acts, oop, pot):
        """Bet-size tree for this street plus every size actually used, so the real line is in the tree."""
        sizing = BetSizing.review(street_i, lean)
        sizing.merge_threshold = 0.02
        wager = {a.player: 0.0 for a in acts}
        wager.setdefault(oop, 0.0)
        pot_run = pot
        raises = 0
        for a in acts:
            p = 0 if a.player == oop else 1
            to = a.to / self.bb
            wager.setdefault(a.player, 0.0)
            if a.move in ("bet", "raise", "allin"):
                facing = max(wager.values())
                if to <= facing + 1e-9:
                    continue  # all-in call
                if a.move == "allin" or to - wager[a.player] >= self.stack[a.player] - 1e-9:
                    size = "a"
                elif facing <= 1e-9:
                    size = f"{100 * to / pot_run:.4f}%"
                else:
                    size = f"{to / facing:.4f}x"
                # Each street is re-solved from its own root, where an OOP lead is a plain bet.
                kind = "bet" if facing <= 1e-9 else "raise"
                if kind == "raise":
                    raises += 1
                sizing = sizing.with_extra(p, street_i, kind, size)
                pot_run += to - wager[a.player]
                wager[a.player] = to
            elif a.move == "call":
                pot_run += max(wager.values()) - wager[a.player]
                wager[a.player] = max(wager.values())
        sizing.max_raises = max(sizing.max_raises, raises)
        return sizing

    def _solve_street(self, street_i, board, oop, ip, ranges, acts):
        st = self.rv.settings
        pot = self.pot()
        eff = min(self.stack[oop], self.stack[ip])
        solver = None
        for lean in (0, 1, 2):
            sizing = self._review_sizing(street_i, lean, acts, oop, pot)
            try:
                solver = PostflopSolver(board, pot, eff, ranges[oop], ranges[ip], sizing=sizing,
                                        compress=street_i == 0, max_memory_mb=st.max_memory_mb)
                if lean:
                    self.notes.append(f"{['Flop', 'Turn', 'River'][street_i]} solved with a simplified bet-size "
                                      "tree to fit in memory.")
                break
            except MemoryError:
                continue
        if solver is None:
            self.notes.append(f"{['Flop', 'Turn', 'River'][street_i]} tree too large to solve here; "
                              "the rest of the hand is reviewed heuristically.")
            return _NO_TREE
        iters = {0: st.flop_iterations, 1: st.turn_iterations, 2: st.river_iterations}[street_i]
        status = solver.solve(iters, st.flop_target_pct if street_i == 0 else st.target_pct, 25)
        path: list = []
        street = ["flop", "turn", "river"][street_i]
        for a in acts:
            pid = a.player
            node = solver.node(path)
            if node.type != "action":
                break
            p = 0 if pid == oop else 1
            if node.player != p:
                self.notes.append(f"{street}: action order mismatch; stopped reviewing this street.")
                return None
            to = a.to / self.bb
            idx = self._match_postflop_action(node, a, to, pid)
            pot_before = self.pot()
            to_call = max(self.street_bet.values()) - self.street_bet[pid]
            if pid in self.reviewed:
                self.decisions.append(self._postflop_decision(solver, node, pid, a, idx, street, board, pot_before,
                                                              to_call, status, oop, ip))
            if a.move == "fold":
                self.folded.add(pid)
            elif a.move in ("call", "bet", "raise", "allin"):
                self.put(pid, to)
            path.append(idx)
        if any(p in self.folded for p in (oop, ip)):
            return ranges
        end = solver.node(path, with_equity=False, with_ev=False)
        if end.type != "chance":
            return ranges
        return {oop: end.range_weights(0), ip: end.range_weights(1)}

    def _match_postflop_action(self, node, a, to, pid):
        acts = node.actions
        types = [x["type"] for x in acts]
        facing = max(self.street_bet.values())
        if a.move == "fold":
            return types.index("fold")
        if a.move == "check":
            return types.index("check")
        if a.move == "call" or (a.move == "allin" and to <= facing + 1e-9):
            return types.index("call")
        cands = [i for i, x in enumerate(acts) if x["type"] in ("bet", "raise")]
        if a.move == "allin" or to - self.street_bet[pid] >= self.stack[pid] - 1e-9:
            ai = [i for i in cands if acts[i]["all_in"]]
            if ai:
                return ai[-1]
        return min(cands, key=lambda i: abs(acts[i]["amount"] - to))

    def _postflop_decision(self, solver, node, pid, a, idx, street, board, pot, to_call, status, oop, ip):
        p = node.player
        combo = combo_index(*self.cards(pid))
        h = node.hand(combo)
        labels = node.labels
        strat = [h["strategy"][lab] for lab in labels]
        evs = [h["action_ev"][lab] for lab in labels]
        # Hands outside GTO's range carry a 1e-3 placeholder weight (see review_postflop_solved).
        in_range = h[f"p{p}"]["reach"] > 5e-3
        best_i = int(np.argmax(evs))
        top_i = int(np.argmax(strat)) if in_range else best_i
        loss = max(0.0, evs[best_i] - evs[idx])
        g = grade(loss, pot, strat[idx] if in_range else 0.0, idx == top_i)
        equity = h[f"p{p}"]["equity"]
        feats = hand_features(self.cards(pid), board)
        tex = board_texture(board)
        opp = 1 - p
        d = {
            "street": street, "player": pid, "position": self.positions[pid],
            "in_position": p == 1, "hand": cards_str(self.cards(pid)), "board": [card_str(c) for c in board],
            "pot_bb": round(pot, 2), "to_call_bb": round(to_call, 2),
            "effective_stack_bb": round(min(self.stack[oop], self.stack[ip]), 2),
            "action": {"move": a.move, "to_bb": round(a.to / self.bb, 2)},
            "matched_action": labels[idx], "method": "postflop_solver",
            "solver_exploitability_pct_pot": round(status.exploitability_pct, 3),
            "gto": [{"action": labels[i], "frequency": strat[i] if in_range else None, "ev_bb": round(evs[i], 3)}
                    for i in range(len(labels))],
            "in_gto_range": in_range, "best_action": labels[best_i],
            "ev_loss_bb": round(loss, 3), "ev_loss_pct_pot": round(100 * loss / pot, 2), "grade": g,
            "equity": round(equity, 4) if equity is not None else None,
            "hand_features": {"made": feats.made, "draws": feats.draws, "blockers": feats.blockers,
                              "strength": feats.strength_name},
            "board_texture": tex.tags,
            "range": {
                "your_range_equity": round(node.range_equity(p), 4),
                "opponent_range_equity": round(node.range_equity(opp), 4),
                "your_strong_share": round(_strong_share(node, p, board), 4),
                "opponent_strong_share": round(_strong_share(node, opp, board), 4),
                "range_strategy": {k: round(v, 4) for k, v in node.range_strategy().items()},
                "by_category": range_by_category(node, board),
            },
            "hand_category": hand_category(feats),
        }
        d["explanation"] = _explain_postflop(d, labels, strat, evs, idx, in_range, feats, tex, pot, to_call, street)
        return d

    # -- postflop (heuristic) -----------------------------------------------------------
    def review_postflop_heuristic(self, live, by_street, start: int = 0):
        est = {pid: self._estimated_range(pid) for pid in live}
        for street_i, street in enumerate(["flop", "turn", "river"]):
            if street_i < start:
                continue
            board = self.hh.board_at(street)
            if len(board) < 3 + street_i:
                return
            for a in by_street[street]:
                pid = a.player
                pot_before = self.pot()
                to_call = max(self.street_bet.values()) - self.street_bet[pid]
                if pid in self.reviewed:
                    self.decisions.append(self._heuristic_postflop(pid, a, board, pot_before, to_call, est, street))
                if a.move == "fold":
                    self.folded.add(pid)
                elif a.move in ("call", "bet", "raise", "allin"):
                    self.put(pid, a.to / self.bb)
            self.new_street()

    def _estimated_range(self, pid):
        """Rough range for a player in a spot the solvers don't cover, from their preflop actions."""
        pre = [a for a in self.hh.actions if a.street == "preflop"]
        mine = [a for a in pre if a.player == pid]
        pos = self.positions[pid]
        raises_before = 0
        last_kind = None
        cur = 1.0
        for a in pre:
            to = a.to / self.bb
            if a.player == pid:
                if a.move in ("raise", "bet", "allin") and to > cur:
                    last_kind = ("raise", raises_before)
                elif a.move == "call":
                    last_kind = ("limp", 0) if cur <= 1.0 + 1e-9 else ("call", raises_before)
                elif a.move == "check":
                    last_kind = ("check", 0)
            if a.move in ("raise", "bet", "allin") and to > cur:
                raises_before += 1
                cur = to
        if last_kind is None or not mine:
            return top_percent_range(100.0)
        kind, n = last_kind
        if kind == "raise":
            return top_percent_range({0: 22.0, 1: 8.0}.get(n, 4.0))
        if kind == "limp":
            if pos == "SB":
                return top_percent_range(70.0)
            return class_reach_to_combos(population_range("limp"))
        if kind == "check":
            return top_percent_range(100.0)
        # Called a raise: top ~30% minus the hands that would have re-raised.
        w = np.clip(top_percent_169({1: 30.0, 2: 12.0}.get(n, 6.0)) - top_percent_169(3.0), 0, 1)
        return class_reach_to_combos(w)

    def _heuristic_postflop(self, pid, a, board, pot, to_call, est, street):
        hero = self.cards(pid)
        combo = combo_index(*hero)
        opps = [p for p in self.order if p != pid and p not in self.folded]
        eqs = []
        for o in opps:
            w, t, l = _engine.equity_vs_range(combo, est[o].tolist(), board, 0)
            eqs.append(w + t / 2)
        # Rough multiway equity: product of heads-up equities, scaled toward a fair share.
        multi = float(np.prod(eqs)) if eqs else 1.0
        n = len(opps) + 1
        multi = max(multi, 0.0)
        feats = hand_features(hero, board)
        lines = [f"This is a {n}-way pot, which the solvers here don't cover, so this uses estimated ranges "
                 "from each player's preflop actions (e.g. limpers ~top 55% minus premiums, callers of a raise "
                 "~top 30%)."]
        lines.append(f"You have {feats.summary().lower()} ({feats.strength_name}).")
        lines.append("Estimated equity against each opponent: " +
                     ", ".join(f"{self.positions[o]} {100 * e:.0f}%" for o, e in zip(opps, eqs)) +
                     f"; roughly {100 * multi:.0f}% to win against all of them.")
        g = None
        if to_call > 1e-9:
            need = to_call / (pot + to_call)
            lines.append(f"Calling {to_call:.1f}bb into {pot:.1f}bb needs about {100 * need:.0f}% equity.")
            if a.move == "fold" and multi > need + 0.15:
                g = "mistake"
                lines.append("You had clearly enough equity to continue; folding gave up EV.")
            elif a.move == "call" and multi < need - 0.15 and not feats.draws:
                g = "mistake"
                lines.append("Your equity was well short of the price, without a draw to improve to the best hand.")
            else:
                g = "correct"
        elif a.move in ("bet", "raise", "allin") and multi < 0.2 and n >= 3:
            lines.append("Bluffing into several players rarely works: it needs every one of them to fold.")
            g = "inaccuracy"
        elif a.move == "check" and multi > 0.65:
            lines.append("With this much equity multiway, betting for value and protection is usually better.")
            g = "inaccuracy"
        else:
            g = "correct"
        return {"street": street, "player": pid, "position": self.positions[pid], "hand": cards_str(hero),
                "board": [card_str(c) for c in board], "pot_bb": round(pot, 2), "to_call_bb": round(to_call, 2),
                "action": {"move": a.move, "to_bb": round(a.to / self.bb, 2)}, "method": "heuristic",
                "grade": g, "equity": round(multi, 4), "ev_loss_bb": None,
                "hand_features": {"made": feats.made, "draws": feats.draws, "blockers": feats.blockers,
                                  "strength": feats.strength_name},
                "explanation": lines}

    # -- report ---------------------------------------------------------------------
    def report(self) -> dict:
        graded = [d for d in self.decisions if d.get("grade")]
        losses = [d["ev_loss_bb"] for d in graded if d.get("ev_loss_bb") is not None]
        counts = {g: sum(1 for d in graded if d["grade"] == g) for g in GRADES}
        worst = max((d for d in graded if d.get("ev_loss_bb") is not None), key=lambda d: d["ev_loss_bb"],
                    default=None)
        return {
            "hand_id": self.hh.id,
            "players": {pid: {"position": self.positions[pid], "name": self.hh.player(pid).name}
                        for pid in self.order},
            "board": [card_str(c) for c in self.hh.board],
            "summary": {
                "decisions": len(self.decisions),
                "graded": len(graded),
                "total_ev_loss_bb": round(sum(losses), 3),
                "grades": counts,
                "worst": None if worst is None else {
                    "street": worst["street"], "action": worst["action"], "best_action": worst.get("best_action"),
                    "ev_loss_bb": worst["ev_loss_bb"], "grade": worst["grade"]},
            },
            "decisions": self.decisions,
            "notes": self.notes,
        }


def _move_words(a, to_bb: float) -> str:
    if a.move in ("fold", "check"):
        return a.move + "s" if a.move == "check" else "folds"
    if a.move == "call":
        return "limps" if to_bb <= 1.0 + 1e-9 else f"calls {to_bb:g}bb"
    if a.move == "allin":
        return f"goes all in for {to_bb:g}bb"
    return f"raises to {to_bb:g}bb"


def _postflop_rank(i: int, n: int) -> int:
    if n == 2:
        return 0 if i == 1 else 1
    if i == n - 2:
        return 0
    if i == n - 1:
        return 1
    return 2 + i


def hand_category(feats) -> str:
    """Coarse hand categories used to describe how a range plays."""
    made = feats.made
    if feats.category >= 3 or made.startswith("Set") or made.startswith("Two pair (top") or \
            made == "Two pair":
        return "strong hands (two pair+)"
    if made.startswith("Overpair") or made.startswith("Top pair"):
        return "top pair / overpair"
    if feats.category >= 1 and not made.startswith("Pair on board") and not made.startswith("Two pair on board"):
        return "weaker pairs"
    if any(d in ("flush draw", "nut flush draw", "open-ended straight draw") for d in feats.draws):
        return "strong draws"
    if feats.draws:
        return "weak draws"
    return "no pair, no draw"


CATEGORY_ORDER = ["strong hands (two pair+)", "top pair / overpair", "weaker pairs", "strong draws", "weak draws",
                  "no pair, no draw"]


def range_by_category(node, board) -> dict:
    """{category: {"share": share of the actor's range, action: frequency, ...}} at an action node."""
    from .cards import combo_cards
    p = node.player
    combos = node.info[f"combos{p}"]
    w = node.info[f"weight{p}"]
    strat = node.info["strategy"]
    acc: dict = {}
    for i, c in enumerate(combos):
        if w[i] <= 0:
            continue
        a, b = combo_cards(c)
        if a in board or b in board:
            continue
        cat = hand_category(hand_features([a, b], board))
        v = acc.setdefault(cat, np.zeros(len(node.labels) + 1))
        v[:-1] += w[i] * strat[:, i]
        v[-1] += w[i]
    tot = sum(v[-1] for v in acc.values()) or 1.0
    return {cat: {"share": round(float(acc[cat][-1] / tot), 3),
                  **{lab: round(float(x / acc[cat][-1]), 3) for lab, x in zip(node.labels, acc[cat][:-1])}}
            for cat in CATEGORY_ORDER if cat in acc}


def _strong_share(node, p, board) -> float:
    """Share of a player's range (reach weighted) holding two pair or better."""
    combos = node.info[f"combos{p}"]
    reach = node.info[f"weight{p}"]
    tot = float(reach.sum())
    if tot <= 0 or len(board) < 3:
        return 0.0
    strong = 0.0
    from .cards import combo_cards
    for i, c in enumerate(combos):
        if reach[i] <= 0:
            continue
        a, b = combo_cards(c)
        if a in board or b in board:
            continue
        cat = _engine.evaluate([a, b] + list(board)) >> 20
        if cat >= 2:
            # Exclude "two pair" that is just a board pair plus a weak pair.
            strong += reach[i]
    return strong / tot


def _explain_postflop(d, labels, strat, evs, idx, in_range, feats, tex, pot, to_call, street):
    lines = []
    best_i = int(np.argmax(evs))
    hand_txt = feats.summary()
    lines.append(f"Board: {', '.join(tex.tags)}. You have {hand_txt.lower()} ({feats.strength_name}).")
    rng = d["range"]
    adv = rng["your_range_equity"] - rng["opponent_range_equity"]
    nut = rng["your_strong_share"] - rng["opponent_strong_share"]
    if abs(adv) >= 0.04:
        lines.append(f"{'You' if adv > 0 else 'Your opponent'} {'have' if adv > 0 else 'has'} the range advantage "
                     f"here ({100 * rng['your_range_equity']:.0f}% vs {100 * rng['opponent_range_equity']:.0f}% "
                     "equity overall).")
    if abs(nut) >= 0.04:
        lines.append(f"{'You' if nut > 0 else 'Your opponent'} {'have' if nut > 0 else 'has'} more strong hands "
                     f"(two pair or better: {100 * rng['your_strong_share']:.0f}% of your range vs "
                     f"{100 * rng['opponent_strong_share']:.0f}%), which "
                     f"{'lets you bet bigger' if nut > 0 else 'should make you more careful'}.")
    if in_range:
        mix = ", ".join(f"{lab} {100 * f:.0f}%" for lab, f in zip(labels, strat) if f >= 0.01)
        lines.append(f"GTO with this exact hand: {mix}.")
    else:
        lines.append("GTO's range wouldn't usually hold this hand here, so this compares the EV of each option.")
    rs = rng["range_strategy"]
    lines.append("With its whole range here GTO plays: " +
                 ", ".join(f"{k} {100 * v:.0f}%" for k, v in rs.items() if v >= 0.01) + ".")
    cats = rng.get("by_category", {})
    aggressive = [lab for lab in labels if lab.split()[0] in ("bet", "raise")]
    if cats and aggressive:
        verb = "bets" if aggressive[0].startswith("bet") else "raises"
        parts = []
        for cat, v in cats.items():
            f = sum(v.get(lab, 0.0) for lab in aggressive)
            parts.append(f"{cat} {100 * f:.0f}%")
        mine = d.get("hand_category")
        lines.append(f"How often GTO {verb} by hand type: " + ", ".join(parts) +
                     (f". Your hand counts as {mine}." if mine else "."))
    eq = d.get("equity")
    if to_call > 1e-9:
        bet = to_call
        pot_before_bet = pot - bet
        need = required_equity(pot_before_bet, bet, to_call)
        lines.append(f"Facing {to_call:.1f}bb into {pot_before_bet:.1f}bb: calling needs {100 * need:.0f}% equity "
                     f"(pot odds {(pot_before_bet + bet) / to_call:.1f} to 1). Your hand has {100 * eq:.0f}% "
                     "equity against the range that bets like this.")
        lines.append(f"To stop any two cards from bluffing profitably, the defender has to continue with about "
                     f"{100 * mdf(pot_before_bet, bet):.0f}% of their range (MDF), though out of position and "
                     "against strong ranges GTO often defends a bit less.")
    elif eq is not None:
        lines.append(f"Your hand has {100 * eq:.0f}% equity against your opponent's range here.")
    ev_txt = ", ".join(f"{lab} {evs[i]:+.2f}bb" for i, lab in enumerate(labels))
    lines.append(f"EV of each option for this hand (bb won from here on): {ev_txt}.")
    best = labels[best_i]
    # Why the best action is best.
    if best.startswith("bet") or best.startswith("raise"):
        frac = None
        if best.startswith("bet") and "%" in best:
            try:
                frac = float(best.split()[1].rstrip("%")) / 100
            except ValueError:
                frac = None
        if eq is not None and eq >= 0.6 or feats.is_nutted:
            lines.append("Betting is for value: you're ahead of enough of the hands that call, and worse hands "
                         "can pay you.")
        elif feats.draws:
            lines.append("Betting as a semi-bluff: you can win the pot now and still have outs ("
                         f"{', '.join(feats.draws)}) when called.")
        else:
            txt = "Betting as a bluff: your hand rarely wins at showdown, so turning it into a bet that folds out " \
                  "better hands is worth more than checking."
            if frac and street == "river":
                txt += f" At this size a balanced range bluffs about {100 * river_bluff_share(1, frac):.0f}% of the time."
            if feats.blockers:
                txt += f" Blockers help: {', '.join(feats.blockers)}."
            lines.append(txt)
    elif best == "check":
        lines.append("Checking keeps the pot controlled with a hand that has showdown value but doesn't gain much "
                     "by betting, and keeps your checking range protected." if (eq or 0) > 0.35 else
                     "Checking: this hand isn't strong enough to bet for value and isn't one of the best bluffs.")
    elif best == "call":
        lines.append("Calling: your equity beats the price, but raising wouldn't get called by enough worse hands "
                     "or fold out enough better ones.")
    elif best == "fold":
        lines.append("Folding: you don't have enough equity for the price, and your hand isn't a good bluff-raise.")
    if idx == best_i or evs[best_i] - evs[idx] <= 0.02:
        lines.append(f"You chose {labels[idx]}, which is the best option here.")
    elif in_range and strat[idx] >= 0.035 and d["grade"] in ("best", "correct"):
        lines.append(f"You chose {labels[idx]}. GTO also takes it {100 * strat[idx]:.0f}% of the time with this hand, "
                     "so it's fine.")
    else:
        lines.append(f"You chose {labels[idx]}, which costs {evs[best_i] - evs[idx]:.2f}bb "
                     f"({100 * (evs[best_i] - evs[idx]) / pot:.1f}% of the pot) compared with {best}.")
    return lines


# ---------------------------------------------------------------------------
# Session summary (the "big hand log")
# ---------------------------------------------------------------------------

def _kind(label: str | None) -> str:
    if not label:
        return "?"
    head = label.split()[0]
    return {"all-in": "raise", "bet": "bet", "raise": "raise"}.get(head, head)


LEAK_TEXT = {
    ("call", "fold"): "Calling where GTO folds",
    ("fold", "call"): "Folding where GTO continues",
    ("fold", "raise"): "Folding where GTO raises",
    ("check", "bet"): "Checking where GTO bets (missed value or bluffs)",
    ("bet", "check"): "Betting where GTO checks",
    ("call", "raise"): "Calling where GTO raises",
    ("raise", "call"): "Raising where GTO calls",
    ("raise", "fold"): "Raising where GTO folds",
    ("fold", "check"): "Folding when you could check",
    ("bet", "bet"): "Wrong bet size",
    ("raise", "raise"): "Wrong raise size",
}


def aggregate_session(reports: list, hero: str | None = None) -> dict:
    """Totals, per-street EV loss, the biggest mistakes and recurring leaks across many hands."""
    decisions = []
    for r in reports:
        for d in r.get("decisions", []):
            if hero and d["player"] != hero:
                continue
            decisions.append({**d, "hand_id": r.get("hand_id")})
    graded = [d for d in decisions if d.get("grade")]
    with_ev = [d for d in graded if d.get("ev_loss_bb") is not None]
    by_street = {}
    for s in STREETS:
        ds = [d for d in with_ev if d["street"] == s]
        by_street[s] = {"decisions": len(ds), "ev_loss_bb": round(sum(d["ev_loss_bb"] for d in ds), 3)}
    leaks: dict = {}
    for d in with_ev:
        if d["grade"] not in ("inaccuracy", "mistake", "blunder"):
            continue
        key = (_kind(d.get("matched_action")), _kind(d.get("best_action")))
        name = LEAK_TEXT.get(key, f"{key[0]} instead of {key[1]}")
        item = leaks.setdefault(name, {"leak": name, "count": 0, "ev_loss_bb": 0.0, "streets": {}})
        item["count"] += 1
        item["ev_loss_bb"] += d["ev_loss_bb"]
        item["streets"][d["street"]] = item["streets"].get(d["street"], 0) + 1
    leak_list = sorted(leaks.values(), key=lambda x: -x["ev_loss_bb"])
    for item in leak_list:
        item["ev_loss_bb"] = round(item["ev_loss_bb"], 3)
    worst = sorted(with_ev, key=lambda d: -d["ev_loss_bb"])[:10]
    n_hands = len(reports)
    total = sum(d["ev_loss_bb"] for d in with_ev)
    return {
        "hands": n_hands,
        "decisions": len(decisions),
        "graded": len(graded),
        "grades": {g: sum(1 for d in graded if d["grade"] == g) for g in GRADES},
        "total_ev_loss_bb": round(total, 3),
        "ev_loss_bb_per_100_hands": round(100 * total / n_hands, 2) if n_hands else 0.0,
        "by_street": by_street,
        "leaks": leak_list,
        "worst_decisions": [{"hand_id": d["hand_id"], "street": d["street"], "hand": d.get("hand"),
                             "board": d.get("board"), "action": d["action"], "best_action": d.get("best_action"),
                             "ev_loss_bb": d["ev_loss_bb"], "grade": d["grade"]} for d in worst],
    }

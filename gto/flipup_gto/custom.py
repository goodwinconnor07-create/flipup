"""Custom hands: step through a hand action by action and see GTO's strategy at every decision.

The app sends the hand so far (table size, stacks, your seat and cards, the option chosen at each
decision, and the board) and gets back the current state: whose turn it is, every legal option with
how often GTO takes it, and whether the next board card(s) are needed. Options come from the solved
game trees, as in GTO Wizard, so every line stays inside the solution:

- Preflop: the solved N-player preflop game (cached per table size and stack depth).
- Heads-up flop, turn and river: each street is solved when its card(s) are dealt, from the ranges
  the previous street leaves, and kept in memory while you explore the hand.
- Three or more players after the flop: the solver is heads-up only, so the options follow the
  betting rules (fold, check, call, 33% / 75% / 125% pot, a raise, all-in) without GTO numbers.

When it's your turn the percentages are for your exact hand; for anyone else they're how often their
whole range takes each action.
"""
from __future__ import annotations

import os
import threading
import time
from collections import OrderedDict

import numpy as np

from . import _engine
from .cards import combo_index, combo_str, hand_class, parse_cards
from .flop_library import SPOTS as LIBRARY_SPOTS, FlopLibrary
from .preflop import CLASS_INDEX
from .review import STACK_BUCKETS, _postflop_rank, class_reach_to_combos, nearest_bucket
from .solver import BetSizing, PostflopSolver, StreetSizing

STREETS = ["preflop", "flop", "turn", "river"]
BOARD_AT = {"flop": 3, "turn": 4, "river": 5}
TYPE_CODE = {"fold": 0, "check": 1, "call": 2, "raise": 3, "allin": 4}
SOLVE = {  # max iterations, target exploitability (% of pot)
    "flop": (150, 1.0),
    "turn": (300, 0.5),
    "river": (500, 0.3),
}


FLOP_FIRST_PASS = 15   # iterations before the first (provisional) flop answer
REFINE_CHUNK = 2       # iterations per background step: a query waits at most one step (a few seconds)
REFINE_CHECK = 10      # check convergence every this many iterations (the check costs about one iteration)
FORCED_ITERATIONS = 150  # preflop re-solve after an off-script action


class NeedsSolve(Exception):
    """The answer needs a solve that isn't cached yet (minutes for a flop)."""

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


LOW_SPR = 6.0  # flop stack-to-pot ratio below which the flop tree keeps turn and river all-ins


def explorer_sizing(street: str, oop_leads: bool, spr: float | None = None) -> BetSizing:
    """GTO Wizard-style sizes on the street being solved, simpler later streets (re-solved when reached)."""
    rich = StreetSizing("33%, 75%, 125%", "60%")
    if street == "flop":
        # River betting is checked down inside the flop solve (the river is solved properly when it's
        # dealt): this halves the solve time while keeping the flop strategy close to the full tree.
        # Two raises, so a c-bet can re-raise a check-raise: with only one, betting looked far worse
        # than in the full game (K-Q-5 rainbow: 45% c-bet vs 65%; scripts/postflop_bench.py).
        sizes = {"flop": rich, "turn": StreetSizing("75%", ""), "river": StreetSizing("", "")}
        if spr is not None and spr < LOW_SPR:
            # With shallow stacks (3-bet pots) money left unbet on the river matters: without a way to get
            # it in, small c-bets look much worse than in the full game (K-8-3 in a 3-bet pot: 29% small
            # bets vs 81%). Turn and river all-ins fix most of it (65%) for about 30% more solve time.
            sizes["turn"] = StreetSizing("75%, a", "")
            sizes["river"] = StreetSizing("a", "")
        out = BetSizing(oop=dict(sizes), ip=dict(sizes), max_raises=2)
    elif street == "turn":
        sizes = {"flop": StreetSizing(), "turn": rich, "river": StreetSizing("75%", "60%")}
        out = BetSizing(oop=dict(sizes), ip=dict(sizes), max_raises=2)
    else:
        sizes = {"flop": StreetSizing(), "turn": StreetSizing(), "river": rich}
        out = BetSizing(oop=dict(sizes), ip=dict(sizes), max_raises=2)
    if not oop_leads:
        out.oop = {**out.oop, street: StreetSizing("", rich.raise_)}
    return out


def complete_sizing(street: str) -> BetSizing:
    """Every standard option on `street` for both players: leads, 33/75/125% pot, all-in, raises."""
    full = StreetSizing("33%, 75%, 125%, a", "60%, a")
    if street == "flop":
        sizes = {"flop": full, "turn": StreetSizing("75%", ""), "river": StreetSizing("", "")}
    elif street == "turn":
        sizes = {"flop": StreetSizing(), "turn": full, "river": StreetSizing("75%", "60%")}
    else:
        sizes = {"flop": StreetSizing(), "turn": StreetSizing(), "river": full}
    return BetSizing(oop=dict(sizes), ip=dict(sizes), max_raises=3)


# Option ids on heads-up postflop streets: below FULL_ID, an action of the usual (GTO-trimmed) tree;
# from FULL_ID, an action of the street's complete tree (index + FULL_ID); from EXTRA_ID, a standard
# option the usual tree leaves out (EXTRA_ID + its place in _standard_options). Any id from FULL_ID up
# switches the whole street to the complete tree, solved with every option in it.
FULL_ID = 100
EXTRA_ID = 200


def _standard_options(pot: float, contrib, stack, player: int) -> list:
    """(type, all_in, street wager after) for every standard option at a heads-up node."""
    mine, theirs = float(contrib[player]), float(contrib[1 - player])
    allin_to = mine + float(stack[player])
    out = []
    if theirs > mine + 1e-9:
        out += [("fold", False, mine), ("call", False, min(theirs, allin_to))]
        if allin_to > theirs + 1e-9:
            raise_to = theirs + 0.6 * (pot + theirs - mine) + (theirs - mine)
            if raise_to < allin_to * 0.97:
                out.append(("raise", False, raise_to))
            out.append(("raise", True, allin_to))
    else:
        out.append(("check", False, mine))
        for f in (0.33, 0.75, 1.25):
            to = mine + f * pot
            if to < allin_to * 0.97:
                out.append(("bet", False, to))
        if float(stack[player]) > 1e-9:
            out.append(("bet", True, allin_to))
    return out


def _match(actions: list, kind: str, all_in: bool, amount: float):
    """Index of the action of this kind closest in size (any all-in matches any all-in), or None."""
    cands = [i for i, a in enumerate(actions)
             if (a["all_in"] and all_in) or (a["type"] == kind and bool(a["all_in"]) == all_in)]
    if not cands:
        return None
    return min(cands, key=lambda i: abs(float(actions[i]["amount"]) - amount))


def _bb(x: float) -> str:
    return f"{x:.1f}".rstrip("0").rstrip(".") + "bb"


def _field_equity(actor_range, opp_ranges, board) -> np.ndarray:
    """Each actor combo's rough equity against all opponents: the product of heads-up equities."""
    e = np.ones(1326, dtype=np.float64)
    for r in opp_ranges:
        if float(np.sum(r)) <= 0:
            continue
        e *= np.asarray(_engine.range_equities(list(map(float, actor_range)), list(map(float, r)), board, 4000), dtype=np.float64)
    return e


def _narrow(rng, opp_ranges, board, keep, protect=None):
    """Keep roughly the strongest `keep` share of a range (by equity against the field)."""
    w = np.asarray(rng, dtype=np.float64)
    tot = w.sum()
    if tot <= 0:
        return rng
    e = _field_equity(rng, opp_ranges, board)
    order = np.argsort(-e)
    out = np.zeros_like(w)
    acc = 0.0
    for c in order:
        if w[c] <= 0:
            continue
        if acc >= keep * tot:
            break
        out[c] = w[c]
        acc += w[c]
    if protect is not None:
        out[protect] = max(out[protect], w[protect], 1e-3)
    return out.astype(np.float32)


def _sigmoid(x):
    return 1.0 / (1.0 + np.exp(-x))


def _multiway_freqs(opts, actor_range, opp_ranges, board, pot, to_call, behind, hero_combo=None,
                    check_to_raiser=False, initiative=False):
    """Approximate multiway frequencies for each option, from equity against the field and the price.

    Follows how multiway GTO play differs from heads-up: value bets need more equity the more players
    there are, bluffs are rare, and calls follow pot odds with a realization discount.
    """
    n_opp = max(1, len(opp_ranges))
    e = _field_equity(actor_range, opp_ranges, board)
    w = np.asarray(actor_range, dtype=np.float64)
    if hero_combo is not None:
        w = w.copy()
        w[hero_combo] = max(w[hero_combo], 1e-3)
    kinds = [o["kind"] for o in opts]
    probs = np.zeros((len(opts), 1326))
    if to_call > 1e-9:
        need = to_call / (pot + to_call)
        cont = _sigmoid((0.9 * e - need) / 0.05)
        value = np.clip((e - 0.7) / 0.15, 0, 1) * 0.6
        rz = kinds.index("raise") if "raise" in kinds else (kinds.index("allin") if "allin" in kinds else None)
        for i, k in enumerate(kinds):
            if k == "fold":
                probs[i] = 1 - cont
            elif k == "call":
                probs[i] = cont * (1 - value) if rz is not None else cont
        if rz is not None:
            probs[rz] = cont * value
    else:
        # The last aggressor keeps betting a bit wider (range advantage) and bluffs a little more.
        thr = 0.5 + 0.07 * n_opp - (0.07 if initiative else 0.0)
        bet = _sigmoid((e - thr) / 0.06)
        bluff = np.where((e > 0.18) & (e < 0.38), (0.25 if initiative else 0.12) / n_opp, 0.0)
        bet = np.clip(bet + bluff, 0, 1)
        if check_to_raiser:
            # Leading into the aggressor is rare: mostly the very strongest hands, sometimes.
            bet = bet * np.clip((e - 0.6) / 0.3, 0.05, 0.5)
        sizes = [i for i, k in enumerate(kinds) if k == "bet"]
        allin = kinds.index("allin") if "allin" in kinds else None
        short = behind <= 1.5 * pot
        for i, k in enumerate(kinds):
            if k == "check":
                probs[i] = 1 - bet
        if sizes:
            strong = np.clip((e - 0.75) / 0.15, 0, 1)
            small, big = sizes[0], sizes[min(1, len(sizes) - 1)]
            probs[small] += bet * (1 - strong)
            probs[big] += bet * strong
            if short and allin is not None:
                probs[allin] += probs[big] * 0.5
                probs[big] *= 0.5
        elif allin is not None:
            probs[allin] = bet
    total = probs.sum(axis=0)
    probs = probs / np.where(total > 0, total, 1)
    mass = w.sum()
    for i, o in enumerate(opts):
        rf = float((probs[i] * w).sum() / mass) if mass > 0 else None
        o["range_freq"] = round(rf, 4) if rf is not None else None
        o["freq"] = round(float(probs[i][hero_combo]), 4) if hero_combo is not None else o["range_freq"]


class Explorer:
    def __init__(self, reviewer):
        self.rv = reviewer
        self.lock = threading.Lock()
        self.flops: OrderedDict = OrderedDict()   # big trees: keep two
        self.later: OrderedDict = OrderedDict()   # turn / river trees: keep a few
        self.forced: OrderedDict = OrderedDict()  # preflop re-solves for off-script lines
        # Pre-solved flops (scripts/flop_library.py), kept on the cache volume.
        self.library = FlopLibrary(os.path.join(os.path.dirname(__file__), "data", "cache", "flops"))
        self._library_paths = None
        # Solves someone is waiting for. Background refining pauses while any run, so it never slows them.
        self._waiting = 0
        self._latest = None  # the newest flop tree: older trees only refine once it's finished

    # -- caches ---------------------------------------------------------------
    def _preflop(self, n: int, stack: float, solve: bool):
        cache = self.rv.preflop
        if not solve and not cache.loaded(n, stack):
            if cache.ready(n, stack):
                raise NeedsSolve("Loading the preflop solution…")
            raise NeedsSolve(f"Solving preflop for {n} players at {stack:g}bb (first time only, several minutes).")
        return cache.get(n, stack)

    def _street_solver(self, key, street, build, solve: bool, message: str | None = None):
        store = self.flops if street == "flop" else self.later
        with self.lock:
            if key in store:
                store.move_to_end(key)
                return store[key]
        if not solve:
            raise NeedsSolve(message or {"flop": "Solving the flop: first numbers in about a minute.",
                                         "turn": "Solving the turn.", "river": "Solving the river."}[street])
        solver = build()
        solver._lock = threading.Lock()
        its, target = SOLVE[street]
        if street == "flop":
            # A quick first pass gives provisional numbers in seconds; the rest of the solve carries on in
            # the background and the app re-asks until it's done.
            solver.solve(FLOP_FIRST_PASS, target, FLOP_FIRST_PASS)
            solver._refining = True
            self._latest = solver
            threading.Thread(target=self._refine, args=(solver, its, target), daemon=True).start()
        else:
            solver.solve(its, target, 25)
        with self.lock:
            store[key] = solver
            # Two flop trees: the usual one and, after an option it leaves out, the complete one.
            while len(store) > (2 if street == "flop" else 8):
                _, dropped = store.popitem(last=False)
                dropped._stop = True  # its background refine stops instead of taking CPU from this one
        return solver

    def _forced_spot(self, n, bucket, line, reach_before, solve):
        """Preflop re-solved with every action in `line` forced, then free play; ranges from that point.

        The off-script action's player gets a typical population range for what they did (as in hand
        reviews of off-tree lines); everyone else keeps the range GTO would have there.
        """
        key = (n, bucket, tuple((p, t, round(to, 2)) for p, t, to in line))
        with self.lock:
            if key in self.forced:
                return self.forced[key]
        if not solve:
            raise NeedsSolve("Off the GTO line: re-solving preflop for it (a couple of minutes).")
        from .preflop import PreflopSpot
        from .review import population_range
        ranges = [list(map(float, r)) for r in np.asarray(reach_before)]
        p, t, to = line[-1]
        raises = sum(1 for _, tt, _ in line[:-1] if tt in (3, 4))
        kind = None
        if t == 2:
            kind = "limp" if raises == 0 else "cold_call"
        elif t in (3, 4):
            kind = {0: "iso_raise", 1: "three_bet"}.get(raises, "four_bet")
        if kind:
            ranges[p] = list(np.minimum(np.array(ranges[p]), population_range(kind)))
        forced = [_engine.PreflopForced(pp, tt, too) for pp, tt, too in line]
        # Keep the tree small: only the small blind may limp (forced limps are already in the line), and
        # flops allow one more player than have put money in voluntarily so far (at least three).
        voluntary = {pp for pp, tt, _ in line if tt in (2, 3, 4)}
        limp = [1 if i == (0 if n == 2 else n - 2) else 0 for i in range(n)]
        spot = PreflopSpot(num_players=n, stack=bucket,
                           max_players_flop=min(n, max(3, len(voluntary) + 2)),
                           options={"forced": forced, "initial_range": ranges, "can_limp": limp,
                                    "multiway_blinds_only": False})
        # Off-script lines rest on assumed ranges anyway, so a shorter solve is accurate enough.
        spot.engine.solve(FORCED_ITERATIONS, 0.01, 50)
        with self.lock:
            self.forced[key] = spot
            while len(self.forced) > 12:
                self.forced.popitem(last=False)
        return spot

    def _yield(self, solver) -> bool:
        """True while this background refine should wait: an answer someone is waiting for is being
        solved, or a newer flop tree is still refining."""
        latest = self._latest
        return self._waiting > 0 or (latest is not solver and latest is not None and getattr(latest, "_refining", False))

    def _refine(self, solver, its, target):
        try:
            while not getattr(solver, "_stop", False):
                if self._yield(solver):
                    time.sleep(0.05)
                    continue
                with solver._lock:
                    done = solver.engine.iterations
                    if done >= its:
                        break
                    solver.engine.iterate(min(REFINE_CHUNK, its - done))
                    done = solver.engine.iterations
                if done % REFINE_CHECK < REFINE_CHUNK:
                    with solver._lock:
                        if solver.exploitability_pct() <= target:
                            break
        finally:
            solver._refining = False

    @staticmethod
    def _node(solver, tokens, **kw):
        lock = getattr(solver, "_lock", None)
        if lock is None:
            return solver.node(tokens, **kw)
        with lock:
            return solver.node(tokens, **kw)

    # -- main entry -------------------------------------------------------------
    def spot(self, req: dict, solve: bool = False) -> dict:
        if not solve:
            return self._spot(req, False)
        with self.lock:
            self._waiting += 1
        try:
            return self._spot(req, True)
        finally:
            with self.lock:
                self._waiting -= 1

    def _spot(self, req: dict, solve: bool) -> dict:
        n = int(req["players"])
        if not 2 <= n <= 9:
            raise ValueError("2 to 9 players")
        stacks = [float(s) for s in req.get("stacks_bb") or [100.0] * n]
        if len(stacks) != n:
            raise ValueError("one stack per player")
        hero = int(req.get("hero", n - 1))
        hero_cards = parse_cards(req["hero_cards"]) if req.get("hero_cards") else None
        hero_combo = combo_index(*hero_cards) if hero_cards and len(hero_cards) == 2 else None
        board = parse_cards(req.get("board") or [])
        if hero_cards and set(hero_cards) & set(board):
            raise ValueError("a board card is one of your cards")
        names = list(_engine.position_names(n))
        others = [s for i, s in enumerate(stacks) if i != hero]
        eff = min(stacks[hero], max(others)) if others else stacks[hero]
        bucket = nearest_bucket(eff)
        out = {"players": [{"position": names[i], "stack_bb": stacks[i]} for i in range(n)], "hero": hero,
               "positions": names, "history": [], "notes": [], "board": [c for c in req.get("board") or []]}
        if abs(bucket - eff) / eff > 0.1:
            out["notes"].append(f"Preflop uses the {bucket}bb solution (effective stack {eff:g}bb).")
        spot = self._preflop(n, bucket, solve)

        # ---- preflop -------------------------------------------------------------
        # Steps are option ids: the solved game's actions first, then extra legal actions GTO never
        # takes (a limp/call, or all-in). Picking an extra re-solves preflop with the line so far
        # forced, and later decisions come from that solve until someone leaves its tree again.
        path: list = []
        line: list = []   # (player, type code, to) for every preflop action, for forced re-solves
        for step in req.get("preflop", []):
            info = spot.engine.query(path)
            if info["terminal"]:
                raise ValueError("preflop action continues after the hand ended")
            opts = self._preflop_options(info, spot.stack)
            if int(step) >= len(opts):
                raise ValueError("unknown preflop option")
            o = opts[int(step)]
            p = info["player"]
            out["history"].append({"street": "preflop", "position": names[p], "player": p, "text": o["label"]})
            line.append((p, TYPE_CODE[o["kind"]], float(o["to_bb"])))
            if o.get("off_tree"):
                spot = self._forced_spot(n, bucket, line, info["reach"], solve)
                path = [0] * len(line)
                out["off_tree"] = True
            else:
                path.append(int(step))
        if out.get("off_tree"):
            out["notes"].append("Off the GTO line preflop: the numbers after it come from a re-solve with that "
                                "line fixed and typical ranges for the off-script actions.")
        info = spot.engine.query(path)
        if not info["terminal"]:
            return self._preflop_decision(out, spot, info, path, hero, hero_cards, names, spot.stack)
        live = [i for i in range(n) if not info["folded"][i]]
        out["pot_bb"] = round(float(info["pot"]), 2)
        self._set_stacks(out, stacks, info["invested"], live)
        if info["terminal_kind"] == "fold":
            return self._finish(out, f"{names[live[0]]} wins the pot.")
        if info["terminal_kind"] == "allin":
            return self._needs_runout(out, board, 5, "Everyone is all in: deal the board.")
        if len(board) < 3:
            return self._needs_cards(out, "flop", 3 - len(board))
        if len(live) > 2:
            aggressor, q = None, []
            for step in path:
                ni = spot.engine.query(q)
                if ni["actions"][step]["type"] in ("raise", "allin"):
                    aggressor = ni["player"]
                q.append(step)
            return self._multiway(out, req, live, info, stacks, board, names, hero, hero_cards, aggressor)
        return self._heads_up(out, req, spot, path, info, live, stacks, board, names, hero, hero_combo, solve,
                              line_key=tuple(line))

    # -- preflop ------------------------------------------------------------------
    @staticmethod
    def _preflop_text(a: dict) -> str:
        t = a["type"]
        if t in ("fold", "check"):
            return t.capitalize()
        if t == "call":
            return f"Call {_bb(a['to'])}"
        if t == "allin":
            return f"All-in {_bb(a['to'])}"
        return f"Raise to {_bb(a['to'])}"

    def _preflop_options(self, info, stack):
        """The solved node's actions, then any other legal action GTO never takes (call/limp, all-in)."""
        opts = [{"kind": a["type"], "label": self._preflop_text(a), "to_bb": round(float(a["to"]), 2)}
                for a in info["actions"]]
        kinds = [o["kind"] for o in opts]
        invested = info["invested"]
        p = info["player"]
        cur = max(invested)
        if cur > invested[p] + 1e-9 and "call" not in kinds:
            limp = cur <= 1.0 + 1e-9
            opts.append({"kind": "call", "label": f"{'Limp' if limp else 'Call'} {_bb(cur)}", "to_bb": round(cur, 2),
                         "off_tree": True})
        if "allin" not in kinds and stack > cur + 1e-9:
            opts.append({"kind": "allin", "label": f"All-in {_bb(stack)}", "to_bb": round(float(stack), 2),
                         "off_tree": True})
        for i, o in enumerate(opts):
            o["id"] = i
        return opts

    def _preflop_decision(self, out, spot, info, path, hero, hero_cards, names, stack):
        p = info["player"]
        strat = np.asarray(info["strategy"])
        evs = np.asarray(info["action_ev"])
        reach = np.asarray(info["reach"][p])
        from .preflop import CLASS_COMBOS
        w = reach * CLASS_COMBOS
        range_freq = (strat * w).sum(axis=1) / max(w.sum(), 1e-12)
        mine = p == hero and hero_cards is not None
        cls = CLASS_INDEX[hand_class(combo_index(*hero_cards))] if mine else None
        options = []
        for o in self._preflop_options(info, stack):
            i = o["id"]
            if o.get("off_tree"):
                options.append({**o, "freq": 0.0, "range_freq": 0.0, "ev_bb": None})
                continue
            options.append({**o, "freq": round(float(strat[i][cls] if mine else range_freq[i]), 4),
                            "range_freq": round(float(range_freq[i]), 4),
                            "ev_bb": round(float(evs[i][cls]), 3) if mine else None})
        invested = info["invested"]
        out.update({"street": "preflop", "to_act": p, "to_act_position": names[p], "options": options,
                    "hand_specific": mine, "pot_bb": round(float(info["pot"]), 2),
                    "to_call_bb": round(max(invested) - invested[p], 2), "status": "ready"})
        self._set_stacks(out, [pl["stack_bb"] for pl in out["players"]], invested,
                         [i for i in range(len(names)) if not info["folded"][i]])
        if mine:
            out["hand"] = combo_str(combo_index(*hero_cards))
        return out

    # -- heads-up postflop ------------------------------------------------------------
    def _heads_up(self, out, req, spot, path, pinfo, live, stacks, board, names, hero, hero_combo, solve,
                  line_key=()):
        n = len(names)
        oop, ip = sorted(live, key=lambda i: _postflop_rank(i, n))
        seat = {oop: 0, ip: 1}
        ranges = {i: class_reach_to_combos(pinfo["reach"][i]).astype(np.float32) for i in live}
        if hero in live and hero_combo is not None:
            ranges[hero][hero_combo] = max(ranges[hero][hero_combo], 1e-3)
        pot = float(pinfo["pot"])
        eff = min(stacks[oop] - pinfo["invested"][oop], stacks[ip] - pinfo["invested"][ip])
        # Preflop aggressor (for "no donk bets" on the flop).
        aggressor = None
        q = []
        for step in path:
            ni = spot.engine.query(q)
            if ni["actions"][step]["type"] in ("raise", "allin"):
                aggressor = ni["player"]
            q.append(step)
        key = (n, round(stacks[oop], 2), round(stacks[ip], 2), line_key, tuple(board[:3]))
        prev_aggr = aggressor
        for street in ("flop", "turn", "river"):
            bstreet = board[:BOARD_AT[street]]
            k = key + (street,)
            if street == "flop":
                # A pre-solved flop answers at once; the live solver takes over past what it stores.
                lib = self._library_entry(n, stacks, spot, path, bool(out.get("off_tree")), board)
                steps = [int(x) for x in req.get("flop", [])]
                res = None
                if lib is not None and not any(x >= FULL_ID for x in steps):
                    res = self._from_library(out, lib, steps, oop, ip, seat, live, hero, hero_combo, names,
                                             pot, eff, ranges, board)
                if res is not None and "done" in res:
                    return res["done"]
                if res is not None:
                    ranges, pot, eff, prev_aggr = res["ranges"], res["pot"], res["eff"], res["last_bettor"]
                    if hero in live and hero_combo is not None:
                        ranges[hero][hero_combo] = max(ranges[hero][hero_combo], 1e-3)
                    if len(board) < BOARD_AT["turn"]:
                        return self._needs_cards(out, "turn", 1)
                    key = key + tuple(steps) + (board[BOARD_AT["turn"] - 1],)
                    continue

            def build(street=street, bstreet=bstreet, ranges=ranges, pot=pot, eff=eff, prev_aggr=prev_aggr):
                sizing = explorer_sizing(street, oop_leads=prev_aggr != ip, spr=eff / pot)
                s = PostflopSolver(bstreet, pot, eff, ranges[oop], ranges[ip], sizing=sizing,
                                   compress=street == "flop", max_memory_mb=self.rv.settings.max_memory_mb)
                return s

            solver = self._street_solver(k, street, build, solve)
            steps = [int(x) for x in req.get(street, [])]
            complete = any(x >= FULL_ID for x in steps)
            active = solver
            if complete:
                def build_full(street=street, bstreet=bstreet, ranges=ranges, pot=pot, eff=eff):
                    return PostflopSolver(bstreet, pot, eff, ranges[oop], ranges[ip], sizing=complete_sizing(street),
                                          compress=street == "flop", max_memory_mb=self.rv.settings.max_memory_mb)
                wait = " (a couple of minutes)." if street == "flop" else "."
                active = self._street_solver(k + ("full",), street, build_full, solve,
                                             "Off the GTO line: re-solving this street with every option in it" + wait)
            if getattr(active, "_refining", False):
                out["refining"] = True
            tokens: list = []
            basic: list = []  # the line so far in the usual tree (only usual-tree ids come before an off-tree one)
            last_bettor = None
            for step in steps:
                node = self._node(active, tokens, with_equity=False, with_ev=False)
                if node.type != "action":
                    raise ValueError(f"{street} action continues after the street ended")
                if not complete:
                    idx = step
                elif step >= EXTRA_ID:
                    std = _standard_options(node.pot, node.info["contrib"], node.info["stack"], node.player)
                    if step - EXTRA_ID >= len(std):
                        raise ValueError("that option isn't available here")
                    idx = _match(node.actions, *std[step - EXTRA_ID])
                elif step >= FULL_ID:
                    idx = step - FULL_ID
                else:
                    b = self._node(solver, basic, with_equity=False, with_ev=False).actions[step]
                    idx = _match(node.actions, b["type"], bool(b["all_in"]), float(b["amount"]))
                    basic.append(step)
                if idx is None or not 0 <= idx < len(node.actions):
                    raise ValueError("that option isn't available here")
                a = node.actions[idx]
                actor = oop if node.player == 0 else ip
                if a["type"] in ("bet", "raise"):
                    last_bettor = actor
                out["history"].append({"street": street, "position": names[actor], "player": actor,
                                       "text": self._postflop_text(a, node.pot)})
                tokens.append(idx)
                key = key + (step,)
            node = self._node(active, tokens)
            pot_now, stack_now = float(node.pot), node.info["stack"]
            out["pot_bb"] = round(pot_now, 2)
            for i in live:
                out["players"][i]["behind_bb"] = round(float(stack_now[seat[i]]), 2)
            if node.type == "action":
                return self._postflop_decision(out, node, street, oop, ip, hero, hero_combo, names, complete)
            if node.type == "fold":
                folder = out["history"][-1]["player"]
                winner = ip if folder == oop else oop
                out["players"][folder]["folded"] = True
                return self._finish(out, f"{names[winner]} wins the pot.")
            if node.type == "allin":
                return self._needs_runout(out, board, 5, "All in: deal the rest of the board.")
            if node.type == "showdown":
                return self._finish(out, "Showdown.")
            # Chance node: the street is over.
            nxt = STREETS[STREETS.index(street) + 1]
            if len(board) < BOARD_AT[nxt]:
                return self._needs_cards(out, nxt, 1)
            ranges = {oop: node.range_weights(0), ip: node.range_weights(1)}
            if hero in live and hero_combo is not None:
                ranges[hero][hero_combo] = max(ranges[hero][hero_combo], 1e-3)
            pot, eff = pot_now, float(min(stack_now))
            prev_aggr = last_bettor
            key = key + (board[BOARD_AT[nxt] - 1],)
        return self._finish(out, "Showdown.")

    def _library_entry(self, n, stacks, spot, path, off_tree, board):
        """The pre-solved flop for this hand, when the preflop line is one the library covers."""
        if n != 6 or off_tree or len(board) < 3 or any(abs(s - 100.0) > 1e-6 for s in stacks):
            return None
        if self._library_paths is None:
            paths = {}
            for name, (labels, *_rest) in LIBRARY_SPOTS.items():
                try:
                    paths[tuple(spot.resolve(labels))] = name
                except ValueError:
                    continue
            self._library_paths = paths
        name = self._library_paths.get(tuple(path))
        if name is None or not self.library.available(name):
            return None
        return self.library.get(name, board[:3])

    def _from_library(self, out, lib, steps, oop, ip, seat, live, hero, hero_combo, names, pot, eff, ranges,
                      board):
        """Play the flop line from a stored solution. Returns {"done": response} when it answers,
        {"ranges", "pot", "eff", "last_bettor"} when the flop's betting ended (go on to the turn), or
        None when the line goes past what's stored (the live solver takes over)."""
        tokens, contrib, last_bettor, history = [], [0.0, 0.0], None, []
        last_types = []
        for step in steps:
            nd = lib.node(tokens)
            if nd is None:
                return None
            if not 0 <= step < len(nd["actions"]):
                raise ValueError("that option isn't available here")
            a = dict(nd["actions"][step])
            p = nd["player"]
            actor = oop if p == 0 else ip
            a["added"] = a["amount"] - contrib[p]
            if a["type"] in ("bet", "raise"):
                last_bettor = actor
            if a["type"] in ("bet", "raise", "call"):
                contrib[p] = a["amount"]
            history.append({"street": "flop", "position": names[actor], "player": actor,
                            "text": self._postflop_text(a, nd["pot"])})
            tokens.append(step)
            last_types.append(a["type"])
            if a["type"] == "fold":
                out["history"] += history
                out["players"][actor]["folded"] = True
                winner = ip if actor == oop else oop
                return {"done": self._finish(out, f"{names[winner]} wins the pot.")}
        nd = lib.node(tokens)
        pot_now = pot + contrib[0] + contrib[1]
        behind = [eff - contrib[0], eff - contrib[1]]
        if nd is not None:
            out["history"] += history
            out["pot_bb"] = round(nd["pot"], 2)
            for i in live:
                out["players"][i]["behind_bb"] = round(float(behind[seat[i]]), 2)
            return {"done": self._library_decision(out, lib, nd, oop, ip, hero, hero_combo, names, contrib, behind)}
        ended = last_types and (last_types[-1] == "call" or last_types[-2:] == ["check", "check"])
        if not ended:
            return None  # deeper than the stored decisions
        new_ranges = lib.ranges_after(tokens, {0: ranges[oop], 1: ranges[ip]})
        if new_ranges is None:
            return None
        out["history"] += history
        out["pot_bb"] = round(pot_now, 2)
        for i in live:
            out["players"][i]["behind_bb"] = round(float(behind[seat[i]]), 2)
        if min(behind) <= 1e-9:
            return {"done": self._needs_runout(out, board, 5, "All in: deal the rest of the board.")}
        return {"ranges": {oop: new_ranges[0], ip: new_ranges[1]}, "pot": pot_now, "eff": float(min(behind)),
                "last_bettor": last_bettor}

    def _library_decision(self, out, lib, nd, oop, ip, hero, hero_combo, names, contrib, behind):
        p = nd["player"]
        actor = oop if p == 0 else ip
        mine = actor == hero and hero_combo is not None
        reach = nd["reach"]
        tot = float(reach.sum())
        row = lib.combo_row(p, hero_combo) if mine else -1
        mine = mine and row >= 0
        options = []
        for i, a in enumerate(nd["actions"]):
            a = {**a, "added": a["amount"] - contrib[p]}
            rf = float((nd["strategy"][i] * reach).sum() / tot) if tot > 0 else 0.0
            options.append({"id": i, "label": self._postflop_text(a, nd["pot"]),
                            "kind": "allin" if a["all_in"] else a["type"], "to_bb": round(float(a["amount"]), 2),
                            "freq": round(float(nd["strategy"][i][row]) if mine else rf, 4),
                            "range_freq": round(rf, 4),
                            "ev_bb": round(float(nd["ev"][i][row]), 3) if mine else None})
        for j, (kind, all_in, amount) in enumerate(_standard_options(nd["pot"], contrib, behind, p)):
            m = _match(nd["actions"], kind, all_in, amount)
            if m is not None and (kind in ("fold", "check", "call") or all_in
                                  or abs(float(nd["actions"][m]["amount"]) - amount) <= 0.15 * amount):
                continue
            fake = {"type": kind, "all_in": all_in, "amount": amount, "added": amount - contrib[p]}
            options.append({"id": EXTRA_ID + j, "label": self._postflop_text(fake, nd["pot"]),
                            "kind": "allin" if all_in else kind, "to_bb": round(float(amount), 2),
                            "freq": 0.0, "range_freq": 0.0, "ev_bb": None, "off_tree": True})
        order = {"fold": 0, "check": 0, "call": 1, "bet": 2, "raise": 2, "allin": 3}
        options.sort(key=lambda o: (order[o["kind"]], o["to_bb"]))
        out.update({"street": "flop", "to_act": actor, "to_act_position": names[actor], "options": options,
                    "hand_specific": mine, "to_call_bb": round(abs(contrib[0] - contrib[1]), 2), "status": "ready",
                    "presolved": True})
        if mine:
            out["hand"] = combo_str(hero_combo)
        return out

    @staticmethod
    def _postflop_text(a: dict, pot: float) -> str:
        t = a["type"]
        if t in ("fold", "check"):
            return t.capitalize()
        if t == "call":
            return f"Call {_bb(a['amount'])}"
        if a["all_in"]:
            return f"All-in {_bb(a['amount'])}"
        if t == "bet":
            return f"Bet {100 * a['added'] / pot:.0f}% ({_bb(a['amount'])})"
        return f"Raise to {_bb(a['amount'])}"

    def _postflop_decision(self, out, node, street, oop, ip, hero, hero_combo, names, complete=False):
        actor = oop if node.player == 0 else ip
        mine = actor == hero and hero_combo is not None
        rs = node.range_strategy()
        h = node.hand(hero_combo) if mine else None
        options = []
        for i, a in enumerate(node.actions):
            lab = node.labels[i]
            options.append({"id": i + (FULL_ID if complete else 0), "label": self._postflop_text(a, node.pot),
                            "kind": "allin" if a["all_in"] else a["type"], "to_bb": round(float(a["amount"]), 2),
                            "freq": round(float(h["strategy"][lab] if mine else rs[lab]), 4),
                            "range_freq": round(float(rs[lab]), 4),
                            "ev_bb": round(float(h["action_ev"][lab]), 3) if mine else None})
        if not complete:
            # Every other standard option stays playable. GTO never takes it here (the solved tree leaves
            # it out); choosing it re-solves the street with every option in it.
            contrib = node.info["contrib"]
            for j, (kind, all_in, amount) in enumerate(_standard_options(node.pot, contrib, node.info["stack"],
                                                                         node.player)):
                m = _match(node.actions, kind, all_in, amount)
                if m is not None and (kind in ("fold", "check", "call") or all_in
                                      or abs(float(node.actions[m]["amount"]) - amount) <= 0.15 * amount):
                    continue
                fake = {"type": kind, "all_in": all_in, "amount": amount, "added": amount - contrib[node.player]}
                options.append({"id": EXTRA_ID + j, "label": self._postflop_text(fake, node.pot),
                                "kind": "allin" if all_in else kind, "to_bb": round(float(amount), 2),
                                "freq": 0.0, "range_freq": 0.0, "ev_bb": None, "off_tree": True})
            order = {"fold": 0, "check": 0, "call": 1, "bet": 2, "raise": 2, "allin": 3}
            options.sort(key=lambda o: (order[o["kind"]], o["to_bb"]))
        contrib = node.info["contrib"]
        out.update({"street": street, "to_act": actor, "to_act_position": names[actor], "options": options,
                    "hand_specific": mine, "to_call_bb": round(abs(contrib[0] - contrib[1]), 2), "status": "ready"})
        if mine:
            out["hand"] = combo_str(hero_combo)
            eq = h.get(f"p{node.player}", {}).get("equity")
            if eq is not None:
                out["equity"] = round(float(eq), 4)
        return out

    # -- multiway postflop (no solver) ---------------------------------------------------
    def _multiway(self, out, req, live, pinfo, stacks, board, names, hero, hero_cards, aggressor=None):
        n = len(names)
        order = sorted(live, key=lambda i: _postflop_rank(i, n))
        behind = {i: stacks[i] - pinfo["invested"][i] for i in live}
        pot = float(pinfo["pot"])
        folded: set = set()
        # Each player's range: their preflop range, narrowed as they bet, raise or call after the flop.
        ranges = {i: class_reach_to_combos(pinfo["reach"][i]).astype(np.float32) for i in live}
        hero_combo = combo_index(*hero_cards) if hero_cards and len(hero_cards) == 2 else None
        out["notes"].append("Three or more players after the flop: the percentages are approximate, from each "
                            "hand's equity against everyone's likely ranges and the price, not a full solve.")
        for street in ("flop", "turn", "river"):
            sboard = board[:BOARD_AT[street]]
            street_bettor = None
            bets = {i: 0.0 for i in order}
            acted: set = set()
            raises = 0
            steps = [int(x) for x in req.get(street, [])]
            si = 0
            ptr = 0  # index in `order` to start looking for the next player to act
            while True:
                actors = [i for i in order if i not in folded]
                if len(actors) == 1:
                    out["pot_bb"] = round(pot, 2)
                    return self._finish(out, f"{names[actors[0]]} wins the pot.")
                cur = max(bets.values())
                need = {i for i in actors if behind[i] > 1e-9 and (i not in acted or bets[i] < cur - 1e-9)}
                if not need:
                    break
                k = ptr
                while order[k % len(order)] not in need:
                    k += 1
                actor = order[k % len(order)]
                ptr = (k % len(order)) + 1
                opts = self._rule_options(pot, cur, bets[actor], behind[actor], raises)
                if si >= len(steps):
                    opps = [i for i in order if i != actor and i not in folded]
                    mine = actor == hero and hero_combo is not None
                    # Without the initiative you mostly check to the last aggressor if they're still to act.
                    yields = (aggressor is not None and aggressor != actor and aggressor not in folded
                              and aggressor not in acted)
                    _multiway_freqs(opts, ranges[actor], [ranges[i] for i in opps], sboard, pot, cur - bets[actor],
                                    behind[actor], hero_combo if mine else None, check_to_raiser=yields,
                                    initiative=aggressor == actor)
                    if mine:
                        out["hand"] = combo_str(hero_combo)
                    out.update({"street": street, "to_act": actor, "to_act_position": names[actor],
                                "options": opts, "hand_specific": mine, "pot_bb": round(pot, 2),
                                "to_call_bb": round(cur - bets[actor], 2), "status": "ready", "multiway": True})
                    for i in live:
                        out["players"][i]["behind_bb"] = round(behind[i], 2)
                        out["players"][i]["folded"] = i in folded
                    return out
                o = opts[steps[si]]
                si += 1
                out["history"].append({"street": street, "position": names[actor], "player": actor, "text": o["label"]})
                if o["kind"] in ("bet", "raise", "allin", "call"):
                    opps = [i for i in order if i != actor and i not in folded]
                    ranges[actor] = _narrow(ranges[actor], [ranges[i] for i in opps], sboard,
                                            0.45 if o["kind"] != "call" else 0.75, hero_combo if actor == hero else None)
                if o["kind"] == "fold":
                    folded.add(actor)
                elif o["kind"] != "check":
                    add = min(o["to_bb"] - bets[actor], behind[actor])
                    if o["to_bb"] > cur + 1e-9:
                        raises += 1
                        acted = set()
                        street_bettor = actor
                    behind[actor] -= add
                    bets[actor] += add
                    pot += add
                acted.add(actor)
            if si < len(steps):
                raise ValueError(f"{street} action continues after the street ended")
            aggressor = street_bettor
            if sum(1 for i in order if i not in folded and behind[i] > 1e-9) < 2:
                out["pot_bb"] = round(pot, 2)
                return self._needs_runout(out, board, 5, "All in: deal the rest of the board.")
            if street == "river":
                break
            nxt = STREETS[STREETS.index(street) + 1]
            if len(board) < BOARD_AT[nxt]:
                out["pot_bb"] = round(pot, 2)
                for i in live:
                    out["players"][i]["behind_bb"] = round(behind[i], 2)
                    out["players"][i]["folded"] = i in folded
                return self._needs_cards(out, nxt, 1)
        out["pot_bb"] = round(pot, 2)
        return self._finish(out, "Showdown.")

    @staticmethod
    def _rule_options(pot, cur, mine, behind, raises):
        opts = []
        allin_to = mine + behind
        if cur > mine + 1e-9:
            opts.append({"kind": "fold", "label": "Fold"})
            call = min(cur, allin_to)
            opts.append({"kind": "call", "label": f"Call {_bb(call - mine)}", "to_bb": round(call, 2)})
            if allin_to > cur + 1e-9:
                raise_to = cur + (pot + (cur - mine)) * 0.6 + (cur - mine)
                if raises < 3 and raise_to < allin_to * 0.9:
                    opts.append({"kind": "raise", "label": f"Raise to {_bb(raise_to)}", "to_bb": round(raise_to, 2)})
                opts.append({"kind": "allin", "label": f"All-in {_bb(allin_to)}", "to_bb": round(allin_to, 2)})
        else:
            opts.append({"kind": "check", "label": "Check"})
            for f in (0.33, 0.75, 1.25):
                to = mine + f * pot
                if to < allin_to * 0.9:
                    opts.append({"kind": "bet", "label": f"Bet {round(100 * f)}% ({_bb(f * pot)})", "to_bb": round(to, 2)})
            if behind > 1e-9:
                opts.append({"kind": "allin", "label": f"All-in {_bb(allin_to)}", "to_bb": round(allin_to, 2)})
        for i, o in enumerate(opts):
            o.update({"id": i, "freq": None, "range_freq": None, "ev_bb": None})
        return opts

    # -- endings / card requests -------------------------------------------------------------
    @staticmethod
    def _set_stacks(out, stacks, invested, live):
        for i, pl in enumerate(out["players"]):
            pl["behind_bb"] = round(stacks[i] - float(invested[i]), 2)
            pl["invested_bb"] = round(float(invested[i]), 2)
            pl["folded"] = i not in live

    @staticmethod
    def _needs_cards(out, street, count):
        out.update({"street": street, "to_act": None, "options": [], "status": "ready",
                    "needs_cards": {"street": street, "count": count}})
        return out

    @staticmethod
    def _needs_runout(out, board, total, message):
        if len(board) < total:
            out.update({"street": "runout", "to_act": None, "options": [], "status": "ready",
                        "needs_cards": {"street": "runout", "count": total - len(board)}, "message": message})
            return out
        return Explorer._finish(out, "All in: the board is out.")

    @staticmethod
    def _finish(out, message):
        out.update({"street": "done", "to_act": None, "options": [], "status": "ready", "message": message})
        return out


__all__ = ["Explorer", "NeedsSolve", "STACK_BUCKETS"]

"""Trains the app's bots after the flop: solves many heads-up pots with the postflop solver and boils
GTO's play down to a small table the bots read during a game (no server needed while playing).

For every action node on the flop, and on sampled turn and river cards along the common lines, it
records how often GTO checks / bets small / bets big (or folds / calls / raises facing a bet), keyed
by things a bot can see for itself:

    street | role | position | situation | texture | hand bucket

  role       agg: made the last bet or raise on the street before (or raised preflop), def: didn't
  position   ip / oop
  situation  open (nothing to call), small (facing a bet up to half pot), big (bigger), raised
             (facing a raise after betting)
  texture    dry, wet, paired, mono (see board_texture below; src/game/botPlay.ts mirrors it)
  bucket     monster, strong, top, mid, draw, weak, air (see hand_bucket; mirrored in botPlay.ts)

    python3 scripts/train_bots.py --flops 40 --out ../src/game/botPostflop.json

The bucket and texture rules are deliberately simple and written out here and in TypeScript;
--parity writes sample hands so the TypeScript unit test can check the two agree.
"""
from __future__ import annotations

import argparse
import json
import os
import random
import sys
import time

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from flipup_gto.cards import card_str, combo_cards  # noqa: E402
from flipup_gto.preflop import PreflopSpot  # noqa: E402
from flipup_gto.review import class_reach_to_combos  # noqa: E402
from flipup_gto.solver import BetSizing, PostflopSolver, StreetSizing  # noqa: E402

RANKS = "23456789TJQKA"
STREETS = ("flop", "turn", "river")
BUCKETS = ("monster", "strong", "top", "mid", "draw", "weak", "air")

# Preflop lines in the 6-max tree (UTG, HJ, CO, BTN, SB, BB), the two players and who raised last.
MATCHUPS = [
    ("btn_vs_bb", ["fold", "fold", "fold", "raise", "fold", "call"], 5, 3, "ip"),
    ("co_vs_bb", ["fold", "fold", "raise", "fold", "fold", "call"], 5, 2, "ip"),
    ("sb_vs_bb", ["fold", "fold", "fold", "fold", "raise", "call"], 4, 5, "oop"),
    ("co_vs_btn", ["fold", "fold", "raise", "call", "fold", "fold"], 2, 3, "oop"),
    ("bb_3bet_btn", ["fold", "fold", "fold", "raise", "fold", "raise", "call"], 5, 3, "oop"),
]


# ── Hand and board features (keep in step with src/game/botPlay.ts) ─────────

def rank(c: str) -> int:
    return RANKS.index(c[0]) + 2


def category(cards: list[str]) -> int:
    """0 high card, 1 pair, 2 two pair, 3 trips, 4 straight, 5 flush, 6 full house, 7 quads, 8 straight flush."""
    ranks = [rank(c) for c in cards]
    counts: dict[int, int] = {}
    for r in ranks:
        counts[r] = counts.get(r, 0) + 1
    suits: dict[str, list[int]] = {}
    for c in cards:
        suits.setdefault(c[1], []).append(rank(c))
    flush_suit = next((s for s, rs in suits.items() if len(rs) >= 5), None)

    def has_straight(rs) -> bool:
        u = set(rs)
        if 14 in u:
            u.add(1)
        return any(all(x in u for x in range(lo, lo + 5)) for lo in range(1, 11))

    if flush_suit and has_straight(suits[flush_suit]):
        return 8
    c = sorted(counts.values(), reverse=True)
    if c[0] >= 4:
        return 7
    if c[0] == 3 and len(c) > 1 and c[1] >= 2:
        return 6
    if flush_suit:
        return 5
    if has_straight(ranks):
        return 4
    if c[0] == 3:
        return 3
    if c[0] == 2 and len(c) > 1 and c[1] == 2:
        return 2
    if c[0] == 2:
        return 1
    return 0


def straight_outs(hole: list[str], board: list[str]) -> int:
    """How many ranks would give a straight that uses a hole card (2+ is open-ended or double gutter)."""
    have = {rank(c) for c in hole + board}
    if category(hole + board) >= 4:
        return 0
    outs = 0
    for r in range(2, 15):
        if r in have:
            continue
        u = have | {r}
        if 14 in u:
            u = u | {1}
        for lo in range(1, 11):
            window = set(range(lo, lo + 5))
            if window <= u:
                # The straight must need a hole card.
                bu = {rank(c) for c in board} | {r}
                if 14 in bu:
                    bu = bu | {1}
                if not window <= bu:
                    outs += 1
                    break
    return outs


def flush_draw(hole: list[str], board: list[str]) -> bool:
    if len(board) >= 5:
        return False
    for s in "shdc":
        n = sum(1 for c in hole + board if c[1] == s)
        if n == 4 and any(c[1] == s for c in hole):
            return True
    return False


def hand_bucket(hole: list[str], board: list[str]) -> str:
    cat = category(hole + board)
    board_cat = category(board) if len(board) >= 5 else _board_only(board)
    top = max(rank(c) for c in board)
    if cat >= 3 and cat > board_cat:
        return "monster"
    if cat == 2 and board_cat == 0:
        return "strong"
    if cat >= 1 and cat > board_cat or (cat == 2 and board_cat == 1):
        # A pair of our own: top pair or an overpair, or something weaker.
        h = sorted((rank(c) for c in hole), reverse=True)
        board_ranks = {rank(c) for c in board}
        if h[0] == h[1] and h[0] not in board_ranks:
            return "top" if h[0] > top else "mid"
        mine = [r for r in h if r in board_ranks]
        if mine:
            return "top" if max(mine) == top else "mid"
    if len(board) < 5:
        if flush_draw(hole, board) or straight_outs(hole, board) >= 2:
            return "draw"
        if straight_outs(hole, board) == 1 or all(rank(c) > top for c in hole):
            return "weak"
    elif all(rank(c) > top for c in hole):
        return "weak"
    return "air"


def _board_only(board: list[str]) -> int:
    counts: dict[int, int] = {}
    for c in board:
        counts[rank(c)] = counts.get(rank(c), 0) + 1
    c = sorted(counts.values(), reverse=True)
    if c[0] >= 3:
        return 3
    if c[0] == 2 and len(c) > 1 and c[1] == 2:
        return 2
    return 1 if c[0] == 2 else 0


def board_texture(board: list[str]) -> str:
    ranks = sorted({rank(c) for c in board})
    if len(ranks) < len(board):
        return "paired"
    suit_max = max(sum(1 for c in board if c[1] == s) for s in "shdc")
    if suit_max >= 3:
        return "mono"
    u = set(ranks) | ({1} if 14 in ranks else set())
    connected = any(sum(1 for r in u if lo <= r < lo + 5) >= 3 for lo in range(1, 11))
    close = any(b - a <= 2 for a, b in zip(sorted(u), sorted(u)[1:]))
    if connected or (suit_max == 2 and close):
        return "wet"
    return "dry"


# ── Walking the solved tree ─────────────────────────────────────────────────

class Collector:
    def __init__(self):
        self.acc: dict[str, np.ndarray] = {}
        self.samples: dict[str, float] = {}
        self.bucket_cache: dict[tuple, list] = {}

    def buckets(self, board: tuple, combos) -> list:
        cache = self.bucket_cache.get(board)
        if cache is None:
            if len(self.bucket_cache) > 400:
                self.bucket_cache = {}
            cache = self.bucket_cache[board] = {}
        out = []
        for c in combos:
            c = int(c)
            if c not in cache:
                a, b = combo_cards(c)
                hole = [card_str(a), card_str(b)]
                cache[c] = None if hole[0] in board or hole[1] in board else hand_bucket(hole, list(board))
            out.append(cache[c])
        return out

    def add(self, key_base: str, board: tuple, info: dict, outcome_index: list[int], width: int):
        p = info["player"]
        combos = info[f"combos{p}"]
        reach = info[f"reach{p}"]
        strat = info["strategy"]
        buckets = self.buckets(board, combos)
        per: dict[str, np.ndarray] = {}
        for i, bucket in enumerate(buckets):
            r = float(reach[i])
            if bucket is None or r <= 1e-6:
                continue
            v = per.setdefault(bucket, np.zeros(width + 1))
            for a, o in enumerate(outcome_index):
                v[o] += r * float(strat[a][i])
            v[width] += r
        for bucket, v in per.items():
            k = f"{key_base}|{bucket}"
            self.acc[k] = self.acc.get(k, np.zeros(width + 1)) + v


def classify_actions(info: dict, facing: bool) -> list[int]:
    """Outcome slot for each action: open -> 0 check, 1 small bet, 2 big bet; facing -> 0 fold, 1 call, 2 raise."""
    pot = info["pot"]
    out = []
    for a in info["actions"]:
        t = a["type"]
        if t in ("fold",):
            out.append(0)
        elif t == "check":
            out.append(0)
        elif t == "call":
            out.append(1)
        elif t == "raise":
            out.append(2)
        else:  # bet
            frac = a["added"] / pot if pot > 0 else 1
            out.append(1 if frac <= 0.5 and not a["all_in"] else 2)
    return out


def walk(solver: PostflopSolver, col: Collector, rng: random.Random, tokens: list, street: int, agg_prev: str,
         street_state: dict, cards_per_chance: int, depth_guard: int = 0):
    info = solver.engine.query(tokens, False, False)
    kind = info["type"]
    if kind == "chance":
        if street >= 2:
            return
        board = list(info["board"])
        used = {card_str(c) for c in board} if board and isinstance(board[0], int) else set(board)
        deck = [r + s for r in RANKS for s in "shdc" if r + s not in used]
        # Whoever bet last on the street that just ended is the aggressor on the next one.
        nxt_agg = street_state.get("last_bettor") or "none"
        for card in rng.sample(deck, cards_per_chance):
            walk(solver, col, rng, tokens + [card], street + 1, nxt_agg, {}, max(1, cards_per_chance - 1), depth_guard + 1)
        return
    if kind != "action":
        return
    p = info["player"]
    pos = "oop" if p == 0 else "ip"
    board = tuple(card_str(c) if isinstance(c, int) else c for c in info["board"])
    contrib = info.get("contrib") or [0, 0]
    to_call = max(contrib) - contrib[p]
    if to_call <= 1e-9:
        situation = "open"
    elif street_state.get("raised"):
        situation = "raised"
    else:
        before = info["pot"] - to_call
        situation = "small" if to_call <= 0.5 * max(before, 1e-9) + 1e-9 else "big"
    role = "agg" if agg_prev == pos else "def"
    key_base = f"{STREETS[street]}|{role}|{pos}|{situation}|{board_texture(list(board))}"
    slots = classify_actions(info, situation != "open")
    col.add(key_base, board, info, slots, 3)
    for i, a in enumerate(info["actions"]):
        t = a["type"]
        if t == "fold":
            continue
        state = dict(street_state)
        if t in ("bet", "raise"):
            if state.get("last_bettor") is not None and t == "raise":
                state["raised"] = True
            state["last_bettor"] = pos
        walk(solver, col, rng, tokens + [str(i)], street, agg_prev, state, cards_per_chance, depth_guard)


def random_flops(n: int, seed: int, cards: int = 3) -> list[str]:
    rng = random.Random(seed)
    deck = [r + s for r in RANKS for s in "shdc"]
    seen = set()
    out = []
    by_tex: dict[str, int] = {}
    # Keep the mix of textures close to how often they come up, but make sure every kind appears.
    while len(out) < n:
        f = rng.sample(deck, cards)
        key = tuple(sorted(f))
        if key in seen:
            continue
        tex = board_texture(f)
        if by_tex.get(tex, 0) >= max(3, n // 3):
            continue
        seen.add(key)
        by_tex[tex] = by_tex.get(tex, 0) + 1
        out.append("".join(f))
    return out


def load_preflop(cache: str) -> PreflopSpot:
    spot = PreflopSpot(num_players=6, stack=100)
    d = np.load(cache)
    spot.engine.load_cumulative_strategy(d["cum"].astype(np.float32), int(d["iterations"]),
                                         d["regret"].astype(np.float32) if "regret" in d else None)
    return spot


def parity_samples(path: str, n: int = 600):
    rng = random.Random(7)
    deck = [r + s for r in RANKS for s in "shdc"]
    out = []
    for _ in range(n):
        k = rng.choice([3, 4, 5])
        cards = rng.sample(deck, 2 + k)
        hole, board = cards[:2], cards[2:]
        out.append({"hole": hole, "board": board, "bucket": hand_bucket(hole, board), "texture": board_texture(board),
                    "category": category(hole + board)})
    json.dump(out, open(path, "w"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--flops", type=int, default=40)
    ap.add_argument("--matchups", default=",".join(m[0] for m in MATCHUPS))
    ap.add_argument("--iterations", type=int, default=120)
    ap.add_argument("--target", type=float, default=1.0)
    ap.add_argument("--turns", type=int, default=3, help="turn cards per line (river gets one fewer)")
    ap.add_argument("--preflop", default="/tmp/pf/6p_100.npz")
    ap.add_argument("--out", required=True)
    ap.add_argument("--parity")
    ap.add_argument("--seed", type=int, default=11)
    ap.add_argument("--street", choices=["flop", "turn"], default="turn",
                    help="solve from the flop (heavy: several GB and many minutes each) or from the turn")
    args = ap.parse_args()
    if args.parity:
        parity_samples(args.parity)
        print(f"wrote parity samples to {args.parity}")
        return

    spot = load_preflop(args.preflop)
    col = Collector()
    if os.path.exists(args.out + ".partial"):
        saved = json.load(open(args.out + ".partial"))
        col.acc = {k: np.array(v) for k, v in saved["acc"].items()}
        done = set(saved["done"])
    else:
        done = set()
    rng = random.Random(args.seed)
    start = STREETS.index(args.street)
    flops = random_flops(args.flops, args.seed, 3 + start)
    wanted = [m for m in MATCHUPS if m[0] in args.matchups.split(",")]
    # Two sizes on every street so the bots learn when to go small and when to go big. One raise per
    # street (all-in on the turn and river) keeps a full flop-to-river tree within a few GB.
    flop = StreetSizing("33%, 75%", "75%")
    later = StreetSizing("33%, 75%", "a")
    sizing = BetSizing(oop={"flop": flop, "turn": later, "river": later},
                       ip={"flop": flop, "turn": later, "river": later}, max_raises=1)
    t0 = time.time()
    jobs = [(m, f) for f in flops for m in wanted]
    for k, (m, flop) in enumerate(jobs):
        name, path, oop_i, ip_i, agg = m
        tag = f"{name}:{flop}"
        if tag in done:
            continue
        info = spot.engine.query(spot.resolve(path))
        oop_r = class_reach_to_combos(info["reach"][oop_i])
        ip_r = class_reach_to_combos(info["reach"][ip_i])
        pot = float(info["pot"])
        stack = 100 - float(max(info["invested"]))
        s = PostflopSolver(flop, pot, stack, oop_r, ip_r, sizing=sizing, compress=True, max_memory_mb=9000)
        st = s.solve(args.iterations, args.target, 20)
        before = len(col.acc)
        walk(s, col, rng, [], start, agg, {}, args.turns)
        done.add(tag)
        print(f"[{k + 1}/{len(jobs)}] {name} {flop} ({board_texture([flop[i:i + 2] for i in range(0, len(flop), 2)])}): "
              f"expl {st.exploitability_pct:.2f}%, keys {before}->{len(col.acc)}, {time.time() - t0:.0f}s", flush=True)
        json.dump({"acc": {k2: v.tolist() for k2, v in col.acc.items()}, "done": sorted(done)},
                  open(args.out + ".partial", "w"))
        del s

    table = {}
    for key, v in sorted(col.acc.items()):
        tot = v[-1]
        if tot <= 0:
            continue
        table[key] = [round(float(x / tot), 3) for x in v[:-1]] + [round(float(tot), 1)]
    json.dump({"buckets": BUCKETS, "note": "key: street|role|pos|situation|texture|bucket -> [a, b, c, weight]; "
               "open: check, small bet, big bet; facing: fold, call, raise", "table": table},
              open(args.out, "w"), separators=(",", ":"))
    print(f"{len(table)} keys -> {args.out}")


if __name__ == "__main__":
    main()

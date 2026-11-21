"""Gives the app's bots their flop play from the solved flop library, with no new solving.

train_bots.py solved its pots from the turn (a flop-to-river tree is several GB and many minutes per flop),
so src/game/botPostflop.json has no flop rows and the bots fall back to hand-written defaults on the flop.
The flop library (scripts/flop_library.py: about 240 flops per matchup, every flop decision up to three
actions deep, with every hand's strategy and how often it gets there) already holds GTO's flop play, so this
boils it down into the same keys train_bots.py writes and puts them into the bots' table:

    flop | role | position | situation | texture | hand bucket  ->  [a, b, c, weight]

(open: check, small bet, big bet; facing a bet: fold, call, raise). The turn and river rows are kept as
they are. Buckets and textures come from train_bots.py, which the TypeScript side mirrors.

    python3 scripts/bots_from_library.py --library ~/flops --table ../src/game/botPostflop.json

--dry-run prints what it would write. Run on the machine that holds the library (or after
download_value_library.py), then commit src/game/botPostflop.json.
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from flipup_gto.cards import card_str, combo_cards  # noqa: E402
from flipup_gto.flop_library import SPOTS  # noqa: E402
from train_bots import board_texture, hand_bucket  # noqa: E402


def board_of(name: str) -> list[str]:
    return [name[i:i + 2] for i in range(0, 6, 2)]


def aggressor_pos(spot: str) -> str:
    """'ip', 'oop' or 'none': where the preflop raiser sits after the flop (player 0 is out of position)."""
    _, ip_seat, _, agg_seat = SPOTS[spot]
    if agg_seat is None:
        return "none"
    return "ip" if agg_seat == ip_seat else "oop"


def walk_lines(meta_nodes: dict):
    """Each stored decision with the state a bot would see there: whose turn, what's owed, raised or not.
    Street wagers are rebuilt from the actions on the way (an action's `amount` is the player's street
    wager after it)."""
    out = []

    def visit(tokens: list[int], wager: list[float], bettor: int | None, raised: bool):
        key = ".".join(map(str, tokens))
        node = meta_nodes.get(key)
        if node is None:
            return
        out.append((key, node, list(wager), raised))
        p = node["player"]
        for i, a in enumerate(node["actions"]):
            t = a["type"]
            if t == "fold":
                continue
            w = list(wager)
            nb, nr = bettor, raised
            if t == "call":
                w[p] = max(w)
            elif t in ("bet", "raise", "allin"):
                if bettor is not None and t != "bet":
                    nr = True
                w[p] = float(a["amount"])
                nb = p
            # A call or a second check closes the flop: the stored line ends there anyway.
            visit(tokens + [i], w, nb, nr)

    visit([], [0.0, 0.0], None, False)
    return out


def slots(node: dict, wager: list[float], facing: bool) -> list[int]:
    """Outcome slot for each action, as train_bots.classify_actions: open -> check, small (up to half pot), big;
    facing -> fold, call, raise."""
    p = node["player"]
    pot = float(node["pot"])
    out = []
    for a in node["actions"]:
        t = a["type"]
        if t in ("fold", "check"):
            out.append(0)
        elif t == "call":
            out.append(1)
        elif facing:
            out.append(2)
        else:
            added = float(a["amount"]) - wager[p]
            out.append(1 if pot > 0 and added / pot <= 0.5 and not a["all_in"] else 2)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--library", required=True, help="the flop library: <library>/<spot>/<flop>.npz")
    ap.add_argument("--table", default=os.path.join(os.path.dirname(__file__), "..", "..", "src", "game", "botPostflop.json"))
    ap.add_argument("--spots", default=",".join(SPOTS))
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    acc: dict[str, np.ndarray] = {}
    files = 0
    t0 = time.time()
    for spot in args.spots.split(","):
        role_of = aggressor_pos(spot)
        for path in sorted(glob.glob(os.path.join(os.path.expanduser(args.library), spot, "*.npz"))):
            name = os.path.basename(path)[:-4]
            board = board_of(name)
            tex = board_texture(board)
            d = np.load(path, allow_pickle=False)
            meta = json.loads(str(d["meta"]))
            combos = [d["combos0"].astype(np.int64), d["combos1"].astype(np.int64)]
            buckets = []
            for p in (0, 1):
                row = []
                for c in combos[p]:
                    a, b = combo_cards(int(c))
                    hole = [card_str(a), card_str(b)]
                    row.append(None if hole[0] in board or hole[1] in board else hand_bucket(hole, board))
                buckets.append(row)
            for key, node, wager, raised in walk_lines(meta["nodes"]):
                p = node["player"]
                pos = "oop" if p == 0 else "ip"
                to_call = max(wager) - wager[p]
                if to_call <= 1e-9:
                    situation = "open"
                elif raised:
                    situation = "raised"
                else:
                    before = float(node["pot"]) - to_call
                    situation = "small" if to_call <= 0.5 * max(before, 1e-9) + 1e-9 else "big"
                role = "agg" if role_of == pos else "def"
                base = f"flop|{role}|{pos}|{situation}|{tex}"
                strat = d[f"s:{key}"].astype(np.float64)  # [actions][combos]
                reach = d[f"r:{key}"].astype(np.float64)
                out = slots(node, wager, situation != "open")
                for i, bucket in enumerate(buckets[p]):
                    r = reach[i]
                    if bucket is None or r <= 1e-6:
                        continue
                    v = acc.setdefault(f"{base}|{bucket}", np.zeros(4))
                    for a, o in enumerate(out):
                        v[o] += r * strat[a][i]
                    v[3] += r
            files += 1
        print(f"{spot}: {files} flops so far, {len(acc)} keys, {time.time() - t0:.0f}s", flush=True)

    if not files:
        sys.exit("No flops found. Point --library at the folder that holds btn_bb/, sb_bb/ and the rest.")

    table_path = os.path.abspath(args.table)
    data = json.load(open(table_path))
    kept = {k: v for k, v in data["table"].items() if not k.startswith("flop|")}
    fresh = {}
    for key, v in sorted(acc.items()):
        if v[3] <= 0:
            continue
        fresh[key] = [round(float(x / v[3]), 3) for x in v[:3]] + [round(float(v[3]), 1)]
    data["table"] = {**kept, **fresh}
    data["flopSource"] = f"flop library, {files} solved flops"
    print(f"{len(fresh)} flop keys from {files} flops (turn and river: {len(kept)} kept)")
    for k in sorted(fresh)[:6]:
        print(" ", k, fresh[k])
    if args.dry_run:
        return
    json.dump(data, open(table_path, "w"), separators=(",", ":"))
    print(f"wrote {table_path}")


if __name__ == "__main__":
    main()

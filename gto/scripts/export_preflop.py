"""Exports a solved preflop game as one compact JSON file the app can read with no server.

    python3 scripts/export_preflop.py --players 6 --stack 100 --out ../public/gto/preflop-6p-100bb.json

The solution is solved here (a few minutes for 6-handed) unless --cache points at an .npz saved by
PreflopCache or by this script's --save. Only lines GTO really plays are kept: raises and limps
taken by at least MIN_FREQ of the range, and at most MAX_RAISES raises deep.

File layout (all numbers are integers to keep it small):
  classes   the 169 hand classes, in the order every table below uses
  names     seat names, first to act first
  er        each class's equity against a random hand, in permille
  nodes     { "<action indices joined by .>": node }, "" is the first player to act
  node      pos (seat), pot (bb*100), invested (bb*100 per seat),
            actions [{t: type, to: raise-to bb*100}],
            reach  [169] percent, strat [action][169] percent, ev [action][169] bb*100
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from flipup_gto.preflop import CLASS_COMBOS, CLASSES, PreflopSpot, tables  # noqa: E402

MIN_FREQ = 0.02
MAX_RAISES = 3
# Skip spots almost nobody gets to: under this share of all 1,326 starting hands reaching the node.
MIN_REACH = 0.02


def load_or_solve(spot: PreflopSpot, cache: str | None, save: str | None):
    if cache and os.path.exists(cache):
        d = np.load(cache)
        spot.engine.load_cumulative_strategy(d["cum"].astype(np.float32), int(d["iterations"]),
                                             d["regret"].astype(np.float32) if "regret" in d else None)
        return
    t = time.time()
    status = spot.solve(600, 0.002, 100)
    print(f"solved in {time.time() - t:.0f}s: {status}", flush=True)
    if save:
        np.savez_compressed(save, cum=spot.engine.cumulative_strategy().astype(np.float32),
                            regret=spot.engine.regrets().astype(np.float32), iterations=spot.engine.iterations)


def export(spot: PreflopSpot) -> dict:
    nodes: dict = {}

    def walk(path: list[int], raises: int):
        info = spot.engine.query(path)
        if info["terminal"]:
            return
        player = info["player"]
        actions = info["actions"]
        reach = info["reach"][player]
        weights = reach * CLASS_COMBOS
        total = float(weights.sum())
        if total <= 0 or (path and total / 1326.0 < MIN_REACH):
            return
        strat = info["strategy"]
        freq = [float((strat[i] * weights).sum() / total) for i in range(len(actions))]
        nodes[".".join(map(str, path))] = {
            "pos": int(player),
            "pot": int(round(info["pot"] * 100)),
            "invested": [int(round(x * 100)) for x in info["invested"]],
            "actions": [{"t": a["type"], "to": int(round(a.get("to", 0) * 100))} for a in actions],
            "reach": [int(round(float(x) * 100)) for x in reach],
            "strat": [[int(round(float(x) * 100)) for x in strat[i]] for i in range(len(actions))],
            "ev": [[int(round(float(x) * 100)) for x in info["action_ev"][i]] for i in range(len(actions))],
        }
        kinds = [a["type"] for a in actions]
        for i, a in enumerate(actions):
            aggressive = a["type"] in ("raise", "allin")
            if a["type"] != "fold":
                # Keep a line when its kind of action (all the raises and jams together, or the calls) is
                # really played, and always keep the first action of the kind: the drills name steps by
                # kind ("raise") and take the first match.
                want = ("raise", "allin") if aggressive else (a["type"],)
                played = sum(f for f, k in zip(freq, kinds) if k in want) >= MIN_FREQ
                first = next(j for j, k in enumerate(kinds) if k in want) == i
                if freq[i] < MIN_FREQ and not (played and first):
                    continue
            if aggressive and raises >= MAX_RAISES:
                continue
            walk(path + [i], raises + (1 if aggressive else 0))

    walk([], 0)
    eq, pairs, _ = tables(with_tensor=False)
    er = (eq * (pairs / pairs.sum(axis=1, keepdims=True))).sum(axis=1)
    return {"classes": CLASSES, "names": spot.names, "players": spot.num_players, "stack": spot.stack,
            "er": [int(round(float(x) * 1000)) for x in er], "nodes": nodes}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--players", type=int, default=6)
    ap.add_argument("--stack", type=float, default=100)
    ap.add_argument("--out", required=True)
    ap.add_argument("--cache")
    ap.add_argument("--save")
    args = ap.parse_args()
    spot = PreflopSpot(num_players=args.players, stack=args.stack)
    load_or_solve(spot, args.cache, args.save)
    data = export(spot)
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, "w") as f:
        json.dump(data, f, separators=(",", ":"))
    print(f"{len(data['nodes'])} nodes, {os.path.getsize(args.out) / 1024:.0f} KB -> {args.out}")


if __name__ == "__main__":
    main()

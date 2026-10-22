"""Pre-solve every strategically different flop for the common heads-up matchups.

Each flop is solved with the same tree Custom hand uses live (scripts don't need the app to be
running), and two things are saved per (matchup, flop):

  * the flop-street strategy of every hand at the first few decisions (who acts, the options, each
    combo's frequencies and EVs), so the coach can answer those spots instantly;
  * each hand class's EV share, equity and weight at the flop root for both players, which is what
    the preflop solver's realization model is fitted from (realization_dataset.py, at full scale).

Flops are the 1,755 suit-isomorphic classes, ordered so the most frequent come first. Work is split
with --shard i --of n, and a finished flop is never redone, so a stopped worker resumes.

    python3 scripts/flop_library.py --spots btn_bb,co_bb --shard 0 --of 4 --out /data/flops
"""
from __future__ import annotations

import argparse
import itertools
import json
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from flipup_gto.cards import card_str, hand_class  # noqa: E402
from flipup_gto.custom import explorer_sizing  # noqa: E402
from flipup_gto.preflop import CLASS_INDEX  # noqa: E402
from flipup_gto.review import PreflopCache, class_reach_to_combos  # noqa: E402
from flipup_gto.solver import PostflopSolver  # noqa: E402

F = "fold"
# name: (preflop line in the 6-max 100bb solution, IP seat, OOP seat, preflop aggressor seat or None).
# Seats: 0 UTG, 1 HJ, 2 CO, 3 BTN, 4 SB, 5 BB.
SPOTS = {
    "btn_bb": ([F, F, F, "raise", F, "call"], 3, 5, 3),
    "co_bb": ([F, F, "raise", F, F, "call"], 2, 5, 2),
    "utg_bb": (["raise", F, F, F, F, "call"], 0, 5, 0),
    "sb_bb": ([F, F, F, F, "raise", "call"], 5, 4, 4),
    "sb_limp": ([F, F, F, F, "call", "check"], 5, 4, None),
    "bb_btn_3bet": ([F, F, F, "raise", F, "raise", "call"], 3, 5, 5),
}
DEPTH = 3  # flop decisions stored: up to three actions into the street
ITERATIONS, TARGET = 200, 0.5


def canonical_flops():
    """[(cards, weight)] for the 1,755 suit-isomorphic flops, most frequent first."""
    seen: dict[tuple, int] = {}
    perms = list(itertools.permutations(range(4)))
    for flop in itertools.combinations(range(52), 3):
        key = min(tuple(sorted((c // 4) * 4 + p[c % 4] for c in flop)) for p in perms)
        seen[key] = seen.get(key, 0) + 1
    return sorted(seen.items(), key=lambda kv: (-kv[1], kv[0]))


def flop_name(cards) -> str:
    return "".join(card_str(c) for c in sorted(cards, reverse=True))


def node_record(node):
    p = node.player
    return {
        "player": p,
        "labels": node.labels,
        "actions": [{"type": a["type"], "amount": float(a["amount"]), "all_in": bool(a["all_in"])} for a in node.actions],
        "pot": float(node.pot),
        "strategy": np.asarray(node.info["strategy"], dtype=np.float16),
        "ev": np.asarray(node.info["action_ev"], dtype=np.float16),
        "reach": np.asarray(node.info[f"reach{p}"], dtype=np.float16),
    }


def solve_flop(spot, name, cards, out_dir):
    path, ip, oop, aggressor = SPOTS[name]
    info = spot.engine.query(spot.resolve(path))
    pot = float(info["pot"])
    stack = 100.0 - max(info["invested"])
    r_oop = class_reach_to_combos(info["reach"][oop]).astype(np.float32)
    r_ip = class_reach_to_combos(info["reach"][ip]).astype(np.float32)
    s = PostflopSolver(list(cards), pot, stack, r_oop, r_ip,
                       sizing=explorer_sizing("flop", oop_leads=aggressor != ip), compress=True)
    st = s.solve(ITERATIONS, TARGET, 25)
    root = s.node([])
    # Realization data at the root: per class EV share, equity and weight, both players.
    real = np.zeros((2, 3, 169), dtype=np.float64)
    for p in (0, 1):
        for i, c in enumerate(root.info[f"combos{p}"]):
            ci = CLASS_INDEX[hand_class(c)]
            w = root.info[f"weight{p}"][i]
            real[p, 0, ci] += w * root.info[f"ev{p}"][i] / pot
            real[p, 1, ci] += w * root.info[f"equity{p}"][i]
            real[p, 2, ci] += w
    # Flop decisions, breadth first, up to DEPTH actions deep (street changes end a line).
    nodes, meta = {}, {}
    queue = [[]]
    while queue:
        tokens = queue.pop(0)
        node = s.node(tokens, with_equity=False, with_ev=True)
        if node.type != "action":
            continue
        rec = node_record(node)
        key = ".".join(map(str, tokens))
        nodes[f"s:{key}"], nodes[f"e:{key}"], nodes[f"r:{key}"] = rec["strategy"], rec["ev"], rec["reach"]
        meta[key] = {k: rec[k] for k in ("player", "labels", "actions", "pot")}
        if len(tokens) < DEPTH:
            queue += [tokens + [i] for i in range(len(node.actions))]
    np.savez_compressed(
        os.path.join(out_dir, f"{flop_name(cards)}.npz"),
        combos0=np.asarray(root.info["combos0"], dtype=np.int16), combos1=np.asarray(root.info["combos1"], dtype=np.int16),
        equity0=np.asarray(root.info["equity0"], dtype=np.float16), equity1=np.asarray(root.info["equity1"], dtype=np.float16),
        realization=real.astype(np.float32), meta=json.dumps({"pot": pot, "stack": stack, "nodes": meta,
                                                              "iterations": st.iteration,
                                                              "exploitability_pct": st.exploitability_pct}),
        **nodes)
    return st


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--spots", default=",".join(SPOTS))
    ap.add_argument("--shard", type=int, default=0)
    ap.add_argument("--of", type=int, default=1)
    ap.add_argument("--out", default="/data/flops")
    ap.add_argument("--limit", type=int, default=0, help="stop after this many flops (testing)")
    args = ap.parse_args()
    log = lambda m: print(m, flush=True)  # noqa: E731
    cache_dir = os.environ.get("PREFLOP_CACHE", os.path.join(args.out, "preflop"))
    os.makedirs(cache_dir, exist_ok=True)
    t0 = time.time()
    spot = PreflopCache(cache_dir).get(6, 100)
    log(f"preflop ready in {time.time() - t0:.0f}s")
    flops = canonical_flops()[args.shard::args.of]
    if args.limit:
        flops = flops[:args.limit]
    names = args.spots.split(",")
    for name in names:
        os.makedirs(os.path.join(args.out, name), exist_ok=True)
    done = 0
    for k, (cards, weight) in enumerate(flops):
        for name in names:
            out_dir = os.path.join(args.out, name)
            if os.path.exists(os.path.join(out_dir, f"{flop_name(cards)}.npz")):
                continue
            t = time.time()
            try:
                st = solve_flop(spot, name, cards, out_dir)
                done += 1
                log(f"{name} {flop_name(cards)} ({k + 1}/{len(flops)}): {st.exploitability_pct:.2f}% in {time.time() - t:.0f}s")
            except Exception as e:  # keep going
                log(f"{name} {flop_name(cards)} failed: {type(e).__name__}: {e}")
    log(f"shard {args.shard}/{args.of} finished: {done} solved in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()

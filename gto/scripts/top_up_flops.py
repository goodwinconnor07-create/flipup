"""Top up the flop library to a share of the 1,755 flops in every matchup, counting what's already on disk.

flop_library.py works through the flops in a fixed shuffled order and skips a finished one by file name. This
script instead looks at how many each matchup already has and solves only the difference, taking flops in the
same shuffled order, so a matchup with 237 done gets 114 more to reach 351 (20%). Flops are solved one at a
time for every matchup that still needs it, so stopping early leaves the matchups about level. Safe to stop
(Ctrl+C) and start again: a finished flop is never redone.

    python3 scripts/top_up_flops.py --out ~/flops --share 0.2
    python3 scripts/top_up_flops.py --out ~/flops --spots btn_bb,co_bb,utg_bb --dry-run
"""
from __future__ import annotations

import argparse
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import flop_library as fl  # noqa: E402
from flipup_gto.review import PreflopCache  # noqa: E402


def have(out_dir: str, spot: str) -> set[str]:
    folder = os.path.join(out_dir, spot)
    if not os.path.isdir(folder):
        return set()
    return {f[:-4] for f in os.listdir(folder) if f.endswith(".npz")}


def plan(out_dir: str, spots: list[str], target: int):
    """{spot: [flop name, ...]} still to solve, in the shuffled order, plus the flop cards by name."""
    flops = fl.canonical_flops()
    cards = {fl.flop_name(c): c for c, _ in flops}
    todo = {}
    for spot in spots:
        done = have(out_dir, spot)
        need = max(0, target - len(done))
        todo[spot] = [n for n in (fl.flop_name(c) for c, _ in flops) if n not in done][:need]
    return todo, cards, [fl.flop_name(c) for c, _ in flops]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.expanduser("~/flops"), help="folder holding one sub-folder per matchup")
    ap.add_argument("--spots", default=",".join(fl.SPOTS))
    ap.add_argument("--share", type=float, default=0.2, help="share of the 1,755 flops each matchup should have")
    ap.add_argument("--max-hours", type=float, default=0, help="stop after this long (0 = no limit)")
    ap.add_argument("--dry-run", action="store_true", help="show what's done and what's left, solve nothing")
    args = ap.parse_args()
    log = lambda m: print(m, flush=True)  # noqa: E731

    spots = args.spots.split(",")
    for s in spots:
        if s not in fl.SPOTS:
            sys.exit(f"unknown matchup {s!r}; choose from {', '.join(fl.SPOTS)}")
    target = round(args.share * 1755)
    todo, cards, order = plan(args.out, spots, target)

    log(f"target: {target} flops per matchup ({args.share:.0%} of 1,755)")
    for s in spots:
        log(f"  {s:12s} {len(have(args.out, s)):4d} done, {len(todo[s]):4d} to solve")
    left = sum(len(v) for v in todo.values())
    log(f"{left} solves left")
    if args.dry_run or not left:
        return

    for s in spots:
        os.makedirs(os.path.join(args.out, s), exist_ok=True)
    t0 = time.time()
    cache_dir = os.environ.get("PREFLOP_CACHE", os.path.join(args.out, "preflop"))
    os.makedirs(cache_dir, exist_ok=True)
    log("loading the 6-handed preflop solve (about 17 minutes the first time, saved after that)...")
    spot_tree = PreflopCache(cache_dir).get(6, 100)
    log(f"preflop ready in {time.time() - t0:.0f}s")

    pending = {s: set(todo[s]) for s in spots}
    done = 0
    t1 = time.time()
    for name in order:
        if args.max_hours and time.time() - t0 > args.max_hours * 3600:
            log(f"stopping: --max-hours {args.max_hours} reached")
            break
        for s in spots:
            if name not in pending[s]:
                continue
            t = time.time()
            try:
                st = fl.solve_flop(spot_tree, s, cards[name], os.path.join(args.out, s))
            except Exception as e:  # keep going
                log(f"{s} {name} failed: {type(e).__name__}: {e}")
                continue
            done += 1
            pending[s].discard(name)
            eta = (time.time() - t1) / done * (left - done) / 3600
            log(f"{s} {name}: {st.exploitability_pct:.2f}% in {time.time() - t:.0f}s  "
                f"[{done}/{left} done, about {eta:.1f} hours left]")
    log(f"finished: {done} solved in {(time.time() - t0) / 3600:.1f} hours")


if __name__ == "__main__":
    main()

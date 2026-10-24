"""Top up the flop library to a share of the 1,755 flops in every matchup, counting what's already done.

flop_library.py works through the flops in a fixed shuffled order and skips a finished one by file name. This
script instead looks at how many each matchup already has and solves only the difference, taking flops in the
same shuffled order, so a matchup with 629 done gets 1,126 more to reach all 1,755. Flops are solved one at a
time for every matchup that still needs it, so stopping early leaves the matchups about level. Safe to stop
(Ctrl+C) and start again: a finished flop is never redone.

With --coach (or FLIPUP_COACH and FLIPUP_UPLOAD_TOKEN set), "done" also counts every flop already stored on the
coach, the preflop solution is downloaded from the coach when it has the same one (no 17-minute solve), and
before solving anything each matchup's starting ranges are checked against a flop the coach already holds, so
the new files match the library. upload_flops.py sends the results up.

    python3 scripts/top_up_flops.py --out ~/flops --spots sb_bb,sb_limp --coach https://flipup-gto.fly.dev
    python3 scripts/top_up_flops.py --out ~/flops --spots btn_bb,co_bb,utg_bb --dry-run
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import flop_library as fl  # noqa: E402
from flipup_gto.review import PreflopCache  # noqa: E402

def have(out_dir: str, spot: str) -> set[str]:
    folder = os.path.join(out_dir, spot)
    if not os.path.isdir(folder):
        return set()
    return {f[:-4] for f in os.listdir(folder) if f.endswith(".npz")}


def plan(out_dir: str, spots: list[str], target: int, remote: dict, reverse: bool = False):
    """{spot: [flop name, ...]} still to solve, in the shuffled order (last to first with `reverse`, so a second
    laptop helping on the same matchup works toward the first one instead of repeating it), plus the cards."""
    flops = fl.canonical_flops()
    cards = {fl.flop_name(c): c for c, _ in flops}
    order = [fl.flop_name(c) for c, _ in flops]
    if reverse:
        order.reverse()
    todo = {}
    for spot in spots:
        done = have(out_dir, spot) | set(remote.get(spot, ()))
        need = max(0, target - len(done))
        todo[spot] = [n for n in order if n not in done][:need]
    return todo, cards, order


def fetch_preflop(coach, cache: PreflopCache, listing: dict, log):
    """Download the coach's 6-handed 100bb solution when it's the one this code would make."""
    path = cache.file_for(6, 100)
    name = os.path.basename(path)
    if os.path.exists(path):
        return
    if name in listing.get("preflop", []):
        log(f"downloading the coach's preflop solution {name}...")
        coach.get_preflop(name, path)
    else:
        log(f"the coach has no {name} (it has {listing.get('preflop')}); solving preflop here instead")


def check_ranges(spot_tree, spot: str, ref: str):
    """Raise if this laptop's starting ranges for `spot` differ from the ones the stored flop `ref` used."""
    pot, stack, r_oop, r_ip = fl.start_ranges(spot_tree, spot)
    d = np.load(ref, allow_pickle=False)
    meta = json.loads(str(d["meta"]))
    if abs(meta["pot"] - pot) > 1e-3 or abs(meta["stack"] - stack) > 1e-3:
        raise ValueError(f"pot/stack {pot}/{stack} here, {meta['pot']}/{meta['stack']} in the library")
    seen = set()
    # A player's range only changes with their own actions, so their first decision still holds the start.
    for key, node in sorted(meta["nodes"].items(), key=lambda kv: len(kv[0])):
        p = node["player"]
        if p in seen:
            continue
        seen.add(p)
        mine = (r_oop if p == 0 else r_ip)[np.asarray(d[f"combos{p}"], dtype=np.int64)]
        stored = d[f"r:{key}"].astype(np.float32)
        worst = float(np.max(np.abs(mine - stored))) if len(stored) else 0.0
        if worst > 2e-3:
            raise ValueError(f"player {p}'s range differs from the library by up to {worst:.4f}")
    if seen != {0, 1}:
        raise ValueError(f"{ref} has no decision for both players")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.expanduser("~/flops"), help="folder holding one sub-folder per matchup")
    ap.add_argument("--spots", default=",".join(fl.SPOTS))
    ap.add_argument("--share", type=float, default=1.0, help="share of the 1,755 flops each matchup should have")
    ap.add_argument("--max-hours", type=float, default=0, help="stop after this long (0 = no limit)")
    ap.add_argument("--coach", default=os.environ.get("FLIPUP_COACH", ""),
                    help="coach URL: count, check against and download from what it already stores")
    ap.add_argument("--reverse", action="store_true",
                    help="work from the end of the flop order: for a second laptop helping on a matchup another one is doing")
    ap.add_argument("--dry-run", action="store_true", help="show what's done and what's left, solve nothing")
    args = ap.parse_args()
    log = lambda m: print(m, flush=True)  # noqa: E731

    spots = args.spots.split(",")
    for s in spots:
        if s not in fl.SPOTS:
            sys.exit(f"unknown matchup {s!r}; choose from {', '.join(fl.SPOTS)}")
    coach, listing = None, {"spots": {}, "preflop": []}
    if args.coach:
        from coach_client import Coach
        coach = Coach(args.coach)
        log(f"asking {coach.url} what it already has (it may take a minute to wake)...")
        listing = coach.listing()
    remote = listing["spots"]
    target = round(args.share * 1755)
    todo, cards, order = plan(args.out, spots, target, remote, args.reverse)

    log(f"target: {target} flops per matchup ({args.share:.0%} of 1,755)")
    for s in spots:
        log(f"  {s:12s} {len(have(args.out, s)):4d} here, {len(remote.get(s, ())):4d} on the coach, "
            f"{len(todo[s]):4d} to solve")
    left = sum(len(v) for v in todo.values())
    log(f"{left} solves left")
    if args.dry_run or not left:
        return

    for s in spots:
        os.makedirs(os.path.join(args.out, s), exist_ok=True)
    t0 = time.time()
    cache_dir = os.environ.get("PREFLOP_CACHE", os.path.join(args.out, "preflop"))
    os.makedirs(cache_dir, exist_ok=True)
    cache = PreflopCache(cache_dir)
    if coach:
        fetch_preflop(coach, cache, listing, log)
    log("loading the 6-handed preflop solve (about 17 minutes if it has to be solved, saved after that)...")
    spot_tree = cache.get(6, 100)
    log(f"preflop ready in {time.time() - t0:.0f}s")

    # Same starting ranges as the flops already in the library, or nothing gets solved.
    for s in spots:
        local = sorted(have(args.out, s))
        if remote.get(s):  # the coach's copy is the library
            ref = os.path.join(args.out, "check", s, f"{sorted(remote[s])[0]}.npz")
            if not os.path.exists(ref):
                coach.get_flop(s, sorted(remote[s])[0], ref)
        elif local:
            ref = os.path.join(args.out, s, f"{local[0]}.npz")
        else:
            log(f"{s}: nothing stored yet to check the ranges against")
            continue
        try:
            check_ranges(spot_tree, s, ref)
        except ValueError as e:
            sys.exit(f"{s}: this laptop's preflop solution doesn't match the library ({e}). Nothing was solved. "
                     f"Delete {cache_dir} and run again so it downloads the coach's copy.")
        log(f"{s}: starting ranges match the library ({os.path.basename(ref)[:-4]})")

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

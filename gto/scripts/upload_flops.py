"""Send solved flops from this laptop to the coach, now and then every --every seconds.

Each round asks the coach what it has and uploads only the rest, so nothing is sent twice and a round that
fails (no Wi-Fi, the coach asleep) is simply picked up by the next one. The coach never replaces a stored flop.
Only this laptop's matchups (--spots) are sent, and only files whose starting ranges match a flop the coach
already holds for that matchup, so an old file from a different preflop solve can't slip into the library.
Rounds are spaced out so the coach machine can go back to sleep in between (it bills while awake), and
--stop-when-idle stops after that many rounds in a row with nothing new, so a finished laptop stops waking it.

    python3 scripts/upload_flops.py --out ~/flops --spots sb_bb,sb_limp --once
    python3 scripts/upload_flops.py --out ~/flops --spots sb_bb,sb_limp --every 1800 --stop-when-idle 6
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from coach_client import Coach, Refused  # noqa: E402
from flipup_gto.flop_library import SPOTS  # noqa: E402


def start_ranges(path: str):
    """(pot, stack, {player: {combo: starting weight}}) of a stored flop. A player's range only changes with
    their own actions, so their first decision still holds the start; the weights don't depend on the board."""
    d = np.load(path, allow_pickle=False)
    meta = json.loads(str(d["meta"]))
    reach = {}
    for key, node in sorted(meta["nodes"].items(), key=lambda kv: len(kv[0])):
        p = node["player"]
        if p not in reach:
            reach[p] = dict(zip(d[f"combos{p}"].tolist(), d[f"r:{key}"].astype(np.float32).tolist()))
    return meta["pot"], meta["stack"], reach


def mismatch(path: str, ref) -> str | None:
    """Why the flop at `path` wasn't solved from the same ranges as `ref` (start_ranges of a stored flop)."""
    pot, stack, reach = start_ranges(path)
    if abs(pot - ref[0]) > 1e-3 or abs(stack - ref[1]) > 1e-3:
        return f"pot/stack {pot}/{stack}, the library has {ref[0]}/{ref[1]}"
    for p in (0, 1):
        common = reach.get(p, {}).keys() & ref[2].get(p, {}).keys()
        worst = max((abs(reach[p][c] - ref[2][p][c]) for c in common), default=1.0)
        if worst > 2e-3:
            return f"player {p}'s range differs from the library by up to {worst:.4f}"
    return None


def one_round(coach: Coach, out: str, spots: list[str], refs: dict, log) -> int:
    remote = coach.listing()["spots"]
    sent = 0
    for spot in spots:
        folder = os.path.join(out, spot)
        if not os.path.isdir(folder):
            continue
        stored = set(remote.get(spot, ()))
        new = sorted(f[:-4] for f in os.listdir(folder) if f.endswith(".npz") and f[:-4] not in stored)
        if new and spot not in refs and stored:
            ref = os.path.join(out, "check", spot, f"{sorted(stored)[0]}.npz")
            if not os.path.exists(ref):
                coach.get_flop(spot, sorted(stored)[0], ref)
            refs[spot] = start_ranges(ref)
        n = 0
        for flop in new:
            why = mismatch(os.path.join(folder, f"{flop}.npz"), refs[spot]) if spot in refs else None
            if why:
                log(f"{spot} {flop}: not sent, {why}")
                continue
            try:
                status = coach.put_flop(spot, flop, os.path.join(folder, f"{flop}.npz"))
            except Refused as e:  # a broken file: say so and carry on with the rest
                log(f"{spot} {flop}: {e}")
                continue
            n += status == "saved"
        if new:
            log(f"{spot}: uploaded {n} new, coach now has {len(stored) + n} of 1,755")
        sent += n
    return sent


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.expanduser("~/flops"))
    ap.add_argument("--coach", default=os.environ.get("FLIPUP_COACH", ""))
    ap.add_argument("--spots", required=True, help="this laptop's matchups, comma separated")
    ap.add_argument("--every", type=float, default=1800, help="seconds between rounds")
    ap.add_argument("--once", action="store_true", help="one round, then stop")
    ap.add_argument("--stop-when-idle", type=int, default=0, help="stop after this many empty rounds in a row")
    args = ap.parse_args()
    log = lambda m: print(time.strftime("%H:%M ") + m, flush=True)  # noqa: E731
    spots = args.spots.split(",")
    for s in spots:
        if s not in SPOTS:
            sys.exit(f"unknown matchup {s!r}; choose from {', '.join(SPOTS)}")
    coach = Coach(args.coach)
    refs: dict = {}
    idle = 0
    while True:
        try:
            n = one_round(coach, args.out, spots, refs, log)
            log(f"round done: {n} uploaded")
            idle = 0 if n else idle + 1
        except (ConnectionError, Refused) as e:
            log(f"round failed, trying again next time: {e}")
        if args.once:
            return
        if args.stop_when_idle and idle >= args.stop_when_idle:
            log(f"nothing new for {idle} rounds: stopping")
            return
        time.sleep(args.every)


if __name__ == "__main__":
    main()

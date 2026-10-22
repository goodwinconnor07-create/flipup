"""Pack quiz hands (scripts/quiz_hands.py output) into small files the phone downloads.

Writes <out>/index.json ({"count", "shards": [file names]}) and <out>/hands-NNN.json (a list of
hands). Each hand has all six seats, with the other four players' preflop folds put back in table
order, so the app can replay it like any recorded hand. Only options in the solved tree are kept (each
has GTO's frequency for the hand and its EV); `line` is the option the hand carries on with. Moves
with only one option in the tree play out on their own, and hands over before the flop are left out.

    python3 scripts/export_quiz.py quiz/*.jsonl --out ../public/gto/quiz
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import random

POS = ["UTG", "HJ", "CO", "BTN", "SB", "BB"]
PER_SHARD = 150


def with_folds(steps: list, matchup: set) -> list:
    """Preflop with everyone else's folds, in turn order (UTG first, round the table)."""
    out, seat, folded = [], 0, set()
    for s in steps:
        if s["street"] == "preflop":
            while seat != s["seat"]:
                if seat not in matchup and seat not in folded:
                    out.append({"street": "preflop", "seat": seat, "kind": "fold", "to_bb": 0})
                    folded.add(seat)
                seat = (seat + 1) % 6
            seat = (seat + 1) % 6
        out.append({"street": s["street"], "seat": s["seat"], "kind": s["kind"], "to_bb": s["to_bb"]})
    # Anyone still to act when the preflop betting ended folds at the end of it.
    end = sum(1 for x in out if x["street"] == "preflop")
    for k in range(6):
        if k not in matchup and k not in folded:
            out.insert(end, {"street": "preflop", "seat": k, "kind": "fold", "to_bb": 0})
            end += 1
    return out


def pack(h: dict) -> dict | None:
    hero, opp = h["hero"]["seat"], h["villain"]["seat"]
    steps = with_folds(h["steps"], {hero, opp})
    # Map each original step to its index in the new list (folds were inserted before it).
    orig = [i for i, s in enumerate(steps) if s["seat"] in (hero, opp)]
    decisions = []
    for d in h["decisions"]:
        opts = [o for o in d["options"] if o.get("ev_bb") is not None]
        step = h["steps"][d["step"]]
        if len(opts) < 2:
            continue  # only one move in the solved tree (a check where it never leads): not a question
        line = next((k for k, o in enumerate(opts) if o["kind"] == step["kind"] and abs(o["to_bb"] - step["to_bb"]) < 0.01), None)
        if line is None:
            return None
        decisions.append({
            "at": orig[d["step"]], "pot": d["pot_bb"], "toCall": d["to_call_bb"],
            "options": [{"label": o["label"], "kind": o["kind"], "to": o["to_bb"], "freq": round(o["freq"], 3),
                         "ev": round(o["ev_bb"], 2)} for o in opts],
            "line": line,
        })
    if not decisions or not h["board"]:
        return None  # nothing to answer, or over before the flop
    return {
        "id": h["id"], "hero": hero, "villain": opp, "cards": h["hero"]["cards"], "villainCards": h["villain"]["cards"],
        "board": h["board"], "steps": [[s["street"][0], s["seat"], s["kind"], s["to_bb"]] for s in steps],
        "decisions": decisions, "showdown": h["result"]["showdown"],
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    hands, seen = [], set()
    for f in sorted({q for p in args.files for q in glob.glob(p)}):
        for line in open(f):
            try:
                h = json.loads(line)
            except json.JSONDecodeError:
                continue  # a line cut off when a run was stopped
            p = pack(h)
            if p and p["id"] not in seen:
                seen.add(p["id"])
                hands.append(p)
    random.Random(0).shuffle(hands)
    os.makedirs(args.out, exist_ok=True)
    shards = []
    for i in range(0, len(hands), PER_SHARD):
        name = f"hands-{i // PER_SHARD:03d}.json"
        with open(os.path.join(args.out, name), "w") as fh:
            json.dump(hands[i:i + PER_SHARD], fh, separators=(",", ":"))
        shards.append(name)
    with open(os.path.join(args.out, "index.json"), "w") as fh:
        json.dump({"count": len(hands), "shards": shards}, fh)
    print(f"{len(hands)} hands in {len(shards)} files")


if __name__ == "__main__":
    main()

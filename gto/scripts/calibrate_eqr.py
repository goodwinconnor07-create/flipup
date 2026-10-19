"""Calibrate the preflop solver's equity-realization model with real postflop solves.

The preflop solver values a heads-up pot that sees a flop as a share of it:
    IP share for class pair (h, o) = equity(h, o) + adj_ip[h] - adj_oop[o]      (additive model)
so shares can exceed the pot (strong hands get paid on later streets) or fall well below equity
(weak hands out of position). This script measures what hands actually realize: it solves a
random sample of flops for a heads-up single-raised pot (BTN open vs BB call by default) with
ranges from the current preflop solution and records each class's EV share and equity at the
flop. It then fits adj_ip / adj_oop as smooth functions of hand features (strength, suitedness,
pairs, connectivity) by weighted least squares, so classes that barely appear in a range (e.g.
KK in the BB's calling range) get sensible values from similar hands instead of noise.

    python3 scripts/calibrate_eqr.py --flops 30 --out flipup_gto/data/eqr_calibration.json

Iterate (re-solve preflop with the new multipliers, recalibrate) until the numbers settle.
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

from flipup_gto.cards import NUM_COMBOS, card_str, hand_class  # noqa: E402
from flipup_gto.preflop import CLASS_INDEX, CLASSES, PreflopSpot, tables  # noqa: E402
from flipup_gto.solver import BetSizing, PostflopSolver, StreetSizing  # noqa: E402


def class_to_combos(r169):
    w = np.zeros(NUM_COMBOS, dtype=np.float32)
    for c in range(NUM_COMBOS):
        w[c] = r169[CLASS_INDEX[hand_class(c)]]
    return w


def measure(spot, path, flops, iterations, target, log):
    info = spot.engine.query(spot.resolve(path))
    n = spot.num_players
    ip_idx, oop_idx = n - 3 if n > 2 else 0, n - 1  # BTN, BB
    ip_r = class_to_combos(info["reach"][ip_idx])
    oop_r = class_to_combos(info["reach"][oop_idx])
    pot = info["pot"]
    stack = spot.config.stacks[0] - max(info["invested"])
    # Lean tree: realization at the flop root is robust to simplified later streets.
    street = {"flop": StreetSizing("50%", "60%"), "turn": StreetSizing("75%", "a"), "river": StreetSizing("75%", "a")}
    sizing = BetSizing(oop=dict(street), ip=dict(street), max_raises=1)
    acc = {p: {"ev": np.zeros(169), "eq": np.zeros(169), "w": np.zeros(169)} for p in (0, 1)}
    t0 = time.time()
    for k, flop in enumerate(flops):
        s = PostflopSolver(flop, pot, stack, oop_r, ip_r, sizing=sizing)
        st = s.solve(iterations, target, 25)
        root = s.node([])
        for p in (0, 1):
            combos = root.info[f"combos{p}"]
            w = root.info[f"weight{p}"]
            ev = root.info[f"ev{p}"]
            eq = root.info[f"equity{p}"]
            for i, c in enumerate(combos):
                ci = CLASS_INDEX[hand_class(c)]
                acc[p]["ev"][ci] += w[i] * ev[i] / pot
                acc[p]["eq"][ci] += w[i] * eq[i]
                acc[p]["w"][ci] += w[i]
        log(f"  flop {k + 1}/{len(flops)} {' '.join(card_str(c) for c in flop)}: expl {st.exploitability_pct:.2f}% "
            f"({time.time() - t0:.0f}s), OOP EV share {root.range_ev(0) / pot:.3f}, "
            f"equity {root.range_equity(0):.3f}")
    out = {}
    for p in (0, 1):
        w = acc[p]["w"]
        with np.errstate(invalid="ignore", divide="ignore"):
            share = np.where(w > 0, acc[p]["ev"] / w, np.nan)
            eq = np.where(w > 0, acc[p]["eq"] / w, np.nan)
        out[p] = {"share": share, "equity": eq, "weight": w}
    return out, info, ip_idx, oop_idx


def class_features():
    """Feature matrix (169 x k) describing each hand class."""
    eq, pairs, _ = tables(with_tensor=False)
    pn = pairs / pairs.sum(axis=1, keepdims=True)
    er = (eq * pn).sum(axis=1)
    rows = []
    for i, cls in enumerate(CLASSES):
        r1, r2 = "23456789TJQKA".index(cls[0]), "23456789TJQKA".index(cls[1])
        pair = 1.0 if r1 == r2 else 0.0
        suited = 1.0 if cls.endswith("s") else 0.0
        gap = abs(r1 - r2)
        conn = 0.0 if pair else max(0.0, (4 - gap) / 4.0)
        e = er[i] - 0.5
        rows.append([1.0, e, e * e, suited, pair, pair * e, conn, conn * suited, max(r1, r2) / 12.0])
    return np.array(rows)


def fit_additive(measured, info, ip_idx, oop_idx, rounds=50, ridge=1e-3):
    """Fit adj_ip, adj_oop (169 each) so that equity + adj_ip[h] - mean(adj_oop) matches IP shares, etc."""
    X = class_features()
    eq, pairs, _ = tables(with_tensor=False)
    r_ip, r_oop = info["reach"][ip_idx], info["reach"][oop_idx]
    w_ip = np.nan_to_num(measured[1]["weight"])
    w_oop = np.nan_to_num(measured[0]["weight"])
    sh_ip, eq_ip = np.nan_to_num(measured[1]["share"]), np.nan_to_num(measured[1]["equity"])
    sh_oop, eq_oop = np.nan_to_num(measured[0]["share"]), np.nan_to_num(measured[0]["equity"])
    # Opponent-range weights per class (card removal aware) for averaging the other side's adjustment.
    W_vs_oop = pairs * r_oop[None, :]
    W_vs_oop /= np.maximum(W_vs_oop.sum(1, keepdims=True), 1e-12)
    W_vs_ip = pairs * r_ip[None, :]
    W_vs_ip /= np.maximum(W_vs_ip.sum(1, keepdims=True), 1e-12)

    def wls(target, w):
        A = X * w[:, None]
        beta = np.linalg.solve(X.T @ A + ridge * np.eye(X.shape[1]), A.T @ target)
        return X @ beta

    adj_ip = np.zeros(169)
    adj_oop = np.zeros(169)
    for _ in range(rounds):
        adj_ip = wls(sh_ip - eq_ip + W_vs_oop @ adj_oop, w_ip)
        adj_oop = wls(sh_oop - eq_oop + W_vs_ip @ adj_ip, w_oop)
    pred_ip = eq_ip + adj_ip - W_vs_oop @ adj_oop
    pred_oop = eq_oop + adj_oop - W_vs_ip @ adj_ip
    err_ip = float(np.sum(w_ip * np.abs(pred_ip - sh_ip)) / np.sum(w_ip))
    err_oop = float(np.sum(w_oop * np.abs(pred_oop - sh_oop)) / np.sum(w_oop))
    return adj_ip, adj_oop, err_ip, err_oop


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--players", type=int, default=6)
    ap.add_argument("--stack", type=float, default=100)
    ap.add_argument("--flops", type=int, default=30)
    ap.add_argument("--iterations", type=int, default=250)
    ap.add_argument("--target", type=float, default=0.5)
    ap.add_argument("--preflop-iterations", type=int, default=600)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--calibration", default=None, help="existing calibration to start the preflop solve from")
    ap.add_argument("--from-raw", default=None, help="refit from a previous output's raw measurements")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "flipup_gto", "data",
                                                  "eqr_calibration.json"))
    args = ap.parse_args()
    log = lambda m: print(m, flush=True)  # noqa: E731

    opts = {}
    if args.calibration:
        cal = json.load(open(args.calibration))
        opts = {"eqr_model": 1 if cal.get("model") == "additive" else 0,
                "class_eqr_ip": [cal["ip"][c] for c in CLASSES], "class_eqr_oop": [cal["oop"][c] for c in CLASSES]}
    spot = PreflopSpot(num_players=args.players, stack=args.stack, options=opts, use_calibration=False)
    log(f"solving preflop ({spot.engine.num_nodes} nodes)...")
    spot.solve(args.preflop_iterations, 0.002, 100)
    path = ["fold"] * (args.players - 3) + ["raise", "fold", "call"]  # BTN opens, SB folds, BB calls

    rng = random.Random(args.seed)
    deck = list(range(52))
    flops = [sorted(rng.sample(deck, 3), reverse=True) for _ in range(args.flops)]
    if args.from_raw:
        raw = json.load(open(args.from_raw))
        measured = {int(p): {k: np.array(v, dtype=float) for k, v in d.items()} for p, d in raw["measured"].items()}
        info = spot.engine.query(spot.resolve(path))
        ip_idx, oop_idx = (args.players - 3 if args.players > 2 else 0), args.players - 1
    else:
        log(f"measuring realization on {len(flops)} flops...")
        measured, info, ip_idx, oop_idx = measure(spot, path, flops, args.iterations, args.target, log)
    adj_ip, adj_oop, e_ip, e_oop = fit_additive(measured, info, ip_idx, oop_idx)
    log(f"fit error (weighted mean abs share): IP {e_ip:.4f}, OOP {e_oop:.4f}")

    def eqr(p):
        sh, eqv = measured[p]["share"], measured[p]["equity"]
        return {CLASSES[i]: (None if not np.isfinite(sh[i]) or not eqv[i] > 0 else round(float(sh[i] / eqv[i]), 4))
                for i in range(169)}

    def rng_eqr(p):
        w = np.nan_to_num(measured[p]["weight"])
        return float(np.sum(np.nan_to_num(measured[p]["share"]) * w) / np.sum(np.nan_to_num(measured[p]["equity"]) * w))

    result = {
        "model": "additive",
        "scenario": f"{args.players}-max {args.stack:g}bb, BTN open vs BB call, {len(flops)} flops",
        "ip": {CLASSES[i]: round(float(adj_ip[i]), 5) for i in range(169)},
        "oop": {CLASSES[i]: round(float(adj_oop[i]), 5) for i in range(169)},
        "measured_eqr_ip": eqr(1), "measured_eqr_oop": eqr(0),
        "range_eqr_ip": rng_eqr(1), "range_eqr_oop": rng_eqr(0),
        "measured": {str(p): {k: [None if not np.isfinite(x) else float(x) for x in v] for k, v in d.items()}
                     for p, d in measured.items()},
    }
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    json.dump(result, open(args.out, "w"), indent=1)
    log(f"range EQR: IP {result['range_eqr_ip']:.3f}, OOP {result['range_eqr_oop']:.3f}; saved {args.out}")
    for cls in ("AA", "KK", "AKs", "AKo", "KQs", "T9s", "76s", "A5s", "K9o", "J8o", "72o", "22", "Q4s", "T6o"):
        i = CLASSES.index(cls)
        log(f"  {cls}: measured EQR IP {result['measured_eqr_ip'].get(cls)} OOP "
            f"{result['measured_eqr_oop'].get(cls)} -> adj IP {adj_ip[i]:+.3f} OOP {adj_oop[i]:+.3f}")


if __name__ == "__main__":
    main()

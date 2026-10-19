"""Calibrate the preflop solver's equity-realization model with real postflop solves.

The preflop solver values a pot that sees a flop as a realized share of it:
    IP share vs a class pair = e*Rip*m_ip[h] / (e*Rip*m_ip[h] + (1-e)*Roop*m_oop[o]).
This script measures what hands actually realize. It solves a random sample of flops for a
heads-up single-raised pot (BTN open vs BB call by default) with ranges from the current
preflop solution, records each class's EV share and raw equity at the flop, then fits the
per-class multipliers m_ip / m_oop so the model reproduces the measured shares.

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
    sizing = BetSizing(oop={"flop": StreetSizing("33%, 75%", "60%"), "turn": StreetSizing("75%", "60%"),
                            "river": StreetSizing("75%", "60%")},
                       ip={"flop": StreetSizing("33%, 75%", "60%"), "turn": StreetSizing("75%", "60%"),
                           "river": StreetSizing("75%", "60%")}, max_raises=1)
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


def fit_multipliers(measured, info, ip_idx, oop_idx, base_ip, base_oop, rounds=200):
    eq, pairs, _ = tables(with_tensor=False)
    r_ip = info["reach"][ip_idx]
    r_oop = info["reach"][oop_idx]
    m_ip = np.ones(169)
    m_oop = np.ones(169)
    tgt_ip = measured[1]["share"]
    tgt_oop = measured[0]["share"]
    ok_ip = measured[1]["weight"] > 0
    ok_oop = measured[0]["weight"] > 0
    for _ in range(rounds):
        a = eq * base_ip * m_ip[:, None]
        b = (1 - eq) * base_oop * m_oop[None, :]
        S = a / np.maximum(a + b, 1e-12)  # IP class h vs OOP class o
        w_ip = pairs * r_oop[None, :]
        pred_ip = (S * w_ip).sum(1) / np.maximum(w_ip.sum(1), 1e-12)
        w_oop = pairs * r_ip[None, :]
        pred_oop = ((1 - S.T) * w_oop).sum(1) / np.maximum(w_oop.sum(1), 1e-12)
        upd_ip = np.where(ok_ip, np.clip(tgt_ip, 1e-4, None) / np.clip(pred_ip, 1e-4, None), 1.0)
        upd_oop = np.where(ok_oop, np.clip(tgt_oop, 1e-4, None) / np.clip(pred_oop, 1e-4, None), 1.0)
        m_ip *= upd_ip ** 0.5
        m_oop *= upd_oop ** 0.5
        m_ip = np.clip(m_ip, 0.2, 5.0)
        m_oop = np.clip(m_oop, 0.2, 5.0)
    err_ip = np.nanmean(np.abs(pred_ip - tgt_ip)[ok_ip])
    err_oop = np.nanmean(np.abs(pred_oop - tgt_oop)[ok_oop])
    return m_ip, m_oop, err_ip, err_oop


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
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "flipup_gto", "data",
                                                  "eqr_calibration.json"))
    args = ap.parse_args()
    log = lambda m: print(m, flush=True)  # noqa: E731

    opts = {}
    if args.calibration:
        cal = json.load(open(args.calibration))
        opts = {"class_eqr_ip": [cal["ip"][c] for c in CLASSES], "class_eqr_oop": [cal["oop"][c] for c in CLASSES]}
    spot = PreflopSpot(num_players=args.players, stack=args.stack, options=opts, use_calibration=False)
    log(f"solving preflop ({spot.engine.num_nodes} nodes)...")
    spot.solve(args.preflop_iterations, 0.002, 100)
    path = ["fold"] * (args.players - 3) + ["raise", "fold", "call"]  # BTN opens, SB folds, BB calls

    rng = random.Random(args.seed)
    deck = list(range(52))
    flops = [sorted(rng.sample(deck, 3), reverse=True) for _ in range(args.flops)]
    log(f"measuring realization on {len(flops)} flops...")
    measured, info, ip_idx, oop_idx = measure(spot, path, flops, args.iterations, args.target, log)
    base_ip = spot.config.eqr_ip[3]
    base_oop = spot.config.eqr_oop[3]
    m_ip, m_oop, e_ip, e_oop = fit_multipliers(measured, info, ip_idx, oop_idx, base_ip, base_oop)
    log(f"fit error (mean abs share): IP {e_ip:.4f}, OOP {e_oop:.4f}")

    def eqr(p):
        sh, eqv = measured[p]["share"], measured[p]["equity"]
        return {CLASSES[i]: (None if not np.isfinite(sh[i]) or eqv[i] <= 0 else round(float(sh[i] / eqv[i]), 4))
                for i in range(169)}

    result = {
        "scenario": f"{args.players}-max {args.stack:g}bb, BTN open vs BB call, {len(flops)} flops",
        "base_ip": base_ip, "base_oop": base_oop,
        "ip": {CLASSES[i]: round(float(m_ip[i]), 4) for i in range(169)},
        "oop": {CLASSES[i]: round(float(m_oop[i]), 4) for i in range(169)},
        "measured_eqr_ip": eqr(1), "measured_eqr_oop": eqr(0),
        "range_eqr_ip": float(np.nansum(measured[1]["share"] * measured[1]["weight"]) /
                              np.nansum(measured[1]["equity"] * measured[1]["weight"])),
        "range_eqr_oop": float(np.nansum(measured[0]["share"] * measured[0]["weight"]) /
                               np.nansum(measured[0]["equity"] * measured[0]["weight"])),
    }
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    json.dump(result, open(args.out, "w"), indent=1)
    log(f"range EQR: IP {result['range_eqr_ip']:.3f}, OOP {result['range_eqr_oop']:.3f}; saved {args.out}")
    for cls in ("AA", "AKs", "AKo", "KQs", "T9s", "76s", "A5s", "K9o", "J8o", "72o", "22", "Q4s", "T6o"):
        log(f"  {cls}: measured EQR IP {result['measured_eqr_ip'].get(cls)} OOP {result['measured_eqr_oop'].get(cls)}"
            f" -> multipliers IP {result['ip'][cls]} OOP {result['oop'][cls]}")


if __name__ == "__main__":
    main()

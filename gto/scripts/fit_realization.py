"""Fit the preflop realization model to the per-class data from realization_dataset.py.

Model (IP's share of a heads-up flop pot for IP class h against OOP class o):

    S(h, o) = equity(h, o) + a_ip[h] - a_oop[o] + k_ip[h] * d[o] - k_oop[o] * d[h]

a_* are the additive adjustments the solver already uses (hand-feature model, as calibrate_eqr.py);
the k * d terms are new: d is the opponent class's raw strength (equity vs a random hand - 0.5) and k
a hand-feature model, so how well a hand realizes can depend on how strong the hands it meets are
(dominated offsuit hands do worse against strong ranges; pairs and suited hands do better).
Fits on even-numbered flops and reports the error on odd ones, against the current calibration.

    python3 scripts/fit_realization.py [--interaction] [--write]
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from calibrate_eqr import class_features  # noqa: E402
from flipup_gto.preflop import CLASSES, load_calibration, tables  # noqa: E402

DATA = os.path.join(os.path.dirname(__file__), "..", "research", "realization")


def design():
    """Per-class feature blocks: additive A_ip, A_oop, interaction K, and strength d."""
    X0 = class_features()
    e = X0[:, 1]
    suited, pair, conn, high = X0[:, 3], X0[:, 4], X0[:, 6], X0[:, 8]
    off = 1 - suited - pair
    X = np.column_stack([e, suited, pair, conn, high, suited * e])
    weakoff = off * np.clip(0.05 - e, 0, None)
    one, zero = np.ones((169, 1)), np.zeros((169, 1))
    A_ip = np.hstack([X, one, zero])
    A_oop = np.hstack([X, zero, weakoff[:, None]])
    K = np.column_stack([np.ones(169), off, pair, suited * conn, e, off * high])
    return A_ip, A_oop, K, e


def load(spot_files, part):
    rows = []
    for path in spot_files:
        d = np.load(path)
        n = len(d["flop"])
        sel = [i for i in range(n) if (part is None or i % 2 == part)]
        if not sel:
            continue
        ev, eq, w = d["ev"][sel].sum(0), d["eq"][sel].sum(0), d["w"][sel].sum(0)
        rows.append({"name": os.path.basename(path)[:-4], "r_oop": d["r_oop"], "r_ip": d["r_ip"],
                     "share": np.where(w > 0, ev / np.maximum(w, 1e-12), 0), "eq": np.where(w > 0, eq / np.maximum(w, 1e-12), 0),
                     "w": w})
    return rows


def blocks(row, interaction):
    """Linear system rows for one spot: (M, t, weight) for IP classes then OOP classes."""
    eqm, pairs, _ = tables(with_tensor=False)
    A_ip, A_oop, K, d = design()
    W_ip = pairs * row["r_oop"][None, :]           # IP class h vs OOP classes
    W_ip /= np.maximum(W_ip.sum(1, keepdims=True), 1e-12)
    W_oop = pairs * row["r_ip"][None, :]           # OOP class o vs IP classes
    W_oop /= np.maximum(W_oop.sum(1, keepdims=True), 1e-12)
    # IP: share - eq = a_ip[h] - E[a_oop[o]] + k_ip[h] E[d[o]] - E[k_oop[o]] d[h]
    M_ip = [A_ip, -(W_ip @ A_oop)]
    # OOP: share - eq = a_oop[o] - E[a_ip[h]] + k_oop[o] E[d[h]] - E[k_ip[h]] d[o]
    M_oop = [-(W_oop @ A_ip), A_oop]
    if interaction:
        Ed_ip, Ed_oop = W_ip @ d, W_oop @ d
        M_ip += [K * Ed_ip[:, None], -(W_ip @ K) * d[:, None]]
        M_oop += [-(W_oop @ K) * d[:, None], K * Ed_oop[:, None]]
    # a_ip and a_oop share parameters (one hand model, as calibrate_eqr): sum the two A blocks.
    def join(parts):
        out = parts[0] + parts[1]
        if interaction:
            out = np.hstack([out, parts[2], parts[3]])
        return out
    return [(join(M_ip), row["share"][1] - row["eq"][1], row["w"][1]),
            (join(M_oop), row["share"][0] - row["eq"][0], row["w"][0])]


def solve(rows, interaction, ridge=1e-4):
    A, t, w = [], [], []
    for r in rows:
        for M, tt, ww in blocks(r, interaction):
            A.append(M); t.append(tt); w.append(ww / max(ww.sum(), 1e-12))
    A, t, w = np.vstack(A), np.concatenate(t), np.concatenate(w)
    Aw = A * w[:, None]
    return np.linalg.solve(A.T @ Aw + ridge * np.eye(A.shape[1]), Aw.T @ t)


def error(rows, theta, interaction):
    out = {}
    for r in rows:
        errs = []
        for M, tt, ww in blocks(r, interaction):
            errs.append(float(np.sum(ww * np.abs(M @ theta - tt)) / max(ww.sum(), 1e-12)))
        out[r["name"]] = errs
    return out


def current_error(rows):
    """Error of the calibration in use (additive, no interaction)."""
    eqm, pairs, _ = tables(with_tensor=False)
    cal = load_calibration()
    a_ip = np.array([cal["ip"][c] for c in CLASSES])
    a_oop = np.array([cal["oop"][c] for c in CLASSES])
    out = {}
    for r in rows:
        W_ip = pairs * r["r_oop"][None, :]; W_ip /= np.maximum(W_ip.sum(1, keepdims=True), 1e-12)
        W_oop = pairs * r["r_ip"][None, :]; W_oop /= np.maximum(W_oop.sum(1, keepdims=True), 1e-12)
        p_ip = a_ip - W_ip @ a_oop
        p_oop = a_oop - W_oop @ a_ip
        e_ip = np.sum(r["w"][1] * np.abs(p_ip - (r["share"][1] - r["eq"][1]))) / r["w"][1].sum()
        e_oop = np.sum(r["w"][0] * np.abs(p_oop - (r["share"][0] - r["eq"][0]))) / r["w"][0].sum()
        out[r["name"]] = [float(e_ip), float(e_oop)]
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true", help="write the fit (all flops) to data/eqr_calibration.json")
    args = ap.parse_args()
    files = sorted(glob.glob(os.path.join(DATA, "*.npz")))
    train, test = load(files, 0), load(files, 1)
    print("spots:", [(r["name"]) for r in train])
    cur = current_error(test)
    th_a = solve(train, False)
    th_i = solve(train, True)
    ea, ei = error(test, th_a, False), error(test, th_i, True)
    print("held-out mean abs error of (share - equity), IP / OOP:")
    for name in cur:
        print(f"  {name:8s} current {cur[name][0]:.4f}/{cur[name][1]:.4f} | refit additive {ea[name][0]:.4f}/{ea[name][1]:.4f}"
              f" | with interaction {ei[name][0]:.4f}/{ei[name][1]:.4f}")
    if args.write:
        th = solve(load(files, None), True)
        A_ip, A_oop, K, d = design()
        na = A_ip.shape[1]
        a_ip, a_oop = A_ip @ th[:na], A_oop @ th[:na]
        k_ip, k_oop = K @ th[na:na + K.shape[1]], K @ th[na + K.shape[1]:]
        path = os.path.join(os.path.dirname(__file__), "..", "flipup_gto", "data", "eqr_calibration.json")
        old = json.load(open(path))
        old.update({"model": "additive", "scenario": f"interaction fit, {', '.join(r['name'] for r in train)}",
                    "ip": {c: round(float(a_ip[i]), 4) for i, c in enumerate(CLASSES)},
                    "oop": {c: round(float(a_oop[i]), 4) for i, c in enumerate(CLASSES)},
                    "k_ip": {c: round(float(k_ip[i]), 4) for i, c in enumerate(CLASSES)},
                    "k_oop": {c: round(float(k_oop[i]), 4) for i, c in enumerate(CLASSES)},
                    "d": {c: round(float(d[i]), 4) for i, c in enumerate(CLASSES)}})
        json.dump(old, open(path, "w"), indent=1)
        print("wrote", path)


if __name__ == "__main__":
    main()

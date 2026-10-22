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
    # Pairs get their own strength slope: small pairs realize through sets, big ones through value.
    X = np.column_stack([e, suited, pair, conn, high, suited * e, pair * e, e * e])
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


def load_flop_library(root, part):
    """Rows like load() from scripts/flop_library.py output (root/<spot>/<flop>.npz), flops weighted
    by how often they're dealt. Ranges come from the cached preflop solution the library used."""
    from flop_library import SPOTS, canonical_flops, flop_name
    from flipup_gto.review import PreflopCache
    weight = {flop_name(c): w for c, w in canonical_flops()}
    spot = PreflopCache(os.path.join(os.path.dirname(__file__), "..", "flipup_gto", "data", "cache")).get(6, 100)
    rows = []
    for name in sorted(os.listdir(root)):
        files = sorted(glob.glob(os.path.join(root, name, "*.npz")))
        if name not in SPOTS or not files:
            continue
        # Only the unbroken start of the shuffled flop order: a fair sample of boards. (Extra flops,
        # e.g. the low ones the first runs solved in card order, would skew it.)
        have = {os.path.basename(f)[:-4] for f in files}
        prefix = []
        for c, _ in canonical_flops():
            if flop_name(c) not in have:
                break
            prefix.append(os.path.join(root, name, f"{flop_name(c)}.npz"))
        files = prefix
        sel = [f for i, f in enumerate(files) if part is None or i % 2 == part]
        acc = np.zeros((2, 3, 169))
        for f in sel:
            acc += weight[os.path.basename(f)[:-4]] * np.load(f)["realization"]
        ev, eq, w = acc[:, 0], acc[:, 1], acc[:, 2]
        path, ip, oop, _ = SPOTS[name]
        info = spot.engine.query(spot.resolve(path))
        rows.append({"name": f"{name} ({len(sel)} flops)", "r_oop": np.asarray(info["reach"][oop], float),
                     "r_ip": np.asarray(info["reach"][ip], float),
                     "share": np.where(w > 0, ev / np.maximum(w, 1e-12), 0),
                     "eq": np.where(w > 0, eq / np.maximum(w, 1e-12), 0), "w": w})
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


GROUPS = {"pair": lambda c: len(c) == 2, "suited": lambda c: c.endswith("s"), "offsuit": lambda c: c.endswith("o")}


def group_bias(rows, predict):
    """Per spot and player: weighted mean (predicted - measured) of share - equity by hand type."""
    out = {}
    for r in rows:
        preds = predict(r)
        for p, (pred, tgt, w) in enumerate(preds):
            for g, f in GROUPS.items():
                idx = [i for i, c in enumerate(CLASSES) if f(c)]
                ww = w[idx]
                out[(r["name"], ("IP", "OOP")[p], g)] = float(np.sum(ww * (pred[idx] - tgt[idx])) / max(ww.sum(), 1e-12))
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
    ap.add_argument("--interaction", action="store_true", help="with --write: include the hand-vs-hand terms")
    ap.add_argument("--flops", default="", help="fit from scripts/flop_library.py output in this folder")
    args = ap.parse_args()
    files = sorted(glob.glob(os.path.join(DATA, "*.npz")))
    if args.flops:
        load_rows = lambda part: load_flop_library(args.flops, part)  # noqa: E731
    else:
        load_rows = lambda part: load(files, part)  # noqa: E731
    train, test = load_rows(0), load_rows(1)
    print("spots:", [(r["name"]) for r in train])
    cur = current_error(test)
    th_a = solve(train, False)
    th_i = solve(train, True)
    ea, ei = error(test, th_a, False), error(test, th_i, True)
    print("held-out mean abs error of (share - equity), IP / OOP:")
    for name in cur:
        print(f"  {name:8s} current {cur[name][0]:.4f}/{cur[name][1]:.4f} | refit additive {ea[name][0]:.4f}/{ea[name][1]:.4f}"
              f" | with interaction {ei[name][0]:.4f}/{ei[name][1]:.4f}")
    eqm, pairs, _ = tables(with_tensor=False)
    cal = load_calibration()
    a_ip0 = np.array([cal["ip"][c] for c in CLASSES]); a_oop0 = np.array([cal["oop"][c] for c in CLASSES])

    def pred_current(r):
        W_ip = pairs * r["r_oop"][None, :]; W_ip /= np.maximum(W_ip.sum(1, keepdims=True), 1e-12)
        W_oop = pairs * r["r_ip"][None, :]; W_oop /= np.maximum(W_oop.sum(1, keepdims=True), 1e-12)
        return [(a_ip0 - W_ip @ a_oop0, r["share"][1] - r["eq"][1], r["w"][1]),
                (a_oop0 - W_oop @ a_ip0, r["share"][0] - r["eq"][0], r["w"][0])]

    def pred_fit(theta, inter):
        return lambda r: [(M @ theta, t, w) for M, t, w in blocks(r, inter)]

    gc, ga, gi = group_bias(test, pred_current), group_bias(test, pred_fit(th_a, False)), group_bias(test, pred_fit(th_i, True))
    print("held-out bias by hand type (predicted - measured share; + = model too generous):")
    for k in gc:
        print(f"  {k[0]:8s} {k[1]:3s} {k[2]:7s} current {gc[k]:+.3f} | additive {ga[k]:+.3f} | interaction {gi[k]:+.3f}")
    if args.write:
        th = solve(load_rows(None), args.interaction)
        A_ip, A_oop, K, d = design()
        na, nk = A_ip.shape[1], K.shape[1]
        a_ip, a_oop = A_ip @ th[:na], A_oop @ th[:na]
        path = os.path.join(os.path.dirname(__file__), "..", "flipup_gto", "data", "eqr_calibration.json")
        old = json.load(open(path))
        for k in ("k_ip", "k_oop", "d"):
            old.pop(k, None)
        old.update({"model": "additive",
                    "scenario": f"multi-spot fit{' + interaction' if args.interaction else ''}: "
                                f"{', '.join(r['name'] for r in train)}",
                    "ip": {c: round(float(a_ip[i]), 4) for i, c in enumerate(CLASSES)},
                    "oop": {c: round(float(a_oop[i]), 4) for i, c in enumerate(CLASSES)}})
        if args.interaction:
            k_ip, k_oop = K @ th[na:na + nk], K @ th[na + nk:]
            old.update({"k_ip": {c: round(float(k_ip[i]), 4) for i, c in enumerate(CLASSES)},
                        "k_oop": {c: round(float(k_oop[i]), 4) for i, c in enumerate(CLASSES)},
                        "d": {c: round(float(d[i]), 4) for i, c in enumerate(CLASSES)}})
        json.dump(old, open(path, "w"), indent=1)
        print("wrote", path)

if __name__ == "__main__":
    main()

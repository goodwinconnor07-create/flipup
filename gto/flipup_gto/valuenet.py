"""Value networks (DeepStack-style leaf estimates), stage 1: the river.

A river subgame's equilibrium depends mostly on how the two ranges spread over hand strength on that
board, and on the stack-to-pot ratio. So a range is described by its mass in K equal-count strength
buckets (every live combo on the board ranked by showdown strength), and the network maps
(both players' bucket masses, SPR) to each bucket's value: a hand's EV as a fraction of the pot.
Card removal is ignored by the features; the training labels come from exact solves, so it is
averaged in.
"""
from __future__ import annotations

import numpy as np
import json

from . import _engine
from .cards import NUM_COMBOS, combo_cards

K = 64  # strength buckets


def strength_ranks(board) -> np.ndarray:
    """Each combo's showdown-strength percentile on a 5-card board in [0, 1] (NaN when it uses a board card).

    Ties share their mid-rank, so hands that play the board get the same value."""
    bmask = set(board)
    s = np.full(NUM_COMBOS, np.nan)
    live, vals = [], []
    for c in range(NUM_COMBOS):
        a, b = combo_cards(c)
        if a in bmask or b in bmask:
            continue
        live.append(c)
        vals.append(_engine.evaluate(list(board) + [a, b]))
    vals = np.asarray(vals, dtype=np.float64)
    order = np.argsort(vals, kind="stable")
    sorted_vals = vals[order]
    ranks = np.empty(len(vals))
    i = 0
    while i < len(vals):
        j = i
        while j + 1 < len(vals) and sorted_vals[j + 1] == sorted_vals[i]:
            j += 1
        ranks[order[i:j + 1]] = (i + j) / 2
        i = j + 1
    s[np.asarray(live)] = (ranks + 0.5) / len(vals)
    return s


def bucket_of(ranks: np.ndarray) -> np.ndarray:
    """Bucket index per combo (-1 for blocked combos)."""
    out = np.full(len(ranks), -1, dtype=np.int64)
    ok = ~np.isnan(ranks)
    out[ok] = np.minimum((ranks[ok] * K).astype(np.int64), K - 1)
    return out


def bucket_mass(rng: np.ndarray, buckets: np.ndarray) -> np.ndarray:
    """A 1326 range as normalized mass per strength bucket."""
    ok = buckets >= 0
    m = np.bincount(buckets[ok], weights=rng[ok], minlength=K)
    t = m.sum()
    return m / t if t > 0 else m


def features(r_oop: np.ndarray, r_ip: np.ndarray, buckets: np.ndarray, spr: float) -> np.ndarray:
    return np.concatenate([bucket_mass(r_oop, buckets), bucket_mass(r_ip, buckets),
                           [np.log1p(spr)]]).astype(np.float32)


def combo_values(bucket_values: np.ndarray, ranks: np.ndarray) -> np.ndarray:
    """Per-combo values from per-bucket values, interpolated linearly between bucket centres."""
    centres = (np.arange(K) + 0.5) / K
    out = np.full(len(ranks), np.nan, dtype=np.float32)
    ok = ~np.isnan(ranks)
    out[ok] = np.interp(ranks[ok], centres, bucket_values)
    return out


def random_range(ranks: np.ndarray, rng: np.random.Generator, floor: float = 1e-3) -> np.ndarray:
    """DeepStack's recursive range generator: hands sorted by strength, probability mass split at random
    between the weaker and stronger halves, recursively. Gives realistic strength-correlated ranges.
    Every live hand keeps a small floor so it has a value in the solve."""
    live = np.where(~np.isnan(ranks))[0]
    order = live[np.argsort(ranks[live], kind="stable")]
    w = np.zeros(NUM_COMBOS)

    def split(lo, hi, mass):
        if hi - lo == 1:
            w[order[lo]] = mass
            return
        mid = (lo + hi) // 2
        f = rng.random()
        split(lo, mid, mass * f)
        split(mid, hi, mass * (1 - f))

    split(0, len(order), 1.0)
    w[live] = w[live] / w[live].max()
    w[live] = np.maximum(w[live], floor)
    return w.astype(np.float32)


def load(path: str) -> dict:
    """A trained network (scripts/train_value_net.py) as the engine's leaf settings."""
    d = np.load(path)
    names = [str(n) for n in d["names"]]
    arrays = {n: d[f"w{i}"] for i, n in enumerate(names)}
    layers = sorted({int(n.split(".")[1]) for n in names if n.endswith(".bias")})
    w = [arrays[f"body.{i}.weight"].astype(np.float32) for i in layers]
    b = [arrays[f"body.{i}.bias"].astype(np.float32) for i in layers]
    alpha = [float(arrays[f"body.{i + 1}.weight"].ravel()[0]) for i in layers[:-1]]
    out = {"k": int(d["k"]), "w": w, "b": b, "alpha": alpha}
    if 'metadata' in d:
        meta = json.loads(str(d['metadata']))
        if meta.get('players') != 2 or meta.get('rake') != 0 or meta.get('features') != 'strength64-v1':
            raise ValueError('unsupported value network metadata')
        out['street'] = meta['street']
    dim = 2 * out['k'] + 1
    for wi, bi in zip(w, b):
        if wi.shape != (len(bi), dim) or not np.isfinite(wi).all() or not np.isfinite(bi).all():
            raise ValueError('malformed network layer')
        dim = len(bi)
    if dim != 2 * out['k'] or not np.isfinite(alpha).all():
        raise ValueError('malformed network output/activation')
    if "s_edges" in d:
        out["s_edges"] = [float(e) for e in d["s_edges"]]
    return out


def predict(net: dict, x: np.ndarray) -> np.ndarray:
    """Network output [2, K] for one feature vector, with the zero-sum correction (as the engine does)."""
    a = x.astype(np.float32)
    for i, (w, b) in enumerate(zip(net["w"], net["b"])):
        a = w @ a + b
        if i < len(net["alpha"]):
            a = np.where(a < 0, a * net["alpha"][i], a)
    k = net["k"]
    v = a.reshape(2, k)
    err = (float((x[:2 * k] * a).sum()) - 1.0) / 2.0
    return v - err


# -- turn (stage 3): buckets by expected river strength and how much it swings ---------------------
TURN_M, TURN_S = 16, 4   # strength bins x swing bins = K buckets
TURN_S_EDGES = (0.10, 0.145, 0.18)  # spread quartiles over random turn boards


def turn_stats(board4) -> tuple[np.ndarray, np.ndarray]:
    """Per combo on a 4-card board: mean and spread over river cards of its river-strength percentile
    (NaN when blocked). The mean is how strong it is on average; the spread separates draws from made
    hands of the same average."""
    rows = []
    for r in range(52):
        if r in board4:
            continue
        rk = strength_ranks(list(board4) + [r])
        a, b = np.asarray([combo_cards(c) for c in range(NUM_COMBOS)]).T
        rk = np.where((a == r) | (b == r), np.nan, rk)
        rows.append(rk)
    rows = np.asarray(rows)
    import warnings
    with warnings.catch_warnings(), np.errstate(all="ignore"):
        warnings.simplefilter("ignore", RuntimeWarning)
        m = np.nanmean(rows, 0)
        s = np.nanstd(rows, 0)
    blocked = np.isnan(strength_ranks_turn_mask(board4))
    m[blocked] = np.nan
    s[blocked] = np.nan
    return m, s


def strength_ranks_turn_mask(board4) -> np.ndarray:
    out = np.zeros(NUM_COMBOS)
    for c in range(NUM_COMBOS):
        a, b = combo_cards(c)
        if a in board4 or b in board4:
            out[c] = np.nan
    return out


def percentile(x: np.ndarray) -> np.ndarray:
    """Mid-rank percentile of each finite value among the finite values."""
    out = np.full(len(x), np.nan)
    ok = np.where(~np.isnan(x))[0]
    v = x[ok]
    order = np.argsort(v, kind="stable")
    sv = v[order]
    ranks = np.empty(len(v))
    i = 0
    while i < len(v):
        j = i
        while j + 1 < len(v) and sv[j + 1] == sv[i]:
            j += 1
        ranks[order[i:j + 1]] = (i + j) / 2
        i = j + 1
    out[ok] = (ranks + 0.5) / len(v)
    return out


def turn_buckets(m: np.ndarray, s: np.ndarray, s_edges) -> np.ndarray:
    """Bucket per combo: strength-percentile bin x spread bin (fixed spread edges from the data)."""
    out = np.full(len(m), -1, dtype=np.int64)
    pm = percentile(m)
    ok = ~np.isnan(pm)
    mb = np.minimum((pm[ok] * TURN_M).astype(np.int64), TURN_M - 1)
    sb = np.searchsorted(np.asarray(s_edges), s[ok])
    out[ok] = mb * TURN_S + sb
    return out

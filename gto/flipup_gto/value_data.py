"""Versioned value-data jobs. No torch dependency; full inputs survive for replay.

A job is immutable. Its sample seed depends on (seed, street, worker, sample id),
not on previous successes. Each completed/rejected sample is atomically persisted.
"""
from __future__ import annotations

import hashlib
import itertools
import json
import os
from pathlib import Path

import numpy as np

SCHEMA = 1


def digest(value) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def atomic_json(path, value):
    path = Path(path)
    tmp = path.with_suffix(path.suffix + '.part')
    with tmp.open('w') as f:
        json.dump(value, f, indent=2, allow_nan=False)
        f.write('\n')
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)


def atomic_npz(path, **arrays):
    path = Path(path)
    tmp = path.with_suffix('.part')
    with tmp.open('wb') as f:
        np.savez_compressed(f, **arrays)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)


def canonical_board(board):
    return min(tuple(sorted((int(c) // 4) * 4 + p[int(c) % 4] for c in board))
               for p in itertools.permutations(range(4)))


def board_group(board):
    """Suit-isomorphic boards stay together. Turn boards group by their parent flop.

    Generators preserve the first three cards as the flop; never sort all five
    cards before passing them here. Also separates every suit permutation.
    """
    return canonical_board(board[:3])


def split_for(board):
    n = int(digest(board_group(board))[:8], 16) % 100
    return 'test' if n < 10 else 'validation' if n < 20 else 'train'


def sample_rng(seed, street, worker, sample_id):
    return np.random.default_rng(np.random.SeedSequence([seed, 4 if street == 'turn' else 5, worker, sample_id]))


def rich_sizing():
    from .solver import BetSizing, StreetSizing
    return BetSizing(oop={s: StreetSizing('33%, 75%, 125%', '60%') for s in ('flop', 'turn', 'river')},
                     ip={s: StreetSizing('33%, 75%, 125%', '60%') for s in ('flop', 'turn', 'river')}, max_raises=2)


def converge(solver, target, maximum, batch=100):
    """Exact-tree gap, no neural leaves. Never treats hitting the cap as success."""
    gap = float('inf')
    done = 0
    while done < maximum:
        n = min(batch, maximum - done)
        solver.engine.iterate(n)
        done += n
        gap = solver.exploitability_pct()
        if not np.isfinite(gap):
            raise ValueError('nonfinite exact-tree gap')
        if gap <= target:
            break
    return done, float(gap)


class LibrarySampler:
    """Read ranges from the library itself; never silently solve new preflop ranges.

    A player's first stored decision has their starting range. Reconstructing
    from those arrays avoids dependency on a particular preflop cache/model.
    """
    def __init__(self, root):
        self.root = Path(root).expanduser().resolve()
        from .flop_library import SPOTS
        self.files = sorted(p for s in SPOTS for p in (self.root / s).glob('*.npz'))
        if not self.files:
            raise ValueError(f'no matchup/*.npz flop files found at {self.root}')
        self.fingerprint = digest([(str(p.relative_to(self.root)), hashlib.sha256(p.read_bytes()).hexdigest())
                                   for p in self.files])

    def sample(self, rng):
        from .cards import parse_cards
        from .flop_library import Entry
        for _ in range(100):
            path = self.files[int(rng.integers(len(self.files)))]
            flop = parse_cards(path.stem)
            with np.load(path, allow_pickle=False) as data:
                # Entry uses arrays from this archive; keep it open during navigation.
                entry = Entry(data, (0, 1, 2, 3))
                init = {}
                for key, node in sorted(entry.meta['nodes'].items(), key=lambda v: len(v[0].split('.')) if v[0] else 0):
                    p = node['player']
                    if p not in init:
                        init[p] = np.zeros(1326, dtype=np.float32)
                        init[p][entry.combos[p]] = data[f'r:{key}'].astype(np.float32)
                if set(init) != {0, 1}:
                    raise ValueError(f'{path}: no starting ranges for both players')
                tokens, wager, closed = [], [0., 0.], False
                for _ in range(20):
                    node = entry.node(tokens)
                    if node is None:
                        break
                    reach = node['reach'].astype(np.float64)
                    freq = (node['strategy'] * reach).sum(1)
                    probs = np.sqrt(np.maximum(freq, 0))  # oversample rare raises
                    if probs.sum() <= 0:
                        break
                    a = int(rng.choice(len(probs), p=probs / probs.sum()))
                    action = node['actions'][a]
                    kind, p = action['type'], node['player']
                    if kind == 'fold':
                        break
                    if kind in ('bet', 'raise'):
                        wager[p] = float(action['amount'])
                    elif kind == 'call':
                        wager[p] = max(wager)
                        closed = True
                    elif kind == 'check' and len(tokens) == 1:
                        closed = True
                    tokens.append(a)
                    if closed:
                        break
                if not closed or max(wager) >= entry.meta['stack'] - 1e-6:
                    continue
                ranges = entry.ranges_after(tokens, init)
                if ranges is None:
                    continue
                turn = int(rng.choice([c for c in range(52) if c not in flop]))
                pot = float(entry.meta['pot']) + sum(wager)
                stack = float(entry.meta['stack']) - max(wager)
                return flop + [turn], ranges[0], ranges[1], pot, stack, f'{path.parent.name}/{path.name}:{tokens}'
        raise ValueError('no completed non-all-in flop line after 100 attempts; inspect library depth/coverage')


def encode(board, r0, r1, pot, stack, info):
    from . import valuenet as vn
    if len(board) == 5:
        buckets = vn.bucket_of(vn.strength_ranks(board))
    else:
        buckets = vn.turn_buckets(*vn.turn_stats(board), vn.TURN_S_EDGES)
    ranges = np.asarray([r0, r1], dtype=np.float32).copy()
    ranges[:, buckets < 0] = 0
    mass = []
    for r in ranges:
        m = np.bincount(buckets[buckets >= 0], weights=r[buckets >= 0], minlength=vn.K)
        if m.sum() <= 0:
            raise ValueError('empty unblocked range')
        mass.append(m / m.sum())
    x = np.concatenate([*mass, [np.log1p(stack / pot)]]).astype(np.float32)
    y = np.full((2, vn.K), np.nan, dtype=np.float32)
    combo_ev = np.full((2, 1326), np.nan, dtype=np.float32)
    for p in (0, 1):
        combos = np.asarray(info[f'combos{p}'], dtype=int)
        values = np.asarray(info[f'ev{p}'], dtype=np.float64) / pot
        if not np.isfinite(values).all():
            raise ValueError('nonfinite teacher values')
        combo_ev[p, combos] = values
        b = buckets[combos]
        count = np.bincount(b, minlength=vn.K)
        sums = np.bincount(b, weights=values, minlength=vn.K)
        np.divide(sums, count, out=y[p], where=count > 0)
    return dict(x=x, y=y, board=np.asarray(board, dtype=np.int8), ranges=ranges,
                combo_ev=combo_ev, buckets=buckets.astype(np.int16))

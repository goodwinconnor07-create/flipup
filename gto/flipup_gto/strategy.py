"""Action-conditioned strategy/EV distillation, shared by HU and exact three-way teachers.

No torch dependency at inference. Candidates are restricted to their recorded tree/domain;
this module does not approve a model or turn a policy confidence into an accuracy bound.
"""
from __future__ import annotations
import itertools
import numpy as np
from . import valuenet as vn
from .cards import combo_cards

MAX_ACTIONS, ACTION_DIM, CONTEXT_DIM = 16, 8, 466
FEATURES = 'cards-ranges-actions-v1'
KINDS = ['fold', 'check', 'call', 'bet', 'raise']
PERMS = list(itertools.permutations(range(4)))


def action_features(actions, pot):
    if not 1 <= len(actions) <= MAX_ACTIONS:
        raise ValueError('unsupported action count')
    a = np.zeros((MAX_ACTIONS, ACTION_DIM), dtype=np.float32)
    mask = np.zeros(MAX_ACTIONS, dtype=bool)
    for i, act in enumerate(actions):
        a[i, KINDS.index(act['type'])] = 1
        a[i, 5:] = [act['amount'] / pot, act['added'] / pot, float(act['all_in'])]
        mask[i] = True
    return a, mask


def context(info, ranges, hero_combo, root_stack):
    board = list(info['board'])
    cards = list(combo_cards(int(hero_combo)))
    if set(board) & set(cards):
        raise ValueError('hand blocked by board')
    hist = np.zeros((3, 64), dtype=np.float32)
    raw_marginal = np.zeros((3, 52), dtype=np.float32)
    buckets = info['_buckets']
    for p, raw in enumerate(ranges):
        r = np.asarray(raw, dtype=np.float64).copy()
        r[buckets < 0] = 0
        total = r.sum()
        if total <= 0:
            continue
        r /= total
        ok = buckets >= 0
        hist[p] = np.bincount(buckets[ok], weights=r[ok], minlength=64)
        for c in np.flatnonzero(r):
            for card in combo_cards(int(c)):
                raw_marginal[p, card] += r[c]
    # Include range marginals to break ties between unused board/hero suits.
    # Otherwise an isomorphic state could acquire a different suit encoding.
    def key(p):
        inv = [p.index(s) for s in range(4)]
        order = [rank*4+inv[suit] for rank in range(13) for suit in range(4)]
        return (tuple(sorted(c//4*4+p[c%4] for c in board)),
                tuple(sorted(c//4*4+p[c%4] for c in cards)),
                tuple(raw_marginal[:, order].ravel()))
    perm = min(PERMS, key=key)
    marginal = np.zeros_like(raw_marginal)
    for card in range(52):
        marginal[:, card//4*4+perm[card%4]] = raw_marginal[:, card]
    visible = np.zeros((2, 52), dtype=np.float32)
    for row, cs in enumerate((board, cards)):
        for c in cs:
            visible[row, c//4*4+perm[c%4]] = 1
    n, actor, pot = len(ranges), info['player'], info['pot']
    contrib = list(info['contrib']) + [0.] * (3-n)
    stacks = list(info.get('stack', [root_stack-c for c in info['contrib']])) + [0.] * (3-n)
    active = list(info.get('active', [True]*n)) + [False]*(3-n)
    wager = info.get('wager', info['contrib'])
    call = max(wager) - wager[actor]
    state = [n/3, actor/2, (len(board)-3)/2, np.log1p(pot),
             *[np.log1p(max(0, s)/pot) for s in stacks], call/pot,
             *[c/pot for c in contrib], *map(float, active)]
    x = np.concatenate([hist.ravel(), marginal.ravel(), visible.ravel(), state]).astype(np.float32)
    if x.shape != (CONTEXT_DIM,) or not np.isfinite(x).all():
        raise ValueError('invalid strategy context')
    return x


def extract_rows(query, root_stack, rng, *, multiway=False, combos_per_node=12, node_limit=6):
    first = query([])
    board = list(first['board'])
    buckets = (vn.bucket_of(vn.strength_ranks(board)) if len(board)==5 else
               vn.turn_buckets(*vn.turn_stats(board), vn.TURN_S_EDGES) if len(board)==4 else
               # Flop policy is not trained by this exporter yet.
               None)
    if buckets is None:
        raise ValueError('strategy exporter currently supports turn and river')
    rows = []
    queue = [[]]
    nodes = 0
    while queue and nodes < node_limit:
        path = queue.pop(0)
        q = query(path)
        if q['type'] != 'action' or len(q['board']) != len(board):
            continue
        nodes += 1
        q['_buckets'] = buckets
        n = len(q['reach']) if multiway else 2
        if multiway:
            ranges = np.asarray(q['reach'], dtype=np.float32)
            combos = np.arange(1326)
            weights = np.asarray(q['weight'][q['player']], dtype=float)
        else:
            ranges = np.zeros((2, 1326), dtype=np.float32)
            for p in range(2):
                ranges[p, q[f'combos{p}']] = q[f'reach{p}']
            combos = np.asarray(q[f'combos{q["player"]}'])
            weights = np.asarray(q[f'weight{q["player"]}'], dtype=float)
        legal = (weights > 1e-12) & (buckets[combos] >= 0)
        indices = np.flatnonzero(legal)
        if not len(indices):
            continue
        probs = weights[indices] / weights[indices].sum()
        # With-replacement reach sampling: each row has equal training weight.
        selected = rng.choice(indices, size=combos_per_node, p=probs)
        af, mask = action_features(q['actions'], q['pot'])
        for h in selected:
            target = np.zeros(MAX_ACTIONS, dtype=np.float32)
            ev = np.zeros(MAX_ACTIONS, dtype=np.float32)
            target[:len(q['actions'])] = np.asarray(q['strategy'])[:, h]
            ev[:len(q['actions'])] = np.asarray(q['action_ev'])[:, h] / q['pot']
            if not np.isfinite(target).all() or not np.isfinite(ev).all() or abs(target.sum()-1)>1e-4:
                raise ValueError('invalid teacher policy')
            rows.append((context(q, ranges, combos[h], root_stack), af, mask, target, ev))
        if len(path) < 3:
            freq = (np.asarray(q['strategy']) * weights).sum(1)
            # Keep both passive and aggressive branches; cap avoids exponential export cost.
            order = sorted(range(len(freq)), key=lambda a: -freq[a])
            for a in order:
                if q['actions'][a]['type'] != 'fold' and freq[a] > 1e-10:
                    queue.append(path + [a if multiway else str(a)])
    if not rows:
        raise ValueError('no strategy rows')
    return {f'policy_{name}': np.asarray(values) for name, values in
            zip(('context', 'actions', 'mask', 'target', 'ev'), zip(*rows))}


def predict(model, ctx, actions, mask):
    """Candidate policy and per-action values. Caller must enforce validation/support gates."""
    x = np.concatenate([np.repeat(np.asarray(ctx)[None], MAX_ACTIONS, axis=0), actions], axis=1)
    for i in range(len(model['weights'])):
        x = x @ model['weights'][i].T + model['biases'][i]
        if i + 1 < len(model['weights']):
            x = np.maximum(x, 0)
    logits = np.where(mask, x[:, 0], -1e30)
    prob = np.exp(logits-logits.max()) * mask
    return prob/prob.sum(), x[:, 1]


def load(path):
    import json
    with np.load(path, allow_pickle=False) as d:
        meta = json.loads(str(d['metadata']))
        if meta['features'] != FEATURES:
            raise ValueError('unsupported policy features')
        return dict(metadata=meta, weights=[d[f'w{i}'].copy() for i in range(int(d['layers']))],
                    biases=[d[f'b{i}'].copy() for i in range(int(d['layers']))])

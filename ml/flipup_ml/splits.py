"""All assignments are rank-triple groups across spots, suits and nodes."""
from collections import defaultdict
import numpy as np
from . import SEED

def grouped_split(groups, strata, seed=SEED, fractions=(.70, .15, .15)):
    # Groups containing multiple suit textures get a combined stratum, never split.
    by_group = defaultdict(set)
    for g, s in zip(groups, strata):
        by_group[str(g)].add(str(s))
    buckets = defaultdict(list)
    for g, s in sorted(by_group.items()):
        buckets['|'.join(sorted(s))].append(g)
    rng = np.random.default_rng(seed)
    assignment = {}
    # Greedy stratification with global capacity, including rare texture strata.
    total = len(by_group)
    if total < 3:
        raise ValueError('Need at least three independent rank triples')
    caps = np.array([max(1, round(total * fractions[0])), max(1, round(total * fractions[1])), 0])
    caps[0] = min(caps[0], total - 2)
    caps[1] = min(caps[1], total - caps[0] - 1)
    caps[2] = total - caps[0] - caps[1]
    counts = np.zeros(3, int)
    for _, gs in sorted(buckets.items(), key=lambda kv: (-len(kv[1]), kv[0])):
        local = np.zeros(3)
        for g in rng.permutation(gs):
            deficit = np.array(fractions) * (local.sum() + 1) - local
            deficit[counts >= caps] = -np.inf
            k = int(deficit.argmax())
            assignment[str(g)] = k
            counts[k] += 1
            local[k] += 1
    return np.array([assignment[str(g)] for g in groups])

def grouped_folds(groups, strata, k=5, seed=SEED):
    if len(set(groups)) < k:
        raise ValueError('Five-fold CV needs at least five rank triples')
    rng = np.random.default_rng(seed)
    by_group = defaultdict(set)
    for g, s in zip(groups, strata):
        by_group[str(g)].add(str(s))
    buckets = defaultdict(list)
    for g, s in sorted(by_group.items()):
        buckets['|'.join(sorted(s))].append(g)
    out, counts = {}, np.zeros(k, int)
    for gs in buckets.values():
        for g in rng.permutation(gs):
            i = int(counts.argmin())
            out[str(g)] = i
            counts[i] += 1
    return np.array([out[str(g)] for g in groups])

def family_split(groups, family, strata):
    held = set(np.asarray(groups)[family])
    test = np.array([g in held for g in groups])
    rest = ~test
    if not test.any() or len(set(np.asarray(groups)[rest])) < 3:
        return None
    a = grouped_split(np.asarray(groups)[rest], np.asarray(strata)[rest], fractions=(.85,.15,0))
    # The third residual bin is validation too; preserve the family exclusively as test.
    result = np.full(len(groups), 2)
    result[rest] = np.where(a == 0, 0, 1)
    return result

def assert_disjoint(groups, assignment):
    sets = [set(np.asarray(groups)[assignment == i]) for i in set(assignment)]
    assert all(not a & b for i, a in enumerate(sets) for b in sets[i+1:])

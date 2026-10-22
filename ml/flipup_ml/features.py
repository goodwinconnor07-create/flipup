"""Features computable without solved strategies; deterministic sampled root equity."""
from functools import lru_cache
import itertools
import numpy as np
from . import SPOTS, SLOTS, SEED
from flipup_gto import _engine
from flipup_gto.cards import combo_cards, hand_class, all_hand_classes
from flipup_gto.concepts import board_texture
from flipup_gto.flop_library import canonical

CLASSES = all_hand_classes()

def board_group(board):
    return '-'.join(map(str, sorted(c // 4 for c in board)))

def texture(board):
    t = board_texture(list(board))
    return ('paired' if t.paired else 'unpaired') + ':' + ('monotone' if t.monotone else 'two_tone' if t.two_tone else 'rainbow')

@lru_cache(maxsize=None)
def frequency(board):
    # Exact suit-isomorphism orbit, equivalent to canonical_flops() frequency.
    return len({tuple(sorted((c//4)*4+p[c%4] for c in board)) for p in itertools.permutations(range(4))})

def context(meta, key):
    wager = [0., 0.]
    tokens = [] if not key else [int(i) for i in key.split('.')]
    path_features = []
    for depth, i in enumerate(tokens):
        parent = meta['nodes']['.'.join(map(str, tokens[:depth]))]
        p = parent['player']
        a = parent['actions'][i]
        added = 0. if a['type'] in ('check','fold') else float(a['amount']) - wager[p]
        path_features += [float(a['type'] == t) for t in ('fold','check','call','bet','raise')]
        path_features += [added / parent['pot'], float(a.get('all_in',False))]
        if a['type'] not in ('check','fold'):
            wager[p] = float(a['amount'])
    node = meta['nodes'][key]
    p = node['player']
    return wager, path_features + [0.] * (21-len(path_features)), max(0.,wager[1-p]-wager[p])

def slots_for(meta, key):
    node = meta['nodes'][key]
    slots = []
    for a in node['actions']:
        t = a['type']
        if a.get('all_in',False) and t in ('bet','raise'):
            slot = 7
        elif t in ('fold','check','call'):
            slot = SLOTS.index(t)
        elif t == 'raise':
            slot = 6
        elif t == 'bet':
            ratio = a['amount']/node['pot']
            # Small bets can be capped by the engine's one-bb minimum.
            candidates = [max(1.,f*node['pot']) for f in (.33,.75,1.25)]
            dist = np.abs(np.array(candidates)-a['amount'])
            if dist.min() > 1e-4:
                raise ValueError(f'Unsupported stored bet size {ratio}')
            slot = 3 + int(dist.argmin())
        else:
            raise ValueError(f'Unknown action {t}')
        if slot in slots:
            raise ValueError('Multiple stored actions collide in fixed slots')
        slots.append(slot)
    return slots

def feature_rows(spot, board, meta, key, combos, roots, equity_samples=1024):
    board = tuple(board)
    node = meta['nodes'][key]
    p = node['player']
    wager, path, to_call = context(meta,key)
    slots = slots_for(meta,key)
    mask = np.zeros(8,np.float32)
    mask[slots] = 1
    _, suit_map = canonical(board)
    ordered = sorted(board,reverse=True)
    tex = board_texture(list(board))
    bfeat = [c//4/12 for c in ordered] + [suit_map[c%4]/3 for c in ordered]
    bfeat += [float(tex.paired),float(tex.monotone),float(tex.two_tone),float(tex.connected), max(c//4 for c in board)/12]
    shared = [float(spot==s) for s in SPOTS] + [p,len(key.split('.'))/3 if key else 0., node['pot']/100, (meta['stack']-wager[p])/100, to_call/node['pot']]
    shared += path + mask.tolist() + bfeat
    rows, strengths, classes = [], [], []
    opponent = tuple(float(x) for x in roots[1-p])
    for c in combos:
        a,b = combo_cards(int(c))
        category = _engine.strength_category(_engine.evaluate([a,b,*board]))
        # Same equity algorithm at train and inference. Stored equity may include
        # solver-reach effects; never use it as a model input.
        eq = root_equity(int(c),board,opponent,equity_samples)
        h = [a//4/12,b//4/12,float(a%4==b%4),float(a//4==b//4),abs(a//4-b//4)/12]
        h += [float(hc%4==bc%4) for hc in (a,b) for bc in ordered]
        h += [float(category==i) for i in range(9)] + [eq, roots[p][int(c)]]
        rows.append(shared+h)
        strengths.append(category)
        classes.append(CLASSES.index(hand_class(int(c))))
    return np.asarray(rows,np.float32), mask, np.asarray(strengths), np.asarray(classes)

@lru_cache(maxsize=200000)
def root_equity(combo, board, opponent, samples):
    w,t,_ = _engine.equity_vs_range(combo,list(opponent),list(board),samples,SEED+combo)
    return w + .5*t

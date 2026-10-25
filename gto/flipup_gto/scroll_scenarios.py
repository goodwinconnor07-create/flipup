"""Independent Scroll decisions. Exact teachers, explicit assumptions, no network labels."""
from __future__ import annotations
import copy
import hashlib
import json
from pathlib import Path
import numpy as np
from . import _engine as E
from .cards import card_str,combo_cards,parse_combo
from .solver import BetSizing,StreetSizing,PostflopSolver
from .value_data import canonical_board,converge,digest

VERSION='scroll-exact-v2'
TARGET=.1 # percent of pot, in this betting abstraction
ENGINE_HASH=digest([(p.name,hashlib.sha256(p.read_bytes()).hexdigest()) for p in
                    sorted((Path(__file__).parent.parent/'engine/src').glob('*.cpp'))])


def sizing():
    ss=StreetSizing('33%, 50%, 75%, 125%, a','60%, 100%, a')
    return BetSizing(oop={s:ss for s in ('flop','turn','river')},ip={s:ss for s in ('flop','turn','river')},
                     max_raises=2,merge_threshold=.001)


def build(spec,memory=1536):
    if spec.get('version')!=VERSION:raise ValueError('unsupported teacher version')
    if spec['players']==2:
        sizes=sizing()
        for extra in spec.get('extras',[]):
            sizes=sizes.with_extra(extra['player'],len(spec['board'])-3,extra['kind'],str(extra['fraction']*100)+'%')
        return PostflopSolver(spec['board'],spec['pot'],spec['stack'],*spec['ranges'],sizing=sizes,
                              compress=False,max_memory_mb=memory,max_nodes=200000)
    if spec['players']!=3:raise ValueError('only exact HU/three-player supported')
    cfg=E.MWConfig();cfg.players=3;cfg.exact_joint=True;cfg.board=spec['board'];cfg.range=spec['ranges']
    cfg.pot=spec['pot'];cfg.stack=spec['stack'];cfg.end_street=2;cfg.deal_subset=[]
    cfg.max_raises=1;cfg.max_nodes=100000;cfg.max_memory_mb=memory;cfg.merge_threshold=.001
    # Always offer all-in where it is legal, rather than treating absent sizes as never played.
    cfg.add_allin_threshold=1e6
    for st in range(3):cfg.set_sizes(st,[.33,.75],[.6])
    if spec.get('extras'):
        actor=spec['extras'][0]['player'];cfg.hero=actor
        for st in range(3):
            bets=[.33,.75]+[e['fraction'] for e in spec['extras'] if e['kind']=='bet']
            raises=[.6]+[e['fraction'] for e in spec['extras'] if e['kind']=='raise']
            cfg.set_hero_sizes(st,bets,raises)
    return E.MultiwaySolver(cfg)


def query(solver,tokens,players,ev=True):
    return solver.engine.query(tokens,False,ev) if players==2 else solver.query([int(t) for t in tokens],ev,False)


def resolve(solver,spec):
    tokens=[]
    for wanted in spec.get('path',[]):
        q=query(solver,tokens,spec['players'],False)
        if q['type']!='action':raise ValueError('path ends before decision')
        match=next((i for i,a in enumerate(q['actions']) if a['type']==wanted['type'] and
                    abs(a['amount']-wanted['amount'])<1e-5),None)
        if match is None:raise ValueError('ancestor size not retained in solved tree')
        tokens.append(str(match) if spec['players']==2 else match)
    return tokens


def arrays(q,players):
    if players==3:return np.asarray(q['reach']),np.asarray(q['weight']),np.arange(1326)
    r=np.zeros((2,1326));w=np.zeros_like(r)
    for p in range(2):
        r[p,np.asarray(q[f'combos{p}'])]=q[f'reach{p}']
        w[p,np.asarray(q[f'combos{p}'])]=q[f'weight{p}']
    return r,w,np.asarray(q[f'combos{q["player"]}'])


def solve(spec,maximum=4000,memory=1536):
    s=build(spec,memory);players=spec['players']
    if players==2:
        its,gap=converge(s,TARGET,maximum)
    else:
        its=0;gap=1e9
        while its<maximum:
            s.iterate(min(50,maximum-its));its=s.iterations;gap=float(s.exploitability_pct())
            if gap<=TARGET:break
    if not np.isfinite(gap) or gap>TARGET:raise ValueError('teacher did not converge')
    tokens=resolve(s,spec);first=query(s,tokens,players)
    if first['type']!='action':raise ValueError('not a decision')
    # Do NOT equate an iteration limit or a rounded 100% with a stable strategy.
    q=first;weighted_drift=1.
    while its<maximum:
        if maximum-its<200:raise ValueError('teacher stability budget exhausted')
        before=np.asarray(q['strategy']);before_ev=np.asarray(q['action_ev'])
        extra=min(200,maximum-its)
        if players==2:s.engine.iterate(extra);gap=float(s.exploitability_pct())
        else:s.iterate(extra);gap=float(s.exploitability_pct())
        its+=extra;q=query(s,tokens,players)
        r,w,combos=arrays(q,players);actor=q['player']
        own=w[actor,combos];own=own/max(own.sum(),1e-30)
        drift=np.abs(np.asarray(q['strategy'])-before).max(0)
        ev_drift=np.abs(np.asarray(q['action_ev'])-before_ev).max(0)/q['pot']
        weighted_drift=float(np.dot(drift,own))
        if extra>=200 and gap<=TARGET and weighted_drift<=.02:break
    if gap>TARGET or weighted_drift>.02:raise ValueError('strategy unstable after additional iterations')
    if players==3 and abs(sum(s.root_ev())-spec['pot'])/spec['pot']>.001:raise ValueError('payoff conservation failed')
    quality=dict(method='full-tree-hu' if players==2 else 'full-tree-exact3',version=VERSION,engine=ENGINE_HASH,gapPct=max(0.,gap),
                 iterations=its,rangeFrequencyDrift=weighted_drift,scope='declared ranges and betting tree; no rake')
    return s,tokens,q,quality,drift,ev_drift


def option(a,pot,own_wager):
    kind='allin' if a['all_in'] else a['type']
    if kind in ('fold','check'):label=kind.capitalize()
    elif kind=='call':label=f'Call {a["added"]:.2f}bb'
    elif kind=='allin':label=f'All-in to {a["amount"]:.2f}bb'
    elif kind=='bet':label=f'Bet {100*a["added"]/pot:.1f}% ({a["amount"]:.2f}bb)'
    else:label=f'Raise to {a["amount"]:.2f}bb'
    return dict(label=label,kind=kind,to=float(a['amount']),added=float(a['added']))


def describe(board,hole):
    ranks=[c//4 for c in board];suits=[c%4 for c in board]
    return ['river' if len(board)==5 else 'turn' if len(board)==4 else 'flop',
            'paired' if len(set(ranks))<len(ranks) else 'unpaired',
            'flush-board' if max(suits.count(s) for s in set(suits))>=3 else 'no-flush-board',
            'connected' if any(max(rs)-min(rs)<=4 for rs in __import__('itertools').combinations(set(ranks),3)) else 'spread']


def scenario_from(s,tokens,q,spec,quality,combo,drift,ev_drift):
    players=spec['players'];actor=q['player'];r,w,combos=arrays(q,players)
    where=np.flatnonzero(combos==combo)
    if not len(where) or w[actor,combo]<=1e-12:raise ValueError('unreachable hero combo')
    h=int(where[0]);pot=float(q['pot']);stack=list(q.get('stack',[spec['stack']-c for c in q['contrib']]))
    if float(drift[h])>.03 or float(ev_drift[h])>.01:raise ValueError('exact hero strategy/value unstable')
    wager=list(q.get('wager',q['contrib']));call=max(wager)-wager[actor]
    opts=[]
    for i,a in enumerate(q['actions']):
        o=option(a,pot,wager[actor]);o.update(freq=float(q['strategy'][i][h]),ev=float(q['action_ev'][i][h]),foldEquity=None)
        # HU fold probability of the immediate defender, conditional on the hero cards.
        if players==2 and a['type'] in ('bet','raise'):
            child=query(s,tokens+[str(i)],players,False)
            if child['type']=='action':
                opp=child['player'];fold=next((j for j,z in enumerate(child['actions']) if z['type']=='fold'),None)
                if fold is not None:
                    oppc=np.asarray(child[f'combos{opp}']);mass=np.asarray(child[f'reach{opp}']).copy()
                    blocked=set(combo_cards(combo))
                    for k,c in enumerate(oppc):
                        if blocked.intersection(combo_cards(int(c))):mass[k]=0
                    if mass.sum()>0:o['foldEquity']=float(np.dot(child['strategy'][fold],mass)/mass.sum())
        opts.append(o)
    if call<=1e-8:opts.append(dict(label='Fold',kind='fold',to=0.,added=0.,freq=0.,ev=0.,foldEquity=None,analytic=True))
    hero=combo_cards(combo);tags=describe(spec['board'],hero)+[f'{players}-way','facing-bet' if call>0 else 'first-to-act' if not spec.get('path') else 'checked-to-you']
    active=list(q.get('active',[True]*players))
    # Group shape independently of suits/hero: avoid multiple near-identical drill variants back to back.
    family=digest([players,canonical_board(spec['board']),actor,[(p['type'],round(p['amount']/spec['pot'],2)) for p in spec.get('path',[])]])[:16]
    evs=sorted([o['ev'] for o in opts],reverse=True)
    mix=[o for o in opts if o['freq']>=.05]
    close=(evs[0]-evs[1])/pot if len(evs)>1 else 1
    difficulty='mixed' if len(mix)>=2 else 'close' if close<=.02 else 'contrast'
    range_summary=[]
    for p in range(players):
        total=float(r[p].sum());top=[]
        from .cards import hand_class
        classes={}
        for c in np.flatnonzero(r[p]>0):
            key=hand_class(int(c));classes[key]=classes.get(key,0)+float(r[p,c])
        top=[key for key,_ in sorted(classes.items(),key=lambda kv:-kv[1])[:6]]
        range_summary.append(dict(player=p,classes=top,combos=int(np.count_nonzero(r[p])),active=active[p]))
    last_inc=1.;last_to=0.
    for action in spec.get('path',[]):
        if action['type'] in ('bet','raise'):
            last_inc=max(1.,action['amount']-last_to);last_to=action['amount']
    public=dict(schema=2,id='s-'+digest([spec,int(combo),opts])[:24],family=family,players=players,hero=actor,
                cards=[card_str(c) for c in hero],board=[card_str(c) for c in spec['board']],pot=pot,stacks=stack,
                wagers=wager,toCall=float(call),minRaiseTo=float(max(wager)+last_inc),
                history=spec.get('path',[]),active=active,options=opts,tags=tags,difficulty=difficulty,ranges=range_summary,
                assumptions=spec.get('assumptions','Synthetic range-conditioned practice spot; this is not a recorded six-max hand.'),
                quality={**quality,'heroFrequencyDrift':float(drift[h]),'heroEvDrift':float(ev_drift[h])})
    return public


def solve_entry(spec,combo,maximum=4000,memory=1536):
    s,tokens,q,quality,drift,ev_drift=solve(spec,maximum,memory)
    return scenario_from(s,tokens,q,spec,quality,combo,drift,ev_drift)


def validate_public(d):
    if d.get('schema')!=2 or not str(d.get('id','')).startswith('s-'):raise ValueError('wrong scenario schema/id')
    if d.get('players') not in (2,3) or len(d.get('cards',[]))!=2 or not 3<=len(d.get('board',[]))<=5:raise ValueError('invalid cards/players')
    if len(set(d['cards']+d['board']))!=len(d['cards']+d['board']):raise ValueError('duplicate cards')
    for card in d['cards']+d['board']:
        if len(card)!=2 or card[0] not in '23456789TJQKA' or card[1] not in 'shdc':raise ValueError('invalid card')
    q=d['quality']
    if (q['version']!=VERSION or not 0<=q['gapPct']<=TARGET or q['iterations']<200
        or not 0<=q['heroFrequencyDrift']<=.03 or not 0<=q['heroEvDrift']<=.01
        or q['method']!=('full-tree-hu' if d['players']==2 else 'full-tree-exact3')):raise ValueError('scenario quality gate failed')
    options=d['options']
    if not 2<=len(options)<=24 or abs(sum(o['freq'] for o in options)-1)>.001:raise ValueError('invalid policy')
    for o in options:
        if o['kind'] not in ('check','call','bet','raise','allin','fold') or not 0<=o['freq']<=1 or not np.isfinite(o['ev']):raise ValueError('invalid answer')
    if d['pot']<=0 or not 0<=d['hero']<d['players']:raise ValueError('invalid state')
    # Reject NaN/Infinity anywhere, not just in headline metrics.
    json.dumps(d,allow_nan=False)
    return d

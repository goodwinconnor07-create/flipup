"""Laptop-only complete postflop trace from one full-future root tree.

No street is independently guessed or checked down to save time. The root's range
provenance remains explicit; internal preflop-model roots are still drafts.
"""
from copy import deepcopy
import numpy as np
from flipup_gto.cards import card_str
from flipup_gto.scroll_line import walk_hand
from flipup_gto.scroll_scenarios import solve,query,scenario_from,arrays,TARGET
from flipup_gto.value_data import digest


def full_hand(spec,holes,seats,deck,preflop,starting_stack,rng,memory):
    solver,_,_,quality,_,_=solve(spec,maximum=12000,memory=memory)
    players=spec['players'];iterations=quality['iterations'];training_roots=[]
    def engine_tokens(tokens):
        return [card_str(int(t[5:])) if isinstance(t,str) and t.startswith('card:') else t for t in tokens]
    def get(tokens):return query(solver,engine_tokens(tokens),players)
    def checked(tokens,path,q,hole):
        nonlocal iterations
        before=np.asarray(q['strategy']);before_ev=np.asarray(q['action_ev'])
        if players==2:solver.engine.iterate(200)
        else:solver.iterate(200)
        iterations+=200
        gap=float(solver.exploitability_pct())*(players if players==3 else 1)
        if not np.isfinite(gap) or not 0<=gap<=TARGET:raise ValueError('whole-hand decision failed deviation gate')
        after=get(tokens)
        if players==2 and 'wager' not in after:raise RuntimeError('Rebuild the engine: current-street wager query is required')
        drift=np.abs(np.asarray(after['strategy'])-before).max(0)
        evdrift=np.abs(np.asarray(after['action_ev'])-before_ev).max(0)/after['pot']
        _,weights,combos=arrays(after,players);own=weights[after['player'],combos];own=own/max(own.sum(),1e-30)
        weighted=float(np.dot(drift,own))
        if weighted>.02:raise ValueError('whole-hand reached strategy remains unstable')
        root={**deepcopy(spec),'path':path}
        scenario=scenario_from(solver,engine_tokens(tokens),after,root,{**quality,'gapPct':gap,'iterations':iterations,'rangeFrequencyDrift':weighted},hole,drift,evdrift)
        if len(scenario['board']) in (4,5) and max(scenario['wagers'])<1e-8:
            reaches,_,_=arrays(after,players)
            alive=[i for i,a in enumerate(scenario['active']) if a]
            behind=[scenario['stacks'][i] for i in alive]
            if len(alive)>=2 and min(behind)>0 and max(behind)-min(behind)<1e-6:
                boundary={**deepcopy(spec),'board':list(spec['board'])+[e['card'] for e in path if e['type']=='deal'],
                          'pot':scenario['pot'],'stack':behind[0],'ranges':reaches.tolist(),
                          'active':scenario['active'],'path':[],'extras':[]}
                boundary['range_origin']['history']=spec['range_origin']['history']+path
                boundary['range_origin']['source']='Reached ranges from a full-future tree; '+spec['range_origin']['source']
                training_roots.append(boundary)
        return dict(scenario=scenario,solve=root,_node=after)
    trace=walk_hand(get,checked,holes,deck,rng,players)
    hero=rng.choice(list(range(players)))
    decisions=[d for d in trace['decisions'] if d['actor']==hero]
    if not decisions:raise ValueError('whole hand contains no hero question')
    board=list(spec['board'])+[e['card'] for e in trace['events'] if e['type']=='deal']
    if trace['terminal']=='allin':board.extend(trace['remaining'][:5-len(board)])
    hand=dict(schema=3,id='h-'+digest([spec,holes,trace['events']])[:24],hero=seats[hero],stackBb=starting_stack,
              board=[card_str(c) for c in board],preflop=preflop,
              events=trace['events'],seats=seats,
              decisions=[dict(event=d['event'],scenario=d['scenario'],line=d['line']) for d in decisions],
              terminal=trace['terminal'],publicationApproved=False,
              assumptions=spec['assumptions'])
    return dict(hand=hand,privateDecisions=trace['decisions'],root=spec,trainingRoots=training_roots,publicationApproved=False)

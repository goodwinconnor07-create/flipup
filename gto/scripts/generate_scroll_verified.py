#!/usr/bin/env python3
"""Strict three-player whole-hand Scroll export. Full future tree or no hand.

No sampled runouts, no forced folds, no neural answer substituted for an
unconverged full-tree teacher. Large flop trees can exceed laptop limits;
those hands are rejected, never silently simplified.
"""
from __future__ import annotations
import argparse
import json
import random
from pathlib import Path
import sys
import time
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import numpy as np
import quiz_multiway as quiz
from generate_multiway_data import solve_checked,config
from flipup_gto.value_data import atomic_json


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--out',type=Path,required=True);ap.add_argument('--n',type=int,default=100)
    ap.add_argument('--seed',type=int,default=20261030);ap.add_argument('--max-hours',type=float,default=8)
    ap.add_argument('--memory-mb',type=int,default=2048)
    ap.add_argument('--approval',type=Path,required=True,help='campaign quality-gate report')
    args=ap.parse_args()
    approval=json.loads(args.approval.read_text())
    if approval.get('scroll_allowed') is not True:ap.error('campaign has not passed all pre-Scroll gates')
    args.out.parent.mkdir(parents=True,exist_ok=True)
    root_seats=None; active=0; calls=[]
    def strict(street,board,seats,ranges,pot,behind,hero=-1):
        nonlocal root_seats,active
        if len(seats)!=3:raise ValueError('strict Scroll requires exactly three original players, including folded ranges')
        root_seats=list(seats)
        cfg=config(board,[ranges[s] for s in seats],pot,behind,args.memory_mb,active=active)
        solver,quality=solve_checked(cfg,.2,3000)
        calls.append(quality)
        return solver
    quiz.solve_street=strict
    # The legacy hand orchestration is not used: preserve original players' ranges after folds.
    ex=quiz.Explorer(quiz.Reviewer());rng=random.Random(args.seed)
    start=time.monotonic();done=attempts=certified_attempts=0
    existing={json.loads(line)['id'] for line in args.out.read_text().splitlines() if line.strip()} if args.out.exists() else set()
    # Replay sample RNG identities rather than resuming a shared mutable random stream.
    while done<args.n and (not args.max_hours or time.monotonic()-start<args.max_hours*3600):
        attempts+=1;ident=f'verified3-{args.seed}-{attempts}'
        if ident in existing:continue
        rr=random.Random(f'{args.seed}:{attempts}');deck=list(range(52));rr.shuffle(deck)
        cards={s:(deck.pop(),deck.pop()) for s in range(6)};runout=[deck.pop() for _ in range(5)]
        pre=quiz.play_preflop(ex._preflop(6,100,True),rr,cards)
        if pre is None:continue
        steps,path,info=pre
        live=[s for s in range(6) if not info['folded'][s]]
        if len(live)!=3:continue
        behind=[100-float(info['invested'][s]) for s in live]
        if max(behind)-min(behind)>1e-6 or min(behind)<=0:continue
        seats=sorted(live,key=quiz.POSTFLOP_ORDER.index);hero=rr.choice(seats)
        ranges={s:quiz.class_reach_to_combos(info['reach'][s]).astype(np.float64) for s in seats}
        combo={s:quiz.combo_index(*cards[s]) for s in seats}
        if any(ranges[s][combo[s]]<=0 for s in seats):continue
        decisions=[]
        for i,st in enumerate(steps):
            if st['seat']==hero:decisions.append({'step':i,**quiz.preflop_decision(ex,st,hero,cards[hero])})
            st.pop('path',None)
        pot=float(info['pot']);stack=behind[0];active=7;calls=[];board=[];hero_fold=False
        certified_attempts+=1
        try:
            for street in range(3):
                board=runout[:3+street]
                solver=strict(street,board,seats,ranges,pot,stack,hero)
                qpath=[]
                while True:
                    q=solver.query(qpath,False,False)
                    if q['type']!='action':break
                    actor=seats[q['player']];h=combo[actor]
                    if q['reach'][q['player']][h]<=0:raise ValueError('actual hand has zero reached probability')
                    aidx=quiz.pick([s[h] for s in q['strategy']],rr);a=q['actions'][aidx]
                    if actor==hero:
                        full=solver.query(qpath,True,False)
                        options=[]
                        for j,act in enumerate(full['actions']):
                            label,kind=quiz.label(act,full['pot'])
                            options.append(dict(label=label,kind=kind,to_bb=act['amount'],freq=float(full['strategy'][j][h]),
                                                ev_bb=float(full['action_ev'][j][h])))
                        decisions.append(dict(step=len(steps),street=quiz.STREETS[street+1],pot_bb=q['pot'],
                                              to_call_bb=max(q['wager'])-q['wager'][q['player']],options=options,
                                              equity=None,players=sum(q['active'])))
                    label,kind=quiz.label(a,q['pot']);steps.append(dict(street=quiz.STREETS[street+1],seat=actor,kind=kind,to_bb=a['amount']))
                    qpath.append(aidx)
                    if actor==hero and kind=='fold':hero_fold=True;break
                end=solver.query(qpath,False,False)
                active=sum(1<<p for p,x in enumerate(end['active']) if x)
                if hero_fold or sum(end['active'])<2:break
                for p,s in enumerate(seats):ranges[s]=np.asarray(end['reach'][p])
                survivors=[p for p,x in enumerate(end['active']) if x]
                stack-=end['contrib'][survivors[0]];pot=end['pot']
                if stack<=1e-9:board=runout;break
            alive=[seats[p] for p in range(3) if active&(1<<p)]
            if len(alive)>1 and len(board)==5 and not hero_fold:
                scores={s:quiz._engine.evaluate(board+list(cards[s])) for s in alive}
                winners=[quiz.POS[s] for s in alive if scores[s]==max(scores.values())];showdown=True
            else:winners=[quiz.POS[alive[0]]] if len(alive)==1 and not hero_fold else [];showdown=False
            hand=dict(id=ident,players=6,stack_bb=100,hero={'seat':hero,'cards':[quiz.card_str(c) for c in cards[hero]]},
                      villains=[{'seat':s,'cards':[quiz.card_str(c) for c in cards[s]]} for s in seats if s!=hero],
                      board=[quiz.card_str(c) for c in board],steps=steps,decisions=decisions,
                      result=dict(showdown=showdown,winners=winners),quality=dict(teacher='exact3-full-future',streets=calls))
            from export_quiz import pack_multiway
            if pack_multiway(hand) is None:raise ValueError('invalid Scroll export')
            with args.out.open('a') as f:f.write(json.dumps(hand)+'\n');f.flush()
            done+=1;existing.add(ident)
        except (ValueError,RuntimeError,MemoryError) as err:
            # Budget/convergence failures are expected, arbitrary programming errors must propagate.
            if not any(x in str(err) for x in ('teacher gate','tree too large','node budget','zero reached','invalid Scroll')) and not isinstance(err,MemoryError):raise
            print(f'{ident}: rejected: {err}',flush=True)
        atomic_json(args.out.with_suffix('.status.json'),dict(accepted=done,attempts=attempts,eligible_attempts=certified_attempts,seconds=time.monotonic()-start))
        # Do not spend days retrying impossible full flop trees with the same hardware.
        if certified_attempts>=100 and not done:raise RuntimeError('100 eligible attempts and no certified hands; inspect full-flop memory/convergence requirements')
    print(f'{done} new certified hands; {attempts} attempts',flush=True)
    if not done and not existing:raise RuntimeError('no certified Scroll hands produced within budget')


if __name__=='__main__':main()

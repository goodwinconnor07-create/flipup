"""Walk ONE already computed full-future tree. Does not construct or solve a tree."""
from copy import deepcopy


def walk_hand(query,answer,holes,deck,rng,players,max_steps=256):
    tokens=[];path=[];events=[];decisions=[];remaining=list(deck)
    for _ in range(max_steps):
        q=query(tokens)
        kind=q['type']
        if kind=='chance':
            legal=set(q['deal_cards'])
            card=next((c for c in remaining if c in legal),None)
            if card is None:raise ValueError('no legal dealt card in the real deck')
            remaining.remove(card)
            tokens.append(f'card:{card}' if players==2 else card)
            # The HU adapter converts numeric cards to its string card notation.
            path.append(dict(type='deal',card=card))
            events.append(dict(type='deal',card=card))
            continue
        if kind!='action':
            if kind not in ('fold','showdown','allin'):raise ValueError('truncated or neural-leaf hand is not a full-tree hand')
            return dict(events=events,decisions=decisions,terminal=kind,board=q['board'],path=path,remaining=remaining)
        actor=q['player']
        checked=answer(tokens,deepcopy(path),q,holes[actor])
        # answer() may refine the tree; take BOTH policy and labels from its resulting node.
        q=checked.pop('_node')
        combos=q.get(f'combos{actor}',list(range(1326)))
        try:h=list(combos).index(holes[actor])
        except ValueError:raise ValueError('actual cards absent from actor range')
        frequencies=[float(row[h]) for row in q['strategy']]
        if sum(frequencies)<=0:raise ValueError('actual hand has no reached strategy')
        selected=rng.choices(range(len(frequencies)),weights=frequencies,k=1)[0]
        action=q['actions'][selected]
        checked.update(event=len(events),actor=actor,line=selected)
        decisions.append(checked)
        event=dict(type=action['type'],amount=float(action['amount']),player=actor,street=q['street'],all_in=action['all_in'])
        events.append(event);path.append(event)
        tokens.append(str(selected) if players==2 else selected)
    raise ValueError('full hand exceeded safety step limit')

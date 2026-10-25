"""Queue exact offline refinements of structurally identical heads-up custom decisions."""
from __future__ import annotations
import copy
from pathlib import Path
from . import scroll_store as store
from .scroll_scenarios import VERSION
from .value_data import digest


def identity(req):
    # CustomRequest specifies a history, not numeric ranges. Invalidate its lookup
    # if the range model or cached preflop solutions change; the queued payload
    # still contains the full numeric ranges actually solved.
    data=Path(__file__).parent/'data'
    files=[*data.glob('*.json'),*data.joinpath('cache').glob('preflop_*.npz')]
    signature=[(p.name,p.stat().st_size,p.stat().st_mtime_ns) for p in sorted(files)]
    return dict(request=req,rangeModel=signature)


def key(req):return digest([VERSION,'custom',identity(req)])


def cached(req):
    r=store.result(key(req))
    return r['result']['response'] if r and r['status']=='done' else None


def record(req,response,node):
    s=node.solver
    if node.type!='action':return
    tokens=[];path=[];extras=[]
    for idx in node.tokens:
        q=s.engine.query(tokens,False,False);act=q['actions'][int(idx)];p=q['player']
        if act['type'] in ('bet','raise'):
            wager=q['contrib'];call=max(wager)-wager[p]
            fraction=(act['amount']-max(wager))/(q['pot']+call) if act['type']=='raise' else act['added']/q['pot']
            extras.append(dict(player=p,kind=act['type'],fraction=fraction))
        path.append(dict(type=act['type'],amount=act['amount'],player=p));tokens.append(str(idx))
    root=s.engine.query([],False,False)
    ranges=[]
    for p in range(2):
        weights=[0.]*1326
        for c,w in zip(root[f'combos{p}'],root[f'reach{p}']):weights[int(c)]=float(w)
        ranges.append(weights)
    spec=dict(version=VERSION,players=2,board=s.board,pot=s.pot,stack=s.stack,ranges=ranges,path=path,extras=extras)
    # enqueue computes this same key; names/account identifiers are never in CustomRequest.
    return record_spec(req,response,spec)


def record_spec(req,response,spec):
    return store.enqueue('custom',dict(request=req,response=copy.deepcopy(response),spec=spec),identity=identity(req))

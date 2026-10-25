"""Public verified content and bounded requests; authenticated publication/laptop control."""
import copy
import json
import math
from fastapi import APIRouter,HTTPException,Request
from . import scroll_store as store
from .flop_admin import _check
from .scroll_release import readiness,require_publication

router=APIRouter()


@router.get('/health')
def health():return readiness()


async def body(request,limit=2*1024**2):
    data=b''
    async for chunk in request.stream():
        data+=chunk
        if len(data)>limit:raise HTTPException(413,'request too large')
    try:return json.loads(data)
    except Exception:raise HTTPException(400,'invalid JSON')


@router.get('/scroll/catalogue')
def catalogue():return store.catalogue()


@router.get('/scroll/scenarios/{ident}')
def scenario(ident:str):
    result=store.get_scenario(ident)
    if not result:raise HTTPException(404,'scenario not found')
    return result


@router.post('/scroll/size')
async def size(request:Request):
    d=await body(request,4096);base=store.get_scenario(d.get('scenario',''),True)
    if not base:raise HTTPException(404,'scenario not found')
    p=base['scenario'];actor=p['hero'];kind=d.get('kind');to=d.get('to')
    if kind not in ('bet','raise') or not isinstance(to,(float,int)) or not math.isfinite(to):raise HTTPException(400,'invalid sizing')
    if (kind=='raise')!=(p['toCall']>0):raise HTTPException(400,'use bet when checked to; raise when facing a bet')
    cap=p['wagers'][actor]+p['stacks'][actor]
    minimum=p['minRaiseTo'] if kind=='raise' else min(1.,cap)
    if to>cap+1e-6 or to<=p['wagers'][actor]+p['toCall'] or (to<minimum-1e-6 and abs(to-cap)>1e-6):raise HTTPException(400,'illegal size')
    if not any(p['active'][i] and p['stacks'][i]>0 for i in range(p['players']) if i!=actor):raise HTTPException(400,'no opponent can call a raise')
    spec=copy.deepcopy(base['solve']);denom=p['pot']+p['toCall'] if kind=='raise' else p['pot']
    numerator=to-max(p['wagers']) if kind=='raise' else to-p['wagers'][actor]
    spec.setdefault('extras',[]).append(dict(player=actor,kind=kind,fraction=numerator/denom,street=len(p['board'])-3))
    key=store.enqueue('size',dict(spec=spec,cards=p['cards'],kind=kind,to=float(to)))
    return dict(id=key,**store.result(key))


@router.get('/scroll/jobs/{key}')
def job(key:str):
    r=store.result(key)
    if not r or r['kind']!='size':raise HTTPException(404,'request not found')
    return r


@router.post('/admin/scroll/publish')
async def publish(request:Request):
    _check(request);d=await body(request)
    try:
        profiles=[(e['scenario']['players'],{3:'flop',4:'turn',5:'river'}[len(e['scenario']['board'])]) for e in d['items']]
        require_publication(d.get('validation'),profiles)
        return {'published':store.publish(d['items'])}
    except (ValueError,KeyError,TypeError) as e:raise HTTPException(400,str(e))


@router.get('/admin/scroll/status')
def status(request:Request):_check(request);return store.status()


@router.post('/admin/scroll/control')
async def control(request:Request):
    _check(request);d=await body(request,1024)
    if type(d.get('paused')) is not bool:raise HTTPException(400,'paused must be boolean')
    store.control(d['paused']);return store.status()


@router.post('/admin/scroll/lease')
def lease(request:Request):_check(request);return store.lease()


@router.post('/admin/scroll/heartbeat/{key}')
async def heartbeat(key:str,request:Request):
    _check(request);d=await body(request,1024)
    try:store.heartbeat(key,d['lease']);return {'ok':True}
    except (ValueError,KeyError) as e:raise HTTPException(409,str(e))


@router.post('/admin/scroll/complete/{key}')
async def complete(key:str,request:Request):
    _check(request);d=await body(request)
    try:store.complete(key,d['lease'],d.get('result'),d.get('error'));return {'ok':True}
    except (ValueError,KeyError) as e:raise HTTPException(409,str(e))

@router.get('/scroll/hands/catalogue')
def hand_catalogue():
    from .scroll_hands import catalogue
    return catalogue()


@router.get('/scroll/hands/{ident}')
def hand(ident:str):
    from .scroll_hands import get
    result=get(ident)
    if result is None:raise HTTPException(404,'full hand not found')
    return result


@router.post('/admin/scroll/hands/publish')
async def publish_hands(request:Request):
    _check(request);d=await body(request)
    from .scroll_hands import publish
    try:
        profiles=[(item['scenario']['players'],{3:'flop',4:'turn',5:'river'}[len(item['scenario']['board'])])
                  for entry in d['items'] for item in entry['hand']['decisions']]
        require_publication(d.get('validation'),profiles)
        return dict(published=publish(d['items'],d['validation']))
    except (ValueError,KeyError,TypeError) as exc:raise HTTPException(400,str(exc))

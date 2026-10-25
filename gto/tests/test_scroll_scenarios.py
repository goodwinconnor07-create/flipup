"""Actual solves + publication, lease, cache and grading integrity regressions."""
import asyncio,copy,json,time,sys
from pathlib import Path
import numpy as np
import pytest
import httpx
from fastapi import FastAPI
from flipup_gto import scroll_store as store,scroll_api
from flipup_gto.scroll_scenarios import solve_entry,validate_public,VERSION
from flipup_gto.cards import parse_combo

AUTH={'Authorization':'Bearer secret'}


@pytest.fixture
def entry():
    p=next(Path('/tmp/scroll-fresh-pilot').glob('s-*.entry.json'),None) if Path('/tmp/scroll-fresh-pilot').exists() else None
    # No test depends on workspace artifacts: build a narrow exactly solved river when absent.
    ranges=np.zeros((2,1326))
    for player,hands in enumerate([['AhAd','QhQd'],['AcAs','JcJd']]):
        for hand in hands:ranges[player,parse_combo(hand)]=1
    from flipup_gto.cards import parse_cards
    spec=dict(version=VERSION,players=2,board=parse_cards('Ks8d3c7h2s'),pot=10.,stack=5.,ranges=ranges.tolist(),path=[],extras=[])
    scenario=solve_entry(spec,parse_combo('AhAd'),maximum=2000,memory=256)
    return dict(scenario=scenario,solve=spec)


@pytest.fixture
def api(tmp_path,monkeypatch):
    monkeypatch.setattr(store,'ROOT',tmp_path/'scroll');monkeypatch.setenv('FLIPUP_UPLOAD_TOKEN','secret')
    app=FastAPI();app.include_router(scroll_api.router)
    class Client:
        def request(self,m,p,**kw):
            async def go():
                async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://test') as c:return await c.request(m,p,**kw)
            return asyncio.run(go())
        def get(self,p,**kw):return self.request('GET',p,**kw)
        def post(self,p,**kw):return self.request('POST',p,**kw)
    return Client()


def test_stable_scenario_and_analytic_fold(entry):
    s=validate_public(entry['scenario'])
    assert s['quality']['gapPct']<=.1 and s['quality']['heroFrequencyDrift']<=.03
    assert sum(o['freq'] for o in s['options'])==pytest.approx(1,abs=1e-5)
    assert any(o['kind']=='allin' for o in s['options'])
    assert next(o for o in s['options'] if o['kind']=='fold')['ev']==0


def test_publish_is_private_atomic_and_public_catalogue_is_deduplicated(api,entry):
    assert api.post('/admin/scroll/publish',json={'items':[entry]}).status_code==401
    bad=copy.deepcopy(entry);bad['scenario']['quality']['gapPct']=9
    assert api.post('/admin/scroll/publish',json={'items':[entry,bad]},headers=AUTH).status_code==400
    assert api.get('/scroll/catalogue').json()['count']==0
    assert api.post('/admin/scroll/publish',json={'items':[entry]},headers=AUTH).status_code==200
    assert api.post('/admin/scroll/publish',json={'items':[entry]},headers=AUTH).status_code==200
    cat=api.get('/scroll/catalogue').json();assert cat['count']==1
    public=api.get('/scroll/scenarios/'+cat['items'][0]['id']).json()
    assert 'solve' not in public and 'quality' in public


def test_queue_keys_include_full_ranges_tree_and_path(api,entry):
    key=store.enqueue('size',{'spec':entry['solve'],'to':7})
    assert key==store.enqueue('size',{'spec':entry['solve'],'to':7})
    changed=copy.deepcopy(entry['solve']);changed['ranges'][0][100]=.3
    assert key!=store.enqueue('size',{'spec':changed,'to':7})
    assert key!=store.enqueue('size',{'spec':entry['solve'],'to':8})
    job=store.lease();assert job['id']==key and store.lease()['id']!=key
    with pytest.raises(ValueError,match='stale'):store.complete(key,'wrong',error='no')
    store.complete(key,job['lease'],value={'quality':entry['scenario']['quality'],'option':entry['scenario']['options'][0]})
    assert store.result(key)['status']=='done'


def test_pause_and_three_failed_attempts_do_not_loop_forever(api):
    key=store.enqueue('size',{'unique':1});store.control(True);assert store.lease() is None
    store.control(False)
    for i in range(3):
        job=store.lease();assert job['attempt']==i+1
        store.complete(key,job['lease'],error='not converged')
    assert store.result(key)['status']=='failed' and store.lease() is None


def test_custom_cache_identity_and_no_public_custom_result(api):
    from flipup_gto.custom_cache import cached,identity
    req={'players':2,'board':['As','Kd','Qc'],'hero_cards':'AhAd'}
    key=store.enqueue('custom',{'request':req,'spec':{},'response':{}},identity=identity(req))
    job=store.lease();store.complete(key,job['lease'],value={'quality':{'gapPct':.01,'heroFrequencyDrift':.01},'response':{'accuracy':'verified'}})
    assert cached(req)=={'accuracy':'verified'}
    assert cached({**req,'hero_cards':'KhKd'}) is None
    assert api.get('/scroll/jobs/'+key).status_code==404


def test_ungraded_size_rejects_illegal_actions(api,entry):
    store.publish([entry]);ident=entry['scenario']['id']
    assert api.post('/scroll/size',json={'scenario':ident,'kind':'raise','to':4}).status_code==400
    assert api.post('/scroll/size',json={'scenario':ident,'kind':'bet','to':5000}).status_code==400
    r=api.post('/scroll/size',json={'scenario':ident,'kind':'bet','to':1.8})
    assert r.status_code==200 and r.json()['status']=='queued'


def test_offtree_refinement_returns_one_consistent_new_tree(api,entry):
    store.publish([entry]);ident=entry['scenario']['id']
    r=api.post('/scroll/size',json={'scenario':ident,'kind':'bet','to':1.8});assert r.status_code==200
    job=store.lease()
    sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
    from scroll_worker import process
    class Client:
        def _call(self,method,path,body=None):
            response=api.request(method,'/admin'+path,content=body,headers=AUTH)
            assert response.status_code==200,response.text
            return response.status_code,response.content
    process(Client(),job,256)
    result=store.result(job['id'])
    with store.db() as conn:last_error=conn.execute('SELECT error FROM jobs WHERE id=?',(job['id'],)).fetchone()[0]
    assert result['status']=='done',(result,last_error)
    value=result['result'];scenario=value['scenario'];chosen=value['option']
    assert chosen['to']==pytest.approx(1.8)
    assert chosen in scenario['options']
    assert validate_public(scenario)
    assert store.get_scenario(scenario['id'])==scenario


def test_zero_opponent_reach_does_not_freeze_off_path_average_strategy(entry):
    from flipup_gto.scroll_scenarios import build
    spec=copy.deepcopy(entry['solve']);spec['extras']=[{'player':0,'kind':'bet','fraction':.18}]
    solver=build(spec,256);solver.engine.iterate(1000)
    # Before the correction this stayed near .353%, even at 16,000 passes.
    assert solver.exploitability_pct()<.01


def test_stored_flop_is_queued_without_claiming_verified_accuracy(api):
    from flipup_gto.custom import Explorer
    from flipup_gto.cards import parse_cards
    class Library:
        def node(self,path):
            return dict(player=0,pot=6.,labels=['Check','Bet'],actions=[{'type':'check','amount':0.,'all_in':False},
                        {'type':'bet','amount':2.,'all_in':False}],reach=np.asarray([1.]),
                        strategy=np.asarray([[.5],[.5]]),ev=np.asarray([[1.],[1.]]))
        def combo_row(self,player,combo):return 0
    out=dict(players=[{} for _ in range(6)],history=[],notes=[])
    req=dict(players=6,hero=5,hero_cards='AhAd',board=['Ks','8d','3c'],preflop=[],flop=[],turn=[],river=[])
    ex=object.__new__(Explorer)
    result=ex._from_library(out,Library(),[],5,3,{5:0,3:1},[5,3],5,parse_combo('AhAd'),
                            ['UTG','HJ','CO','BTN','SB','BB'],6.,98.,{5:np.ones(1326),3:np.ones(1326)},parse_cards('Ks8d3c'),req)
    assert result['done']['accuracy']=='estimate' and result['done']['refinementQueued']
    queued=store.lease();assert queued['kind']=='custom'
    assert queued['payload']['spec']['board']==parse_cards('Ks8d3c')

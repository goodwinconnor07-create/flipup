import hashlib
import json
from pathlib import Path
import sys
import numpy as np
import pytest
from fastapi import FastAPI
import asyncio
import httpx
from flipup_gto import _engine as E,network_admin
from flipup_gto.cards import parse_cards,parse_combo
from flipup_gto.strategy import extract_rows,action_features,context,predict,load,MAX_ACTIONS,CONTEXT_DIM
from flipup_gto.solver import PostflopSolver
from flipup_gto import valuenet as vn

AUTH={'Authorization':'Bearer test'}


@pytest.fixture
def uploads(tmp_path,monkeypatch):
    monkeypatch.setattr(network_admin,'ROOT',tmp_path/'store')
    monkeypatch.setenv('FLIPUP_UPLOAD_TOKEN','test')
    app=FastAPI();app.include_router(network_admin.router)
    class Client:
        def request(self,method,url,**kw):
            async def call():
                async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://test') as c:
                    return await c.request(method,url,**kw)
            return asyncio.run(call())
        def get(self,url,**kw):return self.request('GET',url,**kw)
        def put(self,url,**kw):return self.request('PUT',url,**kw)
    return Client()


def test_artifacts_auth_checksum_roundtrip_and_snapshots(uploads):
    body=b'data';sha=hashlib.sha256(body).hexdigest();url=f'/admin/network/case/objects/{sha}'
    assert uploads.put(url,content=body).status_code==401
    assert uploads.put(url,content=b'bad',headers=AUTH).status_code==400
    assert uploads.put(url,content=body,headers=AUTH).json()['status']=='saved'
    assert uploads.put(url,content=body,headers=AUTH).json()['status']=='exists'
    assert uploads.get(url,headers=AUTH).content==body
    snapshot=b'{"files":[]}';ss=hashlib.sha256(snapshot).hexdigest()
    assert uploads.put(f'/admin/network/case/snapshots/{ss}',content=snapshot,headers=AUTH).status_code==200
    assert uploads.get('/admin/network/case/snapshots',headers=AUTH).json()['snapshots'][0]['sha']==ss


def test_artifact_limits_and_no_public_access(uploads,monkeypatch):
    monkeypatch.setattr(network_admin,'MAX_BYTES',4)
    body=b'12345';sha=hashlib.sha256(body).hexdigest()
    assert uploads.put(f'/admin/network/case/objects/{sha}',content=body,headers=AUTH).status_code==413
    monkeypatch.setattr(network_admin,'MAX_BYTES',100)
    monkeypatch.setattr(network_admin,'QUOTA_BYTES',1)
    assert uploads.put(f'/admin/network/case/objects/{sha}',content=body,headers=AUTH).status_code==507
    monkeypatch.delenv('FLIPUP_UPLOAD_TOKEN')
    assert uploads.get('/admin/network/case/snapshots',headers=AUTH).status_code==404


def test_strategy_export_legal_normalized_and_inference_parity(tmp_path):
    torch=pytest.importorskip('torch')
    sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
    from train_strategy_model import PolicyNet
    from flipup_gto.value_data import atomic_npz
    from flipup_gto.strategy import FEATURES
    s=PostflopSolver('Ks8d3c7h2s',10,5,np.ones(1326),np.ones(1326));s.engine.iterate(50)
    rows=extract_rows(lambda p:s.engine.query(p,False,True),5,np.random.default_rng(3),node_limit=2,combos_per_node=3)
    assert rows['policy_context'].shape==(6,CONTEXT_DIM)
    assert np.allclose(rows['policy_target'].sum(1),1)
    assert np.all(rows['policy_target'][~rows['policy_mask']]==0)
    net=PolicyNet(8).eval();layers=[l for l in net.body if isinstance(l,torch.nn.Linear)]
    path=tmp_path/'policy.npz'
    atomic_npz(path,layers=np.asarray(len(layers)),metadata=np.asarray(json.dumps({'features':FEATURES})),
               **{f'w{i}':l.weight.detach().numpy() for i,l in enumerate(layers)},
               **{f'b{i}':l.bias.detach().numpy() for i,l in enumerate(layers)})
    c,a,m=[rows['policy_'+k][0] for k in ('context','actions','mask')]
    with torch.no_grad():l,e=net(torch.tensor(c[None]),torch.tensor(a[None]),torch.tensor(m[None]))
    p,ev=predict(load(path),c,a,m)
    assert np.allclose(p,l.softmax(-1).numpy()[0],atol=1e-6)
    assert np.allclose(ev,e.numpy()[0],atol=1e-6)
    assert np.all(p[~m]==0)


def test_exact_threeway_folded_cards_and_ties():
    sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
    from audit_multiway_teacher import exact_checkdown
    rng=np.random.default_rng(3)
    board=parse_cards('Ks8d3c7h2s')
    pool=[c for c in range(52) if c not in board][:12]
    combos=[E.combo_index(a,b) for i,a in enumerate(pool) for b in pool[i+1:]]
    ranges=np.zeros((3,1326),dtype=np.float32)
    for p in range(3):ranges[p,rng.choice(combos,8,replace=False)]=rng.uniform(.1,1,8)
    for active in [7,3,5,6]:
        cfg=E.MWConfig();cfg.players=3;cfg.board=board;cfg.range=ranges.tolist();cfg.pot=10;cfg.stack=20;cfg.initial_active=active
        for st in range(3):cfg.set_sizes(st,[],[])
        s=E.MultiwaySolver(cfg);s.iterate(1)
        assert np.allclose(s.root_ev(),exact_checkdown(board,ranges,10,active),atol=2e-5)
        q=s.query([],False,False)
        sums=[np.sum(w) for w in q['weight']]
        assert np.allclose(sums,sums[0],rtol=1e-6)


def test_exact_threeway_betting_conserves_pot_and_tree_budget():
    cfg=E.MWConfig();cfg.players=3;cfg.board=parse_cards('Ks8d3c7h2s');cfg.pot=10;cfg.stack=3
    rr=np.zeros((3,1326)).tolist()
    for p,hs in enumerate([['AhAd','QhQd'],['AcAs','JcJd'],['QcQs','TcTd']]):
        for h in hs:rr[p][parse_combo(h)]=1
    cfg.range=rr
    cfg.set_sizes(2,[.5],[.6]);cfg.max_raises=1
    s=E.MultiwaySolver(cfg);s.iterate(100)
    assert sum(s.root_ev())==pytest.approx(10,abs=1e-4)
    cfg.max_nodes=2
    with pytest.raises(MemoryError,match='node budget'):E.MultiwaySolver(cfg)


def test_fourway_not_silently_approximate():
    cfg=E.MWConfig();cfg.players=4;cfg.board=parse_cards('Ks8d3c7h2s');cfg.pot=10;cfg.stack=20
    cfg.range=np.ones((4,1326)).tolist()
    with pytest.raises(ValueError,match='four-player'):E.MultiwaySolver(cfg)


def test_backup_and_peer_restore_verify_checksums(uploads,tmp_path):
    sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
    from campaign_sync import Artifacts
    class LocalArtifacts(Artifacts):
        def __init__(self):pass
        def call(self,method,run,kind,sha='',body=None):
            url=f'/admin/network/{run}/{kind}'+('/'+sha if sha else '')
            r=uploads.request(method,url,content=body,headers=AUTH)
            assert r.status_code==200
            return r.content
    source=tmp_path/'worker';source.mkdir()
    (source/'jobs').mkdir();(source/'jobs'/'data.npz').write_bytes(b'opaque data')
    (source/'.private').write_text('never uploaded')
    client=LocalArtifacts();assert client.push(source,'campaign-worker0')==1
    restored=tmp_path/'peer';assert client.pull(restored,'campaign-worker0')==1
    assert (restored/'jobs/data.npz').read_bytes()==b'opaque data'
    assert not (restored/'.private').exists()
    # Mutable reports are backed up as new immutable objects in the next snapshot.
    (source/'report.json').write_text('{"passed": false}')
    assert client.push(source,'campaign-worker0')==2
    assert client.pull(restored,'campaign-worker0')==1
    assert json.loads((restored/'report.json').read_text())=={'passed':False}


def test_policy_context_suit_invariance_with_asymmetric_ranges():
    from flipup_gto.cards import combo_cards
    rng=np.random.default_rng(8)
    board=parse_cards('Ks8s3s7s2s');hero=parse_combo('AsQs')
    ranges=rng.uniform(.1,1,(2,1326)).astype(np.float32)
    def info(b):
        return dict(board=b,_buckets=vn.bucket_of(vn.strength_ranks(b)),player=0,pot=10.,
                    contrib=[0.,0.],stack=[20.,20.])
    original=context(info(board),ranges,hero,20)
    perm=[2,0,3,1]
    card=lambda c:c//4*4+perm[c%4]
    changed=np.zeros_like(ranges)
    for c in range(1326):
        a,b=combo_cards(c);changed[:,E.combo_index(card(a),card(b))]=ranges[:,c]
    a,b=combo_cards(hero)
    mapped=context(info([card(c) for c in board]),changed,E.combo_index(card(a),card(b)),20)
    assert np.allclose(original,mapped,atol=2e-6)

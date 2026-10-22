import pytest
from flipup_ml.infer import UnsupportedInput

@pytest.mark.parametrize('kwargs,reason',[
    ({'spot':'unknown'},'six'),
    ({'players':3},'heads-up'),
    ({'street':'turn'},'flop street'),
    ({'path':[0,0,0,0]},'deeper'),
    ({'path':[{'type':'bet','amount':3.0}]},'size'),
    ({'path':['Bet 50%']},'size'),
    ({'path':[1]},'index'),
    ({'stack':96},'Stack'),
    ({'stack':float('nan')},'Stack'),
    ({'stack':'not a stack'},'Stack'),
    ({'board':'KsKs2c'},'duplicate'),
    ({'board':'Ks7d2c3h'},'three'),
    ({'board':[60,4,8]},'0..51'),
    ({'hand':'KhAs'},'conflicts'),
    ({'hand':'5c6d'},'root range'),
    ({'hand':'AsAs'},'duplicate'),
    ({'rake':.01},'rake'),
    ({'rake_cap':1},'rake'),
    ({'spot':'co_bb'},'No training data'),
    ({'path':[False]},'token'),
    ({'path':[0,{'type':'bet'}]},'amount'),
    ({'path':[0,{'type':'bet','amount':1.82}]},'exactly'),
])
def test_rejections(predictor,kwargs,reason):
    args={'spot':'btn_bb','board':'Kh7d2c','path':[]}; args.update(kwargs)
    with pytest.raises(UnsupportedInput,match=reason): predictor.predict(**args)

def test_supported_and_suit_mapping(predictor):
    a=predictor.predict('btn_bb','Kh7d2c',[],hand='AsAh')
    assert a['supported'] and a['evidence']=='synthetic_fixture_only'
    assert len(a['hands'])==1
    assert sum(x['strategy'] for x in a['hands'][0]['actions'])==1
    assert predictor.predict('btn_bb','Ks7c2d',[])['supported']

def test_exact_size_accepted(predictor):
    a=predictor.predict('btn_bb','Kh7d2c',[0,{'type':'bet','amount':1.815}])
    assert a['supported']

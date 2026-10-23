import numpy as np
from flipup_ml.data import read_entry,build_dataset
from flipup_ml.evaluate import grades,reference_grades,evaluate
from flipup_ml.stream_metrics import MetricAccumulator
from flipup_ml.stream_data import sample
from flipup_ml.stream_baselines import Baselines
from flipup_ml.baselines import Chart,Equity

def cached(fake_entry,tmp_path):
    d=build_dataset([read_entry(fake_entry)],tmp_path/'cache')
    return d,{'cache':str(next((tmp_path/'cache').glob('*.npz'))),'spot':'btn_bb','board':fake_entry.stem}

def test_compiled_repository_grade_matches_reference_random_and_boundaries():
    rng=np.random.default_rng(42)
    ev=rng.normal(size=(5000,8))*5; strategy=rng.random((5000,8)); mask=rng.random((5000,8))>.2; mask[:,0]=True
    pot=rng.uniform(2,100,5000)
    assert np.array_equal(grades(ev,strategy,mask,pot),reference_grades(ev,strategy,mask,pot))
    losses=np.array([0,.25,.5,1,2.5,8,8.00000001])
    for p in (2.,5.5,20.5,100.):
        e=np.c_[np.zeros(len(losses)),-losses*p/100]
        for freq in (.0,.03499999,.035,.5,1.):
            s=np.tile([1-freq,freq],(len(e),1)); m=np.ones_like(e,bool); pots=np.full(len(e),p)
            assert np.array_equal(grades(e,s,m,pots),reference_grades(e,s,m,pots))

def test_stream_metrics_equal_reference_all_rows(fake_entry,tmp_path):
    d,_=cached(fake_entry,tmp_path); rng=np.random.default_rng(4)
    ev=d['ev']+rng.normal(size=d['ev'].shape); s=rng.random(d['ev'].shape)*d['mask']; s/=s.sum(1,keepdims=True)
    expected=evaluate(d,ev,s); acc=MetricAccumulator()
    for ids in (np.arange(3),np.arange(3,7),np.arange(7,9)):
        acc.update({k:v[ids] for k,v in d.items()},ev[ids],s[ids])
    actual=acc.finish()
    for mode in ('reach_weighted','unweighted'):
        for key,value in expected[mode].items():
            if value is None: assert actual[mode][key] is None
            else: assert np.allclose(actual[mode][key],value),key

def test_stream_baselines_match_in_memory_and_sampling_correction(fake_entry,tmp_path):
    d,record=cached(fake_entry,tmp_path); rng=np.random.default_rng(8)
    d['ev']=rng.normal(size=d['ev'].shape)*d['mask']
    np.savez_compressed(record['cache'],**d)
    stream=Baselines().fit([record]).predict(d)
    for name,model in [('B0_chart',Chart()),('B1_equity',Equity())]:
        model.fit(d); e,s=model.predict(d)
        assert np.allclose(stream[name][0],e,atol=1e-5)
        assert np.allclose(stream[name][1],s,atol=1e-5)
    sampled,counts=sample([record],per_node=2)
    assert counts['sampled_rows']==6
    assert np.isclose(sampled['weight'].sum(),d['weight'].sum())

def test_cache_separates_spot_identity(fake_entry,tmp_path):
    e=read_entry(fake_entry); f=read_entry(fake_entry); f.spot='co_bb'
    d=build_dataset([e,f],tmp_path/'cache')
    assert len(list((tmp_path/'cache').glob('*.npz')))==2
    assert d['x'][0,0]==1 and d['x'][9,1]==1

def test_end_to_end_streamed_evaluation(fake_entry,tmp_path):
    from flipup_ml.real_run import evaluate_records
    from flipup_ml.model import EVModel
    d,record=cached(fake_entry,tmp_path)
    baseline=Baselines().fit([record]); model=EVModel(d['x'].shape[1])
    values=evaluate_records(model,baseline,[record])
    assert set(values)=={'MLP','B0_chart','B1_equity'}
    for result in values.values():
        assert result['unweighted']['rows']==len(d['x'])
        assert 'strength' in result['by']

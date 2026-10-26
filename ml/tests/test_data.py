import json
import numpy as np
import pytest
from flipup_ml.data import read_entry,load_entries,domain,build_dataset
from flipup_ml.features import context,feature_rows

def test_shapes_padding_and_reach_not_a_feature(fake_entry,tmp_path):
    e=read_entry(fake_entry)
    ds=build_dataset([e],tmp_path/'cache',eq_samples=32)
    assert ds['ev'].shape==(9,8)
    assert np.allclose((ds['strategy']*ds['mask']).sum(1),1)
    assert np.all(ds['ev'][ds['mask']==0]==0)
    x,*_=feature_rows(e.spot,e.board,e.meta,'0.1',e.arrays['combos0'],e.roots,32)
    e.arrays['r:0.1']*=.1
    y,*_=feature_rows(e.spot,e.board,e.meta,'0.1',e.arrays['combos0'],e.roots,32)
    assert np.array_equal(x,y)
    wagers,_,to_call=context(e.meta,'0.1')
    assert wagers==[0.,1.815] and to_call==1.815

def test_exploitability_drops_and_unreadable_list(fake_entry):
    e=read_entry(fake_entry); e.meta['exploitability_pct']=.51
    np.savez_compressed(fake_entry,**{**e.arrays,'meta':json.dumps(e.meta)})
    (fake_entry.parent/'bad.npz').write_bytes(b'broken')
    entries,failed,dropped=load_entries(fake_entry.parent.parent)
    assert len(dropped)==1 and len(failed)==1 and not entries

def test_range_mixing_rejected(fake_entry):
    e=read_entry(fake_entry); f=read_entry(fake_entry)
    f.roots[0]=f.roots[0].copy(); f.roots[0][f.arrays['combos0'][0]]=.2
    with pytest.raises(ValueError,match='Mixed root ranges'): domain([e,f])

def test_strategy_corruption_rejected(fake_entry):
    e=read_entry(fake_entry); e.arrays['s:0']*=.5
    np.savez_compressed(fake_entry,**e.arrays)
    with pytest.raises(ValueError,match='Unnormalised'): read_entry(fake_entry)

def test_absent_unblocked_range_member_rejected(fake_entry):
    e=read_entry(fake_entry); f=read_entry(fake_entry)
    f.arrays=dict(f.arrays)
    f.arrays['combos0']=f.arrays['combos0'][1:]
    with pytest.raises(ValueError,match='unblocked combo'): domain([e,f])

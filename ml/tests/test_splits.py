import numpy as np
import pytest
from flipup_ml.splits import grouped_split,grouped_folds,assert_disjoint,family_split
from flipup_ml.features import board_group,frequency
from flipup_gto.cards import parse_cards

def test_no_rank_triple_leak_across_spots_suits_nodes():
    groups=np.repeat([str(i) for i in range(60)],24)
    strata=np.tile(['paired:rainbow','unpaired:monotone'],len(groups)//2)
    a=grouped_split(groups,strata)
    assert_disjoint(groups,a)
    assert np.array_equal(a,grouped_split(groups,strata))
    assert set(a)=={0,1,2}
    assert_disjoint(groups,grouped_folds(groups,strata))

def test_suit_cousins_same_rank_group():
    assert board_group(parse_cards('Kh7d2c'))==board_group(parse_cards('Ks7s2s'))

def test_frequency_orbit():
    assert frequency(tuple(parse_cards('Kh7d2c')))==24
    assert frequency(tuple(parse_cards('Ks7s2s')))==4

def test_family_removes_whole_groups():
    groups=np.repeat([str(i) for i in range(20)],2)
    family=np.zeros(40,bool); family[0]=True
    a=family_split(groups,family,np.full(40,'rainbow'))
    assert a[0]==a[1]==2
    assert_disjoint(groups,a)

def test_too_few_groups():
    with pytest.raises(ValueError): grouped_split(['a','b'],['x','x'])

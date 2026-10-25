"""Protocol fixtures only: no strategy solver runs."""
import json,sys
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from reuse_flop_library import boundaries

def fixture(second='check'):
    return {'meta':np.asarray(json.dumps(dict(pot=4,stack=10,nodes={
        '':dict(player=0,actions=[dict(type='check',amount=0)]),
        '0':dict(player=1,actions=[dict(type=second,amount=2 if second=='bet' else 0)])}))),
        'combos0':np.array([1]),'combos1':np.array([2]),'r:':np.array([1.]),'r:0':np.array([1.]),'s:':np.array([[1.]]),'s:0':np.array([[1.]])}

def test_two_checks_form_real_boundary():
    result=list(boundaries(fixture()))
    assert len(result)==1 and result[0]['pot']==4 and result[0]['stack']==10

def test_missing_child_does_not_mean_street_finished():
    assert list(boundaries(fixture('bet')))==[]

import numpy as np
from flipup_ml.evaluate import metrics,grades

def dataset():
    return {'ev':np.array([[2.,1.,0,0,0,0,0,0],[0.,4.,0,0,0,0,0,0]]),'strategy':np.array([[1.,0,0,0,0,0,0,0],[0.,1,0,0,0,0,0,0]]),'mask':np.array([[1,1,0,0,0,0,0,0]]*2),'pot':np.array([10.,10.]),'reach':np.ones(2),'weight':np.array([2.,1.])}

def test_perfect_predictor_and_ev_offset():
    d=dataset(); e=d['ev']+50*d['mask']
    m=metrics(d,e,d['strategy'])
    assert m['centred_mae_bb']==0 and m['mean_regret_pct_pot']==0
    assert m['grade_agreement']==1 and m['false_costly_rate']==0

def test_bad_action_selection_is_measured():
    d=dataset(); e=d['ev'][:,::-1].copy()
    e[:,0]=d['ev'][:,1]; e[:,1]=d['ev'][:,0]
    m=metrics(d,e,d['strategy'][:,[1,0,2,3,4,5,6,7]])
    assert m['mean_regret_pct_pot']==20
    assert m['p95_regret_pct_pot']==40
    assert m['false_costly_rate']==1 and m['missed_costly_rate']==1

def test_unreachable_hands_excluded_from_grades_only():
    d=dataset(); d['reach'][0]=.001
    assert metrics(d,d['ev'],d['strategy'])['grade_actions']==2

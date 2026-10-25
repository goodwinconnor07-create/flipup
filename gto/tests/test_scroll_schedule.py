import pytest
from flipup_gto.scroll_schedule import choose_work

def test_schedule_requires_matching_inputs_and_validation():
    jobs={'spots':[{'players':2,'board':[0,1,2,3,4]},{'players':3,'board':[0,1,2,3]}]}
    report={'coverage':[[2,'river']]}
    assert choose_work(jobs,report,'fast',10)==(2,'river')
    report['coverage'].append([3,'turn'])
    assert choose_work(jobs,report,'fast',1)==(3,'turn')
    assert choose_work(jobs,report,'slow',1)==(2,'river')
    with pytest.raises(ValueError):choose_work(jobs,{'coverage':[]},'fast',0)

"""Planning only: no training or poker solves."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from scroll_models import ready

def test_training_waits_for_distinct_groups_in_every_split():
    assert not ready(dict(train=500,validation=0,test=0))
    assert not ready(dict(train=100,validation=19,test=20))
    assert ready(dict(train=100,validation=20,test=20))

"""Protocol fixtures only: no strategy solver runs."""
import json,sys
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from reuse_flop_library import boundaries,checkpoint

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

def test_backup_failure_preserves_local_results_and_retries(tmp_path):
    class Backup:
        calls=0
        def push(self,root,run):
            assert root==tmp_path and run=='reuse-test'
            self.calls+=1
            if self.calls==1:raise OSError('offline')
    backup=Backup();state=dict(roots=2,publicationApproved=False)
    checkpoint(tmp_path,state,backup,'reuse-test')
    stored=json.loads((tmp_path/'status.json').read_text())
    assert stored['roots']==2 and stored['backup']=='pending retry'
    assert stored['publicationApproved'] is False
    checkpoint(tmp_path,state,backup,'reuse-test')
    stored=json.loads((tmp_path/'status.json').read_text())
    assert stored['backup']=='uploaded' and 'backupError' not in stored

def test_missing_backup_credentials_are_visible(tmp_path):
    checkpoint(tmp_path,dict(publicationApproved=False))
    assert 'local only' in json.loads((tmp_path/'status.json').read_text())['backup']

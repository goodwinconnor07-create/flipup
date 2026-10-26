"""Artificial serialization fixtures only; no poker solver or real hand generation."""
import json
import numpy as np
import pytest
from flipup_gto.cards import combo_index
from flipup_gto.library_questions import load_questions,CONTEXT
from flipup_gto.value_data import split_for


def fixture(tmp_path,gap=.1):
    directory=tmp_path/'fixture';directory.mkdir();path=directory/'2c3c4c.npz'
    node=lambda p:dict(player=p,pot=4,actions=[dict(type='check',amount=0,all_in=False),dict(type='bet',amount=2,all_in=False)])
    np.savez(path,meta=np.asarray(json.dumps(dict(pot=4,stack=10,iterations=200,exploitability_pct=gap,nodes={'':node(0),'0':node(1)}))),
             combos0=[combo_index(12,16)],combos1=[combo_index(20,24)],
             **{'r:':np.array([1.]),'r:0':np.array([1.]),'s:':np.array([[.5],[.5]]),'s:0':np.array([[.5],[.5]]),
                'e:':np.array([[1.],[1.]]),'e:0':np.array([[1.],[1.]])})
    return path


def test_stored_labels_and_shapes_are_preserved(tmp_path):
    path=fixture(tmp_path);sha,questions=load_questions(path)
    assert len(questions)==2
    for q,row,board in questions:
        assert q['publicationApproved'] is False and q['source']['sha256']==sha
        assert [o['ev'] for o in q['options']]==[1,1]
        assert row['context'].shape==(CONTEXT,) and row['actions'].shape==(16,8)
        assert np.isclose(row['target'].sum(),1) and np.all(row['target'][~row['mask']]==0)
    assert load_questions(path)[1][0][0]['id']==questions[0][0]['id']


def test_convergence_threshold_does_not_get_relabelled(tmp_path):
    with pytest.raises(ValueError,match='convergence'):load_questions(fixture(tmp_path,gap=2))


def test_same_flop_suit_variants_have_same_split():
    assert split_for([0,4,8])==split_for([1,5,9])


def test_negligible_range_hands_are_not_selected(tmp_path):
    path=fixture(tmp_path)
    with np.load(path,allow_pickle=False) as d:arrays={k:d[k].copy() for k in d.files}
    rare=combo_index(20,24);common=combo_index(28,32)
    arrays.update(combos1=np.array([rare,common]))
    arrays['r:0']=np.array([.00006,1.])
    arrays['s:0']=np.array([[.5,.5],[.5,.5]])
    arrays['e:0']=np.array([[1.,1.],[1.,1.]])
    np.savez(path,**arrays)
    _,questions=load_questions(path)
    children=[q for q,_,_ in questions if q['source']['node']=='0']
    assert len(children)==1 and children[0]['source']['heroRangeShare']>.99

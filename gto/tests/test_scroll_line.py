"""Pure mocked node traversal; no numerical solver runs."""
import random
import pytest
from flipup_gto.scroll_line import walk_hand

def test_whole_line_traverses_chance_with_correct_player_ranges():
    node=dict(type='action',player=0,street=0,board=[0,1,2],strategy=[[1.]],combos0=[99],actions=[dict(type='check',amount=0,all_in=False)])
    def query(path):
        if not path:return node
        if len(path)==1:return dict(type='chance',deal_cards=[8],board=[0,1,2])
        return dict(type='showdown',board=[0,1,2,8,9])
    def answer(tokens,path,q,h):return dict(_node=q,scenario={'cards':'fixture'})
    result=walk_hand(query,answer,{0:99},[8,9],random.Random(1),2)
    assert result['path'][1]==dict(type='deal',card=8)
    assert result['decisions'][0]['line']==0
    assert result['events'][0]['type']=='check'

def test_truncated_leaves_cannot_be_exported_as_full_hands():
    with pytest.raises(ValueError,match='truncated'):
        walk_hand(lambda p:dict(type='leaf'),None,{},[],random.Random(1),2)

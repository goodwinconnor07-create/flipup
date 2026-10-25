"""Fabricated decision tables only; no engine invocation."""
from flipup_gto.scroll_paths import reached_paths

def test_reach_weighted_selection_reaches_deeper_contexts():
    node=dict(type='action',actions=[dict(type='check'),dict(type='bet'),dict(type='fold')],
              strategy=[[.8,0],[.2,0],[0,1]])
    def query(path):return node if len(path)<3 else dict(type='terminal')
    paths=reached_paths(query,lambda q:[1,0],max_contexts=20)
    assert [0,1] in paths and [1,0] in paths
    assert all(2 not in path for path in paths)
    assert len(paths)==7

def test_zero_reach_and_context_budget():
    node=dict(type='action',actions=[dict(type='check')],strategy=[[1]])
    assert reached_paths(lambda p:node,lambda q:[0])==[]
    assert len(reached_paths(lambda p:node,lambda q:[1],max_contexts=2))==2

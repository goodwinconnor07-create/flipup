"""One-question protocol, using synthetic serialization fixtures only; no solver runs."""
import json
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from scroll_one import grade,range_export,main
from test_library_questions import fixture
from flipup_gto.library_questions import load_questions


def test_rare_equal_ev_action_is_good():
    question=dict(pot=10,options=[dict(freq=.999,ev=1),dict(freq=.001,ev=1)])
    assert grade(question,1)['colour']=='green'
    assert grade(question,1)['lossBb']==0


def test_range_export_preserves_root_and_reached_weights(tmp_path):
    source=fixture(tmp_path);_,questions=load_questions(source)
    child=next(q for q,_,_ in questions if q['source']['node']=='0')
    data=range_export(source,child)
    assert sum(data['ranges'][0]['rootWeights'])==1
    assert sum(data['ranges'][0]['reachedWeights'])==.5
    assert data['settingsVerified'] is False


def test_trial_writes_exactly_one_question_and_a_bundle(tmp_path,monkeypatch):
    library=tmp_path/'library';library.mkdir();fixture(library)
    out=tmp_path/'trial'
    monkeypatch.setattr(sys,'argv',['scroll_one','--library',str(library),'--out',str(out)])
    main()
    assert (out/'trial.zip').is_file() and (out/'comparison.json').is_file()
    timing=json.loads((out/'timing.json').read_text())
    assert timing['questionsSaved']==1 and timing['pokerSolvesRun']==0
    assert len(list(out.glob('question*.json')))==1

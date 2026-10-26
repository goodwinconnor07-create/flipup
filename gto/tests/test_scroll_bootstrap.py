"""Fake commands only; no compiler, audit or numerical generation is run."""
import json
from pathlib import Path
import sys
import pytest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import scroll_bootstrap as bootstrap

def test_failed_stage_is_visible_and_stops_pipeline(tmp_path,monkeypatch):
    class Child:
        def __init__(self,*args,**kwargs):pass
        def wait(self):return 1
    monkeypatch.setattr(bootstrap.subprocess,'Popen',Child)
    with pytest.raises(SystemExit,match='Later stages blocked'):
        bootstrap.run_stage('audit',['fake'],tmp_path,tmp_path)
    assert json.loads((tmp_path/'bootstrap-status.json').read_text())['state']=='failed'

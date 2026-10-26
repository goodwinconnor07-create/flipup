"""Orchestration tests with fake subprocesses; no strategies or hands computed."""
import json
from pathlib import Path
import sys
import pytest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import scroll_drafts as runner


def test_failed_batches_stop_and_preserve_status(tmp_path,monkeypatch):
    audit=tmp_path/'audit.json';audit.write_text(json.dumps(dict(passed=True,engine='baseline',steps=[dict(exitCode=0)]*3)))
    out=tmp_path/'run';commands=[]
    class Child:
        def __init__(self,cmd,**kw):commands.append(cmd)
        def wait(self,timeout):return 1
    monkeypatch.setattr(runner.subprocess,'Popen',Child)
    monkeypatch.delenv('FLIPUP_UPLOAD_TOKEN',raising=False)
    monkeypatch.setattr(sys,'argv',['drafts','--out',str(out),'--role','fast','--audit',str(audit)])
    with pytest.raises(SystemExit,match='Three failed'):runner.main()
    state=json.loads((out/'status.json').read_text())
    assert state['consecutiveFailures']==3 and state['nextBatch']==3
    assert state['publicationApproved'] is False
    assert state['stage']=='stopped after three failures'
    assert state['backup'].startswith('local only')
    assert [c[c.index('--players')+1] for c in commands]==['2','2','3']
    assert len(list(out.glob('batch-*/worker.log')))==3


def test_failed_audit_never_starts_computation(tmp_path,monkeypatch):
    audit=tmp_path/'audit.json';audit.write_text(json.dumps(dict(passed=False,steps=[])))
    monkeypatch.setattr(sys,'argv',['drafts','--out',str(tmp_path/'out'),'--role','slow','--audit',str(audit)])
    def forbidden(*args,**kw):raise AssertionError('must not run a child')
    monkeypatch.setattr(runner.subprocess,'Popen',forbidden)
    with pytest.raises(SystemExit,match='passing internal audit'):runner.main()

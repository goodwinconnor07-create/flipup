"""Artificial monitoring files only; no solver or numerical labels are generated."""
import json
import os
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from scroll_dashboard import Monitor,render,duration


def write(path,data,stamp=100):
    path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(data));os.utime(path,(stamp,stamp))


def test_bootstrap_without_outputs_is_visible(tmp_path):
    write(tmp_path/'bootstrap-status.json',dict(stage='audit',state='running',updated=100))
    snapshot=Monitor(tmp_path).snapshot(now=110)
    assert snapshot['stage']=='audit'
    assert snapshot['elapsed'] is None and snapshot['counts']['hands']==0
    assert 'Startup/audit' in render(tmp_path,snapshot)


def test_counts_questions_not_private_opponent_decisions(tmp_path):
    data=tmp_path/'candidates';batch=data/'batch-000000'
    write(data/'status.json',dict(started=100,hours=48,stage='computing drafts',updated=110))
    write(batch/'x.input.json',{},100)
    write(batch/'x.fullhand.draft.json',dict(hand=dict(id='fixture',decisions=[dict(scenario=dict(players=2,board=[0,1,2]))]*2),privateDecisions=[{}]*6,root=dict(ranges='large private data')),160)
    write(batch/'y.input.json',{},150)
    write(batch/'y.rejected.json',dict(error='fixture rejection'),170)
    monitor=Monitor(tmp_path);s=monitor.snapshot(now=200)
    assert s['counts']['hands']==1 and s['counts']['questions']==2
    assert s['counts']['rejected']==1 and s['counts']['attempts']==2
    assert s['times']==[60] and s['unresolved']==0
    assert s['remaining']==48*3600-100
    assert all('root' not in record for _,record in monitor.cache.values())
    assert monitor.snapshot(now=201)['counts']['hands']==1


def test_partial_writes_and_failed_bootstrap_do_not_crash(tmp_path):
    write(tmp_path/'bootstrap-status.json',dict(stage='audit',state='failed',updated=100))
    batch=tmp_path/'batch-0';batch.mkdir()
    (batch/'x.draft.json').write_text('{')
    s=Monitor(tmp_path).snapshot(now=200)
    assert s['stage']=='audit: failed' and s['counts']['questions']==0
    assert duration(None)=='unavailable'


def test_existing_run_can_be_observed_without_writing(tmp_path):
    write(tmp_path/'status.json',dict(started=100,hours=1))
    before={p:p.read_bytes() for p in tmp_path.rglob('*') if p.is_file()}
    monitor=Monitor(tmp_path);monitor.snapshot(now=200);monitor.snapshot(now=210)
    assert before=={p:p.read_bytes() for p in tmp_path.rglob('*') if p.is_file()}

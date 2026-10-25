"""Mock HTTP only; preflight must not request any numerical work."""
import io
import json
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import launch_preflight


def test_http_success_is_not_poker_launch_approval(monkeypatch):
    calls=[]
    def urlopen(url,timeout):
        calls.append(url)
        if url.endswith('/catalogue'):body=dict(count=2,items=[])
        else:body=dict(ok=True,engine='fixture')
        return io.BytesIO(json.dumps(body).encode())
    monkeypatch.setattr(launch_preflight.urllib.request,'urlopen',urlopen)
    report=launch_preflight.inspect('https://app.test','https://coach.test')
    assert report['httpChecksPassed'] is True
    assert report['launchApproved'] is False
    assert len(calls)==5
    assert all(url.endswith(('/health','/catalogue')) for url in calls)


def test_unavailable_service_is_a_reported_blocker(monkeypatch):
    def offline(*args,**kwargs):raise OSError('offline')
    monkeypatch.setattr(launch_preflight.urllib.request,'urlopen',offline)
    report=launch_preflight.inspect('https://app.test','https://coach.test')
    assert report['httpChecksPassed'] is False
    assert all(not check['passed'] for check in report['checks'])

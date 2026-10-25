"""No solves: data contracts and withdrawal behavior only."""
import json
from pathlib import Path
import pytest
from flipup_gto.scroll_contract import validate_job,require_validation,fingerprint

def test_synthetic_and_unimplemented_games_fail_closed():
    job=dict(players=2,pot=10,stack=100,ranges=[[1.]*1326]*2,
             profile=dict(utility='chip-ev',rake_rate=0,rake_cap=0),
             range_origin=dict(source='test-fixture',history=['open','call'],synthetic=False))
    validate_job(job)
    for change in [dict(profile=dict(utility='icm',rake_rate=0,rake_cap=0)),
                   dict(profile=dict(utility='chip-ev',rake_rate=.05,rake_cap=3)),
                   dict(range_origin=dict(source='random',history=['open'],synthetic=True)),dict(players=4)]:
        with pytest.raises(ValueError):validate_job({**job,**change})

def test_receipt_requires_matching_engine_and_profile(tmp_path):
    p=tmp_path/'validation.json'
    p.write_text(json.dumps(dict(engine=fingerprint(),passed=True,coverage=[[2,'river']])))
    require_validation(p,2,'river')
    with pytest.raises(ValueError):require_validation(p,3,'river')
    p.write_text(json.dumps(dict(engine='old',passed=True)))
    with pytest.raises(ValueError):require_validation(p)

def test_withdrawal_ids_match_and_no_bundled_answers_remain():
    root=Path(__file__).resolve().parents[2]
    a=json.loads((root/'gto/flipup_gto/data/withdrawn_scroll.json').read_text())
    assert len(a)==80 and a==json.loads((root/'src/quiz/withdrawn.json').read_text())
    assert not list((root/'public/gto/scenarios').glob('s-*.json'))
    assert not (root/'gto/flipup_gto/data/scroll_seed_inputs.json.gz').exists()

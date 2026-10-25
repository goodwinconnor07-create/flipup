"""Release permissions and receipts only; no solver execution."""
import pytest
from flipup_gto.scroll_release import require_publication,readiness
from flipup_gto.scroll_contract import fingerprint


def test_publication_is_closed_by_default(monkeypatch):
    monkeypatch.delenv('FLIPUP_SCROLL_PUBLISH_ENABLED',raising=False)
    assert readiness()['scrollPublicationEnabled'] is False
    with pytest.raises(ValueError,match='disabled'):
        require_publication(dict(passed=True,engine=fingerprint()),[])


def test_opening_publication_still_requires_current_covered_receipt(monkeypatch):
    monkeypatch.setenv('FLIPUP_SCROLL_PUBLISH_ENABLED','1')
    for receipt in (None,dict(passed=True,engine='old'),dict(passed=False,engine=fingerprint())):
        with pytest.raises(ValueError,match='validation'):
            require_publication(receipt,[(2,'turn')])
    receipt=dict(passed=True,engine=fingerprint(),coverage=[[2,'turn']])
    require_publication(receipt,[(2,'turn')])
    with pytest.raises(ValueError,match='profile'):
        require_publication(receipt,[(3,'turn')])

"""Publication protocol only: reject unvalidated content without invoking a solver."""
import pytest
from flipup_gto import scroll_hands as hands
from flipup_gto.scroll_contract import fingerprint

def test_no_receipt_cannot_publish_any_hand():
    with pytest.raises(ValueError,match='independent validation'):hands.publish([],dict(passed=True,engine='old'))

def test_draft_flag_cannot_be_ignored():
    with pytest.raises(ValueError,match='draft hands'):
        hands.publish([dict(hand=dict(publicationApproved=False))],dict(passed=True,engine=fingerprint()))

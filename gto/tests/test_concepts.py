import pytest

from flipup_gto.cards import parse_cards as P
from flipup_gto.concepts import (alpha, board_texture, geometric_fraction, hand_features, mdf, required_equity,
                                 river_bluff_share, value_to_bluff)


def test_bet_math():
    assert required_equity(10, 5) == pytest.approx(0.25)
    assert required_equity(10, 10) == pytest.approx(1 / 3)
    assert mdf(10, 5) == pytest.approx(2 / 3)
    assert alpha(10, 10) == pytest.approx(0.5)
    assert river_bluff_share(10, 10) == pytest.approx(1 / 3)
    assert value_to_bluff(10, 5) == pytest.approx(3.0)
    # GTO Wizard's published geometric size for a 100bb single-raised pot over three streets.
    assert geometric_fraction(5.5, 97.5, 3) == pytest.approx(1.158, abs=0.002)


@pytest.mark.parametrize("hole,board,made,draw", [
    ("AhKd", "Ks9d5c", "Top pair, top kicker", None),
    ("QhQd", "Ks9d5c", "Pocket pair below top card", None),
    ("9h9c", "Ks9d5c", "Set", None),
    ("Ah5h", "Kh9h2c", "One overcard", "nut flush draw"),
    ("JsTs", "9h8c2d", "Two overcards", "open-ended straight draw"),
    ("Js7s", "9h8c2d", "One overcard", "gutshot"),
    ("AsAc", "Ks7d2c", "Overpair", None),
    ("8d7d", "Ks8h3d", "Second pair", "backdoor flush draw"),
])
def test_hand_features(hole, board, made, draw):
    f = hand_features(P(hole), P(board))
    assert f.made == made
    if draw:
        assert draw in f.draws


def test_board_texture():
    assert "monotone" in board_texture(P("Ah7h2h")).tags
    assert board_texture(P("Ks9d5c")).wetness == "dry"
    assert board_texture(P("QsJsTd")).wetness == "wet"
    assert board_texture(P("2s2c7h")).paired

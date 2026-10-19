import pytest

from flipup_gto.cards import class_combos, combo_str, hand_class, parse_card, parse_combo
from flipup_gto.ranges import Range


@pytest.mark.parametrize("text,combos", [
    ("22+", 78), ("AA", 6), ("AKs", 4), ("AKo", 12), ("AK", 16), ("A2s+", 48), ("KTo+", 36),
    ("99-66", 24), ("K9s-K6s", 16), ("AhKh", 1), ("AKs:0.5", 2), ("22+,A2s+,KTo+", 162),
])
def test_parse_counts(text, combos):
    assert Range.parse(text).combos() == pytest.approx(combos)


def test_classes():
    assert len(class_combos("QQ")) == 6
    assert hand_class(parse_combo("AhKh")) == "AKs"
    assert hand_class(parse_combo("Kd7c")) == "K7o"
    assert combo_str(parse_combo("7cKd")) == "Kd7c"


def test_dead_cards_and_roundtrip():
    r = Range.parse("AA,KK")
    assert r.without([parse_card("Ah")]).combos() == 9  # the Ah removes 3 of the 6 AA combos
    assert Range.parse(r.to_string()).combos() == 12

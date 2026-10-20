import json
import os

import pytest

from flipup_gto.handhistory import HandHistory
from flipup_gto.review import Reviewer, ReviewSettings, aggregate_session, grade

FIXTURES = os.path.join(os.path.dirname(__file__), "fixtures")


def load(name):
    return HandHistory.from_dict(json.load(open(os.path.join(FIXTURES, name))))


def test_positions_and_order():
    hh = load("srp_btn_vs_bb.json")
    assert hh.preflop_order() == ["utg", "hj", "co", "btn", "sb", "bb"]
    assert hh.positions()["btn"] == "BTN" and hh.positions()["bb"] == "BB"
    hu = load("hu_shove.json")
    assert hu.preflop_order() == ["a", "b"]


def test_flipup_log_adapter():
    log = {"number": 3, "lines": [
        "-- Hand #3 (dealer: Ollie) --", "Stacks: Ollie 200 · Big Al 200 · Con 180",
        "Big Al posts the small blind 1", "Con posts the big blind 2",
        "Ollie raises to 6", "Big Al folds", "Con calls 4",
        "Flop: [Ks] [9d] [5c]", "Con checks", "Ollie bets 4", "Con folds", "Ollie wins 16"],
        "holes": {"o": ["Ah", "Kd"], "a": [], "c": []}, "shown": []}
    players = [{"id": "o", "name": "Ollie", "seat": 0}, {"id": "a", "name": "Big Al", "seat": 1},
               {"id": "c", "name": "Con", "seat": 2}]
    hh = HandHistory.from_flipup_log(log, players, 1, 2)
    assert hh.button == "o" and hh.player("c").stack == 180
    assert [(a.player, a.move, a.to) for a in hh.actions] == [
        ("o", "raise", 6), ("a", "fold", 0), ("c", "call", 6), ("c", "check", 0), ("o", "bet", 4), ("c", "fold", 0)]
    assert len(hh.board) == 3 and hh.player("o").cards and hh.player("a").cards is None


def test_grades():
    assert grade(0.0, 10, 1.0, True) == "best"
    assert grade(0.04, 10, 0.3, False) == "correct"
    assert grade(0.2, 10, 0.0, False) == "inaccuracy"
    assert grade(0.6, 10, 0.0, False) == "mistake"
    assert grade(1.5, 10, 0.0, False) == "blunder"


def test_review_heads_up_shove(tmp_path):
    rv = Reviewer(ReviewSettings(preflop_iterations=300), cache_dir=str(tmp_path))
    r = rv.review(load("hu_shove.json"))
    by_player = {d["player"]: d for d in r["decisions"]}
    # K7o at 12bb: with limps in the tree GTO mostly limps; the shove is close behind.
    assert by_player["a"]["ev_loss_bb"] < 0.1 and by_player["a"]["grade"] != "blunder"
    assert by_player["b"]["best_action"] == "call"                 # Q8s calls the jam
    assert by_player["b"]["ev_loss_bb"] > 0                         # folding gives up a little
    s = aggregate_session([r])
    assert s["hands"] == 1 and s["total_ev_loss_bb"] > 0


slow = pytest.mark.skipif(not os.environ.get("FLIPUP_SLOW"), reason="needs full 6-max solves (set FLIPUP_SLOW=1)")


@slow
def test_open_limp_graded_with_custom_solve():
    rv = Reviewer()
    r = rv.review(load("limped_multiway.json"), hero="p1")
    first = r["decisions"][0]
    assert first["street"] == "preflop" and first["action"]["move"] == "call"
    assert first["method"] == "preflop_custom"
    assert first["best_action"] != "call"            # GTO doesn't open-limp 76s UTG
    assert first["ev_loss_bb"] >= 0
    later = [d for d in r["decisions"] if d["street"] != "preflop"]
    assert later and all(d["method"] == "heuristic" for d in later)  # 4-way flop


@slow
def test_single_raised_pot_full_review():
    rv = Reviewer()
    r = rv.review(load("srp_btn_vs_bb.json"))
    streets = {d["street"] for d in r["decisions"]}
    assert {"preflop", "flop", "turn", "river"} <= streets
    for d in r["decisions"]:
        assert d["grade"] in ("best", "correct", "inaccuracy", "mistake", "blunder")
        assert d["explanation"]
        if d["street"] != "preflop":
            assert d["method"] == "postflop_solver"
            assert abs(sum(a["frequency"] or 0 for a in d["gto"]) - 1) < 1e-3 or not d["in_gto_range"]

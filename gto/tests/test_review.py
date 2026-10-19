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
        "Ollie raises to 6", "Big Al folds", "Con calls 6",
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
    assert by_player["a"]["grade"] in ("best", "correct")          # K7o shoves 12bb
    assert by_player["b"]["best_action"] == "call"                 # Q8s calls the jam
    assert by_player["b"]["grade"] in ("inaccuracy", "mistake", "blunder")
    s = aggregate_session([r])
    assert s["hands"] == 1 and s["total_ev_loss_bb"] > 0

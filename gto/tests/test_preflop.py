import json
import os

import pytest

from flipup_gto import _engine
from flipup_gto.cards import parse_cards, parse_combo
from flipup_gto.preflop import CLASS_INDEX as I, PreflopSpot, tables
from flipup_gto.ranges import Range

FIXTURES = os.path.join(os.path.dirname(__file__), "fixtures")


def test_exact_preflop_equities():
    w, t, l = _engine.preflop_equity_exact(parse_combo("AhKh"), parse_combo("QsQd"))
    assert w + t / 2 == pytest.approx(0.4621, abs=0.001)
    w, t, l = _engine.equity_vs_range(parse_combo("AsAh"), Range.full().w.tolist(), [], 200000)
    assert w + t / 2 == pytest.approx(0.852, abs=0.004)


def test_class_matrix():
    eq, pairs, _ = tables(with_tensor=False)
    assert eq[I["AA"], I["KK"]] == pytest.approx(0.82, abs=0.005)
    assert eq[I["KK"], I["AA"]] == pytest.approx(1 - eq[I["AA"], I["KK"]], abs=1e-6)
    assert pairs[I["AA"]].sum() == pytest.approx(6 * 1225)


def test_postflop_range_equities_match_single_hand():
    hero, vill = Range.parse("AK").w.tolist(), Range.parse("QQ+,AK").w.tolist()
    board = parse_cards("Qh7h2c")
    eq = _engine.range_equities(hero, vill, board)
    w, t, l = _engine.equity_vs_range(parse_combo("AhKh"), vill, board)
    assert eq[parse_combo("AhKh")] == pytest.approx(w + t / 2, abs=1e-5)


@pytest.mark.parametrize("stack,shove,call", [(10, 0.58, 0.373), (20, 0.40, 0.217)])
def test_heads_up_push_fold_nash(stack, shove, call):
    """Heads-up push/fold Nash: about 58% shove / 37% call at 10bb (known result)."""
    s = PreflopSpot(num_players=2, stack=stack, open_size=[stack, stack], sb_can_limp=False, max_players_flop=2,
                    options={"max_raises": 1}, use_calibration=False)
    s.solve(1000, 0.0005, 100)
    root = s.node([])
    assert root.range_strategy()[root.labels[-1]] == pytest.approx(shove, abs=0.015)
    assert s.node(["allin"]).range_strategy()["call"] == pytest.approx(call, abs=0.015)
    assert s.engine.nash_conv()[0] < 0.001


def test_compressed_solver_matches():
    from flipup_gto.solver import BetSizing, PostflopSolver
    args = ("Ks 9d 5c 2h Qh", 10, 40, "QQ+,AK,KQ,99,55,T8s", "TT-66,AQ,KJs,QJs,JTs")
    a = PostflopSolver(*args, sizing=BetSizing.light())
    b = PostflopSolver(*args, sizing=BetSizing.light(), compress=True)
    a.solve(400, 0.05, 50)
    st = b.solve(400, 0.05, 50)
    assert st.exploitability_pct < 0.3
    assert b.engine.root_ev()[0] == pytest.approx(a.engine.root_ev()[0], abs=0.02)
    assert b.memory_mb < a.memory_mb


def test_forced_preflop_line():
    """A forced open-limp is replayed exactly; the BB then gets a strategy against the limp range."""
    limp_range = [0.0] * 169
    for cls in ("KTo", "QJo", "98s", "55", "A5o"):
        limp_range[I[cls]] = 1.0
    s = PreflopSpot(num_players=2, stack=50, max_players_flop=2, use_calibration=False,
                    options={"forced": [_engine.PreflopForced(0, 2, 1.0)],
                             "initial_range": [limp_range, [1.0] * 169]})
    s.solve(300, 0.005, 100)
    root = s.node([])
    assert root.labels == ["call"]                          # only the forced limp
    bb = s.node([0])
    assert bb.position == "BB" and "check" in bb.labels
    assert bb.range_strategy()[bb.labels[-1]] > 0.1         # BB raises its strong hands for value
    assert bb.hand("AA")["strategy"][bb.labels[-1]] > 0.9


def test_memory_budget_and_light_navigation():
    from flipup_gto.solver import BetSizing, PostflopSolver
    with pytest.raises(MemoryError):
        PostflopSolver("Ks 9d 5c", 6, 97, "22+,A2s+,K9o+", "22+,A2s+,K9o+", sizing=BetSizing.standard(),
                       max_memory_mb=10)
    s = PostflopSolver("Ks 9d 5c 2h Qh", 10, 40, "QQ+,AK,KQ,99,55,T8s", "TT-66,AQ,KJs,QJs,JTs",
                       sizing=BetSizing.light())
    s.solve(100, 0.5, 50)
    light = s.node(["check"], with_equity=False, with_ev=False)
    full = s.node(["check"])
    assert light.labels == full.labels
    assert (light.info["strategy"] == full.info["strategy"]).all()

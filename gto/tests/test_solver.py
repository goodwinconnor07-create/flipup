import pytest

from flipup_gto.solver import BetSizing, PostflopSolver, StreetSizing


def toy_sizing(bet):
    none = StreetSizing(bet="", raise_="")
    return BetSizing(oop={"river": StreetSizing(bet=bet, raise_="")}, ip={"river": none},
                     add_allin_threshold=0.0, force_allin_threshold=0.0, merge_threshold=0.0)


@pytest.mark.parametrize("bet_frac", [0.5, 1.0])
def test_clairvoyance_river_game(bet_frac):
    """Polar bettor (sets / air) vs a pure bluff catcher: closed-form solution.

    Bettor bluffs b/(1+b) x value combos, caller calls 1/(1+b) (MDF), bettor EV = V(1+b/(1+b)... ).
    """
    pot, b = 10.0, bet_frac
    s = PostflopSolver("Kh Qh 7c 4d 2s", pot, pot * b, "KK,65", "33", sizing=toy_sizing("a"), min_bet=0.01)
    s.solve(4000, 0.001, 100)
    root = s.node([])
    strat = root.class_strategy()
    value, air = 3, 16
    bluffs = value * b / (1 + b)
    assert strat["KK"]["bet all-in (%.2f)" % (pot * b)] == pytest.approx(1.0, abs=0.01)
    assert strat["65o"]["bet all-in (%.2f)" % (pot * b)] == pytest.approx(bluffs / air, abs=0.01)
    facing = s.node(["allin"]).range_strategy()
    assert facing["call"] == pytest.approx(1 / (1 + b), abs=0.02)
    # Bettor EV in chips: value hands win pot + bet x call freq, bluffs break even.
    ev = s.engine.root_ev()[0]
    expected = value * (pot + pot * b / (1 + b)) / (value + air)
    assert ev == pytest.approx(expected, rel=2e-3)


def test_navigation_and_outputs():
    s = PostflopSolver("Ks 9d 5c 2h Qh", 10, 40, "QQ+,AK,KQ,99,55,T8s", "TT-66,AQ,KJs,QJs,JTs",
                       sizing=BetSizing.light())
    st = s.solve(300, 0.2, 25)
    assert st.exploitability_pct < 0.5
    root = s.node([])
    freqs = root.range_strategy()
    assert sum(freqs.values()) == pytest.approx(1.0, abs=1e-4)
    h = root.hand("KdKh")
    assert h["strategy"] and h["p0"]["equity"] > 0.9
    # node-relative EV: folding is worth 0
    facing = s.node(["check", "bet"])
    i_fold = facing.labels.index("fold")
    assert all(abs(x) < 1e-5 for x in facing.info["action_ev"][i_fold])

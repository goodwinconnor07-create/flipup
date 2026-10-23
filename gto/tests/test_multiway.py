"""The multiway solver: with two players it must agree with the heads-up solver, and 3-way pots converge."""
import numpy as np

from flipup_gto import _engine as E


def _cards(s):
    return [E.parse_card(s[i:i + 2]) for i in range(0, len(s), 2)]


def _range(seed, keep):
    r = np.random.RandomState(seed).rand(1326).astype(np.float32)
    r[r < 1 - keep] = 0
    return list(map(float, r))


def test_two_players_match_heads_up_solver():
    board = _cards("Ks8d3c7h2s")
    r0, r1 = _range(1, 0.5), _range(2, 0.5)
    tc = E.TreeConfig()
    tc.board, tc.starting_pot, tc.effective_stack, tc.max_raises = board, 10, 50, 1
    for p in range(2):
        for s in range(3):
            ss = E.StreetSizes()
            ss.bet = [E.BetSize(0, 0.5), E.BetSize(0, 1.0)]
            ss.raise_ = [E.BetSize(0, 0.6)]
            ss.donk = ss.bet
            tc.set_sizes(p, s, ss)
    tc.set_range(0, r0)
    tc.set_range(1, r1)
    hu = E.Solver(tc)
    hu.iterate(300)
    mc = E.MWConfig()
    mc.players, mc.board, mc.pot, mc.stack, mc.range, mc.max_raises, mc.end_street = 2, board, 10, 50, [r0, r1], 1, 2
    for s in range(3):
        mc.set_sizes(s, [0.5, 1.0], [0.6])
    mw = E.MultiwaySolver(mc)
    mw.iterate(300)
    assert np.allclose(hu.root_ev(), mw.root_ev(), atol=0.01)
    qh, qm = hu.query([], with_equity=False, with_ev=True), mw.query([], True, False)
    c0 = qh["combos0"]
    assert np.abs(np.array(qh["strategy"]) - np.array(qm["strategy"])[:, c0]).max() < 0.02


def test_three_way_turn_converges():
    mc = E.MWConfig()
    mc.players, mc.board, mc.pot, mc.stack = 3, _cards("Ks8d3c7h"), 8, 97
    mc.range = [_range(i + 1, 0.2) for i in range(3)]
    mc.end_street = 2
    for s in range(3):
        mc.set_sizes(s, [0.66], [0.7])
    mw = E.MultiwaySolver(mc)
    mw.iterate(100)
    assert mw.exploitability_pct() < 0.5
    # Close to constant-sum: what the three expect adds up to about the pot.
    assert abs(sum(mw.root_ev()) - 8) < 0.3
    q = mw.query([], True, True)
    assert q["type"] == "action" and q["player"] == 0
    s = np.array(q["strategy"])
    board = set(mc.board)
    clear = np.array([not ({a, b} & board) for a, b in (E.combo_cards(c) for c in range(1326))])
    w = (np.array(mc.range[0]) > 0) & clear
    assert np.allclose(s[:, w].sum(0), 1, atol=1e-4)
    eq = q["equity"][0][w]
    assert 0.15 < float(np.mean(eq)) < 0.5

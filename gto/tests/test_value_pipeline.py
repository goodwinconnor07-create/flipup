"""Data integrity and unsafe-checkpoint regressions for expensive laptop jobs."""
import itertools
import json
from pathlib import Path
import subprocess
import sys

import numpy as np
import pytest
from flipup_gto import valuenet as vn
from flipup_gto.cards import parse_cards, parse_combo
from flipup_gto.solver import PostflopSolver
from flipup_gto.value_data import (LibrarySampler, atomic_npz, board_group, converge, digest,
                                   encode, sample_rng, split_for)


def test_suit_permutations_and_all_runouts_share_split():
    flop = parse_cards('As7h2d')
    group = board_group(flop)
    split = split_for(flop)
    for p in itertools.permutations(range(4)):
        board = [(c // 4) * 4 + p[c % 4] for c in flop]
        assert board_group(board) == group
        assert split_for(board + [c for c in range(52) if c not in board][:2]) == split


def test_worker_seeds_disjoint_and_restart_independent():
    a = sample_rng(9, 'river', 0, 70).integers(2**32, size=8)
    assert np.array_equal(a, sample_rng(9, 'river', 0, 70).integers(2**32, size=8))
    assert not np.array_equal(a, sample_rng(9, 'river', 1, 70).integers(2**32, size=8))


def tiny_leaf(output=128):
    return dict(k=64, w=[np.zeros((output, 129), dtype=np.float32)],
                b=[np.zeros(output, dtype=np.float32)], alpha=[])


def test_malformed_leaf_output_raises_in_engine_instead_of_buffer_overrun():
    with pytest.raises(ValueError, match='output must have'):
        PostflopSolver('Ks8d3c7h', 10, 5, np.ones(1326), np.ones(1326), leaf=tiny_leaf(129))


def test_leaf_rejects_rake_and_wrong_street():
    with pytest.raises(ValueError, match='rake'):
        PostflopSolver('Ks8d3c7h', 10, 5, np.ones(1326), np.ones(1326), leaf=tiny_leaf(), rake_rate=.05)
    with pytest.raises(ValueError, match='river network'):
        PostflopSolver('Ks8d3c7h', 10, 5, np.ones(1326), np.ones(1326), leaf={**tiny_leaf(), 'street': 'turn'})


def test_convergence_cap_does_not_become_success():
    class Engine:
        def iterate(self, n):
            pass
    class Solver:
        engine = Engine()
        def exploitability_pct(self):
            return 8.
    count, gap = converge(Solver(), .2, 230, batch=100)
    assert count == 230 and gap > .2


def test_encode_removes_board_blocked_mass_and_retains_exact_inputs():
    board = parse_cards('Ks8d3c7h2s')
    s = PostflopSolver(board, 10, 5, np.ones(1326), np.ones(1326))
    s.engine.iterate(10)
    arrays = encode(board, np.ones(1326), np.ones(1326), 10, 5, s.engine.query([], False, True))
    blocked = arrays['buckets'] < 0
    assert np.all(arrays['ranges'][:, blocked] == 0)
    assert np.allclose(arrays['x'][:128].reshape(2, 64).sum(1), 1)
    assert np.all(np.isnan(arrays['combo_ev'][:, blocked]))


def test_library_reconstructs_ranges_without_preflop_cache(tmp_path):
    folder = tmp_path / 'btn_bb'
    folder.mkdir()
    c0, c1 = parse_combo('AhAd'), parse_combo('QhQd')
    # Two checks close the street; the second player's first node still has their initial range.
    nodes = {'': {'player': 0, 'actions': [{'type': 'check', 'amount': 0}], 'labels': ['check'], 'pot': 5},
             '0': {'player': 1, 'actions': [{'type': 'check', 'amount': 0}], 'labels': ['check'], 'pot': 5}}
    atomic_npz(folder / 'Ks8d3c.npz', meta=np.asarray(json.dumps({'pot': 5., 'stack': 95., 'nodes': nodes})),
               combos0=np.asarray([c0]), combos1=np.asarray([c1]),
               **{'s:': np.ones((1, 1)), 's:0': np.ones((1, 1)), 'r:': np.asarray([.4]), 'r:0': np.asarray([.6]),
                  'e:': np.zeros((1, 1)), 'e:0': np.zeros((1, 1))})
    sampler = LibrarySampler(tmp_path)
    board, r0, r1, pot, stack, origin = sampler.sample(np.random.default_rng(4))
    assert len(board) == 4 and pot == 5 and stack == 95
    assert r0[c0] == pytest.approx(.4) and r1[c1] == pytest.approx(.6)
    assert 'btn_bb' in origin


def test_generator_resume_and_provenance_guard(tmp_path):
    script = Path(__file__).resolve().parents[1] / 'scripts/generate_value_data.py'
    cmd = [sys.executable, str(script), '--street', 'river', '--worker', '0', '--out', str(tmp_path),
           '--samples', '2', '--max-iterations', '100', '--max-hours', '0']
    subprocess.run(cmd, check=True, capture_output=True)
    files = list(tmp_path.glob('*.npz')) + list(tmp_path.glob('*.reject.json'))
    assert len(files) == 2
    before = {p.name: p.read_bytes() for p in files}
    subprocess.run(cmd, check=True, capture_output=True)
    assert {p.name: p.read_bytes() for p in files} == before
    bad = subprocess.run(cmd + ['--target', '.1'], capture_output=True, text=True)
    assert bad.returncode != 0 and 'configuration/source/library changed' in bad.stderr


def test_torch_export_matches_numpy_inference(tmp_path):
    torch = pytest.importorskip('torch')
    scripts = str(Path(__file__).resolve().parents[1] / 'scripts')
    sys.path.insert(0, scripts)
    from train_value_model import Net, export_model
    net = Net(64, hidden=16).eval()
    x = np.ones(129, dtype=np.float32) / 64
    meta = {'players': 2, 'rake': 0, 'street': 'river', 'features': 'strength64-v1'}
    path = tmp_path / 'model.npz'
    export_model(path, net, meta, 'river')
    with torch.no_grad():
        expected = net(torch.tensor(x[None])).numpy()[0]
    assert np.allclose(vn.predict(vn.load(path), x), expected, atol=1e-6)


def test_exact_multiway_oracle_winners_ties_and_impossible_deals():
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
    from audit_multiway_teacher import exact_checkdown
    ranges = np.zeros((3, 1326))
    for p, hand in enumerate(['AhAd', 'KhKd', 'QhQd']):
        ranges[p, parse_combo(hand)] = 1
    assert np.allclose(exact_checkdown(parse_cards('2c3d4h8s9c'), ranges, 12), [12, 0, 0])
    # Everyone plays the board's royal flush.
    assert np.allclose(exact_checkdown(parse_cards('AsKsQsJsTs'), ranges, 12), [4, 4, 4])
    ranges[1] = ranges[0]
    with pytest.raises(ValueError, match='no legal joint deals'):
        exact_checkdown(parse_cards('2c3d4h8s9c'), ranges, 12)


def test_same_final_board_different_parent_cannot_leak_across_splits():
    pytest.importorskip('torch')
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
    from train_value_model import remove_root_board_leaks
    rows = [{'root_group': [1, 2, 3, 4, 5], 'meta': {'split': 'train'}},
            {'root_group': [1, 2, 3, 4, 5], 'meta': {'split': 'test'}},
            {'root_group': [1, 2, 3, 4, 6], 'meta': {'split': 'train'}}]
    clean, overlaps = remove_root_board_leaks(rows)
    assert clean == [rows[2]] and overlaps == 1

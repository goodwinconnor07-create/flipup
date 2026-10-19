# FlipUp GTO backend

The game-theory side of FlipUp. After a session with friends, it goes through each hand and, at
every decision, shows what a game-theory-optimal (GTO) strategy does with that hand, what each
option is worth in big blinds, how much the player's choice cost, a grade, and the reasons in plain
English. The frontend is in the repo root; this directory is self-contained.

```
gto/
  engine/        C++17 core with pybind11 bindings (flipup_gto/_engine*.so)
    src/eval.cpp       7-card hand evaluator
    src/solver.cpp     heads-up postflop solver (Discounted CFR)
    src/preflop.cpp    2-9 player preflop solver
    src/equity.cpp     equity: exact enumeration, Monte Carlo, class tables
  flipup_gto/    Python package
    solver.py          postflop solver wrapper (bet-size specs, navigation by label)
    preflop.py         preflop spots and charts with EVs
    review.py          hand review engine + session ("big hand log") summary
    handhistory.py     hand history format + adapter for FlipUp's HandLog
    concepts.py        pot odds, MDF, board texture, hand classification
    api.py             HTTP API (FastAPI)
    data/              shipped tables: preflop equity matrix, glossary, EQR calibration
  scripts/       calibrate_eqr.py (fits preflop equity realization from postflop solves)
  research/      background research (algorithms, practical strategy, solver internals)
  docs/          INTEGRATION.md (API for the app)
  tests/         pytest suite; engine/tests/ has the C++ tests
```

## Build and run

```sh
pip install -r requirements.txt
cmake -S engine -B build && cmake --build build -j     # drops _engine*.so into flipup_gto/
python3 -m pytest tests                                  # Python tests
./build/test_eval_exhaustive && ./build/test_solver      # C++ tests
uvicorn flipup_gto.api:app --port 8000                   # API, see docs/INTEGRATION.md
```

The first review at a new table size / stack depth solves that preflop game (a few minutes for
6-handed) and caches it in `flipup_gto/data/cache/`.

## How it works

**Postflop solver.** Vector-form Discounted CFR (α=1.5, β=0, γ=2, Brown & Sandholm 2019) over the
public betting tree, updating one player per pass, with every hand of both ranges processed at
once. Showdowns use an O(n) sweep over hands sorted by strength with per-card corrections for card
removal; folds use inclusion-exclusion. Turn and river cards are dealt exactly (no card
abstraction), suit-isomorphic cards are solved once, rake is supported, and storage can be
compressed to half floats. Exploitability is measured exactly with a best-response pass.

**Preflop solver.** N-player (2-9) Discounted CFR over the 169 hand classes and an abstract betting
tree (opens, limps, isolation raises, 3-bets, squeezes, 4-bets, jams, cold calls). Pots that reach a
flop are valued with an equity-realization model calibrated from our own postflop solves; all-ins use
exact equity; 3-way pots use a 3-way equity tensor. Real lines GTO never takes (open limps, odd
multiway calls) are handled by re-solving with those actions forced and stated range assumptions.

**Hand review.** Preflop decisions are read from the solved preflop game. If the hand reaches a
heads-up flop, both ranges come from the preflop solution and each street is re-solved with the exact
bet sizes that were used (nested subgame re-solving), so every action in the hand is in the tree.
Decisions are graded by EV loss as a share of the pot, so any action GTO mixes at equal EV is never
called a mistake. Multiway postflop spots get a clearly labelled heuristic review.

## Validation

- Evaluator: all 133,784,560 seven-card hands match the known category counts (4,824 distinct values).
- Equity: AA vs KK 82%, AKs vs QQ 46.2%, AA vs random 85.2% (exact enumeration matches known values).
- Postflop solver vs closed-form river games: bluff frequency, calling frequency (MDF) and EV match theory.
- Postflop solver vs b-inary/postflop-solver (run locally as an independent reference, not
  included): root EVs agree within 0.01% of the pot on river, turn and flop spots.
- Preflop solver: heads-up push/fold at 10bb gives 58.2% shoves / 37.3% calls (the known Nash result).

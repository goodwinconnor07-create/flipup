# FlipUp GTO backend

The game-theory side of FlipUp: a heads-up NLHE postflop solver, ranges, and (in progress) the
hand-review engine that tells players what GTO would have done at each decision and how much EV
their choice cost.

- `engine/`: C++17 core. Hand evaluator, Discounted CFR postflop solver (card removal, suit
  isomorphism, all-in runouts, rake), best response / exploitability. Python bindings via pybind11.
- `flipup_gto/`: Python package (ranges, solver wrapper, and the review engine as it lands).
- `research/`: background research on GTO algorithms, practical strategy and solver internals.
- `tests/`: pytest suite. `engine/tests/`: C++ tests (exhaustive evaluator check, closed-form games).

## Build

```sh
pip install pybind11 numpy pytest
cmake -S engine -B build && cmake --build build -j
python3 -m pytest tests
./build/test_eval_exhaustive && ./build/test_solver
```

The build drops `_engine*.so` into `flipup_gto/`.

## Validation so far

- Evaluator: all 133,784,560 seven-card hands match the known category counts (4,824 distinct values).
- Solver vs closed-form river games (polar bettor vs bluff catcher): bluff and call frequencies and EV
  match theory.
- Solver vs b-inary/postflop-solver (run locally as an independent reference, not included here):
  root EVs agree to within 0.01% of the pot on river, turn and flop spots.

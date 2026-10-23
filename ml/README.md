# Flop action-EV experiment

Run from the repository root on `codex/gto-ev-model`. All new files and outputs are under `ml/`. The existing solver is imported read-only and built from a scratch source copy. No production service, credentials, external API, deployment or new machine is involved. Package registries and the repository's existing Git transport are used only for setup and the requested branch push.

The seven smaller uploaded ZIP parts are now available: 1,423 readable solved files, with one excluded above 0.5% exploitability. Hashes, sizes and file counts match MANIFEST.json. There are 239 boards, 234 shared across all six spots before filtering, and 19,664,924 retained hand/node rows. Stored root weights are identical for shared unblocked combos within each spot.

See [the real-data report](out/real/report.md), [metrics](out/real/metrics.json), [audit](out/real/data_audit.md), [frozen protocol](out/real/protocol.json), and [learning curve](out/real/learning_curve.csv). Root out/ convenience artifacts are refreshed after final validation. Earlier synthetic-only artifacts are preserved separately under out/fixture-history/. A supported input flag is not a claim of accurate coaching.

## Reproduce setup

Python 3.12 and a C++17 compiler with OpenMP are required. The engine build and dependencies are ignored local files, not changes under `gto/`. The CPU-only Torch build is pinned. Complete installed versions are recorded in `out/installed-packages.txt`.

```bash
python3 -m venv ml/.venv
ml/.venv/bin/pip install -r ml/requirements.txt
export PYTHONPATH=ml
export OMP_NUM_THREADS=4 OPENBLAS_NUM_THREADS=1
mkdir -p ml/.build-src/flipup_gto
cp -a gto/engine ml/.build-src/engine
ml/.venv/bin/cmake -S ml/.build-src/engine -B ml/build \
  -DPython3_EXECUTABLE="$PWD/ml/.venv/bin/python" \
  -Dpybind11_DIR="$(ml/.venv/bin/python -m pybind11 --cmakedir)"
ml/.venv/bin/cmake --build ml/build -j4
```

Use a fresh scratch copy if rebuilding: do not nest `engine/engine` by copying onto an existing engine directory. Re-running the CMake commands needs no source copy. No worktree is needed in this isolated task.

## Commands that were run

`out/commands.log` records commands and their exit statuses. `flipup_ml.commands` appends each shell command before executing it and preserves its status. Edits were made through the patch tool; their full contents are captured by the commit.

```bash
PYTHONPATH=ml ml/.venv/bin/python -m flipup_ml.commands \
  'OMP_NUM_THREADS=4 PYTHONPATH=ml ml/.venv/bin/python -m flipup_ml.fixtures --count 12'
PYTHONPATH=ml ml/.venv/bin/python -m flipup_ml.commands \
  'OMP_NUM_THREADS=4 OPENBLAS_NUM_THREADS=1 PYTHONPATH=ml ml/.venv/bin/python -m flipup_ml.run --data ml/data/fixtures --epochs 40'
PYTHONPATH=ml ml/.venv/bin/python -m flipup_ml.commands \
  'PYTHONPATH=ml OMP_NUM_THREADS=4 OPENBLAS_NUM_THREADS=1 ml/.venv/bin/python -m pytest ml/tests -q'
```

The historical fixture generator uses the handoff's exact invented OOP/IP ranges, canonicalizes the boards, and stores the production schema. It solves at most 200 iterations per board, stopping at 0.5% exploitability. Its ledger caps attempts at 20 across restarts. That stage used 12 fixture solves plus three existing river-test solves (15 total), published no accuracy claims, and produced a synthetic_fixture_only checkpoint. No new solves are run for the real experiment. The fast ml/tests use deterministic arrays and do not solve games.

## Run with the actual solved library

Provide files at `ml/data/flops/<spot>/<canonical-flop>.npz`. Multiple independently compressed ZIPs smaller than 32 MiB can be uploaded instead of the large ZIP. Once accessible locally:

```bash
PYTHONPATH=ml ml/.venv/bin/python -m flipup_ml.unpack /path/to/part1.zip /path/to/part2.zip --out ml/data/flops
PYTHONPATH=ml ml/.venv/bin/python -m flipup_ml.commands \
  'OMP_NUM_THREADS=4 OPENBLAS_NUM_THREADS=1 PYTHONPATH=ml ml/.venv/bin/python -m flipup_ml.stream_data > ml/out/real/features.log 2>&1'
PYTHONPATH=ml ml/.venv/bin/python -m flipup_ml.commands \
  'OMP_NUM_THREADS=4 OPENBLAS_NUM_THREADS=1 PYTHONPATH=ml ml/.venv/bin/python -m flipup_ml.real_run --epochs 20 --per-node 64 > ml/out/real/pipeline.log 2>&1'
```

The unpacker extracts only NPZ files under the six spot names, validates paths and refuses conflicting existing files. It never executes archive contents. Keep real runs in a separate output directory to preserve fixture provenance. Real runs train on real data only. Loading audits every file, drops exploitability above 0.5%, and refuses inconsistent root ranges, stacks or stored trees before pooling. No stored equity, EV, strategy, opponent deeper range or actor deeper range is an input. Root equity is sampled locally without solving.

Splits group all rows by board rank triple across suits, nodes and spots. Primary split is approximately 70/15/15, stratified by texture with deterministic rounding for rare strata. The five-fold CV uses development groups only; inner validation controls early stopping. Texture holdouts exclude the entire rank group if any suit cousin belongs to that family. Leave-one-spot-out is exploratory transfer across spots, with board reuse explicitly allowed; it is not an unseen-board score. There is one model configuration and no test-based tuning. At most 18 fits are needed for all six spots (5 learning-curve + 5 CV + 2 texture + 6 LOSO). Training wall time has a shared two-hour cap. Feature engineering, audit and baselines are separately reported pipeline overhead.

## Inference

```bash
PYTHONPATH=ml ml/.venv/bin/python -m flipup_ml.infer \
  --checkpoint ml/out/real/model.pt --spot btn_bb --board 'Ks7d2c' --path '[0]' --hand 'AsAh'
```

```python
from flipup_ml.infer import Predictor, UnsupportedInput
p = Predictor('ml/out/real/model.pt')
result = p.predict('btn_bb', 'Ks7d2c', [0], hand='AsAh',
                   players=2, street='flop', stack=97.5, rake=0, rake_cap=0)
```

`path` takes exact stored labels, integer action indices, or objects such as `{"type":"bet","amount":1.815}`. Amounts are total flop wagers in bb as stored by the engine. Only floating-point arithmetic tolerance of 1e-6 bb is allowed. An omitted stack means the stored **flop-start** remaining stack, not an inferred stack. For deeper paths, remaining stacks/to-call are reconstructed from exact stored wagers. Optional parameters make player count, street, flop-start stack and rake explicit. Unsupported inputs raise `UnsupportedInput`; no sizes are snapped and no solver or remote fallback exists. Unknown or untrained spots are rejected. The supported flag means the input belongs to the saved domain; evidence separately identifies synthetic checkpoints.

The checkpoint contains weights, input normalization and training-domain descriptions, not solved action targets. It is under 10 MB. Timing reports both neural batch prediction and full range inference, including deterministic sampled root-equity feature computation. CPU thread count is four; no CUDA device is used.

## Evaluation details

Metrics call the unchanged `gto/flipup_gto/review.grade`. Truth and prediction each use their own action EVs and frequencies. Only reach ≥0.01 hands contribute grade actions. EV and regret metrics include all rows. Weighted metrics multiply actor reach by exact suit-isomorphism board frequency; unweighted metrics use equal row/action weights. False-Costly is conditional on truth Good; missed-Costly is conditional on truth Costly. Zero denominators are reported as null. Strategy targets are normalized to correct float16 rounding. Centred EV offsets cancel per hand across legal actions.

`metrics.json` has reach-weighted and unweighted metrics by spot, depth, OOP/IP actor, texture and made-hand strength for real runs. `learning_curve.csv` uses nested fractions of training groups and the same test groups. Confidence intervals are descriptive Student-t intervals from five grouped CV folds; training folds overlap, so these are not independent-replicate guarantees. Network-only timings exclude feature generation; whole-interface timings include it.

Read the handoff's strong/estimate bars before drawing a conclusion. Success also needs a clear improvement over both baselines and robustness on texture holdouts. A fixture run establishes none of those properties.

## Bounded real-data fitting

The real runner processes feature files individually rather than concatenating all 19.7 million rows into memory. Cache identity includes source bytes, spot, board and feature version. It audits all files and uses one fixed width-128 MLP, with at most 20 epochs, six-epoch early stopping, AdamW 0.001 and batch size 4096. Binary features retain scale one, including unseen one-hot categories in exploratory LOSO. There is no hyperparameter search or test-based tuning.

Fitting uniformly samples at most 64 positive-reach hands per board/node. Fixed board/node seeds make learning-curve subsets nested. Multiplying fitting weights by population/sample count preserves the expected full actor-reach × canonical-board-frequency objective. Every board and positive-mass node contributes. Zero-weight rows do not affect that objective. Early stopping uses fixed validation samples; reported validation and held-out metrics use every row. B0 and B1 fit all training rows, giving them at least as much fitting information as the sampled MLP. Population and sampled row counts are recorded for each fit.

The exact engine batch equity routine replaces repeated individual-hand enumeration. Source inspection showed that the samples argument is ignored on flops: both APIs enumerate exactly, contrary to the older fixture report's Monte Carlo description. No stored deeper ranges, action EVs or strategies are features. Recorded probes compare independently computed root equity against stored float16 equity arrays.

Numba compiles the actual unchanged review.grade() function, with disk caching disabled. Random and threshold-boundary tests compare it with direct calls. Streamed aggregation matches the original metrics. The real output includes legal-action-count breakdowns, so forced one-action nodes do not conceal decision quality.

The frozen protocol and source hashes are saved before fitting. All 18 fits share a two-hour training wall cap; feature preparation, baseline fitting and evaluation overhead are reported separately. Every archive's size, SHA-256 and file count was checked against the supplied manifest before unpacking; input_manifest.json records those expected values and commands.log records the exact verification command. Raw data and feature caches are ignored by Git.

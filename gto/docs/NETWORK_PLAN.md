# Two-laptop value-network plan and Ubuntu runbook

## Goal and current status

Fast poker training/review answers for common heads-up situations, followed by three-way and then
four-way support. Preserve the existing flop library. Do not regenerate Scroll yet.

This branch is based on `claude/laptop-research`. It supplies a reproducible heads-up generation,
training, test and root-strategy benchmark pipeline. It does **not** contain production-ready weights,
a validated multiway network, or a new instant policy model. The commands below start useful data
production now; training and deployment are separate steps with acceptance criteria.

The research playbook reports 432k river examples (2% pot value error), a turn network trained on
20k random + 1,600 library examples, and major speedups. Those results are historical reports, not
newly reproduced performance guarantees. We found no committed trained checkpoints or raw shards
at the 27 branch tips examined. A clean pilot avoids depending on lost cloud-session files.

## Architecture

1. **Instant cache:** retain stored flop strategies for matching ranges/stacks/tree versions.
2. **Neural values:** river network supplies future values for a turn solve; turn network supplies
   future values for a flop solve. These models still need a current-street solve.
3. **Instant continuation answers:** build and cache the common turn/river continuations offline;
   distill policies and per-action values from validated teachers if broader immediate coverage is
   needed. A value network by itself cannot return action frequencies.
4. **Fallback:** use an exact supported solve for unfamiliar ranges, stacks, rake or bet menus;
   explicitly mark unsupported multiway positions until that teacher passes validation.

Initial supported domain: two-player postflop, equal effective stacks, no rake, rich 33/75/125% bets,
60% raises, two raises, the engine's all-in/merge rules, up to 250bb remaining per player. Training is
mostly 4–120bb pots and SPR .1–25, with stack capped at 250bb; library samples also cover their actual
pot/stack. The current features are the existing 64-bucket representation. They omit explicit blockers
and fine board detail; this is a measurable baseline, not an assumption that 64 buckets are sufficient.

## Completed engineering

- `generate_value_data.py`: deterministic worker-specific sample identities, one atomic file per
  sample, immutable job manifests, source/library hashes, process locking and safe resume.
- Teachers use the full turn+river/river tree, no neural leaves, no sampled runouts and no checkdown
  shortcut. They run in uncompressed float storage to avoid half-float convergence floors.
- Accept only samples reaching the configured exact-tree best-response gap (default .2% of pot).
  Hitting 3,000 iterations, a memory limit or nonfinite values is not success.
- Turn curriculum: 70% library-reached lines, 30% synthetic ranges. Real ranges come directly from
  the stored flop arrays, so generation does not silently re-solve preflop with different parameters.
  Flop raises are oversampled. Source file and sampled action line are recorded.
- Exact inputs, combo values, feature buckets, origin, time and convergence are saved for replay.
- Entire suit-equivalent parent flops belong to train/validation/test (80/10/10). All turn/river
  runouts of that parent remain in the same split. Separate worker seeds prevent duplicate jobs.
  If the same final board is reached through different parents in different splits, training and
  evaluation quarantine all copies of that board group to prevent leakage across those histories.
- `train_value_model.py`: weighted loss, seeded training, validation selection, atomic candidate
  checkpoints, dataset hashes and training groups. Test data does not select checkpoints.
- `evaluate_value_model.py`: separate test report, mean/p95/worst error and per-origin records.
- `benchmark_value_model.py`: reference full-tree vs neural-leaf root policies and local decision cost.
  The neural solver's internal gap is **not** called full-game exploitability.
- Engine rejects malformed layer dimensions/nonfinite weights and raked leaf solves; Python checks
  checkpoint street. This also prevents an invalid final layer writing past the output buffer.
- `network_laptop.sh`: separate environment/build directory, bounded tmux jobs, log/status/stop.
  Does not touch the coach, existing flop files or existing flop services.

## Phase 1: first eight-hour pilot (ready to run)

Use Ubuntu 22.04/24.04 x86-64, at least 8GB RAM and preferably 20GB free space. No GPU required.
Plug both laptops in and keep them awake with lids open. Terminal closure is fine; sleep/reboot
stops computation. Stop your old heavy flop-solving services while these jobs run; preserve the
files. If installed by the previous laptop setup:

```bash
sudo systemctl stop flipup-solve flipup-upload
```

Do not run that on a machine where you want those jobs to continue. These training jobs do not
need the upload service. Use a **separate checkout** so your old flop checkout remains intact.

### Both laptops: install

```bash
sudo apt-get update
sudo apt-get install -y git

git clone --branch codex/value-network-pipeline --single-branch \
  https://github.com/goodwinconnor07-create/flipup.git "$HOME/flipup-networks"
cd "$HOME/flipup-networks"
bash gto/scripts/network_laptop.sh setup
```

Setup installs compiler tools, tmux and rsync, creates `~/flipup-net-env`, and builds the local C++
engine. It does not install PyTorch yet: generation does not need it. Do not pull code, rebuild or
change the flop files while a job runs. Updating the source or library requires a new data folder.

### Laptop A: river baseline

```bash
cd "$HOME/flipup-networks"
bash gto/scripts/network_laptop.sh start river
bash gto/scripts/network_laptop.sh status
```

Worker 0 attempts up to 10,000 river spots, with an eight-hour wall budget checked **between**
samples. Data: `~/flipup-network-data/river-worker0`; log: `~/flipup-network-data/river.log`.
A single solve can exceed the wall budget; it is not killed mid-write.

### Laptop B: turn with your existing flop library

If the flops are already under `~/flops/<matchup>/*.npz`:

```bash
cd "$HOME/flipup-networks"
bash gto/scripts/network_laptop.sh start turn
bash gto/scripts/network_laptop.sh status
```

If they are elsewhere, provide the **root** containing matchup folders:

```bash
FLOPS_DIR="/path/to/flops" bash gto/scripts/network_laptop.sh start turn
```

Worker 1 attempts up to 10,000 full turn+river solves, using the stored flop ranges. Data:
`~/flipup-network-data/turn-worker1`; log: `~/flipup-network-data/turn.log`.
Missing, corrupt or unusable library files stop generation; it never silently substitutes synthetic
ranges for a requested library sample. A lack of deep stored action nodes can limit raise coverage.

If the flops live only on laptop A, copy them to B first (replace the login/address):

```bash
rsync -a --info=progress2 YOUR_USER@LAPTOP_A_IP:flops/ "$HOME/flops/"
```

If they live only on the coach, the optional downloader uses the existing upload token, reads only,
and skips local files. It may wake the coach and incur its normal hosting cost:

```bash
cd "$HOME/flipup-networks"
read -rsp 'Existing coach upload token: ' FLIPUP_UPLOAD_TOKEN; echo
export FLIPUP_UPLOAD_TOKEN
"$HOME/flipup-net-env/bin/python" gto/scripts/download_value_library.py --out "$HOME/flops"
unset FLIPUP_UPLOAD_TOKEN
```

Never paste that token into GitHub, logs or this document.

### Stop, resume and hardware settings

```bash
cd "$HOME/flipup-networks"
bash gto/scripts/network_laptop.sh stop river   # A; use stop turn on B
bash gto/scripts/network_laptop.sh status
```

An interrupt may wait for a C++ iteration batch. All finished files survive. Repeat the original
`start` command after it exits or after a reboot; finished ids are skipped. The job lock prevents
running two processes into one output directory.

To allow more time/attempts, without changing the teacher configuration:

```bash
FU_NET_HOURS=24 FU_NET_SAMPLES=100000 bash gto/scripts/network_laptop.sh start river
```

On B replace `river` with `turn`. Two threads and 2048MB are deliberately modest. The memory cap
covers engine regret/strategy arrays, not all process RAM; large trees may use more. Do not assume
that setting the cap to installed RAM is safe. For an 8GB laptop keep the default; pilot first on
larger machines. Changing the memory cap creates a different immutable job configuration and
requires a new `FU_NET_DATA` root. `FU_NET_THREADS` controls solver/build threads.

No automatic reboot startup is installed. This avoids unbounded generation when a laptop is next
used. Repeating start is the explicit resume step.

## Phase 2: inspect the pilot before scaling

Keep both manifests and logs. Inspect accepted/rejected ratios, gap distribution, memory failures,
seconds per accepted sample, origin distribution, flop textures, SPR and raise-line coverage.

For a measured pilot summary (A shown; use `turn-worker1` on B):

```bash
cd "$HOME/flipup-networks"
"$HOME/flipup-net-env/bin/python" gto/scripts/inspect_value_data.py \
  "$HOME/flipup-network-data/river-worker0"
```

This prints rejection reasons, convergence/timing quantiles, matchup counts, held-out split counts
and estimated hours per 1,000 accepted samples including rejected solve time.

- Rejected samples end in `.reject.json`; accepted samples end in `.npz`.
- `status.json` records the latest normal solve. Logs also show fatal errors.
- A gap target is only for the exact abstract betting tree, not all continuous poker actions.
- Broad ranges on high-SPR turns are expensive. Do not lower quality gates to hit a sample count.
- Stop if most samples reject. Investigate tree/memory/convergence rather than training only on the
  easy remainder. Acceptance filtering itself can bias the dataset.

Targets after measuring the pilot: river 50k, then 200k+; turn 5k, then 20–50k accepted examples.
Those are staged budgets, not accuracy guarantees. Use actual throughput to estimate runtime.
The river can finish early; laptop A can then generate additional turn samples using worker 0,
its own `--out`, and the same frozen library snapshot/teacher source. For example:

```bash
cd "$HOME/flipup-networks"
OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=1 "$HOME/flipup-net-env/bin/python" \
  gto/scripts/generate_value_data.py --street turn --worker 0 \
  --library "$HOME/flops" --out "$HOME/flipup-network-data/turn-worker0" \
  --samples 10000 --max-hours 8
```

## Phase 3: train, evaluate, benchmark (tools ready)

Train on A after generation pauses. Transfer B's dataset into a separate folder, preserving its
manifest. No data uploads to Fly are required:

```bash
rsync -a --info=progress2 YOUR_USER@LAPTOP_B_IP:flipup-network-data/turn-worker1/ \
  "$HOME/flipup-network-data/turn-worker1/"
cd "$HOME/flipup-networks"
"$HOME/flipup-net-env/bin/python" -m pip install torch --index-url https://download.pytorch.org/whl/cpu
mkdir -p "$HOME/flipup-network-models"

"$HOME/flipup-net-env/bin/python" gto/scripts/train_value_model.py \
  "$HOME/flipup-network-data/river-worker0" --street river \
  --out "$HOME/flipup-network-models/river-v1.npz"
"$HOME/flipup-net-env/bin/python" gto/scripts/train_value_model.py \
  "$HOME/flipup-network-data/turn-worker1" --street turn \
  --out "$HOME/flipup-network-models/turn-v1.npz"

"$HOME/flipup-net-env/bin/python" gto/scripts/evaluate_value_model.py \
  "$HOME/flipup-network-data/river-worker0" \
  --model "$HOME/flipup-network-models/river-v1.npz" --out "$HOME/flipup-network-models/river-test.json"
"$HOME/flipup-net-env/bin/python" gto/scripts/evaluate_value_model.py \
  "$HOME/flipup-network-data/turn-worker1" \
  --model "$HOME/flipup-network-models/turn-v1.npz" --out "$HOME/flipup-network-models/turn-test.json"
```

Use new checkpoint names for each training run. If A also generated turn data, pass both turn job
directories to the trainer/evaluator. Source/tree versions must match. The trainer never selects a
model using test metrics. Do not repeatedly tune against the test set: freeze a new final audit set
for later model families.

Full-tree comparison commands (replace sample/flop paths with **test-split** files):

```bash
OMP_NUM_THREADS=2 "$HOME/flipup-net-env/bin/python" gto/scripts/benchmark_value_model.py \
  --model "$HOME/flipup-network-models/river-v1.npz" \
  --case "$HOME/flipup-network-data/turn-worker1/00000000.npz" \
  --out "$HOME/flipup-network-models/river-root-benchmark.json"

OMP_NUM_THREADS=2 "$HOME/flipup-net-env/bin/python" gto/scripts/benchmark_value_model.py \
  --model "$HOME/flipup-network-models/turn-v1.npz" \
  --flop-file "$HOME/flops/btn_bb/As7h2d.npz" \
  --out "$HOME/flipup-network-models/turn-root-benchmark.json"
```

These are templates: the script rejects non-test groups. Full flop references can exceed laptop
memory and need a larger machine or an independent trusted solver; they are not replaced with the
old simplified flop tree. No passing benchmark means no production promotion.

Initial engineering acceptance targets, to be confirmed against a broad reference suite:

- held-out weighted value MAE <=1% pot, sample p95 <=3%; report worst cases and subgroup results;
- local root decision loss <=.5% pot average, <=2% p95 on matched-tree exact reference cases;
- separately test polarized/narrow ranges, raises, paired/monotone/connected boards, high SPR,
  all-ins, blocker-sensitive hands, suit relabelling and off-grid bet sizes;
- compare bet menus and strategy mixes, but do not fail a model solely because equivalent-EV mixed
  actions differ in frequency; do not promise exact GTO percentages from approximate networks;
- benchmark latency on the laptops and hosting hardware; log fallbacks/unsupported inputs;
- an independent solver check on a representative subset guards against a shared teacher bug.

The current benchmark compares only the root, with reference continuations held fixed. Add sampled
internal decision comparisons and full-policy best-response evaluation before claiming an
exploitability bound. A depth-limited model-dependent internal gap is not such a bound.

If errors plateau, change representation before purchasing/generating millions more labels: encode
board rank/suit texture, explicit combo/card removal, actor and position, pot/stack, allowed actions
and rake configuration. Keep separate model/schema versions and matched C++/Python feature tests.
Retain the existing 64-bucket model as the regression baseline.

## Phase 4: replace common live solves with instant answers (future implementation)

1. From the frozen flop library, enumerate frequent flop lines and weighted turn runouts.
2. Solve those offline with a validated river model; audit a stratified subset with full references.
3. Store node actions, combo policy, per-action values, reach, support metadata and source versions.
4. Enumerate common river continuations in the same way; prioritize actual usage rather than every
   possible range/board/bet sequence.
5. Benchmark disk size/cache hit rate. If coverage is insufficient, distill action probabilities and
   action values conditioned on the public state and ranges; value targets alone are insufficient.
6. Route cache -> approved policy -> neural short solve -> full solve for unsupported positions.
   Establish support from measured validation coverage and ensemble/disagreement checks; a single
   network confidence number is not proof of accuracy.
7. Integrate the route in the coach behind a feature flag, version caches, expose approximation
   status, test offline Scroll exports, then canary before any production replacement.

## Phase 5: multiway (gated; do not train labels from the old teacher yet)

`engine/src/multiway.cpp` exists on this branch. Its header explicitly says two opponents may hold
the same card at showdown. Equal stacks only; no side pots. More CFR passes cannot remove that
model error, and ordinary multi-player CFR has no general two-player zero-sum convergence guarantee.

Required work, in order:

The initial exact checkdown oracle is supplied as `scripts/audit_multiway_teacher.py`:

```bash
cd "$HOME/flipup-networks"
OMP_NUM_THREADS=2 "$HOME/flipup-net-env/bin/python" gto/scripts/audit_multiway_teacher.py \
  --out "$HOME/flipup-network-data/multiway-teacher-audit.json"
```

Exit code 2 means the current teacher failed the configured accuracy tolerance; retain the JSON.
This script does not generate training labels. It enumerates legal joint deals on small ranges
and tests checkdown values; passing it would still leave all the betting/side-pot audits below.

1. Build an exact small-range river oracle that enumerates legal disjoint hole-card assignments,
   including ties and folded-player card removal. Compare payoffs, normalization and best responses
   against the current teacher. Quantify where its independence approximation fails.
2. Correct joint card-removal payoffs or introduce a validated sampling scheme over **legal joint
   deals**, with uncertainty estimates. Audit betting/all-in logic and side-pot handling before
   supporting unequal stacks. Use independent reference spots.
3. Train **three-player river** first. Inputs must include every player's range, actor/order, active
   mask, pot/contributions, stacks and tree. Outputs are values per player/hand; the existing
   two-player correction cannot simply be copied using marginal range masses. Test expected payoff
   conservation under the legal joint distribution.
4. Use measured unilateral deviation gains and stability across seeds/iterations (plus independent
   references), not a claim that low HU-style exploitability establishes a multiway Nash solution.
5. Validate three-player turn, then flop; add four-player only after three-player is reliable.
6. Distill/cache policies for instant answers using the same gating as heads-up.

Do not spend either laptop on large multiway training until that oracle/teacher gate passes. Keep
multiway fallback explicitly approximate or unavailable in the meantime. This phase is planned work,
not delivered or silently enabled by these commands.

## Backups and recovery

Back up `~/flipup-network-data`, `~/flipup-network-models` and `~/flops` to another disk or the other
laptop periodically. Keep workers in separate directories; never flatten files from different jobs
into one folder. A manifest mismatch fails closed and leaves existing data untouched. To change
config/code/library, use `FU_NET_DATA="$HOME/flipup-network-data-v2"` and a new checkpoint name.

No weights are deployed by this branch and no existing Scroll data is replaced. Preserve test
reports and source commit alongside every future deployment.

## Verification performed for this change

- C++ engine built and its solver regression executable passed.
- 11 new pipeline regressions passed, plus the 5 existing Python heads-up/multiway solver tests.
- `npm run check` passed (typecheck, 102 app tests, production build).
- 70 synthetic river samples exercised generation, training, export and held-out evaluation. A
  shallow turn case exercised full-reference versus neural-leaf root benchmarking. These small
  smoke runs establish executable plumbing, not model quality or production performance.
- A narrow library fixture exercised range reconstruction and correctly rejected unconverged
  turn labels. This reinforces the need to inspect rejection patterns before scaling.
- The exact 10-case multiway checkdown diagnostic **failed**: worst per-player error 25.138% of the
  pot in deliberately narrow overlapping ranges. Reproducible inputs and teacher source hash are
  in `research/results/multiway_checkdown_audit.json`. This is a model-accuracy failure, even though
  the existing multiway regression tests pass.
- Ubuntu shell syntax was checked; dependency/build commands were exercised in the cloud Linux
  environment. Physical laptop throughput, thermals, power settings and existing data remain to
  be measured by the pilot.

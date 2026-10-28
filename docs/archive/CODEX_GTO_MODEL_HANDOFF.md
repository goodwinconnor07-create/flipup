# Codex handoff: can a small model learn FlipUp's GTO solver outputs?

Written 2026-10-22 from a read of the repository and a few small checks run in a scratch copy (noted below).
Everything under "Verified" was read in code or run. Everything under "Assumptions" or "Unresolved" was not.
Read this whole file before writing code.

## 0. The question this experiment must answer

> Can we train an inexpensive model on our existing GTO solver outputs that predicts action values accurately
> enough on **unseen poker situations** to give useful post-hand coaching in FlipUp (Good / Close call / Costly)?

"No, the data or approach isn't sufficient yet" is an acceptable and useful answer. Do not tune until it says yes.
Do not call the model reliable, accurate or GTO-accurate in any output unless the evaluation in section 7 supports it.

## 1. Project in one paragraph

FlipUp is a phone app for no-limit Hold'em with friends and bots, with post-hand coaching. The app is TypeScript
(`src/`, Cloudflare Worker in `worker/`). The GTO coach is a separate Python + C++ service in `gto/` hosted on Fly.io
(`https://flipup-gto.fly.dev`). The app calls it through the Worker's `/api/gto/*` proxy. The coach re-solves hands
live, which is slow and costs money. This experiment asks whether a small neural network, trained on solver output we
already have, can replace some of those solves.

## 2. Verified facts about the solver

### 2.1 Architecture (read in code)
- **Postflop solver**: C++17 in `gto/engine/src/solver.cpp`, vector-form Discounted CFR over a public betting tree,
  heads-up only. Exposed to Python through pybind11 (`gto/engine/src/bindings.cpp`) as `flipup_gto/_engine*.so`.
- **Preflop solver**: `gto/engine/src/preflop.cpp`, N-player (2 to 9) CFR over 169 hand classes.
- **Python wrapper**: `gto/flipup_gto/solver.py`.
  - `PostflopSolver(board, pot, stack, oop_range, ip_range, sizing=BetSizing, rake_rate=0.0, rake_cap=0.0, min_bet=1.0, threads=None, compress=False, max_memory_mb=0.0)`
  - `.solve(max_iterations, target_pct, check_every, callback)` returns a status with `.iteration`, `.exploitability_pct`, `.seconds`.
  - `.node(path, with_equity=True, with_ev=True)` returns a `NodeView`. `path` is a list of labels or indices from the root.
  - `NodeView.info` is a dict (see 2.3). `NodeView.labels`, `.player`, `.pot`, `.actions`.
  - `BetSizing` / `StreetSizing` define the bet-size abstraction per player and street.
- **Entry points**: `gto/flipup_gto/api.py` (FastAPI), `gto/flipup_gto/review.py` (`Reviewer.review(HandHistory, hero)`),
  `gto/flipup_gto/custom.py` (`Explorer.spot(...)`, the Custom hand screen), `gto/scripts/flop_library.py` (batch solving).
- **Dependencies** (`gto/requirements.txt`): numpy>=1.26, pybind11>=2.12, fastapi, uvicorn, pydantic, pytest, httpx.
  **No torch or any ML library is installed or listed.** Dockerfile base image is `python:3.12-slim`.

### 2.2 Build and test (run in a scratch copy, not in the repo)
```sh
cd gto
python3 -m venv .venv && . .venv/bin/activate
pip install pybind11 numpy pytest fastapi uvicorn pydantic httpx
cmake -S engine -B build -Dpybind11_DIR=$(python -m pybind11 --cmakedir)   # pybind11 must be installed BEFORE configuring
cmake --build build -j4                                                    # writes flipup_gto/_engine*.so (gitignored)
python -m pytest tests -q                                                  # VERIFIED: 46 passed, 2 skipped, 10m46s on 4 cores
```
Most of that 10m46s is preflop solving. For quick checks run only `tests/test_ranges.py tests/test_concepts.py tests/test_solver.py`.

### 2.3 What one solved node exposes (verified by running a solve)
`PostflopSolver.node([...], with_equity=False, with_ev=True).info` has these keys (shapes from a real run, 298 OOP and 502 IP combos):
```
type 'action'|'chance'|'terminal', player (0=OOP, 1=IP), street, pot (bb), contrib (2,), stack (2,), board [cards],
actions [{type, amount, added, all_in, ...}], deal_cards,
combos0 / combos1   list[int]   combo index 0..1325 of each hand in that player's starting range
reach0 / reach1     float32[n]  range weight reaching this node
weight0 / weight1   float32[n]  reach x compatible-opponent mass (used for averaging)
ev0 / ev1           float32[n]  node-relative EV per hand (bb)
equity0 / equity1   float32[n]  showdown equity vs opponent range (empty array unless with_equity=True)
strategy            float32[n_actions, n_actor_hands]   average strategy, rows sum to 1 per hand
action_ev           float32[n_actions, n_actor_hands]   EV (bb) of each action per hand, for the actor
```
- **EV units**: chips = big blinds. At the root the two players' range EVs sum to the starting pot (verified: 3.0186 + 2.4814 = 5.5).
  EVs are normalised per hand by compatible opponent mass (`normalize_ev` in `solver.cpp`), so they are comparable across hands and actions.
  `docs/INTEGRATION.md` says postflop EV is "bb won from here on" and that only differences between options matter.
  The code also adds `contrib[p]` inside `normalize_ev`; treat the absolute offset as **unverified** and rely on within-node differences.
- **Card encoding** (`gto/flipup_gto/cards.py`): card = rank*4 + suit, ranks `23456789TJQKA`, suits `cdhs`. Combo index for cards a > b is `a*(a-1)//2 + b`, range 0..1325.
  169 hand classes via `hand_class(combo)`. `NUM_COMBOS = 1326`. Helpers: `parse_cards`, `card_str`, `combo_cards`, `combo_index`, `hand_class`.
- **Evaluator / equity**: `_engine.evaluate(cards)` for 5 to 7 cards. Equity routines in `gto/engine/src/equity.cpp`; preflop equity matrix shipped in `gto/flipup_gto/data/preflop_matrix.npz`.
- **Probe timing** (my own rough ranges, not the real spot ranges, 4 cores shared with a running test suite): one flop solve, `explorer_sizing("flop")`, 50 iterations, 0.398% exploitability, 51 s, 420 MB.

### 2.4 The solved data (the flop library)
- **Writer**: `gto/scripts/flop_library.py` (`solve_flop`, `canonical_flops`, `node_record`). **Reader**: `gto/flipup_gto/flop_library.py` (`FlopLibrary`, `Entry`, `canonical`, `SPOTS`).
- **Location**: only on the Fly coach machine's volume: `/app/flipup_gto/data/cache/flops/<spot>/<flop>.npz`. **Not in git.** App `flipup-gto`, volume `gto_cache`, 3 GB, 263 MB used in total (all cache, including preflop solutions).
- **Quantity**: counted on 2026-10-22 by listing the volume: `bb_btn_3bet 238, btn_bb 239, co_bb 239, sb_bb 238, sb_limp 235, utg_bb 234` = **1,423 files, about 13.5% of the 6 x 1,755 = 10,530 possible**. `<flop>` is a canonical suit-isomorphic flop name such as `Ks7d2c`.
- **The six spots** (`SPOTS` in `flop_library.py`; heads-up, 6-max, 100bb effective, no rake, ranges from the app's cached preflop solution):

| spot | preflop line (UTG..BB) | IP seat | OOP seat | aggressor | who may lead on the flop |
| --- | --- | --- | --- | --- | --- |
| btn_bb | F F F raise F call | BTN | BB | BTN (IP) | OOP may not (root has Check only) |
| co_bb | F F raise F F call | CO | BB | CO (IP) | OOP may not |
| utg_bb | raise F F F F call | UTG | BB | UTG (IP) | OOP may not |
| sb_bb | F F F F raise call | BB | SB | SB (OOP) | OOP leads |
| sb_limp | F F F F call check | BB | SB | none | OOP leads |
| bb_btn_3bet | F F F raise F raise call | BTN | BB | BB (OOP) | OOP leads |

- **Solve settings** (`ITERATIONS, TARGET = 200, 0.5`, `DEPTH = 3`): up to 200 iterations or 0.5% of pot exploitability. Tree = `explorer_sizing("flop", oop_leads=...)` in `custom.py`: flop bets 33%/75%/125% pot, raise 60%, `max_raises=2`; **turn: one 75% bet size; river: checked down**. So the EVs describe this *simplified* game, not the full game. No rake (`rake_rate` default 0).
- **File schema** (`np.savez_compressed`, written by `solve_flop`; I reproduced it on a probe solve, 38 KB, 8 nodes):
```
combos0, combos1   int16[n0], int16[n1]      combo index of each hand in the OOP / IP starting range
equity0, equity1   float16[n]                root equity per hand
realization        float32[2,3,169]          per hand class: EV share, equity, weight at the root
meta               json string: {pot, stack, nodes:{key:{player, labels, actions:[{type,amount,all_in}], pot}}, iterations, exploitability_pct}
For each decision node key ("" = root, "0" = after action 0, "1.2" = after action 1 then 2; up to DEPTH=3 actions deep, flop street only):
  s:<key>  float16[n_actions, n_actor_hands]   strategy
  e:<key>  float16[n_actions, n_actor_hands]   action EV (bb)
  r:<key>  float16[n_actor_hands]              the ACTOR's range weight at this node only
```
- **Reading**: `np.load(path)`, `json.loads(str(d["meta"]))`. Hands at node `key` are `combos{meta.nodes[key].player}`. The reader class `Entry.node(tokens)` returns strategy, ev and reach for a path.
- **Precision**: everything is float16, so EV resolution is about 0.004 bb near 5 bb and about 0.03 bb near 50 bb. Treat sub-0.01 bb differences as noise.
- **Not stored**: turn and river nodes, the opponent's reach at a node, per-hand equity after the root, EVs at terminal nodes.

### 2.5 Existing evaluation and coaching code
- `gto/scripts/gw_bench.py` (preflop vs GTO Wizard published numbers), `postflop_bench.py` (c-bet and defence frequencies by flop and tree), `flop_study.py`, `river_study.py`, `tree_bias.py`, `realization_check.py`. Reference numbers in `gto/docs/GTO_PLAYBOOK.md` section 11.
- **Grading** (`gto/flipup_gto/review.py:55`, `grade(ev_loss, pot, freq, is_top_freq)`): `pct = 100*ev_loss/pot`; `tol = max(0.5, 3/pot)`; best if `pct <= tol` and (top frequency or `pct <= tol/2`); correct if `pct <= tol` or (`freq >= 0.035` and `pct <= 1.0`); inaccuracy `<= 2.5`; mistake `<= 8.0`; else blunder.
  The app shows best/correct as Good, inaccuracy as Close call, mistake/blunder as Costly (`GRADES` in `review.py`; wording in `src/train/coach.ts`; colours at `review.py:1135`).
- **Phone-side estimate** (TypeScript, not Python): `src/game/judge.ts` (`judgeMove()`), `botPlay.ts`, `botRange.ts` use charts plus equity against an imagined range. Not part of this task; mentioned so you know a cheap baseline exists in production.
- **Tests that must keep passing**: `gto/tests/*` (46 passed, 2 skipped) and, for the app, `npm run check` at the repo root.

### 2.6 Compute environment
- **Fly**: `flipup-gto` runs on one `performance-4x` machine (4 dedicated CPUs, 8 GB) that stops when idle. A second app `flipup-gto-batch` has four stopped `performance-16x` (32 GB) machines used for the batch solve (last used about 05:50 UTC 2026-10-22). About $17 of Fly spend so far. **You do not have Fly access. Do not start any machines.**
- **Where I ran things**: Linux, 4 cores, 15 GB RAM, no GPU, Python 3.13, numpy 2.5; **torch not installed**. Your environment is unknown.

## 3. Getting the data to you (the user must do this; Codex cannot reach Fly)

Place the files at `ml/data/flops/<spot>/<flop>.npz` (so the same relative layout as on Fly). Suggested commands for the user (flyctl is installed and logged in; **the sftp form is unverified**):
```sh
fly machine start <machine-id> -a flipup-gto          # the machine sleeps when idle
fly ssh sftp get -r /app/flipup_gto/data/cache/flops ./ml/data/flops -a flipup-gto
```
If the files are not present when you start: build everything against synthetic fixtures (appendix B), say so in the report, and do not publish accuracy numbers from fixtures.

## 4. Unresolved questions: check these first and record the answers

1. **How many distinct boards exist?** `canonical_flops()` uses one fixed shuffled order for every spot, so the six spots probably share the same ~240 boards. If so the independent sample is about 240 boards, not 1,423. Verify by intersecting flop names across spots.
2. **Are the starting ranges the same across files of one spot?** The preflop cache on the volume holds three `preflop_6p_100bb_*.npz` files (different model versions), so the library could mix ranges. Compare `combos0/combos1` and the root `r:` vector across files per spot.
3. **EV offset**: does `e:` include chips already invested, or only "from here on"? Within-node differences are safe either way, but confirm using a fold node and by checking that the two players' weighted EVs sum to about the pot.
4. **Maximum action count** per node and the distribution of node counts per file.
5. **Failed or partial files**: `flop_library.py` logs and skips failures. Check for unreadable files and for `exploitability_pct` above 0.5.
6. **Do the spots share starting pot and stack?** Read `meta.pot` and `meta.stack` per spot.

## 5. Experimental design and the reasoning behind it

**Is the data enough?** There are millions of (hand, node) rows, but they come from only ~240 boards, so the effective sample for learning "board to strategy" is small. Expect weak generalisation to new boards. The experiment must show a **learning curve** (error against number of training boards) so we can say whether finishing the library (about 9,100 more flops, roughly $100 by my estimate) is worth it.

**First target: per-hand action EV (`e:` arrays), with the strategy (`s:`) as a second head.** Reasons: regret = best EV minus chosen EV is exactly what coaching needs; the stored `action_ev` is already a per-hand normalised counterfactual-style value, so no extra conversion is needed; frequencies alone can't say how much a mistake cost. Predicting the strategy too lets us reuse `review.grade()`, which takes a frequency. Train on EV centred per hand (subtract that hand's mean across legal actions) as well as raw EV; evaluate on centred values because offsets cancel in regret.

**Architecture: start with a plain MLP**, hand-by-hand, conditioned on node and board context. Only try a second architecture if the MLP's learning curve clearly shows capacity is the limit. Keep it CPU-trainable and under 10 MB.

**Inputs (all must be available at inference without solving):**
- spot id (6 values), player to act (OOP/IP), depth (0 to 3), pot and remaining stack at the node, to-call over pot
- the betting path as up to 3 tokens: action type plus size as a fraction of pot
- legal-action mask over fixed slots: fold, check, call, bet 33%, bet 75%, bet 125%, raise, all-in
- board: canonical ranks, suit pattern, pairedness, connectedness, high card (`concepts.board_texture`)
- hand: ranks, suited, pair, gap, relation of the hole-card suits to the board suits, made-hand category from `_engine.evaluate`, and equity against the opponent's fixed root range
- the hand's **root** range weight (a function of the spot). **Do not use deeper `r:` values as inputs** (they come from solved strategies and would leak the answer); use them only to weight the loss and the metrics.

**Action space and sizes**: the stored trees use fixed sizes, so use fixed slots. Do not silently snap other sizes. Inference must reject them (section 6, item 6).

**Splits**: group by **board rank triple** (e.g. all `K72` boards regardless of suits) **across all six spots and all nodes**. That prevents leakage from suit-isomorphic cousins, from the same flop in different spots, and from sibling nodes. Use 70/15/15 by group, stratified by texture, plus **5-fold grouped cross-validation** for error bars (the test set is only ~35 to 50 boards). Extra generalisation tests: (a) hold out a whole texture family (all paired boards, then all monotone boards); (b) leave one spot out. Report (b) as an exploratory result.

**Weighting**: weight rows by the actor's `r:` weight (a hand the range barely holds matters little). Weight boards by `canonical_flops()` frequency weight so results reflect real flop frequencies. Report both weighted and unweighted.

**What counts as "meaningful" accuracy**: the product question is regret, not EV error. Bucket with the existing grade function and compare predicted to true buckets.

**Baselines (all required)**
- **B0, chart baseline**: per (spot, node, hand class) mean EV and frequency over the training boards. This is what a board-agnostic chart would say.
- **B1, equity baseline**: per (spot, node, action) regression of EV on equity-vs-root-range plus simple hand features (linear and a small gradient-boosted model if available).
- **B2 (optional)**: nearest training board by texture features, same hand classes.
The network must beat B0 and B1 on held-out boards by a clear margin, otherwise it is not worth its complexity.

**Cost rules**: reuse existing files; no new solves except at most 20 for sanity checks, run locally; CPU only; cap total training at about 2 hours of wall time; no Fly machines; no GPU rental; no calls to external APIs.

## 6. The Codex implementation prompt

> Copy everything in this section into Codex.

```
You are implementing and running a small experiment in the FlipUp repository. Read CODEX_GTO_MODEL_HANDOFF.md in the repo root first: it holds verified facts about the solver, the data and its schema, and the reasoning for the design. This prompt tells you what to do.

GOAL
Answer one question with measurements: can a small model trained on our existing solved flop data predict per-hand action EVs on UNSEEN boards accurately enough to grade decisions as Good / Close call / Costly? "No" is an acceptable answer. Do not claim the model is reliable or GTO-accurate unless the results meet the criteria below.

HARD RULES
- Work on a new branch `codex/gto-ev-model`. Do not push to or merge into the default branch. Do not open a pull request.
- Put all new code in a NEW top-level folder `ml/`. Do NOT add files under `gto/`: a change under `gto/**` on the default branch triggers an automatic deploy of the live coach server.
- Do not modify anything existing: `src/`, `worker/`, `public/`, `docs/`, `wrangler.jsonc`, `.github/`, `gto/flipup_gto/`, `gto/engine/`, `gto/scripts/`, `gto/tests/`, or the root `.gitignore` (use `ml/.gitignore` for data and output folders). Import from `gto/` read-only (add `gto/` to `sys.path`).
- Never touch production gameplay or the live solver. Do not use any credentials. Do not call Fly or any external API. Do not start machines.
- Use the existing solved files first. No new solves except at most 20 small local ones for sanity checks. CPU only; cap total training wall time at about 2 hours; keep hyperparameter searches to about 20 configurations.
- Make reasonable engineering decisions yourself and note them in the report. Only stop to ask if the data is missing entirely.
- Never tune on the test split. Fix random seeds. Record every command you run.

SETUP
1. Python venv inside `ml/`. Build the engine in a scratch copy or in place (the .so is gitignored): `pip install pybind11 numpy`, then `cmake -S gto/engine -B gto/build -Dpybind11_DIR=$(python -m pybind11 --cmakedir) && cmake --build gto/build -j4`.
2. Install a CPU PyTorch (and optionally scikit-learn or lightgbm for baseline B1). Put these in `ml/requirements.txt`, NOT in `gto/requirements.txt`.
3. Data should be at `ml/data/flops/<spot>/<flop>.npz`. If it is missing, build and test the pipeline on synthetic fixtures made with the generator in appendix B of the handoff, state clearly in the report that no real data was available, and do not report accuracy.

STEP 1: DATA AUDIT (write `ml/out/data_audit.md`)
Load every file. Report: files per spot; unreadable files; distribution of `meta.exploitability_pct` and iterations; distinct boards overall and the intersection of boards across spots; per-spot consistency of `combos0/combos1` and the root `r:` vector across files (mixed preflop ranges would invalidate pooling); `meta.pot` and `meta.stack` per spot; node counts per file; maximum action count; EV sanity (range EVs of the two players sum to about the pot at the root; within a node the strategy rows sum to 1). Resolve the six unresolved questions in section 4 of the handoff. Drop files with exploitability above 0.5% of pot and list them.

STEP 2: DATASET (`ml/flipup_ml/data.py`, `features.py`, `splits.py`)
One row = (spot, board, node, actor hand) with targets: action EVs (bb) and the strategy over the node's legal actions, padded to fixed action slots with a mask. Inputs as listed in section 5 (do not use deeper `r:` values as inputs; use them for weights only). Split by board rank triple across all spots and nodes: 70/15/15 stratified by texture, plus 5-fold grouped CV, plus a paired-board holdout, a monotone-board holdout, and a leave-one-spot-out exploratory split. Unit-test that no rank triple appears in two splits.

STEP 3: BASELINES (`ml/flipup_ml/baselines.py`)
B0 chart baseline and B1 equity baseline (required); B2 nearest-board (optional). Evaluate them with exactly the same metrics code as the network.

STEP 4: MODEL (`ml/flipup_ml/model.py`, `train.py`)
Start with an MLP (target under 5M parameters, checkpoint under 10 MB). Two heads: action EV (loss on raw EV and on EV centred per hand, masked to legal actions, weighted by the actor's root-relative reach weight) and strategy (masked softmax, cross-entropy). Early stopping on validation. Produce a learning curve: train on 10%, 25%, 50%, 75% and 100% of the training boards and evaluate each on the same held-out boards. Report CPU time.

STEP 5: EVALUATION (`ml/flipup_ml/evaluate.py`; write `ml/out/metrics.json`)
On held-out boards, reach-weighted and unweighted, by spot, node depth, street position, texture, and hand strength:
a. EV error: MAE and RMSE in bb and as a percent of pot, on centred EVs.
b. Action selection: top-action agreement with the solver; the solver-EV regret of the model's top action in percent of pot (mean and 95th percentile).
c. Grade fidelity: for every (node, hand with reach >= 0.01, legal action) compute the grade from true EVs and strategy with `gto/flipup_gto/review.grade()`, and from predicted EVs and predicted strategy. Map best/correct to Good, inaccuracy to Close call, mistake/blunder to Costly. Report the 3x3 confusion matrix, overall agreement, the FALSE-COSTLY rate (truth Good, predicted Costly) and the MISSED-COSTLY rate.
d. Compare against B0 and B1, and against the learning curve. Include 95% intervals from the grouped CV.
e. Speed: milliseconds to predict a whole node (all hands) on CPU, and model size.

STEP 6: INFERENCE INTERFACE (`ml/flipup_ml/infer.py`, plus a CLI `python -m flipup_ml.infer ...`)
`predict(spot, board, path, hand=None)` returns per-action EV and strategy for one hand (or the whole range), plus a `supported: true` flag. It must raise `UnsupportedInput` with a clear reason for anything outside the training domain: not one of the six spots; not heads-up or not the flop street; path deeper than 3 actions or containing an action size not in the stored trees; stack not within a small tolerance of the stored stack; board with duplicate cards; a hand that conflicts with the board or is not in the spot's root range; any rake. Never snap or guess silently. Add unit tests for each rejection.

STEP 7: REPORT (`ml/out/report.md`)
Plain, honest, no marketing words. Include: what data was used and its limits (about 240 boards if confirmed; explorer-tree EVs only; float16 storage; no rake; 100bb; river checked down); the learning curve and what it implies about needing more flops; all metrics against B0 and B1; the false-Costly rate; the verdict against the criteria below; costs (CPU hours); and next steps (for example finishing the flop library, turn and river, other stack depths). Say plainly if the result is negative or inconclusive.

DELIVERABLES
`ml/README.md` (how to reproduce, exact commands); `ml/requirements.txt`; `ml/flipup_ml/*`; `ml/tests/*` (fast pytest tests on synthetic fixtures, runnable in under a minute); `ml/out/data_audit.md`, `metrics.json`, `report.md`, `learning_curve.csv`, a checkpoint under 10 MB; and a short `ml/out/commands.log`. Run the full pipeline and the tests yourself and paste real numbers into the report. Do not leave the training unexecuted.

SUCCESS CRITERIA (judged on held-out boards, reach-weighted)
- Strong: mean regret of the model's top action <= 0.3% of pot and 95th percentile <= 1%; false-Costly rate <= 2%; grade agreement >= 90%; clearly beats B0 and B1.
- Usable only with an "estimate" label: mean regret <= 1% of pot; false-Costly <= 5%; agreement >= 80%; beats B0 and B1.
- Otherwise: report as not sufficient, and say what data would be needed.
Hitting a bar on the validation split but missing it on the held-out texture families must be stated as such.

BEFORE YOU FINISH
Run `python -m pytest ml/tests -q`. Confirm `git status` shows changes only under `ml/`. Commit on `codex/gto-ev-model` and push that branch only.
```

## 7. Evaluation criteria (summary)

| Measure | Strong | Usable with "estimate" label |
| --- | --- | --- |
| Mean regret of the model's top action | 0.3% of pot or less | 1% of pot or less |
| 95th percentile regret | 1% of pot or less | not set |
| False-Costly rate (truth Good, predicted Costly) | 2% or less | 5% or less |
| Grade agreement (Good / Close call / Costly) | 90% or more | 80% or more |
| Versus baselines B0 and B1 | clearly better | better |

These bars are proposals. They match the draft test plan (`Test plan: can a small network match the solver?`, shared doc) and have not been agreed by the team.

## 8. Verified facts, assumptions and unknowns at a glance

**Verified (read or run):** solver architecture and entry points; the `PostflopSolver` API; node info keys and shapes; EV in bb with the two root EVs summing to the pot; card and combo encoding; the file schema (reproduced on a probe solve); the six spots and their parameters; the solve settings (200 iterations, 0.5% target, depth 3, explorer tree, no rake); the stored counts per spot on Fly; the grade function; engine build steps; the full test suite result (46 passed, 2 skipped in 10m46s on 4 cores); the probe flop solve took about 51 s.

**Assumptions (not verified):** the six spots share the same ~240 boards; the library's preflop ranges are consistent; the `fly ssh sftp get -r` command works; CPU training is fast enough; about $100 would finish the library (my estimate from $17 spent for 1,423 flops, with an assumed price for the large machines).

**Unresolved:** the questions in section 4.

## Appendix A: files to read first
`gto/flipup_gto/solver.py`, `gto/flipup_gto/flop_library.py`, `gto/scripts/flop_library.py`, `gto/flipup_gto/custom.py` (`explorer_sizing`, `Explorer`), `gto/flipup_gto/review.py` (`grade`, `STACK_BUCKETS`), `gto/flipup_gto/cards.py`, `gto/flipup_gto/concepts.py` (`board_texture`), `gto/flipup_gto/ranges.py`, `gto/engine/include/flipup/solver.h` (`NodeInfo`), `gto/docs/INTEGRATION.md`, `gto/docs/GTO_PLAYBOOK.md` (section 11 benchmarks).

## Appendix B: quick synthetic fixture generator (verified to run, about 1 minute per flop)
Uses invented ranges, so the data is real solver output but **not** a real spot. For pipeline tests only.
```python
import json, os, numpy as np, sys
sys.path.insert(0, "gto")
from flipup_gto.solver import PostflopSolver
from flipup_gto.custom import explorer_sizing
oop = "22+,A2s+,K5s+,Q8s+,J8s+,T8s+,97s+,87s,76s,65s,A8o+,KTo+,QJo"
ip  = "22+,A2s+,K2s+,Q4s+,J6s+,T6s+,96s+,85s+,75s+,64s+,54s,A2o+,K8o+,Q9o+,J9o+,T9o"
s = PostflopSolver("Ks 7d 2c", 5.5, 97.5, oop, ip, sizing=explorer_sizing("flop", oop_leads=False), compress=True)
st = s.solve(60, 0.5, 20)
nodes, meta, queue = {}, {}, [[]]
while queue:
    tokens = queue.pop(0)
    node = s.node(tokens, with_equity=False, with_ev=True)
    if node.type != "action":
        continue
    key, p = ".".join(map(str, tokens)), node.player
    nodes[f"s:{key}"] = np.asarray(node.info["strategy"], dtype=np.float16)
    nodes[f"e:{key}"] = np.asarray(node.info["action_ev"], dtype=np.float16)
    nodes[f"r:{key}"] = np.asarray(node.info[f"reach{p}"], dtype=np.float16)
    meta[key] = {"player": p, "labels": node.labels, "pot": float(node.pot)}
    if len(tokens) < 3:
        queue += [tokens + [i] for i in range(len(node.actions))]
root = s.node([], with_equity=True, with_ev=True)
os.makedirs("ml/data/fixtures/btn_bb", exist_ok=True)
np.savez_compressed("ml/data/fixtures/btn_bb/Ks7d2c.npz",
    combos0=np.asarray(root.info["combos0"], dtype=np.int16), combos1=np.asarray(root.info["combos1"], dtype=np.int16),
    meta=json.dumps({"pot": 5.5, "stack": 97.5, "nodes": meta, "iterations": st.iteration,
                     "exploitability_pct": st.exploitability_pct}), **nodes)
```

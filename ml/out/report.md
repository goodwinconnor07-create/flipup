# Real solved-flop experiment

Verdict: **not sufficient across held-out texture families**. Primary grouped test: **not sufficient**. Validation: **not sufficient**. The architecture, sampling, seeds and hyperparameters were fixed before viewing held-out scores; there was no test-based tuning.

The network learned useful signal: mean regret is 0.553% of pot, versus 0.927% for B1. However, grade agreement is only 73.58% and 18.67% of solver-Good actions are labelled Costly. Those fail the estimate-only bars of at least 80% agreement and at most 5% false-Costly. Low average decision regret does not make the coaching labels safe to use.

With the entire paired family withheld, false-Costly rises to 39.64%; on actual monotone boards in their family holdout it is 26.86%. These are deliberate unseen-family stress tests, separate from ordinary primary held-out boards.

Increasing from 14 to 139 training rank triples reduced mean regret from 0.963% to 0.553% and false-Costly from 25.74% to 18.67%. More board coverage helped this recipe, but the curve cannot prove how much additional data would meet the grading bars. The main fits reached their 20-epoch cap, and only 64 positive-reach hands per node were sampled for fitting. A cheaper next experiment is to test larger fitting-row and optimization budgets using development groups only, before paying to expand the solved library. Use new confirmation boards for any later final claim.

All seven ZIP SHA-256 hashes and file counts matched MANIFEST.json. The library contained 1,423 readable files, with 1422 retained after the 0.5% exploitability cutoff. It has 239 distinct suit-isomorphic boards, 234 shared across all six spots, and 199 independent rank-triple groups. There are 19,664,924 hand/node rows, but millions of rows do not imply millions of independent poker situations.

| Spot | Readable files | Starting pot bb | Remaining flop-start stack bb | Root-range mismatches |
|---|---:|---|---|---:|
| btn_bb | 239 | [5.5] | [97.5] | 0 |
| co_bb | 239 | [5.1] | [97.7] | 0 |
| utg_bb | 234 | [5.1] | [97.7] | 0 |
| sb_bb | 238 | [6.0] | [97.0] | 0 |
| sb_limp | 235 | [2.0] | [99.0] | 0 |
| bb_btn_3bet | 238 | [20.5] | [90.0] | 0 |

The full rejected-file list, all audit distributions, cross-spot board intersections, strategy-normalization checks, root-EV sum checks and fold-EV checks are in data_audit.md and audit.json. No new solves were run for this real-data experiment. The earlier fixture stage used 15 local solves in total.

The primary untouched test includes 3,013,572 rows from 30 rank triples, grouped across every spot, suit cousin and node. All held-out rows are evaluated; none are sampled away.

| Model | Weighting | Centred MAE bb | Centred RMSE bb | MAE % pot | RMSE % pot | Top-action agreement | Mean regret % pot | P95 regret % pot | Grade agreement | False-Costly | Missed-Costly |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| MLP | reach_weighted | 0.423 | 1.011 | 3.485 | 5.493 | 74.64% | 0.553 | 3.151 | 73.58% | 18.67% | 11.95% |
| MLP | unweighted | 1.239 | 2.499 | 5.475 | 8.342 | 75.31% | 1.588 | 9.992 | 74.54% | 19.46% | 12.56% |
| B0_chart | reach_weighted | 1.081 | 2.858 | 8.604 | 14.972 | 53.55% | 4.127 | 20.396 | 56.77% | 32.94% | 35.83% |
| B0_chart | unweighted | 2.624 | 5.580 | 11.437 | 18.221 | 49.46% | 8.382 | 38.682 | 55.11% | 36.41% | 37.80% |
| B1_equity | reach_weighted | 0.529 | 1.237 | 4.491 | 7.110 | 72.63% | 0.927 | 5.253 | 71.97% | 20.75% | 14.82% |
| B1_equity | unweighted | 1.719 | 3.444 | 7.749 | 12.190 | 65.02% | 3.956 | 23.780 | 72.37% | 21.63% | 15.81% |

False-Costly means P(predicted Costly | truth Good). Missed-Costly means P(predicted Good or Close call | truth Costly). Grade rows are limited to actor reach ≥0.01, as requested. The weighted confusion matrix below contains reach×board-frequency mass, not raw counts. Rows are truth, columns prediction.

| Truth / prediction | Good | Close call | Costly |
|---|---:|---:|---:|
| Good | 10115486.74 | 1308679.97 | 2623149.22 |
| Close call | 992492.77 | 588869.02 | 1652109.54 |
| Costly | 953008.37 | 708308.29 | 12243628.05 |

Grouped CV (development groups only), mean and descriptive 95% intervals:

| Model | Mean regret % pot | Grade agreement | False-Costly |
|---|---|---|---|
| MLP | 0.640 [0.576, 0.704] | 72.237 [71.189, 73.286]% | 20.841 [19.506, 22.176]% |
| B0_chart | 4.191 [4.033, 4.350] | 56.592 [56.197, 56.987]% | 33.091 [32.653, 33.529]% |
| B1_equity | 0.929 [0.884, 0.973] | 71.719 [71.380, 72.058]% | 21.037 [20.558, 21.517]% |

These are Student-t intervals across five grouped CV fold metrics. Fitting sets overlap, the effective board sample is small, and the intervals are descriptive rather than independent-replicate guarantees. No clipping of interval endpoints to [0,1] was used. Primary test boards are excluded from all CV fitting.

Learning curve (same primary test groups for every row):

| Training fraction | Rank triples | Boards | Sampled fitting rows | Centred MAE bb | Mean regret % pot | P95 regret % pot | Grade agreement | False-Costly | B0 mean regret % pot | B1 mean regret % pot |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10% | 14 | 16 | 77,824 | 0.594 | 0.963 | 5.226 | 69.66% | 25.74% | 4.792 | 0.932 |
| 25% | 35 | 38 | 184,832 | 0.552 | 0.801 | 4.429 | 71.15% | 24.03% | 4.504 | 0.970 |
| 50% | 70 | 82 | 395,008 | 0.482 | 0.801 | 4.421 | 70.67% | 22.78% | 4.421 | 0.963 |
| 75% | 104 | 122 | 586,880 | 0.447 | 0.579 | 3.271 | 72.96% | 20.08% | 4.194 | 0.944 |
| 100% | 139 | 165 | 795,520 | 0.423 | 0.553 | 3.151 | 73.58% | 18.67% | 4.127 | 0.927 |

Mean regret changed by 0.410 percentage points of pot between the smallest and largest board sets. This curve cannot establish an exact number of additional flops needed, or separate all data-size effects from model capacity/optimization. A negative result applies to this bounded experiment; it does not prove no model could learn the task.

Texture-family and exploratory spot holdouts:

| Holdout | Model | Mean regret % pot | P95 regret % pot | Grade agreement | False-Costly |
|---|---|---:|---:|---:|---:|
| paired | MLP | 2.181 | 11.871 | 59.32% | 39.64% |
| paired | B0_chart | 4.382 | 17.446 | 53.35% | 36.06% |
| paired | B1_equity | 2.091 | 12.111 | 62.78% | 38.83% |
| monotone | MLP | 0.613 | 3.396 | 73.29% | 19.84% |
| monotone | B0_chart | 4.594 | 23.047 | 55.54% | 34.83% |
| monotone | B1_equity | 0.941 | 5.156 | 71.55% | 21.56% |
| leave_one_spot_out:bb_btn_3bet | MLP | 7.469 | 38.245 | 44.35% | 56.72% |
| leave_one_spot_out:bb_btn_3bet | B0_chart | 11.013 | 74.260 | 46.67% | 6.39% |
| leave_one_spot_out:bb_btn_3bet | B1_equity | 11.039 | 74.260 | 45.49% | 12.64% |
| leave_one_spot_out:btn_bb | MLP | 0.693 | 3.772 | 71.21% | 19.54% |
| leave_one_spot_out:btn_bb | B0_chart | 5.023 | 27.171 | 41.96% | 28.98% |
| leave_one_spot_out:btn_bb | B1_equity | 1.411 | 9.131 | 67.69% | 27.00% |
| leave_one_spot_out:co_bb | MLP | 0.513 | 2.987 | 74.73% | 18.78% |
| leave_one_spot_out:co_bb | B0_chart | 5.491 | 30.331 | 44.24% | 39.90% |
| leave_one_spot_out:co_bb | B1_equity | 1.332 | 8.212 | 69.40% | 27.96% |
| leave_one_spot_out:sb_bb | MLP | 1.686 | 8.659 | 63.82% | 30.59% |
| leave_one_spot_out:sb_bb | B0_chart | 7.041 | 33.582 | 39.15% | 48.57% |
| leave_one_spot_out:sb_bb | B1_equity | 2.332 | 13.317 | 61.22% | 31.40% |
| leave_one_spot_out:sb_limp | MLP | 3.081 | 15.653 | 58.48% | 43.08% |
| leave_one_spot_out:sb_limp | B0_chart | 6.393 | 26.953 | 47.31% | 62.25% |
| leave_one_spot_out:sb_limp | B1_equity | 3.576 | 20.996 | 60.31% | 47.07% |
| leave_one_spot_out:utg_bb | MLP | 0.766 | 4.391 | 71.59% | 23.42% |
| leave_one_spot_out:utg_bb | B0_chart | 5.442 | 30.025 | 40.77% | 36.45% |
| leave_one_spot_out:utg_bb | B1_equity | 1.121 | 6.680 | 70.28% | 28.60% |
| monotone_only_within_group_holdout | MLP | 0.999 | 5.602 | 69.90% | 26.86% |
| monotone_only_within_group_holdout | B0_chart | 5.674 | 26.339 | 52.66% | 38.11% |
| monotone_only_within_group_holdout | B1_equity | 0.994 | 5.011 | 70.48% | 25.46% |

Texture verdicts: {"paired": "not sufficient", "monotone": "not sufficient"}. Entire rank groups containing paired/monotone boards are held out, including their other suit textures. If validation passes a bar but a texture family fails, the result is insufficient for unrestricted use. LOSO permits the same boards in other spots and tests range/spot transfer, not unseen-board generalisation. Its spot one-hot category is unseen during fitting; scaling remains bounded at one.

Primary MLP subgroup results (full breakdowns for all models and both weightings are in metrics.json):

| Dimension | Group | Mean regret % pot | Grade agreement | False-Costly |
|---|---|---:|---:|---:|
| legal_action_count | 2 | 0.463 | 87.76% | 6.80% |
| legal_action_count | 3 | 0.603 | 78.05% | 17.28% |
| legal_action_count | 4 | 0.606 | 60.37% | 25.37% |
| legal_action_count | 1 | 0.000 | 100.00% | 0.00% |
| spot | bb_btn_3bet | 0.577 | 69.26% | 18.64% |
| spot | btn_bb | 0.407 | 76.26% | 13.95% |
| spot | co_bb | 0.403 | 77.41% | 12.74% |
| spot | sb_bb | 0.744 | 70.15% | 23.15% |
| spot | sb_limp | 0.610 | 73.35% | 21.86% |
| spot | utg_bb | 0.413 | 77.11% | 14.82% |
| depth | 0 | 0.268 | 68.46% | 15.60% |
| depth | 1 | 0.598 | 69.39% | 21.68% |
| depth | 2 | 0.573 | 79.03% | 16.76% |
| depth | 3 | 0.670 | 78.27% | 16.24% |
| texture | unpaired:rainbow | 0.524 | 73.35% | 18.36% |
| texture | unpaired:monotone | 0.665 | 72.28% | 22.46% |
| texture | unpaired:two_tone | 0.545 | 76.12% | 18.14% |
| texture | paired:rainbow | 1.112 | 64.74% | 26.43% |
| texture | paired:two_tone | 1.116 | 64.92% | 24.39% |
| strength | 0 | 0.475 | 72.86% | 17.25% |
| strength | 1 | 0.628 | 74.20% | 20.75% |
| strength | 2 | 1.025 | 77.29% | 22.53% |
| strength | 3 | 0.833 | 79.01% | 21.81% |
| strength | 4 | 0.740 | 85.22% | 19.66% |
| strength | 5 | 1.648 | 76.66% | 27.42% |
| strength | 6 | 2.014 | 82.70% | 16.92% |
| strength | 7 | 8.196 | 63.41% | 51.56% |
| player | 0 | 0.487 | 76.59% | 16.37% |
| player | 1 | 0.615 | 71.13% | 20.65% |

Protocol and limits:

- One fixed three-layer width-128 MLP, two heads, no architecture or hyperparameter search. Maximum 20 epochs, six-epoch early-stopping patience, AdamW at 0.001, batch size 4096. Binary inputs keep scale one, including unseen categories.
- Fitting samples at most 64 positive-reach hands per board/node, uniformly with fixed board/node seeds. Inverse inclusion weights preserve the expected actor-reach×canonical-board-frequency loss. Every training board and every positive-mass node contributes. Validation early stopping uses the same fixed sampling scheme; reported validation metrics include every row. B0 and B1 fit all training rows, so they receive at least as much training information as the sampled MLP. Learning-curve samples are nested by board. Zero-weight rows do not affect the fitting objective but remain in unweighted evaluation.
- B0 is a per-spot/node/hand-class weighted mean. B1 is a per-spot/node/action ridge regression on exact root equity and simple hand features, with the same weighted objective and an intercept. Unseen spot/node cells fall back to training-only legal-mask aggregates.
- The stored game is heads-up, flop only, six 100bb preflop spots, no rake, fixed explorer trees through three actions. Turn has one 75% bet size; river is checked down. Target EV/strategy/reach arrays are float16; sub-0.01bb differences can be storage noise. This is not a full-game GTO oracle.
- Equity is exact showdown equity against the fixed opponent root range, recomputed by the engine's batch sweep without solving. The older fixture report described a samples parameter as Monte Carlo; source inspection shows that parameter is ignored on flops, where the engine enumerates exactly. Per-hand equity agrees with stored float16 root equities within storage/rounded-range precision on the recorded probes. Deeper actor reach appears only in weights and grade eligibility; it is never an input.
- Grading compiles the actual unchanged review.grade() function with Numba, with disk caching disabled. Random and threshold-boundary tests compare the compiled results with direct calls. No grade thresholds were reimplemented or relaxed. EV error is centred across each hand's legal actions.
- Inference rejects unsupported spot, street, player count, path, action size, stack, duplicate/conflicting cards, out-of-range hands and rake. supported:true denotes the input domain, not a claim that coaching is reliable.

Compute: 18 fits, 1360.54 training wall seconds, 1.4359 training process CPU hours, four CPU threads. The training wall cap is two hours. The runner took 3391.33 wall seconds after feature preparation; features have their separate progress log. No GPUs or new solves were used. Model: 44,560 parameters, 340,059 bytes. Network batch timing: 4.579 ms for 1176 stored hands; full interface cold/warm: 51.610/6.620 ms for 1176 positive-range hands. These are different hand populations and both counts are reported.

The strong bar requires mean regret ≤0.3% pot, P95 ≤1%, false-Costly ≤2%, grade agreement ≥90%, and a clear baseline improvement. The estimate-only bar requires mean regret ≤1%, false-Costly ≤5%, agreement ≥80%, and improvement over both baselines. Clear baseline improvement for a strong result also checks paired CV regret-difference intervals. Passing a random board split alone does not establish texture robustness.

Next steps: do not deploy this checkpoint as a GTO coach. Add diverse independently solved rank triples and the board textures with the largest documented errors, then repeat a new frozen experiment with fresh confirmation boards. Also test larger fitting-row budgets on development data to separate sampling/optimization limits from data limits. Turn/river, rake and other stack depths require separate labelled data and tests.

Monotone-family reporting: the table includes the complete held-out rank groups and a separate monotone-only subgroup. Both are checked for the final verdict, following evaluation_addendum.json recorded before viewing held-out scores. No model, threshold, split, or hyperparameter was changed.

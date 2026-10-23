# Experiment report

Verdict: **inconclusive — no accessible real solved data**. This is a pipeline smoke run, not evidence of model accuracy. The uploaded flipup-flop-library.zip exceeds the attachment tool's 32 MiB transfer limit. No hosted service, production solver, Fly machine or external API was accessed.

The run used 12 solver-generated fixtures (12 boards), with appendix-B invented ranges in btn_bb only. All six production range/spot combinations and the claimed ~240-board overlap remain unverified. Files with exploitability >0.5% were dropped as recorded in data_audit.md.

MLP training, both baselines, all five learning-curve fractions, grouped five-fold CV and the paired/monotone holdout paths executed. Leave-one-spot-out requires multiple real spots and did not run. Accuracy, grade agreement, false-Costly, missed-Costly, regret, and accuracy confidence intervals are deliberately withheld: fixture scores cannot answer the question. No learning-curve conclusion about data sufficiency is possible. No success bar has been established.

Inputs and target limits: heads-up flop decisions only, fixed stored tree through three actions, no rake, 100bb initial effective stacks (97.5bb flop-start stack in fixtures), float16 target storage; flop bets 33/75/125%, raises 60%, one 75% turn bet, river checked down. These are explorer-tree values, not full-game GTO values. Root equity uses deterministic 1,024-sample Monte Carlo against the fixed root range, identically at training and inference; it is an approximate feature, not a solver result. No deeper reach is a feature. Range consistency compares shared unblocked combos across boards.

Engineering choices: one fixed 128×128×128 MLP, no hyperparameter search, validation-only early stopping. Loss combines raw and per-hand centred EVs (scaled by node pot) with masked strategy cross-entropy. Both use actor reach times exact canonical-board frequency. Each row has the actor's root range weight as a feature. B0 uses reach-weighted means by spot/node/hand class; B1 uses reach-weighted linear ridge regressions by spot/node/action on root equity and simple hand features. Missing chart cells fall back to training-only legal-mask averages; B1 falls back to training-only global action regressions.

Splits: 70/15/15 rank triples, stratified approximately by combined pairedness/suit textures; all suit cousins and spots share one assignment. Five-fold grouped CV uses development groups only, preserving the primary test. Texture holdouts remove every rank triple that has any board in that family. LOSO (when available) is exploratory transfer across ranges and permits shared boards, unlike the unseen-board experiments. No tuning uses any test result.

Metrics: centred EV error is averaged over legal actions; selected-action regret uses the true solver EV. Grades call the existing review.grade() for every legal action with actor reach ≥0.01. Confusion rows are truth, columns prediction, ordered Good/Close call/Costly. False-Costly is P(predicted Costly | truth Good); missed-Costly is P(predicted not Costly | truth Costly). Reported CV intervals are Student-t intervals across five fold metrics, descriptive because folds overlap in training. Board frequencies multiply reach; unweighted metrics give each row/action equal weight.

Learning-curve execution:

| Fraction | Training rank triples | Training boards | Training wall seconds |
|---|---:|---:|---:|
| 10% | 1 | 1 | 3.32 |
| 25% | 2 | 2 | 9.47 |
| 50% | 4 | 4 | 5.33 |
| 75% | 6 | 6 | 8.12 |
| 100% | 8 | 8 | 10.13 |

Training cost: 56.64 wall seconds, 0.0548 process CPU hours, 12 fits. Model: 44,560 parameters; 194,331 bytes. Network-only whole-node prediction: 0.855 ms (282 hands); full interface: 3756.747 ms with equity cache cleared and 17.857 ms warm call.

Total pipeline cost (audit, features, baseline fits, evaluation, training, timing): 156.97 wall seconds and 0.0830 process CPU hours. Local fixture solve wall times are recorded separately in local_solves.json; package installation and compilation are outside these timers.

Next step: provide independently compressed ZIP parts smaller than 32 MiB each (each retaining spot/flop.npz paths), or put the solved files directly in ml/data/flops. Run the exact real-data command in README. Only real board-held-out scores can support a verdict or determine whether finishing the library helps. Wider stack depths, turn/river decisions and rake need new data and separate validation. The saved fixture checkpoint carries synthetic_fixture_only evidence and must not be used for coaching.

Local solve budget: 15 calls total: 12 invented-range flop fixtures plus three existing river test cases. Fixture solve wall time was 383.68 seconds; individual CPU time was not measured. The 20-solve cap was respected.

The neural batch timing excludes feature generation. The cold whole-range interface is much slower because it computes sampled root equities; it is not a sub-millisecond end-to-end service.

Validation: `python -m pytest ml/tests -q`: 40 passed; selected existing range/concept/river-solver tests: 27 passed; `npm run check`: typecheck, 107 unit tests and production build passed. The CLI returned supported:true with synthetic_fixture_only evidence. Tracked source files outside ml/ are unchanged.

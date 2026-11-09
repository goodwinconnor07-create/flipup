# Opponent-response calibration and decision-quality checks

This update adds a fitted response/range candidate, targeted decision diagnostics, and paired evaluation against frozen V6 and V7. **Live ordinary bots and BOT_001 continue using V7.** The candidate predicts the reserved synthetic responses better, but loses average return heads-up in both gameplay batteries. It has not cleared the promotion screen. No live bot analysis is added to the Range trainer review.

See the [heads-up follow-up](HEADS_UP_REPAIR.md) for isolated ablations, nonlinear response fitting, specified-world probes and a conservative model-disagreement candidate. The original results below remain historical evidence.

## Fitted response and range model

`CalibratedProvider` is an explicit offline opt-in through `SimulationOptions.calibrated`. Preflop still delegates to V7; postflop uses the existing multiplayer engine, action space, sample budget, hand plans, personality preferences and estimated-value-cost guards. Frozen providers retain their original response policies and ranges. `prediction.calibration` identifies the candidate separately from its shared `baseline-7` engine version.

The three-way softmax predicts fold, passive (check/call), and aggressive (bet/raise). Its 15 inputs describe the hypothetical actor's own hand/draw, price, stack-to-pot ratio, position, public betting history, player count, street, and three interactions. Fold is masked when checking is available; aggression is masked when raising is closed or the continuation budget is exhausted. A shared royal-flush board always checks/calls. The model does not receive opponents' actual cards, the deck, future board cards, another bot's profile or memory. Own cards in simulations are sampled hypotheses; training observations are separate actor-local information sets.

`scripts/calibrateResponses.ts` generates production-engine games against a fixed mix of ordinary V7 bots, competent scripts and loose-passive scripts, at two, three and six seats with unequal stacks. Training, validation and test seeds are disjoint. Full-batch AdaGrad fits only the training observations; validation and test score the frozen result. The generated weight file is saved only if both reserved partitions improve log-loss and multiclass Brier error. This gate admits an **offline candidate**, not a live release. Gameplay returns do not fit weights. These are synthetic opponents, not human training data.

The public-action range update reconstructs the public commitments **before** each historical action, using only the board prefix then visible. It accounts for blinds, calls, folds, stack caps, uncalled refunds, full raises and short-all-in reopening. Each possible holding receives its preflop likelihood and the probabilities of that player's observed postflop actions. A 2.5% probability floor and exponent 0.6 temper narrowing; normalization preserves a distribution without treating an action as proof of one hand. Currently visible cards still block impossible holdings. This is approximate Bayesian-style inference, not a calibrated claim about real players' ranges. Direct tests compare replayed views with production decisions and verify historical-board causality and reopening.

The checked-in [fit report](benchmarks/response-calibration-fit.json) used 720 generated hands: 1,832 training observations, 964 validation observations and 989 test observations.

| Reserved response set | V7 log-loss | Candidate log-loss | V7 Brier | Candidate Brier |
| --- | ---: | ---: | ---: | ---: |
| Validation | 0.4319 | 0.3758 | 0.2766 | 0.2216 |
| Test | 0.4258 | 0.3394 | 0.2647 | 0.1954 |

Test log-loss improved 20.3%; Brier error improved 26.2%. That measures this synthetic action mix. It does not establish better range accuracy, playing strength or human realism. The initiative feature had no variation in this fitting sample and its coefficient stayed zero; merely including a feature is not evidence of its usefulness.

## Decision-quality diagnostics

`DecisionQualityAudit` records possible missed value, weak calls and abandoned bluffs from private decision traces. It compares the final action distribution with the model's raw rollout values, requiring an advantage exceeding half a big blind plus twice the summed standard errors. Value flags require high estimated equity and low aggressive probability; abandoned-bluff flags require low equity and very low aggressive probability. Weak-call flags require substantial call mass despite a sufficiently negative estimated call advantage. Examples are bounded to 20 per run.

These flags are **disagreements with approximate model values**, not ground-truth poker mistakes. A model can be confidently wrong. Counts need their decision/opportunity coverage and do not rank bots by themselves. Nothing forces aggression merely to meet a frequency target.

Two complementary checks reduce that circularity:

- Controlled unit-test worlds specify exact opponent holdings and response rules. They verify value against a guaranteed weaker caller, top-pair value against an underpair, profitable bluffing against a folder, and a losing call against quads. Synthetic forced policy mistakes test all three diagnostic counters.
- [Twelve fixed production-engine probes](benchmarks/decision-quality-probes.json) score all three final distributions against one common prior and one specified competent-style response teacher, using 256 reference samples. Their mean reference-score loss is 8.82 bb for V6, 9.50 for V7 and 8.52 for the candidate. These small, fixed regression contexts have Monte Carlo uncertainty and approximate future sizing; they are neither a solver nor human ground truth. No probe result selects parameters.

## Unseen gameplay and promotion

Both batteries compare V6, V7 and the candidate on identical physical deals, identity seeds, learning settings and stacks. Cases cover heads-up, short-stack three-way, unequal six-way and unequal nine-way Challenge tables. Nine-way opponents include loose-aggressive and tight-passive scripts absent from response fitting. All ordinary bot seats change together, so multiplayer returns do not isolate one player's strength. Stacks reset each hand; these comparisons do not test long sessions with accumulated stacks.

The [holdout](benchmarks/response-gameplay-holdout.json) has 5,400 hands across all three versions; the fresh-seed [confirmation](benchmarks/response-gameplay-confirmation.json) has 3,600. Rerunning either partition for instrumentation is reproducibility, not additional independent evidence. Per-seed paired intervals are descriptive because hands share memory; uncertainty is wide.

| Situation | Holdout change vs V7, bb/100 | Confirmation change vs V7, bb/100 |
| --- | ---: | ---: |
| Heads-up | -14.5 | -27.0 |
| Short-stack three-way | +27.0 | +36.7 |
| Unequal six-way | +47.7 | +214.6 |
| Unequal nine-way Challenge | +3.7 | +64.4 |

These mixed results do not establish superior strength. Promotion additionally requires deal parity, existing realism checks per session and pooled across seeds/situations, at least 30 eligible multi-street trajectories and 100 optional decisions, and executor p95 below 250 ms. A nonnegative mean against V7 in **every** situation is a conservative review screen; it is not automatic deployment or a statistical strength certificate. Both batteries reject promotion because of heads-up results. Context-matched sizing cells below the existing minimum remain explicitly unassessed, even when the other product checks pass. Executor speed is not an iPhone measurement.

Both batteries passed those mechanical, coverage, realism-product and latency gates. The holdout pooled 511 qualifying multi-street hands and 1,610 optional decisions; confirmation pooled 333 and 1,048. Maximum session p95 was 140.3 ms under concurrent cloud load. Neither battery reached sufficient observations in any context-matched sizing comparison, so sizing-tell absence remains unassessed.

The next development target is heads-up response/range error, assessed with separate development seeds and an ablation separating range updating from continuation prediction. Reusing these holdout returns to tune parameters would consume their status as reserved evidence. A new candidate needs a new reserved partition before live promotion.

## Reproduce

```sh
# Deliberately regenerates the tracked offline candidate weights on success.
npm run bot:responses -- 60 /tmp/response-fit.json

npm run bot:compare-responses -- 150 /tmp/response-holdout.json holdout
npm run bot:compare-responses -- 100 /tmp/response-confirmation.json confirmation
npm run bot:decision-quality -- /tmp/decision-quality-probes.json
npx vitest run src/bot_engine/responseCalibration.test.ts
npm run check
```

The daily learning workflow records a smaller paired comparison and the fixed probes as artifacts. It does not regenerate response weights or promote the candidate. This update does not restart the previous five-hour experiment.

Validation: root typecheck, 1,017 tests in 58 files and production build; 71 native tests, native typecheck and lint (zero errors, 19 existing warnings); Metro web export; and two browser tests covering ordinary bot play/reload and game completion. No UI, animation, native API, trainer-review or poker-rule changes are included.

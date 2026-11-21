# Heads-up diagnosis and model disagreement

This follows the [original response-calibration candidate](RESPONSE_CALIBRATION.md). It separates the two changes, reviews costly decisions, and evaluates repairs with new reserved deals. The purpose is intelligent, varied opponents; none of these models is a GTO solver or a human-data model. The Range trainer review and normal settings/play flow are unchanged.

**Live ordinary bots and BOT_001 retain the V7 provider**, now with the separately validated [live table experience](LIVE_HUMAN_TABLE.md) for private plans and restrained table behavior. The conservative candidate repairs the controlled optimistic-call failure, but its fresh gameplay returns do not clear promotion. It is an explicit offline option, not a setting silently enabled in the app.

## What the ablation found

The [development ablation](benchmarks/heads-up-ablation-development.json) ran 7,200 hands: four policies, three opponent styles, two seeds and 300 hands per session. All policies receive identical physical deals, identities and learning settings. Returns are primary-player returns in bb/100; paired intervals are descriptive and often wide.

| Opponent | Ranges alone vs V7 | Responses alone vs V7 | Both vs V7 |
| --- | ---: | ---: | ---: |
| Competent reference | -24.8 | -62.3 | -34.0 |
| Calling station | -18.7 | +192.9 | +231.8 |
| Loose-aggressive | +14.6 | -1.3 | +59.9 |

The loss against the competent reference was not attributable to one component alone. The benefit against a calling station also explains why aggregate prediction improvements cannot establish stronger play across opponents.

Reports retain bounded reviews of the largest paired losing hands. Each review contains only the acting bot's cards, public context, legal actions, scores, sampling errors and final distribution. These are counterfactual branches on the same physical deal; a large return difference is not proof of a mistake. For example, the original candidate grew a two-pair pot on a runout that added straight possibilities, then estimated 56% equity facing a large river re-raise. The comparison identifies a useful review target without exposing an opponent's actual hand to the policy.

The [role/prior experiment](benchmarks/heads-up-fixes-development.json) separately tried an opponent-only fitted continuation and a fixed half-prior mixture. Neither consistently repaired the weakness. The [nonlinear development run](benchmarks/heads-up-nonlinear-development.json) tests the new statistical basis below. These are development experiments, including repeated deals, not independent promotion evidence. Failed alternatives are retained rather than discarded from the report.

## Response fitting and its limits

The original linear strength feature under-represents abrupt changes between hand groups. The new basis retains its 15 public/own-hand inputs and adds indicators for 11 hand levels, plus their interactions with facing a bet: 37 inputs in total. Training algorithm, regularization and feature basis were fixed before reserved scoring. The original fitted weights remain unchanged.

The [new fit](benchmarks/nonlinear-response-fit.json) generated 1,800 production-engine hands from the same ordinary-bot/competent/loose-passive population, with unequal stacks at two, three and six seats. Its 4,546 training, 2,266 validation and 2,237 test observations use separate seeds. Only training observations fit weights. The save gate requires lower aggregate log-loss and Brier error than the original fitted model on both reserved partitions, plus lower observed-aggression log-loss with at least 20 aggressive observations in each.

| Test metric | V7 prior | Original fitted model | Nonlinear fitted model |
| --- | ---: | ---: | ---: |
| Overall log-loss | 0.4001 | 0.3106 | 0.2597 |
| Overall Brier error | 0.2503 | 0.1783 | 0.1438 |
| Log-loss on 211 observed bets/raises | 1.1656 | 1.6292 | 1.5659 |

The new basis improves aggregate errors by 16.4% and 19.3% against the original fitted model. **It still predicts observed aggression worse than the V7 prior.** The abundant passive decisions dominate the aggregate metric. The [specified-world probes](benchmarks/heads-up-specified-worlds.json) also show that the nonlinear model alone can remain too optimistic about marginal calls. Those limits motivate a model-disagreement check, not a direct live promotion.

## Conservative candidate

`CalibratedProvider(samples, 'robust')` evaluates the nonlinear public-action range/response model and frozen V7 on a common sampling seed and equal sample budgets. For each action it uses the lower of their approximate values, the larger reported sampling error, and the lower equity indicator. Private `modelAgreement` diagnostics retain both original value vectors and equity estimates. Existing personality, commitment, sizing and estimated-value-cost guards then run as before.

This is a conservative **model score**, not a calibrated EV, confidence bound or guarantee against losses. Both models can be wrong. The reported equity is a conservative indicator across models, not a posterior probability from their union. Range-read summaries describe the fitted candidate's ranges; they do not imply both models agree. There is no opponent-type oracle, result-based difficulty, altered dealing or forced mistake. The comparison adds computation, so executor latency remains a release gate.

Opponent prediction is now independently configurable from the bot's own future continuation policy. The new candidates use the existing V7 own-card policy for the bot's future actions. The original candidate still applies its fitted population model to all actors, so it remains reproducible. Every hypothetical actor sees only its own sampled cards, currently revealed board and public context. Tests verify the opponent callback never receives the hero's cards, legacy callback equivalence, impossible-action masks, shared-royal calls and resistance to extra private input fields.

Six specified river worlds give exact utilities under explicit single-holding/call-or-fold hypotheses. The policy receives neither the reference holding nor the response rule. These worlds are sensitivity checks, not a claim that the bot should know an unknown opponent's precise cards.

| Probe | V7 expected utility, bb | Original candidate | Conservative candidate |
| --- | ---: | ---: | ---: |
| Nuts against a weaker caller | +36.17 | +44.28 | +36.23 |
| Thin value against an underpair caller | +23.19 | +42.32 | +23.19 |
| Bluff against a guaranteed folder | +1.57 | +1.95 | +1.58 |
| Bluff into a stronger caller | -0.24 | -0.13 | -0.10 |
| Losing call against quads | -1.74 | -12.23 | -1.65 |
| Profitable bluff catch against air | +33.92 | +109.92 | +33.92 |

The large original-candidate utilities against guaranteed weaker callers depend on that deliberately generous reference rule; they do not certify realistic value extraction. The final [development check](benchmarks/heads-up-robust-development.json) uses 150 hands per session. It includes an adverse loose-aggressive result, so the conservative repair is not a universally better policy. Its shared 150-hand prefixes are development evidence, not extra independent games beyond the longer experiments.

## Reserved gameplay protocol

The [repair holdout](benchmarks/heads-up-repair-holdout.json) and [repair confirmation](benchmarks/heads-up-repair-confirmation.json) use new, disjoint seed partitions. They compare the frozen conservative candidate with V6 and V7 across competent, calling-station and loose-aggressive heads-up opponents, a short-stack three-player table, unequal six-player tables and unequal nine-player Challenge tables. All ordinary bot seats change together in multiplayer comparisons. Stacks reset each hand, while each bot keeps its own memory within a session.

The holdout has 8,100 executed hands (150 per session), and confirmation has 5,400 (100 per session), across all three policies. The evaluator fingerprints the policy sources and weights before play and rejects a report if they change during the run. No reserved gameplay return fits weights or selects another candidate. Repeated daily fixed-seed monitoring is regression checking, not additional unseen evidence.

Promotion requires identical deals, the existing per-session and pooled realism checks, at least 30 qualifying multi-street trajectories and 100 optional decisions, executor p95 below 250 ms, and nonnegative mean return changes against V7 in every situation. That remains a conservative review screen, not automatic deployment or a statistical strength certificate. Sparse context-matched sizing cells remain unassessed.

Both batteries passed mechanical, coverage, realism-product and latency gates, with matching policy fingerprints. Both rejected promotion. The measured changes against V7 were:

| Situation | Holdout, bb/100 | Confirmation, bb/100 |
| --- | ---: | ---: |
| Competent heads-up | -2.2 | -0.3 |
| Calling-station heads-up | -25.3 | -16.2 |
| Loose-aggressive heads-up | +4.1 | -24.7 |
| Short-stack three-way | +9.6 | +11.8 |
| Unequal six-way | -32.7 | +9.9 |
| Unequal nine-way Challenge | +10.7 | +0.6 |

The per-seed intervals are wide. These new point estimates cannot be directly attributed to a gain over the original candidate's earlier reserved results, which used different deals. The conservative candidate still sacrifices some profitable decisions, particularly against passive callers, and its loose-aggressive result changes sign between batteries. Better response forecasts and a repaired toy failure do not establish a better overall bot.

Holdout pooled 947 eligible multi-street hands and 3,019 optional decisions; confirmation pooled 678 and 2,166. No declared realism flag fired. Two of 447 sizing comparisons reached the product check's minimum in holdout; none of 375 did in confirmation. The rest remain unassessed. Maximum session p95 was 213.2 ms and 192.4 ms respectively, under concurrent cloud load; these are not phone measurements.

The next useful research target is conditioning response/range estimates on **observed public opponent behavior**, with uncertainty while evidence is sparse. The fixed population average cannot distinguish a frequent bluffer from a selective value bettor. That should be assessed with direct range/response checks and another new reserved partition; these gameplay partitions are now consumed evidence. The conservative candidate should not be promoted merely by weakening its gates or repeatedly tuning against these seeds.

## Reproduce

```sh
npm run bot:heads-up -- 300 /tmp/ablation.json ablation
npm run bot:heads-up -- 300 /tmp/role-prior.json fixes
# Deliberately regenerates the tracked nonlinear candidate weights on success.
npm run bot:responses-v2 -- 150 /tmp/nonlinear-fit.json
npm run bot:heads-up -- 300 /tmp/nonlinear-development.json nonlinear
npm run bot:heads-up -- 150 /tmp/conservative-development.json robust
npm run bot:decision-worlds -- /tmp/specified-worlds.json
npm run bot:compare-responses -- 150 /tmp/repair-holdout.json repair-holdout robust
npm run bot:compare-responses -- 100 /tmp/repair-confirmation.json repair-confirmation robust
npx vitest run src/bot_engine/headsUpRepair.test.ts src/bot_engine/responseCalibration.test.ts
npm run check
```

The scheduled workflow records conservative-candidate comparisons and specified-world probes as artifacts. It does not fit weights, promote a model or restart the earlier five-hour run.

Large benchmark artifacts use compact JSON; format them locally for detailed inspection. Validation passed root typecheck, 1,022 tests in 59 files and production build; 71 native tests, native typecheck and lint (zero errors, 19 existing warnings); Metro web export; and two browser tests for normal bot play/reload and game completion. The existing profile-variation/cost-bound test also passes for the conservative candidate. Two initial full-suite timeouts under heavy concurrent simulation load passed an unchanged single-worker retry and the final full check; test timeouts and assertions were not weakened.

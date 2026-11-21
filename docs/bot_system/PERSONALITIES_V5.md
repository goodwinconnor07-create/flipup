# BOT_001: unequal stacks, cold callers and three personalities

This update builds a wider preflop decision model first, then adds three authored player profiles and measures their decisions in shared-deal simulations. It does not train a neural network or establish human realism. The unchanged legacy table bots still use their existing engine; the new profiles are selectable for the opt-in BOT_001 seat.

## Actual stack and multiplayer support

`baseline-5` keeps the exact chart adapter from baseline-4. A chart miss now takes the `commitment-aware-preflop` route with `coverage: modelled`, rather than projecting the hand to a nearby equal-stack chart. This works with actual legal information from 2–9 seats, arbitrary supported chip depths, unequal stacks, limpers, cold callers, short all-ins and repeated raises.

The public context distinguishes the number of raises, callers since the last raise, an opportunity to squeeze, live opponents and effective stacks. An all-in call does not count as a raise. Candidate raises add position-aware isolation/squeeze sizes and cap the new target to effective stacks and the authoritative engine bounds. Other legal candidates remain available. Opponent combination weights distinguish limps, cold calls, repeated aggression and the size of the commitment. The response model considers existing investment and the fraction of the stack being called. Visible cards are removed; no opponent cards or actual future deck enter analysis.

The payoff rollout still evaluates a single betting round with hypothetical cards, real side-pot construction, folded money, stack caps and uncalled returns. It does **not** search future re-raises or future streets. Selection scores subtract an explicit heuristic reserve for large commitments, uncertainty and missing future betting. `rolloutValues` retain the original estimates; `values` are decision scores after that reserve, not solver EVs. Ranges, responses and reserves are untrained approximations. Supporting these states is not proof of stronger play.

The baseline-4 implementation remains selectable for experiments. Benchmarks compare both versions on the same deals and unequal starting stacks. Separate continuous-stack sessions preserve chips between hands and rebuy only busted seats; simulation checks chip conservation and legal actions throughout.

## Profiles and specific tendencies

| Profile    | Intended behavior                                                      | Controlled mistakes/tendencies                                                             |
| ---------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Patient    | Selective starting hands, more folding under pressure, fewer weak bets | Passes up some thin calls and bluffs; cautious on the river                                |
| Curious    | Plays more hands, favors calling and seeing draws/showdowns            | Calls too widely and continues more draws; slower to adapt                                 |
| Aggressive | Raises more often, applies more pressure and mixes more weak-hand bets | Overuses some pressure opportunities; prefers bigger sizes in otherwise matching decisions |

These extend the seeded profile with an optional personality ID and fixed, inspectable traits. They do not sample a new personality every move. Preflop participation priors depend on hand quality, live player count and prior raises; aggression is not permission to enter every full-table hand. Named profiles avoid routine deep-stack overbets into tiny pots, while allowing short-stack commitments and reraised pots. Weak-hand betting has a profile-specific probability ceiling, so even Aggressive checks/folds some air.

Within these priors, identity weights depend on street, strength/draw class, call versus raise, bet size and number of opponents. A small mixture among actions near the best estimated score permits consistent mistakes. Their expected score-cost budget is bounded relative to the **named profile reference after its authored priors**, not relative to the original chart or a true optimal policy. `unmodifiedProbabilities` preserve the original provider distribution in private traces. For chart states, approximate rollout scores supply the budget guard; chart frequencies themselves contain no EVs.

All three continue using the existing guarded, context-specific river adaptation. Personality changes retain table-session opponent beliefs. Lifetime learning across unrelated tables, calibrated emotional state and learning a neural network remain outside this implementation.

## Play and compare

Enable **House rules → Invite BOT_001**, then select **BOT_001 personality**. The choices are Original, Patient, Curious and Aggressive. Original preserves the old seeded personality with the updated preflop engine. Choose zero other bots for heads-up, or add ordinary bots to observe multiplayer behavior. The shared setting exists in web setup/table settings and native setup/lobby House rules. Only the host can edit it. A change applies next hand, including when the bot has not yet acted in the current hand.

The profile, private diagnostics and opponent memory persist with the table snapshot. The existing redaction boundary removes that entire private state from online clients and legacy bot views. Native changes require an app build/update; no EAS build or TestFlight submission is performed by this task.

## Reproduce the behavior evaluation

```sh
npm run bot:personalities -- 200 /tmp/flipup-personalities.json holdout
```

The harness gives every profile the same physical deals and opponents across three seeds and three environments: unequal-stack heads-up versus a competent script, unequal-stack heads-up versus a loose-aggressive script, and a six-player mixed table. It records participation (VPIP), preflop raises (PFR), 3-bet opportunities, postflop aggression, folds facing a bet, draw calls, river calls, weak-hand bets and bet sizes. Every rate includes its opportunity count; rare conditional rates must be interpreted cautiously. Weak-hand bets use a visible hand-bucket proxy, not a solver-certified bluff classification.

The preregistered directional behavior checks require Curious to enter more hands than Patient, Aggressive to raise more than Curious and bet more than Patient, Patient to fold more than Curious, and Aggressive to bet weak hands more than Patient. Differences must exceed three percentage points in aggregate. A separate classifier uses only aggregate behavior to predict the profile, with entire seeds held out from its centroid fitting. This is a simulation consistency check, not a human blind playtest.

Development pilots exposed excessive large-bet incentives and overly wide multiplayer entry. Those were corrected before the final run. The final run uses fresh seeds 262111, 273127 and 284131; development and interrupted validation seeds are not presented as final holdout evidence. Parameters are authored and frozen for this comparison, not fitted to its returns.

## Final measured results, 9 November 2026

The [full holdout report](benchmarks/personality-v5-holdout.json) records **6,720 completed hands**: 5,400 profile hands, 1,200 candidate/incumbent comparison hands and 120 continuous-stack hands. All five directional behavior checks passed. The behavior-only classifier identified **27/27 sessions (100%)** with whole seeds held out. Each profile played 1,800 hands. These are aggregate session signatures; a human identifying a bot from a short live hand remains untested.

| Measured tendency                                  | Patient | Curious | Aggressive |
| -------------------------------------------------- | ------: | ------: | ---------: |
| Entered pot voluntarily (VPIP)                     |   10.0% |   55.2% |      37.9% |
| Raised preflop (PFR)                               |    9.1% |   16.2% |      36.7% |
| 3-bet when offered an opportunity                  |    7.1% |   18.4% |      31.3% |
| Aggressive postflop action                         |   37.9% |   21.7% |      69.5% |
| Folded when facing a bet                           |   84.6% |   25.0% |      57.2% |
| Bet/raised with a weak hand when raising was legal |    4.8% |    7.0% |      50.1% |
| Called with a draw when facing a bet               |   35.7% |   81.6% |      25.0% |
| Called on river when facing a bet                  |   17.4% |   60.3% |      31.8% |
| Mean additional bet / pot after call               |    0.59 |    0.77 |       0.52 |

Patient is currently a pronounced nit, rather than a balanced expert. Conditional draw samples were only 14, 49 and 16 opportunities; river samples were 23, 239 and 22. Those rates are much less certain than participation. The mean bet-size result does **not** show Aggressive betting larger in aggregate: its frequent weak bets and different reached states change the sample. A matched-context unit test verifies its larger-size preference when action values and context are held equal. All rates and counts are retained for review.

| Environment             | Patient bb/100 | Curious bb/100 | Aggressive bb/100 |
| ----------------------- | -------------: | -------------: | ----------------: |
| Competent script        |          +12.3 |          −25.7 |             +14.9 |
| Loose-aggressive script |          +24.7 |         +190.9 |             −13.5 |
| Mixed six-player table  |         +197.6 |         +688.0 |            +586.2 |

These returns are descriptive averages across three sessions per environment, not certified skill ratings or comparisons with human players. They show actual weaknesses alongside distinct styles. The large multiplayer returns reflect these particular scripted opponents and stack configurations; pooling them into a confidence interval across different environments would be misleading.

The separate baseline-5 versus baseline-4 comparisons returned +79.4bb/100 against the competent script (descriptive interval −100.3 to +259.1), −31.7 against loose-aggressive (−332.6 to +269.1), and +246.2 at the mixed table (−380.5 to +872.9). All intervals include zero. Every candidate preflop decision in these unequal-stack comparisons used the explicit modelled route; the six-player leg included 101 cold-call decisions. This confirms exercised coverage, not a proven strength improvement.

Continuous-stack sessions finished for every profile, including short stacks and cold callers, without chip loss or illegal actions. Highest profile-session p95 decision latency was 88.1ms on this cloud executor. The production think delay remains separate.

Validation passed root typecheck/build and 970 tests across 49 files, native typecheck/lint (21 existing warnings, zero errors), 55 native tests, both local/online browser tests, and Expo/Metro web export. A separate 780-hand development smoke run verified the final harness's shared-deal assertions, report schema and exit-status gates (all five behavior checks passed; recognition 26/27). It is not pooled with the holdout evidence. The browser test selects Patient through settings and verifies the actual persisted profile; the online test uses Aggressive and verifies private-state redaction. Tests also cover next-hand changes, host authorization, persisted identity, common-context differences, score-cost bounds, weak-bet ceilings and overbet exclusion. The concurrent main seat-window update had a native lint error from a synchronous effect state update; its mount callback is now deferred and cleaned up without changing the seat animation rules.

The daily workflow stores a smaller behavior report alongside existing learning experiments and fails if the five directional checks or the 75% recognition threshold regress. Fixed-seed reruns detect regressions; they do not accumulate independent evidence or automatically replace live parameters. Human playtesting, broader opponents, stronger multi-street valuation and less extreme profile calibration remain useful next steps.

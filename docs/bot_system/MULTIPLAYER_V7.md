# Multiplayer planning, hand continuity and realism checks

`baseline-7` replaces the default postflop strategy for ordinary Hold'em opponents and optional BOT_001. Everyday preflop entry ranges, restrained identities, fixed Casual/Challenge levels, dealing and the normal Play with bots flow retain their behavior. No live bot analysis is added to Range training.

## Multiplayer planning

The new model supports two through nine players, unequal stacks, folded dead money and opponents already all in. It resolves the current action and simulates betting on every remaining street: turn and river from a flop decision, or river from a turn decision. River decisions model the current betting round. An all-in player can win only eligible pots; other players with chips can continue contesting a side pot. Bluffing into a dry side pot is reduced because an all-in opponent cannot be made to fold.

A small hypothetical betting ledger reconstructs public acted/reopening state. Full raises reopen action, short all-ins do not, calls cap at the remaining stack, betting runs clockwise, and unmatched chips return before the next street. It uses production `canRaise()` and production pot construction/eligibility for settlement. Tests compare ledger transitions with actual engine moves across heads-up, three-, six- and nine-player hands, including short all-ins. Fractional tie shares are expectations; the actual game's odd-chip rule still runs in the production engine.

Search is bounded: at most one additional aggressive response after an aggressive root action; a checked-to root can face a bet and a raise. Future streets allow a bet and one raise. Later responses call, fold or check. This is an authored continuation model, not an exhaustive game tree or a full-game solver. Sample budgets scale with player count: Casual starts at 96, Challenge at 160, divided by the square root of live players / 2, with a 160-sample cap.

Opponent holdings and runouts are hypothetical. Each continuation policy receives a narrow view containing only its own cards, the board currently revealed and public context. It never receives an opponent's hole cards, a deck or the remaining runout. Turn policies cannot see the hypothetical river. Common deals and response draws are reused across root candidates, keyed by actor and street; player-array permutations and circular seat gaps do not change the analysis.

The public-action range model has a new revision recognizing private improvements to a made river board, such as the ace of a five-heart flush board, a higher straight, or quads improving a board full house. Live weak-bet guards use the corrected own-hand classification too. The trainer's authored classifier, scenarios, answers and cached lesson numbers are unchanged. Historical baseline-6 range and continuation policies remain available for frozen comparisons.

## A coherent hand

The service reconstructs a hand plan from its own cards, public action history and a hand-scoped identity seed. Its reasons include value, semi-bluff, pot control, selective pressure, giving up and bluff catching. Completed draws can become value bets; missed draws usually stop; marginal hands reduce pressure after opposing aggression. Retained initiative and multiplayer pressure affect whether a weak hand continues betting. Sizing preferences follow the pot and the kind of hand rather than repeating a fixed chip amount.

The pressure choice stays stable through streets, retries and reloads, while new cards and public actions can revise the reason. The plan is reconstructible rather than a separate unbounded store: old saved games work without a migration, next hands receive a new seed, and only the existing bounded private traces retain diagnostics. Public network views and legacy bot views omit them. Different bots never share their plans, memories or cards.

These are small preferences among plausible actions. The existing uncertainty and commitment reserves, weak-bet and deep-overbet guards, and final estimated-value-cost bound still apply. A plan does not force a bluff or a call against an unfavorable model score. Per-bot traits remain subtle; no result-based difficulty, scripted dealing or guaranteed mistakes are added.

## Automated realism checks

`RealismAudit` observes only the primary bot's whitelisted decision traces. It records street/hand-type action frequencies, expected aggression, sampled aggression with descriptive Wilson intervals, policy entropy, whole-hand trajectories, missed-draw barrels and dry-side-pot behavior. Legacy-model intentions are reconstructed afterward for comparison and are labelled by the absence of an actual plan count.

The declared product flags are deliberately broad:

- An illegal action, invalid probability distribution or exceeded estimated-cost budget.
- One whole-hand line in over 85% of at least 30 eligible hands spanning multiple streets and multiple optional decisions.
- Fewer than 2% mixed decisions across at least 100 optional decisions.
- Expected weak-hand multiplayer aggression above 18% across at least 20 opportunities.
- Expected missed-draw barrel aggression above 30% across at least 10 opportunities.
- Near-perfect sizing separation (total variation above 0.97) between hand groups with at least 12 actual bets each in matching contexts.

Sizing comparisons match street, betting versus raising, position, heads-up/multiplayer, depth and coarse board texture. Sparse cells are explicitly **insufficient**, not passes establishing realism. Tests feed intentionally repetitive and size-revealing policies into the auditor to verify it catches them. Retry deduplication prevents repeated observations from inflating counts.

Reports retain per-session audits plus pooled audits across seeds for each situation and for the full battery. Namespaces prevent identical hand/sequence IDs at different hypothetical tables from colliding. Pooled repetition and optional-choice coverage are explicit gates; sparse individual sessions cannot silently supply the only evidence. Observer callbacks receive independent trace copies and run outside measured inference time.

These thresholds are product hypotheses. Their absence does not establish human realism, lack of exploitable tendencies, enjoyment, retention or superior skill. Expected policy mass reduces sampling noise but is not independent human evidence. Normal/Wilson intervals are descriptive because hands share memory and comparison profiles can repeat physical deals.

## Reproduce

```sh
npm run bot:realism -- 30 /tmp/v7-development.json development
npm run bot:realism -- 200 /tmp/v7-holdout.json holdout
npm run bot:everyday -- 200 /tmp/v7-table.json holdout
npm run bot:ranges -- /tmp/v7-ranges.json
npx vitest run src/bot_engine/multiplayerPlanning.test.ts src/bot_engine/handPlan.test.ts src/bot_engine/realism.test.ts
```

The [paired realism report](benchmarks/multiplayer-continuity-v7-holdout.json) compares frozen baseline-6 with baseline-7 on identical physical deals and identity/learning settings, using separate development and holdout seeds. It covers heads-up, a short-stack three-way table, unequal six-way tables and unequal nine-way Challenge tables. All ordinary bot seats change together in the mixed-table comparisons; those returns do not isolate one player's strength. The [everyday table report](benchmarks/everyday-table-v7-holdout.json) checks participation, subtle personality spread and table variety. The [internal range examples](benchmarks/bot-range-analysis-v7.json) remain offline diagnostics.

The held-out comparison completed 4,800 hands across both versions, exercising 2,389 primary-bot postflop models and hand plans, including 900 multiplayer decisions, 38 decisions with all-in opponents, and 650 river models. It contained 751 eligible primary-bot multi-street trajectories. All declared mechanical and realism product gates passed; maximum session p95 inference was 107.1ms on this cloud executor under concurrent load, not an iPhone measurement.

| Situation | Mean paired change, bb/100 | Eligible multi-street hands | Largest repeated line |
| --- | ---: | ---: | ---: |
| Heads-up | -1.5 | 174 | 38.5% |
| Three-way with a short stack | -24.0 | 293 | 37.2% |
| Unequal six-way | +0.4 | 144 | 24.3% |
| Unequal nine-way Challenge | +44.8 | 140 | 32.1% |

These returns are mixed, with broad descriptive intervals. They establish neither a general strength increase nor an ideal difficulty. The short-stack result is a reason for further policy/range calibration, rather than a result to omit. No held-out return selected parameters. Weak-hand multiplayer aggression averaged 4.3% expected policy mass across 391 opportunities, and missed-draw barrels 8.9% across 31 opportunities. Only four weak-hand dry-side-pot opportunities occurred, and **none of the 466 sizing comparisons reached 12 actual bets in both groups**. Those coverage gaps remain unassessed; passing the synthetic detector tests does not close them.

The separate 3,720-hand everyday check passed all six existing table gates: participation was 28–34% with a six-point spread, 90.3% of mixed-table hands reached a flop, 3.7% were walks and 0.4% included a preflop all-in. Repeated profiles use common physical deals, not additional independent evidence. The 720-hand development run preceded the final holdout. A pooled-audit rerun reproduced the held-out action/return results; it is not counted as fresh evidence.

The daily experiment workflow records the realism report. New pinned five-hour runs also monitor this comparison rather than only the historical heads-up planner. They continue calibrating the narrow river-response learner, saving candidates separately from live weights; they do not implement further features unattended. A resumed run can retain an atomic checkpoint from the unchanged `river-learning-2` protocol, with its previous model's reports kept separately and new full-poker tests labelled baseline-7.

Set `BOT_IMPROVE_REALISM_HANDS=1000` for a 24,000-hand first comparison in the timed runner; subsequent periodic checks use 50 hands per session. The run's overall deadline still bounds an unfinished comparison. This gathers more sizing evidence without treating repeated fixed-seed monitoring as additional independent samples.

Validation includes the full root check (1,011 tests in 57 files after the absolute-deadline regression, typecheck and production build), 71 native tests, native typecheck/lint (zero errors, 19 existing warnings), Metro web export, and four browser tests for ordinary play/rejoin, game completion, optional BOT_001 and Worker redaction. Long replay/reaction tests have explicit 20-second allowances after their five-second defaults expired under concurrent simulation load; their assertions are unchanged and per-decision speed is checked separately. No native UI, poker rule, trainer review or animation changes were made by this update.

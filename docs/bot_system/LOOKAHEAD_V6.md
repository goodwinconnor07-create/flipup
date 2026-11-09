# One-street planning and internal range analysis

Ordinary Hold'em opponents and optional BOT_001 now use `baseline-6`. Everyday preflop ranges, subtle identities, fixed Casual/Challenge levels and private session memories retain their existing behavior. There is no new toggle: ordinary opponents use the update through Play with bots.

## What a decision considers

With one live opponent on the flop or turn, the provider samples hypothetical opponent holdings and runouts, resolves the current action, allows one possible opponent re-raise, and models one further betting street. Checking out of position can face a current-street stab. On the next street, position, hand strength, draws, public initiative and remaining stacks affect betting and calling. Size choices respond to the pot and effective stack. The existing identity preferences, weak-bet limits, deep-overbet limits, uncertainty reserves and score-cost guard still apply afterward.

All candidates share the same sampled deals and response draws. Continuation policies see only that player's own hypothetical cards and the board available at the time. In particular, a river sampled to settle a flop decision cannot affect the simulated turn bets. Exact production pot construction settles stack-capped contributions, folded money and unmatched returns. An all-in ends further betting.

This is a bounded, authored continuation model. It does not search a complete game tree, model future re-raises, plan through both remaining streets from the flop, or calculate certified GTO EVs. The fixed continuation policies approximate future play rather than perfectly predicting the live service's next action. Diagnostics label these limits. Multiway, existing all-in and river decisions retain the one-round estimator and record why lookahead was unavailable.

## Range analysis

The new postflop range model starts from all legal combinations after removing the observer's own cards and public board. It weights holdings by the public preflop line (including raised pots, repeated raises, calls and stack commitments), then by each postflop action on the board visible on that street. A short all-in call is treated as a call. Smoothing keeps bluffs and unusual holdings possible. Multiway draws use the existing sequential conditional sampler; this is not an exact joint posterior.

Internal decision traces include normalized hand-group mass, eight leading starting-hand classes, combination counts and effective combination count (`1 / sum(weight²)`). Effective count measures concentration; it is not a count of hands the opponent definitely has. Top-class probabilities cover only those eight classes and need not add to one. Range-group probabilities cover the complete inferred range.

Range training already supplies useful hand classification, visible-card blockers, authored scenario ranges and lesson EV calculations. The bots reuse its pure hand-group classifier, with tests for shared vocabulary and probability accounting. They do not consume lesson answers, opponent descriptions, authored ranges or private bot profiles to infer an opponent's range. Range training screens, answer reviews, expert ranges, grading and cached lesson numbers are unchanged. No bot-style read is added to the trainer.

Both range likelihoods and continuation policies are untrained heuristics. This work expands decision context and test coverage; it does not certify human realism, enjoyment, retention or superior strength.

## Reproduce the comparisons

```sh
npm run bot:planning -- 30 /tmp/planning-development.json development
npm run bot:planning -- 200 /tmp/planning-holdout.json holdout
npx vitest run src/bot_engine/lookahead.test.ts src/bot_engine/rangeAnalysis.test.ts
npm run bot:ranges -- /tmp/bot-range-analysis.json
```

The [paired holdout report](benchmarks/planning-holdout.json) compares frozen everyday `baseline-5` with `baseline-6` using identical physical deals, identities and learning settings. It covers three unused seeds, 200 hands per run, heads-up Casual/Challenge and unequal six-seat mixed tables: 3,600 completed hands across both versions. The primary bot's coverage, behavior, returns and latency are retained. All ordinary bot seats change together in the mixed-table comparison, so those returns do not isolate one player's strength.

Gates require matching deals, exercised lookahead, internal range reads on postflop decisions, a genuinely frozen historical comparator, legal completed hands with conserved chips, and executor p95 inference below 250ms. Return differences and normal intervals are descriptive, especially with shared session memory and repeated paired deals. Positive results against a scripted opponent do not establish improvement against people. No holdout returns select parameters or automatically promote learned weights.

All gates passed. There were 894 planned decisions among 1,420 primary-bot postflop decisions; every such decision had an internal range read. Maximum session p95 inference was 51.9ms on this executor. Average paired return changes were +47.5 bb/100 in heads-up Casual, +42.3 in heads-up Challenge and -15.7 at the unequal mixed tables. The mixed-table result and seed variation remain reasons to measure further rather than claim a general strength improvement.

The separate [everyday table check](benchmarks/everyday-table-v6-holdout.json) completed 1,920 hands with all six existing gates passing. Participation across internal tendencies was 26.3–31.7% (5.3-point spread); 91.2% of mixed-table hands reached a flop, 2.9% were walks and 0.3% had a preflop all-in. These are checks for bounded table behavior, not human enjoyment measurements.

The daily learning workflow saves a smaller planning comparison alongside its existing training and table reports. Fixed seeds detect regressions; rerunning them does not accumulate fresh independent evidence.

The [internal range examples](benchmarks/bot-range-analysis-v6.json) retain six synthetic production-engine contexts: checked-to and facing-bet states on each postflop street, with full group probabilities, leading starting hands, concentration and model action values. These are shared-provider estimates before personality and risk guards. They are offline diagnostics, separate from the trainer's answer review.

Two offline calibration cycles also completed, with the synthetic holdout gate passing and 480 full-poker comparison hands across four scripted opponent types. The [validation summary](benchmarks/training-v6-validation.json) retains the candidate configuration and matchup results. Production learning weights were not changed by this small calibration run.

## Validation and integration

Targeted regressions cover blocker removal, range concentration, calls versus raises, historical board prefixes, out-of-turn actions, hidden hypothetical rivers, exact unmatched-chip returns, re-raise exposure, continuation bounds, deterministic replay and complete production-rule hands with uneven stacks. Existing identity and redaction checks also exercise the new provider. Root and native suites retain the Range training checks.

The 60-hand conservation stress test has a 20-second allowance; decision latency is measured separately. Personality comparisons reuse independent copies of identical predictions rather than recomputing inference for every identity. A concurrent main update introduced two native effect-state lint errors; hand-keyed Memory recap and derived timed role-flash state resolve them while preserving the display and its timing. No trainer UI or animation changes are included.

Final checks: 993 root tests in 53 files, root typecheck and production build, 57 native tests, native typecheck, native lint with zero errors (23 existing warnings after the main merge), Expo/Metro web export and four browser tests covering normal local play, reload, game completion, optional BOT_001 and online private-state redaction. A subsequent main merge changed only native game art and Ghost presentation; those changes are retained and native checks rerun.

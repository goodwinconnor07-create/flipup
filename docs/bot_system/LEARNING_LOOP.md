# BOT_001 learning and repeated experiments

BOT_001 now keeps per-opponent response beliefs separated by street, bet-size bucket, facing a bet versus a raise, and heads-up versus multiway play. It uses public faced-bet opportunities only. Checks, blind posts and out-of-turn folds do not count as voluntary fold responses. Stack-capped calls and public pot accounting determine size buckets. The live reducer and simulator share the same observation processor.

## What changes during play

Old version-1 memory snapshots remain readable. New contextual posteriors are an additive JSON extension; pooled historical counts remain available for the old-policy comparison. Each context starts with Beta(2,2) and exponentially discounts matching observations. The default decay is 0.96, with about 25 effective observations at saturation. A minimum of eight effective matched observations is required; this means opportunities, not eight hands.

The first contextual exploit is deliberately narrow: a weak river hand, one non-all-in opponent, a matched bet-size/raise context, and an investment no larger than 1.25 pots or the opponent can cover. A conservative normal approximation to the fold posterior must exceed the bluff's break-even fold frequency by a margin. The calculation assumes the bluff loses whenever called. Personality, sample confidence and a maximum blend limit control how far the final action mix moves. Supported calling-station reads damp bluff preference; unsupported contexts leave the strategy/identity baseline intact.

The old controller's blanket pooled log-weight adjustment is retained as `learningMode: 'pooled'`; `'off'` enables ablations. The live default is `'contextual'`. Only the existing opt-in BOT_001 seat uses this system. The shared preflop/rollout/coarse blueprint remains `baseline-3`; the learning configuration is separately versioned `contextual-1`.

The estimated-value guard uses conservative evidence-adjusted values for supported bluffs. It is not a Nash or true-regret guarantee: posterior calibration, unmodelled context and range estimation can still be wrong. Beliefs need enough recent evidence to reverse as an opponent changes.

## Private replay data

The live table retains the last eight actual decision traces, including sanitized information, input beliefs, baseline/final distributions, evidence and numeric transformations. This bounded history is persisted with the table and stripped from every online client and legacy bot view. It contains the bot's own cards and no opponent's hidden cards or real deck. The SQL development repository also persists contextual observations, atomically and without copying private extras. Replay requires the recorded policy/configuration version.

This is table-session memory, retained across reconnects and reloads. Global cross-table lifetime memory and stable cross-table opponent identity mapping remain unfinished.

## Executable training loop

```sh
npm run bot:train -- 2 /tmp/flipup-training
# Resume the same checkpoint for one more cycle:
npm run bot:train -- 1 /tmp/flipup-training
# Run a larger independent full-game comparison:
BOT_TRAIN_PAIRS=500 npm run bot:train -- 1 /tmp/flipup-training
```

The runner evaluates 12 combinations of decay, minimum sample count and maximum exploitation blend. Four session seeds train candidates; six disjoint seeds validate the best eligible candidate. A final 12-seed test partition is used after all requested cycles. Namespaced cycle-specific seeds keep these partitions separate, and full-poker test decks use a fourth namespace. Checkpoints are written atomically after each cycle and incompatible protocols fail explicitly.

The controlled benchmark is a known-payoff river bluff subgame, with overfolders, calling stations, a break-even reference, a strategy that changes twice, and contradictory preflop/river tendencies. Public probes supply observations independently of policy choices. Reward is exact expected chips per opportunity in that subgame. It does not measure full Hold'em strength. Sessions/seeds, not individual correlated probes, are the uncertainty unit.

The initial exploratory objective preferred excessive anchoring. Protocol `river-learning-2` adds a predeclared correction gate: added exploitation must stop within 32 matching public opportunities after a switch to calling. This protocol uses fresh seed partitions. An inconclusive interval, context regression or failed reversal blocks candidate acceptance. A known-payoff synthetic gain alone never authorizes automatic production parameter promotion.

Every invocation also runs paired, production-engine hands against river-overfolders, calling stations, changing opponents and a simple competent reference. Both candidate and incumbent share baseline/identity versions and duplicate physical seat deals. The default is 100 deal pairs per opponent; the daily job uses 250. `BOT_TRAIN_PAIRS` accepts 1–1000. Results are descriptive, and larger replicated studies remain necessary.

## Ongoing automation

`.github/workflows/bot-training.yml` runs on relevant pushes to main, manual dispatch, and daily at **12:00 noon Australia/Brisbane** (02:00 UTC). Each job has a 15-minute limit, runs the bot tests, resumes a compatible cached checkpoint, performs two cycles and uploads reports for 30 days. The workflow has read-only repository permissions and does not rewrite the live configuration. Find results under GitHub Actions → BOT_001 learning experiments → artifacts.

Local cycles and checkpoint resumption are executed and validated. The saved workflow configures future remote runs; publication of the workflow is not evidence that GitHub has completed a scheduled run. This is parameter calibration plus Bayesian online learning, not neural-network training or an automatically improving general poker solver.

## Executed results — 9 November 2026

Six cycles executed, including closing and resuming the checkpoint across invocations. Each cycle tested 12 configurations. The conservative defaults remained the selected candidate; no new coefficients were copied into the live configuration. Final synthetic test gain over pooled learning was **2.011 expected chips per public opportunity**, with descriptive session interval [2.003, 2.019]. This unit belongs only to the known-payoff river subgame.

| Controlled scenario | Mean expected chip gain per opportunity |
| ------------------- | --------------------------------------: |
| overfolder          |                                   6.045 |
| station             |                                   0.056 |
| balanced            |                                   0.000 |
| switching           |                                   3.787 |
| conflicting-context |                                   0.169 |

The 12 fresh test sessions stopped the added exploit after 7–16 matching public responses when the opponent changed to calling, and recovered when overfolding returned. The tiny-sample and wrong-context tests also pass.

| Full-game opponent | Hands, both policies/seat swaps | Candidate delta bb/100 | Descriptive paired 95% interval |
| ------------------ | ------------------------------: | ---------------------: | ------------------------------- |
| river-overfolder   |                            2000 |                  -0.26 | [-3.69, 3.17]                   |
| calling-station    |                            2000 |                  -6.93 | [-36.18, 22.32]                 |
| changing           |                            2000 |                  -0.11 | [-0.68, 0.46]                   |
| competent          |                            2000 |                   0.58 | [-0.68, 1.84]                   |

The final extended comparison completed **8,000 real-engine hands**, with no illegal actions, unfinished hands or chip-conservation failures. All full-game intervals include zero. These measurements do **not** demonstrate a general win-rate gain; training retains the incumbent numeric settings and reports candidates instead of automatically promoting them.

Verification: **922 root tests**, **49 native tests**, **two browser tests**, typechecks, native lint and production build passed. Existing lint and chunk-size warnings remain. Tests cover public opportunity reconstruction, size/raise/street isolation, conservative updates, correction speed, contextual persistence and deduplication, hidden-field filtering and bounded private replay traces.

Raw results: [final protocol-2 report](benchmarks/learning-protocol2.json) and [cycle summaries](benchmarks/learning-cycles.json). Exploratory protocol-1 results are not mixed into these final held-out measurements.

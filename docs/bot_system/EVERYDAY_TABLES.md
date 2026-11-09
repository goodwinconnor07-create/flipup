# Everyday bot tables

Standard Hold'em now uses the shared poker service for ordinary opponents automatically. Players tap Play with bots, keep the automatic lineup and start. The existing names and faces remain; no personality selection is required. Original experimental BOT_001 and its three pronounced profiles remain available separately.

The subsequent [baseline-6 update](LOOKAHEAD_V6.md) adds one-street heads-up planning and internal public-action range analysis. The measured results below describe the original baseline-5 release; current paired results are recorded separately in that update.

The current [baseline-7 update](MULTIPLAYER_V7.md) extends planning to multiplayer pots and all remaining streets, adds reconstructible hand plans, and checks whole-hand repetition and sizing tells. Its measurements are recorded separately from these historical release results.

## Table and individual behavior

Automatic selection prefers the least represented of four internal tendencies: balanced, slightly patient, slightly curious and slightly inclined to pressure. The preference is derived from a stable name hash; micro-traits and thinking tempo also come from that name. Four automatically picked ordinary bots cover all four tendencies, and eight cover each twice when available. Manually chosen opponents retain their own identities rather than being reassigned to fill a quota. Native setup and engine-created lineups use the same pool selection function.

All ordinary players share the same baseline. Individual traits stay in a narrow band around its center, with small context-specific preferences for calls, raises, river caution and bet sizing. The experimental Patient/Curious/Aggressive extremes are not used in default lineups. Each bot has independent, private table-session memory, learns only from public response opportunities and retains that memory through hands, reloads and rebuys. Adaptation remains the existing conservative, context-specific river adjustment; this is not general opponent-model training or lifetime memory across tables.

Everyday preflop decisions use combination-weighted starting-hand percentiles, position, price, effective stacks and prior raises/callers. Supported exact chart frequencies provide a partial anchor. Routine preflop decisions do not spend time on rollouts that this reference would replace; no preflop rollout EV is claimed. Postflop uses the existing sampled ranges/response model with explicit reserves for model uncertainty and large commitments. Deep bets into tiny pots are limited, and weak-hand bets remain mixed. These are authored poker heuristics, not calibrated human behavior or certified GTO solutions.

Casual is the default. The optional **House rules → Bot level → Challenge** choice uses more postflop samples, less mixing among near-best model actions, a smaller permitted score-cost deviation and slightly tighter preflop entry. The whole table's level freezes for the active hand; edits apply next hand and retain observer memories. Neither level nor personality changes in response to a player's wins, losses or session duration. No deck manipulation, gifted outcomes, external inference API or adaptive difficulty is added.

## Pace and privacy

Routine initial waits are 350–550ms, followed by a bounded decision-difficulty delay. Individual tempo varies slightly and the timing draw is independent of the selected move and hole strength. Thinking chatter never holds up a routine decision. Ordinary unsolicited speech is less frequent and spaced by a table-wide cooldown; owed reactions still answer the moment they refer to. Greetings do not postpone the first countdown. Local ordinary hands pause at most 2.5 seconds after a fold win and 5 seconds after showdown before existing readiness/rebuy logic, without extra talk delays. Players can still use Next hand immediately. Final-game and rebuy windows retain their rules.

Private state is one bounded table record: stable profiles, per-bot memories and at most four decision traces. Online redaction strips the entire record, and legacy bot/variant views cannot read it. The policy receives only the existing whitelisted information set. Special variants, campaigns, parties, training cards/challenges, twins, legends and Bankroll retain their specialized engines. The legacy style laboratory explicitly selects its old engine so archived style/craft comparisons do not silently measure the new default.

## Measured table checks

Run the reproducible benchmark with:

```sh
npm run bot:everyday -- 200 /tmp/flipup-everyday.json holdout
```

The [holdout report](benchmarks/everyday-table-holdout.json) records 3,720 completed hands using unused seeds 412303, 423319 and 434323: 2,400 six-player focus-comparison hands, 1,200 heads-up level/opponent hands and 120 continuous-stack hands with unequal depths. Four seats at the mixed tables use the new engine, with competent and loose-passive scripted references in the other seats. Profile comparisons share physical deals; the table engine checks legal actions and chip conservation throughout. These are not independent hands across focus comparisons.

| Internal tendency             | Voluntary preflop participation | Preflop raises |
| ----------------------------- | ------------------------------: | -------------: |
| Balanced                      |                           30.5% |          21.8% |
| Slightly patient              |                           28.0% |          19.3% |
| Slightly curious              |                           34.0% |          21.3% |
| Slightly inclined to pressure |                           31.2% |          23.3% |

Participation spread is 6 percentage points, compared with the 45-point spread of the experimental profiles in their earlier, different benchmark. This is a descriptive comparison, not a controlled strength comparison. In the mixed-table run, 90.3% of hands reached a flop, 3.7% were blind walkovers, 72.5% had a preflop raise and 0.4% had a preflop all-in. All six declared table gates passed: participation 16–45%, spread at most 12 points, flops at least 35%, walks at most 30%, preflop all-ins at most 20%, and raised pots 35–98%.

These thresholds are product hypotheses. They establish exercised variety and bounded extremes, not enjoyment, retention, human realism, superior skill or ideal difficulty. Table flops are particularly frequent against this loose-passive scripted opponent. Individual mean returns in the mixed sessions were negative and variable; all session returns, level checks and sample counts are retained in the report rather than used to tune the held-out seeds. Difficulty labels describe the implementation; a stronger win rate for Challenge is not established by these small comparisons.

The smaller development run completed 1,020 hands on separate seeds before the holdout. Unit tests check a narrow policy-distance band on common contexts, stable identities, balanced automatic rosters, independent/deduplicated memories, next-hand level changes, hidden-card isolation and bounded score deviations where estimated values exist. Browser tests cover ordinary local play, persistence/rejoin, end-of-game handling and the online coexistence of ordinary bots and BOT_001 without exposing either memory store. Native controls reuse existing components and require an app update; no EAS submission is made.

The daily experiment workflow also records a smaller everyday table report and fails if these declared gates regress. Fixed-seed reruns detect regressions; they do not accumulate fresh evidence or automatically replace policies. Measuring actual enjoyment or whether players want another hand will require optional feedback or usage evidence; this change does not collect player telemetry or claim a retention improvement.

Final verification: 977 root tests across 50 files, root typecheck and production build, 57 native tests after merging the concurrent main launch-cover update, native typecheck/lint (21 pre-existing warnings, zero errors), Expo/Metro web export and four browser tests. The browser suite verifies default Casual play through the real ordinary engine, reload/rejoin, a completed no-rebuy game, the optional BOT_001 profile and online redaction of both private memory stores. Maximum six-player session p95 inference time was 50.5ms on this cloud executor. Updated older test fixtures select a real faced-bet Rewind decision, construct a folded hand directly for reveal-permission assertions and operate the current accessible Call/Raise controls; their tested rules and outcomes remain intact.

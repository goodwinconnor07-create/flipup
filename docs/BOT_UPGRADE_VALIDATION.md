# Offline bot expansion: validation

The backend update was checked against the pre-change engine at
`8f10e2f06ad2b51f4f00293c1e798a92f06755a8`. No UI source, styles, dependency manifests
or lockfiles were changed. No service was deployed.

## Checks

- `XDG_CONFIG_HOME=/workspace/.config WRANGLER_SEND_METRICS=false npm run check`:
  typecheck, **128 tests in 13 files**, and both production bundles passed.
- 19 new tests cover roster/profile validity, wire-format compatibility, speech restrictions,
  bounded/reloadable dialogue memory, contextual replies, stale-reply cancellation, quiet lessons,
  hidden-card independence, exhaustive river inference, side-pot pricing, all-in fold equity,
  preflop all-in calls, recent learning and emotional continuity.
- An actual local Worker/Durable Object table with three bots was opened over WebSocket. A new
  offline greeting arrived, private profiles/reads/dialogue/minds were absent from packets, and
  an attempted forged `b:local:` quick message was rejected.
- The roster contains 600 new names and 40 compatible original identities, with 64 players per
  poker foundation. Dialogue covers 46 intents, 358 shared authored clauses, voice-specific
  clauses and cadence. Decoder enumeration found 15,685 distinct rendered phrases across all
  voices/framing combinations. Many IDs deliberately resolve to the same plain sentence;
  these are not 15,685 individually written lines or a learned language model.

## Reproducible simulation

`npm exec --package=tsx -- tsx scripts/verifyBotUpgrade.ts [baseline-game-directory]`

The first run used seeds 731041, 731209 and 731503, 100 hands per session, heads-up
against bluffer/value-bettor/timid/station scripts and six-/nine-handed mixed tables.
It also tested new identities in nine-handed tables at 100bb, 20bb and 10bb.

| Engine | Hands | Illegal moves | Chip leaks | Stalled sessions |
| --- | ---: | ---: | ---: | ---: |
| Pre-change | 1,800 | 0 | 0 | 0 |
| Updated, including new identities | 2,100 | 0 | 0 | 0 |

An additional frequent-bluffer check used `BOT_ONLY=bluffer BOT_HANDS=500
BOT_SEEDS=811023,811037,811081,811123,811201`, with a separate `BOT_REPORT` path:
2,500 hands per engine, again with zero illegal moves, chip leaks or stalls.
The measured pro-style result against that script changed from -18.5 to -8.1 bb/100.
This is exploratory evidence, not a statistically established strength gain; both estimates
are negative, and this scripted opponent remains a useful target for further tuning.

Total: **8,900 simulated hands**, of which 4,600 used the updated engine.
In the initial mixed run, measured decision calls averaged 1.76ms (previously 1.60ms);
99.1% finished under 5ms and the slowest was 22.8ms. In the longer heads-up run,
updated decisions averaged 1.95ms versus 1.89ms previously. These are local lab measurements,
not production latency guarantees or the deliberately longer human-like action delays.

The raw reports for this session are `/tmp/flipup-bot-upgrade.json` and
`/tmp/flipup-bot-bluffer.json`. Reproduction saves fresh reports outside the checkout.
Learning remains local to each table. Human playtesting is still needed to judge conversational
realism, favourite characters and how enjoyable the games feel.

# BOT_001 preflop coverage update

`baseline-4` connects the existing charts to live decisions beyond unopened pots. No chart frequencies were retrained. The existing **Invite BOT_001** setting selects this provider automatically; there is no additional switch.

## Supported situations

The 15 shipped banks cover 2–6 players at equal starting stacks of exactly 20, 40 and 100 big blinds, with a half-big-blind small blind. There are 350 exported situations: 45 unopened positions plus responses to opens, 3-bets, 4-bets and small-blind limps. A lookup checks the full public action prefix, acting positions, observed sizes and contributions. It records the bank/spot or a specific fallback reason in the existing private decision trace.

Sizing follows `gto/flipup_gto/preflop.py` and `gto/engine/src/preflop.cpp`: position-dependent opens, in/out-of-position 3-bet and 4-bet multipliers, and the 45%-of-stack threshold that converts a default raise to a shove. Targets are rounded to whole chips. For example, at 100bb, a heads-up 2.5bb open receives a default 10bb 3-bet and 22bb 4-bet. A six-player early-position open uses 2.3bb. The service validates these extra candidates against the same engine bounds as every other action.

The exported rows combined normal-raise and all-in frequencies. This adapter puts their combined mass on one default legal size; it cannot reconstruct the original sizing mixture, EVs or solver convergence. Unsupported sizes are not silently mapped to the nearest row. Cold callers, squeezes, early-position limps, unequal starting stacks, unshipped depths, other blind ratios and 7–9 players use the existing rollout strategy. After the first cash hand, unequal stacks commonly limit chart use. Postflop estimation and contextual learning remain the same as baseline-3.

## Measured comparison

Run on 9 November 2026:

```sh
npm run bot:preflop -- 500 /tmp/flipup-preflop-v4.json
```

The [raw report](benchmarks/preflop-v4.json) contains 9,200 completed production-engine hands: 8,000 candidate/incumbent games against four reference opponents, 1,000 direct games against baseline-3, and 200 six-player completion checks. Heads-up comparisons use common deals, swap physical seats, retain matching personalities and contextual learning, and reset stacks to 100bb each hand. Chip conservation and legal actions are checked during simulation. The incumbent is explicitly baseline-3; the older baseline-2/pooled comparator remains available as `previous`.

| Reference opponent      | Old chart coverage | New chart coverage | Change in bb/100 | Descriptive 95% interval |
| ----------------------- | -----------------: | -----------------: | ---------------: | ------------------------ |
| Competent script        |              70.3% |              94.5% |           +90.48 | −7.31 to +188.27         |
| Loose-aggressive script |              34.1% |              64.9% |           +39.08 | −149.53 to +227.69       |
| Calling-station script  |              50.0% |             100.0% |          +187.18 | +42.67 to +331.69        |
| Tight-passive script    |              96.0% |             100.0% |           +40.40 | −7.93 to +88.73          |

Coverage counts preflop decisions, rather than hands. The direct match returned +125.93bb/100 with an interval of −150.94 to +402.80. These are encouraging sample results, not proof of general strength: one seed per comparison, uncalibrated opponents, adaptive beliefs, wide intervals and only fresh equal-stack cash hands. Repeated runs with the same seeds are regression checks, not new independent evidence.

The six-player mixed tables completed without illegal actions or chip loss, but chart coverage was only 18.5% and 25.6% in the two seat layouts, primarily because of cold callers and unsupported betting lines. They are completion checks, not evidence of multiplayer strength. Candidate p95 decision time was at most 54.1ms across the heads-up reference legs and 63.7ms in these six-player checks, measured on this cloud executor.

## Regression checks and ongoing work

The automated chart audit reaches every exported spot through production game rules and checks all 59,150 spot/hand-class entries. Additional fixtures check fixed expected sizes, actor order, shallow-stack shoves, whole-chip scaling, seat gaps/rotation, unsupported histories, unequal stacks and unchanged representative postflop policies. The previous provider keeps its original candidate space for comparisons.

Validation passed after merging the concurrent main update: 960 root tests across 47 files, root typecheck/build, 49 native tests, native typecheck/lint (21 existing warnings), Expo/Metro web export, and both browser tests for local play and online private-state redaction.

The daily learning workflow now also runs the preflop regression comparison at 250 pairs per opponent and stores it with its existing training artifacts. It does not automatically replace strategies or learned parameters. Use another seed and larger replicated samples before making a strength claim. The most useful next extensions are unequal-stack coverage and multiplayer cold-call/squeeze lines; they require suitable strategy data or an explicitly evaluated approximation.

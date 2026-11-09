# Evaluation and implementation progress

Updated 9 November 2026 on this cloud instance, Node 24.22.1. Backend-only development system. **BOT_001 is not production ready.**

## Verified work in this iteration

The original 13 tests and both original 100-hand simulations were rerun before further changes. They passed and reproduced the earlier returns. Heads-up p95 was 8.37 ms, six-player p95 21.32 ms; no illegal actions or chip losses occurred.

The new focused suite has 33 tests across five files. It adds known-value side-pot/short-all-in/uncalled-raise examples, paired-deck reproducibility, actual SQLite reopen and fresh-process persistence, transactional rollback under injected failure, conflicting retries, private-field filtering, numeric overflow, estimated-loss bounds and synthetic generation calibration. Typechecking passes. `npm run check` passed: 38 test files passed, one skipped; 10,056 tests passed, one skipped; TypeScript and production build passed. The full test suite took 188.54 seconds. The build retains its existing large-client-chunk warning.

## Strategy correction

`baseline-1` used an aggregate-pot one-caller formula that could overvalue inaccessible side pots and invent calls beyond opponent stacks. `baseline-2` samples hypothetical ranges, reuses production `buildPots`, caps every contribution, includes folded dead money, returns uncalled investment and evaluates only eligible pot shares. Candidates share the same hypothetical deals/response draws to reduce comparison noise. Current public board and hypothetical holdings inform an explicitly untrained continuation model. Already-all-in opponents cannot fold.

These are one-betting-round rollout estimates, not equilibrium EVs or complete future-street search. Opponent ranges/responses, pending-call responses, re-raises, position, multiway equity realization and fractional tie expectations remain approximations. Sample errors describe Monte Carlo variation, not model bias.

## Persistent identities, memory and decisions

The transactional SQLite schema stores immutable identity parameters, session posteriors, ordered public events and private decision snapshots. Database reopen and fresh Node processes preserve identity seed, memory and cached action. Repeating an event does not double-count it; conflicting repeats and out-of-order delivery fail. An injected journaling failure rolls back the posterior update. Runtime projection strips unexpected private fields before persistence or provider inference.

The same repository has a Cloudflare Durable Object SQL/transactionSync adapter. It has not been activated in the live TableRoom loop, remotely deployed, or validated under production concurrency. Global identity coordination across separate table objects, lifetime/contextual beliefs, retention and derivation of trusted opportunity events remain unfinished. The current statistic pools streets and bet sizes.

## Paired-deal population evaluation

`npm run bot:evaluate -- 200` executes 200 deal pairs per opponent: the same physical seat deals/button are played twice with identities exchanging seats. Each hand resets stacks to 100bb; each leg retains its own observer memory. Start-of-hand dealing is seeded independently of prior actions and table effects, and digest equality is checked internally. No private deals enter agent inputs, ordinary traces or published reports.

Ten matchups produce 4,000 complete heads-up hands against eight scripted opponents, a baseline-only agent and another independent generated identity. Reports use pair-average returns, not 400 supposedly independent observations. Adaptive memory creates serial dependence; the normal confidence intervals are descriptive and not formal strength guarantees. The scripts are intentionally simple and uncalibrated. One seed is not a replicated study, and favorable matchup results do not establish superiority. Final measured results are stored alongside this report.

## Generated behaviour

The raw seeded factory remains available. The new calibration loop evaluates actual conditional policy distributions over 32 legal engine-generated states spanning four streets, including controlled synthetic overfold beliefs. Near-duplicate rejection uses mean total variation over full action distributions, including sizes; simulated action frequencies use 200 samples per context. The policy distance is not distorted by sampling noise.

The original weak identity transform accepted only seven profiles after 2,000 attempts at the 0.005 separation threshold. `identity-2` accepted 20 in 37 attempts. Its stronger aggression/calling/river preferences are bounded in log-weight space and blended back toward baseline if their estimated expected chip cost exceeds max(0.1bb, 2% of the currently eligible pot). That is an approximate-value budget, not a true regret bound. Chart-only decisions lack EVs and report null estimated value loss. This battery demonstrates modest conditional variation; long-session diversity, skill and human realism remain unproven.

## Current acceptance accounting

Verified: complete legal Hold'em hands; hidden-card/future-deck invariance; mixed actions; stable seeded profiles; shipped frequency decoding with explicit coverage/fallback labels; independent observer beliefs; small-sample shrinkage; controlled overfold/reversal adjustment; 2–9-seat harness; paired heads-up evaluation; stored decision snapshots; database migrations/rollback/restarts; synthetic 20-profile policy separation; measured decision latency.

Partial: statistical confidence is not calibrated against a changing real population; four profile traits do not implement all requested skill/bias families; side-pot settlement is correct within an approximate one-round response model; stored original decisions survive upgrades, but recomputing an older policy requires that policy implementation; no calibrated population skill distribution is claimed.

Outstanding: live actor authorization/event/storage wiring; global cross-table identities and contextual lifetime memory; complete feature/profile/session schemas; certified solved postflop adapter; position/line/future-street policy improvements; richer range/response calibration; multi-seed paired confidence analysis and production workload testing; temporary-state model; legally verified human data and full-paper review; human blind study; monitoring/retention and production rollout. The Python/C++ solver and native test suites were not run. No Pluribus-strength, equilibrium, human-indistinguishability or commercial-readiness claim.

## Next work

1. Wire trusted accepted-move events and persisted sessions into a separately tested opt-in backend path, preserving actor authorization and redaction.
2. Replace pooled reads with street/size/line opportunity models, and validate adaptation benefits with controlled ablations rather than raw matchup profit alone.
3. Certify postflop data coverage/range assumptions, then improve position, future streets and multiway response modelling with replicated paired experiments.
4. Expand profile families and diversity tests across full sessions before human-data calibration or production rollout.

## Final measured results

Final uncached development-instance run: `baseline-2`, `identity-2`, 160 rollout samples per fallback decision. Raw artifacts: [paired evaluation](benchmarks/evaluation-v2.json), [calibration](benchmarks/calibration-v2.json), [six-player run](benchmarks/six-player-v2.json).

| Opponent         | Hands | BOT_001 bb/100 | Descriptive pair-based 95% interval | Higher leg p95 decision time |
| ---------------- | ----: | -------------: | ----------------------------------- | ---------------------------: |
| random           |   400 |         1166.5 | [711.5, 1621.6]                     |                     11.90 ms |
| tight-passive    |   400 |          -24.6 | [-101.7, 52.6]                      |                     11.41 ms |
| loose-passive    |   400 |          469.4 | [169.1, 769.6]                      |                     12.23 ms |
| loose-aggressive |   400 |          244.1 | [-215.7, 703.9]                     |                     11.86 ms |
| competent        |   400 |         -146.5 | [-440.9, 147.8]                     |                     11.91 ms |
| river-overfolder |   400 |          247.8 | [22.0, 473.6]                       |                     12.30 ms |
| calling-station  |   400 |         1808.4 | [1447.4, 2169.4]                    |                     12.45 ms |
| changing         |   400 |          231.2 | [8.1, 454.3]                        |                     11.97 ms |
| baseline         |   400 |         -197.3 | [-576.7, 182.1]                     |                     10.36 ms |
| bot              |   400 |         -191.0 | [-568.3, 186.2]                     |                     11.07 ms |

The intervals cross zero against several references, including the baseline-only agent and another independent identity. These data do not show a reliable advantage over those agents. Positive returns against weak scripted opponents are limited to this seed and protocol; they do not establish general poker strength.

The six-player correctness run completed 100 hands and 874 decisions without illegal actions or chip-conservation failures. Decision latency was 10.53 ms p50, 26.94 ms p95, 43.94 ms maximum. BOT_001 returned -824.0 bb/100 with descriptive interval [-2174.8, 526.8]; this small self-play sample is a diagnostic, not a strength claim.

Calibration status: **accepted**, 20 profiles in 37 attempts, 32 contexts, minimum required mean total variation 0.005. Smallest observed accepted nearest-policy distance: 0.005059. Profiles and sampled action frequencies are in the raw artifact.

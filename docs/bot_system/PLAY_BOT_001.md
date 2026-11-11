# Play BOT_001

Ordinary standard Hold'em bots now use the shared engine automatically with subtler tendencies and an optional Casual/Challenge level. No opt-in is required for that experience; see [everyday bot tables](EVERYDAY_TABLES.md). BOT_001 remains an extra experimental seat with its separate pronounced personality presets.

In standard Texas Hold’em setup or the host’s table settings, turn on **Invite BOT_001**. It is off by default. BOT_001 uses one extra bot seat; choose zero other bots for heads-up play. A full table must free a seat before inviting it. Only the host can change the table setting. New seats join the next deal; turning the setting off lets the current hand finish before the seat leaves. Switching to another variant clears the opt-in.

The same control is present in the web app and native iPhone settings. The web app ships through the normal main-branch deployment. Native code changes require a new app build/update; no EAS build or TestFlight submission was triggered.

## Actual live integration

The shared reducer seats a separately tagged BOT_001 and invokes the new decision service from real bot ticks. It constructs a strict information set before inference. Its private seed/profile is generated for each new table and retained for that session; public response observations feed its own independent memory. The [live table experience](LIVE_HUMAN_TABLE.md) adds precomputed decision intentions, restrained session dynamics and origin-blind reads of every opponent. That private contextual memory, the last eight sanitized private decision traces and source/version diagnostics are saved in the existing Game snapshot, so local reloads and online Durable Object reloads retain it. The ordinary redaction path strips the memory and engine tag from every online client; legacy bot views also omit the new bot’s observer memory. No decision probabilities, private traces or hidden opponent cards are broadcast.

This live path uses existing atomic table snapshots, not the separate SQLite demonstration repository. New tables deliberately start with fresh bot identities and empty observer memories; bots have no cross-table recognition or global identity coordination. With rebuys enabled, the bot’s seat can rebuy without discarding its memory; with rebuys off it cannot re-enter after busting. There is no remote solve or paid inference API in a live turn.

## Strategy changes

The current provider is `baseline-7` (see [multiplayer planning](MULTIPLAYER_V7.md)). The earlier `baseline-5` update introduced this preflop behavior: unsupported preflop chart states now use a model of actual stack depths, cold callers, repeated aggression, commitments and squeeze sizes. It does not pretend unequal stacks are an equal-stack chart. House rules also offers Original, Patient, Curious and Aggressive personalities when Invite BOT_001 is on. The choice applies next hand and retains opponent memory. See [personalities, unequal stacks and measured behavior](PERSONALITIES_V5.md).

`baseline-4` connected all 350 exported preflop situations: unopened pots, responses to opens, the opener facing a 3-bet, the 3-bettor facing a 4-bet, and the big blind after a small-blind limp. These exact bank lookups remain available in baseline-5. They check public actor order, observed sizes and starting stacks. The banks cover 2–6 players with equal starting stacks of exactly 20, 40 or 100 big blinds. Their missing lines and other stack configurations are explicitly labelled modelled decisions in baseline-5; their rollout fallback is retained unchanged in the frozen baseline-4 comparator.

Chart raises use the solver's default position-dependent sizes, rounded to whole chips, including its stack-based shove threshold. The export combined normal raises and jams into a single frequency: this adapter cannot recover the original sizing mixture or EVs. It is a labelled abstraction over existing frequencies, not new solver training. See the [historical preflop coverage comparison](PREFLOP_V4.md). Named personalities additionally apply their documented behavior priors and uncertainty reserve; Original retains the existing postflop policy.

`baseline-3` evaluates observed postflop actions using the board visible on that street. Future turn/river cards do not affect earlier-street action likelihoods, apart from legitimate current card removal. The existing 687-row coarse solver-derived policy is blended conservatively in eligible heads-up turn/river states, with estimated-value guards. The shipped table has no flop rows. Missing keys, multiway pots, all-in opponents and unsupported stack depths remain explicit rollout fallbacks. This table is a coarse abstraction, not an exact solve of a live hand.

The previous provider is retained as `new BaselineProvider(160, 'baseline-2')` for comparison. Three seeded duplicated-deal comparisons against it completed 600 hands. Every individual descriptive interval includes zero; the measurements do not establish stronger win rate. See benchmarks/strategy-v3-comparison.json. The changes improve the model’s use of available evidence and strategy data; strength still needs larger replicated evaluation.

## Validation

The original live rollout passed 913 tests across 45 files, typechecking and production build. Native typecheck and lint passed (existing warnings remain); Expo/Metro web export succeeded with the shared bot-engine folder. Browser tests exercise the visible toggle, heads-up local play through the new provider, and online Worker turns with private-memory redaction. Integration tests cover host authorization, defaults, full tables, completed hands, persisted-state reload and legacy-view isolation. Current preflop checks are recorded in PREFLOP_V4.md.

The main update also fixes a pre-existing native lint failure by moving the party-creation failure-state reset into the asynchronous creation callback. No poker rules or hand outcomes were changed.

## Contextual learning update

The current opt-in bot uses context-specific fold reads and guarded river adjustments, including counter-adaptation when calling increases. Daily parameter experiments and larger paired comparisons are configured in GitHub Actions. See [learning tests, measured results and limits](LEARNING_LOOP.md).

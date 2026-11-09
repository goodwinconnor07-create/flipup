# Play BOT_001

In standard Texas Hold’em setup or the host’s table settings, turn on **Invite BOT_001**. It is off by default. BOT_001 uses one extra bot seat; choose zero other bots for heads-up play. A full table must free a seat before inviting it. Only the host can change the table setting. New seats join the next deal; turning the setting off lets the current hand finish before the seat leaves. Switching to another variant clears the opt-in.

The same control is present in the web app and native iPhone settings. The web app ships through the normal main-branch deployment. Native code changes require a new app build/update; no EAS build or TestFlight submission was triggered.

## Actual live integration

The shared reducer seats a separately tagged BOT_001 and invokes the new decision service from real bot ticks. It constructs a strict information set before inference. Its fixed seed/profile parameters are retained independently of the transient seat ID; public response observations feed its own memory. That private memory and minimal source/version diagnostics are saved in the existing Game snapshot, so local reloads and online Durable Object reloads retain it. The ordinary redaction path strips the memory and engine tag from every online client; legacy bot views also omit the new bot’s observer memory. No decision probabilities, private traces or hidden opponent cards are broadcast.

This live path uses existing atomic table snapshots, not the separate SQLite demonstration repository. Cross-table lifetime learning and global identity coordination remain future work. With rebuys enabled, the bot’s seat can rebuy without discarding its memory; with rebuys off it cannot re-enter after busting. There is no remote solve or paid inference API in a live turn.

## Strategy changes

`baseline-3` evaluates observed postflop actions using the board visible on that street. Future turn/river cards do not affect earlier-street action likelihoods, apart from legitimate current card removal. The existing 687-row coarse solver-derived policy is blended conservatively in eligible heads-up turn/river states, with estimated-value guards. The shipped table has no flop rows. Missing keys, multiway pots, all-in opponents and unsupported stack depths remain explicit rollout fallbacks. This table is a coarse abstraction, not an exact solve of a live hand.

The previous provider is retained as `new BaselineProvider(160, 'baseline-2')` for comparison. Three seeded duplicated-deal comparisons against it completed 600 hands. Every individual descriptive interval includes zero; the measurements do not establish stronger win rate. See benchmarks/strategy-v3-comparison.json. The changes improve the model’s use of available evidence and strategy data; strength still needs larger replicated evaluation.

## Validation

The current-main root check passed 913 tests across 45 files, typechecking and production build. Native typecheck and lint pass (existing warnings remain); Expo/Metro web export succeeds with the shared bot-engine folder. Browser tests exercise the visible toggle, heads-up local play through the new provider, and online Worker turns with private-memory redaction. Integration tests cover host authorization, defaults, full tables, completed hands, persisted-state reload and legacy-view isolation.

The main update also fixes a pre-existing native lint failure by moving the party-creation failure-state reset into the asynchronous creation callback. No poker rules or hand outcomes were changed.

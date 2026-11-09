# Human Poker: executable foundation

Status: working development slice, **not production ready**. Backend-only. The optional Invite BOT_001 setting selects it for one standard Hold’em seat; it is off by default. See [how to play it](PLAY_BOT_001.md).

From the repository root, use Node 22.13+ (validated here on Node 24; SQLite tooling uses the built-in Node SQLite API):

```sh
npm ci --cache /tmp/flipup-npm-cache --no-audit --no-fund
npm run typecheck
npx vitest run src/bot_engine
npm run bot:demo -- 100 /tmp/bot-001-memory.json
npm run bot:generate -- 20
npm run bot:calibrate -- 20
npm run bot:evaluate -- 200
npm run bot:persistence -- /tmp/bot-persistence.sqlite
npm run bot:persistence -- /tmp/bot-persistence.sqlite
npm run check
```

No secret, remote solver, neural model or paid API is needed. The simulation uses the existing real Hold'em engine, separate deal/analysis/action randomness, and independent identities and memories for 2–9 seats. Each hand resets stacks to 100bb; memory remains across hands. It rejects illegal actions and chip accounting failures rather than hiding them with a passive fallback. It reports actual hand/decision counts, a descriptive win-rate interval and latency. This is a correctness harness, not a strength contest.

## Interfaces

`informationFor(game, heroId)` is the only trusted-state adapter. It explicitly copies own cards, public board, public actions, public stacks and engine-derived legal bounds. The provider never receives the real game, hidden cards, undealt deck, server log, other bot identity or other bot beliefs. Unsupported variants fail explicitly.

`BaselineProvider.predict(info)` returns legal candidate actions, normalized probabilities, source, coverage, model version, optional approximate values, equity uncertainty and warnings. `BotService.decide(info, profile, memory, seed)` applies bounded identity and heads-up evidence adjustments and samples one action. The returned internal trace contains the inputs and actual numeric transformations; rerunning it with the same provider version reproduces the policy and action. Execution time itself is not deterministic.

`MemoryRepository` retains the original string KV storage interface. Its versioned keys include both observer bot and table. Writes must be serialized by the caller; the CLI uses a single-writer JSON file with atomic replacement. Only narrow public fold-to-bet events enter `observe()`. Sequence numbers are monotonic **across the entire table session**, not the engine's per-hand `Hand.seq`. The legacy in-memory observer discards stale sequence numbers; the SQL ingestion service instead rejects out-of-order delivery and atomically deduplicates journaled events. Fold evidence currently pools streets and bet sizes; contextual inference remains a limitation.

To integrate in a trusted backend: authorize the current actor; construct `info`; load its persisted profile and observer memory; call `decide` with `seedFor`; submit the returned action to `makeMove`; persist public observation events in order. Keep trace storage private. Traces contain the hero's own private cards and strategy: never broadcast them or enable detailed production logging by default. Persist profile versions and memory snapshots if replay is required. Do not expose an unauthenticated endpoint that accepts arbitrary actor IDs.

## Transactional persistence and deployment

`BotStateStore` applies the additive migration in `src/bot_engine/migrations/001_initial.ts`. It stores immutable identity parameters, observer/table session memory, ordered public observation events and private decision snapshots. An event's posterior change and deduplication record commit together; conflicting duplicates and out-of-order inputs throw. A duplicate decision returns the original trace even if memory has changed, while a conflicting request for the same table/hand/sequence/actor throws. These calls belong in a trusted, serialized backend.

The development adapter uses real SQLite (`scripts/botSqlite.ts`). The persistence command can be run twice in separate processes: the second run reports `observationApplied: false`, `cachedDecision: true`, and `samples: 1`. Tests also close/reopen the database and inject a journal-write failure to verify rollback.

`worker/botStorage.ts` adapts Cloudflare Durable Object SQL and `transactionSync` to the same repository. It is available for TableRoom integration but is not activated in the live game loop and has not been remotely deployed. Actor authorization, event derivation from accepted moves, global identity storage across separate table objects, contextual lifetime memory, session retention and high-concurrency workload testing remain outstanding. No public decision/debug endpoint is exposed.

Private traces contain the actor's own hole cards, not the real deck or opponents' hidden cards. Storage needs access control and retention before deployment. Runtime projection also strips unexpected extra fields from direct information-set callers. Same-version deterministic replay remains supported; cached original traces survive version changes, but recomputing an older policy requires retaining that policy implementation.

See [audit](REPOSITORY_AUDIT.md), [research decisions](RESEARCH_DECISIONS.md), [generation](BOT_GENERATION_SYSTEM.md) and [evaluation/progress](EVALUATION.md).

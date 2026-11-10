# Public-behavior learning and validation

This implements opponent-specific response, range and sizing estimates on top of each bot's existing private memory. **Live ordinary bots and BOT_001 still use V7's decision policy.** They collect the new bounded public-action memory, but the candidate policy remains an explicit offline option because its reserved gameplay results did not clear promotion. No bot analysis is added to the Range trainer review.

## Learning from observed play

`BotMemory.behavior` is an additive extension of version-1 memory. Old snapshots remain valid without a migration. Its observation ledger is independent of the existing fold learner, so collecting checks, calls, bets and raises does not change legacy fold counts or their sequence numbers.

Each observer stores its own counts for an opponent, street, heads-up/multiplayer status, whether a bet was faced, and the public price bucket. The three action classes are fold, passive (check/call) and aggressive (bet/raise). Blind posts, preflop actions and out-of-turn departures do not become postflop style observations. Sizing observations exclude stack-capped all-ins and minimum-size constrained actions, where the actual size does not reliably reveal a preferred pot fraction.

The trusted adapters project only public action history, revealed board, seats, stacks, commitments and blinds into the event processor. It reconstructs the state before each action, including uncalled refunds and reopening. Starting stacks protect replay from showdown payouts. No real opposing cards, deck, private profile, other observer's memory or known script type enters learning or inference. New observations are collected independently for ordinary bots and optional BOT_001 and remain inside the existing private-state redaction boundary.

Evidence is deliberately limited:

- At most two observations per opponent/context/hand contribute, preventing a long raise sequence from masquerading as many independent hands.
- Counts decay by 0.97 per elapsed hand: a half-life of about 23 hands. Absence also reduces effective evidence when the next prediction is queried.
- Current-hand observations stay pending until a later hand. Historical range inference therefore cannot use an action both to establish a style and to explain that same action.
- An exact context has full weight; other streets/price buckets receive 0.2 weight only within the same player-count and open/facing category. Heads-up evidence does not transfer to multiplayer, and checked-to evidence does not transfer to facing a bet.
- A Dirichlet prior with eight pseudo-observations smooths public action frequencies. The heuristic trust weight is `0.65 × n / (n + 20)`, where `n` is the decayed, pooled count. It starts small and stays below 0.65. This is a shrinkage rule, not a calibrated confidence interval.
- Storage is bounded to 16 opponents and 24 contexts per opponent, with deterministic oldest-opponent eviction. Snapshot projection copies only allowed counts for relevant opponents; providers cannot mutate stored memory through the projection.

## How estimates change

`BehavioralProvider` returns the exact V7 prediction when there is no completed-hand evidence, and delegates preflop to the existing everyday provider. Learning-off mode withholds the behavior snapshot and retains that fallback. Learned behavior is distinct from the bot's own fixed Casual/Challenge level and subtle identity.

For an established opponent, the V7 own-hand response probabilities receive a bounded odds adjustment based on the smoothed public frequencies. A small trust-weighted probability floor permits learning actions to which V7 assigned zero probability. Impossible actions remain masked, and a shared royal board checks/calls. The adjustment keeps a hand-strength model rather than treating public marginal frequencies as knowledge of the opponent's private hand.

Range updating tempers the **actual V7 public-action likelihood**. Frequent aggression or calling weakens the corresponding hand-strength filter; unusually selective action strengthens it. The adjustment is bounded by trust and leaves preflop entry likelihoods intact. This avoids the incompatible-likelihood ratio tested in an earlier development prototype. The resulting distribution is normalized over legal, unblocked holdings. It remains an approximate range model, not a solver or an identified true range.

The opponent's future sizing blends the existing hand-aware fraction with a learned three-bucket sizing mean. Its separate trust weight stays below 0.5; the planning engine bounds the resulting fraction to 0.25–1.25 and continues enforcing actual chip/raise limits. The bot's own future continuation retains the V7 policy. Existing hand plans, personality preferences, commitment reserves and estimated-cost guards still run afterward.

The original [development](benchmarks/public-behavior-development.json) and [likelihood-ratio development](benchmarks/public-behavior-ratio-development.json) artifacts retain two prototypes on the same 960 generated hands. Their distinct fingerprints identify historical alternatives; neither is an independent test of the final candidate, and the final source does not reproduce those old variants. The final candidate was frozen before the new prediction and gameplay test partitions. No reserved gameplay return selected another policy or fitted weights.

## Direct prediction and range accuracy

The [reserved accuracy report](benchmarks/public-behavior-accuracy-test.json) uses 5,400 production-engine hands: nine opponent types, two new seeds and 300 hands per session. Loose-passive, random and changing-aggression opponents extend the six-type development population. The generator plays frozen V7, so both forecasters score the same opportunities rather than different self-selected game trajectories.

Predictions are scored before observing each action. Conditional response scores use the actor's actual own cards only for offline hypothesis evaluation. **Marginal response forecasts integrate hypothetical holdings using only the observer's own cards and public information.** Opposing actual cards are used afterward to score the predicted range; they never enter the provider, event processor or memory. Range integration follows a fixed one-in-five eligible-hand sample after non-fold actions, rather than selecting favorable examples.

| Metric | Frozen V7 | Public-behavior candidate | Relative error reduction |
| --- | ---: | ---: | ---: |
| Marginal response log-loss, 1,446 observations | 0.62393 | 0.57478 | 7.9% |
| Marginal response Brier error | 0.37778 | 0.33976 | 10.1% |
| Exact-combination range log-loss, 1,334 observations | 7.16666 | 7.15627 | 0.15% |
| Three-hand-group range Brier error | 0.62409 | 0.62161 | 0.40% |
| Sizing mean squared error, 447 observations | 0.13949 | 0.12979 | 7.0% |

All declared accuracy gates passed. The range gain is **small**, not evidence of a major range-reading advance. These serial, synthetic observations do not provide a statistical strength certificate or human-realism evidence.

Conditional response log-loss fell from 1.01305 to 0.65244 across 6,332 observations, with Brier error falling from 0.43397 to 0.37902. The much larger conditional log-loss gain partly comes from avoiding V7's zero-probability aggressive predictions against random/aggressive scripts. The marginal metric is the more relevant forecast for a bot that cannot see an opponent's cards.

The reports separate the first half, first post-switch quarter and final quarter. `changing` moves from river-overfolding to calling at halfway; `changing-aggression` moves from tight-passive to loose-aggressive. For the latter, marginal Brier error in the final quarter was 0.7465 versus V7's 0.7592 across 27 sampled forecasts. That modest improvement and the explicit transition metrics check recovery without granting the model knowledge of the switch. Small phase counts still limit conclusions about adaptation speed.

## Fresh gameplay and release decision

The [holdout](benchmarks/public-behavior-gameplay-holdout.json) completed 10,800 hands and [confirmation](benchmarks/public-behavior-gameplay-confirmation.json) completed 7,200, across V6, V7 and the candidate. They use new seed partitions, identical physical deals, unchanged identity/learning settings, unequal multiplayer stacks and three ordinary plus two changing heads-up opponents. In mixed tables all ordinary bot seats change together, so those returns do not isolate one player's strength. Stacks reset each hand, while each bot retains its own memory within the session.

| Situation | Holdout change vs V7, bb/100 | Confirmation change vs V7, bb/100 |
| --- | ---: | ---: |
| Competent heads-up | -2.3 | -1.3 |
| Short-stack three-way | +2.9 | +6.8 |
| Unequal six-way | +89.5 | +3.7 |
| Unequal nine-way Challenge | +9.0 | +36.8 |
| Calling-station heads-up | -76.3 | +10.2 |
| Loose-aggressive heads-up | -12.3 | -34.9 |
| Changing calls heads-up | -1.6 | +0.8 |
| Changing aggression heads-up | +14.8 | -9.7 |

Both batteries passed identical-deal, per-session/pooled realism, repetition-coverage, optional-choice and executor-latency checks. Holdout pooled 1,195 eligible multi-street hands and 3,812 optional decisions; confirmation pooled 808 and 2,598. Maximum session p95 was 112.7 ms and 118.9 ms under concurrent cloud load, not an iPhone measurement. Ten of 457 context-matched sizing comparisons met the product minimum in holdout, and none of 369 did in confirmation. Sparse cells remain unassessed.

**Both rejected promotion.** The existing screen requires nonnegative mean changes against V7 in every situation. Returns are mixed, with wide descriptive per-seed intervals; better forecasts did not reliably produce better play. The candidate is available through `SimulationOptions.calibrated: 'behavior'`, while live V7 collects public memory without using the new policy. No gate was relaxed to obtain a release. The next investigation should isolate response, range and sizing effects on decisions using development data; these reserved partitions are now consumed evidence.

Both gameplay reports have the same policy fingerprint, and the accuracy report's separately defined source fingerprint also matches the final source. The evaluators reject source changes during a run. Repeated scheduled fixed-seed monitoring is regression checking, not extra unseen evidence.

## Reproduce and checks

```sh
npm run bot:behavior -- 300 /tmp/public-accuracy.json test
npm run bot:compare-responses -- 150 /tmp/public-holdout.json behavior-holdout behavior
npm run bot:compare-responses -- 100 /tmp/public-confirmation.json behavior-confirmation behavior
npx vitest run src/bot_engine/publicBehavior.test.ts src/bot_engine/everyday.test.ts
npm run check
```

Validation passed root typecheck, 1,031 tests in 60 files and production build; 71 native tests, native typecheck and lint (zero errors, 19 existing warnings); Metro web export; and four browser tests covering normal bot play/reload, completion, optional BOT_001 and online memory redaction. Tests cover old-save round trips, deduplication, hand lag, evidence caps, forgetting, changing behavior, opponent/context separation, sizing/masks, range normalization, private-field poisoning, provider mutation isolation, learning-off and subtle profile variation with established evidence.

The daily experiment workflow records accuracy and gameplay reports without promoting the candidate, changing difficulty or restarting the previous five-hour run. SQL-journal ingestion remains the existing narrow fold-event API; this new extension persists through the memory snapshot and private live-game paths, with no new public debug endpoint.

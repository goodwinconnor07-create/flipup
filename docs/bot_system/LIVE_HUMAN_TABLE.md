# Live table experience

Ordinary Hold’em bots now use the `human-table-1` experience layer automatically in both Casual and Challenge. Optional BOT_001 uses it too. Native and web import the same engine. This is a live update on the existing V7 provider; the fitted response/range candidates discussed in [public-behavior validation](PUBLIC_BEHAVIOR.md) remain offline. Mini games and special campaign/legend policies keep their existing engines.

## Decisions with an intention

`philosophy.ts` evaluates every candidate before sampling: own hand and draws, visible price, position, checks, earlier aggression, board changes and an existing confirmed intention. Its small preferences guide the choice. Each selected action has a structured private rationale containing its principle, contributing factors, score gap, viable alternatives with actual probabilities, and a next-card plan. The English explanation is rendered from that same record. It does not invent an opponent's holding or claim solver range advantage from an own-hand draw.

The live layer keeps uncertainty among supported choices. With decision scores available, the close-choice margin is the larger of 0.75bb or 6% of the pot the player can contest after calling, plus half the largest reported sampling standard error (that addition is capped at 2bb). Lower-scoring candidates outside that band are removed. The existing estimated-cost guard still applies, and the final distribution is checked against its budget. These are heuristic decision scores and approximate rollouts, not a true regret bound or GTO guarantee. Preflop chart mixes without scores retain their authored support.

Exact shared unbeatable boards check or call; they do not fold or add pointless betting. Weak pressure with an all-in opponent acknowledges the active side contest rather than claiming it can win the whole pot without showdown.

## A connected hand and a subtle personality

`handStory.ts` retains a compact own intention: value on safe cards, realize a draw at a sensible price, slow down after an unimproved called probe, or protect showdown value. Later decisions reassess that plan against the new card, public strength and price. A plan applies only once its matching action actually appears in the public history. Separate confirmed and pending slots preserve consistent decisions across retries and persisted-state reloads; cancelled moves and previous hands cannot become evidence. The service itself does not mutate memory.

The four ordinary tendencies—balanced, patient, curious and pressure—remain restrained. They influence close poker decisions and sizing rather than turning seats into caricatures. Public calling/folding tendencies can mildly shift own bet-size preferences after every active opponent has at least eight effective observations in the relevant response context. Reads stay opponent-specific and trust-bounded. Size reweighting preserves the total aggression probability before the final support/cost checks.

`sessionFeel.ts` adds small temporary confidence after a public win of at least 12bb, caution after a loss of at least 12bb, and pressure after at least three public opposing raises. Impulses are 0.25, 0.35 and 0.2, bounded to [0,1] and decayed by 0.7 per completed hand. Net outcomes use payouts minus commitments, not current stacks affected by rebuys. These states make mild changes to supported preferences and tempo. They never change difficulty, the deal, or access to information. Think time uses public situation complexity and an independent timing seed, not current hand strength or the chosen action.

## Independent opponents at every seat

The table creates a balanced cast once. Existing assignments survive joins and reloads. Each bot's own latent identity, restrained trait variation, decision seed and tempo derive from its table and seat identity. A new table generates new individuals even when display names repeat. Each bot has an independent memory, hand plan and session state; none transfers from another table.

The trusted table coordinator may assign the cast, but an individual policy never receives that roster. `informationFor` and `copyInformation` whitelist only the acting player's own cards and public poker state. There is no opponent bot flag, display name, personality, seed, private plan, memory, hole card or deck in its information set. The provider receives only a projection of its observer's public-action counts. It cannot inspect another agent or branch on whether an opponent is human or another instance of the same engine.

Every observer processes every other seated player's visible actions through the same learner, regardless of origin. Bots can learn about one another over a session in exactly that way. Their utility is their own eligible chip result; there is no teammate reward, cooperation channel or master-system strategy. Shared code is an implementation detail, not information supplied to a decision.

Private traces remain bounded (four ordinary-table decisions, eight BOT_001 decisions) and are removed by the existing client/bot-view redaction boundary. The app does not display internal reasoning on every action. The Range trainer answer review is unchanged.

## Validation and limits

Run `npm run bot:experience -- /tmp/live-human-table.json` for the paired live regression. The committed [release report](benchmarks/live-human-table-release.json) records the policy source fingerprint, exact seeds, 1,000 executed hands across both comparison legs, primary-agent rationales, supported choices, confirmed follow-through, public reads, session dynamics and multiplayer bot observation coverage. Physical deals are paired; table identities differ by design, so descriptive returns do not isolate one component. Evaluator role labels are kept outside the policy.

`independence.test.ts` checks that changing opponent origins, hidden cards, deck and private bot state leaves the same visible decision unchanged; both human and bot actions enter separate observer memories; reload preserves identity; new tables reset identities and memory. Other focused tests cover plan confirmation/cancellation, shared boards, side-pot support bands, size-mass preservation, read thresholds, public outcomes and natural timing. App browser tests assert that the live adapters actually enable this layer and retain private explanations.

Synthetic realism checks and legal, explained decisions cannot establish that people find the bots human or enjoyable, or that playing strength has improved. Mobile performance is checked through builds and executor timings here; device profiling and later player feedback remain useful.

Release verification: 1,085 root tests across 66 files, 83 native tests across 18 files, root/native typechecks, production web build, native lint (0 errors; 19 existing warnings), Expo web export, and all four app browser tests passed. The 1,000-hand comparison audited 1,216 primary decisions: all explained and supported, with 109 confirmed-plan follow-ups and 315 decisions carrying observations of other live-engine bots. The largest session p95 compute time was 74.2ms on this executor; deliberate think delays are separate.

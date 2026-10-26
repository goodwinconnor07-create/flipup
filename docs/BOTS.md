# How the bots play

FlipUp's bots are meant to feel like the people at a real pub game or home tournament: each one
has a recognisable way of playing, makes the kind of mistakes that kind of player makes, reads the
table, gets rattled, and takes as long as a person would. This page explains how they work and how
they were tuned. The rules they follow are in [RULES.md](RULES.md#bots).

## Offline player expansion

The roster now has **640 stable identities**: 600 pub/tournament-style names (Dave B, Mick C,
Steve D, etc.) and the original 40 names for saved quick-game compatibility. Each has an independent
profile for discipline, curiosity, pressure, patience, composure, sociability, vocabulary and cadence.
The ten existing poker foundations remain, with 64 identities per foundation. Profiles vary strategy,
timing, adaptation and emotion continuously; they are not 640 independently trained poker models.
New profiles use understated faces and poker-themed emojis through the existing avatar field.
No screen, component, CSS, input control or layout was changed.

**Conversation is local.** `botDialogue.ts` plans a public-context intent, chooses an authored clause,
and applies one of twelve voices and occasional sentence framing. Its banks cover ordinary actions,
all-in sweats, exposed bluffs, results, repeated raises, multi-street pressure, board changes,
short stacks, rivalries, recoveries and winning runs. Replies interpret the particular quick message
or bot comment they answer. Delayed replies are cancelled if that message or hand has changed.
There are no API calls, downloads, token costs or neural model at runtime.

Each identity retains its last 24 clauses in table state, with recent table-wide repetition avoidance
and least-recent reuse after a bank is exhausted. Individual cooldowns and table pacing limit noise;
a bot that sweated an all-in still gets its outcome reaction. Text travels as validated, compact
`b:local:` IDs through the existing reaction channel. Old IDs still decode, and clients cannot
submit either kind of bot speech. The new planner does not announce an unshown bluff or inspect
another seat's private cards. Learning, profiles and dialogue memory are redacted from online clients.
Scroll lessons remain silent.

**Learning reacts to a change of gears.** Lifetime public counts anchor a second, exponentially
weighted recent window (0.8 decay per hand, roughly five hands of retained evidence). The combination
lets observed new aggression, calling or folding influence subsequent decisions promptly without
assuming one raise proves a bluff. Publicly shown bluffs update both windows. This is per-table
opponent modelling, not a neural network or permanent learning across unrelated games.

**Strategy improvements.** Stronger readers enumerate every legal opponent combination on heads-up
rivers instead of estimating that range with a small sample. Range assumptions still matter; exact
enumeration does not make this a solved poker agent. Bots price calls using reachable pots, do not
assign fold equity to an all-in opponent, ignore all-in seats when assessing position, distinguish
an all-in call from a preflop raise, and focus multiway calling adjustments on the actual bettor.
Coarse trained action buckets are discounted when an action's estimated value is clearly worse.
The existing mood, short-stack, chart, range and mixed-action systems remain in use.

Run `npm run check` for regression, fairness and targeted upgrade tests. Run
`npm exec --package=tsx -- tsx scripts/verifyBotUpgrade.ts` for six-/nine-handed, short-stack and
scripted-opponent simulations; JSON evidence defaults to `/tmp/flipup-bot-upgrade.json`. An optional
argument points to a preserved pre-change game directory for comparison. `BOT_ONLY`, `BOT_HANDS`,
`BOT_SEEDS` and `BOT_REPORT` select reproducible additional samples. Simulation win rates are
exploratory; perceived realism and enjoyment still need human playtesting.

## Fair play

A bot decides from its own two cards, the board, everyone's chips and the public moves. It never
looks at the deck or anyone else's hidden cards (a unit test hides them all and checks every
decision comes out the same), and it never calls a server: the GTO coach is only used for training.
Solved GTO data is used, but only as precomputed files shipped with the app.

## The brain (`src/game/botPlay.ts`, `botRange.ts`, `botEval.ts`)

**Before the flop.** The backbone is solved charts (`botCharts.json`) for 2–6 players at
100/40/20 big blinds. Each style bends them: tight styles drop the weaker hands, loose ones add
hands, passive ones call instead of raising, limpers limp. On top of that:

- Opening sizes follow the style (a nervous player min-raises, a gambler raises big when it finally
  has a hand: a tell you can learn).
- Limpers get raised by the aggressive styles, harder when the limpers are loose.
- Players who fold too much get their blinds stolen; tight raisers get respect.
- Short-stacked (13bb or less) a bot moves all in or folds, about as wide as push/fold charts say.
- Facing an all-in or a raise that commits much of its stack, a bot works out its chance against
  what that player would do this with, and whether moving in over the top would get folds.

**After the flop.** The bot pictures the hands each opponent could have:

1. Their preflop line (opened, called, 3-bet, limped, shoved) and what the bots have seen of them
   give a starting range.
2. Every move since (checks, bets of each size, calls, raises) makes some hands more likely than
   others. People bluff less as the hand goes on, so a big river bet is usually a real hand unless
   this player has been caught bluffing before.
3. It deals a couple of hundred imagined hands from those ranges, weighted by how well each fits
   the story, plays the board out, and counts how often it wins.

The same imagined hands tell it how each opponent would react to a bet: they call when their hand
seems worth the price, more often when they're sticky or already committed, and they sometimes
raise. From that it values checking, each bet size its style likes, calling, raising and folding,
and picks among them (mostly the best, sometimes a close second). The better players mix in a slice
of GTO's own play (`botPostflop.json`) to stay balanced. Card removal comes for free: imagined
hands never use the bot's own cards, so blockers count.

A fast evaluator (`botEval.ts`, which scores hands exactly like the table does) keeps a decision to a
couple of milliseconds even in a crowded pot, which matters on the server's CPU budget.

## Styles (`src/game/botStyles.ts`)

Ten hidden poker foundations, with individual profiles layered on top (64 bots each). Besides the preflop settings, a style says:

| Setting | What it does |
|---|---|
| `sense` | How much it thinks about what you could have. A calling station barely does: it looks at its own cards. |
| `sizes`, `tell` | The bet sizes it likes, and how much its size gives its hand away. |
| `value`, `bluff`, `bet`, `sticky`, `raise` | Leanings towards betting good hands, bluffing, betting at all, calling and raising. |
| `trap`, `chase`, `pairs`, `scared` | Slow-playing monsters, overrating draws, overrating one pair, folding to big bets. |
| `gto`, `wobble` | How much it leans on GTO's mix, and how much its choices wander (mistakes). |
| `adapt` | How much it changes its play after watching yours. |
| `mind` | How easily it tilts and how long it holds a grudge. |
| `tempo` | How long it takes, how long it tanks on hard spots, how often it snaps, whether it Hollywoods with a monster. |
| `show` | How often it shows a bluff, a strong hand nobody called, or a good fold. |

## Reading a player who bets or folds a lot

Bots keep a note on every player (`game.reads`, only from public moves). Two of the things they
notice matter most to how a table feels:

- **Someone who bets nearly every street.** The bots count how often a player bets when nobody has
  bet yet (`betFreq`). A player who does it nearly every time is called lighter: the bot's calling
  value gets a bonus (`BET_CALL` in `botPlay.ts`) that grows with how far above the usual rate they
  are. It's a nudge and not a switch. Against a constant bluffer (`bluffBot` in the lab) the strong
  styles fold about 20–29% of the time, against about 35–46% for an honest player, and still beat it
  (-33 bb/100 for the bluffer on average). Trying a stronger version (also widening the hands the bot
  imagines a bettor has) made them fold less but lose chips to the bluffer, so it was dropped: a
  constant bluffer still has a real hand part of the time. Only hands shown at showdown change how
  much of a bettor's range is imagined to be bluffs.
- **Someone who folds too much.** The bots raise more hands before the flop against a player who
  folds a lot, and bet more after it (`EXPLOIT` in `botPlay.ts`: `steal`, `fold`, `stealCap`). With
  the settings used now the strong styles win about +34 bb/100 from a player who folds to every
  bet, up from about +22 before.

The nervous bot is meant to be the soft one: it folds to pressure more than anyone (60% of bets),
bets small, and has a base `adapt` of 0 (individual profiles now add a small amount of adaptation). It used to win the table (+127 bb/100)
because it played tight and folded at the right times; it now loses a little (-44 bb/100) and an
honest player beats it. A bot that gets rattled gets more scared on tilt, never less.

## Moods (`src/game/botMind.ts`)

Bad beats, losing a lead on the river, big losses and finding out it was bluffed put a bot on tilt.
Most styles play looser, more aggressively and more sloppily on tilt; the nervous kind tighten up
and get more scared instead. Winning makes a bot confident. It holds a grudge against whoever
took a big pot off it and plays back at them. All of it fades over a few hands. Tilted bots grumble
between hands, and beating the player they have a grudge with gets a special line.

## Timing

A bot glances at the spot, then thinks for as long as a person would: easy folds are quick, close
decisions and big bets take longer, and some styles snap-call or Hollywood with a monster. Thinking
out loud ("Hmm… tough one") happens before the move. Once every person has folded, the bots
finish the hand quickly.

## The lab (`scripts/botLab.ts`)

`npx tsx scripts/botLab.ts [hands] [out.md]` plays thousands of hands and prints:

- each style's stats (VPIP, PFR, 3-bet, aggression, fold to bet, showdowns, c-bets, bluffs, win
  rate, thinking time, variety);
- what a table feels like (flops seen, showdowns, pot sizes, all-ins, bluffs shown, talk);
- the new bots heads-up against the bots from before this update (`scripts/legacy/`);
- simple strategies a person might try (call everything, raise everything, shove every hand, fold
  to every bet) heads-up against each strong style;
- a decent, honest player against each style (strong styles should beat it, soft ones lose to it);
- a fun score out of 100 built from all of that.

### Historical results before the offline player expansion

The measurements below belong to the earlier bot release; they do not measure the new roster or dialogue engine.

From `npx tsx scripts/botLab.ts 1500` (1,500 hands a table, heads-up matches over three seeds), the
same lab run on the bots before this update and after it:

| | Before | After |
|---|---|---|
| Fun score | 81 / 100 | 97 / 100 |
| New style heads-up against the same old style | – | wins in all ten (pro +69, shark +129, LAG +165, TAG +27 bb/100) |
| A decent honest player against the pro / shark | wins +15 / +16 bb/100 | loses 76 / 77 bb/100 |
| A decent honest player against the soft styles (station, gambler, maniac, nervous) | wins | still wins (they're there to be beaten) |
| Call everything, worst case against a strong style | -43 bb/100 | -296 bb/100 |
| Fold to every bet, worst case against a strong style | +1 bb/100 (breaks even) | -10 bb/100 |
| How much thinking time varies (spread) | 0.29 | 0.45 |
| Table talk per hand (six-handed) | 1.30 | 0.94 |

Full output of the latest run:

#### Bot lab: 1500 hands a table

#### Styles (100bb, mixed tables)

| Style | VPIP | PFR | 3-bet | AF | Fold to bet | Saw flop | WTSD | W$SD | C-bet | Bluff share | bb/100 | Think ms | Think spread | Variety | Talk/100 | Shows |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pro | 27% | 18% | 8% | 1.9 | 45% | 19% | 30% | 61% | 56% | 25% | 87.7 | 1505 | 0.44 | 0.58 | 3.0 | 2 |
| shark | 29% | 20% | 11% | 1.5 | 44% | 21% | 31% | 60% | 48% | 26% | 112.5 | 1364 | 0.46 | 0.57 | 8.9 | 12 |
| tag | 21% | 15% | 9% | 2.3 | 41% | 15% | 37% | 60% | 55% | 23% | 134.1 | 1423 | 0.42 | 0.58 | 9.7 | 11 |
| lag | 35% | 24% | 14% | 2.7 | 38% | 24% | 41% | 54% | 65% | 33% | 27.7 | 1378 | 0.41 | 0.61 | 17.9 | 18 |
| maniac | 50% | 34% | 24% | 3.8 | 34% | 38% | 45% | 46% | 73% | 38% | -148.2 | 1141 | 0.35 | 0.64 | 41.2 | 146 |
| rock | 14% | 10% | 7% | 1.8 | 53% | 10% | 28% | 57% | 51% | 10% | 12.9 | 1554 | 0.39 | 0.47 | 6.6 | 25 |
| station | 37% | 11% | 5% | 0.5 | 18% | 28% | 60% | 44% | 44% | 21% | -185.0 | 1928 | 0.45 | 0.43 | 21.4 | 8 |
| gambler | 44% | 15% | 10% | 1.3 | 26% | 32% | 44% | 43% | 75% | 36% | -35.2 | 1620 | 0.38 | 0.58 | 17.9 | 32 |
| trapper | 24% | 14% | 7% | 1.4 | 37% | 17% | 37% | 57% | 66% | 22% | 52.5 | 1583 | 0.53 | 0.59 | 13.3 | 17 |
| nervous | 26% | 14% | 6% | 2.4 | 60% | 19% | 30% | 63% | 58% | 35% | -44.1 | 2005 | 0.53 | 0.63 | 10.6 | 20 |

#### Tables

| Tables | Flops | Showdowns | Avg pot (bb) | Big pots/100 | All-ins/100 | Bluffs shown | Talk/hand |
|---|---|---|---|---|---|---|---|
| 100bb | 63% | 29% | 67.9 | 29.5 | 11.2 | 10% | 1.01 |
| 25bb | 62% | 40% | 33.5 | 26.4 | 27.1 | 7% | 1.40 |
| 12bb | 56% | 34% | 27.8 | 17.1 | 27.1 | 6% | 1.46 |

#### New bots against the old ones, heads-up (bb/100 for the new style)

| Style | New vs old |
|---|---|
| pro | 81.4 |
| shark | 41.4 |
| tag | 25.6 |
| lag | 28.2 |
| maniac | 179.9 |
| rock | 46.0 |
| station | 3.4 |
| gambler | 123.7 |
| trapper | 12.9 |
| nervous | 15.4 |

#### Simple strategies heads-up against the strong styles (bb/100 for the script)

| Script | pro | shark | tag | lag | trapper | Worst |
|---|---|---|---|---|---|---|
| callBot | -539.8 | -494.8 | -269.8 | -660.3 | -336.4 | -269.8 |
| raiseBot | -1166.8 | -1318.7 | -805.7 | -1342.3 | -1090.8 | -805.7 |
| shoveBot | -337.5 | -2216.5 | -700.3 | -609.2 | -1725.4 | -337.5 |
| foldBot | -31.2 | -25.4 | -41.4 | -9.7 | -33.0 | -9.7 |
| bluffBot | -73.9 | 22.7 | -24.3 | -26.9 | -60.3 | 22.7 |

#### Heads-up: a decent honest player (abc) against each style (bb/100 for abc)

| Style | abc bb/100 |
|---|---|
| pro | -90.3 |
| shark | -40.0 |
| tag | -38.1 |
| lag | -92.0 |
| maniac | 23.5 |
| rock | -11.6 |
| station | 14.0 |
| gambler | 53.0 |
| trapper | -37.7 |
| nervous | 6.7 |

#### Reading the table: a player who folds too much, and one who bets every street

| Style | Wins from a player who folds to every bet (bb/100) | Fold to bet against the constant bluffer | Against an honest player |
|---|---|---|---|
| pro | 34.7 | 29% | 46% |
| shark | 18.4 | 29% | 41% |
| tag | 41.3 | 28% | 46% |
| lag | 29.9 | 19% | 46% |
| trapper | 47.1 | 20% | 35% |

#### Fun score: 97 / 100

| Part | Score |
|---|---|
| Flops seen (45–65%) | 100 |
| Showdowns (22–32%) | 100 |
| Big pots (10–25 per 100) | 62 |
| All-ins (4–12 per 100) | 100 |
| Bluffs shown (6–20% of showdowns) | 100 |
| Table talk (0.5–1.1 a hand) | 100 |
| Styles: VPIP spread ≥ 40 pts | 87 |
| Styles: aggression spread ≥ 2.5 | 100 |
| Styles: fold-to-bet spread ≥ 30 pts | 100 |
| Styles: rock < tag < pro < lag < maniac (VPIP) | 100 |
| Styles: station < pro < nervous (fold to bet) | 100 |
| Styles: station < tag < maniac (aggression) | 100 |
| Not robotic: variety ≥ 0.5 | 100 |
| Think time 1.5–3.5 s | 100 |
| Think time varies (spread ≥ 0.4) | 100 |
| Smarter than before: new beats old (avg ≥ +15 bb/100) | 100 |
| Strong styles beat old strong styles (each ≥ 0) | 100 |
| Call-everything loses to all strong styles (≤ -40) | 100 |
| Raise-everything loses to all strong styles (≤ -40) | 100 |
| Shove-everything loses to all strong styles (≤ -40) | 100 |
| Fold-to-bets loses to all strong styles (≤ -15) | 79 |
| A constant bluffer loses to the strong styles (avg ≤ -10) | 100 |
| The nervous bot is soft: it doesn't win at mixed tables (≤ +30 bb/100) | 100 |
| Strong styles beat an honest player (avg ≥ +20) | 100 |
| An honest player beats the soft styles (avg ≥ +15) | 100 |
| Soft styles lose, but not absurdly (≥ -250 bb/100) | 100 |

_Ran in 544s._

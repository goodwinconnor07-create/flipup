# How the bots play

FlipUp's bots are meant to feel like the people at a real pub game or home tournament: each one
has a recognisable way of playing, makes the kind of mistakes that kind of player makes, reads the
table, gets rattled, and takes as long as a person would. This page explains how they work and how
they were tuned. The rules they follow are in [RULES.md](RULES.md#bots).

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

Ten hidden styles, four bots each. Besides the preflop settings, a style says:

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

### Results

From `npx tsx scripts/botLab.ts 1500` (1,500 hands a table, heads-up matches over three seeds), the
same lab run on the bots before this update and after it:

| | Before | After |
|---|---|---|
| Fun score | 81 / 100 | 96 / 100 |
| New style heads-up against the same old style | – | wins in all ten (pro +69, shark +129, LAG +165, TAG +27 bb/100) |
| A decent honest player against the pro / shark | wins +15 / +16 bb/100 | loses 76 / 77 bb/100 |
| A decent honest player against the soft styles (station, gambler, maniac, nervous) | wins | still wins (they're there to be beaten) |
| Call everything, worst case against a strong style | -43 bb/100 | -296 bb/100 |
| Fold to every bet, worst case against a strong style | +1 bb/100 (breaks even) | -10 bb/100 |
| How much thinking time varies (spread) | 0.29 | 0.45 |
| Table talk per hand (six-handed) | 1.30 | 0.94 |

Full output of the run after the update:

#### Bot lab: 1500 hands a table

#### Styles (100bb, mixed tables)

| Style | VPIP | PFR | 3-bet | AF | Fold to bet | Saw flop | WTSD | W$SD | C-bet | Bluff share | bb/100 | Think ms | Think spread | Variety | Talk/100 | Shows |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pro | 26% | 18% | 8% | 1.7 | 47% | 18% | 32% | 61% | 56% | 26% | -6.6 | 1486 | 0.47 | 0.57 | 2.6 | 0 |
| shark | 28% | 20% | 11% | 2.1 | 44% | 20% | 32% | 59% | 56% | 28% | 135.2 | 1347 | 0.46 | 0.58 | 8.4 | 8 |
| tag | 22% | 16% | 10% | 2.4 | 44% | 16% | 37% | 56% | 59% | 21% | 62.3 | 1419 | 0.42 | 0.57 | 8.7 | 13 |
| lag | 33% | 24% | 15% | 3.0 | 38% | 23% | 41% | 55% | 70% | 34% | 63.2 | 1347 | 0.41 | 0.62 | 16.3 | 23 |
| maniac | 50% | 34% | 25% | 3.6 | 33% | 38% | 46% | 45% | 72% | 41% | -115.2 | 1146 | 0.36 | 0.64 | 40.8 | 166 |
| rock | 14% | 10% | 7% | 2.2 | 52% | 11% | 32% | 64% | 49% | 12% | 67.2 | 1529 | 0.38 | 0.48 | 5.8 | 23 |
| station | 38% | 11% | 6% | 0.4 | 17% | 29% | 62% | 46% | 44% | 23% | -194.1 | 1926 | 0.45 | 0.44 | 20.6 | 7 |
| gambler | 43% | 15% | 10% | 1.3 | 26% | 31% | 46% | 43% | 72% | 39% | -292.8 | 1709 | 0.44 | 0.58 | 18.0 | 24 |
| trapper | 22% | 13% | 6% | 1.7 | 37% | 16% | 38% | 60% | 64% | 23% | 115.6 | 1549 | 0.50 | 0.62 | 10.4 | 11 |
| nervous | 22% | 14% | 8% | 2.4 | 54% | 16% | 29% | 65% | 57% | 19% | 127.1 | 1804 | 0.46 | 0.57 | 8.1 | 9 |

#### Tables

| Tables | Flops | Showdowns | Avg pot (bb) | Big pots/100 | All-ins/100 | Bluffs shown | Talk/hand |
|---|---|---|---|---|---|---|---|
| 100bb | 61% | 29% | 71.2 | 29.6 | 12.1 | 10% | 0.94 |
| 25bb | 61% | 34% | 36.0 | 26.2 | 20.0 | 9% | 1.04 |
| 12bb | 56% | 38% | 26.7 | 16.2 | 33.0 | 6% | 1.32 |

#### New bots against the old ones, heads-up (bb/100 for the new style)

| Style | New vs old |
|---|---|
| pro | 69.4 |
| shark | 128.8 |
| tag | 26.7 |
| lag | 165.3 |
| maniac | 175.4 |
| rock | 1.3 |
| station | 23.9 |
| gambler | 70.5 |
| trapper | 31.9 |
| nervous | 17.3 |

#### Simple strategies heads-up against the strong styles (bb/100 for the script)

| Script | pro | shark | tag | lag | trapper | Worst |
|---|---|---|---|---|---|---|
| callBot | -558.9 | -506.4 | -295.8 | -605.9 | -367.0 | -295.8 |
| raiseBot | -1121.1 | -1044.2 | -868.2 | -1285.6 | -1013.0 | -868.2 |
| shoveBot | -337.5 | -2216.5 | -700.3 | -609.2 | -1725.4 | -337.5 |
| foldBot | -10.1 | -11.8 | -29.4 | -29.1 | -27.0 | -10.1 |

#### Heads-up: a decent honest player (abc) against each style (bb/100 for abc)

| Style | abc bb/100 |
|---|---|
| pro | -75.5 |
| shark | -76.5 |
| tag | -56.2 |
| lag | -47.0 |
| maniac | 55.0 |
| rock | -21.1 |
| station | 102.4 |
| gambler | 10.9 |
| trapper | -33.2 |
| nervous | -35.9 |

#### Fun score: 96 / 100

| Part | Score |
|---|---|
| Flops seen (45–65%) | 100 |
| Showdowns (22–32%) | 100 |
| Big pots (10–25 per 100) | 62 |
| All-ins (4–12 per 100) | 99 |
| Bluffs shown (6–20% of showdowns) | 100 |
| Table talk (0.5–1.1 a hand) | 100 |
| Styles: VPIP spread ≥ 40 pts | 85 |
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
| Fold-to-bets loses to all strong styles (≤ -15) | 80 |
| Strong styles beat an honest player (avg ≥ +20) | 100 |
| An honest player beats the soft styles (avg ≥ +15) | 100 |
| Soft styles lose, but not absurdly (≥ -250 bb/100) | 83 |

_Ran in 353s._

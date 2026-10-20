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

LAB_RESULTS

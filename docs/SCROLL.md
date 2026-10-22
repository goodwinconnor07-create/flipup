# Scroll

A feed of short poker cards. Each card is one spot with a goal, played against a bot whose style is named on the
intro popup, then graded on the phone. Swipe up for the next card once one is done. It lives under the Scroll tab on
Home (it replaced Insights, which moved into Train).

Nothing here calls a server. The only paid part is the coach's full review of a whole hand, and that only runs when
someone taps "Run the numbers" under Train → Scroll hands.

## What a card is

`src/scroll/templates.ts` holds the library (about 50). A template says:

- **theme**: `open` (position and opening ranges), `exploit` (playing a style), `defend` (facing raises and bets) or
  `odds` (pot odds and short stacks).
- **level** 1 to 4: how far into the feed it shows up (see Levels).
- **table**: `stack` in big blinds, `at` (your seat counted clockwise from the button: heads up 0 is the button, 1 the
  big blind), `bots` (1 heads up, 2 three-handed, 5 six-max) and `style`, the styles the bot can be.
- **want**: the cards you're dealt, as a wish. A starting-hand strength band, and for the flop, turn and river the kind
  of hand (`monster`, `strong`, `top`, `mid`, `draw`, `weak`, `air`) and board (`dry`, `wet`, `paired`, `mono`).
- **script**: the moves played before you take over, written in big blinds, as a share of the pot (`b.bet(0.5)`) or as
  a multiple of the bet in front (`b.x(3.5)`). The street names (`'flop'`, `'turn'`, `'river'`) mark where a card comes.
- **goal**: `win`, `profit`, `bluff`, `right` or `save`, and **hints** and a **lesson** in plain words.
- **quick**: the card ends at your first move (no hand to play out). Quick cards are graded and kept, but have no
  finished hand, so they can't be sent for the numbers.

A seed turns a template into one deal (`dealCard` in `deal.ts`): same seed, same cards.

## Dealing

The engine has one hook for this, `Game.card` (a `CardScene`, `types.ts`). While it's set:

- `startHand` seats you where `at` says, deals your cards and the board as asked (the burn cards and the rest stay
  random, so the deck is still a real deck), and plays the `script` straight away (`playScript` in `holdem.ts`).
- the table deals one hand and stops (`finishHand` leaves `nextHandAt` empty), `start` deals at once, and the bots
  don't talk (`botSays` returns false). The scene never reaches a phone (`redactForDevice`).

Right after the deal `fitBots` (`deal.ts`) gives each bot still in the hand two cards that fit how it has played so far,
using the same range code as the bots (`sampleHand` in `botRange.ts`), so a bot that "called a raise" holds a hand that calls.

## Grading

`src/game/judge.ts`. `judgeMove()` grades the move you're about to make, with the table still as it was when you chose
(`gradeMove` in the store). Good, Close call or Costly, the same grades as the coach. It uses the bots' own eyes:

- **Before the flop**: the solved charts the bots use (`botCharts.json`). The charts are close to all-or-nothing, so a
  hand on the edge of a range is blended with hands of about the same strength. A play GTO makes most of the time, only
  in a different way, is a close call and not a blunder. Short stacks (13 big blinds or less, nobody raised) use a
  push-or-fold width; a call against a shove or a big raise is priced against what they'd shove with.
- **After the flop**: it pictures what the other player could hold from their moves (`imagine`), counts how often you
  win, how often a bet gets a fold and what each option is worth in chips, then compares your move with the best one.
  Half the gain of a bet or raise over the best quiet move counts (it rests on how often they fold, the least certain
  number), so calling a draw isn't a blunder because a raise looks better.
- **The bot's habits** come from `styleNotes.ts` (taken from `docs/BOTS.md`), written into the grader's notes on the
  bot (`readFromHabits`). The intro popup shows the same text, so what you're told and what's graded agree.

It is not a solver. Say so in wording, and leave the exact numbers to the coach service.

## Stars and goals

`play.ts`. Every move that mattered (one where the options weren't all about equal) counts: Good is a point, Close
call half. **Three stars**: no Costly move and 85% or more. **Two**: 50% or more. **One**: anything else. The goal is
separate: a card can be passed with one star (lucky) or missed with three (unlucky). A goal that needs a bet (a
bluff) isn't called bad luck if you never bet.

## The feed

`feed.ts`. Stars set your level (`save.ts`, ten levels) and the hardest card level you're dealt (levels 1 and 2 get
level-1 cards, 3 and 4 level 2, 5 and 6 level 3, 7 and up level 4). The next card is picked by weight: the top of your level, a theme you've been
missing, a card you missed a while ago (in a fresh deal), and never the same card within six, or the same theme twice
running. It's picked as a card finishes (`save.upcoming`), so the next page is ready to slide in.

## The screen

`Scroll.tsx` is a pager of pages: earlier results behind you, the card in play (a real table with `Felt` from
`Table.tsx` in its bare form), and the next card. Rules: nothing moves in the middle of a hand; before Start you can
swipe down to look back; when a card is done you can swipe either way. The intro (`Cards.tsx`) announces the goal in
big type with the bot, its style, the story so far and the hints, and stays until Start. The result panel has the pass
or miss, the stars, the coach's bubbles (`scrollLines` in `train/coach.ts`) and Next card. Swipes use the pointer (a
finger or a mouse); the wheel and the arrow keys work too.

## What's kept (`flipup.*` in localStorage)

- `scroll`: stars, cards, combo, best stars per card, the latest cards (for picking), the card you're on and the next one.
- `scrollhands`: each card played, with its graded moves and (for a whole hand) the hand as data. A hundred are kept,
  and missed and three-star ones stay longer, up to two hundred.
- The card in play lives in the session (`Session.scroll`), so closing the app mid-card picks up where you were.

A finished card counts as a hand played for the daily streak. Scroll hands are kept apart from the hands the coach
reviews from your games, so forced deals don't skew your stats.

## Adding a card

Add a template, then `npm test`: `src/scroll/scroll.test.ts` deals every template over several seeds and checks the
script plays, it's your move afterwards, you hold what was asked for and no card is dealt twice. If the lesson depends on
what the grader says is best, add the card to "backs up what each card teaches".

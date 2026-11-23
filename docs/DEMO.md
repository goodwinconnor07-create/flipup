# The Demo

Every game has a Demo (21 November 2026, the owner's ask; it replaced How to Play): one hand of the game on the app's
real table, against Luna and Max, with a coach on top that shows one thing at a time and asks you to do each move.
It's free for every game, Premium ones too, because it's how a free player sees what a Premium game is like.

## How it's built

- **The hand** is `DEMO_SPECS` in `src/game/demo.ts`: who holds what, the board as it comes, the bots' moves, the
  die's roll, the powers, the twenty Memory cards, the ghost's bounty, and the moves you'll be asked for (`plays`).
  `stackDeck()` turns it into the deck in the engine's dealing order, and `Game.demo` makes the engine deal it, place
  you on the button, keep the bots quiet and follow their script (`demoBotMove()`, `demoHits()`). Everything else is
  the real engine and the real table, so the Demo always plays by the game's current rules and looks.
- **The steps** are `DEMO_STEPS` in `native/src/components/demo/steps.ts`. A step has a moment (`when`, usually "your
  turn on the flop"), the parts it lights up (`spots`) and either Next or the one thing to tap (`tap`). Words that
  depend on the cards (your hand's name, the die's roll, the card your Peek saw) are worked out from the hand.
- **Spots** are parts of the table that register a name (`<Spot id>` in `components/demo/spots.tsx`): `seats`,
  `felt`, `board`, `mine`, `act.call`, `raise.go`, `power.card`, `ghost`, `seat:<name>`, `discard:<card>` and so on.
- **The coach** (`components/demo/coach.tsx`) draws the dim, the cut-outs, the gold ring, the caption and the finish
  card, and lets taps through only to the step's target. `flow.ts` decides which step is up, the same way in the app
  and in the tests.
- **The pace** (23 Nov 2026, the owner: the demo felt slow and clunky). A demo keeps moving: the deal comes
  `TIMING.demoStart` (0.5s) after Deal me in, the scripted bots move in `demoBotMin` to `demoBotMax` (0.28 to 0.42s)
  and the beat before each card is `demoStreet` (0.6s), all in `src/game/holdem.ts`. The first step after the
  welcome waits `AFTER_DEAL` (0.6s, `flow.ts`) so your cards have landed before the dim does. Cut-outs stay inside
  the screen (round corners on the wide seat row), and after a tap the dim fades with its cut-outs where they were.
  The dark is drawn once per step and the next step's crossfades in over it (180ms in, 220ms out, opacity only):
  the cut-outs used to glide by animating the SVG mask, which redrew the whole screen every frame and ran at half
  speed on the phone. A new caption waits `CAPTION_AFTER` (140ms) so the last one is mostly gone.
- **The session** (`openDemo()`, `startDemo()`, `closeDemo()` in `native/src/state/session.ts`) sets whatever table
  you were at aside and puts it back when the demo closes. A demo hand is never counted in your stats, kept as a
  hand or saved.

## Keeping it in step with the games

A change to a game shows up in its Demo by itself: same engine, same table. What can go stale is the script, so two
tests play every demo through and fail when it does:

- `src/game/demo.test.ts` plays each hand with its `plays` and checks the twist happens (the die swaps the card, the
  rivers come, the ghost is beaten...), you win, and no chip is made or lost. A new game in `VARIANTS` without a demo
  fails it.
- `native/tests/demo-steps.test.ts` plays each demo through the coach's own steps and flow: every step must come up,
  in order, each tap must be a move the table takes, your turn must never come with no step asking for a move, and
  no caption may have a gap ("undefined", "Luna's ."). A new game without steps fails it.

So: **any change to a game mode runs both** (`npm test` and `npm test --prefix native`), and when one fails, fix the
demo in the same change: re-deal the hand in `DEMO_SPECS` so the twist still lands, and re-word or re-order its
steps. A new game gets a demo before it ships. Re-check the words when a rule changes even if the tests pass: a
sentence that explains a rule (Pittsburgh's three rivers, the cross's lines) is only as true as the rule.

## Writing a demo

- **Show the twist early.** By the second or third step, the thing that makes the game different.
- **One thing at a time.** One caption, one lit part (two or three at most), one move to make.
- **Short.** A title is one to four words; a line is under about 20 words. Say what's lit and why it matters.
- **Do, don't read.** Each street asks for your move; a step to read only where there's something to look at.
- **You win.** The demo hand ends in a showdown you win, so the end feels good and the finish card follows.
- **True.** Every line matches `docs/RULES.md` and what's on the table.

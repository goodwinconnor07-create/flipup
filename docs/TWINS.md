# AI twins: plan

Status: phases 1 (twin memory), 2 (fit and copy), 3 (the "Your twin" game) and 4 (the twin report) are built. The Friends' twins tile is there but says "Coming soon". Decisions below came from the product owner.

Two new ways to play, in an "AI twins" group on the Play tab under the Play with Friends and Play with Bots cards, above Quick games:

1. **Your twin.** Play a copy of yourself and learn from the habits it uses against you.
2. **Friends' twins.** Play a copy of a friend, scout how they play, and find a way to beat them.

## Decisions

| Question | Answer |
|---|---|
| How is a twin built? | Fit a bot `Style` to the player's stats, then copy their own choice in *similar* spots (not only near-identical ones). Where there's little data it falls back to the fitted style. |
| How does the player learn? | Normal play against the twin, with the GTO Coach on top: it names the hands the twin won and the habits behind them. |
| Where do friends' twins come from? | Both. Built from tables you shared, and a twin the friend shares themselves. The shared twin wins where there is one. |
| Memory | A separate long-lived twin store. The 24 hour hand history (`loadHistory()`) stays as it is. |
| When is a twin ready? | From about 50 hands, labelled "Still learning you" and filling toward 300 hands. |
| Friend consent | An opt-in switch, "Let friends play my twin", off by default. |
| Where on Play? | An "AI twins" group below the mode cards. |
| Twin name | The player's name cut to 7 characters, plus " AI" (the name limit is 10; `uniqueName()` still applies). Their emoji, with a small "AI" badge on the seat. |
| Table shape | Heads-up only for now. Twins at a full table with bots can come later. |
| Storage | A friend's shared profile may live on the Worker. It's a few KB of habit counters under a code: no cards, no chat. |

## The card

Two tiles side by side in a `.twins` grid, each with a drawing at the top and a title, a line of text and a progress line below. The same shape as a mode card, but narrower so Quick games stays on screen.

**The picture.** An emoji looks into a mirror (🪞) and sees itself.

- Left: the player's own profile emoji, a little larger, facing the mirror.
- Right: a tall rounded mirror with a thin metal frame (SVG, like `CardArt.tsx`) and a glass gradient. The same emoji sits inside it as the reflection, flipped with `scaleX(-1)`, a touch softer, with a diagonal shine across the glass and a small "AI" chip in the corner.
- **Your twin:** the player's emoji. If they haven't picked one yet, the default profile emoji.
- **Friends' twins:** a friend's emoji looks in, with a small 🔍 on the glass to show it's about scouting. With no friend added yet it shows two overlapping faces.
- Colour: one new gradient token pair per tile (for example teal and indigo), added to `:root` in `global.css`, not hard-coded. Phone CSS stays outside the desktop media query.
- Motion: the shine sweeps across the glass once on appear and on press. Under `prefers-reduced-motion` it doesn't move. The art is `aria-hidden`, and the button carries the label ("Your twin. Still learning you, 34 percent.").
- Under 50 hands, the "Your twin" tile is dimmed with "Play 50 hands to meet your twin" and opens a short sheet with a button into a bot game.

## Build order

### 1. Twin memory (built)

New pure code in `src/game/` (no DOM) and storage in `src/state/`.

- A `flipup.twin` key of counters, not stored hands. Each counter is keyed by spot: street, position group, hand-strength bucket, what the player faces (nothing, small bet, big bet, all-in) and players in. It holds how often they folded, checked or called, bet small or big, and raised.
- Summary stats kept alongside: VPIP, raise rate, 3-bet, how often they bet into a checked street, fold-to-bet, c-bet, bluff share, showdown rate, average open size, and bet size by hand strength.
- Updated from `captureFinishedHand()`, which already has the player's hole cards and the `HandRecord`. `buildFrames()` in `src/train/replay.ts` can give pot and stacks at each decision.
- Reuse the hand-strength bucket that `botPlay.parity.json` checks, so spot keys and the bots agree. (To confirm in the code.)
- Settings gets "Reset my twin". Confidence is hands ÷ 300, capped at 1.
- Size: sparse counters should stay well under 100 KB of `localStorage`. Check it with a test that plays a few thousand bot hands.

### 2. Fit and copy (built)

Files: `src/game/twinFit.ts` (the fit), `src/game/twinMix.ts` (the copy), `src/game/handBucket.ts` (hand and board features moved out of `botPlay.ts` so the memory and the bots share them), `src/game/twinRef.json` (how each of the ten bot styles really plays), `scripts/twinLab.ts` and `scripts/twinHarness.ts` (the lab).

- **Fit.** `fitStyle()` works out the player's numbers (`twinNumbers()`, pulled towards a typical player when there are few hands), weights the ten bot styles by how close their numbers are (`twinRef.json`), blends them, then nudges the knobs that move each number: looseness for the share of hands played, aggression for raising versus calling, `sticky` and `scared` for folding to bets, `bet` for betting when checked to, `bluff`, `raise` and `limp`. Open size and the usual bet sizes (small and big) are copied straight across, and `tell` follows whether they bet bigger with strong hands. The gains are in `FIT` and were tuned with the lab.
- **Copy.** Before it moves, `twinLook()` reads the spot the seat is in right now with the same code that read the finished hands (`heroNow()` in `twin.ts`, checked against the recorded hand in a test), then `twinMix()` pools every remembered spot on the same street, weighting each by how alike it is: a hand about as strong counts half per step away (up to 3 steps), a similar bet or raise counts less, a nearby position, player count and "had the initiative last street" count less than an exact match. The pooled mix of fold, check, call, small bet, big bet, raise and all-in is turned into the bot's own three choices (before the flop: fold or check, call, raise; after it: fold or check, call or small bet, big bet or raise) and blended into the bot's odds by `n / (n + 15)`, where `n` is how many spots' worth of evidence it found. With little evidence the fitted style plays; with a lot, the person's own habits do. A move the bot has no option for goes to the nearest one it has.
- **Mistakes are kept.** The bots' own "never fold the nuts" guards run on the style's side of the blend only, so a twin folds a strong hand about as often as its person does.
- **Where it lives.** `Player.twin` holds a `TwinBrain` (the fitted style and the spot counts, about 25 KB for 2,400 hands). `redactForDevice()` strips it, like styles. A seat's `style` string is set to the closest bot style so table talk and tilt still work.
- **Cost.** A lookup is about 0.3 ms. Cloning the table on each action costs about 0.5 ms more with the memory attached, which only matters in the simulator.

**How close is it?** `npx tsx scripts/twinLab.ts fit 400` learns each of the ten bot styles from 1,200 hands, plays the twin and the original for 1,200 more at the same tables, and compares. The "noise" column is two runs of the same style, so it is the best any twin could do. Mean gap, in points of each number (open size in big blinds):

| Number | Noise | Fitted style alone | Full twin |
|---|---|---|---|
| Hands played (VPIP) | 1.5 | 2.3 | 2.2 |
| Raised before the flop | 1.1 | 1.5 | 1.9 |
| Limped | 1.2 | 1.5 | 1.3 |
| Open size | 0.07 | 0.13 | 0.14 |
| 3-bet | 1.1 | 1.7 | 2.1 |
| Fold to a raise | 3.2 | 1.9 | 3.0 |
| Fold to a bet | 2.5 | 4.4 | 5.1 |
| Bet when checked to | 4.1 | 5.8 | 4.1 |
| C-bet | 7.1 | 7.2 | 7.6 |
| Bluff share | 3.0 | 5.8 | 4.8 |
| Bet share after the flop | 3.5 | 5.4 | 5.1 |
| Went to showdown | 3.9 | 5.2 | 5.4 |

With a bigger test (`tune`, 2,400 hands per style) the fitted style alone is within 2 to 4 points on the main numbers, with almost no bias on hands played, raising and bluffing, and about 3 points high on betting.

What this does and doesn't show: a bot's play depends on things the memory can't see (the board's texture, what it has read about opponents), so on bot data the copy can't beat the fitted style; it just has to avoid making it much worse. With a trust of 15 it stays within about a point of the fitted style on most numbers (raising before the flop and folding to bets are the two that slip, by under a point each), and it is better at betting when checked to and at bluffing. People's habits are tied to spots far more than a bot's, which is what the copy is for. Phase 3 should check it on real hands.

### 3. The "Your twin" game (built)

- **Play tab.** `HomeTwins.tsx` adds an "AI twins" group between the mode cards and Quick games: two tiles side by side, each a face looking into a mirror (`MirrorArt` in `CardArt.tsx`). The reflection is the same face turned round, with a gold frame, a band of light that crosses the glass once, and a small "AI" chip (a magnifier on the friends' tile). The animation stops when Animations is off.
- **Your twin tile.** Before 50 hands the tile is quieter, its bar shows how close it is ("Play 38 more hands to meet it.") and a tap opens a short sheet (`TwinSheet.tsx`) that says what the twin is and sends you to Play with Bots to teach it. From 50 hands a tap deals you straight in. The bar then shows how well it knows you ("Still learning you · 20%", "It knows your game." at 300).
- **The game.** `startTwin()` in `store.ts` builds a `TwinBrain` from `flipup.twin` as it is right now and seats it heads-up, using `startHeadsUp()` (shared with `startPlaystyle()`). The twin takes your face and the name `twinName()` makes from yours (seven letters of it, then " AI"). `Player.ai` is public and puts an "AI" chip on its seat; the brain itself (`Player.twin`) never leaves the phone. The table is marked `twinGame`, so "Play again" on the final screen builds a fresh twin from everything it has learned since, instead of seating a random bot.
- **It keeps learning.** Hands against your twin count towards your twin like any other (an end-to-end test checks it grows by one per hand).
- **Friends' twins tile.** A placeholder for phase 5: it says "Coming soon." and a tap shows a short message.

### 4. Learning from your mistakes (built, basic)

No solver and no network: everything here is worked out on the phone from counts and the hands themselves. (The GTO review of a hand, which does call the coach service, is untouched and isn't used.)

- **What's kept.** `src/state/twinGames.ts` keeps your last five games against your twin in `flipup.twingames`: when it started, how many hands the twin knew you from, one line per hand (its key and the chips you won or lost) and where you finished. It survives the 24 hour hand history. `captureFinishedHand()` adds each hand, `startTwin()` begins a game and leaving the table ends it (`recordFinished()` also marks the game in `flipup.stats.games` with `twin: true`, and Play again counts the table you just finished).
- **The report** (`src/screens/train/TwinReport.tsx`, numbers in `src/train/twinReport.ts`, words in `twinGameLines()` and `twinHabitsIntro()` in `coach.ts`): the coach says how the game went ("Your twin took 200 chips from you over 6 hands.", "You beat your twin by…", and "It's still learning you, so it's a loose copy" under 100 hands), four tiles (chips, hands won, hands, big blinds per 100 hands), then:
  - **Where it cost you:** your three worst hands, each with your cards and one sentence about what happened ("You folded on the turn after putting in 30.", "You went to showdown with top pair and lost 65 to two pair."). The sentence comes from the saved hand, so it's there while the hand history keeps it (24 hours); after that the line says the hand is too old. Replay links stay off while `REPLAY_ON` is false.
  - **Habits your twin copied:** up to three of your numbers (hands played, calling instead of raising, limping, folding to raises, re-raising, folding to bets, betting when checked to, flop bets after raising, bluff share, going to showdown) that sit outside the range most players are in, biggest gap first, each with a coach line, one thing to try and "Show me the numbers" (your count and the usual range). A number needs enough chances before it's mentioned (for example 15 bets faced), and nothing is said when nothing stands out. The usual ranges are plain constants in `RULES`, taken from the bot lab's measurements, not from a solver.
- **Where it opens.** The final screen of a twin game ("What your twin found"), the table menu during one, a "Your twin" row on the Review tab, and an "Against your twin" card on Insights (games won of games played), which also marks twin games in Recent tables.
- **Left out on purpose.** Hands where the twin bluffed you, and anything graded against GTO: the phone only sees the twin's cards when they're shown, and grading needs the solver.

### 5. Friends' twins

**Source A: tables you shared.**
- A phone keeps a `HandRecord` of online hands, which holds public moves plus any cards shown. Friends' stats come from those, so fits are rougher and copied spots exist only where cards were shown.
- It needs a friend ID that holds across tables. To confirm whether one exists. If not, add a random per-device ID to the join message and the player record (`protocol.ts`, `redact.ts`).
- Only tracked for friends who've switched on "Let friends play my twin". The flag travels with the player.

**Source B: a twin the friend shares.**
- The friend switches sharing on and gets a 5 letter code and a link. Their compact profile is saved on the Worker through a new `/api/twin` route (storage binding to decide in `wrangler.jsonc`; run `npm run cf-typegen` and commit `worker-configuration.d.ts` after).
- Unused profiles expire like idle tables (3 days).
- You add it from the Join sheet or the link. A re-sync button refreshes it. Switching sharing off deletes the server copy. It can't remove copies people already downloaded, and Settings says so.

**Merging:** the shared twin wins where there is one; shared-table data fills the gaps.

New screens: a friends list (face, name, confidence, where the data came from, "Add a friend's twin"), and a per-friend scouting report.

### 6. Beating a friend's twin

- The scouting report leads with plain-English habits ("Folds to flop bets two thirds of the time") and keeps the numbers behind "Show me the numbers".
- A short list of ways to beat it comes from a fixed set of rules ("folds a lot → bet small and often", "calls too much → bet thinner for value, bluff less").
- Play starts a heads-up game against that twin. Afterwards the coach says which plans worked ("Your steal raises won 7 of 10").
- Check every rule in `scripts/botLab.ts` by simulating a script that follows it against fitted twins, as the lab does for `bluffBot`. A rule that doesn't win there doesn't ship.

### 7. Tests, docs, rollout

- **Unit:** counters and spot keys; fit round-trip (build a twin from a simulated styled bot and check its stats land within a few points of the original); lookup fallback when data is thin; hidden-information test with a twin; chips test with a twin; the opt-in flag is respected.
- **E2E:** Play → AI twins → start a table. Add the mirror card to `SHOTS_DIR` screenshots in light and dark.
- **Docs:** update `CLAUDE.md` with a layout entry, and add anything rule-like to `RULES.md`.
- **Order of shipping:** 1 → 2 → 3 → 4 (Your twin works end to end), then 5 → 6 (friends).

## Not yet checked

- Whether `wrangler.jsonc` already has a storage binding that suits the twin code.
- Whether players carry an ID that survives across tables.
- The exact shape of the strength bucket in `botPlay.ts`.
- Whether the tile text fits at the smallest phone width. Check it in the e2e screenshots.

# AI twins: plan

Status: all five phases are built: twin memory, fit and copy, the "Your twin" game, the twin report and friends' twins. The Friends' twins tile is there but says "Coming soon". Decisions below came from the product owner.

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
- **What a twin game keeps per hand** (`src/train/twinFacts.ts`): once a hand is over, a local game has every card, so `handFacts()` saves your cards, the twin's cards, the board, whether you had the button, how it ended (you folded, the twin folded, a showdown), who made the last bet, the street it ended on, and whether the twin bluffed you. It's only ever read from your own phone's copy of the table, after the hand, never during one and never for friends' cards at an online table. Because the facts are saved with the hand, the report works after the 24 hour hand history is gone.
- **More in the report.** *Its bluffs*: times the twin bet or raised after the flop with a draw, a weak hand or nothing, how many made you fold (and how often you folded the better hand), and how many you caught, with the three worst as a sentence each. *How it went*: your showdown record, chips on the button against off it, and the street most of your losses came on (each only said when there are enough hands). *Bet-size tells*: one of the habits, when you bet noticeably bigger with good hands than with weak ones (or the other way round).

### 5. Friends' twins (built)

- **Sharing yours** (`src/state/share.ts`, `worker/twinShare.ts`, Settings): "Let friends play my twin", off by default. Turning it on sends a copy of your twin's habit counters (`shareableTwin()`: no list of hands, only the 1,500 spots seen most; never a card) to a `TwinShare` Durable Object under a five letter code, with a secret only your phone keeps. `POST /api/twins` starts it, `GET /api/twins/:code` reads it (40 a 10 minutes per address), `PUT` refreshes it and `DELETE` stops it, both needing the secret (stored hashed). The server cleans what it's sent and keeps it a month after its last refresh. Your phone refreshes it after each game, every 25 hands and when you change your name or picture, and takes it down when you switch off or reset your twin. Friends keep what they already downloaded. The code sheet in Settings has Share and Copy.
- **Your seat shows the code.** `Player.twinCode`, sent with the join (and the host's table creation), is public so friends at the table know who's who. The server only keeps it when the phone that joined owns that share (`TWIN_SHARE.owner()`), so nobody can wear another person's code.
- **The friends list** (`src/state/friends.ts`, `flipup.friends`). Two sources feed a friend. *Their shared twin*: add it with their code (Play, Friends' twins, Add a friend's twin), refreshed when you open the list or their page. *What you've seen*: at an online table, `captureFinishedHand()` counts each other player who shows a code, from outside (`addObservedHand()`: no cards, so only the numbers that don't need them: hands played, raising, folding, betting and bet sizes, not hand strengths or bluffs) and adds them to the list, fetching their shared twin too. Someone you've removed isn't added back. A shared twin is used once it has 50 hands; until then what you've seen of them is used from 30 hands (`bestTwin()`), and the screen says how rough the copy is.
- **Screens.** Play tab, Friends' twins: the list (their face, name and where it comes from), Add a friend's twin, and a card to share yours. Tapping a friend opens their scouting page.

### 6. Beating a friend's twin (built)

- **Scouting** (`src/train/scout.ts`, `Scout.tsx`): what stands out about them, said about them ("They fold to 70% of bets after the flop."), each with a plan ("Bet into them often, even with nothing much. Small bets win the pot and cost you little."), and "Show me the numbers" for their count and the usual range. It's the same counts and ranges as your own habits, seen from across the table, plus the size tell.
- **Play** starts a heads-up game against their twin (`startFriendTwin()`); it wears their face and the name `twinName()` makes from theirs. Play again deals a new one, and the game counts towards your own twin like any other.
- **After a game, "How your plan went"** (the same report screen, `TwinReport friend=…`): how your bets and raises did (pots they folded to) when the plan was pressure, or your showdown record when it was value, calling down or folding more, plus the costliest hands, its bluffs and how it went.
- **Checking the plans.** `npx tsx scripts/twinLab.ts beat` plays scripted players that follow each kind of plan against twins built from each style: `stabBot` (small bets whenever checked to) for the pressure plans, `abc` for value, `lightBot` and `tightBot` (abc calling much lighter or much tighter) for calling down and folding more. Results are below.

**What the lab said** (`beat 400`: each script plays 2 × 2,000 hands heads-up against a twin built from each style; bb/100 for the script, so about ±40 of noise in each cell):

| Script | nervous | rock | station | gambler | maniac | lag |
|---|---|---|---|---|---|---|
| `stabBot` (small bets when checked to) | −6 | 16 | 54 | 84 | 74 | 63 |
| `bluffBot` (big bets every street) | −1 | 20 | 10 | 98 | −26 | −22 |
| `abc` (plain, honest) | 24 | 9 | 85 | −5 | 35 | 8 |
| `lightBot` (calls bets much lighter) | −35 | −44 | 72 | 42 | −24 | −90 |
| `tightBot` (calls bets much tighter) | 11 | 10 | 92 | 84 | 25 | 76 |

- Honest value betting (`abc`) beats five of the six twins, and calling tighter (`tightBot`) beats `abc` against four. Those plans are offered.
- Small stabs beat five of six, but only break even against the most fold-prone copy (nervous), where plain value betting does better. So "they fold to most bets" gets a value plan ("bet your good hands, keep bluffs small"), and stabbing is offered against players who raise too little, limp or play too few hands.
- Betting big every street (`bluffBot`) loses to the two bluff-heavy copies, and calling lighter (`lightBot`) loses to four of the six, including both of those. So nothing says "call them down lighter": against bluffers the plan is a pair or better to call, and good hands to bet.
- Reread this when the bots change: it's a different picture if the styles do.

### 7. Tests and checks

- **Unit:** the counters, spot keys and observed counting (`twin.test.ts`), the fit and the copy (`twinPlay.test.ts`: including that a twin decides from its own cards only, and that chips still add up with twins at the table), the twin code at tables (`twinCode.test.ts`), the report (`twinReport.test.ts`), scouting (`scout.test.ts`) and the friends store (`friends.test.ts`).
- **End to end:** `twin.spec.ts` (the tiles, playing your twin, the report, Insights), `twin-share.spec.ts` (the Worker: share, read, refresh, stop, who can change it; a table keeps a twin code only for its owner; the Settings switch) and `friends.spec.ts` (two phones: add a friend's twin by code, scout it and play it; and meeting a friend at an online table).
- **Deploying.** The Worker needs the `v2` migration in `wrangler.jsonc` (a new `TwinShare` class) to go out with the code. `worker-configuration.d.ts` is regenerated and committed.

## Limits

- A friend's twin is only as good as what it has seen. A twin built from tables you shared is a rough copy: it has no hand strengths, so it can't copy their choices in particular spots, only their overall habits.
- A 5 letter code can be guessed, slowly: lookups are limited to 40 every ten minutes per address, and what's behind a code is habit counters and a name, nothing else. Sharing is off until you turn it on.
- Replay links in the report stay off while `REPLAY_ON` is false.

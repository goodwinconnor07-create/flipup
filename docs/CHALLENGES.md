# Challenges

Scored solo modes in the iPhone app. Each one is an ordinary bots-only table on the phone with a few rules on top,
and a score at the end. Nothing grades how you played: the score is the game, and you get better at it by playing.

Code: `src/game/challenges.ts` (what each challenge is, its table, what changes between hands, the scores),
`src/game/rewind.ts` (Rewind's replays and "how it usually goes"), `native/src/state/session.ts` (runs them on the
phone), `native/src/state/challenges.ts` (best scores). Tests: `src/game/challenges.test.ts`. Lab:
`scripts/challengeLab.ts`.

## How they fit

- On the phone only: never online, never on the Worker, never in the campaign.
- Chips are pretend. A challenge hand counts toward the day streak, but never toward your poker record
  (`noteHand()`/`noteGame()`), Home's Play again row or the Passport.
- Best scores are `flipup.challenges`: `{ [id]: { best, plays, lastAt } }`. A run you leave before it ends isn't scored.
- A challenge table takes its random numbers from its own state (`challengeRng(game, seed)`: the run's seed, the
  table's id and its version). The same table in the same spot always deals and decides the same way, which is
  what lets Rewind replay a hand. Online tables are unchanged (`cryptoRng`).
- `Game.challenge` says which challenge a table is. It's public and holds nothing secret.
- Just before every deal, `beforeDeal()` does what the challenge needs between hands (blinds, new bots, top-ups),
  and the run ends when its hands are up. The deal waits while a sheet that needs you is open.

## Short Stack

- Six seats, everyone at 10 big blinds (the first big blind is 100 chips).
- The blinds go up about 1.5 times every 6 hands, rounded to a tidy number (100, 150, 250, 300, 500, 800...).
- A bot that runs out is replaced before the next deal by a fresh one with 10 big blinds of the new level, so the
  table always has six.
- No rebuys: the run ends when you bust. **Score: hands survived** (hands you were dealt into and came out of with
  chips), up to 100, where the run stops.
- At 12 big blinds or less your buttons become Fold (Check when it's free), Call when you face a bet, and a big
  Shove with the amount in big blinds (Call all in when you can't raise). Your stack shows in big blinds, large.
- The end card shows shoves made, shoves that won chips, shoves everyone folded to, and your peak stack in big
  blinds, all from the hand log (`shortStackStats()`). A shove is an all-in that raised; calling someone else's
  all-in isn't one.

### Tuning

`npx tsx scripts/challengeLab.ts short 200` plays the real table with a scripted player in your seat:

- **fold**: folds everything, checks when it's free.
- **shove**: all in every hand.
- **chart**: a simple push/fold chart: first in, shove a range that widens as the stack shrinks and fewer players
  are left to act; call an all-in only with a hand well ahead of a shoving range.
- **strong**: the bots' own brain playing a shark (it plays push/fold when short).

The targets were: always-fold out by about hand 12, always-shove about 25, a push/fold chart about 40, and a strong
player near the cap only sometimes.

200 runs each, the schedule as built (hands survived; shoves per run):

| Player | Mean | 10th pct | Median | 90th pct | At the cap | Shoves | Won | Everyone folded | Peak bb |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| fold | 23.4 | 18 | 22 | 29 | 0% | 0 | 0 | 0 | 10.1 |
| shove | 3.9 | 0 | 2 | 11 | 0% | 3.5 | 1.9 | 1.1 | 18.5 |
| chart | 22.8 | 3 | 20 | 42 | 0% | 3.7 | 2.6 | 1.6 | 15.7 |
| strong | 16.7 | 2 | 13 | 38 | 0% | 3.3 | 2.3 | 1.4 | 15.3 |

None of the 800 runs reached 100 hands (in an earlier 40-run batch, 3% of chart runs did).

What I tried (40 runs each, the same seeds):

| Change | fold | shove | chart | strong |
| --- | --- | --- | --- | --- |
| As built: 1.5× every 6 hands, any bots | 24 | 4 | 23 | 16 |
| Tight bots only (rock, nervous, tag, trapper) | 25 | 4 | 20 | 18 |
| Bots 80% dulled (as in the campaign's easy rooms) | 26 | 4 | 12 | 17 |
| 2× every 6 hands | 18 | 3 | 8–13 | 14 |
| 2× every 5 hands | 19 | 4 | 11–15 | 12 |
| 2× every 4 hands | 18 | 3 | 9 | 9 |

What it shows:

- **Folding can't die by hand 12 at this schedule.** It's arithmetic: folding costs 1.5 big blinds an orbit, and
  1.5× every 6 hands takes a 10 bb stack to about 0.9 bb by hand 18. Blinds steep enough to finish it by 12 finish
  everyone else sooner too.
- **Always-shove can't last 25 against these bots.** They read a constant shover and call it correctly, and a short
  shove (under 10 big blinds) reaches their ordinary charts, which call wide. Each shove is called most of the time
  and loses about 60% of those, so it busts in two or three hands. Making it last 25 would mean bots that call a
  shove only with aces and kings, which would teach the wrong thing. I didn't change the bot brain for this: it
  plays at every table.
- **The order that matters holds where it can.** At the spec's schedule the chart player matches folding on
  average and has the long tail (it's the one that reaches 50, 60 and the cap); shoving everything is the worst.
  So the lesson the score teaches is the right one: pick your shoves.

I kept the spec's schedule (1.5× every 6 hands) and the full bot pool. `SHORT_STACK` in `challenges.ts` has the
knobs (`growth`, `every`, `refillBb`, `styles`, `dull`), and the lab takes them from the environment
(`GROWTH=2 EVERY=5 STYLES=rock,tag DULL=0.5`).

## Style Detective

- Six seats: you and five bots, 100 big blinds each (blinds 10/20, fixed), 60 hands, fast clock on.
- The ten styles fold into five plain labels (`STYLE_LABEL`), each with the bot picker's line for it:

  | Label | Styles |
  | --- | --- |
  | Rock | rock, nervous |
  | Shark | pro, shark, tag |
  | Calling Station | station, gambler |
  | Maniac | maniac, lag |
  | Trapper | trapper |

- The five bots are picked so at least four labels appear (`pickSuspects()`).
- Names and faces don't give a style away: every bot name in the roster belongs to one style, so a Detective bot
  plays its style (with the quirks of one of that style's regulars) under the name and face of another bot.
- The bots are quiet (`game.challenge.quiet`, checked in `botSays()`): each style has its own lines, so table talk
  would be the answer. Moves, timing, and cards a bot chooses to show are all fair to read.
- Busted players (you or a bot) get 100 big blinds again before the next deal, so all five stay to be read.
- Tap a bot's seat to tag it. The tag shows as a small chip on the seat.
- After hands 20, 40 and 60, "Read the table" asks for a label for every bot (your tags filled in). It says how
  many of the five are right, never which.
- **Score, per bot, once:** 30 if you had it right from the first check and kept it, 20 if right from the second,
  10 if right only at the last, otherwise 0. Up to 150 (`detectiveScore()`).
- After the last check, each bot's real label, a stat line from public play only ("Played 54% of hands, raised
  31%", `publicStats()`), and its style's line from the bot picker.
- The answer key is the bots' `style`, which only the phone's own copy of the table has; the screens get
  `redactForDevice()`'s view as at any table, and the check sheet gets only a count.

### Tuning

`npx tsx scripts/challengeLab.ts detective 40` plays Detective with a reader that only looks at the public numbers
(plays a lot and raises a lot: Maniac; plays a lot, raises little: Calling Station; plays little: Rock; and so on).

40 runs: a stats-only reader averages **41 of 150**. How often it had each style right at the last check, with the
numbers it was reading:

| Style | Label | Bots | Played | Raised | Read right |
| --- | --- | --- | --- | --- | --- |
| gambler | Calling Station | 24 | 47% | 20% | 21% |
| lag | Maniac | 23 | 36% | 27% | 9% |
| maniac | Maniac | 18 | 49% | 33% | 78% |
| nervous | Rock | 14 | 30% | 19% | 0% |
| pro | Shark | 9 | 30% | 20% | 78% |
| rock | Rock | 21 | 18% | 13% | 43% |
| shark | Shark | 14 | 34% | 25% | 86% |
| station | Calling Station | 18 | 38% | 14% | 17% |
| tag | Shark | 15 | 24% | 19% | 87% |
| trapper | Trapper | 44 | 25% | 16% | 20% |

So two numbers get you about a quarter of the points. Sharks and maniacs show themselves; nervous players,
calling stations and trappers only show up in how they play after the flop (who folds to a bet, who never raises,
who check-raises), which is the reading the challenge asks for. Trapper turns up more than the others because it's
the one style with a label to itself.

## Rewind

- Six seats with random bots, 100 big blinds each, blinds fixed, 30 hands, 3 Rewinds. No rebuys: a bust ends the
  run. **Score: your stack at the end, in big blinds** (0 if you went bust).
- Before each of your moves the phone keeps the table as it was (`DecisionPoint`, in memory only).
- After a hand you made a decision in, a Rewind button sits in the strip under the bar until the next hand's first
  move. The table's clock stops while its sheets are open.
- Rewind shows your decisions in that hand as a timeline. Pick one, pick something else from the engine's options
  (Fold, Check or Call, half the pot, the pot, All in; what you did and anything that comes to the same is left
  out), and the hand plays again from there with the same cards and deck order. The new line replaces the old one,
  better or worse.
- When the replayed hand ends: "What happened" (the first time) and "What if" (this time) in chips, then "How it
  usually goes": the cards you couldn't see (other players' hole cards and the rest of the deck) dealt again many
  times for each line, the bots playing on, and the average change over the hand in big blinds. Your later
  decisions in those runs are made by the bots' own brain playing a steady regular. Each round plays both lines on
  the same deal. Once everyone left is all in it stops and splits the pots by the odds (`equity()`).
- Replays are deterministic: the same spot and the same move always play out the same way (tested).

### Speed

`npx tsx scripts/challengeLab.ts rewind 12 100` times "how it usually goes" for 100 runs a line, two lines:

12 spots from a real Rewind table: median **723 ms**, slowest 1,146 ms in Node for 200 line-runs (about 4ms a run).

A phone's JavaScript engine (Hermes) is several times slower than Node's, and I couldn't measure on an iPhone
here. So the sheet measures on the device: it times its first 4 runs, sets the count to fit about 3 seconds (at
least 30, at most 200 a line), then runs in chunks of about 60ms with a progress bar and a Stop button. In
Chromium on a laptop it reaches the 200 cap well inside 3 seconds. On a mid-range iPhone, expect roughly 40 to 100.
Fill in a real figure after the first on-device run.

## Not built

- **Daily table** (Detective's stretch goal): the engine shuffles each hand from the table's random numbers as play
  goes, so two people's tables drift apart after the first move. A shared daily table would need decks seeded by
  date and hand number, which the engine doesn't have.
- No See all screen: there are three challenges, and it comes at five.

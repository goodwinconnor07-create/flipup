# Report: measured tuning of FlipUp's bots

Branch `codex/bot-simulation-tuning`, starting commit `e61aa8c`. Nothing was merged, deployed or opened as a pull request.
Evidence and commands: `baseline.md`, `findings.md`, `rounds.md`, `results.json`, `results.csv`, `commands.log`.

## The short version

- The original description (bots fold to nearly every 3-bet; hands end in folds or check-arounds) **was not reproduced** in
  simulation. Openers folded to a clean 3-bettor 44% of the time [38, 49] and 4-bet 19%; nine-handed, 70% of hands saw a flop and
  5% were checked down on every street. A hand history from the table where it happened is the quickest way to learn more.
- The study did find **one bug-like behaviour** (a bot can fold a hand far ahead of the price, for example a full house for
  30 chips into a pot of 1,945) and **one design inconsistency** (tight styles stay equally tight heads-up). Both are fixed with
  small changes, and a unit test covers the first.
- On fresh seeds the fixes **did what they were meant to** and **did not visibly make the bots stronger, weaker or more alike**, but
  the study is too small to prove that nothing moved by a modest amount. The price floor's real-play effect is small (it removes
  a rare blunder).
- Bot-only nine-handed tables run **hot** (about one hand in five has an all-in; average pot 96 to 101 big blinds). That's the
  first thing to check with real players.

## What changed in the bots (`src/game/botPlay.ts`, about 20 lines)

1. **Price floor.** A bot that can't check, whose chance of winning against the range it imagines is over 0.5 and is more than
   three times the price of the call, no longer folds. This extends the existing "nobody folds the near-nuts" guard (chance over
   0.92) to cheap prices. It fixes a case where the nervous bot folded a full house for 30 chips (the unit test shows the baseline
   folding that spot 5.9% of the time as nervous and 3.2% as pro; the candidate never does).
2. **Table-size-aware tight cutoff.** The tight styles' hand-strength cutoff drops by up to 0.14 as the table shrinks (full at six
   players or more), by the same amount for each, so their order is preserved. Heads-up, rock, tag, trapper and nervous play
   a few more hands; pro, shark, lag, station, gambler and maniac are unaffected.

Tests added in `src/game/bots.test.ts` (`bot blunders and table size`): a full house is never folded for a tiny price by four
different styles; the nervous bot still folds a weak hand to a big bet (so the floor isn't a general fold ban); the tight cutoff
only moves below six players and keeps the style order.

## Confirmation on untouched seeds

Candidate (commit `441cd8b`, frozen before these seeds were used) against the baseline engine: 85 matched sessions, 14,880 hands
per arm, seeds from 900000 (never used in tuning). Paired by session: same cards, seats, bot names. 0 chip leaks, 0 illegal moves,
0 stuck sessions in either arm.

### What reproduced and what held

| Finding / change | Confirmation result |
|---|---|
| Table shape (nine-handed: ~70% flops, ~37% showdowns, 5% checked all the way, avg pot ~100 bb, ~21% hands with an all-in) | Reproduced exactly. |
| Tight styles ignore table size | **Reproduced.** Baseline heads-up VPIP: pro 59%, tag 28%, trapper 28%, rock 19%. |
| Round 3 fix (heads-up VPIP, difference in points) | **Held.** tag +7.5 [1.2, 12.1], trapper +5.8 [2.5, 8.4], rock +6.2 [2.8, 9.8], nervous +4.0 [1.7, 6.7]. Rock stays the tightest (26% against tag 36%, trapper 34%). Nine-handed VPIP unchanged. |
| Round 3 and win rate | No measurable effect. Heads-up bb/100 differences all inside their intervals (tag +23 [−89, 86], trapper −47 [−92, 25], rock +6 [−25, 73]). |
| Nervous folds strong hands to small bets (baseline 17% [10, 24]) | **Partly reproduced**: 3 of 37 (8%) in the baseline arm; the candidate 2 of 40 (5%), difference −3.1 points [−10, +5.6]. The right direction, too few spots to be sure. The bug itself is proven by the unit test, not by this count. |
| Pro and shark are indistinguishable by observable play | Reproduced: closest pair 0.27 (noise between two halves of the same data: 0.32). |
| Bots not clearly beating the value-bettor, aggressive and casual scripts | **Not reproduced; inconclusive.** Signs flipped between sets (for example casual: bots −49 on development seeds, +80 here, both intervals contain zero). The confirmation plan also had few heads-up sessions against the last archetypes (timid 3, aggressive 0), so this question needs its own, larger run. |

### Difficulty (bb/100, bot seats, all scenarios, paired by session)

| Style | Baseline | Candidate | Difference |
|---|---|---|---|
| pro | 70.18 | 72.46 | +2.28 [-33, +45] |
| shark | 11.92 | 22.58 | +11 [-32, +62] |
| tag | 63.33 | 45.65 | -18 [-49, +9.08] |
| lag | 116 | 80.58 | -36 [-94, +24] |
| trapper | 29.97 | 27.54 | -2.43 [-22, +19] |
| rock | 95.71 | 75.49 | -20 [-52, +3.80] |
| station | -160 | -144 | +16 [-22, +56] |
| gambler | -55.72 | -24.41 | +31 [-1.47, +66] |
| maniac | -155 | -147 | +8.52 [-71, +86] |
| nervous | -0.10 | 6.64 | +6.74 [-37, +62] |

Nothing is significantly different. The soft styles are still soft (station −144, maniac −147, gambler −24; nervous about break-even
in both arms, so it was never very soft in this mix). The one change that might matter is **gambler: +31 [−1, +66]** (it loses
less); that's possible weakening of a forgiving bot and worth a second look. Tag (−18), lag (−36) and rock (−20) are slightly lower
and pro, shark and trapper are flat, none outside noise. I can't rule out a small shift in either direction.

### Behaviour (selected; full tables in the comparison files)

- 13 of 127 style-by-metric comparisons are flagged at 95%; with this many comparisons about six would be flagged by chance,
  and the comparisons overlap, so these are best read as "nothing large".
- The cluster that looks real: **shark** folds to bets 4.0 points less [−6.2, −1.6], goes to showdown 2.8 points more [1.1, 5.0] and
  3-bets 1.0 point less. That's the price floor reaching more spots for the style with the most accurate range reading. It is a
  small, coherent change in the direction the floor pushes.
- Other flagged rows (rock and maniac VPIP +0.7 and +0.8 points, rock 3-bet −0.8, gambler weak-hand calls of big bets +7.3 points,
  tag and station short-stack shoves, the casual script +50 bb/100 and the station script −72 bb/100) have no mechanism I can
  attribute to the changes and are small-sample or multiple-comparison candidates; they are listed so they aren't hidden.

| Archetype | Baseline | Candidate | Difference |
|---|---|---|---|
| casual | -28.35 | 21.92 | +50 [+15, +87] * |
| station | -159 | -231 | -72 [-106, -7.63] * |
| tightPassive | -30.42 | -35.88 | -5.46 [-12, +3.19] |
| bluffer | -57.66 | -77.09 | -19 [-73, +25] |
| valueBettor | 217 | 200 | -16 [-107, +66] |
| timid | -37.61 | -37.27 | +0.34 [+0.00, +0.88] |
| aggressive | -466 | -466 | +0.00 [–, –] |

### Personality

Mean pairwise distance 1.15 → 1.14; closest pair 0.27 → 0.33; separation ratio 3.6 → 3.3.

Nearest style: pro: shark 0.27 → shark 0.34; shark: pro 0.27 → pro 0.34; tag: trapper 0.37 → trapper 0.33; lag: shark 0.55 → shark 0.48; trapper: tag 0.37 → tag 0.33; rock: tag 0.67 → tag 0.63; station: trapper 1.23 → trapper 1.20; gambler: lag 0.76 → lag 0.79; maniac: lag 1.14 → lag 1.21; nervous: tag 0.87 → tag 0.82.

Behavioural separation between styles did not drop (mean pairwise distance 1.15 → 1.14, closest pair 0.27 → 0.33). The one
place where a change touched identity is heads-up, where the tight styles now play 4 to 8 points more hands each while keeping
their order. Four bots per style are still clones of each other (see `findings.md`, finding 5), and pro and shark are still the
hardest pair to tell apart; I didn't change either because that is a design choice, not a measured defect.

### Tables

| Scenario | Flops base → cand | Showdowns | Raised pots, 3+ players | Avg pot (bb) |
|---|---|---|---|---|
| full9-bots | 70% → 70% | 37% → 37% | 25% → 25% | 101 → 100 |
| full9-one-archetype | 76% → 75% | 41% → 41% | 30% → 27% | 96 → 92 |
| six-bots | 59% → 60% | 26% → 28% | 11% → 11% | 44 → 46 |
| six-medium-stack | 60% → 60% | 30% → 30% | 12% → 12% | 42 → 42 |
| six-high-blind | 55% → 56% | 39% → 40% | 12% → 12% | 21 → 22 |
| six-two-archetypes | 68% → 68% | 36% → 37% | 13% → 13% | 33 → 34 |
| hu-bots | 39% → 42% | 16% → 16% | 0% → 0% | 16 → 17 |
| hu-archetype | 35% → 36% | 15% → 15% | 0% → 0% | 7 → 7 |
| full9-short-stack | 73% → 71% | 47% → 47% | 23% → 22% | 42 → 42 |

## Difficulty and personality assessment

Difficulty tiers that were already there (strong = pro, shark, tag, lag, trapper; soft = station, gambler, maniac, nervous; rock
as a tight middle) look the same before and after. In the confirmation baseline arm the soft styles lose (station −160, maniac −155,
gambler −56), nervous breaks even, and the strong styles win (pro +70, tag +63, lag +116, rock +96, trapper +30, shark +12; the
intervals are wide). I did not push any style toward one "best" policy: the changes touch only a rare blunder and a cutoff that
only moves below six players.

## Remaining extreme behaviour and cheap exploits

- **Hot full-ring tables** (see above). Unchanged. The maniac/lag/gambler mix drives most of it.
- **Short-handed folding of the nit styles** is reduced but not gone (rock still folds three hands in four heads-up).
- **Folding to the first raise**: each bot folds about two times in three to an opening raise (probe, 2,289 spots), which is
  normal for a full ring, but a human who raises every hand in position gets a lot of folds. The bots' answers to a 3-bet were
  reasonable (finding 2).
- **Pro folds strong hands to small bets** in 3 of 36 and 3 of 39 spots (both arms) in the confirmation set; I don't know
  whether this is a leak or a read, and the price floor does not touch it.
- **Bluffing the calling station**: tag and nervous still bluff it (thin evidence).
- **Nervous bluff share (46–48%)** sits oddly with its description; unexplained (`findings.md`, finding 10).

## Limits

- **bb/100 is a rough measure here.** Stacks are topped up only when someone reaches zero, so a table can drift into one big stack
  and short stacks for a while; blinds never go up; the numbers mix 100, 40, 20 and 10 big blind tables in proportion to how many
  sessions each had. Treat bb/100 as a direction with a wide interval, and prefer the behaviour rows.
- **Chaos after a change.** Once two arms make a different decision, the rest of the hand differs, so pairing helps only until
  then. Session-level intervals are wide (the unit of independence is a session, 20 to 500 hands).
- **Coverage.** Seat-hands per bot name in the baseline study: 2,120 to 2,920 (median 2,560), 40 of 40 bots
  seated, but every bot of a style plays the same, so the 10 styles are the real units (8,500 to 10,000 seat-hands each). The
  confirmation plan took 75% of the development sessions, which left the last archetypes thin in heads-up play (timid 3 sessions,
  aggressive none).
- **Seat order.** The host (a person seat) is always seat 0 and scripts are seated after the bots, so who sits next to whom is
  less varied than in real games; the button moves every hand, which varies positions.
- **The host seat in bot-only tables is not a bot** (no mood or talk), and bot statistics never use it.
- **Scripts are test policies, not people,** and the numbers against them don't predict how people do.
- **Not measured:** fun, readability of a bot to a person, tilt over many hands, table talk, timing in the app (latency here is the
  CPU time of a step on this machine; the confirmation set had one 163 ms outlier in the candidate arm against 46 ms in the
  baseline, with matching distributions otherwise).
- **Multiple comparisons.** I looked at about 130 comparisons per arm; a few will look significant by chance.

## Compute

Simulated 81,570 hands (cap 82,000) in 584 sessions: pilot 2,010; baseline study 20,000; heads-up re-run with the second counter
set 4,200; 3-bet probe 4,000; rounds 7,100, 8,300 and 6,200; confirmation 14,880 per arm. About **6,400 CPU-seconds** in total
(roughly 38 minutes of wall time with three workers on four cores; the cap was two hours). No credentials, external services or
paid compute were used. The tools are CPU-only.

## Manual playtest checklist (about 20 minutes)

1. **Nine-handed, eight random bots, 40 hands.** Count how often you see a flop, how often a raise gets two or more callers, and
   how often a hand is checked down. Is it livelier or flatter than a pub game? (The lab says about 70% flops and 5% checked
   down.)
2. **3-bet test.** From late position, 3-bet an opener 10 times, with different sizes (about 3×, 4.5× and all in) and against both early- and
   late-position opens. Write down fold, call and 4-bet, and tell me the size where it seems wrong.
3. **Recognise the styles.** After 40 hands, can you name the nit, the station and the maniac without being told? Do two of them
   feel the same?
4. **Heads-up against a rock, tag or trapper.** Do they still fold most small blinds? Do they feel like themselves?
5. **A big pot.** Watch for a bot folding a very strong hand for a tiny call. Report any you see (hand history helps).
6. **Short stacks (10 to 20 big blinds).** Do the shoves and calls look plausible?
7. **Hot tables.** Does an all-in in about one hand in five feel like a pub game, or too much?
8. **Pace.** Does a nine-handed table feel too slow or too fast to play?

## Next steps

1. Get a hand history or screen recording from the table where the 3-bet and "everyone folds" problem showed up. Without it the
   original complaint is unexplained.
2. Run the 3-bet probe with other sizes and positions (the study only tried about 3.5× the open).
3. Decide whether four clone bots per style is what you want. If not, small per-bot offsets (a few points of VPIP or bluffing)
   would make Max and Rex different people without changing the families.
4. Decide on the pro/shark question (keep them close, or give shark a visible edge such as more aggression).
5. If playtesting finds the full ring too hot, test lowering the maniac/lag/gambler 3-bet and 4-bet rates with this lab. Don't
   widen full-ring ranges; the data doesn't show a need.
6. A larger heads-up run against every archetype (the confirmation was thin there) would settle whether the bots really lag
   a straightforward value bettor or an aggressive raiser.

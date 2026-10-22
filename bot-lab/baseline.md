# Baseline: how the bots play at the starting commit (e61aa8c)

This is the untouched starting point every candidate is compared with. The frozen engine is in
`engines/baseline/game` (a copy of `src/game` at e61aa8c with the tests and `botSim.ts` removed).

## The design, in the terms that matter for this experiment

- **Ten styles, forty named bots.** Each bot is one of ten styles, four bots per style. A bot's play depends only on its
  style: there are no per-bot settings, so the four bots of a style are behavioural clones (the names, pictures and
  talk lines differ). Differences between *families* are the personalities.
- **Intentional weaknesses** (written in `botStyles.ts`): station calls too much and never raises; maniac and gambler spew;
  nervous folds to pressure and bets small; rock and tag only play strong hands; gambler chases draws; every style has
  a `wobble` (how much its choices wander) and a `tilt` (how easily bad beats get to it).
- **Difficulty tiers already in the docs** (`docs/BOTS.md`, `scripts/botLab.ts`): strong = pro, shark, tag, lag, trapper;
  soft = station, gambler, maniac, nervous; rock is a tight middle. The lab expects strong styles to beat an honest player and
  soft ones to lose to one.
- **Randomness.** `ctx.rng` drives the shuffle (Fisher-Yates), the bots' mixed choices and their talk. Production uses Web
  Crypto (`cryptoRng`); the shuffle itself passes a chi-square test over 520,000 shuffles (checked before this study).
  In the lab the dealing uses a *separate* seeded stream that restarts on every hand number, so a chance seed deals the
  same cards whatever the bots do (proved in the pilot: 100 of 100 hands identical with a different decision seed).
- **Faithfulness of the simulator.** It runs the real `applyAction()` with a clock and ticks, with scripted players joining
  as people, bots seated by name, rebuys on and the same chip stacks and blinds a table can have. Differences from
  production, all of which matter for how far to trust it:
  1. Seat 0 is the host, a *person* seat. In bot-only tables the host plays a bot brain (`brain:<name>`); it is not
     flagged as a bot, so it has no mood, grudges or table talk. Bot statistics here only ever use real bot seats; the host seat only
     supplies an opponent.
  2. Scripts (the archetypes) are simple test policies, not models of people.
  3. Blinds never go up inside a session (no blind levels), stacks are topped up when someone busts, and
     there is no turn clock (production bot-only tables have none either).
  4. Per-decision timing measured here is CPU time of the whole step on this machine, not the in-game thinking delay.

## Coverage and compute

Pilot: 2,010 hands (27 sessions, 36 s wall, 3 workers). Baseline study: 20,000 hands (113 sessions, 724 s wall, 3 workers, 2,026 CPU-seconds). A second counter set was added after the baseline study began; the `hu-archetype` scenario was re-run with it (4,200 hands, 12 s; the old counters came out **identical in all 70 sessions**, which also shows the simulator is reproducible across code changes) and a 3-bet probe was added (4,000 hands, 137 s). Total simulated so far: 30,210 hands.

## Exposure

Bots that appeared: 40 of 40. Seat-hands per bot: min 2120, median 2560, max 2920.

| Style | Bots seen | Seat-hands | Bot decisions |
|---|---|---|---|
| pro | 4/4 | 10020 | 15253 |
| shark | 4/4 | 10720 | 16172 |
| tag | 4/4 | 10320 | 14268 |
| lag | 4/4 | 10120 | 15914 |
| trapper | 4/4 | 10020 | 14532 |
| rock | 4/4 | 10320 | 12775 |
| station | 4/4 | 10320 | 19877 |
| gambler | 4/4 | 10220 | 19505 |
| maniac | 4/4 | 10420 | 20398 |
| nervous | 4/4 | 10420 | 15137 |

| Archetype | Sessions | Seat-hands |
|---|---|---|
| casual | 13 | 1600 |
| station | 13 | 1600 |
| tightPassive | 13 | 1600 |
| bluffer | 13 | 1600 |
| valueBettor | 13 | 1600 |
| timid | 13 | 1600 |
| aggressive | 13 | 1600 |

Per bot name: Anna (station) 2520, Bea (station) 2520, Cole (shark) 2760, Dot (nervous) 2660, Eli (lag) 2860, Emma (shark) 2720, Finn (tag) 2820, Gus (rock) 2260, Hana (gambler) 2420, Iggy (trapper) 2520, Ivy (nervous) 2520, Jax (lag) 2120, Kai (pro) 2420, Kiki (station) 2660, Leo (pro) 2620, Luna (gambler) 2560, Mags (trapper) 2620, Max (maniac) 2520, Milo (station) 2620, Ned (nervous) 2920, Nora (pro) 2460, Ora (shark) 2520, Otis (rock) 2520, Pia (nervous) 2320, Pip (gambler) 2520, Quinn (tag) 2360, Remi (rock) 2620, Rex (maniac) 2560, Rosa (lag) 2720, Sage (trapper) 2260, Stan (rock) 2920, Tess (tag) 2520, Tex (maniac) 2620, Theo (tag) 2620, Uma (shark) 2720, Vic (lag) 2420, Wren (gambler) 2720, Yuki (pro) 2520, Ziggy (maniac) 2720, Zoe (trapper) 2620

## Tables

| Scenario | Sessions | Hands | Seats | Stack (bb) | Flops | Showdowns | Raised pots, 3+ players | Limped flops | 3-bet pots | Checked all the way | Avg pot (bb) | All-in hands | Hands/s |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| full9-bots | 6 | 3000 | 9 | 100 | 69% | 37% | 22% | 6% | 38% | 5% | 87 | 19% | 5 |
| full9-one-archetype | 7 | 2800 | 9 | 100 | 72% | 40% | 28% | 5% | 41% | 6% | 102 | 24% | 5 |
| full9-short-stack | 3 | 1200 | 9 | 20 | 72% | 48% | 26% | 4% | 39% | 16% | 41 | 38% | 6 |
| six-bots | 4 | 2000 | 6 | 100 | 53% | 25% | 10% | 11% | 21% | 3% | 31 | 7% | 11 |
| six-medium-stack | 3 | 1500 | 6 | 40 | 65% | 42% | 20% | 9% | 32% | 6% | 74 | 27% | 9 |
| six-high-blind | 3 | 1200 | 6 | 10 | 59% | 40% | 11% | 8% | 26% | 21% | 20 | 33% | 11 |
| six-two-archetypes | 7 | 2100 | 5 | 100 | 68% | 36% | 14% | 19% | 17% | 6% | 44 | 10% | 11 |
| hu-bots | 10 | 2000 | 2 | 100 | 36% | 15% | 0% | 18% | 7% | 2% | 11 | 3% | 49 |
| hu-archetype | 70 | 4200 | 2 | 100 | 32% | 13% | 0% | 18% | 4% | 3% | 8 | 2% | 147 |

## How each style played (bot seats only; 95% bootstrap over sessions)

| Style | Seat-hands | VPIP | PFR | Limp | 3-bet | Opener folds to 3-bet | C-bet | Aggression (bets+raises per call) | Fold to bet | Went to showdown | Won at showdown | Bluff share of bets | Avg bet size (x pot) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pro | 8920 | 27% [25%, 30%] | 18% [17%, 21%] | 1% [1%, 2%] | 8% [7%, 10%] | 56% [52%, 60%] | 58% [54%, 63%] | 2.07 [1.80, 2.47] | 46% [43%, 49%] | 37% [32%, 43%] | 58% [54%, 63%] | 37% [32%, 43%] | 0.85 [0.82, 0.89] |
| shark | 9220 | 30% [27%, 34%] | 21% [19%, 24%] | 1% [1%, 2%] | 10% [8%, 11%] | 64% [55%, 72%] | 52% [47%, 58%] | 2.04 [1.70, 2.50] | 44% [40%, 48%] | 41% [33%, 49%] | 55% [51%, 61%] | 31% [26%, 36%] | 0.84 [0.80, 0.88] |
| tag | 8520 | 22% [21%, 23%] | 16% [15%, 17%] | 0% [0%, 1%] | 9% [7%, 11%] | 56% [51%, 61%] | 56% [51%, 62%] | 2.37 [1.97, 2.87] | 45% [42%, 48%] | 40% [36%, 45%] | 55% [51%, 60%] | 35% [30%, 41%] | 0.73 [0.71, 0.76] |
| lag | 9220 | 32% [30%, 35%] | 23% [21%, 25%] | 1% [1%, 2%] | 12% [12%, 14%] | 50% [44%, 55%] | 63% [60%, 68%] | 2.61 [2.17, 3.28] | 38% [35%, 41%] | 46% [40%, 52%] | 51% [47%, 55%] | 45% [41%, 49%] | 0.77 [0.76, 0.78] |
| trapper | 8620 | 23% [21%, 24%] | 14% [13%, 16%] | 1% [1%, 2%] | 7% [6%, 8%] | 57% [48%, 66%] | 60% [56%, 64%] | 2.06 [1.67, 2.65] | 36% [33%, 38%] | 45% [41%, 47%] | 51% [47%, 54%] | 36% [31%, 41%] | 0.79 [0.76, 0.82] |
| rock | 9320 | 15% [14%, 16%] | 11% [10%, 12%] | 0% [0%, 0%] | 7% [6%, 8%] | 59% [48%, 69%] | 46% [39%, 53%] | 2.35 [1.84, 3.17] | 51% [48%, 54%] | 38% [33%, 44%] | 57% [52%, 62%] | 19% [14%, 26%] | 0.93 [0.90, 0.95] |
| station | 9220 | 37% [36%, 39%] | 11% [10%, 13%] | 6% [4%, 8%] | 4% [4%, 5%] | 34% [28%, 42%] | 40% [35%, 44%] | 0.71 [0.63, 0.84] | 18% [17%, 20%] | 62% [59%, 65%] | 49% [47%, 52%] | 32% [27%, 37%] | 0.53 [0.52, 0.54] |
| gambler | 9420 | 46% [44%, 47%] | 16% [15%, 17%] | 6% [4%, 8%] | 10% [9%, 11%] | 28% [24%, 32%] | 71% [66%, 74%] | 1.77 [1.50, 2.05] | 25% [22%, 27%] | 54% [50%, 58%] | 43% [40%, 46%] | 54% [51%, 57%] | 0.82 [0.80, 0.85] |
| maniac | 10020 | 52% [50%, 54%] | 34% [33%, 36%] | 3% [2%, 4%] | 25% [23%, 26%] | 28% [24%, 34%] | 69% [67%, 72%] | 3.42 [3.07, 4.09] | 32% [30%, 34%] | 56% [52%, 60%] | 46% [44%, 48%] | 56% [54%, 58%] | 0.94 [0.92, 0.96] |
| nervous | 9520 | 26% [24%, 28%] | 14% [13%, 15%] | 2% [1%, 2%] | 7% [6%, 8%] | 47% [39%, 53%] | 57% [53%, 62%] | 2.46 [2.19, 2.84] | 57% [55%, 59%] | 38% [32%, 44%] | 58% [53%, 62%] | 46% [42%, 50%] | 0.51 [0.49, 0.54] |

## Results by style (bb/100, all scenarios, bot seats only)

| Style | Seat-hands | bb/100 |
|---|---|---|
| pro | 8920 | 112 [24.73, 213] |
| shark | 9220 | 38.39 [-23.83, 99.74] |
| tag | 8520 | 130 [46.55, 251] |
| lag | 9220 | -12.34 [-57.77, 51.22] |
| trapper | 8620 | 16.72 [-34.66, 62.81] |
| rock | 9320 | 26.48 [-5.49, 77.91] |
| station | 9220 | -58.43 [-98.03, -11.30] |
| gambler | 9420 | -120 [-225, -20.53] |
| maniac | 10020 | -78.02 [-201, 40.04] |
| nervous | 9520 | 10.88 [-31.47, 49.60] |

## Scripted archetypes (all scenarios)

| Archetype | Seat-hands | bb/100 | VPIP | PFR | Aggression (bets+raises per call) | Fold to bet | Went to showdown |
|---|---|---|---|---|---|---|---|
| casual | 1600 | -109 [-194, 57.63] | 36% [33%, 39%] | 8% [6%, 10%] | 0.68 [0.58, 0.84] | 21% [17%, 23%] | 53% [50%, 57%] |
| station | 1600 | -303 [-451, -124] | 61% [49%, 65%] | 0% [0%, 0%] | 0.16 [0.12, 0.21] | 28% [23%, 31%] | 62% [57%, 69%] |
| tightPassive | 1600 | 15.16 [-40.83, 78.21] | 12% [11%, 13%] | 3% [2%, 4%] | 0.27 [0.14, 0.45] | 61% [54%, 69%] | 33% [25%, 39%] |
| bluffer | 1600 | -244 [-350, -64.35] | 71% [66%, 75%] | 39% [35%, 46%] | 4.63 [3.24, 6.19] | 64% [56%, 71%] | 30% [22%, 35%] |
| valueBettor | 1600 | 34.96 [-42.06, 122] | 21% [18%, 23%] | 9% [7%, 10%] | 2.06 [1.49, 2.84] | 69% [61%, 76%] | 29% [20%, 36%] |
| timid | 1600 | -24.56 [-55.32, 1.73] | 10% [8%, 11%] | 1% [0%, 1%] | 0.75 [0.25, 1.67] | 96% [92%, 99%] | 18% [6%, 30%] |
| aggressive | 1600 | 133 [-83.07, 413] | 48% [43%, 52%] | 43% [37%, 47%] | 2.72 [2.16, 3.51] | 29% [24%, 33%] | 39% [33%, 45%] |

## Heads-up against each archetype

| Bot style \ opponent | casual | station | tightPassive | bluffer | valueBettor | timid | aggressive | All 7 |
|---|---|---|---|---|---|---|---|---|
| pro | -333 | 211 | 45.83 | 22.33 | -54.00 | 68.33 | 41.67 | 0.36 [-128, 95.45] |
| shark | 110 | 164 | 60.83 | 261 | 186 | 66.67 | -2.50 | 121 [61.29, 177] |
| tag | 120 | 28.33 | 35.83 | 111 | -3.33 | 40.83 | -161 | 24.48 [-42.40, 81.21] |
| lag | 12.83 | 20.83 | -52.50 | -170 | 71.67 | 83.33 | -533 | -80.98 [-247, 41.48] |
| trapper | 208 | 167 | 9.17 | 159 | -173 | 45.83 | -34.17 | 54.55 [-52.52, 136] |
| rock | -34.83 | 187 | 39.17 | 78.67 | 17.50 | 42.50 | 76.67 | 58.05 [15.07, 111] |
| station | 199 | 30.67 | 16.67 | 251 | -133 | 69.17 | -66.33 | 52.33 [-48.19, 150] |
| gambler | -530 | 144 | 9.17 | -62.17 | -195 | 55.00 | -118 | -99.40 [-278, 32.55] |
| maniac | -349 | 109 | -20.83 | -85.00 | -158 | 72.50 | -631 | -152 [-354, 10.76] |
| nervous | 103 | 32.67 | 51.67 | -112 | 125 | 20.83 | 118 | 48.60 [-10.19, 97.64] |

Bots as a field, heads-up against each archetype (bb/100 won by the bot; negative means the archetype is ahead):

| Opponent | Sessions | Hands | Bot bb/100 | Bot folds to bet | Bot bluffs folded out | Value bets taken when checked to |
|---|---|---|---|---|---|---|
| casual | 10 | 600 | -49.37 [-200, 90.65] | 37% | 13/89 (15%) | 51/66 (77%) |
| station | 10 | 600 | 109 [65.50, 152] | 40% | 38/147 (26%) | 92/121 (76%) |
| tightPassive | 10 | 600 | 19.50 [-1.75, 38.25] | 53% | 44/65 (68%) | 16/23 (70%) |
| bluffer | 10 | 600 | 45.47 [-41.07, 133] | 23% | 77/104 (74%) | 14/19 (74%) |
| valueBettor | 10 | 600 | -31.68 [-101, 45.90] | 33% | 37/54 (69%) | 7/11 (64%) |
| timid | 10 | 600 | 56.50 [45.58, 66.67] | 67% | 64/67 (96%) | 3/10 (30%) |
| aggressive | 10 | 600 | -131 [-288, 11.43] | 31% | 8/44 (18%) | 22/31 (71%) |

## Decision-quality probes (bot seats; hidden cards used only for this analysis)

| Style | Seat-hands | Strong hand folds to small bet | Weak hand calls big bet (turn/river) | Fold to 3/4-pot+ bet | Short-stack first-in shove |
|---|---|---|---|---|---|
| pro | 8920 | 3% [0%, 10%] | 13% [5%, 22%] | 56% [51%, 61%] | 23% [16%, 35%] |
| shark | 9220 | 3% [0%, 8%] | 14% [7%, 19%] | 51% [45%, 57%] | 32% [23%, 57%] |
| tag | 8520 | 0% [0%, 0%] | 14% [5%, 26%] | 52% [47%, 58%] | 20% [13%, 38%] |
| lag | 9220 | 2% [0%, 7%] | 32% [21%, 39%] | 43% [38%, 48%] | 37% [26%, 50%] |
| trapper | 8620 | 0% [0%, 0%] | 25% [18%, 32%] | 43% [39%, 46%] | 31% [25%, 36%] |
| rock | 9320 | 0% [0%, 0%] | 15% [0%, 35%] | 59% [55%, 64%] | 16% [12%, 31%] |
| station | 9220 | 0% [0%, 0%] | 43% [38%, 48%] | 23% [21%, 25%] | 27% [20%, 32%] |
| gambler | 9420 | 1% [0%, 4%] | 30% [22%, 37%] | 30% [27%, 33%] | 43% [34%, 56%] |
| maniac | 10020 | 2% [0%, 4%] | 15% [9%, 21%] | 42% [39%, 45%] | 38% [31%, 42%] |
| nervous | 9520 | 17% [10%, 24%] | 12% [5%, 19%] | 66% [62%, 70%] | 23% [21%, 25%] |

## Position

bb/100 by seat relative to the button, pooled over scenarios.

| Style | Late (BTN, CO) | Middle | Early | Blinds | Late minus early |
|---|---|---|---|---|---|
| pro | 89 | 253 | 5 | 151 | 84 |
| shark | 113 | -38 | 49 | -10 | 65 |
| tag | 58 | 238 | 179 | 83 | -121 |
| lag | 37 | 38 | -11 | -106 | 49 |
| trapper | 32 | -1 | 49 | -22 | -17 |
| rock | 22 | 115 | 14 | -26 | 9 |
| station | -74 | -37 | -10 | -102 | -64 |
| gambler | 13 | -230 | -201 | -125 | 214 |
| maniac | 43 | 160 | -207 | -283 | 250 |
| nervous | -9 | -1 | 10 | 44 | -19 |

## Adaptation over a session

| Archetype at the table | Sessions | Archetype bb/100, 1st half | 2nd half | Change [95% CI] |
|---|---|---|---|---|
| casual | 1 | 125 | -376 | -501 [–, –] |
| station | 1 | -103 | -1202 | -1099 [–, –] |
| tightPassive | 1 | 40 | -22 | -62.55 [–, –] |
| bluffer | 1 | -426 | -473 | -47.05 [–, –] |
| valueBettor | 1 | -112 | -80 | 32.45 [–, –] |
| timid | 1 | -7 | 88 | 95.50 [–, –] |
| aggressive | 1 | -252 | 155 | 406 [–, –] |

## Do personalities stay distinct?

Behavioural distance between styles, using vpip, pfr, threeBet, agg, foldToBet, cbet, wtsd, bluffShare, size, limp (each scaled by a fixed amount, so runs are comparable). Mean pairwise distance 1.08, closest pair 0.30; the same style measured on two halves of the sessions differs by 0.28 (noise floor). Separation ratio 3.9.

| | pro | shark | tag | lag | trapper | rock | station | gambler | maniac | nervous | Nearest |
|---|---|---|---|---|---|---|---|---|---|---|---|
| pro | · | 0.30 | 0.30 | 0.58 | 0.42 | 0.74 | 1.44 | 1.11 | 1.72 | 0.62 | shark (0.30) |
| shark | 0.30 | · | 0.39 | 0.58 | 0.50 | 0.73 | 1.34 | 1.13 | 1.65 | 0.79 | pro (0.30) |
| tag | 0.30 | 0.39 | · | 0.60 | 0.36 | 0.62 | 1.41 | 1.20 | 1.78 | 0.56 | pro (0.30) |
| lag | 0.58 | 0.58 | 0.60 | · | 0.63 | 1.16 | 1.45 | 0.83 | 1.21 | 0.84 | shark (0.58) |
| trapper | 0.42 | 0.50 | 0.36 | 0.63 | · | 0.77 | 1.17 | 0.98 | 1.80 | 0.75 | tag (0.36) |
| rock | 0.74 | 0.73 | 0.62 | 1.16 | 0.77 | · | 1.60 | 1.66 | 2.23 | 0.98 | tag (0.62) |
| station | 1.44 | 1.34 | 1.41 | 1.45 | 1.17 | 1.60 | · | 1.17 | 2.25 | 1.60 | trapper (1.17) |
| gambler | 1.11 | 1.13 | 1.20 | 0.83 | 0.98 | 1.66 | 1.17 | · | 1.40 | 1.32 | lag (0.83) |
| maniac | 1.72 | 1.65 | 1.78 | 1.21 | 1.80 | 2.23 | 2.25 | 1.40 | · | 1.94 | lag (1.21) |
| nervous | 0.62 | 0.79 | 0.56 | 0.84 | 0.75 | 0.98 | 1.60 | 1.32 | 1.94 | · | tag (0.56) |

## Does the host-brain seat match a real bot seat?

| Style | Bot seat VPIP | Host-brain seat VPIP | Bot PFR | Host-brain PFR | Host-brain seat-hands |
|---|---|---|---|---|---|
| pro | 27% | 49% | 18% | 32% | 1100 |
| shark | 30% | 26% | 21% | 19% | 1500 |
| tag | 22% | 22% | 16% | 17% | 1800 |
| lag | 32% | 31% | 23% | 22% | 900 |
| trapper | 23% | 23% | 14% | 14% | 1400 |
| rock | 15% | 14% | 11% | 10% | 1000 |
| station | 37% | 41% | 11% | 14% | 1100 |
| gambler | 46% | 49% | 16% | 22% | 800 |
| maniac | 52% | 37% | 34% | 23% | 400 |
| nervous | 26% | 22% | 14% | 12% | 900 |

## Speed

Bot/host decisions: 163831. Mean 6.35 ms per step that produced an action (includes the engine's own bookkeeping); slowest 84 ms.

| <1 ms | 1–2 | 2–5 | 5–10 | 10–20 | 20–50 | ≥50 |
|---|---|---|---|---|---|---|
| 7.2% | 5.9% | 23.3% | 47.8% | 15.8% | 0.1% | 0.0% |

Simulation throughput: 20000 hands in 2026 CPU-seconds (9.9 hands per CPU-second).



# Second counter set: 3-bet probe and v2 probes (hu-archetype re-run + probe tables, 8,200 hands)

## How bots answered raises and bets, by who made them (sessions with the second counter set)

| Spot | Spots | Fold [95% CI] | Call | Raise | Fold, 1st half | Fold, 2nd half |
|---|---|---|---|---|---|---|
| pre|3bet-cold|bot:gambler | 286 | 71% [66, 76] | 20% [16, 25] | 8% [6, 12] | 71% [62, 78] | 72% [64, 78] |
| pre|3bet-cold|bot:lag | 235 | 74% [68, 79] | 19% [15, 25] | 7% [5, 11] | 67% [58, 76] | 79% [71, 85] |
| pre|3bet-cold|bot:maniac | 548 | 70% [66, 73] | 18% [15, 22] | 12% [9, 15] | 71% [65, 76] | 69% [63, 74] |
| pre|3bet-cold|bot:nervous | 155 | 77% [70, 83] | 19% [13, 26] | 5% [2, 9] | 77% [66, 85] | 77% [67, 85] |
| pre|3bet-cold|bot:pro | 231 | 76% [70, 81] | 15% [11, 20] | 9% [6, 13] | 80% [72, 86] | 72% [63, 80] |
| pre|3bet-cold|bot:rock | 108 | 78% [69, 85] | 15% [9, 23] | 7% [4, 14] | 76% [62, 85] | 80% [68, 88] |
| pre|3bet-cold|bot:shark | 288 | 75% [70, 80] | 16% [12, 21] | 9% [6, 13] | 76% [67, 82] | 75% [67, 81] |
| pre|3bet-cold|bot:station | 139 | 73% [65, 79] | 22% [16, 29] | 6% [3, 11] | 63% [50, 74] | 79% [69, 87] |
| pre|3bet-cold|bot:tag | 233 | 77% [71, 82] | 14% [10, 19] | 9% [6, 14] | 79% [71, 86] | 74% [65, 81] |
| pre|3bet-cold|bot:trapper | 146 | 74% [66, 80] | 18% [12, 25] | 8% [5, 14] | 78% [66, 86] | 71% [60, 80] |
| pre|3bet-cold|threeBettor | 986 | 71% [68, 74] | 17% [15, 20] | 12% [10, 14] | 73% [69, 76] | 69% [64, 73] |
| pre|3bet-opener|aggressive | 27 | 26% [13, 45] | 56% [37, 72] | 19% [8, 37] | 36% [15, 65] | 19% [7, 43] |
| pre|3bet-opener|bot:gambler | 101 | 39% [30, 48] | 48% [38, 57] | 14% [8, 22] | 40% [28, 54] | 37% [25, 51] |
| pre|3bet-opener|bot:lag | 84 | 37% [27, 48] | 48% [37, 58] | 15% [9, 25] | 37% [24, 52] | 37% [24, 52] |
| pre|3bet-opener|bot:maniac | 172 | 40% [33, 48] | 38% [31, 45] | 22% [17, 29] | 42% [33, 53] | 38% [28, 48] |
| pre|3bet-opener|bot:nervous | 46 | 30% [19, 45] | 50% [36, 64] | 20% [11, 33] | 38% [21, 57] | 23% [10, 43] |
| pre|3bet-opener|bot:pro | 58 | 40% [28, 53] | 41% [30, 54] | 19% [11, 31] | 52% [35, 68] | 26% [13, 45] |
| pre|3bet-opener|bot:rock | 37 | 57% [41, 71] | 30% [17, 46] | 14% [6, 28] | 56% [33, 77] | 57% [37, 76] |
| pre|3bet-opener|bot:shark | 82 | 51% [41, 62] | 33% [24, 44] | 16% [10, 25] | 50% [35, 65] | 52% [38, 66] |
| pre|3bet-opener|bot:station | 50 | 46% [33, 60] | 34% [22, 48] | 20% [11, 33] | 50% [30, 70] | 43% [27, 61] |
| pre|3bet-opener|bot:tag | 64 | 58% [46, 69] | 25% [16, 37] | 17% [10, 28] | 55% [40, 70] | 62% [43, 78] |
| pre|3bet-opener|bot:trapper | 48 | 46% [33, 60] | 29% [18, 43] | 25% [15, 39] | 48% [28, 68] | 44% [28, 63] |
| pre|3bet-opener|casual | 11 | 55% [28, 79] | 27% [10, 57] | 18% [5, 48] | 50% [19, 81] | 60% [23, 88] |
| pre|3bet-opener|threeBettor | 312 | 44% [38, 49] | 38% [32, 43] | 19% [15, 24] | 43% [35, 51] | 44% [37, 52] |
| pre|3bet-opener|tightPassive | 2 | 100% [34, 100] | 0% [0, 66] | 0% [0, 66] | – | 100% [34, 100] |
| pre|3bet-opener|valueBettor | 10 | 90% [60, 98] | 0% [0, 28] | 10% [2, 40] | 100% [44, 100] | 86% [49, 97] |
| pre|4bet+|bot:gambler | 146 | 54% [46, 62] | 32% [25, 39] | 14% [10, 21] | 52% [42, 62] | 58% [44, 71] |
| pre|4bet+|bot:lag | 135 | 59% [50, 66] | 27% [21, 35] | 14% [9, 21] | 52% [39, 64] | 64% [52, 73] |
| pre|4bet+|bot:maniac | 446 | 52% [47, 56] | 31% [27, 35] | 17% [14, 21] | 48% [42, 55] | 56% [49, 62] |
| pre|4bet+|bot:nervous | 84 | 50% [40, 60] | 36% [26, 46] | 14% [8, 23] | 57% [42, 71] | 43% [30, 58] |
| pre|4bet+|bot:pro | 90 | 47% [37, 57] | 32% [23, 42] | 21% [14, 31] | 53% [39, 67] | 40% [28, 55] |
| pre|4bet+|bot:rock | 74 | 53% [41, 64] | 34% [24, 45] | 14% [8, 23] | 47% [30, 64] | 57% [42, 70] |
| pre|4bet+|bot:shark | 145 | 64% [56, 71] | 22% [16, 29] | 14% [9, 20] | 59% [48, 70] | 70% [58, 79] |
| pre|4bet+|bot:station | 71 | 49% [38, 61] | 39% [29, 51] | 11% [6, 21] | 43% [29, 58] | 59% [41, 74] |
| pre|4bet+|bot:tag | 99 | 69% [59, 77] | 18% [12, 27] | 13% [8, 21] | 66% [52, 78] | 71% [58, 82] |
| pre|4bet+|bot:trapper | 66 | 59% [47, 70] | 24% [16, 36] | 17% [10, 27] | 63% [45, 77] | 56% [39, 71] |
| pre|4bet+|casual | 6 | 17% [3, 56] | 67% [30, 90] | 17% [3, 56] | 33% [6, 79] | 0% [0, 56] |
| pre|4bet+|valueBettor | 5 | 0% [0, 43] | 100% [57, 100] | 0% [0, 43] | 0% [0, 56] | 0% [0, 66] |
| pre|open|aggressive | 225 | 41% [35, 48] | 32% [26, 38] | 27% [22, 33] | 39% [30, 49] | 43% [35, 52] |
| pre|open|bluffer | 268 | 45% [39, 51] | 36% [31, 42] | 19% [14, 24] | 47% [39, 56] | 43% [35, 51] |
| pre|open|bot:gambler | 844 | 77% [74, 80] | 15% [13, 18] | 8% [6, 10] | 77% [73, 81] | 77% [73, 81] |
| pre|open|bot:lag | 1316 | 74% [72, 76] | 18% [16, 21] | 7% [6, 9] | 73% [70, 77] | 75% [71, 78] |
| pre|open|bot:maniac | 1474 | 66% [64, 69] | 21% [19, 23] | 13% [11, 15] | 67% [63, 70] | 66% [62, 69] |
| pre|open|bot:nervous | 711 | 73% [70, 76] | 18% [15, 21] | 9% [7, 11] | 73% [69, 78] | 73% [68, 77] |
| pre|open|bot:pro | 892 | 75% [72, 78] | 15% [13, 18] | 10% [8, 12] | 74% [69, 78] | 76% [72, 80] |
| pre|open|bot:rock | 582 | 78% [74, 81] | 14% [11, 17] | 8% [6, 10] | 78% [73, 83] | 78% [73, 82] |
| pre|open|bot:shark | 1349 | 72% [69, 74] | 18% [16, 20] | 11% [9, 13] | 72% [69, 75] | 71% [67, 74] |
| pre|open|bot:station | 598 | 78% [75, 82] | 13% [11, 16] | 9% [7, 11] | 79% [75, 83] | 77% [71, 82] |
| pre|open|bot:tag | 880 | 74% [71, 77] | 17% [15, 20] | 9% [7, 11] | 72% [68, 76] | 76% [72, 80] |
| pre|open|bot:trapper | 871 | 77% [75, 80] | 16% [14, 19] | 6% [5, 8] | 77% [73, 80] | 78% [74, 82] |
| pre|open|casual | 41 | 54% [39, 68] | 34% [22, 49] | 12% [5, 26] | 68% [47, 84] | 37% [19, 59] |
| pre|open|threeBettor | 2289 | 68% [66, 70] | 19% [18, 21] | 13% [11, 14] | 69% [66, 72] | 67% [64, 69] |
| pre|open|tightPassive | 11 | 73% [43, 90] | 27% [10, 57] | 0% [0, 26] | 50% [19, 81] | 100% [57, 100] |
| pre|open|valueBettor | 41 | 76% [61, 86] | 15% [7, 28] | 10% [4, 23] | 81% [60, 92] | 70% [48, 85] |

| Spot | Spots | Fold [95% CI] | Call | Raise | Fold, 1st half | Fold, 2nd half |
|---|---|---|---|---|---|---|
| post|flop|aggressive | 84 | 33% [24, 44] | 45% [35, 56] | 21% [14, 31] | 35% [23, 49] | 32% [19, 47] |
| post|flop|bluffer | 142 | 16% [11, 23] | 47% [39, 55] | 37% [29, 45] | 13% [7, 23] | 20% [12, 31] |
| post|flop|bot:gambler | 499 | 35% [31, 39] | 49% [45, 53] | 16% [13, 20] | 36% [30, 42] | 33% [28, 39] |
| post|flop|bot:lag | 324 | 40% [35, 46] | 44% [39, 50] | 15% [12, 20] | 44% [37, 52] | 37% [30, 44] |
| post|flop|bot:maniac | 610 | 33% [29, 37] | 52% [48, 56] | 15% [12, 18] | 30% [25, 35] | 35% [30, 40] |
| post|flop|bot:nervous | 220 | 26% [21, 32] | 54% [47, 61] | 20% [15, 26] | 23% [16, 31] | 29% [21, 39] |
| post|flop|bot:pro | 140 | 39% [31, 47] | 41% [34, 50] | 20% [14, 27] | 38% [28, 49] | 39% [28, 52] |
| post|flop|bot:rock | 85 | 38% [28, 48] | 49% [39, 60] | 13% [7, 22] | 37% [23, 53] | 38% [26, 53] |
| post|flop|bot:shark | 214 | 32% [26, 38] | 43% [37, 50] | 25% [20, 31] | 32% [24, 41] | 32% [23, 42] |
| post|flop|bot:station | 163 | 42% [35, 50] | 38% [31, 46] | 20% [14, 26] | 42% [32, 53] | 43% [33, 53] |
| post|flop|bot:tag | 147 | 38% [31, 46] | 48% [40, 56] | 14% [9, 20] | 31% [22, 42] | 46% [35, 57] |
| post|flop|bot:trapper | 181 | 40% [33, 47] | 48% [41, 55] | 12% [8, 18] | 44% [34, 53] | 35% [25, 46] |
| post|flop|casual | 64 | 38% [27, 50] | 39% [28, 51] | 23% [15, 35] | 41% [26, 58] | 34% [20, 52] |
| post|flop|station | 10 | 50% [24, 76] | 20% [6, 51] | 30% [11, 60] | 60% [23, 88] | 40% [12, 77] |
| post|flop|threeBettor | 282 | 35% [29, 40] | 49% [43, 54] | 17% [13, 21] | 36% [29, 44] | 33% [25, 41] |
| post|flop|tightPassive | 4 | 25% [5, 70] | 0% [0, 49] | 75% [30, 95] | 0% [0, 56] | 100% [21, 100] |
| post|flop|timid | 1 | 0% [0, 79] | 0% [0, 79] | 100% [21, 100] | – | 0% [0, 79] |
| post|flop|valueBettor | 29 | 28% [15, 46] | 31% [17, 49] | 41% [26, 59] | 45% [21, 72] | 17% [6, 39] |
| post|river|aggressive | 28 | 29% [15, 47] | 64% [46, 79] | 7% [2, 23] | 27% [10, 57] | 29% [13, 53] |
| post|river|bluffer | 55 | 29% [19, 42] | 64% [50, 75] | 7% [3, 17] | 32% [18, 51] | 26% [13, 45] |
| post|river|bot:gambler | 165 | 36% [29, 43] | 57% [49, 64] | 7% [4, 12] | 31% [22, 42] | 40% [30, 51] |
| post|river|bot:lag | 70 | 27% [18, 39] | 59% [47, 69] | 14% [8, 24] | 21% [11, 38] | 32% [20, 49] |
| post|river|bot:maniac | 127 | 35% [28, 44] | 60% [51, 68] | 5% [2, 10] | 28% [19, 40] | 43% [31, 55] |
| post|river|bot:nervous | 53 | 30% [20, 44] | 57% [43, 69] | 13% [7, 25] | 21% [10, 40] | 40% [23, 59] |
| post|river|bot:pro | 32 | 38% [23, 55] | 50% [34, 66] | 13% [5, 28] | 47% [26, 69] | 27% [11, 52] |
| post|river|bot:rock | 21 | 14% [5, 35] | 81% [60, 92] | 5% [1, 23] | 21% [8, 48] | 0% [0, 35] |
| post|river|bot:shark | 53 | 40% [28, 53] | 45% [33, 59] | 15% [8, 27] | 48% [28, 68] | 34% [20, 52] |
| post|river|bot:station | 77 | 55% [43, 65] | 38% [28, 49] | 8% [4, 16] | 52% [38, 66] | 58% [41, 74] |
| post|river|bot:tag | 47 | 40% [28, 55] | 51% [37, 65] | 9% [3, 20] | 55% [34, 74] | 30% [16, 48] |
| post|river|bot:trapper | 55 | 38% [27, 51] | 55% [42, 67] | 7% [3, 17] | 47% [31, 63] | 24% [11, 45] |
| post|river|casual | 42 | 43% [29, 58] | 43% [29, 58] | 14% [7, 28] | 55% [35, 73] | 30% [15, 52] |
| post|river|station | 22 | 32% [16, 53] | 59% [39, 77] | 9% [3, 28] | 38% [18, 61] | 17% [3, 56] |
| post|river|threeBettor | 95 | 33% [24, 43] | 61% [51, 70] | 6% [3, 13] | 28% [18, 42] | 38% [25, 53] |
| post|river|tightPassive | 6 | 50% [19, 81] | 33% [10, 70] | 17% [3, 56] | 50% [15, 85] | 50% [9, 91] |
| post|river|timid | 1 | 100% [21, 100] | 0% [0, 79] | 0% [0, 79] | 100% [21, 100] | – |
| post|river|valueBettor | 13 | 38% [18, 64] | 46% [23, 71] | 15% [4, 42] | 38% [14, 69] | 40% [12, 77] |
| post|turn|aggressive | 50 | 28% [17, 42] | 64% [50, 76] | 8% [3, 19] | 32% [16, 53] | 25% [13, 43] |
| post|turn|bluffer | 84 | 31% [22, 41] | 60% [49, 69] | 10% [5, 18] | 36% [24, 50] | 24% [13, 40] |
| post|turn|bot:gambler | 326 | 33% [28, 38] | 56% [50, 61] | 11% [8, 15] | 37% [30, 45] | 30% [24, 37] |
| post|turn|bot:lag | 151 | 34% [27, 42] | 56% [48, 63] | 11% [7, 17] | 29% [20, 39] | 40% [29, 52] |
| post|turn|bot:maniac | 259 | 31% [26, 37] | 59% [53, 65] | 10% [7, 14] | 31% [24, 39] | 31% [23, 39] |
| post|turn|bot:nervous | 105 | 30% [22, 40] | 60% [50, 69] | 10% [5, 17] | 35% [24, 48] | 24% [14, 39] |
| post|turn|bot:pro | 68 | 38% [28, 50] | 47% [36, 59] | 15% [8, 25] | 27% [14, 44] | 47% [32, 63] |
| post|turn|bot:rock | 47 | 40% [28, 55] | 53% [39, 67] | 6% [2, 17] | 35% [19, 55] | 46% [28, 65] |
| post|turn|bot:shark | 97 | 39% [30, 49] | 55% [45, 64] | 6% [3, 13] | 42% [30, 56] | 36% [23, 50] |
| post|turn|bot:station | 146 | 42% [35, 51] | 46% [38, 54] | 12% [7, 18] | 37% [27, 48] | 48% [37, 59] |
| post|turn|bot:tag | 81 | 27% [19, 38] | 67% [56, 76] | 6% [3, 14] | 24% [14, 39] | 31% [18, 47] |
| post|turn|bot:trapper | 94 | 41% [32, 52] | 54% [44, 64] | 4% [2, 10] | 37% [26, 50] | 49% [33, 64] |
| post|turn|casual | 57 | 32% [21, 44] | 53% [40, 65] | 16% [9, 27] | 36% [21, 54] | 28% [15, 46] |
| post|turn|station | 8 | 50% [22, 78] | 50% [22, 78] | 0% [0, 32] | 50% [19, 81] | 50% [9, 91] |
| post|turn|threeBettor | 121 | 27% [20, 36] | 61% [52, 69] | 12% [7, 18] | 29% [20, 41] | 25% [15, 38] |
| post|turn|tightPassive | 5 | 80% [38, 96] | 20% [4, 62] | 0% [0, 43] | 67% [21, 94] | 100% [34, 100] |
| post|turn|timid | 1 | 100% [21, 100] | 0% [0, 79] | 0% [0, 79] | – | 100% [21, 100] |
| post|turn|valueBettor | 22 | 36% [20, 57] | 50% [31, 69] | 14% [5, 33] | 18% [5, 48] | 55% [28, 79] |

## Probes

| Style | Absurd folds (made hand, price 6-to-1 or better) | Monster folds to a bet | No-pair calls of big river bets |
|---|---|---|---|
| pro | 0/5 | 0/23 | 0/8 |
| shark | 0/4 | 2/23 | 0/5 |
| tag | 0/7 | 0/23 | 0/3 |
| lag | 1/9 | 0/28 | 1/2 |
| trapper | 1/8 | 0/25 | 0/0 |
| rock | 0/4 | 0/9 | 0/0 |
| station | 0/16 | 0/52 | 4/7 |
| gambler | 0/16 | 0/53 | 2/9 |
| maniac | 1/10 | 1/31 | 0/2 |
| nervous | 3/6 | 4/25 | 0/5 |


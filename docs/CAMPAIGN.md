# Tuning the campaign

How hard is each room, and how long does the climb from 1,000 chips take? `scripts/campaignLab.ts` answers both
with the real engine and bots. Rules are in `docs/RULES.md` (Campaign).

```
npx tsx scripts/campaignLab.ts places 150 out.json [agents] [venues]   # real tournaments, a scripted person in your seat
npx tsx scripts/campaignLab.ts climb out.json 400 180                   # whole campaigns, day by day, from those finishes
```

The person in your seat is one of four scripts standing in for real players: **beginner** (`lightBot`, abc calling
much lighter: calls too much), **decent** (`abc`: top hands, bets good ones, folds bad ones), **good** (the `tag` bot
brain at full strength) and **expert** (the `pro` bot brain).

## The rooms (150 tournaments a venue)

"Return" is what a buy-in brings back on average: the share of each place won, times what the prize draw averages.
Above 1.00x the player climbs on the poker alone; below, they only climb on the salary, missions, spins, goals,
bounties and the rare big draw. "Boss" is how often they knock the boss out themselves.

| Venue | Format | Beginner | Decent | Good | Expert | Boss knocked out (good) |
| --- | --- | --- | --- | --- | --- | --- |
| The Garage | Sit & Go | 1.38x | 1.31x | 1.38x | 1.20x | – |
| The Back Room | Jackpot | 0.73x | 0.83x | 1.15x | 1.28x | – |
| The Riverboat | Sit & Go | 0.78x | 1.15x | 0.95x | 1.20x | 15% |
| Downtown Casino | Jackpot | 0.64x | 0.70x | 1.09x | 1.02x | 37% |
| The Strip | Sit & Go | 0.62x | 0.87x | 0.80x | 0.95x | 16% |
| Monte Carlo | Jackpot | 0.49x | 0.62x | 0.98x | 0.98x | 36% |
| The Penthouse | Sit & Go | 0.68x | 1.03x | 0.94x | 0.89x | 9% |
| The Yacht | Jackpot | 0.47x | 0.64x | 0.92x | 1.03x | 29% |

Each cell is ±0.15 or so (150 tournaments of a game with a long-tailed prize). The shape is what matters: the
Garage pays everyone, so a new player gets going; from the Back Room up a beginner loses, a decent player loses at
the Jackpots, and good and expert players hover around even with the bots at full strength at the top.

## The climb (400 players over 180 days)

Each day: the salary (with the streak), the free spin, then up to 4 (about an hour) or 10 tournaments, buying into the
biggest open venue that costs no more than a fifth of the bankroll (or the cheapest they can afford when short),
then the day's missions (one for every two games played, all three on a full day) and any goals done. Bounties come
up three tournaments in ten. Days to reach each room, as the median of the players who did:

| | Riverboat | Casino | Strip | Monte Carlo | Penthouse | Yacht | Won on the Yacht |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Beginner, 4 a day | day 2 | 7 | 47 (55%) | 93 (9%) | 166 (1%) | – | – |
| Decent, 4 a day | 2 | 7 | 34 (87%) | 85 (36%) | 92 (8%) | 131 (3%) | 3% |
| Decent, 10 a day | 1 | 4 | 22 | 70 (65%) | 106 (22%) | 136 (11%) | 10% |
| Good, 4 a day | 2 | 5 | 14 | 61 (85%) | 90 (61%) | 113 (36%) | 33% by day 113 |
| Good, 10 a day | 1 | 3 | 8 | 34 | 60 (90%) | 88 (80%) | 78% by day 93 |
| Expert, 4 a day | 2 | 5 | 12 | 49 (95%) | 78 (75%) | 110 (45%) | 42% by day 115 |
| Expert, 10 a day | 1 | 3 | 8 | 25 | 48 (98%) | 79 (87%) | 86% by day 82 |

Percentages are the players who got there within 180 days (100% where none is given). No simulated player ever had
a day with nothing they could afford to play.

So the end, a win on the Yacht, takes a good player about four months of an hour a day, and only about a third
manage it in six; a decent player almost never does, but keeps opening rooms for months. New rooms come every few
days at first, then every few weeks, with bosses, missions, the streak and the weekly board in between.

## What changed to get here

The first version paid out more than the buy-ins on average (Sit & Go 6.3, Jackpot 3.4) and used blinds so fast
that luck decided most tournaments (a Jackpot lasted twelve hands): every kind of player reached the Yacht in two
to three weeks, beginners included. Now:

- **Slower blinds:** Sit & Go levels every ten hands, Jackpots at 1,000 chips with levels every six. A tournament
  lasts about 35 and 20 hands, long enough for the better player to show.
- **Prize draws a little under the seats:** a Sit & Go averages about 5.3 buy-ins for six seats, a Jackpot about
  2.8 for three. The rare 150× and 250× draws stay.
- **Dulled rooms:** the bots in the easy rooms make more mistakes and read less (`dull` per venue and stake,
  `dulled()` in `botStyles.ts`), the Yacht's play at full strength, and each boss plays half as dulled as its room.
- **Rewards in proportion:** a boss pays three buy-ins the first time, bounties one to three, missions 8% of your
  biggest open buy-in, and the top rooms open later (Monte Carlo at 400K, the Penthouse at 2M, the Yacht at 10M).

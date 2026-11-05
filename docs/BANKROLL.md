# Bankroll

**1,000 chips. One month. Don't go broke.**

## The rules (what the start sheet shows)

1. Everyone starts with 1,000 chips on the 1st of the month (UTC). Anyone joining later starts with 1,000 too.
2. Play up to 50 hands a day against bots.
3. Your chips carry over. Bust and you're out for the month, with one rebuy by watching an ad.
4. Every Sunday at midnight UTC, the bottom 10% of players still alive are cut.
5. Biggest stack at the end of the month wins.

## Underneath

- One blind level all month: 10/20 (`BANKROLL` in `src/game/bankroll.ts`). At most 100 big blinds (2,000) go on the table; the rest stays in the bank and shows as "+ 4,200 in the bank". At every deal your stack is set back to `min(bankroll, 2,000)`.
- Six seats: you and five bots drawn at random from `BOTS` across every style, full strength (no `dull`). Styles are never shown.
- Bots match your stack: new and topped-up bots get 70% to 130% of your stack (never under 10 big blinds); a bot at 150% or more gets up at the next deal and a new one sits down. Only between hands, only bot chips; `botIn`/`botOut` on the table's tag keep the books (`bankroll.test.ts`).
- The bots remember you: your `PlayerRead` for the month is kept in your `BankrollRoom` and seeded into `game.reads` at every sitting. Strong habits (`memoryNotes()`: river bluffs, folding to 3-bets, big bets that are always strong, check-raises, folding to c-bets, calling everything, or just being a regular) get an "I remember you" line, at most two a sitting (`rememberHello` … `rememberCalls` in `botLines.ts`).
- 50 hands a day, counted by the server across sittings; the day is UTC. After the 50th the table closes ("Back tomorrow").
- Every card is dealt by the server from `cryptoRng`, fresh for each player and hand.
- Leaving mid-hand folds you; a phone that goes away folds on the clock (30s turns, 15s offline) and the table closes at the next deal. Either way the hand counts.
- Busting: one rebuy of 1,000 a month, for a rewarded ad (placeholder for now). Skipping the ad (after a confirm) gives it up. Busted and cut players stay on the board, greyed, with their peak.
- The Sunday cut: the bottom 10% of alive players by bankroll (ties: lower peak, then friend code), rounded down; players who haven't played aren't on the board. An hourly cron runs it once it's due; a week already cut does nothing. A Sunday that is the 1st is a new season, not a cut.
- Seasons: a UTC month. On the 1st the cron closes last month's board and gives the top 100 a badge on their `FriendCard` (gold for the top 10). Boards are deleted a year after their last write; rooms 60 days after their month.

## Lab

`npx tsx scripts/bankrollLab.ts [months] [days]` plays whole months, one sitting of 50 hands a day, with the month's reads carried over. A first short run (2 months × 10 days, November 2026):

| Player | Final (median) | Broke | Per day, first half | Per day, second half |
| --- | --- | --- | --- | --- |
| tightBot | 4,223 | 0/2 | +397 | +143 |
| abc (solid) | 8,468 | 0/2 | +729 | +356 |
| lightBot (loose) | 0 | 2/2 | −300 | −250 |
| bluffBot (constant bluffer) | 0 | 2/2 | −667 | busted |

So at 10/20 a solid player usually survives and grows, a loose one or a constant bluffer busts within the first ten days, and everyone's edge shrinks in the second half as the bots' read of them builds. A solid player at this rate lands around 10 to 20 times the start over a full month. A longer run (6 months × 30 days) is the next check before launch.

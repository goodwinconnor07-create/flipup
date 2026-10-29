# FlipUp poker rules

FlipUp plays **no-limit Texas Hold'em** for play chips. This is what the engine in `src/game/` does, and the reasoning where a rule had a choice.

## The table

- 2 to 9 seats. The host sets the starting stack, the blinds, whether rebuys are allowed and the time to act (20s, 45s, 90s or off). Bots-only tables have no clock.
- Settings changed mid-game apply from the next hand. A new starting stack only affects rebuys and new players; in the lobby it resets everyone.
- People can join while a game is on. They're dealt in from the next hand, without posting a missed blind (a casual-game simplification).

## A hand

1. **The button** moves one seat clockwise each hand, to the next player who's being dealt in. The first button is drawn at random.
2. **Blinds.** The small blind is the seat left of the button, then the big blind. **Heads-up** (two players) the button posts the small blind. A player who can't cover a blind posts what they have and is all in. The amount to call is still the full big blind.
3. **Dealing.** A shuffled 52-card deck. One card at a time, starting left of the button, until everyone has two. A card is burned before the flop, the turn and the river.
4. **Order of action.** Before the flop, the player left of the big blind acts first (heads-up: the button). After the flop, the first player still in, left of the button, acts first (heads-up: the big blind).
5. **Betting rounds:** preflop, flop (3 cards), turn (1), river (1).

## Betting (no-limit)

- **Check** when there's nothing to call. **Call** to match the bet. Calling with fewer chips than the bet puts you all in.
- **Bet / raise** amounts are "raise to" totals. The smallest opening bet is the big blind. The smallest raise is the size of the last full bet or raise on that street. You can always go all in for less.
- **Short all-ins don't reopen the betting.** If someone goes all in for less than a full raise, players who already acted on that street can only call or fold. Players who haven't acted yet can still raise.
- You can't raise when nobody else is left with chips to call.
- The big blind gets the **option** to raise when everyone just calls.
- A street ends when everyone still in with chips has acted and matched the bet.
- **Uncalled bets come back.** The part of a bet nobody matched is returned before the pot is settled.

## All-ins and the run-out

When betting can't continue (everyone's all in, or all but one, and the bets are matched), **every hand still in is turned face up** and the rest of the board is dealt a card at a time, about two seconds apart.

**Odds are shown only now**, when every live hand is face up, so they never give anything away. Each phone shows its own win and tie chance in the box by its cards, and everyone else's win chance under their picture. After the flop the odds are exact (every possible card is counted). Before the flop they're estimated from 6,000 random boards, seeded from the cards so every phone shows the same numbers.

## Showdown

- Hands are ranked the standard way: royal flush, straight flush, four of a kind, full house, flush, straight, three of a kind, two pair, pair, high card. Best five of the seven cards. Aces can be low in A-2-3-4-5.
- **Side pots** are built from how much each player put in. A player can only win the pots they put chips into.
- **Ties split the pot.** Odd chips go to the winners closest to the left of the button.
- **Showing.** The last player to bet or raise on the river shows first; if nobody bet, the first player left of the button. After that, a hand is shown only if it beats or ties the best hand shown so far, or wins a pot. Losing hands are mucked (hidden), like auto-muck on online sites. **A player who's all in always shows**, even on the river and even when they lose (product owner's call).
- If everyone else folds, the last player wins without showing.

## Hold'em variants

The host picks the game under **Game** in the table settings (`src/game/variants.ts`). A change of game, like any setting, starts with the next hand. Everything not listed here plays exactly as above. Run-out odds are shown only in plain Hold'em. Hands from a variant still count for the daily streak, but they aren't saved to the hand history or used by twins.

- **Crazy Pineapple.** Three hole cards each. After the flop betting round, everyone still in throws one card away (at the same time, in secret), then the turn comes and it's normal Hold'em with the two kept. With a clock, anyone who hasn't chosen when it runs out keeps their best two; bots choose at once. A player all in before the discard (the cards are face up for the run-out) has their best two kept for them. "Best two" means the two that make the best hand with the flop (before the flop: a pair, then high, suited, connected cards).
- **Crazy Deuces.** Every 2, in a hand or on the board, is wild and becomes whatever card makes that player's hand best. **Five of a kind** is the best hand of all, above a royal flush; five of a kind ties break on rank. Two hands that make the same hand split as usual (a wild card has no suit of its own to break ties).
- **Ghost Hold'em.** Two extra cards are dealt face down to the ghost after everyone's hole cards. They're turned over only at a showdown. At a showdown, the winner of each pot (main and side pots separately) must also beat the ghost's hand; a tie with the ghost isn't enough. If they don't, the ghost keeps that pot and it goes into the next hand's main pot, which anyone dealt in can win. If everyone folds to one player, they win the pot (including anything the ghost was holding) without facing the ghost. Betting is **pot limit**: a bet or raise can go up to the size of the pot after calling, and all in means the most the pot allows. Picking Ghost in the settings deepens the stacks to at least 500 big blinds. If the game ends, or switches to another game, what the ghost holds goes into the next pot dealt (or stays with the ghost when the table closes).
- **Pittsburgh.** Three river cards are dealt (after a burn) instead of one, with one betting round after them. Each player's hand is the best five of their two hole cards, the flop, the turn and exactly one of the three rivers; the app picks the river that gives them the best hand.

- **Die on the River.** As soon as the river is dealt, a die is rolled. On a 1 to 5 the board card in that position (counting from the left, the first flop card is 1, the river is 5) is replaced by the next card in the deck, face up for everyone; the old card is out of play. On a 6 the board stays. Then the river betting round is played on the new board. On an all-in run-out the die rolls the same way.
- **Red River.** If the river (the fifth board card) is red, a heart or a diamond, another card is dealt straight away (no burn), and so on until a black card, a spade or a club, comes. There's one river betting round after the last card. Every board card counts: a hand is the best five of a player's two cards and the whole board.
- **Imposter.** Needs three or more players dealt in (with two, the hand is plain Hold'em). Everyone gets the same two cards except one player, picked at random, who gets two different cards. Each phone is told only its own role: "You're the imposter" or "You're innocent". Everyone antes one big blind before the blinds, so there's dead money in the middle from the start, and picking Imposter in the settings sets blinds of about 50 big blinds deep. Betting is no-limit Hold'em except that **nobody can fold** (product owner's call): the Fold buttons are gone, and a player who runs out of time checks if that's free, otherwise calls. Only someone leaving the table folds. After the river (or after an all-in run-out), everyone dealt in votes for who they think the imposter is (folded players and the imposter too; you can't vote for yourself; bots vote straight away, and with a clock anyone who hasn't voted when it runs out doesn't). Votes stay secret until the hand is over. If the imposter gets the most votes on their own, the innocent players still in split the pot (odd chips as usual); if not, a tie included, the imposter takes it all. If the imposter left the table mid-hand, the innocents still in split it. A side pot the winners can't win goes to the players who can. The strength of the cards never matters, so no hand is named or highlighted.
- **Crucifix.** The board is nine cards in a cross: a middle card and two on each of the four arms. The flop is five cards (the middle and the inner card of each arm), the turn two (the outer top and outer right cards) and the river two (the outer bottom and outer left), each with its own betting round as usual. A hand is a player's two cards plus one line of the cross, either the five cards down or the five across (the middle card is in both): the best five of those seven. Cards from the two lines are never mixed (product owner's call). Before the river a hand is made from what's out of each line so far.
- **Circle Hold'em.** The board is six cards in a circle, placed like hours on a clock: the flop is two cards (12 and 6 o'clock), the turn two (8 and 2) and the river two (10 and 4). A hand is both of a player's cards plus three board cards next to each other round the circle (12-2-4, 2-4-6, ... 10-12-2): both hole cards must play. No three are in a row until the river, so until then a hand is just the two hole cards.

## Between hands

- The next hand deals by itself (5 seconds after a fold-out, 9 after a showdown), or straight away once every person at the table taps **Next hand**.
- **Busting:** with rebuys on, a busted player can buy back in for another starting stack. Without rebuys they're out. Bots that bust leave the table.
- **Game over:** without rebuys, the game ends when one player has all the chips (or only bots have chips left). The host can end the game at any time; a hand in progress is called off and bets go back. The deciding hand stays up for 3 seconds before the winner's page for games without rebuys, legend games and online tables. A table on one phone with rebuys on waits 20 seconds for anyone to rebuy first.
- **Standings** show each player's chips minus everything they've bought in for.

## Being away

- If the clock runs out, you check if you can, otherwise fold (in Imposter, call). Two timeouts in a row and you're sat out until you tap **I'm back**.
- **Sit out next hand** from the menu skips you until you come back.
- Leaving mid-hand folds your hand at once.

## Bots

Bots see only what a player in their seat would see: their own two cards, the board, everyone's chips and every public move. They never see the deck or anyone else's hidden cards, and they don't call any server to decide (the GTO coach is never used during play).

At a variant table a bot judges its hand by that game's rules: it deals out the rest of the hand many times in its head (its own cards and the board only, the other hands guessed at random) to see how often it wins, then plays in its own style against the price of calling. In Imposter it can't fold and the cards don't decide the pot, so it mostly checks and calls with the crowd and now and then makes a small bet.

- **How they think.** Before the flop they start from solved charts and bend them by style. After the flop they picture what each opponent could hold given everything that player has done, and weigh checking, betting, calling, raising and folding by how often they'd win and how often a bet would make the others fold. Short-stacked they move all in or fold.
- **Styles.** The 640 stable bot identities have individual traits layered over one of ten hidden styles (from a solid regular to a calling station or a maniac). Styles change how many hands they play, how much they bluff, how much they read the other players, what they over- or underrate and how their bet sizes give their hand away.
- **Reads.** They combine lifetime and recent public observations at the current table, remembering what each player does (how many hands they play, how often they fold to a bet, bluffs they've shown) and adjust: bluff the players who fold too much, bet for value against the ones who call too much.
- **Mood.** Bad beats and big losses put a bot on tilt (looser and sloppier, or more scared for the nervous ones), winning makes it confident, and it holds a grudge against whoever took a big pot off it. It all fades over a few hands.
- **Table talk.** An offline context engine selects authored comments and voices through the existing bubbles. Bots remember recent lines, answer specific quick messages, and react to public events. No network service is used. Unshown bluffs are not announced.
- **Timing.** A bot takes as long as a person would: quick with easy folds, longer over close calls and big bets. Some take ages with a monster.
- **Showing cards.** After a hand a bot sometimes turns over a bluff that worked, a big hand nobody paid off, or a good hand it folded. It only ever shows its own cards.

## Campaign

One player's bankroll against the bots, kept on the phone (`flipup.campaign`) from day to day. Code: `src/game/campaign.ts`.

- **Salary.** The first time you open the Campaign tab on a new day (this phone's calendar), the salary tops your bankroll up, counting any chips on the campaign table you're sitting at. It tops up to 1,000 on the first day and 100 more for every day in a row you collect, up to 2,000 on the eleventh; miss a day and it's back to 1,000. Above the top-up it adds nothing. Days you don't open the app pay nothing: ten days away is one top-up, not ten (product owner's call).
- **Daily extras.** One free spin a day on a prize wheel: 100 (30%), 200 (25%), 250 (18%), 500 (15%), 1,000 (8%), 2,500 (3%) or 5,000 (1%). Three missions a day, the same for everyone that day, picked from a fixed list (play 25 hands, win 6 pots, win 3 showdowns, win with a flush or better, win a pot of 30 big blinds, knock out 2 players, play 3 tournaments, get paid in one, leave a cash game ahead, spin the roulette wheel 3 times). Hands count at any campaign table. Each pays 8% of the biggest tournament buy-in you've opened (at least 100), and collecting all three pays twice that again.
- **Out of chips.** With no table going and less than the smallest roulette chip (5), you're done until tomorrow's salary. Between 5 and the cheapest buy-in (100), only the roulette wheel is open.
- **Cash games** are their own ladder of stakes, apart from the tournaments. Six seats. You sit with as much of your bankroll as you can, up to 100 big blinds, and need at least 50. Bots sit with 100 big blinds; a bot that goes bust leaves and a new one sits down before the next deal. **Cash out** from the menu puts your stack back in the bankroll (in a hand, your cards are folded and what you've bet stays in the pot). Go bust and you have the usual rebuy window to buy in again from the bankroll; otherwise the table ends. Each stake opens for good the first time your bankroll reaches its full buy-in.

  | Blinds | Buy-in | Opens at |
  | --- | --- | --- |
  | 1/2 | 100–200 | start |
  | 5/10 | 500–1,000 | start |
  | 25/50 | 2,500–5,000 | 5,000 |
  | 100/200 | 10K–20K | 20,000 |
  | 500/1K | 50K–100K | 100,000 |
  | 2.5K/5K | 250K–500K | 500,000 |
  | 10K/20K | 1M–2M | 2,000,000 |
  | 50K/100K | 5M–10M | 10,000,000 |

- **Tournaments** are venues, each with one format at one buy-in. Each venue opens for good the first time your bankroll reaches its mark. Bots come from the venue's styles, loose ones at the Garage and the sharks on the Yacht, and play below their full strength in the easier rooms (more mistakes, less reading of hands and people): the Garage's are 85% dulled, then 75, 60, 45, 30, 20 and 10%, and the Yacht's play at full strength. Cash stakes are dulled the same way, step for step. No rebuys.
  - **Sit & Go:** six players, 1,500 chips, blinds from 10/20 doubling every ten hands. 1st wins 70% of the prize, 2nd 30%.
  - **Jackpot:** three players, 1,000 chips, blinds from 10/20 doubling every six hands. The winner takes it all.
  - **Bosses.** From the Riverboat up, one seat at every tournament is the venue's boss, a legend (Brunson, Hellmuth, Negreanu, Ivey, Dwan, Rampage, in that order), playing half as dulled as the room. Knock a boss out yourself (win a pot that puts them out) and the first time pays three buy-ins and counts towards the goals. A boss remembers you: they greet you as a rematch, and the table starts with what that boss saw you do last time.
  - **Bounties.** About three tournaments in ten put a bounty on one bot (never the boss), named before you buy in: one, two or three buy-ins if you knock it out yourself. It shows only as a small 🎯 by its name in the table's header.

  | Venue | Format | Buy-in | Opens at |
  | --- | --- | --- | --- |
  | The Garage | Sit & Go | 100 | start |
  | The Back Room | Jackpot | 250 | start |
  | The Riverboat | Sit & Go | 1,000 | 2,500 |
  | Downtown Casino | Jackpot | 5,000 | 15,000 |
  | The Strip | Sit & Go | 25,000 | 75,000 |
  | Monte Carlo | Jackpot | 100,000 | 400,000 |
  | The Penthouse | Sit & Go | 500,000 | 2,000,000 |
  | The Yacht | Jackpot | 2,500,000 | 10,000,000 |

- **The prize is drawn, not pooled.** It doesn't depend on how many people are at the table: when a tournament opens, its prize is drawn as a multiple of the buy-in, and a reel shows it before the first deal (product owner's call).

  | Sit & Go | 3× | 4× | 6× | 12× | 30× | 150× |
  | --- | --- | --- | --- | --- | --- | --- |
  | Chance | 50% | 28% | 13% | 6.5% | 2.2% | 0.3% |

  | Jackpot | 2× | 3× | 5× | 10× | 50× | 250× |
  | --- | --- | --- | --- | --- | --- | --- |
  | Chance | 80% | 14% | 4% | 1.5% | 0.4% | 0.1% |

  A Sit & Go averages about 5.3 buy-ins for its six seats and a Jackpot about 2.8 for its three: a little less than the seats put in, so only playing better than the bots climbs (see `docs/CAMPAIGN.md` for how it was tuned). Your place is settled the moment you go out (or win). Leaving before then gives up the buy-in.
- **With friends.** "Play with friends" opens a campaign table online: a tournament at a venue, or a cash game where everyone sits with the full 100 big blinds. Friends join with its code. Each phone pays the buy-in from its own bankroll as it sits down (a friend can bring you to a table you haven't opened yet, as long as you can pay), the server draws a tournament's prize, the stakes can't be changed, and empty seats fill with the venue's bots when the host deals. A tournament can't be joined once it's dealt. Leaving the lobby, or a tournament called off before anyone finished, gives the buy-in back. Bankrolls still live on each phone, so this trusts the phones (it's play money).
- **Friends' progress.** With a friend code, your bankroll, best bankroll and tournament wins go on your friend card a few seconds after they change, and the Campaign tab ranks you and your friends by bankroll.
- **Weekly board and news.** Your friend card also carries what you've won this week (chips back less chips in, at the tables and the wheel, plus bounties; the week starts on Monday), last week's, and your latest big moment (a boss beaten, a tournament won for 1,000 or more, or a prize of 10× or more). Friends see a "This week" board, a crown on last week's winner, and each other's moments from the last three days.
- **Trophies.** Winning a tournament at a venue for the first time gives you its card back (in Card packs, beside Premium's, and free).
- **Roulette limit.** At most twice the biggest tournament buy-in you've opened (at least 500) on the table in one spin, so the wheel can't skip the climb.
- **Titles and goals.** Titles go by the best bankroll you've ever had (Rookie up to Billionaire) and never go down. Goals pay a chip reward once, collected with a tap; "See all" lists every one.

## Roulette

The campaign's wheel: European, one zero, 37 pockets. Bets come out of the bankroll, the smallest chip is 5 and there's no table limit. Code: `src/game/roulette.ts`.

- **Straight up** on any number, 0 included: pays 35 to 1.
- **Dozens** (1–12, 13–24, 25–36) and **columns** (the 2:1 boxes): pay 2 to 1.
- **Red, black, odd, even, 1–18 and 19–36**: pay even money.
- The 0 loses every bet except a straight-up bet on 0. There's no "en prison" or half-back rule.
- A winning bet gets its stake back on top of what it pays. Every bet has the same house edge of 1 in 37.

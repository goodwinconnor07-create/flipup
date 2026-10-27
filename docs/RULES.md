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

## Between hands

- The next hand deals by itself (5 seconds after a fold-out, 9 after a showdown), or straight away once every person at the table taps **Next hand**.
- **Busting:** with rebuys on, a busted player can buy back in for another starting stack. Without rebuys they're out. Bots that bust leave the table.
- **Game over:** without rebuys, the game ends when one player has all the chips (or only bots have chips left). The host can end the game at any time; a hand in progress is called off and bets go back.
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

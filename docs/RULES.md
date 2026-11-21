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

## House rules

Home game rules the host can turn on (off by default, 19 Nov 2026, the owner's ask; `houseRules()` in `src/game/holdem.ts`). Like any setting they start with the next hand. Party rounds don't use them.

- **Ante.** Everyone dealt in puts in an ante before the blinds: 10%, 25%, 50% or 100% of the big blind (at least 1 chip), so it rises with the blinds. Antes are dead money: they go in the pot but don't count toward the bet to call. A player whose ante takes their last chips is all in for it and can win only what they've matched.
- **Straddle.** With three or more players dealt in, the player after the big blind puts in two big blinds every hand, as a third blind. The player after them acts first before the flop and the straddler acts last, with the option to raise when everyone calls. The smallest raise is to four big blinds. A player who'd be all in from the straddle doesn't post it (that hand has no straddle). It's never posted heads-up.
- **Bomb pot.** Every 5th, 10th or 20th hand dealt at the table (by the table's hand count) is a bomb pot: no blinds, antes or straddle; everyone dealt in puts in two big blinds (or all they have) and the hand starts on the flop, with the usual betting from there. The button still moves.
- **Run it twice** (Texas Hold'em only). When an all-in leaves cards to come, every person still in the hand is asked "Run it twice?" and has 8 seconds to answer. Bots answer at once (they say yes about four times in five); a hand with no person left in it runs once. If everyone says yes, the rest of the board is dealt, then the board goes back to where it was at the all-in and the rest is dealt again from the same deck (with burns). Each pot is split in half: the first half (with the odd chip) is won on the first board, the second on the second, each by the usual showdown and split rules. Any no, or no answer in time, deals it once. Nobody is asked when the all-in comes on the river.

## Hold'em variants

The host picks the game under **Game** in the table settings (`src/game/variants.ts`). A change of game, like any setting, starts with the next hand. Everything not listed here plays exactly as above. Run-out odds are shown only in plain Hold'em. Hands from a variant still count for the daily streak, but they aren't saved to the hand history or used by twins.

- **Crazy Pineapple.** Three hole cards each. After the flop betting round, everyone still in throws one card away (at the same time, in secret), then the turn comes and it's normal Hold'em with the two kept. With a clock, anyone who hasn't chosen when it runs out keeps their best two; bots choose at once. When everyone is all in before the discard, the run-out stops on the flop and each player still in throws a card away (face up, since the cards are turned over for the run-out), on the same clock; then the turn and river come. "Best two" means the two that make the best hand with the flop (before the flop: a pair, then high, suited, connected cards).
- **Crazy Deuces.** Every 2, in a hand or on the board, is wild and becomes whatever card makes that player's hand best. **Five of a kind** is the best hand of all, above a royal flush; five of a kind ties break on rank. Two hands that make the same hand split as usual (a wild card has no suit of its own to break ties).
- **Haunted Pot.** Two extra cards are dealt face down to the ghost after everyone's hole cards. They're turned over only at a showdown. At a showdown, the winner of each pot (main and side pots separately) must also beat the ghost's hand; a tie with the ghost isn't enough. If they don't, the ghost keeps that pot and it goes into the next hand's main pot, which anyone dealt in can win. If everyone folds to one player, they win the pot (including anything the ghost was holding) without facing the ghost. Betting is **pot limit**: a bet or raise can go up to the size of the pot after calling, and all in means the most the pot allows. Picking Ghost in the settings starts the table at 2,000 chips and 10/20 blinds (100 big blinds); the host can change both. If the game ends, or switches to another game, what the ghost holds goes into the next pot dealt (or stays with the ghost when the table closes).
- **Pittsburgh.** Three river cards are dealt (after a burn) instead of one, with one betting round after them. Each player's hand is the best five of their two hole cards, the flop, the turn and exactly one of the three rivers; the app picks the river that gives them the best hand.

- **Die on the River.** As soon as the river is dealt, a die is rolled. On a 1 to 5 the board card in that position (counting from the left, the first flop card is 1, the river is 5) is replaced by the next card in the deck, face up for everyone; the old card is out of play. On a 6 the board stays. Then the river betting round is played on the new board. On an all-in run-out the die rolls the same way. While a person is still in the hand the roll is shown for 6 seconds first (a count from three, the die, the result) and nobody acts, nor does anyone's clock run, until it's over (`TIMING.diceShow`, `hand.dice.until`).
- **Red River.** After the turn betting (and one burn) comes the river run: ten cards, one at a time, each on its own beat so everyone sees it land. A red card (a heart or a diamond) is added to the board. A black card (a spade or a club) takes the place of the newest card on the board, which is out of play; on the first draw that's the turn card. After the ten draws one more card is dealt as the river and stays whatever its colour (product owner's call, November 2026). The board is then four cards plus one for every red draw that wasn't swapped out, plus the river: anywhere from 5 to 15 cards. There's one river betting round after the river. Every board card counts: a hand is the best five of a player's two cards and the whole board. On an all-in run-out the run plays the same way.
- **Crucifix.** The board is nine cards in a cross: a middle card and two on each of the four arms. The flop is five cards (the middle and the inner card of each arm), the turn two (the outer top and outer right cards) and the river two (the outer bottom and outer left), each with its own betting round as usual. A hand is a player's two cards plus one line of five through the middle card: the five down, the five across, the L of the bottom arm and the right arm, or the L of the top arm and the left arm (product owner's call, November 2026; the top and right, and the bottom and left, are not lines): the best five of those seven. Cards from different lines are never mixed (product owner's call). Before the river a hand is made from what's out of each line so far.
- **Round the Clock.** The board is twelve cards in a circle, one on every hour of a clock, dealt clockwise from 12 o'clock (product owner's call, November 2026): the flop is four cards (12, 1, 2 and 3 o'clock), the turn four (4 to 7) and the river four (8 to 11), each after a burn. A hand is a player's two cards plus five board cards next to each other round the circle (12 to 4, 1 to 5, ... 11 to 3, wrapping past 12): the best five of those seven. Before the river a hand uses what's out: on the flop the four cards there, on the turn any five in a row among the eight.
- **Memory Poker.** Before every hand, 20 random cards are taken out of the deck and shown to everyone for 9 seconds (a new 20 each hand; product owner's call). Then they're hidden and the hand is dealt and played as normal Texas Hold'em from the 32 cards left (burns included). Phones get the removed cards again only once the hand is over. Bots remember most of them, like a person: each bot keeps between about three in four and nineteen in twenty of the twenty cards (always the same ones for that bot and hand).
- **Bean Stalk.** Everyone starts with two hole cards. When the flop is dealt, every player still in the hand (all in included) gets one more hole card, face down, and the same on the turn and the river, so by the river each player has five hole cards and there are five on the board. A hand is the best five of all ten. No cards are burned, so nine players (45 hole cards and 5 board cards) never run out.
- **Hit Me.** Dealt and bet like Texas Hold'em. On every street, preflop included, on their turn and before their move, a player can **hit** as many times as they like: each hit is the top card of the deck, face down, added to their own cards. A player's 21 count is their own cards only (two hole cards plus hits, never the board), aces 1 or 11 and picture cards 10. A hit that takes the count over 21 busts them: their hand is folded at once (chips already in stay in the pot). A player who is all in still gets to hit (product owner's call, November 2026): each time a new street is out, everyone still in who can't bet on it (all in, or everyone at the table is) chooses to hit or stand before the betting goes on (or the run-out deals the next card); bots choose at once, and with a clock anyone who hasn't chosen when it runs out stands. A count of 21 stands by itself. Everyone can see how many cards a player hit, never which. Hit cards also play in the poker hand: the best five from hole cards, hits and the board (product owner's call). At a showdown each pot (main and side pots separately) is split in two: half (the odd chip with it) to the best poker hand and half to whoever is closest to 21, by the usual split rules; if players tie for closest, that half goes to the best poker hand among them (and is split if those hands tie too). One player can win both halves. If everyone else folds or busts, the last player wins the pot as usual. Run-out odds aren't shown.

- **Power Cards.** Dealt and bet like Texas Hold'em, plus powers (`src/game/powers.ts`, `src/game/powerList.ts`). At the start of every hand everyone dealt in is given one power at random (a fresh one each hand; two players can get the same one). Your power is secret until you play it: phones see only their own, and everyone's once the hand is over. You play it on your turn, before your move, at most once per hand (a `power` action); then you still check, bet, call or fold. An unplayed power is gone when the hand ends. A player who is all in still gets to play theirs (product owner's call, November 2026): each time a new street is out, everyone still in who can't bet on it (all in, or everyone is, in a run-out) can play their power or keep it before the game goes on, on the same clock as a turn; bots choose at once. When a power is played, the table stops for 1.8s (`MOMENT_TIMING.power`; nobody acts and the player's clock waits) and everyone sees which power, who played it and who it was aimed at; what a Peek or X-ray showed is only ever sent to the player who played it. Powers that need a new card take it from the **bottom** of the deck, so they never change the board cards still to come (and a Peek is always right). The powers, picked so no two do the same kind of thing (owner's call, November 2026):
  - **👁️ Peek** (before the river): see the next board card.
  - **🩻 X-ray** (any street): pick an opponent still in whose cards are face down; you see one of their two cards, picked at random.
  - **🔁 Swap** (before the river): one of your cards, your choice, is replaced by a new card, face down.
  - **🎲 Reroll** (flop or turn): one board card, your choice, is replaced by a new card, face up for everyone.
  - **➕ Extra Card** (flop or turn): one more card goes on the board straight away for everyone. A hand is the best five of a player's two cards and the whole board, however long it is; the turn and the river still come.
  - **⬅️ Pass Left** (before the river): everyone still in the hand passes one of their cards, picked at random, to the next player still in on their left, all at once.
  - **🛡️ Shield** (any street): if you reach the showdown and win nothing, half of what you put in after playing it (rounded down) comes back to you. It comes out of the pots you were in, the last side pot first, before they're paid. Folding gets nothing back.
  - **🤐 Silence** (any street): pick an opponent still in who isn't all in; for the rest of this street they can only check, call or fold.
  - **🎯 Bounty** (before the river): call a rank. If a card of that rank lands on the board after you call it, is still there when the hand ends, and you haven't folded, every other player dealt in (folded ones too) pays you one big blind, or what they have left, after the pots are paid.
  - **💸 Fold Tax** (any street): for the rest of the hand, every other player who folds puts one big blind (or what they have left) into the pot as they fold. Two Fold Taxes charge twice.
  - **🐱 Copycat** (any street): plays the last power someone else played this hand, as yours, with your own choices; it has to be one that can be played right now. Before anyone else has played one, it can't be played yet.
  - Left out as too strong or too close to another power: a wild-card Joker, an extra hole card, choosing between two river cards, redealing the whole flop, stealing an opponent's card, extra information powers (yes/no questions, hand names, dead cards), defence powers that only answer X-ray and Silence, and powers that bend the betting rules (an extra bet after the river, a shorter clock).
  Bots play their powers by rules of thumb, from what their seat can see: information early, Swap and Reroll for cards their hand isn't using, Shield and Fold Tax when they're putting chips in, Bounty on the rank with the most copies still unseen (a rank in their own hand breaks a tie), Silence on whoever just bet, else the opponent with the most chips. Run-out odds count the cards still to come by street, since an Extra Card can make the board longer.

**Choices when all in.** Any choice a game adds beyond betting comes to a player who is all in too (product owner's call): Crazy Pineapple's discard, Hit Me's hits, a power card, Imposter's vote.

**Rabbit hunt** (house rule "Show what was coming", off by default). When everyone folds before the river, the board that would have come is shown faded on the felt, dealt from the deck exactly as the table deals (burns, street sizes, Bean Stalk's own cards, the Red River run; Die on the River's roll is left out). It's sent to phones only once the hand is over and changes nothing about who won.

**Older apps.** When a game's rules change, `RULES_VERSION` in `variants.ts` goes up and the game is marked in `RULES_SINCE`. The server refuses a phone on older rules at a table playing that game (and won't let it host one, switch a table to one, or join a party that plays one), with a message to update FlipUp.

## Pace of the mini games (moments)

Every mini game is slower than Hold'em where it has something to show (`src/game/moments.ts`, `hand.moment`): the cards of a street land one at a time (450ms apart; Pittsburgh's rivers 1s apart; the Red River run's cards 0.9s apart), the street pause is 1.7s instead of 1.1s, and **betting waits until the moment is over** (`hand.bettingAt`). Die on the River takes about 4.4s (the river lands, the die tumbles, the number shows, the card swaps). Ghost holds the showdown 3.2s, Hit Me 2.4s and Crazy Deuces 1.4s before the hands turn over. Crazy Pineapple turns everyone's thrown card up together and shows them for 3s before the turn. A Blackjack bust is shown for 2s, and nobody acts until it has been seen (`moment.gate`); so is a power being played (1.8s). When only bots are left in a hand all of this runs at a fifth of the time.

## Between hands

- The next hand deals by itself (5 seconds after a fold-out, 9 after a showdown), or straight away once every person at the table taps **Next hand**.
- **Busting:** with rebuys on, a busted player can buy back in for another starting stack. Without rebuys they're out. Bots that bust leave the table.
- **Game over:** without rebuys, the game ends when one player has all the chips (or only bots have chips left). The host can end the game at any time; a hand in progress is called off and bets go back. The deciding hand stays up for 3 seconds before the winner's page for games without rebuys and online tables. A table on one phone with rebuys on waits 20 seconds for anyone to rebuy first.
- **Standings** show each player's chips minus everything they've bought in for.

## Being away

- If the clock runs out, you check if you can, otherwise fold. Two timeouts in a row and you're sat out until you tap **I'm back**.
- **Sit out next hand** from the menu skips you until you come back.
- Leaving mid-hand folds your hand at once.

## Bots

Bots see only what a player in their seat would see: their own two cards, the board, everyone's chips and every public move. They never see the deck or anyone else's hidden cards, and they don't call any server to decide (the GTO coach is never used during play).

At a variant table a bot judges its hand by that game's rules: it deals out the rest of the hand many times in its head (its own cards and the board only, the other hands guessed at random) to see how often it wins, then plays in its own style against the price of calling. In Imposter it can't fold and the cards don't decide the pot, so it plays its own two cards honestly (everyone but the imposter holds the same pair, so they act alike) with small bets, follows the table when its own hand disagrees with everyone else's, and votes for whoever acted least like the rest (a bet into a string of checks is the clearest sign).

- **How they think.** Before the flop they start from solved charts and bend them by style. After the flop they picture what each opponent could hold given everything that player has done, and weigh checking, betting, calling, raising and folding by how often they'd win and how often a bet would make the others fold. Short-stacked they move all in or fold.
- **Styles.** The 640 stable bot identities have individual traits layered over one of ten hidden styles (from a solid regular to a calling station or a maniac). Styles change how many hands they play, how much they bluff, how much they read the other players, what they over- or underrate and how their bet sizes give their hand away.
- **Reads.** They combine lifetime and recent public observations at the current table, remembering what each player does (how many hands they play, how often they fold to a bet, bluffs they've shown) and adjust: bluff the players who fold too much, bet for value against the ones who call too much.
- **Mood.** Bad beats and big losses put a bot on tilt (looser and sloppier, or more scared for the nervous ones), winning makes it confident, and it holds a grudge against whoever took a big pot off it. It all fades over a few hands.
- **Table talk.** An offline context engine selects authored comments and voices through the existing bubbles. Bots remember recent lines, answer specific quick messages, and react to public events. No network service is used. Unshown bluffs are not announced.
- **Timing.** A bot takes as long as a person would: quick with easy folds, longer over close calls and big bets. Some take ages with a monster.
- **Showing cards.** After a hand a bot sometimes turns over a bluff that worked, a big hand nobody paid off, or a good hand it folded. It only ever shows its own cards.

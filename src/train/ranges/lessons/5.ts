import type { Lesson } from '../model';

export const L5: Record<string, Lesson> = {
  'nut-flush-river-size-wsop': {
    why: 'Bet about ⅔ pot: you have the nuts, and checking only hopes for a bluff that rarely comes from a player who called twice. Choose a size that could also be a bluff from a loose 3-bettor. K-Q and Q-Q call it, and so does a suspicious A-K. A smaller bet is fine too. An overbet only gets called by the same hands that call ⅔, so it gains nothing.',
    streets: [
      { street: 'preflop', text: 'Middle position opens, you 3-bet A♦K♦ from the hijack, a strong button cold-calls and the opener calls too. A cold-caller rarely has the very top of the range, which would 4-bet: think 9-9 to Q-Q, A-Q, K-Q suited and some A-K.', range: 'The button: 9-9 to Q-Q, A-Q, K-Q suited, some A-K and suited broadways.' },
      { street: 'flop', text: 'The flop is K♣4♠2♦, which favours you: you hold more A-K, K-K and A-A than a cold-caller. You c-bet small; the button calls and the opener folds. The call is kings, pairs and some floats.', range: 'Kings like K-Q and K-J, pairs like Q-Q and J-J, and A-Q floating.' },
      { street: 'turn', text: 'The 7♦ adds a diamond draw. You bet again for value; a check would usually get checked back. The button calls with kings, queens and pairs.', range: 'Kings, Q-Q and J-J, smaller pairs, and A-Q.' },
      { street: 'river', text: 'The Q♦ gives you the nut flush. The button’s range is one-pair and two-pair hands that never raised: K-Q and Q-Q will call a bet but rarely raise, A-K calls a normal bet, and K-J, A-Q and small pairs would check behind.', range: 'K-Q and queens (call), A-K (calls a normal bet, folds to an overbet), K-J and A-Q (call only small), smaller pairs (fold).' },
    ],
    takeaway: 'With the nuts against one-pair and two-pair hands, choose a size they can call, not the biggest one.',
  },
  'two-pair-river-size-wsop': {
    why: 'Bet about ⅔ pot: that’s the most a king will surely call. Their missed draws fold to any bet, so your value comes from A-K, K-Q and K-J, and a recreational player calls a normal bet with those because the draws missed. A pot-size bet might fold some of them. Getting the call matters more than a slightly bigger bet that gets folded.',
    streets: [
      { street: 'preflop', text: 'You open K♣5♣ from the hijack on a passive table, and two recreational players call from the cutoff and small blind. Recreational players call wide: kings, pairs, suited hands and connectors.', range: 'Wide: kings, pairs, suited hands and connectors.' },
      { street: 'flop', text: 'You flop two pair on K♠6♦5♠, with a spade draw and straight draws out. You bet big; the cutoff folds and the small blind calls with kings, pairs and spade and straight draws.', range: 'Kings, sixes, pairs, spade draws and straight draws like 8-7 and 4-3.' },
      { street: 'turn', text: 'The T♦ adds a diamond draw. You bet big again because two pair is still vulnerable and the draws should pay. They call.', range: 'Kings like A-K, K-Q and K-J, K-T and sets, pocket pairs, and spade and diamond draws.' },
      { street: 'river', text: 'The 3♥ misses the flush draws and they check. Their draws fold to any bet. Their kings think “all the draws missed” and will call, just not any amount.', range: 'A-K, K-Q and K-J (call a normal bet), K-T and sets (beat you), pocket pairs (call only small), missed draws (fold).' },
    ],
    takeaway: 'Ask what the most is that their calling hands will pay, and bet that much.',
  },
  'ak-high-turn-call-vs-lag': {
    why: 'Call: ace-king beats every bluff, and you can still improve with an ace, a king or a 4. This player bets big cards and heart draws far too often, so plenty of what they bet is behind you. You need 28%, and you’re well above. Raising is for pairs and flush draws; ace high just wants to see the river cheaply.',
    streets: [
      { street: 'preflop', text: 'You open A♦K♥ from the lojack in a tournament, and a strong, loose-aggressive player calls in the hijack. Their range is wide: pairs, suited broadways and connectors.', range: 'Wide: pairs, suited broadways, suited aces and connectors.' },
      { street: 'flop', text: 'The flop is 5♥3♥2♠, low with a heart draw and wheel draws. You check, they bet about half the pot, and you call with two overcards and a gutshot to a 4. Against a loose-aggressive player, folding ace-king here gives them too much.', range: 'Fives and threes, overpairs, wheel draws, heart draws, and big cards betting.' },
      { street: 'turn', text: 'The 3♦ pairs the board and they bet again, about two-thirds of the pot. A loose-aggressive player bets whenever you check, so normal sizes tell you little: their range has lots of big cards and heart draws next to the pairs and trips.', range: 'Value: A-3 and A-4, fives, overpairs. Bluffs: big cards with no pair and heart draws.' },
    ],
    takeaway: 'Against a player who bluffs too often, call more with hands that beat bluffs and can improve.',
  },
  'bottom-set-four-bet-pot-river': {
    why: 'Call: your set beats aces and A-K, the hands that bet here, and you need about 28%. A raise would fold out A-A and A-K, and only K-K would call. In a tournament the chips you risk with a raise are worth more than the ones you’d win. Calling keeps their value hands paying you.',
    streets: [
      { street: 'preflop', text: 'Middle position opens, you 3-bet 3♠3♣ light from the hijack, and a tight, straightforward button cold 4-bets; middle position folds and you call. A cold 4-bet from a straightforward player is A-A, K-K, Q-Q, A-K and very few bluffs.', range: 'A-A, K-K, Q-Q, A-K and a few bluffs.' },
      { street: 'flop', text: 'You flop bottom set on J♥6♠3♥ and check; they check back. In a 4-bet pot against a strong range, checking is the plan: you don’t want to blow it up against a bigger set.', range: 'A-A, K-K, Q-Q and A-K taking a free card, and a few bluffs.' },
      { street: 'turn', text: 'The K♥ helps A-K and K-K. You check, they bet a little over half the pot, and you call. Raising would fold A-A and A-K and only get called by K-K.', range: 'A-A, A-K (top pair), K-K (a bigger set), and some bluffs.' },
      { street: 'river', text: 'The 7♠ changes little. You check, they bet ⅔ pot again. A straightforward player keeps betting A-A and A-K for value.', range: 'A-A and A-K for value (you beat both), K-K (a bigger set), and the odd bluff.' },
    ],
    takeaway: 'Raise only when worse hands call; when only a bigger set would call, just call.',
  },
  'set-of-sixes-tiny-river-bet': {
    why: 'Call: a bet of a quarter of the pot means you need only about 17%. They bet flushes this way, but also two pair, smaller sets and one-pair hands betting small. You’d have to be sure they bet nothing but a flush to fold, and you can’t be. Folding the best hand costs far more than paying off a flush now and then.',
    streets: [
      { street: 'preflop', text: 'The lojack opens early in a big tournament, the cutoff calls, you call on the button with 6♠6♣, and the big blind calls. Four-way and deep, callers have pairs, suited aces and broadways.', range: 'Pairs, suited aces, broadways and suited connectors.' },
      { street: 'flop', text: 'You flop a set on K♣6♥3♣. It checks to you; you bet and only the cutoff calls. Draws and kings pay, and the cutoff’s call is a king, a pair or a club draw.', range: 'Kings, pairs, club draws, and the odd set.' },
      { street: 'turn', text: 'The Q♣ puts three clubs out. You bet small for value from pairs and draws; the cutoff makes a small, confusing raise. Re-raising would only get called by flushes, so you call.', range: 'Flushes, K-Q and bigger sets, one-pair hands raising small, and club draws.' },
      { street: 'river', text: 'The 8♥ is a blank, and the cutoff bets a quarter of the pot. A tiny bet is a flush a lot of the time, but players also bet two pair, smaller sets and one pair small to get to a cheap showdown.', range: 'Ahead of you: flushes, K-K and Q-Q. Behind you: K-Q, 3-3 and one-pair hands betting small.' },
    ],
    takeaway: 'Facing a tiny bet you need to be right very rarely: call unless you’re sure they only bet the nuts.',
  },
  'set-of-queens-river-size': {
    why: 'Bet about ⅔ pot: jacks, overpairs and sets can all call that, and you beat every one of them. A third of the pot gets more calls but less money; an overbet folds the jacks you want to pay you. Only A-K and 9-8 beat you, and those would raise anyway.',
    streets: [
      { street: 'preflop', text: 'An early raiser opens, you 3-bet Q♠Q♦, and they call. Calling a 3-bet from early position: strong pairs, big aces and suited broadways, sometimes A-A or K-K trapping.', range: 'Strong pairs, A-K, A-Q, suited broadways, sometimes A-A or K-K.' },
      { street: 'flop', text: 'The flop is J♣T♥2♣, very connected. They check and you check behind. Their range has every set and straight draw that beats or crushes queens, and checking avoids a big pot against a set.', range: 'Jacks, tens, sets, A-K and K-Q drawing, club draws, and overpairs.' },
      { street: 'turn', text: 'The 7♠ gives 9-8 a straight. They bet the pot. You beat their bluffs and some value bets, so you call; raising risks too much against a better hand.', range: 'Jacks, tens, sets, 9-8, overpairs, and draws like A-K and club draws.' },
      { street: 'river', text: 'The Q♥ gives you a set and A-K a straight. They check. A pot-size turn bet followed by a river check is a strong but not top hand: jacks, overpairs and sets that want a showdown.', range: 'Jacks call a normal bet; tens call small; sets J-J, T-T, 7-7 and 2-2 may raise (you beat them); K-K and A-A call; A-K and 9-8 beat you; missed clubs fold.' },
    ],
    takeaway: 'Bet the size their medium-strong hands can call; an overbet folds them.',
  },
  'top-pair-river-check-behind': {
    why: 'Check behind: you’re often best, but a bet only gets called by the hands that beat you. Two pair, sets and straights call any size, and the worse tens and nines fold. With no read that they call down light, take the free showdown.',
    streets: [
      { street: 'preflop', text: 'You open A♥T♥ from the hijack in a tournament and the small blind calls: pairs, suited aces, broadways and suited connectors. Those hands love a middle board.', range: 'Pairs, suited aces, broadways and suited connectors.' },
      { street: 'flop', text: 'You flop top pair on T♠9♦8♥, as connected as boards get. You c-bet and they call with straights, two pair, pairs and lots of straight draws.', range: 'Straights like Q-J and 7-6, two pairs, sets, tens and nines, and straight draws.' },
      { street: 'turn', text: 'The 6♥ completes many draws and gives you a heart draw. They lead small. Top pair with a flush draw can’t fold, and a raise could get re-raised, so you call.', range: 'Straights, sets and two pair leading small, pairs blocking, and draws.' },
      { street: 'river', text: 'The 2♣ misses your flush and they check. If you bet, two pair or better calls almost any size, and most one-pair hands fold.', range: 'Ahead of you: Q-J and 7-6, sets and two pair. Behind you: tens and nines, and missed K-Q and K-J.' },
    ],
    takeaway: 'When worse hands fold and better ones call, take the free showdown.',
  },
  'nut-flush-river-size-multiway': {
    why: 'Bet small: both players checked, so neither has a flush, and a big bet rarely gets called. A small bet keeps in the overpairs, Q-J and stubborn top pairs, and that’s where your money is. A ¾-pot bet is close but folds the top pairs; a shove only gets called by hands that won’t fold anyway, and there are almost none.',
    streets: [
      { street: 'preflop', text: 'Seven players limp in a live game, you with A♠5♠, including a tricky player under the gun who can limp A-A and K-K. Nobody has shown strength.', range: 'Wide for everyone; the under-the-gun player can hold a trapping big pair.' },
      { street: 'flop', text: 'The flop is Q♠J♠3♣. Under the gun bets small, and five of you call, you with the nut flush draw. A small bet into a big field gets called by any queen, jack or draw.', range: 'Queens, jacks, Q-J, spade and straight draws, and big pairs.' },
      { street: 'turn', text: 'The 6♠ gives you the nut flush. Under the gun bets and the lojack calls; the others fold. You just call to keep them in: a raise could fold the hands that are behind.', range: 'Under the gun: overpairs, queens, Q-J. Lojack: queens, Q-J and pairs.' },
      { street: 'river', text: 'The 2♣ is a blank, and both check to you. Players with a flush would bet, so checking twice caps them: overpairs, top pairs and Q-J.', range: 'Under the gun: A-A and K-K, top pairs A-Q, K-Q and Q-T, and Q-J. Lojack: top pairs K-Q, Q-T and Q-9, Q-J and pocket pairs. Top pairs and pocket pairs call only small.' },
    ],
    takeaway: 'Against capped ranges, a small value bet gets more calls and more money than a big one.',
  },
  'eights-full-river-raise': {
    why: 'Raise: Q-Q, K-K and A-A are 18 combos that will pay; J-J, T-T and quads are only 7 that beat you. Calling needs a third, but raising needs to beat more than half of the hands that call it, and the overpairs make that easy. Only their bluffs fold to a raise. Just calling leaves chips behind.',
    streets: [
      { street: 'preflop', text: 'A regular opens the cutoff and you call on the button with 8♣8♠, 400 big blinds deep (they have 95). Their range is pairs, broadways and suited aces.', range: 'Pairs, broadways and suited aces.' },
      { street: 'flop', text: 'You flop a full house on 8♦3♦3♥. They check, you bet small and they call. Small bets keep their overpairs and draws in.', range: 'Overpairs, threes, diamond draws, and floats.' },
      { street: 'turn', text: 'The T♣. They check, you bet, and they check-raise. Unusual action means an unusual hand, but not necessarily the nuts: overpairs, tens, trips, and the odd float.', range: 'Overpairs Q-Q to A-A, T-T (now a full house), trips with A-3, and floats.' },
      { street: 'river', text: 'The J♥ gives J-J a full house. They bet the pot. Overpairs Q-Q to A-A are 18 combos; J-J, T-T and quads are 7.', range: 'Value you beat: Q-Q, K-K, A-A and A-3. Value that beats you: J-J, T-T and 3-3. Bluffs: floats that check-raised.' },
    ],
    takeaway: 'Raise for value when the hands that call a raise are mostly worse than yours.',
  },
  'jacks-incoherent-story': {
    why: 'Call: their story doesn’t add up. A min-raise on the flop, a check on the turn and a pot-sized bet on the river is how a give-up turns into a bluff, not how value plays. Nearly all their value would have bet the turn, and the second deuce cuts their value further. You need a third, and jacks beat every bluff.',
    streets: [
      { street: 'preflop', text: 'An inexperienced cutoff opens and calls your 3-bet from the big blind with J♣J♥. They call with pairs, suited aces, broadways and suited connectors.', range: 'Pairs, suited aces, broadways and suited connectors.' },
      { street: 'flop', text: 'The flop is A♣7♦2♥. You c-bet and they make a near-minimum raise in position. A strong hand like A-2, A-7 or 7-7 rarely plays a 200-big-blind pot this way; inexperienced players often raise small with a hand they don’t know what to do with.', range: 'Aces, sets, two pairs, and floats raising small.' },
      { street: 'turn', text: 'The 5♦ and they check behind. A-2, A-7, 7-7 or a turned 4-3 would keep building the pot. A check after a flop raise says the raise was weak.', range: 'Pairs of fives, floats that gave up, and very rarely a slow-played monster.' },
      { street: 'river', text: 'The 2♣ pairs the board and they bet the pot. The second deuce cuts their value combos further. Either they turned quads, or it’s a bluff.', range: 'Value: quads with 2♠2♦, and rarely A-2, A-7 or 7-7. Bluffs: floats that raised the flop and gave up.' },
    ],
    takeaway: 'When a line makes no sense for value hands, it’s usually a bluff: call with a hand that beats bluffs.',
  },
};

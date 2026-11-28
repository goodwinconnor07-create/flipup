import type { Lesson } from '../model';

export const L5: Record<string, Lesson> = {
  'nut-flush-river-size-wsop': {
    why: 'Bet about ⅔ pot: you have the nuts, and checking only hopes for a bluff that rarely comes from a player who called twice. Choose a size that could also be a bluff from a loose 3-bettor: K-Q and Q-Q call it, and so does a suspicious A-K. A smaller bet is fine too; an overbet only gets called by the same hands, so it gains nothing.',
    streets: [
      { street: 'preflop', text: 'Middle position opens, you 3-bet A♦K♦ from the hijack, a strong button cold-calls and the opener calls too. A cold-caller rarely has the very top, which would 4-bet.', range: 'The button: 9-9 to Q-Q, A-Q, K-Q suited, some A-K and suited broadways.' },
      { street: 'flop', text: 'K♣4♠2♦ favours you: you hold more A-K, K-K and A-A than a cold-caller. You c-bet small; the button calls and the opener folds.', range: 'Kings like K-Q and K-J, pairs like Q-Q and J-J, A-Q floating.' },
      { street: 'turn', text: 'The 7♦ adds a diamond draw. You bet again for value, since a check would usually be checked back, and the button calls.', range: 'Kings, Q-Q and J-J, smaller pairs, A-Q.' },
      { street: 'river', text: 'The Q♦ gives you the nut flush. The button never raised, so they’re one-pair and two-pair hands: K-Q and Q-Q call but rarely raise, and the weaker hands would check behind.', range: 'Call: K-Q and queens. Normal bet only: A-K. Small only: K-J and A-Q. Fold: smaller pairs.' },
    ],
    takeaway: 'With the nuts against one-pair and two-pair hands, choose a size they can call, not the biggest one.',
  },
  'two-pair-river-size-wsop': {
    why: 'Bet about ⅔ pot: that’s the most a king will surely call. Their missed draws fold to any bet, so your value comes from A-K, K-Q and K-J, and a recreational player calls a normal bet with those because the draws missed. A pot-size bet might fold some of them, and getting the call matters more.',
    streets: [
      { street: 'preflop', text: 'You open K♣5♣ from the hijack at a passive table; two recreational players call from the cutoff and small blind.', range: 'Wide: kings, pairs, suited hands and connectors.' },
      { street: 'flop', text: 'You flop two pair on K♠6♦5♠ with draws out. You bet big; the cutoff folds and the small blind calls.', range: 'Kings, sixes, pairs, spade draws and straight draws like 8-7 and 4-3.' },
      { street: 'turn', text: 'The T♦ adds a diamond draw. Two pair is still vulnerable and the draws should pay, so you bet big again, and they call.', range: 'Kings like A-K, K-Q and K-J, K-T and sets, pocket pairs, spade and diamond draws.' },
      { street: 'river', text: 'The 3♥ misses every flush draw and they check. The draws fold to any bet; their kings think “the draws missed” and will call, just not any amount.', range: 'Normal bet: A-K, K-Q and K-J. Beat you: K-T and sets. Small only: pocket pairs. Fold: missed draws.' },
    ],
    takeaway: 'Ask what the most is that their calling hands will pay, and bet that much.',
  },
  'ak-high-turn-call-vs-lag': {
    why: 'Call: ace-king beats every bluff and improves with an ace, a king or a 4. This player bets big cards and heart draws far too often, so plenty of what they bet is behind you. You need 28%, and you’re well above. Raising is for pairs and flush draws; ace high wants to see the river cheaply.',
    streets: [
      { street: 'preflop', text: 'You open A♦K♥ from the lojack and a strong, loose-aggressive player calls in the hijack.', range: 'Wide: pairs, suited broadways, suited aces and connectors.' },
      { street: 'flop', text: 'On 5♥3♥2♠ you check, they bet half the pot, and you call with two overcards and a gutshot. Folding ace-king here gives a loose-aggressive player far too much.', range: 'Fives and threes, overpairs, wheel draws, heart draws, big cards betting.' },
      { street: 'turn', text: 'The 3♦ pairs the board and they bet ⅔ pot. This player bets whenever you check, so the size tells you little: big cards and heart draws sit next to the pairs and trips.', range: 'Value: A-3, A-4, fives, overpairs. Bluffs: unpaired big cards and heart draws.' },
    ],
    takeaway: 'Against a player who bluffs too often, call more with hands that beat bluffs and can improve.',
  },
  'bottom-set-four-bet-pot-river': {
    why: 'Call: your set beats aces and A-K, the hands that bet here, and you need about 28%. A raise folds A-A and A-K and gets called only by K-K. In a tournament the chips you risk with a raise are worth more than the ones you’d win, so calling keeps their value hands paying you.',
    streets: [
      { street: 'preflop', text: 'You 3-bet 3♠3♣ light from the hijack, a tight, straightforward button cold 4-bets, the opener folds and you call. A straightforward cold 4-bet has very few bluffs.', range: 'A-A, K-K, Q-Q, A-K, a few bluffs.' },
      { street: 'flop', text: 'You flop bottom set on J♥6♠3♥, check, and they check back. In a 4-bet pot against a strong range you don’t want to blow it up against a bigger set.', range: 'A-A, K-K, Q-Q and A-K taking a free card, a few bluffs.' },
      { street: 'turn', text: 'The K♥ helps A-K and K-K. You check, they bet a bit over half the pot, and you call: a raise would fold the hands you beat.', range: 'A-A, A-K, K-K, and some bluffs.' },
      { street: 'river', text: 'The 7♠ changes little. You check and they bet ⅔ pot again; a straightforward player keeps betting A-A and A-K for value.', range: 'Value you beat: A-A and A-K. Beats you: K-K. The odd bluff.' },
    ],
    takeaway: 'Raise only when worse hands call; when only a bigger set would call, just call.',
  },
  'set-of-sixes-tiny-river-bet': {
    why: 'Call: a quarter-pot bet means you need only about 17%. Flushes bet this way, but so do two pair, smaller sets and one pair heading for a cheap showdown. You’d have to be sure they bet nothing but a flush to fold, and you can’t be. Folding the best hand costs far more than paying off a flush now and then.',
    streets: [
      { street: 'preflop', text: 'The lojack opens early in a big tournament, the cutoff calls, you call on the button with 6♠6♣ and the big blind calls. Four-way and deep, everyone plays hands that flop well.', range: 'Pairs, suited aces, broadways and suited connectors.' },
      { street: 'flop', text: 'You flop a set on K♣6♥3♣. It checks to you, you bet, and only the cutoff calls.', range: 'Kings, pairs, club draws, the odd set.' },
      { street: 'turn', text: 'The Q♣ puts three clubs out. You bet small for value and the cutoff makes a small, confusing raise. Re-raising only gets called by flushes, so you call.', range: 'Flushes, K-Q and bigger sets, one pair raising small, club draws.' },
      { street: 'river', text: 'The 8♥ is a blank and they bet a quarter of the pot. That’s often a flush, but players also bet two pair, smaller sets and one pair this small.', range: 'Ahead of you: flushes, K-K and Q-Q. Behind you: K-Q, 3-3 and one pair betting small.' },
    ],
    takeaway: 'Facing a tiny bet you need to be right very rarely: call unless you’re sure they only bet the nuts.',
  },
  'set-of-queens-river-size': {
    why: 'Bet about ⅔ pot: jacks, overpairs and sets can all call that, and you beat every one. A third gets more calls but less money; an overbet folds the jacks you want paying you. Only A-K and 9-8 beat you, and they’d raise anyway.',
    streets: [
      { street: 'preflop', text: 'An early raiser opens, you 3-bet Q♠Q♦, and they call. An early caller of a 3-bet has strong hands, sometimes A-A or K-K trapping.', range: 'Strong pairs, A-K, A-Q, suited broadways, sometimes A-A or K-K.' },
      { street: 'flop', text: 'On a very connected J♣T♥2♣ they check and you check behind. Their range holds every set and draw that beats or crushes queens, so you keep the pot small.', range: 'Jacks, tens, sets, A-K and K-Q drawing, club draws, overpairs.' },
      { street: 'turn', text: 'The 7♠ gives 9-8 a straight and they bet the pot. You beat their bluffs and some value bets, so you call; raising risks too much against better.', range: 'Jacks, tens, sets, 9-8, overpairs, A-K and club draws.' },
      { street: 'river', text: 'The Q♥ gives you a set and A-K a straight. They check. A pot-size bet then a check is strong but not top: hands that want a showdown.', range: 'Normal bet: jacks, K-K, A-A. Small only: tens. May raise: sets J-J, T-T, 7-7, 2-2. Beat you: A-K, 9-8. Fold: missed clubs.' },
    ],
    takeaway: 'Bet the size their medium-strong hands can call; an overbet folds them.',
  },
  'top-pair-river-check-behind': {
    why: 'Check behind: you’re often best, but a bet only gets called by hands that beat you. Two pair, sets and straights call any size, and the worse tens and nines fold. With no read that they call down light, take the free showdown.',
    streets: [
      { street: 'preflop', text: 'You open A♥T♥ from the hijack and the small blind calls, with exactly the kind of hands that love a middle board.', range: 'Pairs, suited aces, broadways and suited connectors.' },
      { street: 'flop', text: 'You flop top pair on T♠9♦8♥, as connected as boards get. You c-bet and they call.', range: 'Straights like Q-J and 7-6, two pairs, sets, tens and nines, straight draws.' },
      { street: 'turn', text: 'The 6♥ completes many draws and gives you a heart draw. They lead small. Top pair with a flush draw can’t fold, and a raise could be re-raised, so you call.', range: 'Straights, sets and two pair leading small, pairs blocking, draws.' },
      { street: 'river', text: 'The 2♣ misses your flush and they check. Bet, and two pair or better calls almost any size while most one-pair hands fold.', range: 'Ahead: Q-J, 7-6, sets and two pair. Behind: tens and nines, missed K-Q and K-J.' },
    ],
    takeaway: 'When worse hands fold and better ones call, take the free showdown.',
  },
  'nut-flush-river-size-multiway': {
    why: 'Bet small: both players checked, so neither has a flush, and a big bet rarely gets called. A small bet keeps in the overpairs, Q-J and stubborn top pairs, which is where your money is. ¾ pot is close but folds the top pairs; a shove gets called by almost nothing.',
    streets: [
      { street: 'preflop', text: 'Seven players limp in a live game, you with A♠5♠, including a tricky player under the gun who can limp A-A and K-K. Nobody has shown strength.', range: 'Wide for everyone; under the gun can hold a trapping big pair.' },
      { street: 'flop', text: 'On Q♠J♠3♣ under the gun bets small and five of you call, you with the nut flush draw. Any queen, jack or draw calls a small bet into a crowd.', range: 'Queens, jacks, Q-J, spade and straight draws, big pairs.' },
      { street: 'turn', text: 'The 6♠ gives you the nut flush. Under the gun bets, the lojack calls, the rest fold, and you just call so the hands behind you stay in.', range: 'Under the gun: overpairs, queens, Q-J. Lojack: queens, Q-J and pairs.' },
      { street: 'river', text: 'The 2♣ is a blank and both check to you. A flush would have bet, so both are capped at overpairs, top pairs and Q-J.', range: 'UTG: A-A, K-K, A-Q, K-Q, Q-T, Q-J. Lojack: K-Q, Q-T, Q-9, Q-J, pocket pairs. Top and pocket pairs call only small.' },
    ],
    takeaway: 'Against capped ranges, a small value bet gets more calls and more money than a big one.',
  },
  'eights-full-river-raise': {
    why: 'Raise: Q-Q, K-K and A-A are 18 combos that pay, while J-J, T-T and quads are only 7 that beat you. Calling needs a third, but a raise needs to beat more than half of what calls it, and the overpairs make that easy. Only their bluffs fold to a raise, so just calling leaves chips behind.',
    streets: [
      { street: 'preflop', text: 'A regular opens the cutoff and you call on the button with 8♣8♠; they have 95 big blinds.', range: 'Pairs, broadways and suited aces.' },
      { street: 'flop', text: 'You flop a full house on 8♦3♦3♥. They check, you bet small and they call: a small bet keeps their overpairs and draws in.', range: 'Overpairs, threes, diamond draws, floats.' },
      { street: 'turn', text: 'The T♣. They check, you bet, and they check-raise. Unusual action means an unusual hand, but not necessarily the nuts.', range: 'Overpairs Q-Q to A-A, T-T (now a full house), A-3, floats.' },
      { street: 'river', text: 'The J♥ gives J-J a full house. They bet the pot.', range: 'Value you beat: Q-Q, K-K, A-A and A-3. Beats you: J-J, T-T, 3-3. Bluffs: floats that check-raised.' },
    ],
    takeaway: 'Raise for value when the hands that call a raise are mostly worse than yours.',
  },
  'jacks-incoherent-story': {
    why: 'Call: their story doesn’t add up. A flop min-raise, a turn check and a pot-size river bet is how a give-up turns into a bluff, not how value plays: nearly all their value would have bet the turn, and the second deuce cuts it further. You need a third, and jacks beat every bluff.',
    streets: [
      { street: 'preflop', text: 'An inexperienced cutoff opens and calls your 3-bet from the big blind with J♣J♥.', range: 'Pairs, suited aces, broadways and suited connectors.' },
      { street: 'flop', text: 'On A♣7♦2♥ you c-bet and they make a near-minimum raise. Strong hands rarely play a 200-big-blind pot this way; inexperienced players raise small with hands they don’t know what to do with.', range: 'Aces, sets, two pairs, and floats raising small.' },
      { street: 'turn', text: 'The 5♦ and they check behind. A-2, A-7, 7-7 or 4-3 would keep building the pot, so the check says the flop raise was weak.', range: 'Fives, floats that gave up, very rarely a slow-played monster.' },
      { street: 'river', text: 'The 2♣ pairs the board and they bet the pot. Either they turned quads, or it’s the bluff their line has been pointing to.', range: 'Value: 2♠2♦, rarely A-2, A-7 or 7-7. Bluffs: floats that raised the flop and gave up.' },
    ],
    takeaway: 'When a line makes no sense for value hands, it’s usually a bluff: call with a hand that beats bluffs.',
  },
};

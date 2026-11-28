import type { Lesson } from '../model';

export const L22: Record<string, Lesson> = {
  'tens-check-back-nit-paired-flush-board': {
    why: 'Check: a nit plays only strong hands and doesn’t bluff. Their 3-bet was J-J and up, A-K and A-Q; after two big calls, J-J and better and the two nut flushes beat you and call any bet, while A-K and A-Q without a diamond are just ace high and fold to one. Check and win the showdown against their ace high.',
    streets: [
      { street: 'preflop', text: 'In a small live game you open T♠T♣ on the button, 190 big blinds deep, and a nit 3-bets from the big blind; you call. Your tens trail every pair they have and lead every ace high.', range: 'J-J, Q-Q, K-K, A-A, A-K, A-Q.' },
      { street: 'flop', text: 'On 9♥9♦2♦ they check, you bet 20 into 22.5, and they call. A nit checks overpairs to trap or control the pot, and calls one bet with A-K and A-Q.', range: 'J-J and up, A-K and A-Q, some with the A♦.' },
      { street: 'turn', text: 'The 2♠ double-pairs the board. You bet 52 into 62.5 and they call. Nothing in their range is weaker than ace high.', range: 'J-J and up, A♦K♦ and A♦Q♦, A-K and A-Q without a diamond.' },
      { street: 'river', text: 'The 5♦ completes the diamonds and they check. Their pairs and flushes call any bet; their unpaired aces fold, but your tens already beat them at showdown.', range: 'Call any bet: J-J and better, A♦K♦, A♦Q♦. Fold: A-K and A-Q without a diamond.' },
    ],
    takeaway: 'Against a nit, value-bet only when worse can call: if only better calls, check and win the showdown.',
  },
  'eights-fold-river-jam-after-turn-raise': {
    why: 'Fold: two strong actions on a board this connected mean a straight or a set. A big turn raise on the card that made any five a straight, then a jam of almost twice the pot, is a five or a set; the busted spade draws are too few. You need about 39%, and eights win much less often.',
    streets: [
      { street: 'preflop', text: 'You open 8♣8♠ from the lojack with 60 big blinds and the button calls, 3-betting its biggest hands.', range: 'Pairs, suited broadways, suited aces like A-5, connectors like 7-5 and 6-5.' },
      { street: 'flop', text: '6♠4♠3♥ checks through: you check your overpair, and they check back hands that don’t want a check-raise and draws taking a free card.', range: 'Pairs, fives with straight draws, spade draws, sixes, overcards.' },
      { street: 'turn', text: 'The 2♣ makes a straight for any five. You bet 1.8 into 7 and they raise to 9.8; you call. A big raise on this card after checking the flop is a five, a set or a big draw.', range: 'Fives, sets, two pairs, spade draws.' },
      { street: 'river', text: 'The Q♥ misses the spades and they jam 47.9 into 26.7.', range: 'Value: a five, sets. Bluffs: busted spade draws.' },
    ],
    takeaway: 'When a big turn raise on a straight card is followed by a big river jam, fold an overpair.',
  },
  'top-pair-jam-paired-river-after-two-barrels': {
    why: 'Jam: the river pairs the board and misses every draw. They checked every street and called a small flop bet and a pot-size turn bet, so their nines, eights and underpairs call any size, while the busted draws fold to anything. A set of eights and A-A beat you, but they’re few. Get it in.',
    streets: [
      { street: 'preflop', text: 'In a tournament, 50 big blinds deep, the cutoff opens and you call Q♣9♣ on the button.', range: 'Wide: pairs, any ace, broadways, suited kings, suited connectors.' },
      { street: 'flop', text: 'You flop top pair on 9♠8♠4♦. They check, you bet small, 1.7 into 6.9, and they call: a small bet keeps their whole range in.', range: 'Nines, eights, fours, underpairs, spade draws, J-T, T-7, 7-6, some sets.' },
      { street: 'turn', text: 'The 2♦. They check, you bet the pot, 10.3, and they call. That drops the weak pairs and fours.', range: 'Nines, eights, 8-8, A-A, some underpairs, spade and straight draws.' },
      { street: 'river', text: 'The 2♥ misses everything and they check. Their pairs call any bet; their draws fold to any bet.', range: 'Beat you: 8-8, A-A. Call any bet: a nine, an eight, some underpairs. Fold: busted draws.' },
    ],
    takeaway: 'When their range is pairs that call any size and draws that fold to anything, bet as big as you can.',
  },
  'kings-small-river-bet-ace-river-check-raised': {
    why: 'Bet small: the A♣ puts an ace over your kings, but a decent amateur who plays too many hands holds a range full of medium hands. Worse queens call a small bet and fold to a big one; A-Q and spade draws with an ace beat you and call either way. A small bet gets paid by the queens and costs little when you’re beaten.',
    streets: [
      { street: 'preflop', text: 'In a big, very deep six-handed tournament you open K♥K♦ from the hijack and the button calls with a wide range.', range: 'Pairs, broadways, suited aces, suited connectors.' },
      { street: 'flop', text: 'On Q♣8♠6♠ you bet 5 into 7.5 and they min-raise to 10.5; you call. An amateur’s min-raise is more often a queen or a spade draw than a set.', range: 'K-Q, Q-J, Q-T, Q-9, spade draws, 9-7, T-9, some sets and two pair.' },
      { street: 'turn', text: 'The 5♣ makes 9-7 and 7-4 straights. You check, they bet 17 into 28.5, and you call.', range: 'Queens, spade and club draws, 9-7, 7-4, sets and two pair.' },
      { street: 'river', text: 'The A♣ puts an ace over your kings and completes a backdoor club draw. You act first.', range: 'Small only: K-Q, Q-J, Q-T, Q-9. Beat you: A-Q, spade draws with an ace, some sets and two pair.' },
    ],
    takeaway: 'When a scare card lands but their range is still full of worse pairs, bet small to get called by them.',
  },
  'top-set-fold-river-raise-monotone-flop': {
    why: 'Fold: a strong, tricky pro can slow-play the nuts on a monotone flop to trap a set. He checked the flop, overcalled, checked the turn, then raised your river bet almost four times: a trap springing. The only bluff is a rare A♠ with nothing, and you need about 30%.',
    streets: [
      { street: 'preflop', text: 'In a big live game a strong pro opens first in, two players call, and you call 8♣8♥ in the big blind.', range: 'Pairs, A-K to A-T, suited aces like A♠K♠ and A♠Q♠, suited broadways.' },
      { street: 'flop', text: 'You flop top set on 8♠6♠3♠, but any two spades is a flush. The cutoff bets 9 into 14.5; you call and the opener overcalls. That keeps strong spades, big pairs with a spade and sets.', range: 'The opener: A♠K♠, A♠Q♠, big pairs with a spade, A-A, K-K, sets.' },
      { street: 'turn', text: 'The A♦ checks round. A tricky player checks the nut flush here to let someone else bet.', range: 'The opener: the nut flush, big flushes, A-A, A-K with a spade, sets.' },
      { street: 'river', text: 'The T♦. You bet 24 and he raises to 92; the cutoff folds.', range: 'Value: the nut flush, slow-played. Bluffs: rarely, the A♠ with nothing.' },
    ],
    takeaway: 'When a tricky pro checks and calls on a monotone board and then raises big, a set is a fold.',
  },
  'bottom-set-call-river-three-barrels': {
    why: 'Call: three bets ending under half the pot are value hands and missed draws trying to get you off one pair. Bottom set beats Q-T, T-9 and Q-J, which bet for value, and missed 9♠8♠ and A-J; only K-J beats you, and it’s a small part of their range. You need about 23%, and a raise gets called only by K-J.',
    streets: [
      { street: 'preflop', text: 'Late in a big tournament you open 7♥7♦ early with 70 big blinds; the player on your left and a late player call.', range: 'Pairs, broadways like K-J, Q-J and Q-T, A-Q, A-J, suited connectors like 9♠8♠.' },
      { street: 'flop', text: 'You flop bottom set on T♣7♠9♥. You check, the player on your left bets 4.58 into 9.3, the other folds and you call, keeping their bluffs and pairs in.', range: 'Tens, nines, T-9, Q-J, K-J, J-8, 9♠8♠, A-J.' },
      { street: 'turn', text: 'The Q♠ makes K-J a straight. You check, they bet 10.42 into 18.5, and you call.', range: 'Q-T, T-9, Q-J, K-J, 9♠8♠ and spade draws, A-J.' },
      { street: 'river', text: 'The 2♥ misses everything. You check and they bet 16.67 into 39.3, a size built to get one pair to call or fold.', range: 'Behind you: Q-T, T-9, Q-J, missed 9♠8♠ and A-J. Ahead of you: K-J, sometimes.' },
    ],
    takeaway: 'With a strong hand against a range of value bets you beat and missed draws, call: a raise only gets called by better.',
  },
  'top-pair-gutshot-call-turn-lead-three-bet-pot': {
    why: 'Call: a less experienced final-table player leads small with a mix of value, draws and bluffs, and less than half the pot prices you at about 21%. You’re behind A-Q, K-Q and their straights, ahead of their king-high club draws and bluffs, and your gutshot to a jack adds outs. With 30 big blinds you can’t fold top pair at this price.',
    streets: [
      { street: 'preflop', text: 'At a final table, about 30 big blinds deep, you 3-bet A♠T♠ from the hijack and the lojack calls. With A-K or a big pair they’d most likely have shoved.', range: 'Pairs below Q-Q, K-Q, K-J, Q-J, A-Q, A-J, K♣J♣, J-T.' },
      { street: 'flop', text: 'Q♣K♥A♣ checks through. You have top pair and a gutshot, and you check back on a board that hits their calling range hard.', range: 'A-Q, K-Q, A-J, J-T, kings with a club draw, queens, small pairs.' },
      { street: 'turn', text: 'The 6♠ and they lead 6 into 16. A less experienced player leads small with two pair and straights, club draws, and small pairs bluffing.', range: 'Ahead: A-Q, K-Q, suited A-J, J-T. Behind: K♣J♣, K♣T♣, small pairs bluffing.' },
    ],
    takeaway: 'When a small lead gives you a great price and you have top pair with outs, call.',
  },
  'small-flush-check-back-river-flush-card': {
    why: 'Check: a strong online pro folds hands that can’t win against a bet and check-raises the ones that can. Their turn call ruled out a straight, so on the river sets, two pair, overpairs and 7-6 fold to a bet, and every flush draw they called with now beats your eight-high flush. Betting only gets paid by better.',
    streets: [
      { street: 'preflop', text: 'In an online six-handed game a strong pro opens under the gun and you call 8♦7♦ on the button.', range: 'Pairs, A-K to A-T, suited broadways like K♦Q♦, some 7-6.' },
      { street: 'flop', text: 'On 6♦4♥2♦ you have a straight draw and a flush draw. They bet 5.5 into 8.5 and you call.', range: 'Overpairs, sets, A♦K♦ and other diamond draws, 7-6, A-K, A-Q.' },
      { street: 'turn', text: 'The 5♠ makes your straight. They check, you bet 13.33 into 19.5, and they call. A straight would bet or check-raise, so they don’t have one.', range: 'Overpairs, sets, two pair, 7-6, A♦K♦ and K♦Q♦.' },
      { street: 'river', text: 'The A♦ completes your flush, and theirs. They check.', range: 'Raise a bet: bigger flushes. Fold: sets, two pair, overpairs, 7-6.' },
    ],
    takeaway: 'When a bet only gets called or raised by better hands, check a small flush.',
  },
  'missed-straight-draw-overbet-jam-paired-river': {
    why: 'Jam: a good online pro with a tight calling range raises their strong hands, so two calls cap them at 9-9 to J-J, some queens and club draws. Those pairs call a normal bet but fold to a jam, and the missed clubs fold anyway. Ten high can’t win at showdown, so bet the most you can.',
    streets: [
      { street: 'preflop', text: 'In a big online tournament, 55 big blinds deep, you open T♠9♠ early and a good pro calls in the cutoff.', range: 'Pairs, suited broadways like K-Q and Q-J, A-Q, A-J, suited aces like A♣x♣.' },
      { street: 'flop', text: 'On 8♣7♦2♣ you have an open-ender. You bet 3.91 into 7.35 and they call; this player raises sets.', range: '9-9 to J-J, eights, club draws, straight draws like T-9 and 9-6.' },
      { street: 'turn', text: 'The Q♦ misses you. You bet 9.03 into 15.2 and they call again; A-A, K-K and sets would raise here.', range: '9-9 to J-J, some queens, club draws.' },
      { street: 'river', text: 'The 8♦ pairs the board and misses the clubs, and you act first. Their pairs face a paired board after two barrels.', range: 'Normal bet but not a jam: 9-9 to J-J. Fold: missed club draws.' },
    ],
    takeaway: 'When their range is capped at medium pairs, a big river jam folds them out.',
  },
  'aces-call-small-river-jam-after-check-raise': {
    why: 'Call: one of the best online players check-raises this flop with suited connectors as well as sets. Their value at the end is quad threes and deuces full, rarely an eight; their bluffs are every suited connector that check-raised and kept firing. The jam is small against the pot, so the price is only 18%, and aces win far more often.',
    streets: [
      { street: 'preflop', text: 'Late in a big online tournament you open A♣A♥ under the gun and one of the best players defends the big blind light.', range: 'Very wide: suited connectors like 5-4, 6-5, 7-6, small pairs, broadways, suited aces.' },
      { street: 'flop', text: 'On a dry Q♣3♥2♠ you bet 3.27 into 6.5 and they check-raise to 9.33; you call. They check-raise sets and wheel-draw connectors here; queens mostly call.', range: '3-3, 2-2, suited connectors like 5-4 and 6-4, a few queens.' },
      { street: 'turn', text: 'The 8♣ adds a club draw. They bet 9.67 into 25 and you call: sets build the pot, bluffs keep going.', range: '3-3, 2-2, suited connectors with wheel or club draws, the odd eight.' },
      { street: 'river', text: 'The 3♠ gives 3-3 quads and 2-2 a full house. They jam their last 13.03 into 44.5. Their sets improved, but their bluffs are the same connectors as before.', range: 'Value: quad threes, deuces full, very rarely an eight. Bluffs: suited connectors that check-raised.' },
    ],
    takeaway: 'When the price is small and a strong player’s line holds many bluffs, call with an overpair.',
  },
};

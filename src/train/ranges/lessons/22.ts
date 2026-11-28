import type { Lesson } from '../model';

export const L22: Record<string, Lesson> = {
  'tens-check-back-nit-paired-flush-board': {
    why: 'Check: a nit plays only strong hands and doesn’t bluff, so their calls and checks are honest. Their 3-bet was J-J and up, A-K and A-Q, and after two big calls on this board the A-K and A-Q without a diamond are just ace high, while J-J and better, A♦K♦ and A♦Q♦ beat you. The hands that would call a third bet all beat you, and the ones you beat fold. Check and win the showdown against their ace high.',
    streets: [
      { street: 'preflop', text: 'In a small live game you open T♠T♣ on the button to 3, 190 big blinds deep, and a nit 3-bets from the big blind to 11; you call. A nit 3-bets only J-J and up, A-K and A-Q. That’s the whole story of this hand: your tens are behind every pair they have and ahead of every ace-high hand.', range: 'J-J, Q-Q, K-K and A-A; A-K and A-Q.' },
      { street: 'flop', text: 'The flop is 9♥9♦2♦, paired with a diamond draw. They check, you bet 20 into about 22.5, and they call. A nit who checks to you out of position with an overpair is trapping or pot-controlling; with A-K and A-Q they check and call one bet with two overcards and, now and then, a diamond draw.', range: 'J-J and up, and A-K and A-Q, some of them with the A♦.' },
      { street: 'turn', text: 'The 2♠ double-pairs the board. They check again, you bet 52 into about 62.5, and they call. A nit calling a big second bet with A-K or A-Q is relying on overcards or a diamond draw; with J-J and up they’re happy to keep calling. Nothing in their range is weaker than ace high.', range: 'J-J and up; A♦K♦ and A♦Q♦ with the nut flush draw; A-K and A-Q without a diamond.' },
      { street: 'river', text: 'The 5♦ completes the diamonds. They check. J-J and better and the two nut flushes call any bet you make. A-K and A-Q without a diamond are just ace high now, and they fold to any bet, but your tens already beat them at showdown.', range: 'Calls any bet: J-J and better, A♦K♦ and A♦Q♦. Folds: A-K and A-Q without a diamond.' },
    ],
    takeaway: 'Against a nit, value-bet only when worse can call: if only better calls, check and win the showdown.',
  },
  'eights-fold-river-jam-after-turn-raise': {
    why: 'Fold: two strong actions on a board this connected mean a straight or a set. A big turn raise on the card that made any five a straight, then a jam of almost twice the pot, is value: a five or a set. The bluffs are busted spade draws, and there aren’t enough of them. You’re getting a price of about 39%, and eights win much less often.',
    streets: [
      { street: 'preflop', text: 'You open 8♣8♠ from the lojack to 2.3 with 60 big blinds, and the button calls. A button calls with pairs, suited broadways, suited aces and connectors, and would 3-bet the biggest hands.', range: 'Pairs, suited broadways, suited aces like A-5, and connectors like 7-5 and 6-5.' },
      { street: 'flop', text: 'The flop is 6♠4♠3♥, low and connected with a spade draw. You check your overpair, and they check behind. A button checks back hands with some value that don’t want to face a check-raise, and some draws looking for a free card.', range: 'Pairs, fives with straight draws, spade draws, sixes, and overcards.' },
      { street: 'turn', text: 'The 2♣ makes a straight for any five. You bet small, 1.8 into about 7, and they raise to 9.8; you call. A big raise on this card from a player who checked the flop is a five, a set, or a spade draw with a lot of outs.', range: 'Fives (straights), sets, two pairs, and spade draws.' },
      { street: 'river', text: 'The Q♥ misses the spades. They jam 47.9 into about 26.7, almost twice the pot. Two strong actions on a board this connected mean a straight or a set. A spade draw that missed might jam too, but there aren’t many.', range: 'Value: a five (the straight) and sets. Bluffs: busted spade draws.' },
    ],
    takeaway: 'When a big turn raise on a straight card is followed by a big river jam, fold an overpair.',
  },
  'top-pair-jam-paired-river-after-two-barrels': {
    why: 'Jam: the river 2♥ pairs the board and misses every draw. They checked to you every street and called a small flop bet and a pot-size turn bet, so their range is nines, eights, some underpairs and a lot of draws. A set of eights and A-A beat you, but a nine, an eight and the underpairs call any bet. The busted draws fold whatever you bet. Get it in.',
    streets: [
      { street: 'preflop', text: 'In a tournament, 50 big blinds deep, the cutoff opens to 2.2 and you call Q♣9♣ on the button. A cutoff opens wide, and suited Q-9 plays well in position against it.', range: 'Wide: pairs, any ace, broadways, suited kings and suited connectors.' },
      { street: 'flop', text: 'You flop top pair on 9♠8♠4♦, with spade and straight draws. They check, you bet small, 1.7 into about 6.9, and they call. A small bet keeps their whole range in: nines, eights, fours, underpairs, spade draws and straight draws.', range: 'Nines, eights, fours, underpairs, spade draws, straight draws like J-T, T-7 and 7-6, and some sets.' },
      { street: 'turn', text: 'The 2♦ is a blank. They check, you bet the pot, 10.3, and they call again. A pot-size bet takes out weak pairs and fours, and keeps nines, eights, some underpairs and the draws.', range: 'Nines, eights, a set of eights, A-A, some underpairs, spade draws and straight draws.' },
      { street: 'river', text: 'The 2♥ misses everything. They check. Their nines, eights and underpairs call any bet, and the busted flush and straight draws fold to anything. A set of eights and A-A beat you, but they’re few.', range: 'Beats you: a set of eights and A-A. Calls any bet: a nine, an eight, and some underpairs. Folds: busted flush and straight draws.' },
    ],
    takeaway: 'When their range is pairs that call any size and draws that fold to anything, bet as big as you can.',
  },
  'kings-small-river-bet-ace-river-check-raised': {
    why: 'Bet small: the A♣ puts an ace over your kings, but a decent amateur who plays too many hands has a range full of medium hands. Worse queens, K-Q, Q-J, Q-T and Q-9, call a small bet but fold to a big one. A-Q and spade draws with an ace beat you and call, and some sets and two pair too. A small bet gets paid by the queens and costs little when you’re beaten.',
    streets: [
      { street: 'preflop', text: 'In a big, very deep six-handed tournament, you open K♥K♦ to 3 from the hijack and the button calls. A decent amateur who plays too many hands before the flop calls with a wide range of suited hands, connectors, pairs and broadways.', range: 'Wide: pairs, suited and offsuit broadways, suited aces, suited connectors.' },
      { street: 'flop', text: 'The flop is Q♣8♠6♠, with spade and straight draws. You bet 5 into about 7.5, and they min-raise to 10.5; you call. A min-raise is more often a queen or a spade draw than a set: an amateur makes a small raise to see where they stand.', range: 'Queens like K-Q, Q-J, Q-T and Q-9, spade draws, straight draws like 9-7 and T-9, and some sets and two pair.' },
      { street: 'turn', text: 'The 5♣ adds clubs and gives 9-7 and 7-4 straights. You check, they bet 17 into about 28.5, and you call. An amateur keeps betting their queens and draws here.', range: 'Queens, spade and club draws, 9-7 and 7-4, sets and two pair.' },
      { street: 'river', text: 'The A♣ puts an ace over your kings and completes a backdoor club draw. You act first. Their worse queens call a small bet but fold to a big one, and A-Q and spade draws with an ace beat you.', range: 'Calls only small: worse queens (K-Q, Q-J, Q-T, Q-9). Beats you: A-Q, spade draws with an ace, and some sets and two pair.' },
    ],
    takeaway: 'When a scare card lands but their range is still full of worse pairs, bet small to get called by them.',
  },
  'top-set-fold-river-raise-monotone-flop': {
    why: 'Fold: a strong, tricky pro can slow-play the nuts on a monotone flop to trap a set. He checked the flop, overcalled, checked the turn, then raised your river bet almost four times. That’s a trap springing. The only bluff is a rare A♠ with nothing. You’re getting a price of about 30%, and top set wins far less often.',
    streets: [
      { street: 'preflop', text: 'In a big live game a strong pro opens first in to 3.5, two players call and you call 8♣8♥ in the big blind. An early-position open from a strong player is a tight range: big pairs, big aces and suited broadways.', range: 'Pairs, A-K down to A-T, suited aces like A♠K♠ and A♠Q♠, and suited broadways.' },
      { street: 'flop', text: 'The flop is 8♠6♠3♠, monotone: you have top set, but any two spades is a flush. It checks to the cutoff, who bets 9 into about 14.5; you call and so does the opener, while the player in between folds. The opener’s check-call, with you still to act behind, keeps strong spades, big pairs with a spade, and the odd set.', range: 'The opener: flushes like A♠K♠ and A♠Q♠, big pairs with a spade, A-A and K-K, and sets.' },
      { street: 'turn', text: 'The A♦ is a blank for the flushes. It checks round. A tricky player checks the nut flush here to let someone else bet.', range: 'The opener: the nut flush, big flushes, A-A, A-K with a spade, and sets.' },
      { street: 'river', text: 'The T♦ changes little. You bet 24, and he raises to 92, almost four times your bet; the cutoff folds. After checking the flop, overcalling and checking the turn, this is a trap springing.', range: 'Value: the nut flush, slow-played. Bluffs: rarely, the A♠ with nothing.' },
    ],
    takeaway: 'When a tricky pro checks and calls on a monotone board and then raises big, a set is a fold.',
  },
  'bottom-set-call-river-three-barrels': {
    why: 'Call: they bet three times, ending with under half the pot, betting value hands and missed draws to get you off one pair. Bottom set beats Q-T, T-9 and Q-J, which bet for value, and missed 9♠8♠ and A-J. Only K-J, the straight, beats you, and it’s a small part of their range. A bet of under half the pot sets the price at about 23%, and you’re ahead almost every time. Raising only gets called by K-J, so call.',
    streets: [
      { street: 'preflop', text: 'Late in a big tournament, 70 big blinds deep, you open 7♥7♦ from early position to 2.17; the player on your left and a late player call. The player on your left calls with pairs, suited broadways, A-J and A-Q, and suited connectors.', range: 'Pairs, broadways like K-J, Q-J and Q-T, A-Q and A-J, and suited connectors like 9♠8♠.' },
      { street: 'flop', text: 'You flop bottom set on T♣7♠9♥, a connected board. You check, the player on your left bets 4.58 into about 9.3, the late player folds and you call. Check-calling with a set on a board this connected keeps their bluffs and one-pair hands in. They bet tens, nines, straight draws like Q-J, J-8 and K-J, and some air.', range: 'Tens and nines, two pairs like T-9, straight draws like Q-J, K-J, J-8 and 9♠8♠, and overcards like A-J.' },
      { street: 'turn', text: 'The Q♠ makes K-J a straight and adds a spade draw. You check, they bet 10.42 into about 18.5, and you call. Their range is now Q-T and T-9 two pairs, top pairs, K-J, and draws like 9♠8♠ and A-J that picked up more outs.', range: 'Q-T, T-9 and Q-J; K-J; 9♠8♠ and other spade draws; A-J with a gutshot.' },
      { street: 'river', text: 'The 2♥ misses everything. You check, and they bet 16.67 into about 39.3, under half the pot. A small third bet is designed to get one pair to call or fold. Two pairs and top pairs bet for value, and missed draws bet to get you off a pair.', range: 'Behind you: Q-T, T-9 and Q-J; missed 9♠8♠ and A-J. Ahead of you: K-J, sometimes.' },
    ],
    takeaway: 'With a strong hand against a range of value bets you beat and missed draws, call: a raise only gets called by better.',
  },
  'top-pair-gutshot-call-turn-lead-three-bet-pot': {
    why: 'Call: a less experienced final-table player leads small with a mix of value, draws and bluffs. A lead of less than half the pot sets the price at about 21%, a great price. You’re behind A-Q, K-Q and their straights, but ahead of their king-high club draws and bluffs, and your gutshot to a jack adds outs when you’re behind. With 30 big blinds you can’t fold top pair for a price this good.',
    streets: [
      { street: 'preflop', text: 'At a final table about 30 big blinds deep, you 3-bet A♠T♠ from the hijack to 7 and the lojack calls. With A-K or a big pair they’d most likely have shoved, so their call is pairs, broadways and suited aces.', range: 'Pairs below Q-Q, broadways like K-Q, K-J and Q-J, A-Q and A-J, and suited hands like K♣J♣ and J-T.' },
      { street: 'flop', text: 'The flop is Q♣K♥A♣, broadway with a club draw. You have top pair and a gutshot to a jack. It checks through: they check out of position, and you check back to keep the pot small on a board that hits their calling range hard.', range: 'A-Q, K-Q, A-J, J-T (a straight), kings with a club draw, queens, and small pairs.' },
      { street: 'turn', text: 'The 6♠ is a blank. They lead 6 into about 16, less than half the pot. A small lead gives you a great price. A less experienced player leads small with two pair and straights for value, with club draws, and with small pairs as a bluff.', range: 'Ahead of you: A-Q and K-Q, suited A-J and J-T. Behind you: K♣J♣ and K♣T♣, and a small pair bluffing.' },
    ],
    takeaway: 'When a small lead gives you a great price and you have top pair with outs, call.',
  },
  'small-flush-check-back-river-flush-card': {
    why: 'Check: a strong online pro folds hands that can’t win against a bet and check-raises the hands that can. They checked the turn and called your bet, so they don’t have a straight. On the river their sets, two pair, overpairs and 7-6 fold to a bet, and a bigger flush raises. Betting only gets paid by better.',
    streets: [
      { street: 'preflop', text: 'In an online six-handed game, a strong pro opens under the gun to 3.5 and you call 8♦7♦ on the button. An under-the-gun open is tight: big pairs, strong aces and suited broadways.', range: 'Pairs, A-K down to A-T, suited broadways like K♦Q♦, and some suited connectors like 7-6.' },
      { street: 'flop', text: 'The flop is 6♦4♥2♦, and you have a straight draw and a flush draw. They bet 5.5 into about 8.5, and you call. A c-bet here is overpairs, sets, A-K with a diamond, and straight draws.', range: 'Overpairs, sets, A♦K♦ and other diamond draws, 7-6, and A-K and A-Q.' },
      { street: 'turn', text: 'The 5♠ makes your straight. They check, you bet 13.33 into about 19.5, and they call. They don’t have a straight, which would bet or check-raise; their range is overpairs, sets, two pair, 7-6 and flush draws.', range: 'Overpairs, sets, two pair, 7-6, and diamond draws like A♦K♦ and K♦Q♦.' },
      { street: 'river', text: 'The A♦ completes your flush and theirs. They check. Every flush draw they called with now beats your eight-high flush. Sets, two pair, overpairs and 7-6 fold to a bet; a bigger flush raises.', range: 'Raises a bet: a bigger flush. Folds: sets and two pair, overpairs and 7-6.' },
    ],
    takeaway: 'When a bet only gets called or raised by better hands, check a small flush.',
  },
  'missed-straight-draw-overbet-jam-paired-river': {
    why: 'Jam: a good online pro with a tight calling range calls with medium pairs and draws and raises their strong hands. They called two bets without raising, so a set, aces or kings would have raised: their range is capped at 9-9 to J-J. Those call a normal bet but fold to a jam, and missed club draws fold anyway. Ten high can’t win at showdown, so bet the most you can.',
    streets: [
      { street: 'preflop', text: 'In a big online tournament, 55 big blinds deep, you open T♠9♠ from early position to 2.36 and a good pro calls in the cutoff. A tight caller in the cutoff has pairs, suited broadways and suited aces.', range: 'Pairs, suited broadways like K-Q and Q-J, A-Q and A-J, and suited aces like A♣x♣.' },
      { street: 'flop', text: 'The flop is 8♣7♦2♣, and you have an open-ended straight draw. You bet 3.91 into about 7.35, and they call. A tight caller continues with overpairs, eights, club draws and straight draws, and raises sets.', range: 'Pairs 9-9 to J-J, eights, club draws, and straight draws like T-9 and 9-6.' },
      { street: 'turn', text: 'The Q♦ misses you. You bet 9.03 into about 15.2, and they call again. A good player raises A-A, K-K and sets here; calling twice caps their range at 9-9 to J-J, queens, and club draws.', range: 'Pairs 9-9 to J-J, some queens, and club draws.' },
      { street: 'river', text: 'The 8♦ pairs the board and misses the clubs. You’re first to act. Their 9-9 to J-J now face a paired board and two barrels; they call a normal bet but fold to a jam. Missed club draws fold to anything.', range: 'Calls a normal bet but folds to a jam: pairs 9-9 to J-J. Folds: missed club draws.' },
    ],
    takeaway: 'When their range is capped at medium pairs, a big river jam folds them out.',
  },
  'aces-call-small-river-jam-after-check-raise': {
    why: 'Call: one of the best online players check-raises this flop with suited connectors as bluffs, as well as with sets. Their value at the end is quad threes and deuces full, and very rarely eights: a flop check-raise with an eight is very unlikely. Their bluffs are every suited connector that check-raised and kept firing. The jam is a small part of the pot, so the price is only 18%, and aces win far more often than that.',
    streets: [
      { street: 'preflop', text: 'Late in a big online tournament you open A♣A♥ under the gun to 2.53, and one of the best players defends the big blind, as he does light. A light big-blind defence against an early open is full of suited connectors, small pairs and suited broadways.', range: 'Very wide: suited connectors like 5-4, 6-5 and 7-6, small pairs, broadways and suited aces.' },
      { street: 'flop', text: 'The flop is Q♣3♥2♠, dry. You bet 3.27 into about 6.5, and they check-raise to 9.33; you call. On a dry board, a strong player check-raises with sets, 3-3 and 2-2, and with suited connectors that have a wheel draw or backdoors, as bluffs. Queens mostly just call.', range: 'Sets 3-3 and 2-2, suited connectors like 5-4, 6-4 and 5-4 with wheel draws, and a few queens.' },
      { street: 'turn', text: 'The 8♣ adds a club draw. They bet 9.67 into about 25, and you call. A smaller second bet keeps their sets building the pot, and keeps their bluffs going, now with a club draw for the suited ones.', range: 'Sets 3-3 and 2-2, suited connectors with wheel or club draws, and the odd eight.' },
      { street: 'river', text: 'The 3♠ pairs the board, giving 3-3 quads and 2-2 a full house. They jam their last 13.03 into about 44.5. Their sets got better, but their bluffs are the same suited connectors as before, and a jam this small asks very little.', range: 'Value: quad threes and deuces full, and very rarely eights. Bluffs: suited connectors that check-raised.' },
    ],
    takeaway: 'When the price is small and a strong player’s line holds many bluffs, call with an overpair.',
  },
};

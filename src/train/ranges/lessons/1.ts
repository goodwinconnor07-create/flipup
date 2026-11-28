import type { Lesson } from '../model';

export const L1: Record<string, Lesson> = {
  'deuces-river-shove': {
    why: 'Call: bottom set beats every two pair and every missed draw, and this overbet is full of both. Only the heart flushes, 6-6 and 8-8 beat you, and they’re few: the flush needed two running hearts and each set is three combos. Four two-pair hands and a long list of bricked spade and wheel draws shove too. The price is 38%, and you’re ahead far more often. There’s no raise left, so it’s call or fold.',
    streets: [
      { street: 'preflop', text: 'You open 2♠2♦ from second position, 150 big blinds deep, and the cutoff, button and big blind call. The cutoff’s cold call matters most: with three players behind it, A-A, K-K and A-K would usually 3-bet, so its range is capped and middling.', range: 'Pocket pairs, suited aces like A-J and A-8, suited broadways and suited connectors; rarely a big pair.' },
      { street: 'flop', text: 'You flop bottom set on A♠J♠2♥. Four-way on a wet board you bet, 7 into 12.5. The cutoff calls, the button folds and the big blind calls. Calling with a player still behind takes a real hand, so pairs below jacks with no draw let it go.', range: 'Aces like A-J, A-8, A-6 and A-2; jacks; spade draws like K♠Q♠ and 9♠8♠; wheel draws like 5-4 suited; a rare set.' },
      { street: 'turn', text: 'The 6♥ adds a heart draw. You bet 22 into 33.5; the cutoff calls and the big blind folds. Weak jacks can’t call two big bets from an early raiser, and 6-6 just made a set.', range: 'Aces with a kicker, two pair, 6-6, spade draws, heart draws with a big card, wheel draws.' },
      { street: 'river', text: 'The 8♥ completes the backdoor hearts and misses every spade and wheel draw. You check and the cutoff shoves 118 into 77.5. An overbet is polarised: a lone ace would check or bet small, but live players often shove two pair here, sure it’s best.', range: 'Value: heart flushes, 6-6, 8-8, a rare A-A or J-J, and A-J, A-8, A-6 and A-2, which you beat. Bluffs: every missed spade and wheel draw.' },
    ],
    takeaway: 'Against a polarised overbet, count the bluffs and the value you beat: a set that beats both is a call even when a backdoor draw got there.',
  },
  'jacks-paired-river': {
    why: 'Fold: jacks beat only the bluffs, and the value outnumbers them by far. Queens alone are dozens of combos before you add sets and two pair, while the bluffs are a few straight draws that chose to bet. A half-pot bet asks you to win one time in four, and you’re well short. Raising doesn’t help: after your turn check, a queen won’t believe you and won’t fold.',
    streets: [
      { street: 'preflop', text: 'You open J♦J♠ from middle position, 200 big blinds deep; the cutoff calls and the big blind defends. With two players in, the big blind gets a great price and defends wide, but rarely with Q-Q or better, which would 3-bet.', range: 'Wide: queens like K-Q, Q-J and Q-T, suited aces, middle pairs, suited connectors, some A-Q.' },
      { street: 'flop', text: 'On Q♣8♥6♦ you bet 6 into 11; the cutoff folds and the big blind calls. Jacks are ahead of the eights, sixes and draws; only queens and better have you. The call says they hit something, so the air is gone.', range: 'Queens, eights and sixes, 8-8, 6-6 and 8-6, and straight draws like T-9, 9-7 and 7-5.' },
      { street: 'turn', text: 'The 3♥ changes little. They check and you check behind: a queen won’t fold to a second bet, and a check-raise would leave you guessing. Your check also tells them you probably don’t have a queen.', range: 'Unchanged: queens, eights and sixes, two pair and sets, and draws with a free card.' },
      { street: 'river', text: 'The 3♠ misses every draw, and the player who checked twice leads half the pot. An eight or a six would check and hope to show down. A queen has watched you check and wants to be paid, so it bets; many live players just give up their missed draws.', range: 'Value: queens, 8-8, 6-6 and 8-6. Bluffs: a few missed draws like T-9 and 9-7.' },
    ],
    takeaway: 'When a passive player checks twice and then leads the river after you check behind, they think they’re ahead: fold a bluff catcher that only beats missed draws.',
  },
  'kings-double-paired': {
    why: 'Fold: the Q♣ made every queen and jack they called with trips or a full house, about fifty value combos. Your kings beat only T-9 and K-T, and your two kings leave just a couple of K-T, so there are six or so bluffs. A ¾-pot bet prices you at 30%, and you’re far short.',
    streets: [
      { street: 'preflop', text: 'You open K♠K♣ from second position, 100 big blinds deep, and the hijack cold-calls. With six players behind, the hijack 3-bets its biggest hands and calls with the middle.', range: 'Pocket pairs, suited aces, suited broadways like K-Q, Q-J and J-T, A-Q and A-J, suited connectors.' },
      { street: 'flop', text: 'J♣J♦Q♠ hits a cold-calling range hard: every queen and jack connects, and K-T and T-9 have straight draws. You bet 6 and they call; small pairs and suited aces with no draw fold.', range: 'Queens (A-Q, K-Q, Q-T, Q-9), jacks (A-J, K-J, J-T, J-9), Q-J, the odd 2-2, and K-T and T-9.' },
      { street: 'turn', text: 'The 2♥ is a blank. You bet 14 into 20.5 and they call again. One pair below jacks can’t call twice against an early raiser, so the range is now almost all queens and jacks plus the draws.', range: 'Queens and jacks, Q-J and 2-2, and K-T and T-9 drawing.' },
      { street: 'river', text: 'The Q♣ double-pairs the board: every queen is now trips and every jack a full house. You check and they bet 36 into 48.5. In position a medium hand would check behind, so this is a strong hand or a missed draw.', range: 'Value: A-Q, K-Q, Q-T, Q-9, A-J, K-J, J-T, J-9, Q-J and 2-2. Bluffs: T-9 and the two K-T your kings don’t block.' },
    ],
    takeaway: 'When the river pairs a card their range is full of, an overpair becomes a bluff catcher: count the bluffs left, and fold when there are almost none.',
  },
  'trip-aces-shove': {
    why: 'Fold: nothing that shoves here is worse than you. A-K and A-Q outkick you, K-K, Q-Q, 4-4 and A-4 are full houses, and A-J and A-T only split. You need 25%, and you never win outright. A player who checked every street and then shoves wants a call, and in a tournament that’s value almost every time.',
    streets: [
      { street: 'preflop', text: 'Under the gun opens to 2.2, middle position calls, and you call in the hijack with A♣5♣. An under-the-gun open is the tightest range at the table, and your weak kicker is the danger in it.', range: 'Big pairs, A-K down to A-T, suited broadways like K-Q and Q-J.' },
      { street: 'flop', text: 'On A♥A♦4♣ both players check, you bet with trips, and under the gun calls. Their range holds far more aces than yours, with better kickers, and checking a strong ace to the player behind is a natural trap.', range: 'Every ace from A-K to A-T, big pairs like K-K and Q-Q, and 4-4.' },
      { street: 'turn', text: 'The K♦ fills K-K and gives A-K the best kicker. They check and call your 12 again. Nothing weak calls twice into a player who keeps betting.', range: 'A-K, A-Q, A-J and A-T, K-K, Q-Q, 4-4, and a pair or two.' },
      { street: 'river', text: 'The Q♠ fills Q-Q and gives A-Q a kicker over yours. Under the gun, who checked every street, shoves for about half the pot. A passive line that suddenly shoves is rarely a bluff.', range: 'Value: A-K and A-Q, K-K, Q-Q, 4-4 and A-4. Split: A-J and A-T. No bluffs.' },
    ],
    takeaway: 'Trips with a weak kicker are only a bluff catcher against a range full of strong aces; when a passive player shoves, fold.',
  },
  'queens-best-bluff-catcher': {
    why: 'Call: queens beat every missed draw and remove half the Q-9 straights, the hand you fear most. The ace missed every draw they check-raised with, so many of these shoves are bluffs. You need about 36%. Aces would be a worse call: they beat the same bluffs but block none of the straights.',
    streets: [
      { street: 'preflop', text: 'You open Q♥Q♣ from the cutoff and the big blind calls. Facing a late open, the big blind defends very wide, so a middle board will hit them with lots of straight draws.', range: 'Very wide: suited aces and kings, broadways, pairs, connectors like 9-8, 7-6 and 6-5.' },
      { street: 'flop', text: 'On J♣8♥5♦ you bet small, 3 into 5.5, and they call. A small bet keeps their weak pairs and draws in, and a wide range calls it with any pair or straight draw.', range: 'Jacks, eights and fives, straight draws like Q-9, T-9, 9-7, 7-6 and 6-4, some sets and two pair.' },
      { street: 'turn', text: 'The T♠ gives Q-9 and 9-7 a straight. You bet 9 and they check-raise to 28: straights, sets and two pair, plus draws that picked up outs. Your queens beat every draw, so you call.', range: 'Value: Q-9, 9-7, some sets and two pair. Draws: K-9, 9-8, 7-6 and 6-5.' },
      { street: 'river', text: 'The A♥ misses every draw, and they shove 84 into 67.5. A shove that big is polarised: they represent the straight, and every missed draw has to bet to win. A jack would check here.', range: 'Value: Q-9 (fewer, because of your queens), 9-7, some sets and two pair. Bluffs: missed K-9, 9-8, 7-6 and 6-5.' },
    ],
    takeaway: 'The best bluff catcher beats every bluff and blocks their strongest value hands: choose the call with the hand that removes the nuts.',
  },
  'aq-blank-river': {
    why: 'Fold: you don’t even beat their bluffs. A-K, their main bluff, outkicks you, and A-5 has a pair; the only bet you beat is a rare K-Q. The 30% price doesn’t matter when you lose to almost everything that bets.',
    streets: [
      { street: 'preflop', text: 'You open A♦Q♣ from the hijack, the small blind 3-bets to 13.5 and you call. Out of position against a hijack open, a small blind 3-bets strong and fairly linear, with a few suited aces as its light hands.', range: 'Big pairs, A-K and A-Q, and suited aces like A-5 and A-4.' },
      { street: 'flop', text: 'J♦3♠2♥ favours the 3-bettor, who has all the overpairs. They bet 10 into 28, their whole range. You call: you’re ahead of A-K and have overcards and a wheel gutshot.', range: 'Overpairs, A-J, A-K and A-Q, and A-5 and A-4 with a gutshot.' },
      { street: 'turn', text: 'The 5♦ makes A-4 a wheel and gives A-5 a pair. They bet again, 22 into 48. Overpairs bet for value and A-K keeps firing with a gutshot, so ace high can still call.', range: 'Overpairs and sets, A-J and K-J, A-4 and A-5, and A-K barrelling.' },
      { street: 'river', text: 'The 3♦ pairs the board and changes nothing for you. They shove 67 into 92. The trouble is who bluffs: A-K, which beats your A-Q.', range: 'Value: overpairs and sets, A-J and K-J, A-4 and A-5. Bluffs: A-K, which beats you, and sometimes K-Q.' },
    ],
    takeaway: 'Before calling as a bluff catcher, check that you beat their bluffs; ace high often doesn’t.',
  },
};

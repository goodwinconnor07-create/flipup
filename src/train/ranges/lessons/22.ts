import type { Lesson } from '../model';

export const L22: Record<string, Lesson> = {
  'tens-check-back-nit-paired-flush-board': {
    why: 'Check: a nit never folds an overpair or a flush, and never calls a river bet with A-K or A-Q. So a bet only gets called when you’re beaten. You beat their many A-K and A-Q combos at a showdown, and you lose to J-J and up and two flushes either way. Take the showdown.',
    read: [
      { about: 'preflop', text: 'In a small live game you opened T♠T♣ on the button and a nit 3-bet from the big blind. A nit 3-bets only J-J and up, A-K and A-Q.' },
      { about: 'opponent', text: 'A nit plays only strong hands and doesn’t bluff. Their calls and checks are honest.' },
      { about: 'board', text: '9♥9♦2♦ is paired with a diamond draw. The 2♠ double-pairs it, and the 5♦ completes the diamonds.' },
      { about: 'sizing', text: 'They called two big bets. A nit calls with overpairs, A-K and A-Q, and the A-K and A-Q are now just ace high.' },
      { about: 'range', text: 'J-J and better and A♦K♦ and A♦Q♦ call any bet. A-K and A-Q without a diamond fold.' },
    ],
    takeaway: 'Against a nit who never folds better and never calls worse, check.',
  },
  'eights-fold-river-jam-after-turn-raise': {
    why: 'Fold: a jam this big after a turn raise is mostly a five, which has the straight, or a set, and an overpair beats neither. Busted spade draws are the only bluffs, and most players don’t have enough of them here to make a call pay. You need 39%, and you’re short.',
    read: [
      { about: 'preflop', text: 'You opened 8♣8♠ from the lojack with 60 big blinds, and the button called: pairs, suited broadways and connectors.' },
      { about: 'position', text: 'They’re in position. The flop checked through, then they raised your small turn bet.' },
      { about: 'board', text: '6♠4♠3♥ is low and connected with a spade draw. The 2♣ makes a straight for any five, and the Q♥ misses the spades.' },
      { about: 'sizing', text: 'A big turn raise and then a jam of almost twice the pot. Two strong actions on a board this connected mean a straight or a set.' },
      { about: 'range', text: 'For value: a five (the straight) and sets. For bluffs: busted spade draws.' },
    ],
    takeaway: 'A big jam after a turn raise on a straight board is value: fold an overpair.',
  },
  'top-pair-jam-paired-river-after-two-barrels': {
    why: 'Jam: their calling hands are mostly nines and eights, which still call a big bet, and the busted draws give you nothing at any size. Most overpairs would have check-raised the flop, so very little beats you. You have about a pot behind, so put it in.',
    read: [
      { about: 'preflop', text: 'In a tournament, 50 big blinds deep, the cutoff opened and you called Q♣9♣ on the button.' },
      { about: 'position', text: 'You’re in position, and they checked to you every street.' },
      { about: 'board', text: '9♠8♠4♦ gave you top pair with spade and straight draws out. The 2♦ and the 2♥ miss the draws.' },
      { about: 'sizing', text: 'They called a small flop bet and a pot-size turn bet. That’s nines, eights, some fours and a lot of draws.' },
      { about: 'range', text: 'A set of eights and A-A beat you. A nine, an eight and some underpairs call any bet. Busted flush and straight draws fold.' },
    ],
    takeaway: 'When their calling hands are pairs that call big and draws that never call, bet as big as you can.',
  },
  'kings-small-river-bet-ace-river-check-raised': {
    why: 'Bet small: worse queens are most of their range, and they’ll pay a small bet but not a big one. If you check, they’ll check behind. A-Q and spade draws that paired the ace now beat you, but sets and two pair would have played bigger earlier. About a third of the pot is the right size.',
    read: [
      { about: 'preflop', text: 'In a big, very deep six-handed tournament, you opened K♥K♦ and the button called.' },
      { about: 'opponent', text: 'A decent amateur who plays too many hands before the flop. Their range is wide and full of medium hands.' },
      { about: 'board', text: 'Q♣8♠6♠ has spade and straight draws. The 5♣ adds clubs, and the A♣ puts an ace over your kings.' },
      { about: 'sizing', text: 'A flop min-raise and a turn bet. A min-raise is more often a queen or a spade draw than a set.' },
      { about: 'range', text: 'Worse queens (K-Q, Q-J, Q-T, Q-9) call only small. A-Q and spade draws with an ace call and beat you. Some sets and two pair.' },
    ],
    takeaway: 'When their biggest group is worse pairs that pay only small bets, bet small for value.',
  },
  'top-set-fold-river-raise-monotone-flop': {
    why: 'Fold: a big river raise from a strong player who checked a monotone flop and overcalled is the slow-played nut flush. The only bluffs hold the A♠, and he almost never makes them. People rarely raise the river as a bluff. Fold and lose the minimum.',
    read: [
      { about: 'preflop', text: 'In a big live game a strong pro opened first in, two players called and you called 8♣8♥ in the big blind.' },
      { about: 'opponent', text: 'A strong, tricky pro can slow-play the nuts on a monotone flop to trap a set.' },
      { about: 'players', text: 'Four saw the flop. The cutoff bet; you and the opener called. The cutoff folded to the river raise.' },
      { about: 'board', text: '8♠6♠3♠ is monotone: you have top set, but any two spades is a flush. The A♦ and T♦ change little.' },
      { about: 'sizing', text: 'He checked the flop, overcalled, checked the turn, then raised your river bet almost four times. That’s a trap springing.' },
      { about: 'range', text: 'For value: the nut flush, slow-played. Rarely: a bluff holding the A♠.' },
    ],
    takeaway: 'A big river raise from a strong player who slow-played a monotone flop is the nut flush: fold.',
  },
  'bottom-set-call-river-three-barrels': {
    why: 'Call: there are too many hands you beat. Two pair and top pair bet for value, and missed draws bluff. The straights that beat you are unlikely: K-J is rare, and J-8 and 8-6 are too loose to have called an early open. You need about 23%. You can’t fold a set.',
    read: [
      { about: 'preflop', text: 'Late in a big tournament, 70 big blinds deep, you opened 7♥7♦ early; the player on your left and a late player called.' },
      { about: 'position', text: 'You’re out of position and check-called every street. They kept betting.' },
      { about: 'board', text: 'T♣7♠9♥ gave you bottom set on a connected board. The Q♠ makes K-J a straight and adds a spade draw, and the 2♥ misses everything.' },
      { about: 'sizing', text: 'Three bets, ending with under half the pot. They’re betting value hands and missed draws trying to get you off one pair.' },
      { about: 'range', text: 'Behind you: Q-T, T-9 and Q-J; missed 9♠8♠ and A-J. Ahead of you: K-J, sometimes.' },
    ],
    takeaway: 'When their value bets include many worse hands, a set calls three barrels.',
  },
  'top-pair-gutshot-call-turn-lead-three-bet-pot': {
    why: 'Call: not many hands beat ace-ten here. A-Q, suited A-J, K-Q and J-T (which your ten blocks) are ahead, and even against K-Q you have outs. Kings with a club draw and the odd bluff are behind. At this small price, call unless you have an ironclad read.',
    read: [
      { about: 'preflop', text: 'At a final table about 30 big blinds deep, you 3-bet A♠T♠ and the opener called. With A-K or a big pair they’d most likely have shoved.' },
      { about: 'opponent', text: 'A less experienced final-table player leads small with a mix of value, draws and bluffs.' },
      { about: 'board', text: 'Q♣K♥A♣ is broadway with a club draw. You have top pair and a gutshot to a jack. The 6♠ is a blank.' },
      { about: 'sizing', text: 'They checked the flop, then led less than half the pot on the turn. A small lead gives you a great price.' },
      { about: 'range', text: 'Ahead of you: A-Q and K-Q, suited A-J and J-T. Behind you: K♣J♣ and K♣T♣, and a small pair bluffing.' },
    ],
    takeaway: 'When few hands beat you and the price is small, call: your outs help too.',
  },
  'small-flush-check-back-river-flush-card': {
    why: 'Check: a bet only gets called or raised by flushes, and nearly all of them beat yours. Facing a bet they fold their sets and worse, and check-raise every flush that beats you. There are many more higher diamonds in their range than lower ones. Take the showdown.',
    read: [
      { about: 'preflop', text: 'In an online six-handed game, a strong pro opened under the gun and you called 8♦7♦ on the button.' },
      { about: 'opponent', text: 'A strong online pro folds hands that can’t win against a bet and check-raises the hands that can.' },
      { about: 'board', text: '6♦4♥2♦ gave you a straight draw and a flush draw. The 5♠ made your straight, and the A♦ completes your flush too.' },
      { about: 'sizing', text: 'They checked the turn and called your bet, so they don’t have a straight. Their range is overpairs, sets, two pair, 7-6 and flush draws.' },
      { about: 'range', text: 'Bigger flushes raise a bet. Sets, two pair, overpairs and 7-6 fold.' },
    ],
    takeaway: 'When a bet only gets called by better flushes, check.',
  },
  'missed-straight-draw-overbet-jam-paired-river': {
    why: 'Jam: your ten high wins almost nothing at a showdown, and their range is 9-9 to J-J and missed club draws, hands that can only beat a bluff. With a set, aces or kings they’d have raised by now. A jam bigger than the pot makes them fold most of the time.',
    read: [
      { about: 'preflop', text: 'In a big online tournament, 55 big blinds deep, you opened T♠9♠ early and a good pro called in the cutoff.' },
      { about: 'opponent', text: 'A good online pro with a tight calling range: they call with medium pairs and draws, and raise their strong hands.' },
      { about: 'board', text: '8♣7♦2♣ gave you an open-ended straight draw. The Q♦ and the 8♦ miss it.' },
      { about: 'sizing', text: 'They called two bets without raising. A set, aces or kings would have raised, so their range is capped at 9-9 to J-J.' },
      { about: 'range', text: '9-9 to J-J call a normal bet but fold to a jam. Missed club draws fold.' },
    ],
    takeaway: 'When their range only beats a bluff, a big shove makes those hands fold.',
  },
  'aces-call-small-river-jam-after-check-raise': {
    why: 'Call: only quad threes and a set of deuces beat aces here, and you block none of his bluffs. With Q-Q he’d have 3-bet, and K-Q, A-Q or Q-J would just call the flop. At a price this small you never fold.',
    read: [
      { about: 'preflop', text: 'Late in a big online tournament you opened A♣A♥ under the gun, and one of the best players defended the big blind, as he does light.' },
      { about: 'opponent', text: 'One of the best online players check-raises with suited connectors as bluffs, as well as with sets.' },
      { about: 'board', text: 'Q♣3♥2♠ is dry. The 8♣ adds a club draw, and the 3♠ pairs the board, giving 3-3 quads and 2-2 a full house.' },
      { about: 'sizing', text: 'A flop check-raise, a turn bet and a small river jam. The jam is a small part of the pot, so the price is only 18%.' },
      { about: 'range', text: 'For value: quad threes and deuces full, and very rarely eights. For bluffs: suited connectors that check-raised.' },
    ],
    takeaway: 'When only a couple of hands beat you and the price is tiny, never fold.',
  },
};

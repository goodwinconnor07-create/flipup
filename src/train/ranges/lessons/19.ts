import type { Lesson } from '../model';

export const L19: Record<string, Lesson> = {
  'aces-call-turn-check-raise-all-in-low-board': {
    why: 'Call: their all-in range has sets and straights, but also diamond draws and pairs with straight draws, and you’re well ahead of all of those. You need about 34%. Even against a tighter, value-heavy range, aces stay a profitable call here.',
    read: [
      { about: 'preflop', text: 'In a high-stakes event you 3-bet A♥A♣ on the button, 222 big blinds deep, and the raiser called. Their range is pairs, suited broadways and suited connectors.' },
      { about: 'opponent', text: 'An elite player check-raises the turn with value and with strong draws, keeping their range balanced.' },
      { about: 'board', text: '9♦4♣2♥ is dry. The 3♦ brings straights for A-5 and 6-5, and a diamond draw.' },
      { about: 'sizing', text: 'A check-raise all in over your turn bet. In theory only a small part of their range does this, and much of it is draws with lots of outs.' },
      { about: 'range', text: 'For value: sets 4-4, 3-3, 2-2 and sometimes 9-9; nines; A-5 and 6-5. Draws: diamond draws and pairs with a straight draw.' },
    ],
    takeaway: 'Against a check-raise all in on a draw-heavy turn, an overpair is ahead of the draws that make up much of the range.',
  },
  'jacks-call-small-river-bet-four-flush-lag': {
    why: 'Call: with the J♥ on the board there are few K♥ and Q♥ combos, and a loose player has fewer hands that can value-bet here than hands that can only win by bluffing. They rarely value-bet a weak flush with this size. You beat every weak pair and every float. You need about 22%.',
    read: [
      { about: 'preflop', text: 'You opened J♦8♦ from the cutoff; a tough, loose, aggressive button and the big blind called.' },
      { about: 'opponent', text: 'A tough, loose and aggressive player floats wide on the flop and bets when you check. Their bets include plenty of air.' },
      { about: 'board', text: '3♥5♦4♥ has a heart draw and straight draws. The J♥ gave you top pair and put three hearts out, and the T♥ puts four out.' },
      { about: 'sizing', text: 'They floated the flop, bet the turn, then bet less than half the pot on the river. Small bets on scary rivers are polarised: strong flushes or hands that missed.' },
      { about: 'range', text: 'For value: strong flushes with the A♥, K♥ or Q♥, and A-2 and 7-6 straights. For bluffs: missed floats like ace high, A-Q, 8-6 and 8-7, and weak pairs like 6-4, tens and small pairs.' },
    ],
    takeaway: 'Against a polarised small bet, call with a hand that beats the many bluffs.',
  },
  'ten-high-bluff-river-capped-flop-check-back': {
    why: 'Bet about ¾ pot: their flop check capped them at one pair most of the time, and the king adds nothing to that. Ten high can’t win at a showdown. One-pair hands, even most aces, can’t call a big bet; only the odd two pair does.',
    read: [
      { about: 'preflop', text: 'In a big live game, the player one off the button opened and you defended T♠9♠, 100 big blinds deep.' },
      { about: 'position', text: 'You’re out of position. The flop checked through, and you check-raised their turn bet.' },
      { about: 'board', text: '7♣5♣4♦ is connected with a club draw. The A♠ gave you a backdoor spade draw, and the K♠ leaves you one spade short.' },
      { about: 'sizing', text: 'They checked back the flop, then bet small and called your check-raise. A player who checks this flop rarely has two pair or better.' },
      { about: 'range', text: 'An ace calls only small. A-K and kings that just paired call. Sevens, fives and pocket pairs fold, and so do missed club draws.' },
    ],
    takeaway: 'When their flop check capped them at one pair, a big river bet folds even top pair.',
  },
  'ace-high-call-river-weak-limper-paired-board': {
    why: 'Call: their value range is narrow, a nine, trip deuces and the odd pocket pair. Against that sit all the missed heart draws, broadway hands and wheel draws a weak player bets when checked to. Ace high beats all of those. You need about 29%.',
    read: [
      { about: 'preflop', text: 'A weak player new to the table limped; you completed A♥6♥ and the big blind checked.' },
      { about: 'opponent', text: 'A weak open-limper bets whenever you check, with or without a hand. Their value range has to be narrow.' },
      { about: 'board', text: '2♥3♣9♥ gave you flush and wheel draws. The 2♠ pairs the board, and the 7♦ misses your draws.' },
      { about: 'sizing', text: 'They called your flop bet, bet the turn when you checked, then bet ⅔ pot on the river. Betting into every check is a sign of a wide range.' },
      { about: 'range', text: 'For value: a nine or trip deuces, sometimes a pocket pair or a seven. For bluffs: missed heart draws, king high, queen high and missed wheel draws.' },
    ],
    takeaway: 'Against a weak player who bets whenever you check, ace high catches their missed draws.',
  },
  'top-pair-small-river-bet-after-three-checks': {
    why: 'Bet small: they’re unlikely to bluff if you check, so you have to bet to win more. Their range is weak aces, small pairs and high cards, and the best way to get called by really weak hands is to give them irresistible odds. A quarter to a third of the pot does that.',
    read: [
      { about: 'preflop', text: 'In an online tournament, 200 big blinds deep, the hijack opened and you defended A♠T♥ from the big blind.' },
      { about: 'position', text: 'You’re out of position. Both the flop and the turn checked through.' },
      { about: 'board', text: '5♠9♥J♣ checked through, and so did the 2♦. The A♥ gives you top pair.' },
      { about: 'sizing', text: 'A range that checks behind twice leans to hands with some showdown value. After three checks, they think the pot is too small to bluff.' },
      { about: 'range', text: 'A weak ace, small pairs, and a nine or a five call only small. A better ace or two pair calls anything. King high and queen high fold.' },
    ],
    takeaway: 'In a small pot where nobody showed strength, bet small so weak hands get irresistible odds.',
  },
  'top-pair-fold-sudden-big-river-bet-straightforward': {
    why: 'Fold: a straightforward regular isn’t bluffing here and isn’t value-betting worse. A big bet after checking the turn means trips or a full house, and they tend to be tight in big pots. Top pair only beats the odd missed club draw. You need about 31%, and you’re far short.',
    read: [
      { about: 'preflop', text: 'A straightforward regular raised from middle position; you called K♣8♣ on the button and the big blind called.' },
      { about: 'opponent', text: 'A straightforward player bets big when strong and checks when not. A sudden big bet from them is the clearest signal there is.' },
      { about: 'board', text: '9♣9♠7♣ is paired with a club draw. The K♦ gave you top pair, and the 4♥ changes nothing.' },
      { about: 'sizing', text: 'A small flop bet, a turn check, then 80% of the pot on the river. Checking the turn and then betting big is how strong hands trap.' },
      { about: 'range', text: 'For value: trip nines, and 7-7 and K-K full houses. Bluffs: a few missed club draws.' },
    ],
    takeaway: 'A straightforward player’s sudden big river bet after checking the turn is value: fold top pair.',
  },
  'top-two-check-river-good-aggressive-player': {
    why: 'Check: after calling your flop raise and checking twice, their range is sets and straights happy to check to you, or one pair that won’t call a big bet. Few of their hands need to bluff. So a bet gets paid only by better and folds out the worse. Checking is better.',
    read: [
      { about: 'preflop', text: 'In a deep 6-max game you called an under-the-gun raise with K♥Q♥; a very good, aggressive small blind and the big blind called.' },
      { about: 'opponent', text: 'A very good, aggressive player checks strong hands on the river to trap, and won’t pay off a big bet with one pair.' },
      { about: 'players', text: 'Four saw the flop. You raised the small blind’s lead, the raiser folded, and the small blind called.' },
      { about: 'board', text: 'K♠Q♦7♥ gave you top two pair. The 9♦ adds a straight for J-T and a diamond draw, and the 4♣ changes little.' },
      { about: 'sizing', text: 'They called your flop raise, then checked the turn and the river. A strong hand can check to you, expecting you to bet.' },
      { about: 'range', text: 'Sets and straights call any bet. K-Q splits. A king or a queen and missed draws fold.' },
    ],
    takeaway: 'When their calling hands beat you and the rest fold, check and take the showdown.',
  },
  'top-pair-fold-big-river-bet-best-player': {
    why: 'Fold: this river is bad for your hand and good for many of the draws they could have. It completes the flush and gives 9-8 a straight. A big bet from a good player here leans toward value: straights, flushes, sets and better kings. You need about 31%, and you’re short.',
    read: [
      { about: 'preflop', text: 'In a big live game a splashy player limped, the best player at the table raised the hijack, and you called K♠J♦ from the big blind.' },
      { about: 'opponent', text: 'Good players who aren’t elite still tend to bet big with value and smaller with bluffs.' },
      { about: 'players', text: 'Three saw the flop; the limper folded to the bet. It’s you against the best player.' },
      { about: 'board', text: 'K♣7♠6♦ gave you top pair. The 2♠ adds a spade draw, and the T♠ completes the flush and gives 9-8 a straight.' },
      { about: 'sizing', text: 'A small flop bet, half pot on the turn, then 80% on the river. A big bet on the card that completes draws is weighted toward value.' },
      { about: 'range', text: 'For value: 9-8, spade flushes, K-K, 7-7, 6-6, T-T and K-T, and some A-K and K-Q. For bluffs: missed hands.' },
    ],
    takeaway: 'When the river completes many draws and a good player bets big, they’re weighted to value: fold top pair.',
  },
  'two-pair-big-river-value-bet-caller': {
    why: 'Bet about ¾ pot: their check leans toward hands that call out of disbelief, a six, a five, a small pair or ace high. They’d have an incentive to bet some of their strong hands themselves. Bet the largest amount they’ll call with that whole checking range.',
    read: [
      { about: 'preflop', text: 'You opened 8♠7♠ from middle position, 250 big blinds deep; three players called, including a small blind who reads hands poorly.' },
      { about: 'opponent', text: 'A poor hand reader thinks about what’s possible rather than what’s likely. They call because they don’t believe you, not because they’re strong.' },
      { about: 'players', text: 'Four saw a flop that checked round. Only the small blind called your turn bet.' },
      { about: 'board', text: '7♥6♦3♠ is connected. The 3♦ pairs the board, and the 5♣ makes straights for 4-x and 9-8.' },
      { about: 'sizing', text: 'They called the turn and checked the river. Strong hands might bet; their check leans to medium hands.' },
      { about: 'range', text: 'A six or a five, small pairs and ace high call a normal bet. Some 7-6, A-7, straights and overpairs beat you. Missed hands call only small.' },
    ],
    takeaway: 'Against a player who calls out of disbelief, bet the largest size their checking range will call.',
  },
  'top-pair-call-river-donk-unknown': {
    why: 'Call: their line rules out most strong hands, which would have raised somewhere. What leads here is mostly worse kings, tens and missed heart and straight draws, all hands you beat. You need about 27%. Against an unknown player, call rather than raise.',
    read: [
      { about: 'preflop', text: 'At a small online game you opened K♣Q♦ from the cutoff and an unknown player defended the big blind.' },
      { about: 'position', text: 'They’re out of position. They check-called the flop and turn, then led the river.' },
      { about: 'board', text: 'K♥2♣T♥ gave you top pair with a heart draw out. The 7♦ and the 4♦ miss the hearts.' },
      { about: 'sizing', text: 'They never raised, then led 60% of the pot. Without a raise anywhere, two pair or better is a small part of their range.' },
      { about: 'range', text: 'Ahead of you: some slow-played sets and two pair, and some A-K. Behind you: worse kings, tens, and missed heart and straight draws.' },
    ],
    takeaway: 'When a player never raised, their river lead is rarely a monster: call with top pair.',
  },
};

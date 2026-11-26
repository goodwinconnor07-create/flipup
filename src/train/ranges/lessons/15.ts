import type { Lesson } from '../model';

export const L15: Record<string, Lesson> = {
  'top-pair-call-fast-river-bet-three-bet-pot': {
    why: 'Call: a player who barrels every street and then fires small and fast on the river has mostly bluffs and a few strong hands. A fast bet usually means they planned to bet whatever came. Raising only gets called by the strong hands, and folding gives up to all the bluffs. You need only about 17%.',
    read: [
      { about: 'preflop', text: 'A young player 3-bet your button open from the small blind; you called. Their range is big pairs, strong aces and plenty of light 3-bets.' },
      { about: 'opponent', text: 'A young, aggressive player bets every street with a plan, often a bluff, and doesn’t slow down on blank cards.' },
      { about: 'board', text: 'J♥6♣2♦ gave you top pair. The 6♦ pairs the board, and the 8♣ changes little.' },
      { about: 'sizing', text: 'A big flop bet, a turn bet, then a small, quick river bet. Small and fast often means a bet planned in advance, not a reaction to a strong hand.' },
      { about: 'range', text: 'For value: A-A, K-K, Q-Q, J-J and A-J. For bluffs: hands that kept betting.' },
    ],
    takeaway: 'A fast, small river bet after barrels is often a planned bluff: call with a bluff catcher.',
  },
  'queens-call-down-ace-ace-board': {
    why: 'Call: against most players this is a fold. Against this one, broadway hands and middle pairs that kept betting make up a big part of the range, and your queens beat all of them. They use the same sizes for value and bluffs. You need about 28%, and you’re ahead more often than not.',
    read: [
      { about: 'preflop', text: 'You 3-bet queens from the small blind against a loose, aggressive cutoff, and they called.' },
      { about: 'opponent', text: 'A loose, aggressive young player bets more than once as a bluff and uses the same sizes with strong and weak hands.' },
      { about: 'board', text: 'A♠A♣6♦ is paired and dry. The 5♥ and 7♦ add straight possibilities but change little for the hands that matter.' },
      { about: 'sizing', text: 'Three bets of normal size. From a tight player that’s trips; from this player it’s value and barrels with broadways and middle pairs.' },
      { about: 'range', text: 'For value: an ace or a full house. For bluffs: broadway hands that kept betting, and middle pairs turned into bluffs.' },
    ],
    takeaway: 'Against a loose player who bluffs repeatedly, a big pair on a paired board can call down.',
  },
  'tens-hero-call-polarized-loose-raiser': {
    why: 'Call: your tens block some of their flushes and the J-T straight, and a strong, loose player turns missed hands like K-J, 7-6 and ace high with one club into bluffs. Against that polarised range your tens beat every bluff. You need about 33%, and you’re ahead a little more often.',
    read: [
      { about: 'preflop', text: 'A good, loose, aggressive player opened the hijack and you called from the big blind.' },
      { about: 'opponent', text: 'A good, loose player knows how to turn missed draws into big river bets. Their big bets carry real bluffs.' },
      { about: 'board', text: 'Q♣9♣2♣ is monotone. The 8♠ adds straights like J-T, and the 3♦ is a blank. Your T♣ blocks some flushes.' },
      { about: 'sizing', text: 'A small bet, a normal bet, then almost the pot. Building to a huge bet is polarised: very strong or a bluff.' },
      { about: 'range', text: 'For value: overpairs, two pair, sets, flushes and J-T. For bluffs: K-J, 7-6 and ace high with one club.' },
    ],
    takeaway: 'When your cards block their value and many missed draws can bluff, call a polarised bet.',
  },
  'kings-call-splashy-river-bet-three-bet-pot': {
    why: 'Call: your kings beat every queen except two pair and sets, and every missed draw. A splashy player bets a wide range here, including weaker queens, J-T, and A-J and K-J that missed. You need 30%, and you’re ahead most of the time.',
    read: [
      { about: 'preflop', text: 'A splashy player raised under the gun; you 3-bet kings, the cutoff cold-called and the raiser called.' },
      { about: 'opponent', text: 'A splashy player raises first in with decent hands but bets loosely after the flop, including weaker pairs and missed draws.' },
      { about: 'players', text: 'Three saw the flop, which checked round. The cutoff folded the turn, leaving you against the splashy player.' },
      { about: 'board', text: 'Q♠T♥4♦ is broadway. The 3♦ adds a diamond draw and wheel draws, and the 7♣ misses them.' },
      { about: 'sizing', text: 'A small turn bet and ¾ pot on the river. From this player that’s a wide range of made hands and bluffs.' },
      { about: 'range', text: 'Ahead of you: Q-T, Q-Q, T-T and 7-7. Behind you: A-Q, K-Q and J-T, and missed A-J, K-J, A-5 and A-4.' },
    ],
    takeaway: 'A splashy player bets a wide range on the river: an overpair beats enough of it.',
  },
  'trip-aces-call-after-turn-check': {
    why: 'Call: their turn check took most of the strong aces out of their range, and your own ace leaves them just one. What bets now is mostly K-Q and other hands that missed, plus K-K, Q-Q and T-T turned into bluffs. Raising only gets called by better. You need about 28%.',
    read: [
      { about: 'preflop', text: 'A newly seated player opened first in; you called with A♦3♦, and a tight lojack called too.' },
      { about: 'position', text: 'You’re in position. They checked the turn, and you checked behind.' },
      { about: 'board', text: 'A♣J♣9♥ gave you top pair. The 4♥ adds a heart draw, and the A♥ gives you trips, with two aces on the board and one in your hand.' },
      { about: 'sizing', text: 'A small flop bet, a turn check, then ⅔ pot on the river. Most strong aces would have bet the turn.' },
      { about: 'opponent', text: 'A new player at the table may not have shown much yet, but checking the turn and betting the river is a line that often means a missed hand.' },
      { about: 'range', text: 'Ahead of you: full houses that slowed down (J-J, 9-9, 4-4) and the last ace with a better kicker. Behind you: K-Q, K-T and Q-T that missed, and K-K, Q-Q and T-T turned into bluffs.' },
    ],
    takeaway: 'A turn check removes most strong hands; holding a card they need cuts their value further.',
  },
  'ace-king-fold-flush-turn-paired-board': {
    why: 'Fold: their range now holds every flush plus trips and top pairs, and you have ace high with no heart. Against the made hands an ace or a king helps only some of the time, and against the flushes it never does. You need 24%, and you have far less.',
    read: [
      { about: 'preflop', text: 'The lojack opened and you called from the small blind with A♠K♣; the big blind folded.' },
      { about: 'position', text: 'You’re out of position and check-called the flop. Overcards out of position are hard to play.' },
      { about: 'board', text: 'Q♥8♥8♣ is paired with a heart draw. The 6♥ completes the flush.' },
      { about: 'sizing', text: 'Two half-pot bets. A player who bets twice on this board usually has a strong made hand or a draw.' },
      { about: 'range', text: 'Flushes; trips and full houses with A-8, 9-8, 8-7, Q-Q and 6-6; queens like A-Q, K-Q and Q-J; straight draws J-T and T-9; K-J with no heart.' },
    ],
    takeaway: 'When the turn completes a draw and you hold only overcards, fold to a second bet.',
  },
  'ace-king-fold-turn-shove-recreational': {
    why: 'Fold: when a straightforward player suddenly shoves the turn, their range is mostly hands that crush top pair: 7-6 suited, A-9 and 9-8. You need about 24%, and you have far less. You’re not pot committed yet, so fold.',
    read: [
      { about: 'preflop', text: 'A straightforward recreational player opened first in, a loose cutoff called, and you 3-bet ace-king. Both called.' },
      { about: 'opponent', text: 'A straightforward recreational player usually has what they represent. They don’t shove top pair or air on the turn.' },
      { about: 'players', text: 'Three saw the flop; only the opener called your bet. They then took the lead on the turn.' },
      { about: 'board', text: 'A♦8♥5♥ gives you top pair, top kicker with a heart draw out. The 9♣ makes 7-6 a straight and gives A-9 and 9-8 two pair.' },
      { about: 'sizing', text: 'A shove for about half the pot after check-calling the flop. Changing gear on the card that completes their hands is a strong signal.' },
      { about: 'range', text: 'For value: 7-6 suited, A-9 and 9-8. Sometimes a heart draw.' },
    ],
    takeaway: 'When a straightforward player shoves the card that completes their likely hands, believe them.',
  },
  'eights-call-scary-club-river-polarized': {
    why: 'Call: an aggressive player turns most hands worse than yours into a bluff on a card this scary: missed heart draws and small pairs. Your eights beat every one of them. You need about 30%, and against this player you’re ahead more often. Against a tight, passive player you would fold.',
    read: [
      { about: 'preflop', text: 'You opened 8-8 from first position, and five players called, including an aggressive champion right behind you.' },
      { about: 'opponent', text: 'An aggressive champion uses scary cards to bluff. A card that completes a flush is the perfect card for them to fire.' },
      { about: 'players', text: 'Six saw the flop and it checked round. Only the champion called your turn bet.' },
      { about: 'board', text: '9♣9♥7♥ is paired with a heart draw. The 3♣ adds a club draw, and the K♣ completes the clubs and misses the hearts.' },
      { about: 'sizing', text: 'A ¾-pot bet after you checked the river. Their range is polarised: a flush or trips, or a bluff.' },
      { about: 'range', text: 'For value: club flushes; trips and full houses with A-9, T-9, 9-8, K-K, 7-7 and 3-3. For bluffs: missed heart draws and small pairs.' },
    ],
    takeaway: 'Against an aggressive player, a scary river card is a bluffing card: call with a hand that beats the bluffs.',
  },
  'weak-ace-fold-river-straight-limped-pot': {
    why: 'Fold: the gutshots they were betting on the flop and turn, Q-J and J-T, have now made a straight, and two pair and sets bet here too. Your 3 doesn’t play: your hand is aces with the board’s K-Q-T, so you only split with other weak aces. You need about 23%, and you have less.',
    read: [
      { about: 'preflop', text: 'Five players limped, you completed A♦3♦ from the small blind, and the big blind checked. Everyone’s range is wide.' },
      { about: 'players', text: 'Four players saw the turn and three the river. In a multiway pot, a bet on every street is rarely a bluff.' },
      { about: 'board', text: 'A♣K♠7♦ gave you a pair of aces. The T♦ adds broadway draws, and the Q♣ makes a straight for any jack.' },
      { about: 'sizing', text: 'Three bets that grow, into several players. Players bet gutshots like Q-J and J-T on the flop and turn, and those just got there.' },
      { about: 'range', text: 'For value: any jack (a straight), A-Q, A-T, A-7, K-Q, K-T, Q-T, 7-7 and T-T. Split: A-9 to A-2. Bluffs: a few missed hands.' },
    ],
    takeaway: 'When the board plays as your kicker, a weak ace only splits: fold when the river completes the draws they bet.',
  },
  'nines-call-turn-bet-three-bet-pot': {
    why: 'Call: with a marginal made hand against a polarised range, you call or fold, never raise. They bet big with draws and air as well as top pair or better, and your nines are well ahead of the draws and bluffs. You need about 26%, so call, and check behind if they check the river.',
    read: [
      { about: 'preflop', text: 'You opened the hijack with 9-9 and 40 big blinds; a good, aggressive player 3-bet from the big blind and you called.' },
      { about: 'opponent', text: 'A good, aggressive player keeps betting their draws and air on the turn, not just strong hands.' },
      { about: 'board', text: 'T♦8♣3♣ has club and straight draws. The 3♠ pairs the board and changes little.' },
      { about: 'sizing', text: 'A small flop bet, then more than half the pot on the turn. That’s polarised: top pair or better, a draw, or a pure bluff.' },
      { about: 'range', text: 'For value: overpairs, A-T, K-T, Q-T, J-T, T-9 and sets. Draws: clubs, Q-J, 9-8, 8-7 and 7-6. Pure bluffs: A-K and A-Q.' },
    ],
    takeaway: 'With a marginal hand against a polarised range, call or fold, never raise; call when the price is right.',
  },
};

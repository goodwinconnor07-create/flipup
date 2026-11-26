import type { Lesson } from '../model';

export const L21: Record<string, Lesson> = {
  'trips-call-half-pot-river-bet-limped-pot': {
    why: 'Call: when the first bettor gives up, the second bet can be made with almost anything. The cutoff’s river bet holds plenty of missed spade and straight draws, and value hands like 8-7, A-7 and 6-5 that you beat. A better six, a full house or a straight is possible but rare. You need about 26%, and you’re ahead most of the time.',
    read: [
      { about: 'preflop', text: 'In a big live game everyone limped, you with 9♣6♣ on the button. Every range is wide.' },
      { about: 'opponent', text: 'An experienced pro attacks when the first bettor shows weakness. Their bets in that spot include plenty of draws.' },
      { about: 'players', text: 'Three saw the turn. The big blind bet the flop, then checked the turn: almost certainly weak. The cutoff took over the betting.' },
      { about: 'board', text: '7♠6♠6♥ is paired with a spade draw and straight draws. The 8♦ gave you trips and an open-ender, and the J♣ makes straights for T-9.' },
      { about: 'sizing', text: 'A big turn bet after the first bettor checked, then half the pot on the river. Taking over the betting when someone gives up is how good players attack.' },
      { about: 'range', text: 'Ahead of you: some better sixes, full houses and straights. Behind you: 8-7, A-7 and 6-5, missed spade draws and missed straight draws.' },
    ],
    takeaway: 'When the first bettor gives up, the second bet can be made with anything: trips call.',
  },
  'ace-jack-check-back-no-bluff': {
    why: 'Check: a bluff only works if better hands fold. Their kings call, and Q-J is already behind your ace high, so a bet wins nothing that checking doesn’t. With no clear reason to bet, take the showdown.',
    read: [
      { about: 'preflop', text: 'A tight-aggressive regular opened from middle position and you called in the cutoff with A♣J♣.' },
      { about: 'position', text: 'You’re in position. You raised the flop and bet the turn, and they called both times.' },
      { about: 'board', text: 'K♦T♣3♥ gave you a gutshot. The 5♣ added a club draw, and the 8♦ misses both.' },
      { about: 'sizing', text: 'They called a flop raise and a turn bet. From a tight player, that’s usually a king, sometimes Q-J drawing.' },
      { about: 'range', text: 'A king (A-K, K-Q, K-J, K-T) calls any bet. Q-J that missed folds, and you beat it anyway.' },
    ],
    takeaway: 'Bluff only when better hands fold; if their better hands call and their worse ones lose anyway, check.',
  },
  'nines-eight-take-free-showdown': {
    why: 'Check: betting only gets called by the kings, high pairs and aces that beat you, and folds the busted hands your pair of eights already beats. Neither the king nor the ace helps the hands you could have, so a bluff wouldn’t be believed. Take the free showdown.',
    read: [
      { about: 'preflop', text: 'A tight-aggressive regular opened from middle position and you called on the button with 9♠8♠.' },
      { about: 'position', text: 'You’re in position, and they checked the river to you after betting the flop and turn.' },
      { about: 'board', text: 'K♠8♦3♥ gave you second pair. The 4♠ added a flush draw, and the A♦ misses it.' },
      { about: 'sizing', text: 'Two bets, then a river check. They hold a king, a high pair, an ace that just paired, or a barrel that gave up.' },
      { about: 'range', text: 'Kings, Q-Q to 9-9, and aces that paired call a bet. A double barrel that gave up folds, and you beat it.' },
    ],
    takeaway: 'Take the free showdown when a bet only folds worse hands and gets called by better.',
  },
  'king-ten-check-back-passive-big-blind': {
    why: 'Check: a value bet needs worse hands to call. After two calls from a passive player, the hands that call a third bet are mostly A-K and K-Q, which beat you, and 7♦6♦, which raises. Only queens are worse, and there aren’t enough of them. Take the showdown.',
    read: [
      { about: 'preflop', text: 'It folded to you on the button. You raised K♥T♥ and a passive big blind called.' },
      { about: 'opponent', text: 'A passive regular never check-raises as a bluff and doesn’t call with worse. Their calls are honest.' },
      { about: 'board', text: '4♥5♦K♦ gave you top pair with a diamond draw out. The 8♠ adds straight draws, and the 9♠ makes 7-6 a straight.' },
      { about: 'sizing', text: 'They called two bets of about ¾ pot. The weak pairs and most junk folded along the way.' },
      { about: 'range', text: 'Ahead of you: A-K and K-Q suited, and 7♦6♦, which raises. Behind you: queens with the Q♦.' },
    ],
    takeaway: 'After two calls from a passive player, a third bet is called mostly by better: check.',
  },
  'king-high-straight-check-back-vs-ace-jack': {
    why: 'Check: betting is lose-lose. Two pairs and sets fold, so a bet wins nothing more from them, while A-J and the jacks that split can check-raise and push you off your share. Only A-J beats your straight. Take the showdown.',
    read: [
      { about: 'preflop', text: 'In a big live game with a straddle, a strong, slightly aggressive pro opened the hijack, you called J♥T♥ on the button and the straddle called.' },
      { about: 'position', text: 'You’re in position. The turn checked through, and they checked the river to you.' },
      { about: 'board', text: 'T♣9♦4♥ gave you top pair and an open-ender. The Q♦ kept the draw open, and the K♠ gave you a king-high straight. A-J has the nut straight.' },
      { about: 'sizing', text: 'A flop bet, then two checks. Without a jack they won’t call a bet; with a jack they might check-raise.' },
      { about: 'range', text: 'A-J (the nuts) raises. K-J, Q-J, J-9 and J-8 split and may raise. Two pairs, sets, tens and nines fold.' },
    ],
    takeaway: 'When a bet only folds worse hands and invites raises from hands that beat or tie you, check.',
  },
  'nine-high-flush-fold-turn-raise-recreational': {
    why: 'Fold: your flush only beats bluffs here, and this player hardly ever bluffs with a big raise. What raises is a higher flush. Most players wouldn’t raise the bare A♦ for fear of a shove. You don’t have the price to call and hope for a straight flush.',
    read: [
      { about: 'preflop', text: 'In a big live game you opened 9♦8♦ under the gun; a pro and a recreational player called.' },
      { about: 'opponent', text: 'A recreational player who is passive with big bets. When they finally raise big, it’s a strong hand.' },
      { about: 'players', text: 'Three saw the flop. The pro folded the turn, and the recreational player raised.' },
      { about: 'board', text: '7♦6♦3♦ gave you a flush with a straight-flush draw. The 3♣ pairs the board.' },
      { about: 'sizing', text: 'A turn raise from a player who rarely raises. The only lower flushes, 5-2 and 4-2 of diamonds, are unlikely in a raised pot, and straights and overpairs don’t raise here.' },
      { about: 'range', text: 'For value: higher flushes. Rarely, the bare A♦ as a bluff.' },
    ],
    takeaway: 'A big raise from a recreational player who rarely bluffs means a better hand: fold a low flush.',
  },
  'top-pair-fold-river-jam-after-check-raise': {
    why: 'Fold: check-raise, pot bet, jam from a straightforward player is value. Sets, two pair and 5-3 all beat top pair with an eight kicker, and the only bluffs are busted 7-5 and 8-7. Hands like K-7 and A-3 gave up earlier. You need about 34%, and you’re far short.',
    read: [
      { about: 'preflop', text: 'You opened Q♥8♥ on the button, 100 big blinds deep, and the big blind called.' },
      { about: 'opponent', text: 'A straightforward player rarely jams a line like this as a bluff.' },
      { about: 'board', text: 'Q♣6♦4♥ gave you top pair. The 9♠ adds a spade draw, and the 2♠ makes 5-3 a straight.' },
      { about: 'sizing', text: 'A flop check-raise, a pot-size turn bet and a river jam: three strong actions in a row.' },
      { about: 'range', text: 'For value: sets 9-9, 6-6, 4-4 and 2-2; two pair; 5-3. For bluffs: some busted 7-5 and 8-7.' },
    ],
    takeaway: 'Check-raise, pot bet, jam from a straightforward player is value: fold top pair with a weak kicker.',
  },
  'middle-pair-fold-river-after-turn-pot-lead': {
    why: 'Fold: their value is straights, sets and two pair, and every one beats middle pair. Straightforward players give up their missed draws on the river after potting the turn, so the bluffs you beat mostly aren’t betting. You need about 27%, and you’re short. Call only against a loose player who barrels every draw.',
    read: [
      { about: 'preflop', text: 'You opened Q♥8♥ on the button, 100 big blinds deep, and the big blind called.' },
      { about: 'opponent', text: 'A straightforward player bets draws on the turn but gives up on the river when they miss.' },
      { about: 'position', text: 'You’re in position and checked back the flop with middle pair. They then led the turn and river.' },
      { about: 'board', text: 'K♣Q♣9♦ has club and straight draws. The 3♥ and 4♠ miss them.' },
      { about: 'sizing', text: 'A pot-size turn lead, then 60% on the river. Betting again after the draws missed is value.' },
      { about: 'range', text: 'For value: J-T, sets 9-9, 4-4 and 3-3, and two pair. A few missed club and straight draws.' },
    ],
    takeaway: 'Straightforward players give up missed draws on the river: a bet after a big turn lead is value.',
  },
  'kings-check-river-paired-flush-board': {
    why: 'Check: no worse hand calls. T-T and J-J fold to a bet into a pot this big, and they won’t bet if you check. Every hand that pays you off beats you: a nine, a backdoor flush, 5-4 or a set. Check, and fold if they bet.',
    read: [
      { about: 'preflop', text: 'In a big live game, 300 big blinds deep, you raised K♠K♣ over a limper and four players called.' },
      { about: 'players', text: 'Five saw the flop; two called your bet. Only one called your big turn bet, after a long think.' },
      { about: 'board', text: '9♥3♠2♣ is dry. The 6♣ adds a club draw and gives 5-4 a straight, and the 9♣ pairs the board and puts three clubs out.' },
      { about: 'sizing', text: 'A long think before calling a big turn bet means a real hand that considered folding or raising.' },
      { about: 'range', text: 'Trip nines, backdoor club flushes, 5-4 and sets call a bet. T-T and J-J fold.' },
    ],
    takeaway: 'When no worse hand calls and they won’t bluff, check and fold to a bet.',
  },
  'aces-small-river-bet-flush-completes': {
    why: 'Bet small: checking and calling is the worst option, because their kings check behind and only flushes bet. A small bet gets called by K-Q and K-J at this level. If they raise, you can fold: that’s a flush.',
    read: [
      { about: 'preflop', text: 'In a small live game you raised A♣A♥ in early position and the button called.' },
      { about: 'position', text: 'You’re out of position, so you act first on the river.' },
      { about: 'board', text: 'K♣5♦2♣ has a club draw. The T♠ is a blank, and the 7♣ completes the clubs. Your A♣ blocks the nut flush.' },
      { about: 'sizing', text: 'They called two big bets: kings like K-Q and K-J, and club draws.' },
      { about: 'range', text: 'K-Q and K-J call a small bet but fold to a big one. A club flush raises.' },
    ],
    takeaway: 'Bet small when worse hands call small and better ones raise, so you can fold to the raise.',
  },
};

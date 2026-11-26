import type { Lesson } from '../model';

export const L8: Record<string, Lesson> = {
  'straight-never-fold-to-river-shove': {
    why: 'Call: they shove full houses, but they also shove A-Q and their overpairs, and there are far more of those. The pair on the river looks scary, yet only Q-Q, 7-7, 5-5 and quad sixes beat you. You need about 35%, and you’re ahead most of the time. A straight is too strong to fold here.',
    read: [
      { about: 'preflop', text: 'You opened early and the button 3-bet. Their range is big pairs and big aces, plus some lighter hands.' },
      { about: 'position', text: 'They’re in position and bet every street after you checked. You kept checking, which keeps their one-pair hands betting.' },
      { about: 'board', text: 'Q♥7♠5♦ gave you a gutshot and overcards. The 6♠ made your straight, and the 6♦ pairs the board, so sets are now full houses.' },
      { about: 'sizing', text: 'A small flop bet, a ¾-pot turn bet, and a shove about the size of the pot. A 3-bettor shoves overpairs and top pair too, thinking you have one pair.' },
      { about: 'range', text: 'Ahead of you: Q-Q, 7-7 and 5-5 full houses and quad sixes. Behind you: A-Q, K-K and A-A.' },
    ],
    takeaway: 'A straight on a paired board is still strong when their shove includes many one-pair hands.',
  },
  'aces-full-call-quads-shove': {
    why: 'Call: you have the second nuts. Their kings full and sixes full both lose to aces full, and only the two hands holding the 6♥ make quads. You need about 30%, and you win nearly every time. This is the easiest call there is.',
    read: [
      { about: 'preflop', text: 'The small blind 3-bet your open, you 4-bet with aces, and they called. Their range is pairs, A-K, A-Q and some suited hands.' },
      { about: 'position', text: 'They’re out of position and led the turn small, then shoved the river. They think their full house is good.' },
      { about: 'board', text: 'A♣K♠6♦ gave you top set. The 6♣ gave you aces full, and the 6♠ puts trip sixes on the board.' },
      { about: 'sizing', text: 'A small turn lead and a river shove. Once the board pairs twice, everyone has a full house, and a full house loves to shove.' },
      { about: 'range', text: 'Quads: 7-6 and 6-5 with the 6♥. Behind you: K-K (kings full), and A-K and A-Q (sixes full).' },
    ],
    takeaway: 'With the second nuts and only a couple of combos that beat you, call any bet.',
  },
  'second-pair-river-call-four-handed': {
    why: 'Call: many draws missed, and they bluff with them, expecting you to fold a weak made hand. You lose to top pairs, two pair and straights, but you beat every bluff. You need about 29%, and the missed club draws and gutshots get you there.',
    read: [
      { about: 'preflop', text: 'Four-handed, the button opened and you defended your big blind. Short-handed ranges are wide on both sides.' },
      { about: 'position', text: 'They’re in position and checked back the flop. That gives up a lot of their range, including some top pairs that wanted to keep the pot small.' },
      { about: 'board', text: 'J♦7♣6♠ is connected. The 9♣ gives you second pair, adds a club draw and makes straights for T-8 and 8-5. The 3♥ misses every draw.' },
      { about: 'sizing', text: 'A small turn bet and ⅔ pot on the river. Your check-call looks like a weak hand, so they’ll try to make you fold it.' },
      { about: 'range', text: 'Ahead of you: top pairs that checked the flop, two pair, sets and straights. Behind you: missed club draws and missed gutshots like K-8 and Q-8.' },
    ],
    takeaway: 'When many draws miss and they expect you to fold, call with a hand that beats the bluffs.',
  },
  'queens-full-bet-big-not-overbet': {
    why: 'Bet about ¾ pot: their trip fives call a big bet about as often as a smaller one, so make it big. An overbet is too much: trip fives fold to it, and only a calling station would pay. A queen splits whatever you bet. Marginal pairs and missed draws fold to any size.',
    read: [
      { about: 'preflop', text: 'The button limped, you completed and the big blind checked. The limper’s range is wide: any ace, suited kings, connectors and small pairs.' },
      { about: 'position', text: 'You’re out of position. You led the turn and they called, so you have the lead on the river.' },
      { about: 'board', text: 'Q♣5♣5♦ is paired with a club draw. The 9♠ changes little, and the Q♥ gives you queens full.' },
      { about: 'sizing', text: 'They bet the flop when it was checked to them and called your turn lead: trips, queens, pairs and club draws.' },
      { about: 'range', text: 'Trip fives call a big bet but fold to an overbet. A queen splits with you. Marginal pairs and missed draws fold.' },
    ],
    takeaway: 'Bet big when their calling hands call big, but stop short of an overbet that folds them.',
  },
  'top-pair-small-river-value-bet': {
    why: 'Bet small: their range is weak and you beat most of it. A big bet folds the nines and middle pairs you beat; a small one gets called by hands like Q-9 and 8-8. Weaker aces call either way. If they check-raise, you can usually fold, because a straightforward player only does that with two pair or better.',
    read: [
      { about: 'preflop', text: 'A straightforward player limped and called your raise. Their range is wide and capped: aces strong enough to raise would have raised.' },
      { about: 'position', text: 'You’re in position, and they checked to you on every street. They’re letting you decide how big the pot gets.' },
      { about: 'board', text: 'A♣9♥2♦ gives you top pair. The 3♣ adds a club draw and a wheel draw, and the T♠ changes little.' },
      { about: 'sizing', text: 'Three check-calls of small bets: weaker aces, nines and middle pairs that want a showdown. Strong hands would have raised by now.' },
      { about: 'range', text: 'Ahead of you: two pair, sets and the wheel, and a few better aces. Behind you: weaker aces, which call most sizes, and nines and middle pairs like Q-9, J-9 and 8-8, which call only small.' },
    ],
    takeaway: 'Against a weak, capped range, bet small so their middle pairs keep calling.',
  },
  'overpair-check-river-vs-tens': {
    why: 'Check: a bet only gets called by a ten or a flush, and both beat you. Everything you beat, like weak pairs and busted draws, folds to any bet. So betting can only lose more. Check, unless they’re an extreme calling station.',
    read: [
      { about: 'preflop', text: 'A tight player limped and called your raise: pairs, suited aces, broadways and connectors.' },
      { about: 'opponent', text: 'Tight players raise for value and rarely bluff. Their check-raise on the flop is strong or a real draw.' },
      { about: 'board', text: 'T♠T♣2♣ is paired with a club draw. The 4♣ completes the clubs, and the 8♥ changes nothing.' },
      { about: 'sizing', text: 'They check-raised the flop, then check-called a small turn bet and checked the river. That’s a ten or a flush taking it slow, or a weak hand giving up.' },
      { about: 'range', text: 'Ahead of you: a ten and club flushes, which call. Behind you: low pairs with a club and busted draws, which fold.' },
    ],
    takeaway: 'When every hand you beat folds and every hand that calls beats you, check.',
  },
  'ace-high-river-bluff-vs-tight-3bet': {
    why: 'Bet about ⅔ pot as a bluff: their checks say they have less than top pair. A-K and the middle pairs beat your ace high at a showdown, but they fold to a real bet, and a small bet lets them call. Only tens and K-Q got there. Against a tight player, this bluff works most of the time.',
    read: [
      { about: 'preflop', text: 'A very tight player 3-bet your open and you called. Their range is big pairs and big aces.' },
      { about: 'opponent', text: 'A very tight player bets top pair or better and gives up with less. Their checks are honest, and they fold medium hands to pressure.' },
      { about: 'position', text: 'They’re in position and checked back the turn. A tight player who checks back the turn has less than top pair.' },
      { about: 'board', text: '9♥6♣6♦ is paired. The J♥ adds a heart draw, and the T♠ completes K-Q’s straight and gives T-T a full house.' },
      { about: 'sizing', text: 'A small flop bet and a turn check. Their range is A-K, middle pairs and weaker aces: hands that can’t call a real bet.' },
      { about: 'range', text: 'A-K, 8-8 and 7-7 beat you but fold to a ⅔-pot bet. A-T folds too. A-Q splits. Weaker aces fold. T-T and K-Q call.' },
    ],
    takeaway: 'When a tight player’s checks cap their range, bluff with a size that folds their showdown hands.',
  },
  'aces-full-river-overbet-vs-tag': {
    why: 'Overbet: their marginal hands fold to any bet, so don’t size for them. The hands that call, flushes, full houses and aces with a spade, call a big bet as readily as a small one. You don’t hold a spade, so they can have every flush. Go for it all: bet as big as you can.',
    read: [
      { about: 'preflop', text: 'A good, tight-aggressive player defended the big blind against your open. You’re 200 big blinds deep, so there’s a lot left to win.' },
      { about: 'position', text: 'You’re in position, and they checked to you every street. They’ll call or check-raise, not lead.' },
      { about: 'board', text: 'A♠Q♠8♣ gave you top set. The 2♠ puts three spades out, and the 2♣ gives you aces full, close to the nuts.' },
      { about: 'sizing', text: 'They check-called twice: aces, queens and spade draws. On the turn you kept the bet modest so their aces and queens would stay in.' },
      { about: 'range', text: 'Flushes and full houses call any size. Aces with a spade make a hero call. Marginal hands fold to any bet.' },
    ],
    takeaway: 'When the hands that call don’t care about the size, bet as big as you can.',
  },
  'straight-flush-multiway-river-shove': {
    why: 'Shove: you have less than the pot left, and with flushes, straights, sets and two pair around, someone will pay. Two loose players with wide ranges both called the turn. A small bet to keep them in rarely makes sense when a shove gets called this often. Shove.',
    read: [
      { about: 'preflop', text: 'A splashy player limped, a loose-aggressive player raised, and you both called. Wide ranges all round.' },
      { about: 'players', text: 'Three players reached the river. In a multiway pot, someone almost always has a strong hand that won’t fold.' },
      { about: 'board', text: '7♠6♥3♠ is connected. The 8♥ adds a heart draw and straights, and the 5♥ completes hearts and gives you a straight flush.' },
      { about: 'sizing', text: 'Both checked the river to you after calling the turn. They have hands that will call, not hands that want to bet into two players.' },
      { about: 'range', text: 'Both have heart flushes, straights, sets and two pair, which call a shove. One pair calls only small bets, and missed hands fold.' },
    ],
    takeaway: 'In a multiway pot full of strong hands, shove the nuts: someone pays.',
  },
  'trips-ace-kicker-river-overbet': {
    why: 'Overbet: their turn check capped them at missed draws and low pairs, and you beat all of it. A big bet loses a few of the weakest pairs, but wins much more each time it’s called. The missed draws fold to anything, so they don’t matter to the size. Bet as big as you can.',
    read: [
      { about: 'preflop', text: 'You 3-bet the button’s open from the small blind and they called: pairs, suited broadways and suited aces.' },
      { about: 'position', text: 'They’re in position and checked back the turn. In position, a strong hand bets the turn to build the pot; a check says they don’t have one.' },
      { about: 'board', text: 'K♣Q♥4♣ has club and straight draws. The 7♥ changes little, and the K♠ gives you trips with the best kicker.' },
      { about: 'sizing', text: 'They raised your small flop bet with draws, pairs and some strong hands, then checked the turn. That capped them.' },
      { about: 'range', text: 'Low pairs call even a big bet. The weakest pairs call a normal bet but fold to an overbet. Missed club and straight draws fold.' },
    ],
    takeaway: 'When a check behind caps their range and you beat all of it, bet big: each call pays more.',
  },
};

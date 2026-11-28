import type { Lesson } from '../model';

export const L8: Record<string, Lesson> = {
  'straight-never-fold-to-river-shove': {
    why: 'Call: they shove full houses, but they also shove A-Q and their overpairs, and there are far more of those. The paired river looks scary, yet only Q-Q, 7-7, 5-5 and quad sixes beat you. You need about 35% and you’re ahead most of the time.',
    streets: [
      { street: 'preflop', text: 'You open 9♦8♥ from second position, the button 3-bets, and you call.', range: 'Big pairs, A-K, A-Q, suited broadways, some light 3-bets.' },
      { street: 'flop', text: 'On Q♥7♠5♦ you check, they bet small, and you call with a gutshot and two overcards. A small c-bet here is most of their range.', range: 'Overpairs, A-Q and K-Q, sets, and big cards.' },
      { street: 'turn', text: 'The 6♠ gives you a straight. You check to let them keep betting; they bet ¾ pot and you call. Overpairs and top pairs keep going here, thinking they’re ahead.', range: 'K-K and A-A, A-Q, sets Q-Q, 7-7 and 5-5, some bluffs.' },
      { street: 'river', text: 'The 6♦ pairs the board and they shove about the pot. Sets just became full houses, but a 3-bettor also shoves A-Q and overpairs, reading you for one pair.', range: 'Ahead: Q-Q, 7-7, 5-5, quad sixes. Behind: A-Q, K-K and A-A.' },
    ],
    takeaway: 'A straight on a paired board is still strong when their shove includes many one-pair hands.',
  },
  'aces-full-call-quads-shove': {
    why: 'Call: you have the second nuts. Their kings full and sixes full lose to aces full, and only the two hands holding the 6♥ make quads. You need about 30%, and you win nearly every time.',
    streets: [
      { street: 'preflop', text: 'You open A♠A♥ from the cutoff, the small blind 3-bets, you 4-bet and they call.', range: 'Pairs, A-K, A-Q, K-Q and suited connectors.' },
      { street: 'flop', text: 'You flop top set on A♣K♠6♦. You bet small, 4.9, and they call: in a 4-bet pot they rarely fold top pair.', range: 'Kings like A-K and K-Q, pairs, and 6-x.' },
      { street: 'turn', text: 'The 6♣ gives you aces full, and they lead small. They’re close to drawing dead, so you just call and let them keep betting.', range: 'A-K, K-K, sixes and pairs.' },
      { street: 'river', text: 'The 6♠ puts trip sixes on the board and they shove. Every hand they hold is now a full house you beat, unless it has the 6♥.', range: 'Quads: 7-6 and 6-5 with the 6♥. Behind you: K-K, A-K and A-Q.' },
    ],
    takeaway: 'With the second nuts and only a couple of combos that beat you, call any bet.',
  },
  'second-pair-river-call-four-handed': {
    why: 'Call: many draws missed, and they bluff with them expecting you to fold a weak made hand. Top pairs, two pair and straights beat you, but you beat every bluff. You need about 29%, and the missed club draws and gutshots get you there.',
    streets: [
      { street: 'preflop', text: 'Four-handed, the button opens and you defend A♦9♥ from the big blind. Short-handed, both ranges are wide.', range: 'Most suited hands, broadways, pairs and connectors.' },
      { street: 'flop', text: 'J♦7♣6♠ checks through. The button gives up a lot here, including some top pairs keeping the pot small.', range: 'Weak jacks, middle pairs, straight draws, air.' },
      { street: 'turn', text: 'The 9♣ gives you second pair and makes straights for T-8 and 8-5. They bet small and you call; plenty of draws bet too.', range: 'Jacks, two pair, straights, club draws, gutshots, pairs.' },
      { street: 'river', text: 'The 3♥ misses every draw and they bet ⅔ pot. Your check-call looks weak, so missed club draws and gutshots bluff here a lot.', range: 'Ahead: top pairs, two pair, sets, straights. Behind: missed club draws, gutshots like K-8 and Q-8.' },
    ],
    takeaway: 'When many draws miss and they expect you to fold, call with a hand that beats the bluffs.',
  },
  'queens-full-bet-big-not-overbet': {
    why: 'Bet about ¾ pot: their trip fives call a big bet about as often as a smaller one, so make it big, but not an overbet, which they fold. A queen splits whatever you bet, and marginal pairs and missed draws fold to any size.',
    streets: [
      { street: 'preflop', text: 'The button limps, you complete Q♦J♠ from the small blind, and the big blind checks.', range: 'The limper: any ace, suited kings, connectors, small pairs.' },
      { street: 'flop', text: 'On Q♣5♣5♦ both blinds check, the button bets, you call and the big blind folds. Betting when checked to covers trips, queens, pairs and draws.', range: 'Fives, queens, pairs, club draws, air.' },
      { street: 'turn', text: 'The 9♠. You lead and they call. They hold more fives than you, but the lead gets value from their queens and pairs.', range: 'Fives, queens, pairs, club draws.' },
      { street: 'river', text: 'The Q♥ gives you queens full. A five calls a normal bet but rarely an overbet; a queen splits; the rest folds to anything.', range: 'Big bet but not an overbet: trip fives. Split: a queen. Fold: marginal pairs, missed draws.' },
    ],
    takeaway: 'Bet big when their calling hands call big, but stop short of an overbet that folds them.',
  },
  'top-pair-small-river-value-bet': {
    why: 'Bet small: their range is weak and you beat most of it. A big bet folds the nines and middle pairs you beat; a small one gets called by them, and weaker aces call either way. If they check-raise, fold: a straightforward player only does that with two pair or better.',
    streets: [
      { street: 'preflop', text: 'A straightforward player limps and calls your raise from the cutoff with A♠J♣. Aces strong enough to raise would have raised.', range: 'Wide and capped: weak aces, pairs, suited connectors, broadways.' },
      { street: 'flop', text: 'You flop top pair on A♣9♥2♦. You hold all the strong aces, and a small bet keeps their weaker hands in.', range: 'Weaker aces, nines, small pairs, the odd set or two pair.' },
      { street: 'turn', text: 'The 3♣ adds club and wheel draws. They check-call again; a big bet would fold the hands you beat, so you keep it small.', range: 'Weaker aces, nines, pairs, wheel and club draws.' },
      { street: 'river', text: 'The T♠ and they check a third time. Weaker aces are in there, but so are lots of nines and middle pairs that only call something small.', range: 'Ahead: two pair, sets, the wheel, a few better aces. Behind: weaker aces (most sizes), Q-9, J-9, 8-8 (small only).' },
    ],
    takeaway: 'Against a weak, capped range, bet small so their middle pairs keep calling.',
  },
  'overpair-check-river-vs-tens': {
    why: 'Check: a bet only gets called by a ten or a flush, and both beat you, while everything you beat folds to any bet. Betting can only lose more, unless they’re an extreme calling station.',
    streets: [
      { street: 'preflop', text: 'A tight player limps and calls your raise with Q♠Q♥.', range: 'Pairs, suited aces, broadways, suited connectors.' },
      { street: 'flop', text: 'On T♠T♣2♣ you bet and they check-raise. From a tight player that’s a ten or a club draw, sometimes a small pair.', range: 'Tens, club draws, a few small pairs.' },
      { street: 'turn', text: 'The 4♣ completes the clubs and they check, maybe without a ten or scared of the flush. You bet small and they call.', range: 'Tens, club flushes, low pairs with a club, one-club draws.' },
      { street: 'river', text: 'The 8♥ and they check again. A ten never folds and beats you; so does a flush. Everything else is a weak pair or busted draw that folds.', range: 'Ahead (call): a ten, club flushes. Behind (fold): low pairs, busted draws.' },
    ],
    takeaway: 'When every hand you beat folds and every hand that calls beats you, check.',
  },
  'ace-high-river-bluff-vs-tight-3bet': {
    why: 'Bet about ⅔ pot as a bluff: their checks say they have less than top pair. A-K, 8-8 and 7-7 beat your ace high at showdown but fold to a real bet, while a small bet lets them call. Only tens and K-Q got there, so against a tight player this works most of the time.',
    streets: [
      { street: 'preflop', text: 'You open A♦Q♣ from the lojack and a very tight player 3-bets from the cutoff; you call.', range: 'Big pairs, A-K, A-Q, A-T, some suited broadways.' },
      { street: 'flop', text: 'On 9♥6♣6♦ you check, they bet small, 3.4, and you call with two overcards. A very tight 3-bettor c-bets this board with everything, so many of their hands missed too.', range: 'Overpairs, A-K, A-Q, 8-8, 7-7, big cards.' },
      { street: 'turn', text: 'The J♥ and they check back. A very tight player bets top pair or better here, so the check says they don’t have it.', range: 'A-K, 8-8, 7-7, A-T, weaker aces; few overpairs.' },
      { street: 'river', text: 'The T♠ makes K-Q a straight and T-T a full house; nearly everything else they hold is worse than top pair and can’t stand a real bet.', range: 'Fold to ⅔, call small: A-K, 8-8, 7-7. Fold: A-T, weaker aces. Split: A-Q. Call: T-T, K-Q.' },
    ],
    takeaway: 'When a tight player’s checks cap their range, bluff with a size that folds their showdown hands.',
  },
  'aces-full-river-overbet-vs-tag': {
    why: 'Overbet: their marginal hands fold to any bet, so don’t size for them. The hands that call, flushes, full houses and aces with a spade, call a big bet as readily as a small one, and with no spade yourself they can hold every flush. Bet as big as you can.',
    streets: [
      { street: 'preflop', text: 'You open A♥A♦ from the hijack, 200 big blinds deep, and a good, tight-aggressive player defends the big blind.', range: 'Wide: suited hands, pairs, broadways, connectors.' },
      { street: 'flop', text: 'You flop top set on A♠Q♠8♣. You bet small, 3.33, and they call.', range: 'Aces, queens, eights, spade draws like K♠J♠ and J♠T♠, some two pairs.' },
      { street: 'turn', text: 'The 2♠ puts three spades out. You keep the bet modest: their aces and queens without a spade are nearly dead, and you want them in. If they raise, you call it off.', range: 'Flushes, aces and queens, sets, spade draws.' },
      { street: 'river', text: 'The 2♣ gives you aces full. Their marginal hands fold to almost anything; flushes, full houses and an ace with a spade call.', range: 'Call any size: flushes, full houses. Hero call: aces with a spade. Fold: marginal hands.' },
    ],
    takeaway: 'When the hands that call don’t care about the size, bet as big as you can.',
  },
  'straight-flush-multiway-river-shove': {
    why: 'Shove: you have less than the pot left, and with flushes, straights, sets and two pair around, someone will pay. Two loose players with wide ranges both called the turn, so a small bet to keep them in gains nothing over a shove that gets called this often.',
    streets: [
      { street: 'preflop', text: 'A splashy player limps, a loose, aggressive player raises, and you both call, you on the button with 9♥7♥.', range: 'Both: very wide, lots of suited hands and connectors.' },
      { street: 'flop', text: 'You flop top pair with a backdoor flush draw on 7♠6♥3♠. The raiser bets 8; you and the limper call.', range: 'Pairs, straight draws like 8-5, 5-4 and 9-8, spade draws, the odd set.' },
      { street: 'turn', text: 'The 8♥ gives you an open-ender and a flush draw. They check to you; you bet and both call with made hands and draws.', range: 'Straights, sets, two pairs, pairs, heart and straight draws.' },
      { street: 'river', text: 'The 5♥ gives you a straight flush, and both check to you. You have less than the pot behind.', range: 'Call a shove: heart flushes, straights, sets, two pair. Small bets only: one pair. Fold: missed hands.' },
    ],
    takeaway: 'In a multiway pot full of strong hands, shove the nuts: someone pays.',
  },
  'trips-ace-kicker-river-overbet': {
    why: 'Overbet: their turn check capped them at missed draws and low pairs, and you beat all of it. A big bet loses a few of the weakest pairs but wins much more each time it’s called, and the missed draws fold to anything.',
    streets: [
      { street: 'preflop', text: 'You 3-bet A♥K♥ from the small blind over the button’s open and they call.', range: 'Pairs, suited broadways and suited aces.' },
      { street: 'flop', text: 'You flop top pair, top kicker on K♣Q♥4♣. You bet small and they raise with draws, pairs and some strong hands; you call.', range: 'Club and straight draws, pairs, kings, some sets.' },
      { street: 'turn', text: 'The 7♥. You check and they check back. A strong hand would bet in position to build the pot, so the check caps them.', range: 'Draws and low pairs; few strong hands.' },
      { street: 'river', text: 'The K♠ gives you trips with the best kicker. They’re left with a missed draw or a low pair.', range: 'Call even a big bet: low pairs. Normal bet only: the weakest pairs. Fold: missed draws.' },
    ],
    takeaway: 'When a check behind caps their range and you beat all of it, bet big: each call pays more.',
  },
};

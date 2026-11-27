import type { Lesson } from '../model';

export const L8: Record<string, Lesson> = {
  'straight-never-fold-to-river-shove': {
    why: 'Call: they shove full houses, but they also shove A-Q and their overpairs, and there are far more of those. The pair on the river looks scary, yet only Q-Q, 7-7, 5-5 and quad sixes beat you. You need about 35%, and you’re ahead most of the time. A straight is too strong to fold here.',
    streets: [
      { street: 'preflop', text: 'You open 9♦8♥ from second position and the button 3-bets; you call. A button 3-bet against an early open is big pairs and big aces, plus some lighter hands.', range: 'Big pairs, A-K, A-Q, suited broadways and some light 3-bets.' },
      { street: 'flop', text: 'The flop is Q♥7♠5♦. You check and they bet small; you call with a gutshot and two overcards. A small c-bet on this board is most of their range.', range: 'Their whole range: overpairs, A-Q and K-Q, sets, and big cards.' },
      { street: 'turn', text: 'The 6♠ gives you a straight. Checking is right, to let them keep betting; they bet ¾ pot and you call. Overpairs and top pairs keep betting here, believing they’re ahead.', range: 'Overpairs K-K and A-A, A-Q, sets Q-Q, 7-7 and 5-5, and some bluffs.' },
      { street: 'river', text: 'The 6♦ pairs the board. They shove about the size of the pot. Sets just became full houses, but a 3-bettor also shoves A-Q and overpairs here, reading you for one pair.', range: 'Ahead of you: Q-Q, 7-7 and 5-5 (full houses) and quad sixes. Behind you: A-Q, K-K and A-A.' },
    ],
    takeaway: 'A straight on a paired board is still strong when their shove includes many one-pair hands.',
  },
  'aces-full-call-quads-shove': {
    why: 'Call: you have the second nuts. Their kings full and sixes full both lose to aces full, and only the two hands holding the 6♥ make quads. You need about 30%, and you win nearly every time. This is the easiest call there is.',
    streets: [
      { street: 'preflop', text: 'You open A♠A♥ from the cutoff, the small blind 3-bets, you 4-bet and they call. Calling a 4-bet: pairs, A-K, A-Q and some suited hands.', range: 'Pairs, A-K, A-Q, K-Q and suited connectors.' },
      { street: 'flop', text: 'You flop top set on A♣K♠6♦. They check, you bet small, 4.9, and they call. A small bet keeps their kings and pairs in: in a 4-bet pot they rarely fold top pair, and A-K, A-Q and K-Q all call.', range: 'Kings like A-K and K-Q, pairs, and 6-x.' },
      { street: 'turn', text: 'The 6♣ gives you aces full. They lead small. Their range is close to drawing dead, so you just call to let them keep betting.', range: 'A-K, K-K, sixes and pairs.' },
      { street: 'river', text: 'The 6♠ puts trip sixes on the board, and they shove. Every hand they have is now a full house, and you beat them all; only the 6♥ makes quads.', range: 'Quads: 7-6 and 6-5 with the 6♥. Behind you: K-K (kings full) and A-K and A-Q (sixes full).' },
    ],
    takeaway: 'With the second nuts and only a couple of combos that beat you, call any bet.',
  },
  'second-pair-river-call-four-handed': {
    why: 'Call: many draws missed, and they bluff with them, expecting you to fold a weak made hand. You lose to top pairs, two pair and straights, but you beat every bluff. You need about 29%, and the missed club draws and gutshots get you there.',
    streets: [
      { street: 'preflop', text: 'Four-handed in a tournament, the button opens and you defend A♦9♥ from the big blind. Short-handed, both ranges are wide.', range: 'Wide: most suited hands, broadways, pairs and connectors.' },
      { street: 'flop', text: 'The flop is J♦7♣6♠ and it checks through. The button gives up a lot here, including some top pairs that want to keep the pot small.', range: 'Weak jacks, middle pairs, straight draws, and air.' },
      { street: 'turn', text: 'The 9♣ gives you second pair, adds a club draw, and makes straights for T-8 and 8-5. They bet small and you call; plenty of draws are betting too.', range: 'Jacks, two pair, straights, club draws, gutshots and pairs.' },
      { street: 'river', text: 'The 3♥ misses every draw, and they bet ⅔ pot. Your check-call looks like a weak hand, so missed club draws and gutshots bluff here a lot.', range: 'Ahead of you: top pairs that checked the flop, two pair, sets and straights. Behind you: missed club draws and gutshots like K-8 and Q-8.' },
    ],
    takeaway: 'When many draws miss and they expect you to fold, call with a hand that beats the bluffs.',
  },
  'queens-full-bet-big-not-overbet': {
    why: 'Bet about ¾ pot: their trip fives call a big bet about as often as a smaller one, so make it big. An overbet is too much: trip fives fold to it, and only a calling station would pay. A queen splits whatever you bet. Marginal pairs and missed draws fold to any size.',
    streets: [
      { street: 'preflop', text: 'The button limps in a tournament, you complete Q♦J♠ from the small blind, and the big blind checks. The limper’s range is wide: any ace, suited kings, connectors and small pairs.', range: 'Wide: any ace, suited kings, connectors and small pairs.' },
      { street: 'flop', text: 'The flop is Q♣5♣5♦. You check, the big blind checks, and the button bets; you call and the big blind folds. Betting when checked to is what they do with trips, queens, pairs and club draws.', range: 'Fives, queens, pairs, club draws, and air.' },
      { street: 'turn', text: 'The 9♠. You lead and they call. They have more fives than you, so checking to call is the usual play, but your lead gets value from queens and pairs.', range: 'Fives, queens, pairs and club draws.' },
      { street: 'river', text: 'The Q♥ gives you queens full. A five calls a normal bet but rarely an overbet; a queen chops; marginal pairs and missed draws fold to anything.', range: 'Trip fives (call a big bet, fold to an overbet), a queen (a split), marginal pairs and missed draws (fold).' },
    ],
    takeaway: 'Bet big when their calling hands call big, but stop short of an overbet that folds them.',
  },
  'top-pair-small-river-value-bet': {
    why: 'Bet small: their range is weak and you beat most of it. A big bet folds the nines and middle pairs you beat; a small one gets called by hands like Q-9 and 8-8. Weaker aces call either way. If they check-raise, you can usually fold, because a straightforward player only does that with two pair or better.',
    streets: [
      { street: 'preflop', text: 'A straightforward player limps and calls your raise from the cutoff with A♠J♣. That’s a wide, capped range: aces strong enough to raise would have raised.', range: 'Wide and capped: weak aces, pairs, suited connectors and broadways.' },
      { street: 'flop', text: 'You flop top pair on A♣9♥2♦. You have all the strong aces; they call with weaker aces, nines and pairs. A small bet keeps them in.', range: 'Weaker aces, nines, small pairs, and the odd set or two pair.' },
      { street: 'turn', text: 'The 3♣ adds a club draw and a wheel draw. They check-call again. A big bet would fold the hands you beat, so you keep it small.', range: 'Weaker aces, nines, pairs, and wheel and club draws.' },
      { street: 'river', text: 'The T♠ and they check a third time. Weaker aces and a few two pairs are in there, but so are lots of nines and middle pairs that only call something small.', range: 'Ahead of you: two pair, sets and the wheel, and a few better aces. Behind you: weaker aces (call most sizes), and nines and middle pairs like Q-9, J-9 and 8-8 (call only small).' },
    ],
    takeaway: 'Against a weak, capped range, bet small so their middle pairs keep calling.',
  },
  'overpair-check-river-vs-tens': {
    why: 'Check: a bet only gets called by a ten or a flush, and both beat you. Everything you beat, weak pairs and busted draws, folds to any bet. So betting can only lose more. Check, unless they’re an extreme calling station.',
    streets: [
      { street: 'preflop', text: 'A tight player limps and calls your raise with Q♠Q♥. Their range is pairs, suited aces, broadways and connectors.', range: 'Pairs, suited aces, broadways and suited connectors.' },
      { street: 'flop', text: 'The flop is T♠T♣2♣. You bet and they check-raise. From a tight player, that’s a ten, or a club draw, and sometimes a small pair.', range: 'Tens, club draws, and a few small pairs.' },
      { street: 'turn', text: 'The 4♣ completes the clubs, and they check. Maybe no ten, or scared of the flush. You bet small and they call.', range: 'Tens, club flushes, low pairs with a club, and draws with one club.' },
      { street: 'river', text: 'The 8♥ and they check again. They likely have a ten, which beats you and never folds, or a flush. Otherwise it’s a weak pair or a busted draw, and those fold to any bet.', range: 'Ahead of you: a ten and club flushes (call). Behind you: low pairs with a club and busted draws (fold).' },
    ],
    takeaway: 'When every hand you beat folds and every hand that calls beats you, check.',
  },
  'ace-high-river-bluff-vs-tight-3bet': {
    why: 'Bet about ⅔ pot as a bluff: their checks say they have less than top pair. A-K, 8-8 and 7-7 beat your ace high at a showdown but fold to a real bet, and a small bet lets them call. Only tens and K-Q got there. Against a tight player, this bluff works most of the time.',
    streets: [
      { street: 'preflop', text: 'You open A♦Q♣ from the lojack in a tournament and a very tight player 3-bets from the cutoff; you call. Their range is big pairs and big aces.', range: 'Big pairs, A-K, A-Q, A-T and some suited broadways.' },
      { street: 'flop', text: 'The flop is 9♥6♣6♦. You check, they bet small, 3.4, and you call with two overcards. A very tight 3-bettor c-bets this board with their whole range: overpairs, A-K, A-T and A-J, so the call keeps you in against many hands that also missed.', range: 'Overpairs, A-K, A-Q, 8-8, 7-7, and big cards.' },
      { street: 'turn', text: 'The J♥ and they check back. A very tight player bets top pair or better here, so a check says they don’t have it.', range: 'A-K, 8-8, 7-7, A-T and weaker aces; few overpairs.' },
      { street: 'river', text: 'The T♠ completes K-Q’s straight and gives T-T a full house. Their range is worse than top pair: A-K, 8-8 and 7-7 beat your ace high but can’t stand a real bet.', range: 'A-K, 8-8 and 7-7 (fold to ⅔ pot, call small), A-T (folds), A-Q (a split), weaker aces (fold), T-T and K-Q (call).' },
    ],
    takeaway: 'When a tight player’s checks cap their range, bluff with a size that folds their showdown hands.',
  },
  'aces-full-river-overbet-vs-tag': {
    why: 'Overbet: their marginal hands fold to any bet, so don’t size for them. The hands that call, flushes, full houses and aces with a spade, call a big bet as readily as a small one. You don’t hold a spade, so they can have every flush. Go for it all: bet as big as you can.',
    streets: [
      { street: 'preflop', text: 'You open A♥A♦ from the hijack, 200 big blinds deep, and a good, tight-aggressive player defends the big blind.', range: 'Wide: suited hands, pairs, broadways and connectors.' },
      { street: 'flop', text: 'You flop top set on A♠Q♠8♣. You bet small, 3.33, and they call. A good player defends the big blind wide and calls here with aces, queens, eights, and spade draws like K♠J♠ and J♠T♠.', range: 'Aces, queens, spade draws, and some sets and two pairs.' },
      { street: 'turn', text: 'The 2♠ puts three spades out. Don’t bet too big here: the aces and queens without a spade are drawing thin, and you want to keep them in. If they raise, call it off.', range: 'Flushes, aces and queens, sets, and spade draws.' },
      { street: 'river', text: 'The 2♣ gives you aces full. Their marginal hands fold to almost any bet. What calls is flushes, full houses, and the odd hero call with an ace and a spade.', range: 'Flushes and full houses (call any size), aces with a spade (a hero call), marginal hands (fold).' },
    ],
    takeaway: 'When the hands that call don’t care about the size, bet as big as you can.',
  },
  'straight-flush-multiway-river-shove': {
    why: 'Shove: you have less than the pot left, and with flushes, straights, sets and two pair around, someone will pay. Two loose players with wide ranges both called the turn. A small bet to keep them in rarely makes sense when a shove gets called this often.',
    streets: [
      { street: 'preflop', text: 'A splashy player limps, a loose, aggressive player raises, and you both call, you on the button with 9♥7♥. Wide ranges all round.', range: 'Both: very wide, lots of suited hands and connectors.' },
      { street: 'flop', text: 'You flop top pair with a backdoor flush draw on 7♠6♥3♠. The raiser bets 8, you call, and so does the splashy limper. Both ranges are wide: sevens, sixes, spade draws, straight draws like 8-5, 5-4 and 9-8, and pairs.', range: 'Pairs, straight draws, spade draws, and the odd set.' },
      { street: 'turn', text: 'The 8♥ gives you an open-ended straight draw and a flush draw. They check to you; you bet and both call. Calls here are made hands and draws.', range: 'Straights, sets, two pairs, pairs, and heart and straight draws.' },
      { street: 'river', text: 'The 5♥ gives you a straight flush, 5-6-7-8-9 of hearts. Both check to you. You have less than the pot behind, and both opponents call a shove with flushes, straights, sets and even two pair.', range: 'Both: heart flushes, straights, sets and two pair (call a shove); one pair (calls only small bets); missed hands (fold).' },
    ],
    takeaway: 'In a multiway pot full of strong hands, shove the nuts: someone pays.',
  },
  'trips-ace-kicker-river-overbet': {
    why: 'Overbet: their turn check capped them at missed draws and low pairs, and you beat all of it. A big bet loses a few of the weakest pairs, but wins much more each time it’s called. The missed draws fold to anything, so they don’t matter to the size.',
    streets: [
      { street: 'preflop', text: 'You 3-bet A♥K♥ from the small blind against the button’s open, and they call. Their range: pairs, suited broadways and suited aces.', range: 'Pairs, suited broadways and suited aces.' },
      { street: 'flop', text: 'You flop top pair, top kicker on K♣Q♥4♣. You bet small and they raise: draws, pairs and some strong hands. You call.', range: 'Club and straight draws, pairs, kings, and some sets.' },
      { street: 'turn', text: 'The 7♥ and you check; they check back. In position, a strong hand bets the turn to build the pot, so the check caps them: mostly draws and low pairs.', range: 'Draws and low pairs; few strong hands.' },
      { street: 'river', text: 'The K♠ gives you trips with the best kicker. Their range is a missed draw or a low pair. Missed draws fold to anything; the low pairs are bluff catchers.', range: 'Low pairs (call even a big bet), the weakest pairs (call a normal bet, fold to an overbet), missed club and straight draws (fold).' },
    ],
    takeaway: 'When a check behind caps their range and you beat all of it, bet big: each call pays more.',
  },
};

import type { Lesson } from '../model';

export const L21: Record<string, Lesson> = {
  'trips-call-half-pot-river-bet-limped-pot': {
    why: 'Call: an experienced pro attacks when the first bettor shows weakness, and those bets include plenty of draws, most of which this river missed. Better sixes, full houses and T-9 beat you, but you beat 8-7, A-7 and 6-5, which bet for value, and every missed draw. You need about 26%, and your trips are ahead far more often.',
    streets: [
      { street: 'preflop', text: 'In a big live game everyone limps, you with 9♣6♣ on the button, and the big blind checks. Big pairs are rare in a limped pot.', range: 'Everyone: suited hands, connectors, small pairs, weak aces.' },
      { street: 'flop', text: 'On 7♠6♠6♥ the big blind bets 4 into 5.5; the cutoff and you call, you with trips and a weak kicker.', range: 'The cutoff: sixes, sevens, spade draws, straight draws like 9-8, 8-5, 5-4, T-9, pairs.' },
      { street: 'turn', text: 'The 8♦ gives you an open-ender too. The big blind checks, almost surely weak; the cutoff bets 15 into 17.5, you call and the big blind folds. A pro takes over the betting here with value and plenty of draws.', range: 'Better sixes, 8-7, A-7, 6-5, 9-5, T-9, spade draws, 5-4.' },
      { street: 'river', text: 'The J♣ makes T-9 a straight and misses the spades. The cutoff bets 25 into 47.5, a size that still holds many of the draws that just missed.', range: 'Ahead: some better sixes, full houses, straights. Behind: 8-7, A-7, 6-5, missed spade and straight draws.' },
    ],
    takeaway: 'When a good player takes over the betting after someone shows weakness, their range has draws: call the river with trips.',
  },
  'ace-jack-check-back-no-bluff': {
    why: 'Check: a tight-aggressive regular who called a flop raise and a turn bet usually has a king, and kings call any river bet. The only hand that folds, a missed Q-J, is one your ace high already beats. A bluff that folds only worse hands wins nothing.',
    streets: [
      { street: 'preflop', text: 'A tight-aggressive regular opens middle position and you call A♣J♣ in the cutoff.', range: 'Pairs, A-K to A-T, K-Q, K-J, suited broadways.' },
      { street: 'flop', text: 'On K♦T♣3♥ you have a gutshot to the nuts. They bet 4 into 7.5 and you raise to 12 as a semi-bluff; they call with a king or Q-J’s open-ender.', range: 'Kings (A-K, K-Q, K-J, K-T), Q-J, the odd slow set.' },
      { street: 'turn', text: 'The 5♣ adds a club draw for you. They check, you bet 21 into 31.5, and they call: a king almost every time, plus Q-J.', range: 'Kings and Q-J.' },
      { street: 'river', text: 'The 8♦ misses everything and they check. Their kings call any bet; Q-J folds, but your ace high beats it anyway.', range: 'Call any bet: A-K, K-Q, K-J, K-T. Fold: missed Q-J, which you beat.' },
    ],
    takeaway: 'Bluff only when better hands can fold: if only worse hands fold, check and take the showdown.',
  },
  'nines-eight-take-free-showdown': {
    why: 'Check: after betting the flop and turn they checked the river, which leaves a king, a high pair, an ace that just paired, or a barrel that gave up. The made hands all call a bet, so value only gets called by better, and the only hands that fold are worse than your second pair already. Take the free showdown.',
    streets: [
      { street: 'preflop', text: 'A tight-aggressive regular opens middle position and you call 9♠8♠ on the button.', range: 'Pairs, A-K to A-T, K-Q, K-J, suited broadways, some suited connectors.' },
      { street: 'flop', text: 'You flop second pair on K♠8♦3♥. They bet 4.5 into 7.5, most of their range on a king-high board, and you call.', range: 'Kings, Q-Q to 9-9, A-Q, A-J, broadways.' },
      { street: 'turn', text: 'The 4♠ gives you a flush draw. They bet 11 into 16.5 and you call: kings and high pairs keep going, and so do some ace-high barrels.', range: 'Kings, Q-Q to 9-9, A-Q, A-J and other barrels.' },
      { street: 'river', text: 'The A♦ misses your flush and pairs their aces, and they check: kings and pairs keeping it small, aces wanting a showdown, barrels giving up.', range: 'Call a bet: kings, Q-Q to 9-9, aces that paired. Fold: barrels that gave up, which you beat.' },
    ],
    takeaway: 'With a medium hand on the river, take the free showdown when better hands call and worse hands fold.',
  },
  'king-ten-check-back-passive-big-blind': {
    why: 'Check: a passive regular never check-raises as a bluff and doesn’t call with worse, so their two ¾-pot calls already folded the weak pairs and junk. What’s left is a better king, queens with a missed diamond draw, and 7♦6♦, which just made a straight. Top pair beats only the queens, and they won’t call a third bet.',
    streets: [
      { street: 'preflop', text: 'It folds to you on the button; you raise K♥T♥ and a passive regular defends. They rarely 3-bet, so A-K and K-Q are still in.', range: 'Pairs, suited hands, broadways like A-K, K-Q and Q-J, 7♦6♦, weak aces.' },
      { street: 'flop', text: 'You flop top pair on 4♥5♦K♦. You bet 4.8 into 6.5 and they call.', range: 'Kings, fives, fours, diamond draws like Q♦J♦ and Q♦T♦, 7-6, pairs.' },
      { street: 'turn', text: 'The 8♠. You bet 12 into 16 and they call again; from a player who doesn’t call with worse, that narrows to better kings and real draws.', range: 'A-K, suited K-Q, diamond draws with the Q♦, 7♦6♦ drawing.' },
      { street: 'river', text: 'The 9♠ makes 7-6 a straight and misses the diamonds. They check.', range: 'Ahead: A-K, suited K-Q, 7♦6♦ (raises). Behind: queens with the Q♦.' },
    ],
    takeaway: 'Against a player whose calls are honest, top pair with a weak kicker checks the river: only better calls.',
  },
  'king-high-straight-check-back-vs-ace-jack': {
    why: 'Check: after a flop bet and two checks, hands without a jack won’t call a bet on a four-straight board, and hands with one might check-raise. A-J has the nuts, and K-J, Q-J, J-9 and J-8 only split. A bet gets called or raised only by hands that tie or beat you.',
    streets: [
      { street: 'preflop', text: 'In a big live game with a straddle, a strong, slightly aggressive pro opens the hijack, you call J♥T♥ on the button, and the straddle calls.', range: 'Pairs, A-K to A-T, broadways like K-Q, K-J and Q-J, suited connectors.' },
      { street: 'flop', text: 'You flop top pair and an open-ender on T♣9♦4♥. The pro bets 9, you call, and the straddle folds.', range: 'Tens, nines, overpairs, sets, Q-J, K-J, J-8, A-K, A-Q.' },
      { street: 'turn', text: 'The Q♦ and the pro checks; you check behind to keep the pot small. They check medium hands here and some straights to trap.', range: 'Two pairs, sets, overpairs, tens, nines, K-J, A-J, A-K, Q-J, J-9.' },
      { street: 'river', text: 'The K♠ gives you a king-high straight and they check again. Any jack now has a straight, and A-J has the best one.', range: 'Raises: A-J. Splits, may raise: K-J, Q-J, J-9, J-8. Folds: two pairs, sets, tens, nines.' },
    ],
    takeaway: 'When a bet only gets called by hands that tie or beat you, check the second-nut straight.',
  },
  'nine-high-flush-fold-turn-raise-recreational': {
    why: 'Fold: a recreational player who is passive with big bets has finally raised big, and that means strength. On a paired three-diamond board, the only lower flushes are unlikely in a raised pot, and straights and overpairs don’t raise here. What raises is a higher flush or a full house, and now and then the bare A♦. A 25% price needs far more bluffs than that.',
    streets: [
      { street: 'preflop', text: 'In a big live game you open 9♦8♦ under the gun, 200 big blinds deep; a pro and a recreational player call.', range: 'The recreational player: pairs, suited aces, K♦Q♦, Q♦J♦, suited connectors, A-K, A-Q.' },
      { street: 'flop', text: 'You flop a flush with a straight-flush draw on 7♦6♦3♦. You bet 8 into 12 and both call.', range: 'Flushes, single high diamonds, overpairs, sets, straight draws like 5-4 and 8-5.' },
      { street: 'turn', text: 'The 3♣ pairs the board. You bet 22 into 36, the pro folds, and the recreational player raises to 62.5. They don’t raise one pair, a worried set or a straight here.', range: 'Value: higher flushes, 3-3, sets that filled up. Bluffs: rarely, the bare A♦.' },
    ],
    takeaway: 'When a passive player suddenly raises big on a flush board, a low flush is a fold.',
  },
  'top-pair-fold-river-jam-after-check-raise': {
    why: 'Fold: a flop check-raise, a pot-size turn bet and a river jam are three strong actions in a row, and a straightforward player rarely builds that as a bluff. Their value is sets, two pair and the 5-3 straight that just got there; the bluffs are a few busted 7-5 and 8-7. You need about 34%, and top pair with an eight kicker wins far less often.',
    streets: [
      { street: 'preflop', text: 'You open Q♥8♥ on the button, 100 big blinds deep, and a straightforward player defends the big blind wide.', range: 'Pairs, suited hands, connectors like 7-5, 8-7 and 5-3, broadways, any ace.' },
      { street: 'flop', text: 'You flop top pair on Q♣6♦4♥. You bet 2 into 6.5 and they check-raise to 7.2; you call. This player check-raises sets, two pair and straight draws; weak queens just call.', range: '6-6, 4-4, Q-6, 6-4, strong queens, 7-5, 8-7, 5-3.' },
      { street: 'turn', text: 'The 9♠ and they bet the pot, 20.9; you call. 9-9 just made a set.', range: '9-9, 6-6, 4-4, two pairs, strong queens, 7-5, 8-7, 5-3.' },
      { street: 'river', text: 'The 2♠ makes 5-3 a straight and 2-2 a set, and they jam 68.9 into 62.7. The hands that check-raised and kept going have made something.', range: 'Value: 9-9, 6-6, 4-4, 2-2, two pair, 5-3. Bluffs: some busted 7-5 and 8-7.' },
    ],
    takeaway: 'Against a straightforward player, a check-raise, a pot-size barrel and a river jam are value: fold top pair.',
  },
  'middle-pair-fold-river-after-turn-pot-lead': {
    why: 'Fold: a straightforward player bets draws on the turn but gives up on the river when they miss. The river missed every draw and they bet again, so this is J-T, sets or two pair. Middle pair beats only the few missed draws that bet anyway, and you need about 27%.',
    streets: [
      { street: 'preflop', text: 'You open Q♥8♥ on the button and a straightforward player defends the big blind with every suited and connected hand.', range: 'Pairs, suited hands, broadways like J-T, connectors, any ace.' },
      { street: 'flop', text: 'K♣Q♣9♦ checks through; you check back middle pair to keep the pot small. Their check keeps everything in.', range: 'Kings, queens, nines, J-T, club draws, straight draws like J-8 and T-8, pairs.' },
      { street: 'turn', text: 'The 3♥ and they lead the pot, 6.5; you call. This player leads draws and strong hands alike here.', range: 'J-T, 9-9, 3-3, two pairs, kings, club and straight draws.' },
      { street: 'river', text: 'The 4♠ misses every draw and they bet 11.7 into 19.5. From a player who gives up missed draws, a second bet is a hand that wants a call.', range: 'Value: J-T, 9-9, 4-4, 3-3, two pair. Bluffs: a few missed draws.' },
    ],
    takeaway: 'When a straightforward player keeps betting after their draws miss, they have a made hand: fold middle pair.',
  },
  'kings-check-river-paired-flush-board': {
    why: 'Check: a long think before calling a big turn bet means a real hand that considered folding or raising, and the 9♣ just helped much of that: trip nines, backdoor flushes, the 5-4 straight and sets beat you. T-T and J-J, the hands you beat, fold to a bet, so a bet only gets called by better.',
    streets: [
      { street: 'preflop', text: 'In a big live game, 300 big blinds deep, you raise K♠K♣ over a limper and four players call.', range: 'Middle position: pairs, suited broadways, suited aces, suited connectors like 5-4.' },
      { street: 'flop', text: 'On a dry 9♥3♠2♣ you bet 12.5 into 23; middle position and the big blind call: a pair, a set or a hand like 5-4.', range: 'Nines, 9-9, 3-3, 2-2, T-T, J-J, 5-4, backdoor draws.' },
      { street: 'turn', text: 'The 6♣ adds a club draw and makes 5-4 a straight. You bet 37.5 into 60.5; middle position calls after a long think and the big blind folds.', range: 'Nines like A-9 and 9-8, sets, 5-4, T-T, J-J, club draws.' },
      { street: 'river', text: 'The 9♣ pairs the board and puts three clubs out: any nine is trips and every club draw filled. You act first.', range: 'Call a bet: trip nines, club flushes, 5-4, sets. Fold: T-T and J-J.' },
    ],
    takeaway: 'When the river helps the hands that thought hard on the turn, check an overpair.',
  },
  'aces-small-river-bet-flush-completes': {
    why: 'Bet small: the 7♣ completed the clubs, but your A♣ means any flush they hold is a lower one. They called two big bets with kings like K-Q and K-J and with club draws. The kings call a small bet and fold to a big one, and a flush raises whatever you bet.',
    streets: [
      { street: 'preflop', text: 'In a small live game you raise A♣A♥ in early position and the button calls.', range: 'The button: pairs, broadways like K-Q and K-J, suited hands, suited connectors, any ace.' },
      { street: 'flop', text: 'On K♣5♦2♣ you bet 10 into 11.5 and they call; a low-stakes player calls with any king or club draw and usually raises sets.', range: 'K-Q, K-J, K-T, club draws, fives, pairs.' },
      { street: 'turn', text: 'The T♠. You bet 25 into 31.5 and they call again; small pairs give up to two big bets.', range: 'K-Q, K-J, K-T, club draws.' },
      { street: 'river', text: 'The 7♣ completes the clubs and you act first. Their kings now fear the flush and pay only a small bet.', range: 'Small only: K-Q, K-J. Raises: a club flush.' },
    ],
    takeaway: 'When the flush comes and their range is kings and draws, bet small: the kings pay, and the flushes raise whatever you bet.',
  },
};

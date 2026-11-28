import type { Lesson } from '../model';

export const L20: Record<string, Lesson> = {
  'ace-high-fold-river-shove-three-bet-pot': {
    why: 'Fold: your river bet was a bluff, and it got raised all in. A young pro who 3-bets a lot but plays straightforwardly after the flop makes big moves with real hands, and a raise all in over a bet is the strongest river line there is. Ace high beats only a rare ace-high bluff, so the 31% price means nothing.',
    streets: [
      { street: 'preflop', text: 'A player limps, the cutoff raises, you call A♥Q♠ on the button, 500 big blinds deep, and a 3-bet-happy young pro squeezes from the small blind to 20. Everyone calls.', range: 'Big pairs, A-K and A-Q, suited broadways, suited aces, some suited connectors.' },
      { street: 'flop', text: 'On K♥6♥6♣ they bet 40 into 81 and only you call, with ace high, a backdoor heart draw and position. A squeezer c-bets most of their range here.', range: 'Kings, overpairs, 6-6, heart draws, A-K and A-Q, air.' },
      { street: 'turn', text: 'The 3♦ checks through. A straightforward player who checks has a medium hand, a draw, or a trap; kings stay in their range.', range: 'Kings keeping the pot small, overpairs, heart draws, A-K, A-Q, some traps.' },
      { street: 'river', text: 'The T♥ completes the hearts. They check, you bluff 80, about half the pot, and they raise all in to 340. From a player who rarely bluffs after the flop, that’s the top of their range.', range: 'Value: K-K, T-T, 6-6, heart flushes, overpairs and kings. Bluffs: rare ace high.' },
    ],
    takeaway: 'When a straightforward player raises all in over your river bluff, let it go.',
  },
  'set-overbet-river-range-full-of-kings': {
    why: 'Bet bigger than the pot: most players call down with a king on a king-high board whatever you bet. They called a small flop bet and a big turn bet, so their range is full of kings that call any size; club flushes and K-K beat you, but most kings hold no club. Sevens and small sets call a normal bet, and missed diamond draws fold anyway.',
    streets: [
      { street: 'preflop', text: 'In a big live game you open 9♥9♦ second to act, 200 big blinds deep; both blinds call.', range: 'The small blind: pairs, any ace, broadways like K-Q, K-J and K-T, suited hands, connectors.' },
      { street: 'flop', text: 'On K♦7♦3♣ you bet 5 into 10.5; the small blind calls and the big blind folds.', range: 'Kings, sevens, diamond draws, small pairs, some sets.' },
      { street: 'turn', text: 'The 9♣ gives you a set. You bet 16.5 into 20.5 and they call again: calling twice on a king-high board means a lot of kings, plus draws.', range: 'Kings, 7-7, 3-3, K-K, diamond and club draws, a few sevens.' },
      { street: 'river', text: 'The 2♣ completes the clubs and they check. A king is top pair on a board where most of their range is worse, and it calls whatever you bet.', range: 'Call any size: a king. Beat you: club flushes, K-K. Normal bet: a seven or small set. Fold: missed diamonds.' },
    ],
    takeaway: 'When their range is full of top pairs that call any size, overbet your set.',
  },
  'jacks-call-river-shove-face-up-overpair': {
    why: 'Call: your two check-calls look like Q-Q, J-J or T-T, and a loose, aggressive pro looks for marginal-looking hands to push off with big bets. A shove for more than the pot is designed to fold exactly that. Their value is A-A, K-K, Q-Q, sets and straights, but missed big cards, air and small pairs shove too. You need about 34%, and jacks are ahead more often.',
    streets: [
      { street: 'preflop', text: 'Middle position opens, a loose, aggressive pro 3-bets the cutoff, and you cold-call J♣J♦ from the small blind, 100 big blinds deep; the opener folds.', range: 'Big pairs, A-K, A-Q, and light 3-bets: suited aces, suited broadways, suited connectors.' },
      { street: 'flop', text: 'On a low 8♠5♦3♣ you check and call 7 into 13. A low board misses most of a 3-bettor’s range, so they c-bet everything.', range: 'Overpairs, A-K, A-Q, broadways, small pairs, some sets.' },
      { street: 'turn', text: 'The 2♥ makes A-4 a wheel. They bet 18 into 27 and you call. A loose player keeps barrelling big cards that picked up wheel draws.', range: 'Overpairs, sets, A-4, A-K and A-Q with wheel draws, broadways, small pairs.' },
      { street: 'river', text: 'The 9♦ makes 7-6 a straight. They shove 70 into 63, exactly what a pro uses to push a marginal overpair off its hand.', range: 'Value: A-A, K-K, Q-Q, sets, straights. Bluffs: missed big cards, air, small pairs.' },
    ],
    takeaway: 'When your line looks marginal, a loose pro shoves to push you off: call with a hand that beats their bluffs.',
  },
  'trips-fold-river-shove-tight-passive-check-raiser': {
    why: 'Fold: a tight, passive player rarely raises without a strong hand: with nothing they fold the turn, with a medium hand they call. A confident turn check-raise and an instant river shove is the nuts or close, and you beat only a wildly overplayed overpair. The price is 31%, and trip jacks with a ten kicker win far less often.',
    streets: [
      { street: 'preflop', text: 'A tight, passive player raises the small blind and you call J♠T♣ from the big blind with 50 big blinds.', range: 'Pairs, any ace, broadways, suited kings, suited connectors.' },
      { street: 'flop', text: 'You flop trips on J♥J♦9♥. They bet 3 into 5.75 and you call; a small c-bet on a paired board is most of their range.', range: 'Jacks, nines, pairs, heart and straight draws, high cards.' },
      { street: 'turn', text: 'The 6♣. They check, you bet 5, and they check-raise to 13.33 with confidence. A passive player doesn’t check-raise a medium hand.', range: 'A-J, K-J, Q-J, J-9, J-6, 9-9, 6-6, Q-T and T-8 drawing, heart draws now and then.' },
      { street: 'river', text: 'The 8♠ makes straights for Q-T and T-7, and they shove 31.17 instantly. Two strong actions in a row from a passive player.', range: 'Value: A-J, K-J, Q-J, J-9, J-8, J-6, 9-9, 8-8, 6-6, Q-T, T-7. Rarely: an overplayed overpair.' },
    ],
    takeaway: 'When a tight, passive player check-raises and then shoves, fold trips with a weak kicker.',
  },
  'ace-high-check-river-double-paired-board': {
    why: 'Check: a tight, aggressive player calls bets with real hands and doesn’t float the turn with nothing. After your turn bet they likely hold a queen, and the Q♥ just made that a full house. What would fold to a bet, counterfeited pairs and missed clubs, you already beat or split with, so a bluff only gets called by better.',
    streets: [
      { street: 'preflop', text: 'In a big live game you open A♣8♣, an excellent loose player 3-bets, a tight, aggressive button cold-calls, and you call. A tight cold-caller of a 3-bet has strong hands.', range: 'The button: Q-Q, J-J, T-T, A-K, A-Q, suited broadways like K-Q, K-J, Q-J.' },
      { street: 'flop', text: 'Q♣J♣J♦ checks round three ways. A tight button checks back medium hands and some traps.', range: 'Queens, some jacks, A-K and K-T drawing, T-T, club draws.' },
      { street: 'turn', text: 'The T♦ makes A-K a straight. You bet 13 into 30; the 3-bettor folds and the button calls. A jack or a straight would raise; a queen calls easily.', range: 'K-Q, A-Q, T-T, J-T, A-K, pairs, club draws.' },
      { street: 'river', text: 'The Q♥ double-pairs the board: every queen they hold is now a full house, T-T is counterfeited, and another ace splits.', range: 'Call: queens, jacks, A-K, T-T, J-T. Fold: counterfeited pairs, another ace, missed clubs.' },
    ],
    takeaway: 'Don’t bluff into a range that called with real hands: when the river improves them, check.',
  },
  'ace-high-fold-river-lead-paired-dry-board': {
    why: 'Fold: on a dry board, a river lead is a made hand taking the initiative. The big blind called your flop bet out of position with a player behind, which takes a real hand, and then checked the turn. Their value is trip fives, tens, pocket pairs and big cards that just got there. You need about 27%, and ace high wins far less often.',
    streets: [
      { street: 'preflop', text: 'In a small live game you raise a limper on the button with A♦Q♣; the big blind and the limper call.', range: 'The big blind: pairs, any ace, broadways, suited hands, connectors.' },
      { street: 'flop', text: 'On a dry, paired T♦5♥5♣ you bet 9 into 15.5; the big blind calls and the limper folds. Calling out of position with a player behind takes something real.', range: 'Tens, fives, pocket pairs, A-K, K-Q and K-J with backdoors.' },
      { street: 'turn', text: 'The 9♦ checks through: you check back ace high, and their tens and pairs stay in while their big cards see a free card.', range: 'Tens, fives, pocket pairs, nines, big cards with straight draws.' },
      { street: 'river', text: 'The J♣ makes straights for K-Q and Q-8, and they lead 20 into 33.5.', range: 'Value: trip fives, a ten or a pocket pair, A-K, K-J, K-Q, Q-8. Bluffs: some misses.' },
    ],
    takeaway: 'When a player who called out of position leads the river on a dry board, ace high is a fold.',
  },
  'top-pair-fold-river-shove-after-flop-raise': {
    why: 'Fold: a flop raise, a big turn bet and a river shove on a dry board are almost always value. A tough player knows you open loose and bet a lot, so they raise to get paid by your top pairs: sets, better queens, two pair and the 7-5 straight. Pure bluffs are few, and you need about 24%.',
    streets: [
      { street: 'preflop', text: 'In a small live game, as a loose, aggressive player, you open Q♥J♥ second to act and a tough player calls on the button.', range: 'Pairs, broadways, suited aces, suited connectors.' },
      { street: 'flop', text: 'You flop top pair on a dry Q♦6♣3♠. You bet 8 into 9.5 and they raise to 18; you call. With no draws to play hard, a raise is value.', range: 'Q-Q, 6-6, 3-3, A-Q, K-Q, Q-6, a few bluffs.' },
      { street: 'turn', text: 'The T♦. You check, they bet 30 into 45.5, and you call. A second big bet after a flop raise keeps the strong hands and adds T-T and Q-T.', range: 'Sets, A-Q, K-Q, Q-T, 6-4 and 7-5 drawing, a few bluffs.' },
      { street: 'river', text: 'The 4♥ makes 7-5 a straight, and they shove 48 into 105.5.', range: 'Value: Q-Q, 6-6, 3-3, T-T, 4-4, A-Q, K-Q, Q-T, 6-4, 7-5. Bluffs: a few.' },
    ],
    takeaway: 'Three strong actions on a dry board are almost always value: fold top pair.',
  },
  'top-pair-fold-small-turn-big-river-pattern': {
    why: 'Fold: a small turn lead then more than ⅔ pot on the river is a common live pattern: the small bet keeps you in and the big one is the value bet. Bluffers bet big early or give up. Their value is trip eights, full houses, 9-6 and 6-4, some A-K; you need about 29%, and top pair wins much less often.',
    streets: [
      { street: 'preflop', text: 'In a deep live game two players limp, you raise K♦Q♠ two off the button, and the big blind and a limper call.', range: 'The big blind: pairs, suited hands, broadways, connectors like 9-6, 6-5 and 6-4.' },
      { street: 'flop', text: 'You flop top pair on K♣8♦7♦. You bet 12 into 16.5; the big blind calls and the limper folds. Air folds; a king, a pair or a draw calls.', range: 'Kings, eights, sevens, diamond draws, 9-6, T-9, 6-5, 6-4, some sets.' },
      { street: 'turn', text: 'The 8♥ pairs the board and they lead small, 16 into 40.5. A small lead into the raiser wants to keep you in: trip eights, or a draw buying a cheap card.', range: 'Trip eights, full houses, kings, diamond and straight draws, sevens.' },
      { street: 'river', text: 'The 5♠ makes 9-6 and 6-4 straights, and they bet 50 into 72.5. Trips and the straights that got there want paying; a missed draw would check or bet small again.', range: 'Value: trip eights, full houses, 9-6, 6-4, some A-K. Bluffs: bricked draws, weaker kings.' },
    ],
    takeaway: 'A small turn lead followed by a big river bet is a value pattern: fold top pair.',
  },
  'top-pair-fold-river-bet-monotone-flop-low-stakes': {
    why: 'Fold: an average low-stakes player calls with draws, bets made hands, and rarely turns a miss into a river bet. Their heart draws needed the A♥, which you hold, so their misses are weak hands that check. After two calls and a bet when checked to, they hold flushes, straights, sets or two pair. You need about 26%.',
    streets: [
      { street: 'preflop', text: 'In a small live game you raise a limper with A♥J♠; the button and the limper call.', range: 'The button: pairs, broadways, suited hands, connectors like 9-7 and T-8.' },
      { street: 'flop', text: 'On a monotone J♥8♥3♥ you have top pair and the nut flush draw. You bet 12 into 16.5; the button calls and the limper folds.', range: 'Flushes, single hearts, jacks, eights, sets, two pair, straight draws like Q-T, T-9 and 9-7.' },
      { street: 'turn', text: 'The 4♣. You bet 30 into 40.5 and they call again: made hands and the best draws, though their single hearts are weaker with your A♥ out.', range: 'Flushes, sets, two pair, strong jacks, Q-T and 9-7, high single hearts.' },
      { street: 'river', text: 'The T♠ makes straights for 9-7 and Q-9. You check and they bet 55 into 100.5. An average player who called twice and bets when checked to has made something.', range: 'Value: heart flushes, 9-7, Q-9, J-J, T-T, 8-8, 3-3, J-T, J-8, T-8. A rare bluff.' },
    ],
    takeaway: 'Against an average low-stakes player, a river bet after two calls is a made hand: fold top pair.',
  },
  'top-pair-fold-pot-river-bet-flush-and-straight': {
    why: 'Fold: a half-pot lead on the flush card, then a pot-size bet on the river, is a strong line: leading twice into the preflop raiser means club flushes, J-9 and sets. The bluffs are missed Q-J and K-T, and there aren’t many. You need about 34%, and top pair is good much less often.',
    streets: [
      { street: 'preflop', text: 'In a deep live game you open A♦Q♠ three off the button; a player behind and both blinds call. The small blind’s call is wide.', range: 'The small blind: pairs, suited hands and connectors, broadways, suited aces.' },
      { street: 'flop', text: 'You flop top pair on A♠T♣8♣ and bet the pot; only the small blind calls. Four-way, that takes a real hand or a real draw.', range: 'Aces, tens, two pairs, sets, club draws, J-9, Q-J, K-J, 9-7.' },
      { street: 'turn', text: 'The 3♣ completes the clubs and they lead half the pot. Leading into the raiser on the card that completes their draws is strong, and your A♠ has no club.', range: 'Club flushes, sets, two pairs, some aces, straight draws with a club.' },
      { street: 'river', text: 'The 7♦ completes J-9, and they bet the pot. A second, bigger lead on the card that completes the other draw wants to be paid.', range: 'Value: club flushes, J-9, T-T, 8-8, 7-7, 3-3. Bluffs: missed Q-J and K-T.' },
    ],
    takeaway: 'When they lead the turn and bet the pot on the river, top pair is a fold.',
  },
};

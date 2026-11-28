import type { Lesson } from '../model';

export const L20: Record<string, Lesson> = {
  'ace-high-fold-river-shove-three-bet-pot': {
    why: 'Fold: your river bet was a bluff, and it got raised all in. A young pro who 3-bets a lot but plays straightforwardly after the flop makes their big moves with real hands. A raise all in over a bet is the strongest line on the river. They represent K-K, T-T, 6-6 and the heart flush, and overpairs and kings fit too. Ace high beats only a rare ace-high bluff. The price of 31% means nothing when you almost never win.',
    streets: [
      { street: 'preflop', text: 'In a big live game a player limps, the cutoff raises to 3.5, and you call A♥Q♠ on the button, 500 big blinds deep. A young, 3-bet-happy pro squeezes from the small blind to 20, and everyone calls. A squeeze from this player is wide before the flop: big pairs and big aces, plus suited hands and connectors as bluffs.', range: 'Big pairs, A-K and A-Q, suited broadways, suited aces and some suited connectors.' },
      { street: 'flop', text: 'The flop is K♥6♥6♣, paired with a heart draw. They bet 40 into about 81, and only you call. A squeezer c-bets this board with most of their range. You call with ace high, a backdoor heart draw and position.', range: 'Kings, overpairs, 6-6, heart draws, A-K and A-Q, and air betting.' },
      { street: 'turn', text: 'The 3♦ is a blank. They check, and you check behind. A straightforward player who checks the turn usually has a medium hand or a draw, or is setting a trap with a strong hand. Their check doesn’t take kings out of their range.', range: 'Kings checking to control the pot, overpairs, heart draws, A-K and A-Q, and some traps.' },
      { street: 'river', text: 'The T♥ completes the hearts. They check, you bet 80, about half the pot, as a bluff, and they raise all in to 340. A raise all in over a river bet from a player who doesn’t bluff much after the flop is the strongest line there is. What raises is the hands that beat almost everything.', range: 'Value: K-K, T-T, 6-6 and heart flushes; overpairs and kings. Bluffs: rare ace-high hands.' },
    ],
    takeaway: 'When a straightforward player raises all in over your river bluff, let it go.',
  },
  'set-overbet-river-range-full-of-kings': {
    why: 'Bet bigger than the pot: most players call down with a king on a king-high board, whatever you bet. They called a small flop bet and a big turn bet, so their range is full of kings, and those call any size. A seven or a small set calls a normal bet, and missed diamond draws fold to anything. Club flushes and K-K beat you, but a big bet gets paid by all the kings.',
    streets: [
      { street: 'preflop', text: 'In a big live game you open 9♥9♦ second to act to 3.5, 200 big blinds deep; both blinds call. The small blind calls out of position with a wide range: pairs, broadways, suited aces and connectors.', range: 'The small blind: pairs, any ace, broadways like K-Q, K-J and K-T, suited hands and connectors.' },
      { street: 'flop', text: 'The flop is K♦7♦3♣, with a diamond draw. It checks to you, you bet 5 into about 10.5, the small blind calls and the big blind folds. A small bet gets called by kings, sevens, diamond draws and pairs.', range: 'Kings, sevens, diamond draws, small pairs and some sets.' },
      { street: 'turn', text: 'The 9♣ gives you a set and adds a club draw. You bet 16.5 into about 20.5, and they call again. Calling a big bet twice on a king-high board means a lot of kings, and the diamond and club draws that wanted to see the river.', range: 'Kings, sets 7-7, 3-3 and K-K, diamond and club draws, and a few sevens.' },
      { street: 'river', text: 'The 2♣ completes the clubs, and they check. A king calls whatever you bet here: it’s top pair on a board where most of their range is worse. Club flushes and K-K beat you, but most of the kings don’t have a club.', range: 'Calls any size: a king. Beats you: club flushes and K-K. Calls a normal bet: a seven or a small set. Folds: missed diamond draws.' },
    ],
    takeaway: 'When their range is full of top pairs that call any size, overbet your set.',
  },
  'jacks-call-river-shove-face-up-overpair': {
    why: 'Call: you check-called twice, which looks like Q-Q, J-J or T-T, and a loose, aggressive pro looks for players who look marginal and pushes them off with big bets. Their shove for more than the pot is designed to make that hand fold. Their value is A-A, K-K, Q-Q, sets and straights, but big cards that missed, air and small pairs bet here too. You’re getting a price of about 34%, and jacks are ahead more often.',
    streets: [
      { street: 'preflop', text: 'A middle-position player opens to 2, a loose, aggressive online pro 3-bets the cutoff to 5, and you cold-call J♣J♦ from the small blind, 100 big blinds deep; the opener folds. A loose 3-bettor in the cutoff has big pairs and A-K, and a lot of light 3-bets: suited aces, suited broadways and connectors.', range: 'Big pairs, A-K and A-Q, and light 3-bets like suited aces, suited broadways and suited connectors.' },
      { street: 'flop', text: 'The flop is 8♠5♦3♣, low. You check and call 7 into about 13. A low board misses most of the 3-bettor’s range, so they c-bet with everything: overpairs, big cards, and their few small pairs.', range: 'Overpairs, A-K and A-Q, broadways, small pairs, and some sets.' },
      { street: 'turn', text: 'The 2♥ makes a wheel for A-4 and gives more straight draws. They bet 18 into about 27, and you call again. A second barrel from a loose player keeps overpairs, sets and their bluffs with overcards, which pick up wheel draws.', range: 'Overpairs, sets, A-4, A-K and A-Q with wheel draws, broadways, and small pairs.' },
      { street: 'river', text: 'The 9♦ makes straights for 7-6. They shove 70 into about 63, more than the pot. Your two check-calls look like a marginal overpair, and a shove this big is exactly what a pro uses to push that hand off.', range: 'Value: A-A, K-K and Q-Q; sets and straights. Bluffs: big cards that missed, air and small pairs.' },
    ],
    takeaway: 'When your line looks marginal, a loose pro shoves to push you off: call with a hand that beats their bluffs.',
  },
  'trips-fold-river-shove-tight-passive-check-raiser': {
    why: 'Fold: a tight, passive player rarely raises without a strong hand. With nothing they’d fold the turn; with a medium hand they’d call. A confident turn check-raise and an instant river shove is two strong actions in a row, the nuts or close. You beat only a vastly overplayed overpair. The price is 31%, and trip jacks with a ten kicker win far less often.',
    streets: [
      { street: 'preflop', text: 'A tight, passive player raises the small blind to 2.5, and you call J♠T♣ from the big blind with 50 big blinds. A tight player raises a fair range from the small blind, but their actions after the flop are what to watch.', range: 'Pairs, any ace, broadways, suited kings and suited connectors.' },
      { street: 'flop', text: 'You flop trips on J♥J♦9♥, with a heart draw. They bet 3 into about 5.75, and you call. A small c-bet on a paired board is most of their range.', range: 'Jacks, nines, pairs, heart draws, straight draws, and high cards betting small.' },
      { street: 'turn', text: 'The 6♣ is a blank. They check, you bet 5, and they check-raise to 13.33 with confidence. A passive player doesn’t check-raise a draw or a medium hand: their raise is a better jack, a full house, or a strong draw.', range: 'A-J, K-J and Q-J; J-9, J-6, 9-9 and 6-6; Q-T and T-8 with straight draws; heart draws now and then.' },
      { street: 'river', text: 'The 8♠ makes straights for Q-T and T-7. They shove 31.17 instantly, about 80% of the pot. Two strong actions in a row from a passive player is the nuts or close.', range: 'Value: A-J, K-J and Q-J; J-9, J-8, J-6, 9-9, 8-8 and 6-6; Q-T and T-7. Bluffs: rarely, an overpair overplayed.' },
    ],
    takeaway: 'When a tight, passive player check-raises and then shoves, fold trips with a weak kicker.',
  },
  'ace-high-check-river-double-paired-board': {
    why: 'Check: a tight, aggressive player calls a bet with real hands, and doesn’t float the turn with nothing. After your turn bet they likely don’t have a jack or a straight, but they could easily have a queen, and the Q♥ just made that a full house. What folds to a bet, counterfeited pairs and missed club draws, you already beat or split with. A bluff only gets called by better.',
    streets: [
      { street: 'preflop', text: 'In a big live game you open A♣8♣ to 3, an excellent loose, aggressive player 3-bets to 9.5 from the hijack, a tight, aggressive button calls and so do you. A tight button that cold-calls a 3-bet has strong hands: pairs, A-K, A-Q and suited broadways.', range: 'The button: pairs like Q-Q, J-J and T-T, A-K and A-Q, and suited broadways like K-Q, K-J and Q-J.' },
      { street: 'flop', text: 'The flop is Q♣J♣J♦, paired with a club draw, and it checks round three ways. A tight button checks behind with medium hands that want a cheap showdown, and with some strong hands to trap.', range: 'Queens, some jacks, A-K and K-T with straight draws, pairs like T-T, and club draws.' },
      { street: 'turn', text: 'The T♦ makes A-K a straight. You bet 13 into about 30, the 3-bettor folds, and the button calls. They likely don’t have a jack or a straight, which would raise, but a queen calls easily.', range: 'Queens like K-Q and A-Q, T-T, J-T and A-K, pairs, and club draws.' },
      { street: 'river', text: 'The Q♥ double-pairs the board. Every queen in their range is now a full house. Pairs like T-T are counterfeited, another ace splits, and the missed club draws fold.', range: 'Calls: a queen or a jack (a full house), A-K, T-T and J-T. Folds: pairs that are now counterfeited, another ace, and a missed club draw.' },
    ],
    takeaway: 'Don’t bluff into a range that called with real hands: when the river improves them, check.',
  },
  'ace-high-fold-river-lead-paired-dry-board': {
    why: 'Fold: on a dry board, a river lead is a made hand taking the initiative. The big blind called your flop bet out of position with a player still behind, which takes a real hand, and then the turn checked through. Their value is trip fives, a ten or a pocket pair, and big cards that just got there. A 60%-pot bet sets the price at about 27%, and ace high wins far less often.',
    streets: [
      { street: 'preflop', text: 'In a small live game you raise a limper on the button to 5 with A♦Q♣; the big blind and the limper call. The big blind defends wide with a good price.', range: 'The big blind: pairs, any ace, broadways, suited hands and connectors.' },
      { street: 'flop', text: 'The flop is T♦5♥5♣, dry and paired. You bet 9 into about 15.5, the big blind calls and the limper folds. The big blind calling out of position with a player still behind takes a real hand: a ten, a five, a pocket pair, or big cards with backdoors.', range: 'Tens, fives, pocket pairs, and big cards like A-K, K-Q and K-J with backdoor draws.' },
      { street: 'turn', text: 'The 9♦ adds straight draws. They check, and you check behind with ace high. Their check keeps their tens and pairs in, and gives their big cards a free look at the river.', range: 'Tens, fives, pocket pairs, nines, and big cards with straight draws.' },
      { street: 'river', text: 'The J♣ makes straights for K-Q and Q-8. They lead 20 into about 33.5, 60% of the pot. On a dry board, the river lead is a made hand taking the initiative.', range: 'Value: trip fives, a ten or a pocket pair, and A-K, K-J, K-Q and Q-8. Bluffs: some hands that missed.' },
    ],
    takeaway: 'When a player who called out of position leads the river on a dry board, ace high is a fold.',
  },
  'top-pair-fold-river-shove-after-flop-raise': {
    why: 'Fold: a flop raise, a big turn bet and a river shove on a dry board are almost always value. A tough player knows you open loose and bet a lot, so they raise to get value from your top pairs. Their value is sets, better queens, two pair and the 7-5 straight; pure bluffs are few. A shove for under half the pot sets the price at about 24%, and top pair with a jack kicker wins much less often.',
    streets: [
      { street: 'preflop', text: 'In a small live game, as a loose, aggressive player, you open Q♥J♥ second to act to 4; a tough player calls on the button. A tough player calls a wide range in position against a loose opener.', range: 'Pairs, broadways, suited aces, and suited connectors.' },
      { street: 'flop', text: 'You flop top pair on Q♦6♣3♠, a dry board. You bet 8 into about 9.5, and they raise to 18; you call. On a board with no draws to play hard, a raise is value: sets, better queens and two pair.', range: 'Sets Q-Q, 6-6 and 3-3; A-Q, K-Q and Q-6; and a few bluffs.' },
      { street: 'turn', text: 'The T♦ adds a diamond draw. You check, they bet 30 into about 45.5, and you call. A second big bet after a flop raise keeps the same strong hands and adds T-T and Q-T.', range: 'Sets Q-Q, 6-6, 3-3 and T-T; A-Q, K-Q and Q-T; 6-4 and 7-5 with draws; a few bluffs.' },
      { street: 'river', text: 'The 4♥ makes 7-5 a straight. They shove 48 into about 105.5. Three strong actions on a dry board are almost always value.', range: 'Value: sets Q-Q, 6-6, 3-3, T-T and 4-4; A-Q, K-Q and Q-T; 6-4 and 7-5. Bluffs: a few pure bluffs.' },
    ],
    takeaway: 'Three strong actions on a dry board are almost always value: fold top pair.',
  },
  'top-pair-fold-small-turn-big-river-pattern': {
    why: 'Fold: a small turn lead, then more than ⅔ of the pot on the river, is a common live pattern: the small bet keeps you in, and the big one is the value bet. A player with a bluff rarely builds it that way; they bet big early or give up. Their value is trip eights, full houses, the 9-6 and 6-4 straights and some A-K; their bluffs are bricked draws and weaker kings. The price is about 29%, and top pair with a queen kicker wins much less often.',
    streets: [
      { street: 'preflop', text: 'In a small live game with deep stacks, two players limp; you raise K♦Q♠ two off the button to 5, and the big blind and a limper call. The big blind gets a good price and defends wide: suited hands, connectors, pairs and broadways.', range: 'The big blind: pairs, suited hands, broadways, and connectors like 9-6, 6-5 and 6-4.' },
      { street: 'flop', text: 'You flop top pair on K♣8♦7♦, with a diamond draw. You bet 12 into about 16.5, the big blind calls and the limper folds. Calling out of position on this board means a king, an eight, a seven, a diamond draw or a straight draw like 9-6, T-9 and 6-5. Pure air folds.', range: 'Kings, eights, sevens, diamond draws, straight draws like 9-6, T-9, 6-5 and 6-4, and some sets.' },
      { street: 'turn', text: 'The 8♥ pairs the board. The big blind leads small, 16 into about 40.5, and you call. A small lead into the raiser often means a hand that wants to keep you in: trip eights, or a draw buying a cheap card. A big king would usually check to let you bet.', range: 'Trip eights and full houses, kings, diamond draws, straight draws like 9-6, 6-5 and 6-4, and sevens.' },
      { street: 'river', text: 'The 5♠ makes straights for 9-6 and 6-4, and misses the diamonds. Now they bet 50 into about 72.5, more than ⅔ of the pot. The small bet kept you in; the big one is the value bet. Trips and the straights that just got there want to be paid, and a draw that missed would usually check or bet small again.', range: 'Value: trip eights and full houses; 9-6 and 6-4; some A-K. Bluffs: bricked draws and weaker kings.' },
    ],
    takeaway: 'A small turn lead followed by a big river bet is a value pattern: fold top pair.',
  },
  'top-pair-fold-river-bet-monotone-flop-low-stakes': {
    why: 'Fold: an average low-stakes player calls with draws and bets made hands, and rarely turns a missed hand into a river bet. The draws that called on this board needed hearts, and you hold the A♥, so their missed flushes are weak hands that check, not bluffs. They called two big bets, then bet half the pot when you checked. Their value is flushes, straights, sets and two pair. The price is about 26%, and top pair almost never wins.',
    streets: [
      { street: 'preflop', text: 'In a small live game you raise a limper to 5 with A♥J♠; the button and the limper call. An average player calls on the button with a wide range of suited hands, connectors, pairs and broadways, hoping to flop big.', range: 'The button: pairs, broadways, suited hands and connectors like 9-7 and T-8.' },
      { street: 'flop', text: 'The flop is J♥8♥3♥, monotone, and you have top pair with the nut flush draw. You bet 12 into about 16.5, the button calls and the limper folds. On a three-heart board an average player calls with flushes, any heart, jacks, eights, sets and straight draws.', range: 'Flushes, single hearts, jacks, eights, sets, two pairs and straight draws like Q-T, T-9 and 9-7.' },
      { street: 'turn', text: 'The 4♣ is a blank. You bet 30 into about 40.5, and they call again. A second big call narrows them to made hands and the strongest draws. With the A♥ in your hand, their single hearts are weaker draws than they look.', range: 'Flushes, sets, two pair, strong jacks, straight draws like Q-T and 9-7, and single high hearts.' },
      { street: 'river', text: 'The T♠ makes straights for 9-7 and Q-9. You check, and they bet 55 into about 100.5, half the pot. An average player who called twice and then bets when checked to has made something: they rarely bluff here, and their missed heart draws have showdown value or nothing to do.', range: 'Value: heart flushes; 9-7 and Q-9; J-J, T-T, 8-8 and 3-3; J-T, J-8 and T-8. Bluffs: a rare bluff.' },
    ],
    takeaway: 'Against an average low-stakes player, a river bet after two calls is a made hand: fold top pair.',
  },
  'top-pair-fold-pot-river-bet-flush-and-straight': {
    why: 'Fold: a half-pot lead on the flush card, then a pot-size bet on the river, is a strong line. Leading twice into the preflop raiser means they aren’t worried about your range: club flushes, the J-9 straight and sets. The bluffs are Q-J and K-T that missed, and there aren’t many. A pot-size bet sets the price at about 34%, and top pair with a queen kicker is good much less often.',
    streets: [
      { street: 'preflop', text: 'In a small live game with deep stacks, you open A♦Q♠ three off the button to 4; a player behind and both blinds call. Four players see the flop. The small blind’s call, out of position with the big blind still to act, is wide: suited hands, connectors, pairs and broadways.', range: 'The small blind: pairs, suited hands like suited clubs and suited connectors, broadways, and suited aces.' },
      { street: 'flop', text: 'You flop top pair on A♠T♣8♣, with a club draw and straight draws. You bet 16, the pot, and only the small blind calls. A call of a pot-size bet four-way means a real hand or a real draw: an ace, a ten, two pair, a set, a club draw or a straight draw like J-9 and Q-J.', range: 'Aces, tens, two pairs, sets, club draws, and straight draws like J-9, Q-J, K-J and 9-7.' },
      { street: 'turn', text: 'The 3♣ completes the clubs. They lead 24 into about 48, half the pot. Leading into the raiser on the card that completes their draws is strong: a flush, or a set or two pair worried about the clubs. Your A♠ has no club.', range: 'Club flushes, sets and two pairs, some aces, and straight draws with a club.' },
      { street: 'river', text: 'The 7♦ completes J-9’s straight. They bet 100 into about 96, the pot. A second lead, bigger than the first, on the card that completes the other draw, says they have a strong hand and want to get paid. The missed Q-J and K-T are the only bluffs.', range: 'Value: club flushes, J-9, and sets T-T, 8-8, 7-7 and 3-3. Bluffs: Q-J and K-T that missed.' },
    ],
    takeaway: 'When they lead the turn and bet the pot on the river, top pair is a fold.',
  },
};

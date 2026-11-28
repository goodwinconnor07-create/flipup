import type { Lesson } from '../model';

export const L18: Record<string, Lesson> = {
  'queens-fold-river-shove-over-block-bet': {
    why: 'Fold: an all-in raise over a small river bet is the nuts far more often than a bluff. The double-paired board gives 9-8, 8-7, 7-6 and the pairs full houses or quads, and J-T and 6-5 are straights. Online regulars raise all in with the top of their range in big pots, not with air; a few missed club draws are the only bluffs. You need about 35%.',
    streets: [
      { street: 'preflop', text: 'An online regular opens the button and you 3-bet Q♠Q♣ from the small blind; they call, mostly 4-betting A-A, K-K and A-K.', range: 'Pairs J-J and below, suited broadways, suited aces, suited connectors like 8-7, 7-6 and 6-5.' },
      { street: 'flop', text: 'On 9♦8♣7♣ you check and call 10 into 21. This board smashes a button’s calling range; checking keeps the pot under control.', range: 'J-T, 6-5, two pairs like 9-8 and 8-7, sets, club draws, pairs with draws, some air.' },
      { street: 'turn', text: 'The 7♥ pairs the board and checks through. Most strong hands would bet to build the pot, so the check leans to medium hands, though some full houses trap.', range: 'Medium pairs, draws taking a free card, some straights, sets and full houses, 7-6.' },
      { street: 'river', text: 'The 8♠ double-pairs the board. You bet small, 9.35 into 41, for value from worse pairs, and they raise all in to 80. They want every chip, and this board gave many hands a full house.', range: 'Value: 9-8, 8-7, 7-6, 9-9, 8-8, 7-7, J-T, 6-5. Bluffs: some missed club draws.' },
    ],
    takeaway: 'An all-in raise over a small river bet is the nuts far more often than a bluff: fold a one-pair hand.',
  },
  'king-high-shove-river-capped-tight-big-blind': {
    why: 'Shove: a tight, disciplined player avoids risking their tournament with a medium hand, and their long think before calling the turn says medium. A-T and K-T call a shove, but weaker tens, second pair and underpairs fold to one, and the busted draws fold to anything. King high can’t win at showdown, so push them out.',
    streets: [
      { street: 'preflop', text: 'You open K♦J♦ from middle position with 90 big blinds and a tight player defends the big blind with 40. Their 3-betting hands, big pairs, A-K and A-Q, are out.', range: 'Medium and small pairs, broadways below A-Q, suited aces, suited connectors.' },
      { street: 'flop', text: 'On T♥9♠3♠ you bet 2.25 into 6 with two overcards and an open-ender, and they call quickly.', range: 'Tens, nines, pairs like 8-8 and 7-7, spade draws, Q-J, J-8, 8-7, some sets.' },
      { street: 'turn', text: 'The 4♣ misses you. You bet 6.25 into 10.5 and they call after a long think. A strong ten or a set calls easily or raises; a weaker ten or a nine is what tanks and calls.', range: 'Mostly weaker tens, nines and underpairs; spade and straight draws; a few A-T and K-T.' },
      { street: 'river', text: 'The 4♦ misses every draw and they check. With about 29 big blinds left, calling it off puts their tournament on the line.', range: 'Call a shove: A-T, K-T. Fold to a shove: weaker tens. Small only: second pair, underpairs. Fold: missed draws.' },
    ],
    takeaway: 'Against a tight player who tanked and called with a medium hand, a river shove puts their tournament on the line: bluff big.',
  },
  'ace-high-check-river-instant-turn-call': {
    why: 'Check: pressure only works on players who care about their tournament life, and a loose recreational player calls with any made hand. Their instant turn call says a pair or better that was never folding, while everything you beat already folds or loses. A bluff gets called by better.',
    streets: [
      { street: 'preflop', text: 'You open A♣5♣ from middle position and a loose recreational player defends the big blind very wide.', range: 'Any ace, broadways, suited hands, connectors, all pairs.' },
      { street: 'flop', text: 'On 6♣3♣2♠ you have the nut flush draw and a wheel gutshot. You bet 3 into 6 and they call.', range: 'Sixes, threes, deuces, middle pairs, 5-4, club and straight draws, overcards.' },
      { street: 'turn', text: 'The T♥ misses you. You bet 5.75 into 12 and they call instantly. A draw or overcards takes a moment; a made hand just calls.', range: 'Pairs or better: sixes, threes, deuces, tens, middle pairs, 5-4. A few draws.' },
      { street: 'river', text: 'The T♠ misses again and they check. Your ace high beats only their overcards and missed draws.', range: 'Call: any pair, 5-4. Fold: overcards and missed draws, which you beat already.' },
    ],
    takeaway: 'Don’t bluff a player who doesn’t care about busting: when they call instantly, check ace high and take the showdown.',
  },
  'ace-king-fold-river-three-bet-pot-counterfeit-board': {
    why: 'Fold: the Q♣ double-paired the board, so your hand plays as ace high, the same as their missed hands. Their turn check says no ten, so a half-pot river bet is A-A, K-K, J-J or quads; you beat only 9-9, now counterfeited, and a few unlikely bluffs. You need 25% and win far less often.',
    streets: [
      { street: 'preflop', text: 'You open A♣K♦ first in, 80 big blinds deep, and the loud, aggressive player on your left 3-bets; you call. A 3-bet from the next seat over an early open is strong even from them.', range: 'A-A down to 9-9, A-K, A-Q, a few suited broadways and suited aces.' },
      { street: 'flop', text: 'On Q♦T♣T♠ you check and call 5.5 into 13.5 with two overcards and a gutshot. A small c-bet here is most of their range.', range: 'Overpairs, Q-Q, T-T, A-Q, K-Q, A-K, J-J, 9-9, some air.' },
      { street: 'turn', text: 'The 8♠ checks through. A ten would bet on a board this drawy, so the check is overpairs keeping it small, worried pairs and air.', range: 'A-A, K-K, J-J, 9-9, slow quads, A-Q, K-Q, air that gave up.' },
      { street: 'river', text: 'The Q♣ double-pairs the board. You check and they bet 12.5 into 24.5. Your ace high now ties their misses, and J-J, K-K and A-A all beat you.', range: 'Value: A-A, K-K, J-J, Q-Q, T-T. Behind you: 9-9 and a few unlikely bluffs.' },
    ],
    takeaway: 'When the board pairs twice, ace-king is just ace high: fold to a bet from a range full of pairs.',
  },
  'top-pair-fold-river-overbet-paired-board': {
    why: 'Fold: a 60% turn bet then an overbet of over 1½ times the pot is polarised. Their value is trip eights, A-8, 5-5 and 4-4 full houses and the 7-6 straight; their bluffs are missed diamond draws, and your A♦6♦ removes some of those. The price is 38%, and top pair with a six kicker loses most of the time.',
    streets: [
      { street: 'preflop', text: 'Deep in a major event you open A♦6♦ from early position with 100 big blinds; the button and the big blind call.', range: 'The big blind: very wide, pairs, suited hands, broadways, connectors.' },
      { street: 'flop', text: 'A♠8♠8♦ checks round. Checking top pair with a weak kicker keeps a three-way pot small and lets eights and draws bluff later.', range: 'Aces, slow eights, pairs, spade and straight draws, air.' },
      { street: 'turn', text: 'The 5♦ and the big blind leads 5.33 into 9; you call and the button folds. A lead after checking the flop is often a hand that improved or a draw.', range: 'Trip eights, A-8, 5-5, A-5, aces, diamond draws, 7-6 and 6-4.' },
      { street: 'river', text: 'The 4♣ makes 7-6 a straight and 4-4 a full house, and they bet 32.29 into 19.5. A lone ace would check or bet small; this size is trips or better, or a missed draw.', range: 'Value: trip eights, A-8, 5-5, 4-4, 7-6. Bluffs: missed diamond draws.' },
    ],
    takeaway: 'Against a polarised overbet, top pair with a weak kicker beats only the bluffs: fold when there aren’t enough of them.',
  },
  'third-pair-call-short-stack-river-bet-three-bet-pot': {
    why: 'Call: an unpredictable pro checked the flop, bet the turn and bet small on the river, a line only a runner-runner flush fits all the way. Missed high cards like A-K, A-Q and K-Q still bet here, and your fives beat all of them. A 40%-pot bet prices you at about 22%, and you’re ahead more often.',
    streets: [
      { street: 'preflop', text: 'You open 5♠3♠ on the button, 178 big blinds deep, a short-stacked big blind with 47 3-bets, and you call. A short stack 3-bets the button wide.', range: 'Pairs, A-K to A-T, broadways like K-Q, K-J and Q-J, suited aces like A-5 and A-3.' },
      { street: 'flop', text: 'You flop middle pair on 8♦5♣2♣ and it checks through. A 3-bettor who checks a low board usually has high cards that missed or a pair keeping it small.', range: 'A-K, A-Q, K-Q, some overpairs, 8-x, 5-x, club draws, A-3 and A-4.' },
      { street: 'turn', text: 'The 9♦ and they bet 11.25 into 18.5; you call. An unpredictable player bets high cards here as well as overpairs, sets and draws.', range: 'Overpairs, 9-9, 8-8, 9-8, 7-6, diamond draws, A-K, A-Q, K-Q.' },
      { street: 'river', text: 'The 4♦ completes a backdoor flush and A-3’s wheel. They bet 16.5 into 41, leaving a few big blinds. A small bet doesn’t fit a strong hand’s story.', range: 'Ahead: overpairs, 9-9, 8-8, 9-8, 7-6, A-3, a diamond flush, A-5. Behind: A-K, A-Q, K-Q and other high cards.' },
    ],
    takeaway: 'When their line doesn’t add up, the bluffs are many: call a small bet with a pair that beats every missed high card.',
  },
  'queens-check-river-paired-board-three-bet-pot': {
    why: 'Check: two calls on a paired board make their range stronger. Middle pairs and ace high rarely pay three streets and jacks call only small, while trip tens and 7-7 and 6-6 full houses call anything and beat you. A strong player doesn’t pay a third bet with worse, so check.',
    streets: [
      { street: 'preflop', text: 'Late in a major event a strong player opens the hijack with 66 big blinds, you 3-bet Q♥Q♣ on the button, and they call.', range: 'Pairs J-J and below, A-Q, A-J, suited broadways like K-Q, K-J and Q-J, suited aces.' },
      { street: 'flop', text: 'On T♥T♣7♦ they check, you bet 6.125 into 14, and they call. Queens are ahead of most of their range.', range: 'Tens, sevens, J-J, 9-9, 8-8, straight draws like 9-8 and 8-6, some ace high.' },
      { street: 'turn', text: 'The 6♣. They check, you bet 11 into 26, and they call again. A strong player doesn’t call twice with ace high, so what’s left is tens, full houses and better pairs.', range: 'Trip tens, 7-7, 6-6, jacks, 9-8, a few middle pairs.' },
      { street: 'river', text: 'The 4♥ changes little and they check again.', range: 'Call any bet: trip tens, 7-7, 6-6. Small only: jacks. Fold: middle pairs, ace high.' },
    ],
    takeaway: 'After two calls on a paired board, their range is stronger than it looks: check a one-pair hand on the river.',
  },
  'quads-call-river-all-in-raise-flush-board': {
    why: 'Call: with the nut flush they’d call, not raise; on a paired board the raise is a full house or better. You lose only to Q♠T♠, and kings or jacks full would usually have 3-bet before the flop. You beat nines full, most of what raises here. The price is about 25%, and quads win far more often.',
    streets: [
      { street: 'preflop', text: 'You open 7♠7♣ in a deep tournament; two players and the big blind call. The cold-callers would 3-bet their biggest hands.', range: 'The solid middle player: pairs, suited broadways like Q♠T♠ and K-J, some A-K and A-Q, suited connectors.' },
      { street: 'flop', text: 'You flop a set on K♠9♠7♥. You bet 6.25 into 10.5 and only the solid player calls.', range: 'Kings, nines, two pairs, spade draws, straight draws like Q-J and J-T, sets.' },
      { street: 'turn', text: 'The 7♦ gives you quads. You bet 13.75 into 23 and they call again without raising.', range: 'Kings, nines, K-9, 9-9, K-K, spade and straight draws.' },
      { street: 'river', text: 'The J♠ completes the flush and a straight flush for Q♠T♠. You bet 50 and they raise all in to 125. A flush can’t beat a full house on a paired board, so it would just call.', range: 'Value: 9-9 (nines full), Q♠T♠, and kings or jacks full, which would usually have 3-bet.' },
    ],
    takeaway: 'When a solid player raises all in on a paired board, count what beats you: with quads, only a straight flush.',
  },
  'top-pair-call-river-barrel-missed-draws': {
    why: 'Call: with every draw missing, the river bet is strong aces and sets or missed draws, and your ace with a queen kicker beats every missed diamond, heart and straight draw. A-K, A-J, A-7, A-5, A-2, J-J and 7-7 beat you, but a board this wet left many draws in their range. You need about 24%, and you’re ahead about half the time.',
    streets: [
      { street: 'preflop', text: 'Ten left in a big tournament, the cutoff opens and you call A♣Q♥ on the button with 65 big blinds.', range: 'Wide: pairs, any ace, broadways, suited kings, suited connectors.' },
      { street: 'flop', text: 'You flop top pair on A♥J♦7♦. They bet 3.1 into 7, most of their range, and you call; a raise would only fold the draws and air you beat.', range: 'Aces, jacks, sevens, diamond draws, straight draws like K-Q, Q-T and T-9, air.' },
      { street: 'turn', text: 'The 5♥ and they bet 7.4 into 13. A bigger second bet drops most air and keeps strong aces, sets and the draws.', range: 'A-K, A-J, A-7, A-5, J-J, 7-7, diamond, heart and straight draws.' },
      { street: 'river', text: 'The 2♣ misses everything and they bet 12.5 into 28. Their draws can only win by betting.', range: 'Value: A-K, A-J, A-7, A-5, A-2, J-J, 7-7. Bluffs: missed diamond, heart and straight draws.' },
    ],
    takeaway: 'When every draw misses, the river bet is polarised: call with top pair that beats all the bluffs.',
  },
  'top-pair-top-kicker-call-turn-check-raise-shove': {
    why: 'Call: a very aggressive pro who was just bluffed is more likely to fight back, and with a short stack a semi-bluff shove has lots of fold equity and outs. Their value is J-J, 7-7 and 3-3, but spade draws with overcards, and sometimes a worse jack, are far more common. You need about 40%, and top pair, top kicker is ahead often enough.',
    streets: [
      { street: 'preflop', text: 'A very aggressive pro opens under the gun with 26 big blinds and you call A♦J♠ in the hijack. You’d just bluffed them in a big pot.', range: 'Pairs, A-K to A-T, suited broadways, some suited connectors.' },
      { street: 'flop', text: 'J♥7♠2♣ checks through. You check top pair, top kicker on a dry board to keep their weaker hands in; an aggressive player bets most good hands here.', range: 'Missed high cards, medium pairs, some slow jacks or sets.' },
      { street: 'turn', text: 'The 3♠ adds a spade draw. They check, you bet 2.19 into 7, and they check-raise all in to 24. A set could have bet the flop; checking twice then shoving fits a draw that just arrived.', range: 'Value: J-J, 7-7, 3-3. Semi-bluffs: spade draws with overcards. Sometimes a worse jack.' },
    ],
    takeaway: 'Against an angry, aggressive pro with a short stack, top pair, top kicker calls a turn shove: their draws outnumber their sets.',
  },
};

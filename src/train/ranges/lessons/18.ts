import type { Lesson } from '../model';

export const L18: Record<string, Lesson> = {
  'queens-fold-river-shove-over-block-bet': {
    why: 'Fold: a raise all in over a small bet on this board is full houses, quads and straights. Most regulars don’t bluff enough here, and a shove that looks this wild is very often exactly the nuts. Your queens beat only the missed club draws. You need about 35%, so unless they’re hyper-aggressive, fold.',
    read: [
      { about: 'preflop', text: 'You 3-bet Q♠Q♣ from the small blind against a regular on the button, and they called.' },
      { about: 'position', text: 'You’re out of position. The turn checked through, and you led small on the river.' },
      { about: 'board', text: '9♦8♣7♣ is very connected with a club draw. The 7♥ and 8♠ double-pair the board, so 9-8, 8-7, 7-6 and pairs make full houses.' },
      { about: 'sizing', text: 'A shove of about twice the pot over your small bet. An all-in raise over a small bet is the nuts far more often than a bluff.' },
      { about: 'opponent', text: 'Online regulars tend to be too tight in big pots. They raise all in with the top of their range, not with air.' },
      { about: 'range', text: 'For value: 9-8, 8-7, 7-6, 9-9, 8-8 and 7-7; J-T and 6-5 straights. Bluffs: some missed club draws.' },
    ],
    takeaway: 'A shove over your small river bet on a board full of strong hands is usually the nuts.',
  },
  'king-high-shove-river-capped-tight-big-blind': {
    why: 'Shove: a tight player with a capped range can’t call off their tournament with second pair or a weak ten, and the busted draws fold to anything. King high wins very little at a showdown. Moving all in puts their tournament on the line and folds all of those; only the strongest tens call.',
    read: [
      { about: 'preflop', text: 'You opened K♦J♦ from middle position with 90 big blinds; a tight, disciplined player defended the big blind with 40.' },
      { about: 'opponent', text: 'A tight, disciplined player avoids risking their tournament with a medium hand. That makes big bets work against them.' },
      { about: 'board', text: 'T♥9♠3♠ has spade and straight draws. The 4♣ and 4♦ miss them and pair the board.' },
      { about: 'sizing', text: 'They called the flop quickly and the turn after a long think. A long think usually means a medium hand, not a strong one.' },
      { about: 'range', text: 'A-T and K-T call a shove. Weaker tens call a normal bet but fold to a shove. Second pair and underpairs call only small. Busted spade and straight draws fold.' },
    ],
    takeaway: 'Put a tight player’s tournament on the line when their range is capped and your hand can’t win at a showdown.',
  },
  'ace-high-check-river-instant-turn-call': {
    why: 'Check: the instant turn call says they have a pair or better and won’t fold it, so a bluff mostly gets called by better. The hands that would fold, overcards and missed draws, are exactly the ones your ace high already beats. Take the showdown.',
    read: [
      { about: 'preflop', text: 'You opened A♣5♣ from middle position and a loose recreational player defended the big blind.' },
      { about: 'opponent', text: 'Pressure only works on players who care about their tournament life. A loose recreational player calls with any made hand.' },
      { about: 'board', text: '6♣3♣2♠ gave you the nut flush draw and a gutshot. The T♥ and T♠ miss both.' },
      { about: 'sizing', text: 'They called the turn instantly. An instant call usually means a made hand that was never folding.' },
      { about: 'range', text: 'A pair or better (sixes, threes, deuces, tens, middle pairs) and 5-4 call. Overcards and missed draws fold, and you beat them already.' },
    ],
    takeaway: 'Don’t bluff a player who has shown they won’t fold, especially when your hand beats their bluffs.',
  },
  'ace-king-fold-river-three-bet-pot-counterfeit-board': {
    why: 'Fold: with two pairs on the board you’re playing ace-king high, and almost everything in their range beats that. Every overpair and J-J has a better two pair, and Q-Q or T-T has quads. You only beat 9-9 and the odd bluff. Even at 3 to 1 you can’t win often enough.',
    read: [
      { about: 'preflop', text: 'You opened A♣K♦ first in and the player on your left 3-bet; you called. Their range is big pairs and strong broadways.' },
      { about: 'opponent', text: 'A loud, aggressive player 3-bets wide, but by the river their checks and bets have narrowed their range a lot.' },
      { about: 'board', text: 'Q♦T♣T♠ is paired. The 8♠ adds a spade draw, and the Q♣ double-pairs the board, so your hand plays as ace-king high.' },
      { about: 'sizing', text: 'They checked back the turn, which says they don’t have a ten, then bet half the pot on the river. That’s overpairs and queens.' },
      { about: 'range', text: 'For value: A-A, K-K and J-J; Q-Q and T-T quads. Behind you: 9-9 and a few unlikely bluffs.' },
    ],
    takeaway: 'When the board double-pairs, your hand is your high card: fold to a bet from a range of overpairs.',
  },
  'top-pair-fold-river-overbet-paired-board': {
    why: 'Fold: they may well be bluffing with missed diamonds, but they’d play a monster exactly the same way, and a big blind has too many eights in their range. Against an overbet you need about 38%, and the odds don’t justify a call.',
    read: [
      { about: 'preflop', text: 'Deep in a major event you opened A♦6♦ from early position with 100 big blinds; the button and the big blind called.' },
      { about: 'players', text: 'Three saw a flop that checked round. The button folded the turn, leaving the big blind.' },
      { about: 'board', text: 'A♠8♠8♦ is paired. The 5♦ adds a diamond draw, and the 4♣ makes 7-6 a straight.' },
      { about: 'sizing', text: 'A turn bet of about 60% of the pot, then an overbet of over 1½ times the pot. That’s polarised: very strong or a bluff.' },
      { about: 'range', text: 'For value: trip eights; A-8, 5-5 and 4-4 full houses; 7-6. For bluffs: missed diamond draws.' },
    ],
    takeaway: 'When they’d play a monster exactly the same way and their range has many, fold to an overbet.',
  },
  'third-pair-call-short-stack-river-bet-three-bet-pot': {
    why: 'Call: their range is polarised and holds more weak hands than strong ones. A-K, A-Q and other high cards that missed bet here as often as the few overpairs, sets and runner-runner flushes. You need about 22%, and you’re ahead more often than not.',
    read: [
      { about: 'preflop', text: 'You opened 5♠3♠ on the button, 178 big blinds deep; a short-stacked big blind 3-bet and you called.' },
      { about: 'opponent', text: 'A famous, unpredictable pro whose lines don’t always add up. That makes bluffs more likely.' },
      { about: 'board', text: '8♦5♣2♣ gave you middle pair. The 9♦ adds a diamond draw, and the 4♦ completes a runner-runner flush.' },
      { about: 'sizing', text: 'They checked the flop, bet over half the pot on the turn, then 40% on the river. Only a runner-runner flush connects every step; high cards still bet here.' },
      { about: 'range', text: 'Ahead of you: overpairs that checked the flop; 9-9, 8-8, 9-8, 7-6 and A-3; a diamond flush; A-5. Behind you: A-K, A-Q, K-Q and other high cards.' },
    ],
    takeaway: 'When a line only makes sense for a few hands, a weak pair can call a small bet.',
  },
  'queens-check-river-paired-board-three-bet-pot': {
    why: 'Check: after two calls on this board their range is trips, full houses, jacks, middle pairs and ace high. A bet gets called by the trips and full houses, and folds the hands you beat, apart from the odd J-J. Check behind and see if your hand is good.',
    read: [
      { about: 'preflop', text: 'Late in a major event a strong player opened the hijack; you 3-bet Q♥Q♣ on the button and they called.' },
      { about: 'position', text: 'You’re in position. They checked and called twice, then checked the river to you.' },
      { about: 'board', text: 'T♥T♣7♦ is paired. The 6♣ adds a club draw and straights, and the 4♥ changes little.' },
      { about: 'sizing', text: 'Two calls on a paired board make their range stronger. Middle pairs and ace high rarely pay three streets.' },
      { about: 'range', text: 'Trip tens and 7-7 and 6-6 full houses call any bet. Jacks call only small. Middle pairs and ace high fold.' },
    ],
    takeaway: 'After two calls on a paired board, a third bet only gets called by better: check.',
  },
  'quads-call-river-all-in-raise-flush-board': {
    why: 'Call: quads beat every full house, so only Q♠T♠, a straight flush, beats you. With a plain flush they’d just call, so the raise is a full house or the straight flush. K-K and J-J would usually have 3-bet before the flop, which leaves mostly 9-9, and there are three ways to hold nines for every straight flush. You need about 25%.',
    read: [
      { about: 'preflop', text: 'You opened 7♠7♣; two players and the big blind called. The cold-callers have pairs, suited broadways and suited connectors.' },
      { about: 'players', text: 'Four saw the flop; only a solid player in middle position called your bet.' },
      { about: 'board', text: 'K♠9♠7♥ gave you a set. The 7♦ gave you quads, and the J♠ completes the flush and a straight flush for Q♠T♠.' },
      { about: 'sizing', text: 'They called two bets, then raised all in over your river bet. With the nut flush they’d call, not raise; the raise is a full house or better.' },
      { about: 'range', text: 'Nines full (9-9). Q♠T♠ (a straight flush). Kings or jacks full, which would usually have 3-bet first.' },
    ],
    takeaway: 'Narrow their range with what they did earlier: when the hands that beat you would have played differently, call.',
  },
  'top-pair-call-river-barrel-missed-draws': {
    why: 'Call: they’d bet A-K, A-J, A-7 and sets the same way, but every diamond draw, heart draw and gutshot missed, and those have nothing left but a bluff. Because none of the draws came in, you have to call: you need about 24%.',
    read: [
      { about: 'preflop', text: 'Ten left in a big tournament, the cutoff opened and you called A♣Q♥ on the button.' },
      { about: 'position', text: 'You’re in position and called two bets. They kept firing.' },
      { about: 'board', text: 'A♥J♦7♦ gave you top pair with a diamond draw on the board. The 5♥ adds a heart draw, and the 2♣ misses everything.' },
      { about: 'sizing', text: 'Three bets, ending with almost half the pot. With every draw missing, the river bet is polarised: strong aces and sets, or missed draws.' },
      { about: 'range', text: 'For value: A-K, A-J, A-7, A-5, A-2, J-J and 7-7. For bluffs: missed diamond draws, and missed heart and straight draws.' },
    ],
    takeaway: 'When every draw misses, a bet that’s value or a missed draw is a call with top pair.',
  },
  'top-pair-top-kicker-call-turn-check-raise-shove': {
    why: 'Call: sets are possible, but they’re rare, and they’d often bet earlier. Semi-bluffs with spades and overcards are far more common for a bluffy player, and you’re well ahead of those and of any worse jack. You need about 40%, and knowing their game and your history, you can’t fold top pair, top kicker.',
    read: [
      { about: 'preflop', text: 'A very aggressive pro opened under the gun with 26 big blinds; you called A♦J♠ in the hijack. You’d just bluffed them in a big pot.' },
      { about: 'opponent', text: 'A very aggressive pro who was just bluffed is more likely to fight back with a semi-bluff.' },
      { about: 'board', text: 'J♥7♠2♣ checked through. The 3♠ adds a spade draw.' },
      { about: 'sizing', text: 'They checked twice, then check-raised all in over your small turn bet. With a short stack, a semi-bluff shove has lots of fold equity and outs.' },
      { about: 'range', text: 'For value: sets J-J, 7-7 and 3-3. Semi-bluffs: spade draws with overcards. Sometimes a worse jack.' },
    ],
    takeaway: 'Against a bluffy short stack, a check-raise all in is more often a semi-bluff than a set: call with top pair, top kicker.',
  },
};

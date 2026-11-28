import type { Lesson } from '../model';

export const L14: Record<string, Lesson> = {
  'nines-call-polarized-river-bet-low-stakes': {
    why: 'Call: a big river lead from this player is polarised, and your nines block most of their value. The only straight that fits their line is T-9, two nines in your hand leave just a couple of combos of it, and 9-8 is gone entirely. Missed heart draws are far more common, and they all lose to you. You need 26%, and you’re ahead most of the time.',
    streets: [
      { street: 'preflop', text: 'A limper calls, you raise 9♣9♠ from middle position, and the big blind and the limper call.', range: 'The big blind: wide, suited hands, connectors and pairs.' },
      { street: 'flop', text: 'On 8♥6♥6♣ it checks to you, you bet, and only the big blind calls. Against two players on a two-heart board, that call is often a heart draw.', range: 'Heart draws, sixes, eights, straight draws like T-9 and 7-5, pairs.' },
      { street: 'turn', text: 'The 7♦ makes straights for 9-5 and T-9 and gives you an open-ender. They check, you bet 23.25 into 43.5, and they call.', range: 'Heart draws, sixes, eights, 9-5 and T-9, pairs.' },
      { street: 'river', text: 'The 8♦ double-pairs the board and misses the hearts, and they lead over half the pot. With T-T or J-J they’d bet small or check, so this is a strong hand or a bluff.', range: 'Value: T-9 suited, mostly blocked by your nines. Bluffs: missed heart draws.' },
    ],
    takeaway: 'When your cards block their few value hands, a polarised bet is mostly bluffs: call.',
  },
  'top-pair-fold-calling-station-river-bet': {
    why: 'Fold: a player who has only called all hand now leads big. Calling stations rarely raise their sets early, but on the river they bet their strong hands, afraid you’ll check behind. Very few hands you beat would lead like this, so you win far less than the 28% you need.',
    streets: [
      { street: 'preflop', text: 'A weak-tight calling station limps under the gun and calls your raise on the button with A♦K♥.', range: 'Pairs, suited aces, suited connectors and broadways.' },
      { street: 'flop', text: 'On J♠3♠2♥ you bet 9 into 11.5 and they call, as calling stations do, with pairs, draws and sets alike.', range: 'Jacks, pairs, spade and wheel draws, sets they won’t raise.' },
      { street: 'turn', text: 'The K♦ gives you top pair, top kicker. You bet 20 into 29.5 and they call again.', range: 'Kings, jacks, sets, two pairs, spade and wheel draws.' },
      { street: 'river', text: 'The 6♦ makes 5-4 a straight, and for the first time they lead out big. From a player who never raised, that’s the strong part of their range.', range: 'Value: J-J, 6-6, 3-3, 2-2, 5-4 suited, K-J, K-6, K-3, K-2. Sometimes K-Q or K-T.' },
    ],
    takeaway: 'When a player who only ever calls suddenly bets big, they have it.',
  },
  'nines-call-river-bluffer': {
    why: 'Call: against this player, a river bet after the turn checks through is often a hand that gave up on the turn. Your nines beat all of those plus every small pair and seven. You need 33%, and you’re ahead far more often.',
    streets: [
      { street: 'preflop', text: 'You open 9♠9♥ on the button and an aggressive player who likes to bluff calls from the big blind.', range: 'Suited hands, connectors, pairs and broadways.' },
      { street: 'flop', text: 'On 4♠4♦7♥ you c-bet 6.4 into 8.5 and they call. An aggressive player would often check-raise a four or a draw.', range: 'Pairs, sevens, fours, straight draws, floats.' },
      { street: 'turn', text: 'The K♥ checks through. Your nines are a bluff catcher now, and checking keeps the pot small.', range: 'Pairs, sevens, kings, floats that gave up.' },
      { street: 'river', text: 'The J♦ and they bet nearly the pot. This player bluffs the river more often than they call the turn with something real, so their range holds lots of misses.', range: 'Ahead: a four, some kings and jacks. Behind: sevens, small pairs, missed queen-high, ten-high and small connectors.' },
    ],
    takeaway: 'Against a known bluffer, a river bet after a checked turn is often a hand that gave up: call with a medium pair.',
  },
  'top-pair-call-small-river-bet-loose-player': {
    why: 'Call: you need only about 25% against this half-pot bet. A loose, weak player bets worse aces like A-J and A-T for value and turns missed heart draws into bluffs, and you beat all of those; only A-Q and sets beat you.',
    streets: [
      { street: 'preflop', text: 'You open A♦K♥ from the cutoff and a loose, weak player calls on the button.', range: 'Wide: aces, broadways, suited hands and pairs.' },
      { street: 'flop', text: 'You flop top pair, top kicker on A♥Q♥7♠. You bet and they call.', range: 'Aces, queens, heart draws, sets and two pairs.' },
      { street: 'turn', text: 'The 8♦ adds a diamond draw. You bet 16 into 23.5 and they call with any ace, queens and draws.', range: 'Aces, queens, heart draws, sets, K-J drawing.' },
      { street: 'river', text: 'The 2♦. You check and they bet half the pot: worse aces for value and missed draws as bluffs, at a good price for you.', range: 'Ahead: A-Q, Q-Q, 8-8, 7-7, 2-2. Behind: A-J, A-T, A-9 suited, missed heart draws, K-J.' },
    ],
    takeaway: 'Against a loose, weak player, top pair, top kicker calls a half-pot bet easily.',
  },
  'top-pair-fold-passive-river-raise': {
    why: 'Fold: a raise from a player who almost never bluffs is a strong hand: trips, a full house, the 6-5 straight or a backdoor diamond flush, and you beat none of them. You need about 27% and never win, so calling just pays them off.',
    streets: [
      { street: 'preflop', text: 'You open A♦K♥ from the cutoff and a very passive player calls on the button.', range: 'Pairs, suited hands, broadways and connectors.' },
      { street: 'flop', text: 'On 4♥4♦7♠ you bet 7 into 9.5 and they call with pairs, sevens, fours, draws and overcards.', range: 'Pairs, sevens, fours, draws.' },
      { street: 'turn', text: 'The 8♦ adds draws and it checks through. A passive player who checks has a pair, a draw, or a strong hand waiting to call.', range: 'Pairs, sevens, eights, fours, draws.' },
      { street: 'river', text: 'The K♦ gives you top pair and completes a backdoor flush. You bet and they raise three times your bet. A very passive player almost never raises the river as a bluff.', range: 'A-4, 5-4, 7-7, 8-8, A-A, 6-5, backdoor diamond flushes.' },
    ],
    takeaway: 'A river raise from a player who almost never bluffs is strong: fold one pair.',
  },
  'aces-fold-flush-river-shove': {
    why: 'Fold: an overbet all in from a good player on the flush card is almost always a flush or a set. Top pair doesn’t shove here, and the hands that could bluff, like 9-9 or 8-7, mostly won’t. You need about 34%, and you win far less.',
    streets: [
      { street: 'preflop', text: 'You open A♠A♣ from first position; a strong player in middle position and both blinds call.', range: 'The strong player: pairs, suited broadways, suited aces, connectors.' },
      { street: 'flop', text: 'On K♥8♥2♦ you bet 7.5 into 13 and only the strong player calls. They raise some sets and call with others.', range: 'Kings, eights, sets, heart draws, pairs.' },
      { street: 'turn', text: 'The 3♠ is a blank. You bet 13 into 28 and they call again, still kings, sets and draws.', range: 'Kings, sets, two pairs, heart draws, pairs.' },
      { street: 'river', text: 'The 6♥ completes the flush. You check and they move all in for more than the pot.', range: 'Value: heart flushes, 8-8, 6-6, 3-3, 2-2. Bluffs: 9-9 and 8-7 suited, sometimes.' },
    ],
    takeaway: 'An overbet shove from a good player on the card that completes the draw is a flush or a set: fold even aces.',
  },
  'trip-aces-weak-kicker-call-lag': {
    why: 'Call: you hold an ace, so they can have only one ace left, which cuts their value a lot. A loose, aggressive player bets the flop and turn with plenty of spade and broadway draws, and those all missed. You need about 30%, and the bluffs outnumber the better hands.',
    streets: [
      { street: 'preflop', text: 'A loose, aggressive player opens the cutoff, the short-stacked small blind calls, and you call from the big blind with A♥7♦.', range: 'The cutoff: suited hands, broadways, aces and connectors.' },
      { street: 'flop', text: 'You flop top pair on A♠K♠5♣. You check and call; this player bets lots of hands here, draws included.', range: 'Aces, kings, spade draws, broadway draws like Q-J, air.' },
      { street: 'turn', text: 'The A♦ gives you trips with a weak kicker. You check and call 7.65 into 14.', range: 'Aces, kings, spade and broadway draws, air.' },
      { street: 'river', text: 'The 6♦ and they bet ¾ pot. Their value is better aces and full houses, and a loose player has plenty of missed draws to bluff with.', range: 'Ahead: A-K, A-6, K-K, 6-6, 5-5, A-Q down to A-8. Behind: A-4 to A-2, missed spade draws, Q-J, Q-T, J-T.' },
    ],
    takeaway: 'Holding a card their value hands need makes that value rare: against a loose player, call.',
  },
  'nines-call-down-loose-small-blind': {
    why: 'Call: this player bets any pair, any gutshot and some pure bluffs, and rarely has two pair or better. Your nines beat every smaller pair and every miss and lose only to the occasional king. You need about 30%, and you’re ahead most of the time.',
    streets: [
      { street: 'preflop', text: 'A loose, aggressive small blind who tries to win every pot calls your cutoff open with 9♦9♥ in your hand.', range: 'Almost any suited hand, pairs, broadways and connectors.' },
      { street: 'flop', text: 'On K♥6♠2♦ they lead small, 5 into 7, and you call. This player leads any king, any pair, and plenty of misses.', range: 'Kings, any pair, gutshots, air.' },
      { street: 'turn', text: 'The 8♠ and they bet nearly the pot. You call: the same player, the same wide range.', range: 'Kings, any pair, spade draws, gutshots, air.' },
      { street: 'river', text: 'The 4♣ and they bet ¾ pot again. Two pair and better rarely play like this; most of what they hold is a smaller pair, a missed gutshot or nothing.', range: 'Ahead: some kings. Behind: sixes, eights, twos, 3-3 to 7-7, missed gutshots, pure bluffs.' },
    ],
    takeaway: 'Against a player who bets every pot, call down with medium pairs.',
  },
  'sevens-call-turn-shove-three-bet-pot': {
    why: 'Call: you need to win only about a quarter of the time. Their value is big pairs and top pair, but a world-class player also shoves aces and suited connectors that picked up draws, and you’re ahead of all of those for now, with your own straight draw to a five.',
    streets: [
      { street: 'preflop', text: 'You open 7♣7♥ from first position with 25 big blinds, and a world-class player 3-bets from the small blind; you call.', range: 'Big pairs, big aces, suited aces and suited connectors.' },
      { street: 'flop', text: 'On Q♥4♠3♦ they bet small, 4.33 into 16, their whole range, and you call.', range: 'Overpairs, queens, aces and suited connectors with backdoors.' },
      { street: 'turn', text: 'The 6♦ and they move all in for about half the pot. The range is strong, but this player shoves draws here too.', range: 'Value: A-A, K-K, Q-Q, A-Q, K-Q. Draws: A-5, A-2, 5-4 and suited hands with draws.' },
    ],
    takeaway: 'When the price is a quarter of the pot and you’re ahead of their draws, call a short shove.',
  },
  'queen-jack-call-four-flush-lead': {
    why: 'Call: marginal flushes would rather check, so the lead is a strong flush or a straight, or a hand like J-T or a small pair turned into a bluff, and a good player bluffs more when the scary card comes. You beat all the bluffs and need only about 27%.',
    streets: [
      { street: 'preflop', text: 'You open Q♥J♥ from the cutoff; a good young player in the small blind and a tighter big blind call.', range: 'The small blind: pairs, suited broadways, suited aces, connectors.' },
      { street: 'flop', text: 'K♣T♣4♣ checks round; you have a gutshot and no club. A monotone board slows everyone down, so every range stays wide.', range: 'Clubs, kings, tens, broadway draws, air.' },
      { street: 'turn', text: 'The Q♠ gives you a pair and an open-ender. You bet small; the small blind calls and the big blind folds.', range: 'Clubs, kings, queens, tens, A-J and J-9, pairs.' },
      { street: 'river', text: 'The 6♣ puts four clubs out and the small blind leads a little over half the pot. Most players won’t lead a marginal flush here.', range: 'Value: strong flushes, A-J, J-9. Bluffs: J-T, T-9, small pairs, ace high with no club.' },
    ],
    takeaway: 'When marginal hands would check, a lead on a scary card is strong or a bluff: call if you beat the bluffs.',
  },
};

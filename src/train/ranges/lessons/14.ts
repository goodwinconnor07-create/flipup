import type { Lesson } from '../model';

export const L14: Record<string, Lesson> = {
  'nines-call-polarized-river-bet-low-stakes': {
    why: 'Call: a big river lead from this player is polarised, and your nines block most of their value. The only straight that fits their line is T-9, and holding two nines leaves just a couple of combos of it; there’s no 9-8 at all. Missed heart draws are far more common, and they all lose to you. You need 26%, and you’re ahead most of the time.',
    streets: [
      { street: 'preflop', text: 'A limper calls, you raise 9♣9♠ from middle position, and the big blind and the limper call. The big blind’s range is wide and full of suited hands.', range: 'The big blind: wide, suited hands, connectors and pairs.' },
      { street: 'flop', text: 'The flop is 8♥6♥6♣. It checks to you, you bet, and only the big blind calls. A call against two players on a two-heart board is often a heart draw, plus sixes, eights and straight draws.', range: 'Heart draws, sixes, eights, straight draws like T-9 and 7-5, and pairs.' },
      { street: 'turn', text: 'The 7♦ adds straights for 9-5 and T-9 and gives you an open-ended draw. They check, you bet 23.25 into about 43.5, and they call again. Their range is still heart draws, sixes and eights, and straight draws.', range: 'Heart draws, sixes, eights, straights like 9-5 and T-9 drawing, and pairs.' },
      { street: 'river', text: 'The 8♦ double-pairs the board and misses the hearts, and they lead big, more than half the pot. With T-T or J-J they’d bet small or check, so a big lead is a strong hand or a bluff. The only straight that fits is T-9, and your nines leave just two combos.', range: 'Value: T-9 suited, mostly blocked by your nines. Bluffs: missed heart draws.' },
    ],
    takeaway: 'When your cards block their few value hands, a polarised bet is mostly bluffs: call.',
  },
  'top-pair-fold-calling-station-river-bet': {
    why: 'Fold: a player who has only called all hand now leads big. Calling stations rarely raise their sets early, but on the river they bet their strong hands for value, afraid you’ll check behind. Their range is sets, the 5-4 straight and two pair; very few hands you beat would lead like this. You need about 28%, and you win far less.',
    streets: [
      { street: 'preflop', text: 'A weak-tight calling station limps under the gun, you raise A♦K♥ on the button to 5, and they call. A calling station limp-calls with pairs, suited hands and broadways.', range: 'Pairs, suited aces, suited connectors and broadways.' },
      { street: 'flop', text: 'The flop is J♠3♠2♥. You bet 9 into about 11.5, and they call, as calling stations do: with pairs, draws and sets alike. They rarely raise anything, even a set.', range: 'Jacks, pairs, spade draws, wheel draws, and sets they won’t raise.' },
      { street: 'turn', text: 'The K♦ gives you top pair, top kicker. You bet again, 20 into about 29.5, and they call again. Their range is still pairs, draws and sets, plus any king that just paired.', range: 'Kings, jacks, sets, two pairs, and spade and wheel draws.' },
      { street: 'river', text: 'The 6♦ makes 5-4 a straight, and for the first time they lead out big. A calling station rarely raises a set earlier in the hand, but on the river they bet their strong hands, afraid you’ll check behind.', range: 'Value: sets J-J, 6-6, 3-3 and 2-2; 5-4 suited; K-J, K-6, K-3 and K-2. Sometimes a worse king like K-Q or K-T.' },
    ],
    takeaway: 'When a player who only ever calls suddenly bets big, they have it.',
  },
  'nines-call-river-bluffer': {
    why: 'Call: against this player, a river bet after the turn checks through is often a bluff from a hand that gave up on the turn. Your nines beat all of those, plus every small pair and seven. You need 33%, and you’re ahead far more often. Folding would be too weak.',
    streets: [
      { street: 'preflop', text: 'You open 9♠9♥ on the button to 4, and an aggressive player who likes to bluff calls from the big blind. They defend wide, with every suited and connected hand.', range: 'Wide: suited hands, connectors, pairs and broadways.' },
      { street: 'flop', text: 'The flop is 4♠4♦7♥. You c-bet 6.4 into about 8.5, and they call with fours, sevens, pairs and overcards. An aggressive player would often check-raise a four or a draw.', range: 'Pairs, sevens, fours, straight draws and floats.' },
      { street: 'turn', text: 'The K♥: they check and you check back. Your nines are a bluff catcher now, and checking keeps the pot small.', range: 'Pairs, sevens, kings, and floats that gave up.' },
      { street: 'river', text: 'The J♦ and they bet nearly the pot. This player is more likely to bluff the river than to have called the turn with something real, so their range has lots of hands that missed.', range: 'Ahead of you: a four, and some kings and jacks. Behind you: sevens, small pairs, and missed queen-high, ten-high and small connectors.' },
    ],
    takeaway: 'Against a known bluffer, a river bet after a checked turn is often a hand that gave up: call with a medium pair.',
  },
  'top-pair-call-small-river-bet-loose-player': {
    why: 'Call: you only need about 25% against this half-pot bet. A loose, weak player bets worse aces like A-J and A-T for value and turns missed heart draws into bluffs, and you beat all of those. Only A-Q and sets beat you. This is an easy call.',
    streets: [
      { street: 'preflop', text: 'You open A♦K♥ from the cutoff to 4, and a loose, weak player calls on the button. A loose player calls with a wide range: any ace, broadways, suited hands and connectors.', range: 'Wide: aces, broadways, suited hands and pairs.' },
      { street: 'flop', text: 'You flop top pair, top kicker on A♥Q♥7♠. You bet and they call. Their range has aces, queens and heart draws.', range: 'Aces, queens, heart draws, sets and two pairs.' },
      { street: 'turn', text: 'The 8♦ adds a diamond draw. You bet again, 16 into about 23.5, and they call. A loose player calls with any ace, queens, heart and straight draws, and the odd set.', range: 'Aces, queens, heart draws, sets, and K-J drawing.' },
      { street: 'river', text: 'The 2♦. You check, and they bet half the pot. A loose, weak player bets worse aces for value and missed draws as bluffs here, and the small size gives you a good price.', range: 'Ahead of you: A-Q, Q-Q, 8-8, 7-7 and 2-2. Behind you: A-J, A-T and A-9 suited, missed heart draws and K-J.' },
    ],
    takeaway: 'Against a loose, weak player, top pair, top kicker calls a half-pot bet easily.',
  },
  'top-pair-fold-passive-river-raise': {
    why: 'Fold: a raise from a player who almost never bluffs is a strong hand. That’s trips, a full house, the 6-5 straight or a backdoor diamond flush, and you beat none of them. You need about 27%, and you never win. Calling just pays them off.',
    streets: [
      { street: 'preflop', text: 'You open A♦K♥ from the cutoff to 4, and a very passive player calls on the button. A passive player calls with pairs, suited hands, broadways and connectors.', range: 'Pairs, suited hands, broadways and connectors.' },
      { street: 'flop', text: 'The flop is 4♥4♦7♠, paired. You bet 7 into about 9.5, and they call. A passive player calls here with pairs, sevens, fours, diamond and heart draws, and overcards.', range: 'Pairs, sevens, fours, and draws.' },
      { street: 'turn', text: 'The 8♦ adds a diamond draw and straight draws, and it checks through. You check behind with ace high; a passive player who checks has a pair, a draw, or a strong hand waiting to call.', range: 'Pairs, sevens, eights, fours, and draws.' },
      { street: 'river', text: 'The K♦ gives you top pair, top kicker and completes a backdoor diamond flush. You bet and they raise three times your bet. A very passive player almost never raises the river as a bluff.', range: 'Trips with A-4 and 5-4; full houses 7-7 and 8-8; A-A; 6-5 (a straight); backdoor diamond flushes.' },
    ],
    takeaway: 'A river raise from a player who almost never bluffs is strong: fold one pair.',
  },
  'aces-fold-flush-river-shove': {
    why: 'Fold: an overbet all in from a good player on the flush card is almost always a flush or a set. Top pair doesn’t shove here, and the hands that could bluff, like 9-9 or 8-7, mostly won’t. You need about 34%, and you win far less.',
    streets: [
      { street: 'preflop', text: 'You open A♠A♣ from first position in a tournament; a strong player in middle position and both blinds call.', range: 'The strong player: pairs, suited broadways, suited aces and connectors.' },
      { street: 'flop', text: 'The flop is K♥8♥2♦. You bet 7.5 into about 13, and only the strong player calls: kings, eights, sets and heart draws. A strong player raises some sets but calls with others.', range: 'Kings, eights, sets, heart draws, and pairs.' },
      { street: 'turn', text: 'The 3♠ is a blank. You bet again, 13 into about 28, and they call. Their range is still kings, eights, sets and heart draws.', range: 'Kings, sets, two pairs, heart draws, and pairs.' },
      { street: 'river', text: 'The 6♥ completes the flush. You check, and they move all in for more than the pot. Most players wouldn’t shove top pair here, and many wouldn’t turn 9-9 or 8-7 into a bluff either.', range: 'Value: heart flushes and sets 8-8, 6-6, 3-3 and 2-2. Bluffs: 9-9 and 8-7 suited, sometimes.' },
    ],
    takeaway: 'An overbet shove from a good player on the card that completes the draw is a flush or a set: fold even aces.',
  },
  'trip-aces-weak-kicker-call-lag': {
    why: 'Call: you hold an ace, so they can have only one ace left, which cuts their value a lot. A loose, aggressive player bets the flop and turn with plenty of spade and broadway draws, and those all missed. You need about 30%, and the bluffs outnumber the better hands.',
    streets: [
      { street: 'preflop', text: 'A loose, aggressive player opens the cutoff, the short-stacked small blind calls, and you call from the big blind with A♥7♦.', range: 'The cutoff: wide, suited hands, broadways, aces and connectors.' },
      { street: 'flop', text: 'You flop top pair on A♠K♠5♣. You check, they bet, you call. This player bets lots of hands here, including spade and straight draws.', range: 'Aces, kings, spade draws, broadway draws like Q-J, and air.' },
      { street: 'turn', text: 'The A♦ gives you trips with a weak kicker. You check, they bet 7.65 into about 14, and you call. A loose player keeps betting here with better aces, full houses, and the spade and straight draws.', range: 'Aces, kings, spade and broadway draws, and air.' },
      { street: 'river', text: 'The 6♦ and they bet about ¾ pot. Their value is better aces and full houses; their bluffs are missed spade and broadway draws, and a loose player has plenty of those.', range: 'Ahead of you: A-K, A-6, K-K, 6-6 and 5-5; A-Q down to A-8. Behind you: A-4, A-3 and A-2; missed spade draws; Q-J, Q-T and J-T.' },
    ],
    takeaway: 'Holding a card their value hands need makes that value rare: against a loose player, call.',
  },
  'nines-call-down-loose-small-blind': {
    why: 'Call: this player bets with any pair, any gutshot and some pure bluffs, and rarely has two pair or better. Your nines beat every smaller pair and every miss, and lose only to the occasional king. You need about 30%, and you’re ahead most of the time.',
    streets: [
      { street: 'preflop', text: 'A loose, aggressive player in the small blind calls your cutoff open with 9♦9♥. They’re clearly trying to win every pot they play.', range: 'Wide: almost any suited hand, pairs, broadways and connectors.' },
      { street: 'flop', text: 'The flop is K♥6♠2♦. They lead small, 5 into about 7, and you call. A player trying to win every pot leads here with any king, any pair, and plenty of hands that missed.', range: 'Kings, any pair, gutshots, and air.' },
      { street: 'turn', text: 'The 8♠ and they bet nearly the pot. You call: this player bets any pair, any gutshot and the occasional stone bluff.', range: 'Kings, any pair, spade draws, gutshots, and air.' },
      { street: 'river', text: 'The 4♣ and they bet again, about ¾ pot. Two pair and better rarely play like this; most of what they hold is a smaller pair, a missed gutshot or nothing.', range: 'Ahead of you: some kings. Behind you: sixes, eights, twos, 3-3 to 7-7, missed gutshots and pure bluffs.' },
    ],
    takeaway: 'Against a player who bets every pot, call down with medium pairs.',
  },
  'sevens-call-turn-shove-three-bet-pot': {
    why: 'Call: you only need to win about a quarter of the time. Their value is big pairs and top pair, but a world-class player also shoves aces and suited connectors that picked up straight and flush draws, and you’re ahead of all of those for now. You also have your own straight draw to a five.',
    streets: [
      { street: 'preflop', text: 'You open 7♣7♥ from first position with 25 big blinds, and a world-class player 3-bets from the small blind; you call.', range: 'Big pairs, big aces, suited aces and suited connectors.' },
      { street: 'flop', text: 'The flop is Q♥4♠3♦. They bet small, 4.33 into about 16, and you call. A small c-bet is their whole range: overpairs, queens, and aces and suited connectors with backdoors.', range: 'Their whole range: overpairs, queens, A-x and suited connectors.' },
      { street: 'turn', text: 'The 6♦ and they move all in for about half the pot. Their range is quite strong, but this player shoves aces and suited connectors that picked up draws too.', range: 'Value: A-A, K-K, Q-Q, A-Q and K-Q. Draws: A-5, A-2, 5-4 and other suited hands with straight and flush draws.' },
    ],
    takeaway: 'When the price is a quarter of the pot and you’re ahead of their draws, call a short shove.',
  },
  'queen-jack-call-four-flush-lead': {
    why: 'Call: marginal flushes would rather check, so the lead comes from strong flushes and straights, or from hands like J-T and small pairs turned into bluffs. A good player bluffs more than usual when the scary card comes. You beat all the bluffs and need only about 27%.',
    streets: [
      { street: 'preflop', text: 'You open Q♥J♥ from the cutoff to 2.5; a good young player in the small blind and a tighter big blind call. The small blind’s range is wide: suited hands, broadways, pairs and suited aces.', range: 'The small blind: pairs, suited broadways, suited aces and connectors.' },
      { street: 'flop', text: 'The flop is K♣T♣4♣, monotone, and it checks round. You have a gutshot with no club. A three-club board slows everyone down, so the checks keep every range wide.', range: 'Wide: clubs, kings, tens, broadway draws, and air.' },
      { street: 'turn', text: 'The Q♠ gives you a pair and an open-ended straight draw. You bet small; the small blind calls and the big blind folds.', range: 'Clubs, kings, queens, tens, A-J and J-9 (straights), and pairs.' },
      { street: 'river', text: 'The 6♣ puts four clubs out, and the small blind leads a little over half the pot. Most players won’t lead with a marginal flush here, and a good player bluffs more often when the scary card comes.', range: 'Value: strong flushes, and A-J and J-9. Bluffs: J-T, T-9 and small pairs, and ace high with no club.' },
    ],
    takeaway: 'When marginal hands would check, a lead on a scary card is strong or a bluff: call if you beat the bluffs.',
  },
};

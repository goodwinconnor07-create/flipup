import type { Lesson } from '../model';

export const L14: Record<string, Lesson> = {
  'nines-call-polarized-river-bet-low-stakes': {
    why: 'Call: a big river lead from this player is polarised, and your nines block most of their value. The only straight that fits their line is T-9, and holding two nines leaves just a couple of combos of it. Missed heart draws are far more common, and they all lose to you. You need 26%, and you’re ahead most of the time.',
    read: [
      { about: 'preflop', text: 'You raised a limper with 9-9, and the big blind and the limper called. The big blind’s range is wide and full of suited hands.' },
      { about: 'players', text: 'Three saw the flop; only the big blind called your bet. A call against two players on a two-heart board often means a heart draw.' },
      { about: 'board', text: '8♥6♥6♣ is paired with a heart draw. The 7♦ adds straights, and the 8♦ double-pairs the board and misses the hearts.' },
      { about: 'sizing', text: 'A lead of more than half the pot. With T-T or J-J they’d bet small or check, so a big lead is a strong hand or a bluff.' },
      { about: 'range', text: 'For value: T-9 suited, and your nines block most of it. For bluffs: missed heart draws.' },
    ],
    takeaway: 'When your cards block their few value hands, a polarised bet is mostly bluffs: call.',
  },
  'top-pair-fold-calling-station-river-bet': {
    why: 'Fold: a player who has only called all hand now leads big. Calling stations rarely raise their sets early, but on the river they bet their strong hands for value, afraid you’ll check behind. Their range is sets, the 5-4 straight and two pair; very few hands you beat would lead like this. You need about 28%, and you win far less.',
    read: [
      { about: 'preflop', text: 'A weak-tight player limped under the gun and called your raise from the button. Their range is pairs, suited aces and connectors.' },
      { about: 'opponent', text: 'A weak-tight calling station calls with almost anything but only bets when they’re strong. A sudden bet is the clearest read in poker.' },
      { about: 'board', text: 'J♠3♠2♥ has a spade draw and wheel draws. The K♦ gives you top pair, top kicker, and the 6♦ makes 5-4 a straight.' },
      { about: 'sizing', text: 'They called two bets, then led big on the river. A passive player switching to a big lead is value.' },
      { about: 'range', text: 'For value: sets J-J, 6-6, 3-3 and 2-2; 5-4 suited; K-J, K-6, K-3 and K-2. Sometimes a worse king like K-Q or K-T.' },
    ],
    takeaway: 'When a player who only ever calls suddenly bets big, they have it.',
  },
  'nines-call-river-bluffer': {
    why: 'Call: against this player, a river bet after the turn checks through is often a bluff from a hand that gave up on the turn. Your nines beat all of those, plus every small pair and seven. You need 33%, and you’re ahead far more often. Folding would be too weak.',
    read: [
      { about: 'preflop', text: 'An aggressive player who likes to bluff called your button open from the big blind.' },
      { about: 'opponent', text: 'This player loves to bluff the river. Against them, call more often with medium hands.' },
      { about: 'position', text: 'You’re in position and checked back the turn with nines, a hand that wants a showdown.' },
      { about: 'board', text: '4♠4♦7♥ is paired and dry. The K♥ and the J♦ bring overcards to your nines.' },
      { about: 'sizing', text: 'A nearly pot-size bet after a checked turn. A bluffer bets big to make you fold medium hands like yours.' },
      { about: 'range', text: 'Ahead of you: a four, and some kings and jacks. Behind you: sevens, small pairs, and hands that missed like queen high, ten high and small connectors.' },
    ],
    takeaway: 'Against a known bluffer, a river bet after a checked turn is often a hand that gave up: call with a medium pair.',
  },
  'top-pair-call-small-river-bet-loose-player': {
    why: 'Call: you only need about 25% against this half-pot bet. A loose, weak player bets worse aces like A-J and A-T for value and turns missed heart draws into bluffs, and you beat all of those. Only A-Q and sets beat you. This is an easy call.',
    read: [
      { about: 'preflop', text: 'A loose player called your open on the button: a wide range of aces, broadways, suited hands and pairs.' },
      { about: 'opponent', text: 'A loose, weak player value-bets worse hands and bluffs missed draws. They don’t save big bets for big hands.' },
      { about: 'board', text: 'A♥Q♥7♠ gives you top pair, top kicker with a heart draw out. The 8♦ and 2♦ miss the hearts.' },
      { about: 'sizing', text: 'A half-pot bet after you checked the river: a good price, and a size loose players use with worse aces and missed draws.' },
      { about: 'range', text: 'Ahead of you: A-Q, Q-Q, 8-8, 7-7 and 2-2. Behind you: A-J, A-T and A-9 suited, missed heart draws and K-J.' },
    ],
    takeaway: 'Against a loose, weak player, top pair, top kicker calls a half-pot bet easily.',
  },
  'top-pair-fold-passive-river-raise': {
    why: 'Fold: a raise from a player who almost never bluffs is a strong hand. That’s trips, a full house, the 6-5 straight or a backdoor diamond flush, and you beat none of them. You need about 27%, and you never win. Calling just pays them off.',
    read: [
      { about: 'preflop', text: 'A very passive player on the button called your cutoff open.' },
      { about: 'opponent', text: 'A very passive player calls a lot and raises only with very strong hands. A river raise from them is the nuts or close.' },
      { about: 'board', text: '4♥4♦7♠ is paired. The 8♦ adds a diamond draw and straight draws, and the K♦ completes a backdoor flush and gives you top pair.' },
      { about: 'sizing', text: 'They raised your river bet to three times its size. Passive players don’t raise the river as a bluff.' },
      { about: 'range', text: 'Trips with A-4 and 5-4; full houses with 7-7 and 8-8; A-A; the 6-5 straight; backdoor diamond flushes.' },
    ],
    takeaway: 'A river raise from a player who almost never bluffs is strong: fold one pair.',
  },
  'aces-fold-flush-river-shove': {
    why: 'Fold: an overbet all in from a good player on the flush card is almost always a flush or a set. Top pair doesn’t shove here, and the hands that could bluff, like 9-9 or 8-7, mostly won’t. You need about 34%, and you win far less.',
    read: [
      { about: 'preflop', text: 'You opened aces from first position. A strong player in middle position and both blinds called.' },
      { about: 'players', text: 'Four saw the flop; only the strong player called your bet. Their range is kings, eights, sets and heart draws.' },
      { about: 'board', text: 'K♥8♥2♦ has a heart draw. The 3♠ is a blank, and the 6♥ completes the hearts.' },
      { about: 'sizing', text: 'An all in for more than the pot on the card that completes the draw. Good players rarely turn one pair into a shove this big.' },
      { about: 'range', text: 'For value: heart flushes and sets 8-8, 6-6, 3-3 and 2-2. Bluffs: 9-9 and 8-7 suited, sometimes.' },
    ],
    takeaway: 'An overbet shove from a good player on the card that completes the draw is a flush or a set: fold even aces.',
  },
  'trip-aces-weak-kicker-call-lag': {
    why: 'Call: you hold an ace, so they can have only one ace left, which cuts their value a lot. A loose, aggressive player bets the flop and turn with plenty of spade and broadway draws, and those all missed. You need about 30%, and the bluffs outnumber the better hands.',
    read: [
      { about: 'preflop', text: 'A loose, aggressive player opened the cutoff, the short-stacked small blind called, and you called from the big blind.' },
      { about: 'opponent', text: 'A loose, aggressive young player bets lots of hands when checked to, including draws, and keeps firing when they miss.' },
      { about: 'board', text: 'A♠K♠5♣ has spade and broadway draws. The A♦ gives you trips with a weak kicker, and the 6♦ misses the draws.' },
      { about: 'sizing', text: 'Three bets, ending with ¾ pot. From this player that’s value and draws that missed.' },
      { about: 'range', text: 'Ahead of you: A-K, A-6, K-K, 6-6 and 5-5; A-Q down to A-8. Behind you: A-4, A-3 and A-2; missed spade draws; Q-J, Q-T and J-T.' },
    ],
    takeaway: 'Holding a card their value hands need makes that value rare: against a loose player, call.',
  },
  'nines-call-down-loose-small-blind': {
    why: 'Call: this player bets with any pair, any gutshot and some pure bluffs, and rarely has two pair or better. Your nines beat every smaller pair and every miss, and lose only to the occasional king. You need about 30%, and you’re ahead most of the time.',
    read: [
      { about: 'preflop', text: 'A loose, aggressive player called your cutoff open from the small blind. They’re trying to win every pot they play.' },
      { about: 'opponent', text: 'Players who try to win every pot bet whatever they have. Against them, medium pairs go up in value.' },
      { about: 'board', text: 'K♥6♠2♦ is dry. The 8♠ adds a spade draw and gutshots, and the 4♣ changes little.' },
      { about: 'sizing', text: 'A small lead, a near-pot turn bet and ¾ pot on the river. Two pair and better rarely play this way; it’s a player pushing with anything.' },
      { about: 'range', text: 'Ahead of you: some kings. Behind you: smaller pairs (sixes, eights, twos, 3-3 to 7-7), missed gutshots and pure bluffs.' },
    ],
    takeaway: 'Against a player who bets every pot, call down with medium pairs.',
  },
  'sevens-call-turn-shove-three-bet-pot': {
    why: 'Call: you only need to win about a quarter of the time. Their value is big pairs and top pair, but a world-class player also shoves aces and suited connectors that picked up straight and flush draws, and you’re ahead of all of those for now. You also have your own straight draw to a 5. At this price you have to call.',
    read: [
      { about: 'preflop', text: 'You opened from first position and a world-class player 3-bet from the small blind. You called with 7-7 and 25 big blinds.' },
      { about: 'opponent', text: 'A world-class player shoves draws as well as value, especially when the stack is short compared with the pot.' },
      { about: 'board', text: 'Q♥4♠3♦ is dry. The 6♦ adds a diamond draw and straight draws, including yours.' },
      { about: 'sizing', text: 'A shove for about half the pot gives you a good price. With this little behind, draws shove to win the pot now or get it all in with outs.' },
      { about: 'range', text: 'Ahead of you: A-A, K-K and Q-Q; A-Q and K-Q. Behind you for now: aces and suited connectors with straight and flush draws.' },
    ],
    takeaway: 'When the price is a quarter of the pot and you’re ahead of their draws, call a short shove.',
  },
  'queen-jack-call-four-flush-lead': {
    why: 'Call: marginal flushes would rather check, so the lead comes from strong flushes and straights, or from hands like J-T and small pairs turned into bluffs. A good player bluffs more than usual when the scary card comes. You beat all the bluffs and need only about 27%.',
    read: [
      { about: 'preflop', text: 'You opened the cutoff; a good young player in the small blind and a tighter big blind called.' },
      { about: 'opponent', text: 'A good, young player knows a fourth club scares you, and uses it to bluff.' },
      { about: 'board', text: 'K♣T♣4♣ is monotone and checked through. The Q♠ gives you a pair, and the 6♣ puts four clubs out.' },
      { about: 'sizing', text: 'A lead of a little over half the pot. Players with a weak flush check here to avoid a raise; a lead is strong or a bluff.' },
      { about: 'range', text: 'For value: strong flushes, and A-J and J-9 straights. For bluffs: J-T, T-9 and small pairs, and ace high with no club.' },
    ],
    takeaway: 'When marginal hands would check, a lead on a scary card is strong or a bluff: call if you beat the bluffs.',
  },
};

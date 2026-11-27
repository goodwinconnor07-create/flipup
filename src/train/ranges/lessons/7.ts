import type { Lesson } from '../model';

export const L7: Record<string, Lesson> = {
  'top-pair-fold-turn-check-raise': {
    why: 'Fold: most players only check-raise a blank turn with two pair or better. They called the flop, and the 4♣ changed nothing, so the raise isn’t about the card: they had it on the flop and waited. Straight draws rarely raise here. You need 26%, and top pair with a ten kicker falls short.',
    read: [
      { about: 'preflop', text: 'The big blind defended your cutoff open with a wide range: suited hands, broadways, pairs and connectors.' },
      { about: 'position', text: 'Out of position, they check-called the flop and then check-raised the turn. Check-call then check-raise is a classic way to slow-play a strong hand.' },
      { about: 'board', text: 'K♦J♥8♠ is connected: kings, jacks, two pairs, sets and straight draws like Q-T and T-9. The 4♣ is a complete blank.' },
      { about: 'sizing', text: 'A 3x check-raise on a card that changes nothing is strength. Draws more often just call the turn and see the river.' },
      { about: 'opponent', text: 'A typical player doesn’t turn draws into big turn raises often. Their check-raises lean heavily to value.' },
      { about: 'range', text: 'For value: sets and two pairs like K-J, K-8 and J-8. Bluffs: a few straight draws.' },
    ],
    takeaway: 'A check-raise on a blank turn from a typical player is two pair or better: fold one pair.',
  },
  'kings-full-shove-short-stack': {
    why: 'Raise all in: they bet every ace here, and you beat nearly all of them. Only A-K, the last pair of aces, A-5 and A-3 have you. With under 5 big blinds left behind, any ace will call the rest. Calling leaves chips they would have paid.',
    read: [
      { about: 'preflop', text: 'A 17-big-blind stack opened under the gun: big pairs, big aces and suited broadways. You called on the button.' },
      { about: 'position', text: 'You’re in position. You checked the flop to let them catch up, and called the turn to keep their weaker hands in.' },
      { about: 'board', text: 'A♥A♠K♠ gave you kings full. The 5♥ and 3♦ fill up only A-5, A-3, 5-5 and 3-3.' },
      { about: 'sizing', text: 'A small turn bet and a river bet over half the pot leave them almost nothing behind. A short stack betting this much is committed.' },
      { about: 'range', text: 'You beat their trip aces (A-Q, A-J and the rest) and the small full houses 5-5 and 3-3. A-K, A-A, A-5 and A-3 beat you.' },
    ],
    takeaway: 'When a short stack bets most of what’s left, raise all in with any hand that beats most of their bets.',
  },
  'kings-call-multiway-lead-shove': {
    why: 'Call: a set might lead to protect itself, but there are only nine set combos and far more combos of the two flush draws. A weak player shoves draws like these all the time. You need about 30%, and against all those draws kings win far more often. Call happily.',
    read: [
      { about: 'preflop', text: 'A weak player limped, you raised, and three of them called. The limper’s range is wide: pairs, suited cards and connectors.' },
      { about: 'opponent', text: 'Weak players love to shove draws. They see an all in as a way to win now, not as a hand that needs to be strong.' },
      { about: 'players', text: 'Four saw the flop, and only the limper called your bet. A call against a raiser and two players behind is usually a pair or a draw.' },
      { about: 'board', text: '9♦7♣3♣ has a club draw. The 5♦ adds a diamond draw and connects the board.' },
      { about: 'sizing', text: 'A lead all in for about three quarters of the pot. Sets usually check-raise or call; a big lead often means a draw that wants you to fold.' },
      { about: 'range', text: 'For value: sets of nines, sevens and threes. Shoving with outs: diamond draws and club draws.' },
    ],
    takeaway: 'Count combos: a few sets can’t outweigh two whole flush draws.',
  },
  'aces-up-raise-small-river-bet': {
    why: 'Raise: you beat almost everything that bets this small. Every weaker ace, every pocket pair and every bluff loses to aces up; only a full house beats you. A big raise still gets paid by their aces, which find it hard to fold. Calling would leave chips behind that those aces would pay.',
    read: [
      { about: 'preflop', text: 'The player after a limper raised and you called on the button. Their range is strong: big pairs, big aces and suited broadways.' },
      { about: 'position', text: 'You’re in position. They checked the turn, then led small on the river: a change that often means a medium hand looking for thin value.' },
      { about: 'board', text: '5♦2♥2♠ is paired and dry. The T♠ gives you a pair, and the A♣ gives you aces up.' },
      { about: 'sizing', text: 'A third-pot river bet is a thin value bet or a cheap bluff. Strong hands usually bet bigger.' },
      { about: 'range', text: 'Behind you: A-K, A-Q, A-J and suited aces, A-5, pocket pairs and bluffs. A-T splits. Full houses beat you.' },
    ],
    takeaway: 'When a small bet comes from a range you beat almost entirely, raise: their aces won’t fold.',
  },
  'trips-weak-kicker-river-call': {
    why: 'Call: better kings and full houses beat you, but you hold a king, so they have fewer of them. They also bet every pair of jacks and some busted straight draws. You need about 28%, and you’re ahead far more often than that. You might be beaten, but you can’t fold.',
    read: [
      { about: 'preflop', text: 'The button and the big blind called your cutoff raise. The button’s range is wide: pairs, suited aces, broadways and connectors.' },
      { about: 'position', text: 'You checked to the preflop caller on the flop. In position, they bet every street, which includes plenty of medium hands and draws.' },
      { about: 'board', text: 'K♥J♣3♦ hits kings and jacks and gives straight draws like Q-T. The 2♠ is a blank, and the K♣ gives you trips.' },
      { about: 'sizing', text: 'Three bets, ending with ⅔ pot. Live players bet a pair of jacks for value this way, and keep firing missed straight draws.' },
      { about: 'range', text: 'Ahead of you: A-K, K-Q and K-T; full houses K-J, J-J, 3-3 and 2-2. K-9 splits. Behind you: a pair of jacks and missed straight draws.' },
    ],
    takeaway: 'Holding a card from their value hands makes a call better.',
  },
  'two-pair-fold-river-lead': {
    why: 'Fold: a straightforward player leads here with a jack, a straight or a paired eight, and all of those beat your sevens. They rarely bluff. You need 27%, and you win only when they’re bluffing. Against this player and range, the fold is clear.',
    read: [
      { about: 'preflop', text: 'A straightforward, tight-aggressive big stack called your cutoff open from the small blind at a final table. Their range is pairs, broadways and suited connectors.' },
      { about: 'opponent', text: 'A straightforward player bets when they have it and checks when they don’t. A sudden river lead from them is value.' },
      { about: 'board', text: 'J♥J♠7♦ is paired. The 4♥ adds a heart draw, and the 8♣ completes T-9 and 6-5 straights and pairs every eight.' },
      { about: 'sizing', text: 'They checked the flop and turn, called your small bet, then led for more than half the pot. The river card changed things for them.' },
      { about: 'range', text: 'For value: a jack, T-9 and 6-5 straights, a paired eight and full houses. Bluffs: rare.' },
    ],
    takeaway: 'When a straightforward player leads the river, believe them and fold a weak two pair.',
  },
  'underpair-turn-call-vs-three-bettor': {
    why: 'Call: they bet top pair and overpairs, but plenty of unpaired high cards that missed bet here too, and your sevens beat all of them. A small bet gives you an excellent price: you need only 22%. Raising has no point: worse hands fold and better ones don’t.',
    read: [
      { about: 'preflop', text: 'A tight-aggressive player 3-bet you from the small blind and you called. Their range is big pairs and big cards like A-K, A-Q, K-Q and K-J.' },
      { about: 'position', text: 'They’re out of position and checked the flop. A 3-bettor who skips the c-bet often has big cards that missed and wants to see the turn cheaply.' },
      { about: 'board', text: 'T♠8♠3♣ misses most of a 3-bettor’s big cards. The 2♥ changes nothing.' },
      { about: 'sizing', text: 'A small turn bet after checking the flop is a probe. It’s often a missed hand taking a cheap shot at the pot.' },
      { about: 'range', text: 'Ahead of you: overpairs, A-T and a set of tens. Behind you: A-K, A-Q, K-Q, K-J and other high cards that missed.' },
    ],
    takeaway: 'When a 3-bettor checks the flop and bets small on the turn, an underpair is a good bluff catcher.',
  },
  'low-straight-just-call-river': {
    why: 'Call: their bet is two pair or a missed seven about as often as it’s 8-7 or 7-3. You need about 28%, and you’re ahead well over half the time. Don’t raise: the hands that would call a raise are the ones that beat you.',
    read: [
      { about: 'preflop', text: 'Five players limped, and the big blind checked. With a free look, the big blind can have any two cards.' },
      { about: 'players', text: 'Five saw the flop and it checked through, so nobody had much. Only you called the big blind’s turn bet.' },
      { about: 'board', text: '6♠4♦2♥ checked around. The 5♥ makes your six-high straight, and also a seven-high straight for 7-3 and an eight-high one for 8-7. The 9♠ changes little.' },
      { about: 'sizing', text: 'A pot-size bet into four players, then about 60% on the river. Strong, but players also bet two pair and missed sevens this way.' },
      { about: 'range', text: 'Ahead of you: 8-7 and some 7-3. Other threes split. Behind you: two pair and missed sevens.' },
    ],
    takeaway: 'Call when you beat their bluffs and thin value; raise only when worse hands will call.',
  },
  'weak-flush-river-call': {
    why: 'Call: they only bet the 9♠ or better here, and most of the time they don’t hold a spade at all. Without a spade the bet is a bluff, and you beat every bluff. You need about 30%, and you’re ahead far more often. Folding would be a big mistake.',
    read: [
      { about: 'preflop', text: 'The lojack opened and you defended your big blind with 30 big blinds. Their range is pairs, broadways and suited aces.' },
      { about: 'position', text: 'They’re in position and checked back the turn. A strong flush would usually bet the turn to build the pot.' },
      { about: 'board', text: 'A♠7♠2♠ is monotone, and the 7♥ pairs the board. The 8♠ puts four spades out, so any spade makes a flush and yours is a small one.' },
      { about: 'sizing', text: 'A small flop bet with their whole range, a turn check, then ¾ pot. Players bet strong spades and bluffs; small spades usually check.' },
      { about: 'range', text: 'For value: one spade 9♠ or higher, some slow-played flushes and full houses. Without a spade: a bluff.' },
    ],
    takeaway: 'On a four-flush board, think about which flushes would bet and how often they have no spade at all.',
  },
  'trips-call-river-shove-3bet-pot': {
    why: 'Call: they shove straights and full houses, but also some overpairs and plenty of missed spade and straight draws. You need about 29%, and you’re ahead about half the time. Online regulars give up on some missed draws, but they still shove enough of them to make this a call.',
    read: [
      { about: 'preflop', text: 'The big blind 3-bet your button open light: pairs, suited aces and suited connectors. You called in position.' },
      { about: 'position', text: 'You’re in position and called two bets. The big blind keeps the lead with a mix of strong hands and draws.' },
      { about: 'board', text: 'J♥8♠2♣ gave you top pair. The 7♠ adds a spade draw and makes T-9 a straight. The J♦ gives you trips with a queen kicker.' },
      { about: 'sizing', text: 'Half pot, half pot, then all in for about ⅔ pot. The river shove is polarised: strong hands and missed draws.' },
      { about: 'range', text: 'Ahead of you: T-9, full houses, A-J and K-J. Behind you: J-T, some overpairs, and missed spade and straight draws.' },
    ],
    takeaway: 'Against a polarised shove, trips with a decent kicker beat enough bluffs to call.',
  },
};

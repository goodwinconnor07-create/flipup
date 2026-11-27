import type { Lesson } from '../model';

export const L1: Record<string, Lesson> = {
  'deuces-river-shove': {
    why: 'Call: bottom set beats every two pair and every missed draw, and an overbet shove is full of both. You lose to the heart flushes and the higher sets, but the cutoff also shoves the two pairs it thinks are good and every spade and wheel draw that missed. The price is 38%, and the hands you beat clear that easily. Folding a set here throws away a hand that wins most of the time.',
    read: [
      { about: 'preflop', text: 'The cutoff only cold-called your early raise, with players still to act. Most aces, kings and A-K would 3-bet, so the range is pairs, suited aces, broadways and suited connectors.' },
      { about: 'players', text: 'Four players saw the flop, so the cutoff’s flop call had to stand up to several ranges. By the river it’s heads-up, and they’re in position on you.' },
      { about: 'board', text: 'A♠J♠2♥ hits aces, jacks and spade draws. The 6♥ adds a heart draw, and the 8♥ puts three hearts out. The spades and wheel draws all missed.' },
      { about: 'sizing', text: 'A shove of 118 into 77.5 is an overbet. Players overbet with the nuts or with nothing: a hand like A-K would rather call or check back. The range is polarised.' },
      { about: 'range', text: 'For value they have heart flushes, 6-6 and 8-8, and two pairs like A-J and A-8 that they’ll shove because they think they’re good. For bluffs they have the missed spade draws and wheel draws, which can only win by betting.' },
    ],
    takeaway: 'Against a polarised overbet, a hand that beats the bluffs and some of the value is a call, even when a draw got there.',
  },
  'jacks-paired-river': {
    why: 'Fold: jacks only beat bluffs, and a big blind who leads the river after you check the turn almost always has a queen or better. Half pot needs you to win one time in four. The only bluffs are a few suited straight draws that missed, and many of those just give up. Raising doesn’t work either: after checking the turn you rarely have a queen, so a queen won’t fold.',
    read: [
      { about: 'preflop', text: 'The big blind defended with a caller in between, getting a good price. That’s a wide range of suited hands, broadways and pairs, with lots of queens. Q-Q, K-K and A-A would usually 3-bet.' },
      { about: 'position', text: 'The big blind is out of position. When an out-of-position player check-calls, checks the turn and then leads the river, they’re usually betting a hand they think is good into your weakness.' },
      { about: 'board', text: 'Q♣8♥6♦ is connected. Queens, eights, sixes and straight draws like T-9, 9-7 and 7-5 all continue. The 3♥ and 3♠ miss every draw, and the pair of threes changes nothing.' },
      { about: 'sizing', text: 'A half-pot lead is a value size. Live players lead small with a medium hand like a queen, hoping a pocket pair calls. Big bluffs are rare at this size.' },
      { about: 'range', text: 'For value: K-Q, Q-J, Q-T, Q-9, smaller suited queens, sometimes A-Q, plus 8-8, 6-6 and 8-6. Bluffs: only the missed straight draws, and only some of them bet.' },
    ],
    takeaway: 'When a passive player check-calls, checks, then leads the river into your turn check, expect a made hand that beats yours.',
  },
  'kings-double-paired': {
    why: 'Fold: the Q♣ turns every queen and jack in their range into trips or a full house, and those are the hands that called twice. Kings now only beat a few missed straight draws, and you hold two of the kings those draws need. A ¾-pot bet makes the price 30%, and you’re far short of that.',
    read: [
      { about: 'preflop', text: 'The hijack cold-called an early raise with six players behind. That range is pairs, suited aces and suited broadways: exactly the A-Q, K-Q, Q-J, A-J and K-J that love this board.' },
      { about: 'position', text: 'They’re in position and can check back for a free showdown. Medium hands like T-T or 9-9 would take it, so a bet means a strong hand or a bluff.' },
      { about: 'board', text: 'J♣J♦Q♠ is paired and full of broadways. It hits the cold-call range far more than it misses. The river Q♣ double-pairs the board, so any queen or jack now beats you.' },
      { about: 'sizing', text: 'A ¾-pot bet after you check is a value size. They want a call from the hand you just showed: an overpair or a weak queen.' },
      { about: 'range', text: 'For value: A-Q, K-Q, Q-T and Q-9; A-J, K-J, J-T and J-9; full houses with Q-J and 2-2. For bluffs: missed straight draws like T-9 and K-T, and your two kings block K-T.' },
    ],
    takeaway: 'When the river pairs a card their range is full of, an overpair is only a bluff catcher, and there are very few bluffs.',
  },
  'trip-aces-shove': {
    why: 'Fold: nothing under the gun shoves here is worse than you. A-K and A-Q have a bigger kicker, the full houses beat you, and A-J and A-T only split. You need 25%, and you never win outright. A passive check-call, check-call line that suddenly shoves is a value line, and your five kicker can’t beat it.',
    read: [
      { about: 'preflop', text: 'An under-the-gun open in a tournament is tight: big pairs, A-K down to A-T, and suited broadways. You cold-called with A-5 suited, a hand near the bottom of your own range.' },
      { about: 'position', text: 'Under the gun checked to you twice from out of position. With a strong ace, checking to the player who bets is the natural way to trap.' },
      { about: 'players', text: 'Three players saw a flop of two aces. With that many players, someone holding the last ace is likely, and the opener’s range has most of them.' },
      { about: 'board', text: 'A♥A♦4♣ is dry and favours the opener, who has far more aces. The K♦ and Q♠ improve their kickers and fill up K-K and Q-Q.' },
      { about: 'sizing', text: 'A shove after checking twice is the classic passive line that turns aggressive. It’s nearly always value: a player who checked every street rarely picks the river to bluff.' },
      { about: 'range', text: 'Their range is A-K and A-Q (better kickers), full houses with K-K, Q-Q, 4-4 and A-4, and A-J and A-T that chop. There are no bluffs.' },
    ],
    takeaway: 'Trips with a weak kicker are only a bluff catcher against a range full of strong aces; when a passive player shoves, fold.',
  },
  'queens-best-bluff-catcher': {
    why: 'Call: queens beat every missed draw, and they block Q-9, the straight you fear most. The big blind check-raised a turn full of draws and the ace missed all of them, so many of their shoves are bluffs. You need 36%, and the bluffs plus your blockers get you there. Aces would be a worse call here: they beat the same bluffs but block none of the straights.',
    read: [
      { about: 'preflop', text: 'The big blind defends wide against a cutoff open: suited hands, connectors and broadways. That means plenty of straight draws on a middle board.' },
      { about: 'board', text: 'J♣8♥5♦ is connected, and the T♠ puts four cards to a straight out. Q-9 and 9-7 make straights, and K-9, 9-8, 7-6 and 6-5 pick up draws. The A♥ completes nothing.' },
      { about: 'sizing', text: 'A turn check-raise means strong hands and draws that want to bet. The river shove is bigger than the pot, so it’s the nuts or nothing.' },
      { about: 'opponent', text: 'This is a creative player. They check-raise draws and keep firing when the draw misses, more than a passive player would.' },
      { about: 'range', text: 'For value: the straights Q-9 and 9-7, and some sets and two pair. For bluffs: K-9, 9-8, 7-6 and 6-5, draws that bricked. Your two queens remove half the Q-9 combos.' },
    ],
    takeaway: 'The best bluff catcher beats every bluff and blocks their strongest value hands, so choose the call with the hand that removes the nuts.',
  },
  'aq-blank-river': {
    why: 'Fold: you don’t even beat their bluffs. A-K, their main bluff, has you outkicked, and A-5 has a pair. The only bet you beat is a rare K-Q. A bluff catcher only works when it catches bluffs, and against a 3-bettor’s range on this board ace-queen catches almost none. The 30% price doesn’t matter when you lose to almost everything.',
    read: [
      { about: 'preflop', text: 'The small blind 3-bet your hijack open from out of position. That range is big pairs, A-K and A-Q, plus suited aces like A-5 and A-4 as bluffs that have some play.' },
      { about: 'players', text: 'A heads-up 3-bet pot: the pot is big compared with the stacks, so three bets get all the chips in.' },
      { about: 'board', text: 'J♦3♠2♥ is low and favours the 3-bettor, who has all the overpairs. The 5♦ makes a wheel for A-4 and a pair for A-5, and the 3♦ pairs the board.' },
      { about: 'sizing', text: 'A small flop bet, a bigger turn bet, then a shove for more than half the stack behind. Building the pot street by street is how strong hands play: they want all the chips by the river.' },
      { about: 'range', text: 'For value: overpairs, sets, A-J, K-J, and A-4 and A-5. Their bluffs are A-K, which beats your ace-queen anyway, and sometimes K-Q.' },
    ],
    takeaway: 'Before calling as a bluff catcher, check that you beat their bluffs; ace-high often doesn’t.',
  },
};

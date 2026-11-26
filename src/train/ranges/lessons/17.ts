import type { Lesson } from '../model';

export const L17: Record<string, Lesson> = {
  'weak-ace-call-lag-river-ace-barrel': {
    why: 'Call: a loose player who barrels this wide reaches the river with plenty of missed straight and club draws, and the ace is the perfect card to keep bluffing. Your ace beats all of those and every pair they turn into a bluff. Better aces, straights and sets beat you, but you need only about 28%.',
    read: [
      { about: 'preflop', text: 'A loose, aggressive regular opened the button and you defended A♦8♦. Their range is very wide, close to half of all hands.' },
      { about: 'opponent', text: 'A loose, aggressive regular keeps betting with draws and uses scare cards to bluff. Against them, call down wider.' },
      { about: 'board', text: 'T♣7♠6♥ is very connected. The 2♣ adds a club draw, and the A♠ pairs your ace and scares the hands you look like.' },
      { about: 'sizing', text: 'A small flop bet, half pot on the turn, then ⅔ pot on the ace. They expect you to hold a ten or a draw, and the ace is a card to make you fold.' },
      { about: 'range', text: 'Ahead of you: A-K, A-Q, A-J, A-T, A-9, A-7 and A-6; 9-8, T-T, 7-7 and 6-6. Behind you: missed straight and club draws, pairs turned into bluffs, and air.' },
    ],
    takeaway: 'An ace on the river is a scare card loose players love to bluff: a weak ace can call.',
  },
  'top-two-pair-fold-fish-river-lead-flush': {
    why: 'Fold: a passive player who has only called all hand now leads big on the flush card. That’s them telling you they have a flush, K-T or a set. They could hold a worse two pair, but nothing in their play says so. You need about 31%, and you’re rarely ahead.',
    read: [
      { about: 'preflop', text: 'You opened A♠Q♠ on the button and a loose, passive player called from the big blind, with plenty of suited junk in their range.' },
      { about: 'opponent', text: 'A loose, passive player calls with everything but only bets when they’re strong. Even they can see three diamonds.' },
      { about: 'board', text: 'A♦3♦Q♥ gave you top two pair with a diamond draw out. The 8♣ is a blank, and the J♦ completes the flush and K-T’s straight.' },
      { about: 'sizing', text: 'They called two bets, then led for most of the pot on the card that completed the draws. Changing from calling to leading is the read.' },
      { about: 'range', text: 'For value: diamond flushes, K-T and sets 3-3, 8-8 and J-J. Sometimes a worse two pair.' },
    ],
    takeaway: 'When a passive player who only called leads big on the card that completes the draws, believe them.',
  },
  'set-value-bet-river-calling-station-backdoor-flush': {
    why: 'Bet about ¾ pot: a calling station pays off with a wide range of worse hands, every queen, every nine and tens. The odd backdoor flush beats you, but checking out of fear costs far more. Their check doesn’t point to a strong hand. If they check-raise all in, your set is probably beaten.',
    read: [
      { about: 'preflop', text: 'You opened 7♥7♣ in the cutoff and a calling station defended the big blind.' },
      { about: 'opponent', text: 'A loose, passive calling station calls with any queen, any nine, tens and even ace high. They rarely raise without the nuts.' },
      { about: 'board', text: 'Q♦9♥7♠ gave you a set. The 3♠ and 2♠ complete a backdoor spade flush.' },
      { about: 'sizing', text: 'They called two bets and checked the river. A calling station with a flush might check too, but most of their range is one-pair hands.' },
      { about: 'range', text: 'A queen, a nine or tens call a normal bet. Missed gutshots like K-T, J-T, J-8, T-8 and 8-6 call only small. Spade flushes and bigger sets beat you.' },
    ],
    takeaway: 'Against a calling station, don’t let a scary card stop a value bet: their worse hands still call.',
  },
  'jack-high-probe-river-after-turn-check-back': {
    why: 'Bet about ¾ pot: their turn check means they mostly gave up with ace high, king high and small pairs, and those can’t call a bet. Jack high loses to most of that if you check. A bet folds out the better high cards; only their weak queens call.',
    read: [
      { about: 'preflop', text: 'A tight, aggressive player opened the button and you defended J♥9♥.' },
      { about: 'position', text: 'You’re out of position. You check-called the flop, and they checked back the turn, giving up the betting lead.' },
      { about: 'board', text: 'Q♣T♠5♦ gave you an open-ended straight draw. The 2♦ and 7♦ miss it and put three diamonds out.' },
      { about: 'sizing', text: 'A c-bet and then a turn check. A tight player checks back the turn with hands that gave up or want a cheap showdown.' },
      { about: 'range', text: 'Ace high and king high that gave up fold. A ten or a middle pair calls only small. A weak queen calls. Missed draws fold.' },
    ],
    takeaway: 'When they give up on the turn, a river bet can fold the better high cards that would win at a showdown.',
  },
  'ace-high-third-barrel-capped-big-blind': {
    why: 'Bet about ¾ pot: their range is full of jacks, small pairs and missed draws, and the king turns every jack into second pair. Those fold to a third bet; only a king calls. Ace high would lose to all those pairs at a showdown, so bet and make them fold.',
    read: [
      { about: 'preflop', text: 'You opened A♦3♦ from the small blind and a tight, aggressive big blind called. Their range is capped: no Q-Q or better, no A-K and probably no A-Q.' },
      { about: 'position', text: 'You’re out of position and bet every street. They called each time without raising.' },
      { about: 'board', text: 'J♣4♦2♦ has a diamond draw and wheel draws. The 8♠ adds straight draws, and the K♣ misses them all and brings an overcard to the jacks.' },
      { about: 'sizing', text: 'Two calls without a raise. Any set would have raised by now, so their range is jacks, small pairs and draws.' },
      { about: 'range', text: 'A jack (now second pair) calls only small. Eights, fours and deuces fold. Missed Q-T, T-9, Q-9 and T-7 fold. A king calls.' },
    ],
    takeaway: 'When the river turns their pairs into weaker pairs and their range is capped, a third bet folds them.',
  },
  'second-pair-call-maniac-river-ace': {
    why: 'Call: a maniac’s range is so wide there’s little point narrowing it. Aces and better jacks are a small part of it; pairs below yours, missed draws and air make up most of it. You only need about 20%, and you’re ahead most of the time.',
    read: [
      { about: 'preflop', text: 'You opened K♣J♣ on the button and a maniac called from the small blind with any two cards.' },
      { about: 'opponent', text: 'A maniac bets and calls with anything. Their lines don’t carry the meaning a normal player’s would.' },
      { about: 'board', text: 'J♠8♥2♠ gave you top pair. The 4♥ adds a heart draw, and the A♣ puts an ace over your jacks.' },
      { about: 'sizing', text: 'A pot-size lead, a one-big-blind turn bet, then a third of the pot on the river. Weird sizes all hand; the small river bet gives you a great price.' },
      { about: 'range', text: 'Ahead of you: an ace, two pair, sets and better jacks. Behind you: pairs below yours, missed draws and air.' },
    ],
    takeaway: 'Against a maniac, don’t narrow their range much: a decent pair calls at a good price.',
  },
  'full-house-overbet-river-passive-caller': {
    why: 'Overbet: their range is full of hands that just got there or were already good, trip tens, spade flushes and weaker full houses like T-5. A passive player calls with all of them and won’t fold for any price. Only T-T beats you. Bet as big as you can.',
    read: [
      { about: 'preflop', text: 'You opened J♥J♣ from the cutoff, 150 big blinds deep, and a loose, passive player called from the big blind.' },
      { about: 'opponent', text: 'A loose, passive recreational player calls with straight draws, flush draws, pairs and trips, and doesn’t fold them on the river.' },
      { about: 'board', text: 'J♠T♦2♠ gave you top set. The 5♦ is a blank, and the T♠ gives you jacks full and completes the spades.' },
      { about: 'sizing', text: 'They called two pot-size bets and checked the river. That’s draws, tens and medium pairs that are now flushes, trips and weaker full houses.' },
      { about: 'range', text: 'Trip tens, T-5, 5-5 and 2-2 full houses, and spade flushes call any size. Missed K-Q, Q-9 and 9-8 fold. Medium pairs call only small.' },
    ],
    takeaway: 'When a passive player’s calling hands improved too, bet as big as you can.',
  },
  'ace-king-fold-turn-check-raise-draw-board': {
    why: 'Fold: a check-raise on a card that completes this many draws is very rarely a bluff. It’s a straight, a flush, a set or two pair, and top pair is drawing thin against all of them. The worse aces you beat never play this way. You need about 21%, and you have far less.',
    read: [
      { about: 'preflop', text: 'You opened A♥K♥ under the gun and the big blind called: medium pairs, suited connectors and some suited aces and broadways, with no big pairs.' },
      { about: 'position', text: 'They’re out of position. They check-called the flop, then check-raised the turn.' },
      { about: 'board', text: 'A♦9♣7♦ gave you top pair on a draw-heavy board. The 8♦ completes J-T and 6-5 straights and the diamond flush.' },
      { about: 'sizing', text: 'A turn check-raise on the scariest card says they aren’t afraid of the board. A-J or A-T would never do this.' },
      { about: 'range', text: 'For value: J-T and 6-5; diamond flushes; 9-9, 8-8 and 7-7; A-9, A-8, A-7, 9-8 and 8-7. Some K♦ and Q♦ hands with a gutshot.' },
    ],
    takeaway: 'A check-raise on the card that completes many draws is rarely a bluff: fold top pair.',
  },
  'ace-high-check-turn-loose-passive-button': {
    why: 'Check: a second bet only works if they fold, and a loose, passive player who called the flop with a pair or one of the many draws on this board won’t. You’d be betting into hands that call and beat you or have plenty of ways to. Check and give up the bluff.',
    read: [
      { about: 'preflop', text: 'You opened A♥Q♥ from the cutoff and a loose, passive player called on the button.' },
      { about: 'opponent', text: 'A loose, passive player calls with weak pairs and any draw. They didn’t fold on the flop, so they won’t fold on the turn either.' },
      { about: 'position', text: 'You’re out of position, so you act first on every street.' },
      { about: 'board', text: 'J♦7♠2♦ has a diamond draw. The 8♠ adds a spade draw and straight draws.' },
      { about: 'sizing', text: 'They called a small c-bet. On a board with this many draws, a passive player’s call is wide and sticky.' },
      { about: 'range', text: 'A jack, a seven or another pair calls. Diamond and straight draws call. Only overcards that called once fold.' },
    ],
    takeaway: 'Don’t bluff a loose, passive player who doesn’t fold: check and give up.',
  },
  'weak-ace-call-river-shove-three-bet-pot': {
    why: 'Call: their value is the better aces, Q-Q and 6-6. The board pair means your 4 no longer plays, so weaker aces split with you. Against that sit all the spade draws, and K-J, K-T and 5-4 that missed. You need about 27%, and you’re ahead or splitting most of the time.',
    read: [
      { about: 'preflop', text: 'You 3-bet A♥4♥ from the small blind against a button open, and they called.' },
      { about: 'position', text: 'You’re out of position and check-called every street. They kept the lead.' },
      { about: 'board', text: 'A♠6♦3♠ gave you top pair with a spade draw out. The Q♥ adds broadway draws, and the 3♦ pairs the board, so your kicker no longer plays.' },
      { about: 'sizing', text: 'A small flop bet, a big turn bet, then a shove for about 60% of the pot. A third barrel is often strong, but it also comes from draws that missed.' },
      { about: 'range', text: 'Ahead of you: A-K, A-Q, A-6, Q-Q and 6-6. Split: weaker aces. Behind you: busted spade draws, and K-J, K-T and 5-4.' },
    ],
    takeaway: 'When a pair on the board kills your kicker, splits still count: against many missed draws, call.',
  },
};

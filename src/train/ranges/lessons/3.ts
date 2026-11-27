import type { Lesson } from '../model';

export const L3: Record<string, Lesson> = {
  'top-two-four-straight': {
    why: 'Check: a bet only gets called by hands that beat you. Any jack has a straight, and A-K and sets are ahead too. The weaker two pairs and one-pair hands you want to pay you will fold. Nothing better folds either, so betting has no bluff value. Check, and if a live player then shoves, believe them and fold.',
    read: [
      { about: 'preflop', text: 'The hijack cold-called your under-the-gun raise at a live table: pairs, suited aces, broadways and suited connectors. Many of those hands hold a jack.' },
      { about: 'position', text: 'You’re out of position, so you act first on the river. They’ve called twice, which keeps every strong hand and draw in their range.' },
      { about: 'board', text: 'A♣Q♠T♦ is a wet broadway board: every jack has a straight draw. The 8♣ adds J-9 and club draws, and the K♠ puts four to a straight out, so any jack makes broadway.' },
      { about: 'sizing', text: 'Two calls of your bets mean a made hand or a draw that hasn’t given up. Players don’t call two bets on this board with nothing.' },
      { about: 'range', text: 'Ahead of you: every jack (a straight), A-K and sets. Behind you: weaker two pairs like A-T, Q-T, K-T and A-8, and one pairs like A-9 and Q-9, which fold to a bet.' },
    ],
    takeaway: 'Bet only when worse hands will call: on a four-straight board, take two pair to a cheap showdown.',
  },
  'second-nuts-capped-range': {
    why: 'Bet about ¾ pot: their range is capped at two pair, so size for the hands that can pay. A player who led the flop and the turn and then checks the river rarely holds a straight; that hand would keep betting. Two pair and the best top pairs call a solid bet, but an overbet folds them. A small bet is also fine, just a little less profitable.',
    read: [
      { about: 'preflop', text: 'The big blind defended a lojack open with a wide range, helped by the ante. Plenty of connected hands like J-T, T-9 and 9-8 are in it.' },
      { about: 'position', text: 'You’re in position. They led into you twice from out of position, then checked: the bet that would follow their strongest hands never came.' },
      { about: 'board', text: 'J♥T♣8♣ is very connected, with a club draw. The 4♦ is a blank, and the 9♦ gives you Q-J-T-9-8, the second-best straight. Only K-Q beats you.' },
      { about: 'sizing', text: 'Lead, lead, check is a capped line. With a straight they’d bet again or check-raise rarely; checking says one pair or two pair.' },
      { about: 'range', text: 'Two pair (J-T, J-9, T-9, J-8, T-8) calls most sizes but not an overbet. Top pairs like A-J and K-J call only small. Tens, eights and missed club draws fold. Now and then a straight checks to trap.' },
    ],
    takeaway: 'Against a capped range, choose a value bet their best one-pair and two-pair hands can still call.',
  },
  'top-pair-river-shove': {
    why: 'Shove: worse tens, eights and pairs with a diamond will call, and your stack is only about the size of the pot. Checking would often win, but it wins less: those hands wouldn’t bet themselves. With so little behind, a smaller bet just leaves chips on the table. Put it in and let them make the decision.',
    read: [
      { about: 'preflop', text: 'The cutoff and the big blind called your lojack open: pairs, suited broadways, suited aces and connectors. Their best hands would 3-bet.' },
      { about: 'players', text: 'Three players saw a flop that checked through, so nobody showed strength. Then the big blind folded the turn, leaving you heads-up against the cutoff.' },
      { about: 'board', text: 'T♥8♦5♦ is wet. The 3♦ completes the diamonds, and the 4♥ changes nothing for the hands that matter.' },
      { about: 'sizing', text: 'The cutoff only called your half-pot turn bet. With a flush or a set, most tournament players raise on a board this wet, so their call is mostly one pair, often with a diamond.' },
      { about: 'range', text: 'Ahead of you: A-T, and the odd slow-played flush or set. Behind you and calling: Q-T, J-T, T-9, 9-8, 8-7 and some smaller pairs. Big cards with no pair fold.' },
    ],
    takeaway: 'When your stack is about the size of the pot and worse hands will call, shove.',
  },
  'trips-sizing-river': {
    why: 'Bet about ¾ pot: betting is clearly best, but size it for the hands that pay. Pocket pairs call a medium bet and fold to an overbet, and the missed draws fold to anything. Their better kings call any size, so a huge bet gains nothing there. When their range is mostly missed draws and medium hands, don’t bet big.',
    read: [
      { about: 'preflop', text: 'Both blinds called your early open. The small blind’s flat is pairs, suited aces, suited broadways and connectors. Their best hands would usually 3-bet.' },
      { about: 'players', text: 'Three players took the flop, which is why your bets stayed small: in multiway pots a small bet gets called by more worse hands. The big blind folded the turn.' },
      { about: 'board', text: '5♣4♣2♦ is low with flush and straight draws. The K♦ gives you top pair, and the K♥ gives you trips. The draws missed.' },
      { about: 'sizing', text: 'The small blind check-called twice: medium pairs that want a showdown, and draws. Their check on the river means they won’t bet the hands that call you.' },
      { about: 'range', text: 'Pocket pairs call a medium bet but fold to a big one. A-5 and A-4 call only small. A-K and K-Q beat you, and K-T is worse and calls. The missed club and straight draws fold.' },
    ],
    takeaway: 'Size for the hands that pay: when their callers are medium pairs, a medium bet wins more than an overbet.',
  },
  'trips-check-fold': {
    why: 'Check: a bet gets called by every hand that beats you and folded by the pairs you beat. The A♥ completed broadway for K-J and filled up A-Q, the exact hands that kept calling. A tight player also won’t bluff into a hand that check-raised the flop, so a bet from them is real. Check, and fold to a big bet.',
    read: [
      { about: 'preflop', text: 'A tight button who’s been opening only strong hands raised and you defended. Their range is broadways, pairs and strong aces.' },
      { about: 'opponent', text: 'A tight-aggressive player calls a check-raise with a real hand and rarely bluffs into strength. Their calls and bets tell you more than a loose player’s.' },
      { about: 'board', text: 'Q♥Q♣T♦ is paired and broadway. The 8♠ gives J-9 a straight, and the A♥ completes broadway for K-J and gives A-Q a full house.' },
      { about: 'sizing', text: 'They called your flop check-raise and a solid turn bet. On this board that’s a queen, a ten, a straight, or a big draw to broadway.' },
      { about: 'range', text: 'Ahead of you: K-J and J-9 straights, full houses like A-Q, Q-T, T-T and Q-8, aces full, and K-Q. Q-J splits. Behind you: Q-9, A-K, A-J, kings, jacks and A-T, and all of those fold to a bet except Q-9.' },
    ],
    takeaway: 'Ask who calls: if only better hands do, check, and believe a tight player who then bets.',
  },
  'nines-full-check-raise': {
    why: 'Fold: almost everything that check-raises all in here beats you. Every king has quads, and A-A, Q-Q, J-J and T-T are bigger full houses. You only beat 2-2 and a rare bluff. You need 29%, and you’re far short. Folding a full house feels wrong, but the board made it easy for them to hold better.',
    read: [
      { about: 'preflop', text: 'The hijack opened and you called. Their range is pairs, suited aces and broadways, with all the big pairs.' },
      { about: 'position', text: 'They’re out of position and checked the flop. On K♣K♦2♠ a preflop raiser often checks kings and big pairs to trap or to keep the pot small, so the check wasn’t weakness.' },
      { about: 'board', text: 'K♣K♦2♠ is paired and dry. The 9♥ gives you two pair, and the K♥ gives you kings full of nines. Now any king is quads and any bigger pair is a bigger full house.' },
      { about: 'sizing', text: 'A river check-raise all in after you bet is the strongest line in poker. It’s almost never a bluff, because a bluff would usually just bet or give up.' },
      { about: 'range', text: 'Quads with any king; A-A, Q-Q, J-J and T-T full; 9-9 splits with you. 2-2 is the only full house you beat, plus a rare bluff.' },
    ],
    takeaway: 'A river check-raise all in is value almost every time; when the board makes better hands easy, even a full house can fold.',
  },
  'ak-hearts-river-raise': {
    why: 'Fold: your two hearts are exactly the cards their bluffs need. The raise is full houses, quads and K-Q’s straight for value, and missed heart draws for bluffs. Holding the A♥ and K♥ removes the best of those draws, so you block their bluffs and none of their value. You need 33% and you’re short; the same A-K without hearts would be a call.',
    read: [
      { about: 'preflop', text: 'The cutoff and the big blind called your open: pairs, suited broadways, suited aces, A-J and better, and K-Q.' },
      { about: 'players', text: 'Three players took the flop, so a small c-bet with top pair top kicker was right. The big blind folded, leaving the cutoff in position on you.' },
      { about: 'board', text: 'A♠J♥T♦ is broadway and connected. The 5♥ adds a heart draw, and the J♠ pairs the board, so T-T, J-T and A-J are now full houses.' },
      { about: 'sizing', text: 'Your small bets kept their range wide. A big river raise over a small bet is polarised: a very strong hand, or a bluff that can’t win any other way.' },
      { about: 'opponent', text: 'A strong regular knows they need bluffs here, and missed heart draws are the natural choice. That’s why your heart blockers matter so much.' },
      { about: 'range', text: 'For value: T-T, J-T and A-J (full houses), J-J (quads) and K-Q (a straight). For bluffs: missed heart draws, and your A♥K♥ blocks most of them.' },
    ],
    takeaway: 'Check which bluffs your cards remove: holding the cards their bluffs need makes a call worse.',
  },
  'aq-overbet-shove': {
    why: 'Call: against a shove for more than the pot you have to keep about 45% of your range, and A-Q is near the top of it. Their value is Q-9, and your queen blocks some of it. Their bluffs are every missed diamond draw plus J-T, K-J and K-T, and you block none of those. You need 36%, and you’re well above that.',
    read: [
      { about: 'preflop', text: 'Blind against blind, the big blind defends very wide: suited hands, connectors and broadways. The small blind opens wide too, so both ranges are wide.' },
      { about: 'position', text: 'You’re out of position for the whole hand. That makes it easier for an aggressive player to keep firing at you.' },
      { about: 'board', text: '9♠Q♦4♦ has a diamond draw and straight draws for J-T, K-J and K-T. The 5♠ changes little, and the 5♥ pairs the board and misses every draw.' },
      { about: 'sizing', text: 'A flop check-raise, a turn bet and a river shove for more than the pot is polarised. Medium hands don’t take this line; it’s strong hands and draws that missed.' },
      { about: 'opponent', text: 'An aggressive regular uses missed draws as bluffs, and on a river that bricks every draw they have plenty of them.' },
      { about: 'range', text: 'For value: Q-9. For bluffs: missed diamond draws, and some J-T, K-J and K-T. Your Q♠ removes some of their Q-9.' },
    ],
    takeaway: 'Against a polarised overbet, keep enough strong hands in to stop them bluffing profitably; top pair top kicker is one of them.',
  },
  'ak-four-straight-call': {
    why: 'Call: they hold the straights, but they also bet two pair below yours, and you’re too high in your range to fold. A ¾-pot lead gives you a price of 30%. If their range were mostly straights, a good player would overbet to make you pay. A normal size says it’s mixed with weaker two pairs.',
    read: [
      { about: 'preflop', text: 'The hijack called your button 3-bet: pairs, suited broadways, A-Q and suited aces. A-A, K-K and most A-K would 4-bet, so their range is capped.' },
      { about: 'position', text: 'You have position. They checked the flop and the turn, then led the river: the change of pace is the card, not a plan from the start.' },
      { about: 'board', text: 'J♣3♠Q♦ hits broadways. The A♣ turn and the K♥ river put four to a straight out: any ten has broadway.' },
      { about: 'sizing', text: 'A ¾-pot lead is a normal value size. With a range full of the nuts, players overbet; a standard size points to a mix of straights and two pairs.' },
      { about: 'range', text: 'For value: Q-T and J-T straights. Also betting: two pairs below yours, A-Q, K-Q, A-J and K-J, which think they’re good.' },
    ],
    takeaway: 'When the river completes a straight, ask how often they really hold it and whether their bet size looks like the nuts.',
  },
  'aces-multiway-shove': {
    why: 'Call: you need only 18%. Calling 70 to win 385 needs very little, and their range still holds plenty of missed draws and weaker made hands that you beat. Sets, two pair, J-T and Q-Q are ahead, but a loose player raises the turn with much more than that. At this price, folding would be a big mistake.',
    read: [
      { about: 'preflop', text: 'Two players called your raise at a loose table: wide ranges full of suited hands, pairs and connectors.' },
      { about: 'players', text: 'Three players saw the flop, so your bets got called by a wide spread of hands. The big blind folded to the turn raise.' },
      { about: 'board', text: '9♦8♦3♠ is wet: flush draws, open-enders and gutshots. The 2♣ is a blank, and the Q♥ misses every draw except J-T, which makes a straight.' },
      { about: 'sizing', text: 'A small shove of 70 into 245 offers a big price. When the price is that good, you don’t need to be ahead often.' },
      { about: 'opponent', text: 'A loose player raises the turn with sets and two pair, but also with big draws and hands like A-9 or T-T. That widens the range a lot.' },
      { about: 'range', text: 'Ahead of you: sets, two pair, J-T and Q-Q. Behind you: A-9, T-T, J-J and kings. Bluffs: missed flush draws and straight draws like 7-6.' },
    ],
    takeaway: 'When the price is tiny, call with any hand that beats a fair part of their range; you don’t need to be sure.',
  },
};

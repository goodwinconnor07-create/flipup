import type { Lesson } from '../model';

export const L10: Record<string, Lesson> = {
  'ace-high-check-river-vs-flop-raiser': {
    why: 'Check: a bet only gets called by overpairs, trips and straights, which beat you, and it folds the missed draws you could beat. Your ace high has a little showdown value, and checking lets their busted draws bluff into you. A bluff can’t work against hands that never fold. Never shove here.',
    read: [
      { about: 'preflop', text: 'You min-raised the cutoff with 33 big blinds and the button called: pairs, suited aces, broadways and connectors.' },
      { about: 'position', text: 'They’re in position. They raised the flop, then checked back the turn, which slows their range down.' },
      { about: 'board', text: '5♣4♣4♥ is paired with a club draw. The Q♦ is a blank, and the 6♦ makes straights for 7-3, 8-7 and 3-2.' },
      { about: 'sizing', text: 'A flop raise means overpairs, trips and club draws. Checking the turn after raising usually means a made hand happy to see a showdown, or a draw that wanted a free card.' },
      { about: 'range', text: 'Overpairs, trips, full houses and straights call any bet. Missed club draws fold, and the ones with an ace or a queen beat you anyway.' },
    ],
    takeaway: 'Don’t bluff into hands that never fold; with a little showdown value, check and let missed draws bluff.',
  },
  'king-high-fold-blocks-bluffs': {
    why: 'Fold: king high only beats their bluffs, and there are very few of them. Their most natural bluffs are K-x hands, and your K♥ removes some of those. The price is good, a fifth of the pot, but you’re ahead far less often than one time in five. King-ten goes in the muck.',
    read: [
      { about: 'preflop', text: 'Five-handed at a final table, you opened the button and the big blind defended with a wide range.' },
      { about: 'position', text: 'You’re in position, and the flop checked through. The big blind then led the turn and the river.' },
      { about: 'board', text: 'Q♣8♣6♦ has a club draw. The 6♣ puts three clubs out and pairs the board, and the 7♠ makes straights for T-9, 9-5 and 5-4.' },
      { about: 'sizing', text: 'A small turn lead and a third-pot river bet. Small bets are often value that wants a call, and they give bluffs only a small reason to exist.' },
      { about: 'opponent', text: 'A final-table pro knows that few hands are worse than king high here. Their small bet is aimed at hands that can call it, not at hands like yours.' },
      { about: 'range', text: 'For value: club flushes, trip sixes, full houses, T-9, 9-5 and 5-4 straights, and top pairs. For bluffs: K-x and J-x hands with nothing.' },
    ],
    takeaway: 'When your hand blocks their bluffs, even a good price isn’t enough.',
  },
  'straight-raise-river-paired-board': {
    why: 'Check-raise: most of their small value bets are trip queens and two pair with a jack, and your straight beats them. The pair on the river makes full houses possible, but those are a small part of what bets. Trips will call a raise. Just calling leaves their value on the table.',
    read: [
      { about: 'preflop', text: 'Three-handed, the button opened and you defended your big blind. Their range is very wide.' },
      { about: 'position', text: 'You’re out of position. The flop checked through, you led the turn and they called, and then you checked the river to them.' },
      { about: 'board', text: 'J♠7♦9♥ is connected. The Q♦ gave you a king-high straight, and the Q♠ pairs the board, so full houses are possible.' },
      { about: 'sizing', text: 'A small river bet after calling the turn is thin value: a queen or a jack that wants to be paid by worse.' },
      { about: 'opponent', text: 'An elite player bets small with lots of medium-strong hands on paired rivers. Those hands are good to raise.' },
      { about: 'range', text: 'Behind you: trip queens, two pair with a jack, and T-8, a lower straight. Ahead of you: full houses.' },
    ],
    takeaway: 'When their small bet is mostly hands you beat that won’t fold, raise.',
  },
  'quads-river-overbet-vs-aces': {
    why: 'Overbet: every ace they hold calls, whatever you bet; trip aces and full houses are almost impossible to fold. An overbet wins far more from those hands than it loses from the pairs that would only call small. Missed heart draws fold to anything. Bet big.',
    read: [
      { about: 'preflop', text: 'A big-stacked pro opened and you called in the hijack with a small pair. Four players saw the flop.' },
      { about: 'players', text: 'Four took the flop, but only you called the bet. A small bet into a big field often comes from a strong ace.' },
      { about: 'board', text: 'A♠A♥3♥ gave you a full house, and the 3♦ gave you quads. The Q♠ makes Q-Q a full house.' },
      { about: 'sizing', text: 'They bet small twice and then checked the river. That’s aces and pairs taking a careful line, plus draws that gave up.' },
      { about: 'range', text: 'An ace and big pairs like K-K and Q-Q call any bet. Smaller pairs and a queen call only small. Missed heart draws fold.' },
    ],
    takeaway: 'When their best hands can’t fold, overbet.',
  },
  'aces-full-fold-river-raise': {
    why: 'Fold: a shove over your small lead is only quads or a seven, and both beat aces full. Nothing worse shoves here. Your block bet was smart, but they answered with the strongest move there is. You need 26%, and you never win.',
    read: [
      { about: 'preflop', text: 'A tight under-the-gun player opened, you flatted with aces, and five of you saw the flop.' },
      { about: 'players', text: 'Five players saw the flop; the bettor kept firing into several of them. In a big multiway pot, strong bets mean strong hands.' },
      { about: 'board', text: '7♠4♣4♠ is paired. The 4♥ puts trip fours out, and the 7♣ makes fours full of sevens on the board. Any seven is now sevens full, and the last four is quads.' },
      { about: 'sizing', text: 'Your small lead was a block bet. A thinking pro who raises all in over it is saying they beat every full house.' },
      { about: 'opponent', text: 'A thinking pro knows a small lead is meant to set a cheap price. They only raise it all in with a hand that can’t lose.' },
      { about: 'range', text: 'Quads with the last four, quad sevens, and sevens full. All of them beat aces full.' },
    ],
    takeaway: 'When the only hands that raise all beat you, fold even a full house.',
  },
  'trip-eights-pot-bet': {
    why: 'Call: most of what you beat here is missed heart draws, and there are a lot of them. You need about a third, and you’re ahead more often than that. Don’t raise: the missed draws fold to a raise, and the hands that call it (better trips, full houses, straights) mostly beat you.',
    read: [
      { about: 'preflop', text: 'You opened the hijack with a suited connector, and the button and the big blind called.' },
      { about: 'position', text: 'They’re in position and called two bets, then bet the pot when you checked the river.' },
      { about: 'board', text: '8♥8♣5♥ gave you trips with a heart draw out. The 2♠ changed nothing, and the 4♣ missed the hearts but made 7-6 and A-3 straights.' },
      { about: 'sizing', text: 'A pot-size bet after you check is polarised: a strong hand or a missed draw that can only win by betting.' },
      { about: 'range', text: 'Ahead of you: A-8, T-8, 9-8, full houses with 5-5, 4-4 and 2-2, and the 7-6 and A-3 straights. Behind you or splitting: 8-6 and 8-7, rare overpairs, and missed heart draws.' },
    ],
    takeaway: 'When most of what you beat is missed draws, call: a raise folds the bluffs and only gets called by better.',
  },
  'top-pair-four-flush-fold': {
    why: 'Fold: on most boards top pair calls here, but not with four clubs out. The button has plenty of strong clubs, and they keep betting as if you can’t have one. You beat only a few bluffs, well under the quarter you need. Their line has no fear in it, and that’s the read.',
    read: [
      { about: 'preflop', text: 'You opened the cutoff with K-T and both the button and the big blind called. The button’s range is pairs, suited hands and broadways.' },
      { about: 'position', text: 'They’re in position. You checked and called every street, which keeps the pot smaller but lets them keep betting.' },
      { about: 'board', text: 'K♠6♣5♣ has a club draw. The 3♣ puts three clubs out, and the 8♣ puts four out: any club makes a flush.' },
      { about: 'sizing', text: 'Three bets of about half the pot. A player worried about a flush would slow down on the fourth club; one who keeps betting usually has one.' },
      { about: 'range', text: 'For value: strong clubs, sets and kings with a better kicker. For bluffs: missed wheel draws, ace high and a few pairs below the king.' },
    ],
    takeaway: 'When the board gets scary and they keep betting as if you can’t have it, fold one pair.',
  },
  'marginal-top-pair-induced-raise': {
    why: 'Call: this raise is the action your small bet invited. You hold no hearts, so you don’t block any of the missed heart draws they’d bluff with, and a loose-aggressive player has plenty of them. You need about a third, and you’re ahead more often than that.',
    read: [
      { about: 'preflop', text: 'A tight under-the-gun player opened, a loose-aggressive cutoff called, and you called in the big blind.' },
      { about: 'opponent', text: 'A loose-aggressive player attacks small bets with raises, as bluffs as well as for value.' },
      { about: 'players', text: 'Three saw the flop. The opener checked and folded, so the loose cutoff is the one you’re against.' },
      { about: 'board', text: 'J♥6♦4♥ has a heart draw. The 7♣ adds straights, and the 6♠ pairs the board, so full houses are possible.' },
      { about: 'sizing', text: 'Your tiny river bet invites a raise. A big raise over it is polarised: full houses and quads, or missed draws.' },
      { about: 'range', text: 'For value: 7-7, 4-4, J-J and 6-6, and some better jacks. For bluffs: missed heart draws, K-Q and missed straight draws.' },
    ],
    takeaway: 'When your small bet invites a raise, call if you don’t block their bluffs.',
  },
  'top-pair-ace-river-chop': {
    why: 'Call: most hands that bet here are aces that split the pot with you. A-K and a few full houses beat you, and few kings are left after their turn check. Folding gives up a pot you often share. Raising doesn’t work: the aces you split with won’t fold, and a big raise only gets called by better.',
    read: [
      { about: 'preflop', text: 'You defended the big blind against an under-the-gun open, a strong range of big pairs and big aces.' },
      { about: 'position', text: 'You’re out of position and checked every street. They checked back the flop and the turn before betting the river.' },
      { about: 'board', text: '5♠5♦3♣ is paired and dry. The K♠ adds kings, and the A♦ gives every ace two pair, aces and fives with a king kicker.' },
      { about: 'sizing', text: 'Two checks, then ⅔ pot when the ace lands. That’s mostly an ace betting for value.' },
      { about: 'range', text: 'Split: A-Q, A-J, A-T, A-8, A-4 and A-3. Ahead of you: A-K, A-5, slow-played 3-3 and 5-5, and some slow-played aces and kings. Behind you: a few kings and pairs trying to take it down.' },
    ],
    takeaway: 'When most of their bets split with you, calling is cheap; a raise only gets called by better.',
  },
  'trip-nines-shoved-on': {
    why: 'Fold: you bet the pot on a scary board and a regular moved all in anyway. Your five doesn’t play, so every better nine beats you, and so does every full house. Trips here only catch bluffs, and a regular raising all in rarely has one. You need 35%, and you’re far short.',
    read: [
      { about: 'preflop', text: 'A regular opened the cutoff and you defended the big blind with a suited nine.' },
      { about: 'position', text: 'You’re out of position and led every street. They called twice, then raised all in.' },
      { about: 'board', text: '9♣8♦4♠ is connected. The 7♣ adds a club draw and straights, and the 9♥ gives you trips with a weak kicker.' },
      { about: 'sizing', text: 'An all-in raise over a pot-size bet is the strongest line there is. Regulars don’t raise all in with a weaker nine.' },
      { about: 'opponent', text: 'An online regular knows your pot bet is strong. Raising all in over it as a bluff is rare.' },
      { about: 'range', text: 'For value: full houses with 8-8, 7-7, 4-4 and 9-7, and nines with a better kicker. Bluffs: a few missed club draws.' },
    ],
    takeaway: 'When you bet big and a regular shoves over the top, fold weak trips.',
  },
};

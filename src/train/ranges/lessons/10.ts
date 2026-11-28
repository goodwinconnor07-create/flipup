import type { Lesson } from '../model';

export const L10: Record<string, Lesson> = {
  'ace-high-check-river-vs-flop-raiser': {
    why: 'Check: a bet only gets called by overpairs, trips and straights, which beat you, and it folds the missed draws you might beat. Ace high has a little showdown value, and checking lets their busted draws bluff into you. A bluff can’t work against hands that never fold.',
    streets: [
      { street: 'preflop', text: 'You min-raise A♠3♠ from the cutoff with 33 big blinds, and the button calls.', range: 'Pairs, suited aces, broadways and suited connectors.' },
      { street: 'flop', text: 'On 5♣4♣4♥ you c-bet with a backdoor draw and they raise; you call. Overpairs, trips and club draws all raise here.', range: 'Overpairs, trips, club draws, straight draws like 7-6 and 6-3.' },
      { street: 'turn', text: 'The Q♦ checks through. Checking back after a flop raise usually means a made hand happy to show down, or a draw taking a free card.', range: 'Overpairs, trips, club and straight draws.' },
      { street: 'river', text: 'The 6♦ makes straights for 7-3, 8-7 and 3-2. Their made hands never fold; their missed draws would fold to a bet, and might bluff if you check.', range: 'Call any bet: overpairs, trips, full houses, straights. Fold: missed club draws, some of which beat you anyway.' },
    ],
    takeaway: 'Don’t bluff into hands that never fold; with a little showdown value, check and let missed draws bluff.',
  },
  'king-high-fold-blocks-bluffs': {
    why: 'Fold: king high only beats their bluffs, and there are very few of them. Their most natural bluffs are K-x hands, and your K♥ removes some of those. The price is good, a fifth of the pot, but you’re ahead far less than one time in five.',
    streets: [
      { street: 'preflop', text: 'Five-handed at a final table, you open K♥T♣ on the button and the big blind defends wide.', range: 'Suited hands, broadways, pairs and connectors.' },
      { street: 'flop', text: 'Q♣8♣6♦ checks through: you take a free card with king high and a backdoor club draw. Their check keeps their range wide.', range: 'Queens, eights, sixes, draws and air.' },
      { street: 'turn', text: 'The 6♣ puts three clubs out and pairs the board. They lead small, and with king high and a club you call.', range: 'Trip sixes, flushes, queens, eights, straight draws, a few bluffs.' },
      { street: 'river', text: 'The 7♠ makes straights for T-9, 9-5 and 5-4, and they bet a third of the pot. A small bet like this is usually value wanting a call, and few hands are worse than king high to bluff with.', range: 'Value: club flushes, trip sixes, full houses, T-9, 9-5, 5-4, queens. Bluffs: K-x and J-x with nothing.' },
    ],
    takeaway: 'When your hand blocks their bluffs, even a good price isn’t enough.',
  },
  'straight-raise-river-paired-board': {
    why: 'Check-raise: most of their small value bets are trip queens and two pair with a jack, and your straight beats them. Full houses are possible, but they’re a small part of what bets, and trips will call a raise. Just calling leaves their value on the table.',
    streets: [
      { street: 'preflop', text: 'Three-handed, an elite high roller opens the button to 2.2, and you defend K♣T♠ from the big blind.', range: 'The button: very wide.' },
      { street: 'flop', text: 'J♠7♦9♥ checks through; you have a gutshot and an overcard. An elite player bets most strong hands on a board this connected, so their check is weaker hands.', range: 'Jacks, nines, sevens, draws and air; few strong hands.' },
      { street: 'turn', text: 'The Q♦ gives you a king-high straight. You lead 3.5 and they call.', range: 'Queens, jacks, two pairs, sets, T-8 (a lower straight), draws.' },
      { street: 'river', text: 'The Q♠ pairs the board. You check and they bet small. An elite player bets small with lots of medium-strong hands on a paired river, plus a few full houses.', range: 'Behind you: trip queens, two pair with a jack, T-8. Ahead of you: full houses.' },
    ],
    takeaway: 'When their small bet is mostly hands you beat that won’t fold, raise.',
  },
  'quads-river-overbet-vs-aces': {
    why: 'Overbet: every ace they hold calls whatever you bet; trip aces and full houses are almost impossible to fold. An overbet wins far more from those hands than it loses from the pairs that only call small, and missed heart draws fold to anything.',
    streets: [
      { street: 'preflop', text: 'A big-stacked pro opens middle position, you call in the hijack with 3♣3♠, and two more call. Four see the flop.', range: 'Big pairs, big aces, suited broadways and suited connectors.' },
      { street: 'flop', text: 'You flop a full house on A♠A♥3♥. They bet a third of the pot and only you call. A small bet into a big field often comes from a strong ace.', range: 'Aces, big pairs, heart draws, some air.' },
      { street: 'turn', text: 'The 3♦ gives you quads. They bet small again, and you just call: a raise only gets called by aces, and calling keeps their pairs betting.', range: 'Aces, big pairs, heart draws.' },
      { street: 'river', text: 'The Q♠ makes Q-Q a full house, and they check. Their aces and full houses won’t fold to anything; their smaller pairs call only small.', range: 'Call any bet: an ace, K-K, Q-Q. Small only: smaller pairs and a queen. Fold: missed heart draws.' },
    ],
    takeaway: 'When their best hands can’t fold, overbet.',
  },
  'aces-full-fold-river-raise': {
    why: 'Fold: a shove over your small lead is only quads or a seven, and both beat aces full. Nothing worse shoves here. Your block bet was clever, but they answered with the strongest move there is: you need 26% and you never win.',
    streets: [
      { street: 'preflop', text: 'A tight player opens under the gun, you just call with A♦A♥, and three more call. Calling with aces keeps the pot big but means facing many hands.', range: 'Wide across the field: pairs, suited hands and broadways.' },
      { street: 'flop', text: 'On 7♠4♣4♠ you check, the player behind bets, the button calls and you call. Betting into four players shows a real hand.', range: 'Sevens, fours, overpairs, spade and straight draws.' },
      { street: 'turn', text: 'The 4♥ puts trip fours out. They bet ⅔ pot and you call. Only a seven or a straight flush draw has any chance against a four now.', range: 'A four (quads), sevens (full houses), overpairs, some draws.' },
      { street: 'river', text: 'The 7♣ gives you aces full and puts fours full on the board. You lead small to block, and they shove. A thinking pro raises a block bet all in only with a hand that beats every full house.', range: 'The last four, quad sevens, sevens full: all beat aces full.' },
    ],
    takeaway: 'When the only hands that raise all beat you, fold even a full house.',
  },
  'trip-eights-pot-bet': {
    why: 'Call: most of what you beat is missed heart draws, and there are a lot of them. You need about a third, and you’re ahead more often. Don’t raise: the missed draws fold to a raise, and the hands that call it mostly beat you.',
    streets: [
      { street: 'preflop', text: 'You open 8♦7♦ from the hijack with 50 big blinds; the button and the big blind call.', range: 'Pairs, suited hands, broadways and connectors.' },
      { street: 'flop', text: 'You flop trips on 8♥8♣5♥ and the button calls your c-bet.', range: 'Heart draws, straight draws, pairs, eights like A-8, T-8 and 9-8.' },
      { street: 'turn', text: 'The 2♠ changes nothing. You bet 9 into 14 and they call again; heart draws are still a big part of their range.', range: 'Heart draws, eights, pairs, 5-5, straight draws like 7-6 and A-3.' },
      { street: 'river', text: 'The 4♣ misses the hearts but makes 7-6 and A-3 straights. You check and they bet the pot: a strong hand, or a missed draw that can only win by betting.', range: 'Ahead: A-8, T-8, 9-8, 5-5, 4-4, 2-2, 7-6, A-3. Behind or split: 8-6, 8-7, rare overpairs, missed heart draws.' },
    ],
    takeaway: 'When most of what you beat is missed draws, call: a raise folds the bluffs and only gets called by better.',
  },
  'top-pair-four-flush-fold': {
    why: 'Fold: top pair usually calls here, but not with four clubs out. The button holds plenty of strong clubs and keeps betting as if you can’t have one. You beat only a few bluffs, well under the quarter you need.',
    streets: [
      { street: 'preflop', text: 'You open K♥T♦ from the cutoff; the button and the big blind call.', range: 'Pairs, suited hands, broadways and connectors.' },
      { street: 'flop', text: 'You flop top pair on K♠6♣5♣. With a weak kicker you check; the button bets and you call.', range: 'Kings, pairs, club and straight draws, floats.' },
      { street: 'turn', text: 'The 3♣ puts three clubs out and they bet again. Now you beat only straight draws and pure bluffs.', range: 'Flushes, kings, sets, club and straight draws.' },
      { street: 'river', text: 'The 8♣ puts four clubs out and they bet again. A player worried about a flush would slow down here; one who keeps betting usually has one.', range: 'Value: strong clubs, sets, better kings. Bluffs: missed wheel draws, ace high, a few smaller pairs.' },
    ],
    takeaway: 'When the board gets scary and they keep betting as if you can’t have it, fold one pair.',
  },
  'marginal-top-pair-induced-raise': {
    why: 'Call: this raise is the action your small bet invited. You hold no hearts, so you block none of the missed heart draws they’d bluff with, and a loose-aggressive player has plenty. You need about a third, and you’re ahead more often.',
    streets: [
      { street: 'preflop', text: 'A tight under-the-gun player opens, a loose-aggressive cutoff calls, and you call in the big blind with J♣9♣.', range: 'The cutoff: suited hands, broadways and connectors.' },
      { street: 'flop', text: 'You flop top pair on J♥6♦4♥. The opener checks, the cutoff bets, you call and the opener folds. A weak kicker calls rather than raises.', range: 'Jacks, sets, heart draws, straight draws, floats like K-Q.' },
      { street: 'turn', text: 'The 7♣ adds straights. You check and the cutoff checks back, so their heart draws and broadway cards are still there.', range: 'Weaker jacks, heart and straight draws, K-Q, air.' },
      { street: 'river', text: 'The 6♠ pairs the board. You bet small to get called by worse, and the cutoff raises big: full houses, or a missed draw bluffing.', range: 'Value: 7-7, 4-4, J-J, 6-6, some better jacks. Bluffs: missed heart draws, K-Q, missed straight draws.' },
    ],
    takeaway: 'When your small bet invites a raise, call if you don’t block their bluffs.',
  },
  'top-pair-ace-river-chop': {
    why: 'Call: most hands that bet here are aces that split with you. A-K and a few full houses beat you, and few kings are left after their turn check. Raising doesn’t work: the aces you split with won’t fold, and only better calls a big raise.',
    streets: [
      { street: 'preflop', text: 'Under the gun opens to 2.4 and you defend A♣9♣ from the big blind against the tightest range at the table.', range: 'Big pairs, big aces, suited broadways.' },
      { street: 'flop', text: '5♠5♦3♣ checks through: big cards and pairs that didn’t want to bet.', range: 'Big cards, overpairs, some fives slow-playing.' },
      { street: 'turn', text: 'The K♠. They hold plenty of kings, so you check, and they check behind, which makes a king less likely.', range: 'Big aces, pairs, fewer kings.' },
      { street: 'river', text: 'The A♦ pairs your ace, but every ace now plays aces and fives with a king kicker. You check and they bet ⅔ pot.', range: 'Split: A-Q, A-J, A-T, A-8, A-4, A-3. Ahead: A-K, A-5, 3-3, 5-5, some A-A and K-K. Behind: a few kings and pairs.' },
    ],
    takeaway: 'When most of their bets split with you, calling is cheap; a raise only gets called by better.',
  },
  'trip-nines-shoved-on': {
    why: 'Fold: you bet the pot on a scary board and a regular moved all in anyway. Your five doesn’t play, so every better nine beats you, and so does every full house. A regular raising all in rarely has a bluff, and you need 35%.',
    streets: [
      { street: 'preflop', text: 'An online regular opens the cutoff and you defend 9♠5♠ from the big blind, 127 big blinds deep.', range: 'Pairs, broadways, suited aces and connectors.' },
      { street: 'flop', text: 'You flop top pair on 9♣8♦4♠ and lead 3 into 6.5; they call. A regular would often raise a set or two pair, so the call is mostly pairs and draws.', range: 'Nines, eights, pairs, straight draws like J-T, T-7 and 7-6, club draws.' },
      { street: 'turn', text: 'The 7♣ makes straights for T-6 and J-T and adds a club draw. You lead 6 into 12.5 and they call.', range: 'Nines, two pairs, sets, straights, club and straight draws.' },
      { street: 'river', text: 'The 9♥ gives you trips. You bet the pot and they shove over the top. A regular doesn’t shove a weaker nine for value.', range: 'Value: 8-8, 7-7, 4-4, 9-7, better nines. Bluffs: a few missed club draws.' },
    ],
    takeaway: 'When you bet big and a regular shoves over the top, fold weak trips.',
  },
};

import type { Lesson } from '../model';

export const L10: Record<string, Lesson> = {
  'ace-high-check-river-vs-flop-raiser': {
    why: 'Check: a bet only gets called by overpairs, trips and straights, which beat you, and it folds the missed draws you could beat. Your ace high has a little showdown value, and checking lets their busted draws bluff into you. A bluff can’t work against hands that never fold. Never shove here.',
    streets: [
      { street: 'preflop', text: 'You min-raise A♠3♠ from the cutoff with 33 big blinds, and the button calls: pairs, suited aces, broadways and connectors.', range: 'Pairs, suited aces, broadways and suited connectors.' },
      { street: 'flop', text: 'The flop is 5♣4♣4♥. You c-bet with a backdoor draw and they raise. Overpairs, trips and club draws all raise here; you call.', range: 'Overpairs, trips, club draws, and straight draws like 7-6 and 6-3.' },
      { street: 'turn', text: 'The Q♦ goes check, check. Checking back after raising usually means a made hand happy to see a showdown, or a draw that wanted to see the river cheaply.', range: 'Overpairs, trips, club draws and straight draws.' },
      { street: 'river', text: 'The 6♦ makes straights for 7-3, 8-7 and 3-2. Their overpairs, trips and straights never fold; their missed draws would fold to a bet, and if you check they may bluff with them.', range: 'Overpairs, trips, full houses and straights (call any bet); missed club draws (fold, and the ones with an ace or a queen beat you anyway).' },
    ],
    takeaway: 'Don’t bluff into hands that never fold; with a little showdown value, check and let missed draws bluff.',
  },
  'king-high-fold-blocks-bluffs': {
    why: 'Fold: king high only beats their bluffs, and there are very few of them. Their most natural bluffs are K-x hands, and your K♥ removes some of those. The price is good, a fifth of the pot, but you’re ahead far less often than one time in five. King-ten goes in the muck.',
    streets: [
      { street: 'preflop', text: 'Five-handed at a final table, you open K♥T♣ on the button and the big blind defends with a wide range.', range: 'Wide: suited hands, broadways, pairs and connectors.' },
      { street: 'flop', text: 'The flop is Q♣8♣6♦, and it checks through. You check back king high with a backdoor club draw, taking a free card. Their check keeps their range wide: queens and eights checking, club draws, straight draws, and hands that missed.', range: 'Wide: queens, eights, sixes, draws and air.' },
      { street: 'turn', text: 'The 6♣ puts three clubs out and pairs the board. They lead small: trips, top pairs, flushes and some draws. With king high and a club, you call.', range: 'Trip sixes, flushes, queens, eights, straight draws, and a few bluffs.' },
      { street: 'river', text: 'The 7♠ makes straights for T-9, 9-5 and 5-4. They bet a third of the pot. Small bets like this are usually value that wants a call, and there are few hands worse than king high to bluff with. Your K♥ removes some of their K-x bluffs.', range: 'Value: club flushes, trip sixes and full houses, T-9, 9-5 and 5-4, and queens. Bluffs: K-x and J-x hands with nothing.' },
    ],
    takeaway: 'When your hand blocks their bluffs, even a good price isn’t enough.',
  },
  'straight-raise-river-paired-board': {
    why: 'Check-raise: most of their small value bets are trip queens and two pair with a jack, and your straight beats them. The pair on the river makes full houses possible, but those are a small part of what bets. Trips will call a raise. Just calling leaves their value on the table.',
    streets: [
      { street: 'preflop', text: 'Three-handed in a tournament, an elite high roller opens the button to 2.2, and you defend K♣T♠ from the big blind. A button open three-handed is very wide.', range: 'The button: very wide.' },
      { street: 'flop', text: 'The flop is J♠7♦9♥, and it checks through. You have a gutshot and an overcard. Their check behind says they missed or have a medium hand: an elite player bets most strong hands and draws on a board this connected.', range: 'Wide: jacks, nines, sevens, draws and air, few strong hands.' },
      { street: 'turn', text: 'The Q♦ gives you a king-high straight. You lead 3.5, and they call. Their call keeps queens, jacks, two pair, T-8 and lower straights, and draws.', range: 'Queens, jacks, two pairs, sets, T-8 (a lower straight), and draws.' },
      { street: 'river', text: 'The Q♠ pairs the board. You check and they bet small. An elite player bets small with lots of medium-strong hands on paired rivers: queens and jacks for value, plus a few full houses.', range: 'Behind you: trip queens, two pair with a jack, and T-8. Ahead of you: full houses.' },
    ],
    takeaway: 'When their small bet is mostly hands you beat that won’t fold, raise.',
  },
  'quads-river-overbet-vs-aces': {
    why: 'Overbet: every ace they hold calls, whatever you bet; trip aces and full houses are almost impossible to fold. An overbet wins far more from those hands than it loses from the pairs that would only call small. Missed heart draws fold to anything.',
    streets: [
      { street: 'preflop', text: 'A big-stacked pro opens middle position to 2.2 in a tournament, and you call in the hijack with 3♣3♠; the button and the big blind call too. Four players see the flop.', range: 'Big pairs, big aces, suited broadways and suited connectors.' },
      { street: 'flop', text: 'You flop a full house on A♠A♥3♥. They bet a third of the pot and only you call. A small bet into a big field often comes from a strong ace.', range: 'Aces, big pairs, heart draws, and some air.' },
      { street: 'turn', text: 'The 3♦ gives you quads. They bet small again, 4, and you just call to keep their range wide. A raise would only get called by aces and full houses; calling lets their pairs keep betting.', range: 'Aces, big pairs, heart draws.' },
      { street: 'river', text: 'The Q♠ makes Q-Q a full house, and they check. Their aces and full houses won’t fold to anything. Pairs and queens only call a small bet, and missed draws fold.', range: 'An ace and big pairs like K-K and Q-Q (call any bet), smaller pairs and a queen (call only small), missed heart draws (fold).' },
    ],
    takeaway: 'When their best hands can’t fold, overbet.',
  },
  'aces-full-fold-river-raise': {
    why: 'Fold: a shove over your small lead is only quads or a seven, and both beat aces full. Nothing worse shoves here. Your block bet was clever, but they answered with the strongest move there is. You need 26%, and you never win.',
    streets: [
      { street: 'preflop', text: 'A tight player opens under the gun to 2.3, you just call with A♦A♥, and three more players call. Five see the flop. Calling with aces keeps the pot big but means you face many hands after the flop.', range: 'Wide across the field: pairs, suited hands and broadways.' },
      { street: 'flop', text: 'The flop is 7♠4♣4♠. You check, and the player behind bets; the button calls and you call. Betting into four players shows a real hand.', range: 'Sevens, fours, overpairs, spade draws and straight draws.' },
      { street: 'turn', text: 'The 4♥ puts trip fours out. They bet two thirds of the pot and you call. Their bet is strong; only a seven or a few straight flushes have any chance against a four.', range: 'A four (quads), sevens (full houses), overpairs, and some draws.' },
      { street: 'river', text: 'The 7♣ gives you aces full, and makes fours full of sevens on the board. You lead small to block, and they shove. A thinking pro only raises a block bet all in with a hand that beats every full house.', range: 'Quads with the last four, quad sevens, and sevens full: all beat aces full.' },
    ],
    takeaway: 'When the only hands that raise all beat you, fold even a full house.',
  },
  'trip-eights-pot-bet': {
    why: 'Call: most of what you beat here is missed heart draws, and there are a lot of them. You need about a third, and you’re ahead more often than that. Don’t raise: the missed draws fold to a raise, and the hands that call it (better trips, full houses, straights) mostly beat you.',
    streets: [
      { street: 'preflop', text: 'You open 8♦7♦ from the hijack to 2.2 in a tournament with 50 big blinds; the button and the big blind call. The button calls with a wide range: pairs, suited hands, broadways and connectors.', range: 'Pairs, suited hands, broadways and connectors.' },
      { street: 'flop', text: 'You flop trips on 8♥8♣5♥. The button calls your c-bet with heart draws, straight draws, pairs and the odd eight.', range: 'Heart draws, straight draws, pairs, and eights like A-8, T-8 and 9-8.' },
      { street: 'turn', text: 'The 2♠ changes nothing. You bet 9 into about 14, and they call again. Heart draws are still a big part of their range, with pairs, straight draws like 7-6 and A-3, and the odd eight.', range: 'Heart draws, eights, pairs, 5-5, and straight draws.' },
      { street: 'river', text: 'The 4♣ misses the hearts but makes 7-6 and A-3 straights. You check and they bet the pot. A pot-size bet after you check is polarised: a strong hand, or a missed draw that can only win by betting.', range: 'Ahead of you: A-8, T-8 and 9-8, 5-5, 4-4 and 2-2 full houses, 7-6 and A-3. Behind or splitting: 8-6 and 8-7, rare overpairs, and missed heart draws.' },
    ],
    takeaway: 'When most of what you beat is missed draws, call: a raise folds the bluffs and only gets called by better.',
  },
  'top-pair-four-flush-fold': {
    why: 'Fold: on most boards top pair calls here, but not with four clubs out. The button has plenty of strong clubs, and they keep betting as if you can’t have one. You beat only a few bluffs, well under the quarter you need. Their line has no fear in it, and that’s the read.',
    streets: [
      { street: 'preflop', text: 'You open K♥T♦ from the cutoff in a tournament; the button and the big blind call. The button’s range is pairs, suited hands and broadways.', range: 'Pairs, suited hands, broadways and connectors.' },
      { street: 'flop', text: 'You flop top pair on K♠6♣5♣. With a weak kicker you check; the button bets and you call. A check-raise is for better kings.', range: 'Kings, pairs, club draws, straight draws, and floats.' },
      { street: 'turn', text: 'The 3♣ puts three clubs out, and they bet again. Now you’re ahead only of straight draws and pure bluffs; any hand that calls a raise beats you.', range: 'Flushes, kings, sets, club and straight draws.' },
      { street: 'river', text: 'The 8♣ puts four clubs on the board, and they bet again. A player worried about a flush would slow down here; one who keeps betting usually has one.', range: 'Value: strong clubs, sets and better kings. Bluffs: missed wheel draws, ace high, and a few pairs below the king.' },
    ],
    takeaway: 'When the board gets scary and they keep betting as if you can’t have it, fold one pair.',
  },
  'marginal-top-pair-induced-raise': {
    why: 'Call: this raise is the action your small bet invited. You hold no hearts, so you don’t block any of the missed heart draws they’d bluff with, and a loose-aggressive player has plenty of them. You need about a third, and you’re ahead more often than that.',
    streets: [
      { street: 'preflop', text: 'A tight under-the-gun player opens, a loose-aggressive cutoff calls, and you call in the big blind with J♣9♣.', range: 'The cutoff: wide, suited hands, broadways and connectors.' },
      { street: 'flop', text: 'You flop top pair on J♥6♦4♥. You check to the raiser, who checks; the cutoff bets and you call. The opener folds. Top pair with a weak kicker calls and rarely raises.', range: 'Jacks, sets, heart draws, straight draws, and floats like K-Q.' },
      { street: 'turn', text: 'The 7♣ adds straights. You check, and the cutoff checks back: the heart draws and broadway cards are still there.', range: 'Weaker jacks, heart draws, straight draws, K-Q and air.' },
      { street: 'river', text: 'The 6♠ pairs the board. You bet small to get called by worse, and the loose cutoff raises big. A big raise over a tiny bet is polarised: full houses, or a bluff with a missed draw.', range: 'Value: 7-7, 4-4, J-J and 6-6, and some better jacks. Bluffs: missed heart draws, K-Q and missed straight draws.' },
    ],
    takeaway: 'When your small bet invites a raise, call if you don’t block their bluffs.',
  },
  'top-pair-ace-river-chop': {
    why: 'Call: most hands that bet here are aces that split the pot with you. A-K and a few full houses beat you, and few kings are left after their turn check. Folding gives up a pot you often share. Raising doesn’t work: the aces you split with won’t fold, and a big raise only gets called by better.',
    streets: [
      { street: 'preflop', text: 'An under-the-gun player opens to 2.4 in a tournament, and you defend A♣9♣ from the big blind. An under-the-gun open is the tightest range at the table: big pairs, strong aces and suited broadways, so you’ll often be up against big cards.', range: 'Big pairs, big aces, and suited broadways.' },
      { street: 'flop', text: 'The flop is 5♠5♦3♣ and it checks through. Their range is big cards and pairs that didn’t want to bet.', range: 'Big cards, overpairs, and some fives slow-playing.' },
      { street: 'turn', text: 'The K♠: you may be ahead with ace high, but they have plenty of kings, so you check. They check behind, which makes a king less likely.', range: 'Big aces, pairs, and fewer kings.' },
      { street: 'river', text: 'The A♦ pairs your ace, but every ace now has aces and fives with a king kicker. You check, and they bet about ⅔ pot: mostly aces you split with, plus A-K and the odd full house.', range: 'Split: A-Q, A-J, A-T, A-8, A-4, A-3. Ahead of you: A-K, A-5, 3-3 and 5-5, some A-A and K-K. Behind you: a few kings and pairs.' },
    ],
    takeaway: 'When most of their bets split with you, calling is cheap; a raise only gets called by better.',
  },
  'trip-nines-shoved-on': {
    why: 'Fold: you bet the pot on a scary board and a regular moved all in anyway. Your five doesn’t play, so every better nine beats you, and so does every full house. Trips here only catch bluffs, and a regular raising all in rarely has one. You need 35%, and you’re far short.',
    streets: [
      { street: 'preflop', text: 'An online regular opens the cutoff to 3, and you defend the big blind with 9♠5♠, 127 big blinds deep. A cutoff opens wide and a regular plays it well after the flop, so expect them to call with a lot of pairs and draws.', range: 'Pairs, broadways, suited aces and connectors.' },
      { street: 'flop', text: 'You flop top pair on 9♣8♦4♠ and lead 3 into about 6.5. They call with nines, eights, pairs, straight draws like J-T, T-7 and 7-6, and club draws. A regular would often raise a set or two pair to build the pot.', range: 'Nines, eights, pairs, straight draws, and backdoor draws.' },
      { street: 'turn', text: 'The 7♣ fills some straights and adds a club draw. You lead again, 6 into about 12.5, and they call. Their range is still pairs and draws, with a few straights like T-6 and J-T now made, and sets like 8-8 and 7-7 slow-playing.', range: 'Nines, two pairs, sets, straights, and club and straight draws.' },
      { street: 'river', text: 'The 9♥ gives you trips. You bet the pot, and they shove over the top. A regular doesn’t shove a weaker nine for value: what shoves is full houses and better nines.', range: 'Value: 8-8, 7-7, 4-4 and 9-7, and nines with a better kicker. Bluffs: a few missed club draws.' },
    ],
    takeaway: 'When you bet big and a regular shoves over the top, fold weak trips.',
  },
};

import type { Lesson } from '../model';

export const L23: Record<string, Lesson> = {
  'seven-ten-river-overbet': {
    why: 'Bet bigger than the pot: a thinking regular reads your size. A ⅔-pot bet looks like value, so they fold the weak pairs you beat and call with better. An overbet looks like the nuts or a bluff, so they defend with bluff catchers: 8-7, 7-6, 6-6, 5-5, A-4 and 5-4 call it. A-7, K-7, Q-7 suited, 8-8 and 9-8 beat you whatever you bet.',
    streets: [
      { street: 'preflop', text: 'In an online six-max game, 100 big blinds deep, you open T♥7♥ from the small blind and a regular calls in the big blind. T-T and better would usually 3-bet, so their range tops out below yours.', range: 'Pairs up to 9-9, any ace, broadways, suited kings and queens, suited connectors.' },
      { street: 'flop', text: 'You flop top pair on 7♠4♣2♠. You bet 5.5 into 6, almost the pot, and they call. Sets and 4-2 would usually raise.', range: 'A-7, K-7, 8-7, 7-6, A-4, 5-4, 8-8, 6-6, 5-5, spade draws, 6-5, 6-3, ace high.' },
      { street: 'turn', text: 'The 9♥. You bet 14.4 into 17 and they call again, which drops the naked draws and most ace high: a pair of fours or better now, with sets and 9-7 mostly raising.', range: 'A-7, K-7, Q-7 suited, 8-7, 7-6, 9-8, 8-8, 6-6, 5-5, A-4, 5-4, some A-5 and A-3.' },
      { street: 'river', text: 'The K♣ gives K-7 two pair and you act first. Their range is pairs from fours up and a little ace high.', range: 'Ahead: A-7, K-7, Q-7 suited, 8-8, 9-8. Behind: 8-7, 7-6, 6-6, 5-5, A-4, 5-4 (call small or an overbet, fold to ⅔). Fold: A-5, A-3.' },
    ],
    takeaway: 'Against a thinking player whose range is bluff catchers, an overbet gets called by them where a normal bet doesn’t.',
  },
  'kings-fold-turn-check-raise-shove': {
    why: 'Fold: you know this player extremely well, and they have basically no bluffs here. A 3-bet, a call of your 4-bet, a small flop check-raise and a shove for almost 300 big blinds more is done only with the best hand, aces; queens played this way almost never happen. The price is about 31%, but kings win only against queens.',
    streets: [
      { street: 'preflop', text: 'In a big live game about 500 big blinds deep, an early player opens, a player you know very well 3-bets, and you cold 4-bet K♥K♣ on the button. The opener folds and they call.', range: 'A-A trapping, Q-Q, J-J, A-K, suited A-Q, a few suited broadways.' },
      { street: 'flop', text: 'On a dry, paired 9♦5♥5♣ they check, you bet 30 into 65, and they check-raise to 84; you call. This player check-raises here only with a hand that wants a huge pot.', range: 'A-A; almost never Q-Q, J-J or a five played this way.' },
      { street: 'turn', text: 'The 3♠ changes nothing. They check, you bet 60, and they raise all in for 350. Their line has been transparent all hand.', range: 'Value: all six combos of aces. Almost never: queens played this way.' },
    ],
    takeaway: 'When you know a player’s line has no bluffs, believe it, even with kings.',
  },
  'king-ten-three-barrel-river-call': {
    why: 'Call: raises on this flop are straights, two pair, rare sets and draws with a queen or a ten, and your K♥T♣ removes some of their value: the ten cuts Q-T and T-8, the king cuts K-J. Most sets 3-bet before the flop, and their missed queen draws have no showdown value and bluff the ace. You need about 30%.',
    streets: [
      { street: 'preflop', text: 'In an online six-max game you open K♥T♣ from the small blind and a regular calls in the big blind. Most players 3-bet K-K, J-J, 9-9 and some K-J suited there.', range: 'Pairs below the biggest, broadways, suited connectors, any ace.' },
      { street: 'flop', text: 'On a very connected K♠J♣9♥ you bet 2 into 6 and they raise to 6; you call with top pair and a gutshot.', range: 'Q-T, K-J, rare sets, draws like Q-8, Q-T, T-8 and Q-9.' },
      { street: 'turn', text: 'The 7♥ makes T-8 a straight. You check, they bet 13.2 into 18, and you call; their queen draws still have outs.', range: 'Q-T, T-8, K-J, rare 9-9, Q-8 and other queen draws, heart draws.' },
      { street: 'river', text: 'The A♠ puts an ace over your king. You check and they bet 33.95 into 44.4. The missed queen draws can only win by betting this card.', range: 'Value: Q-T, T-8, K-J, a rare 9-9. Bluffs: missed queen draws like Q-8.' },
    ],
    takeaway: 'When your cards remove their value hands, a middle-kicker top pair can call a third barrel.',
  },
  'bottom-set-call-turn-shove-wet-board': {
    why: 'Call: on a board this wet, an all-in raise over your turn bet often comes from a big draw that wants you to fold. 6-6, 9-9 and 8-7 beat you, but you’re a big favourite over combo draws like A♦7♦, and even when behind you can fill up on the river. The price is about 24%, and your set wins more often.',
    streets: [
      { street: 'preflop', text: 'In a big live tournament, 36 big blinds deep, you open 5♥5♣ from second position; the cutoff and the small blind call.', range: 'The cutoff: pairs, suited broadways, suited aces like A♦7♦, suited connectors like 8-7.' },
      { street: 'flop', text: 'You flop bottom set on 9♦6♣5♦, a board full of diamond and straight draws. You bet 4 into 8.4; the cutoff calls and the small blind folds. Players continue with any piece of a board this wet.', range: '6-6, 9-9, 8-7, diamond draws, 8-x and 7-x straight draws, nines and sixes.' },
      { street: 'turn', text: 'The 3♥ adds more straight draws. You bet 12 into 16.4 and they raise all in to 30.33.', range: 'Ahead: 6-6, 9-9, 8-7. Behind: combo draws like A♦7♦.' },
    ],
    takeaway: 'On a wet board with a short stack, call a shove with a set: their draws outnumber their bigger hands.',
  },
  'king-jack-call-river-check-raise-jam': {
    why: 'Call: a river check-raise all in is strong, but most of your stack is already in, so the price is only about 20%. Their value is slow-played kings, tens and aces, and A-T and A-K suited; their bluffs are A-J and A-Q suited that missed, and your king removes some of their kings and A-K. You need to win one time in five, and you do more often.',
    streets: [
      { street: 'preflop', text: 'Late in a big live tournament, 42 big blinds deep, under the gun opens, you 3-bet K♣J♣ two seats later, and they call, sometimes trapping with A-A or K-K.', range: 'Pairs, suited A-K, A-Q, A-J and A-T, suited broadways, some A-A and K-K.' },
      { street: 'flop', text: 'On T♠3♥2♠ they check, you c-bet 5.75 into 17.5, and they call.', range: 'Overpairs, A-T, spade draws, sets, A-K, A-Q and A-J with backdoors.' },
      { street: 'turn', text: 'The T♦ checks through: king high keeps the pot small and lets their ace-high hands keep bluffing.', range: 'Slow overpairs, tens, A-K, A-Q, A-J, spade draws.' },
      { street: 'river', text: 'The K♦ gives you kings and tens. They check, you bet 11.5 into 29, and they check-raise all in to 29.4. Their missed aces can only win by raising.', range: 'Value: slow kings, tens and aces, suited A-T and A-K. Bluffs: suited A-J and A-Q.' },
    ],
    takeaway: 'When a big raise leaves you a small price, count the combos: call if their bluffs are enough.',
  },
  'aces-full-call-river-shove': {
    why: 'Call: a strong player who is too good to bluff here shoves only a full house or better. Count what beats you: quad sevens, and with two sevens on the board and none in your hand, that’s one combo, 7♥7♦. A♥7♥ and fives full shove too, and you beat them. A 23% price is easy when only one hand has you.',
    streets: [
      { street: 'preflop', text: 'On day one of a big live tournament, very deep, you open A♠A♦ from third position; the button and the big blind call.', range: 'The button: pairs, suited aces like A♥7♥, suited broadways, suited connectors.' },
      { street: 'flop', text: 'You flop top set on a monotone A♣7♣5♣. You bet 4.67 into 8.5; the button calls and the big blind folds.', range: 'Flushes, single clubs, aces like A♥7♥, sevens, fives, 7-7, 5-5.' },
      { street: 'turn', text: 'The 7♠ gives you aces full. They bet 11.33, you check-raise to 38.67, and they call: on a paired board that takes full houses, flushes or trips.', range: '7♥7♦, A♥7♥, fives full, flushes, trips like 8-7 and 7-6.' },
      { street: 'river', text: 'The 4♦ changes nothing for full houses. You bet 108 and they shove 243.32.', range: 'Value: 7♥7♦ (quads). Smaller full houses: A♥7♥, less likely fives full.' },
    ],
    takeaway: 'Count the hands that beat you: when it’s one combo, call even a shove.',
  },
  'top-pair-nut-flush-draw-call-turn-shove': {
    why: 'Call: the straddle is a big live player known for big bluffs. Top pair, top kicker is far ahead of A-Q and K-Q, any club, ace or eight wins against their J-J, T-T and 9-9, and the flush draw is live even against sets. The price is about 34%, and against this range you win more often.',
    streets: [
      { street: 'preflop', text: 'In a big live game with a straddle you open A♣8♣ from the hijack; the button calls, the small blind 3-bets, and everyone calls, including a big player in the straddle.', range: 'The straddle: pairs, A-Q, K-Q, suited aces, suited connectors.' },
      { street: 'flop', text: 'You flop top pair on 8♥7♠3♣. The straddle bets 28.75 into 65 and only you call. From a big bluffer, a bet into four players is wide.', range: 'Sets, overpairs J-J, T-T and 9-9, A-Q, K-Q, straight draws.' },
      { street: 'turn', text: 'The 7♣ gives you the nut flush draw, and the straddle shoves 135 into 122.5. Sets and overpairs shove to stop your draws, and this player shoves A-Q and K-Q too.', range: 'Monsters: 8-8, 7-7, 3-3. Overpairs: J-J, T-T, 9-9. Bluffs: A-Q, K-Q.' },
    ],
    takeaway: 'Against a big bluffer, top pair with the nut flush draw calls a shove.',
  },
};

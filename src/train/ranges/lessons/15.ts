import type { Lesson } from '../model';

export const L15: Record<string, Lesson> = {
  'top-pair-call-fast-river-bet-three-bet-pot': {
    why: 'Call: a player who barrels every street and then fires small and fast on the river has mostly bluffs and a handful of strong hands. Their value is narrow, A-A, K-K, Q-Q, J-J and A-J, and your jack removes some of it. Raising only gets called by better, and folding hands the pot to every light 3-bet that kept firing. The price is only about 17%.',
    streets: [
      { street: 'preflop', text: 'You open J♦9♣ on the button, about 57 big blinds deep, and a young, aggressive small blind 3-bets to 5.67; you call. Blind against button is the widest 3-bet spot at the table.', range: 'Big pairs and strong aces, plus light 3-bets: suited aces and kings, broadways, connectors.' },
      { street: 'flop', text: 'You flop top pair on a dry J♥6♣2♦. They bet big, 7.67 into 12. An aggressive 3-bettor bets this board big with everything: overpairs for value, big cards to push you off a pair.', range: 'Overpairs, A-J, and big cards with nothing: A-K, A-Q, K-Q, suited aces.' },
      { street: 'turn', text: 'The 6♦ pairs the board and they bet 11.67 into 28. You rarely hold a six, so a planned barrel keeps going with the same air.', range: 'Overpairs and A-J; A-K, A-Q, K-Q still barrelling; the odd six or diamond draw.' },
      { street: 'river', text: 'The 8♣ and they bet a quarter of the pot, fast. A fast, small bet after two big ones usually means the decision was made before the card came; strong hands that want a call usually size up.', range: 'Value: A-A, K-K, Q-Q, J-J, A-J. Bluffs: the big cards and light 3-bets that kept betting.' },
    ],
    takeaway: 'A fast, small river bet after barrels on blank cards is often a planned bluff: call with a hand that beats all the air.',
  },
  'queens-call-down-ace-ace-board': {
    why: 'Call: three bets on A-A-x usually mean an ace, but not from this player. They bet broadways and middle pairs more than once as bluffs, with the same sizes as their value, and with two aces on the board only a handful are left for them. Your queens beat every bluff. The price is about 28%, and you’re ahead more often than not.',
    streets: [
      { street: 'preflop', text: 'A loose, aggressive cutoff opens and you 3-bet Q♣Q♠ from the small blind; they call. A-A, K-K and A-K often 4-bet, so the flat caps them a little.', range: 'Pairs, broadways like K-Q, K-J and Q-J, suited aces, suited connectors, some A-Q and A-J.' },
      { street: 'flop', text: 'On A♠A♣6♦ you check and they bet 12.5 into 21. A double-ace board looks great to bluff, so a loose player bets almost anything here.', range: 'A few aces, pairs, broadways and floats: nearly their whole range.' },
      { street: 'turn', text: 'The 5♥ and they bet 25 into 46. This player bets more than once as a bluff, so a second barrel removes little.', range: 'Aces, the odd 6-6 or 5-5; middle pairs and broadways still betting; draws like 4-3.' },
      { street: 'river', text: 'The 7♦ and they bet 60 into 96. From a tight player, three bets here are trips or better; this player uses the same sizes for bluffs and value.', range: 'Value: an ace or a full house. Bluffs: broadways that kept betting, middle pairs turned into bluffs.' },
    ],
    takeaway: 'Against a loose player who bluffs more than once, a big pair on a paired-ace board can call down: who is betting matters more than how many bets.',
  },
  'tens-hero-call-polarized-loose-raiser': {
    why: 'Call: the river bet is polarised, and your tens beat every bluff. Your T♣ removes some flushes and your two tens remove half of the J-T straights, so there’s less value than it looks, while a good, loose player turns missed K-J, 7-6 and one-club aces into big bets. The price is about 33%, and you’re ahead a little more often.',
    streets: [
      { street: 'preflop', text: 'A good, loose, aggressive hijack opens and you call T♠T♣ from the big blind, deep in a tournament. 3-betting tens deep and out of position plays awkwardly.', range: 'Wide: suited hands, broadways, pairs, suited connectors.' },
      { street: 'flop', text: 'On a monotone Q♣9♣2♣ they bet a quarter of the pot. Check-calling is the only sensible play with a medium pair: a raise only gets called by better.', range: 'Queens, nines, flushes, single clubs, straight draws like K-J and J-T, air.' },
      { street: 'turn', text: 'The 8♠ makes a straight for J-T and gives K-J and 7-6 draws. They bet bigger, 6 into 10, which leans toward hands that like this card.', range: 'Queens, two pair, sets, flushes, J-T, K-J and 7-6 drawing, one-club aces.' },
      { street: 'river', text: 'The 3♦ misses everything and they bet almost the pot. A weak queen would check for a showdown, so the bet is a hand that wants a call or a missed draw.', range: 'Value: overpairs, two pair, sets, flushes, J-T. Bluffs: K-J, 7-6, ace high with one club.' },
    ],
    takeaway: 'When your cards remove some of their value and many missed draws can bluff, call a polarised river bet.',
  },
  'kings-call-splashy-river-bet-three-bet-pot': {
    why: 'Call: your kings beat every queen except two pair and sets, and every missed draw. A splashy player bets the river loosely, with weaker queens, J-T, and missed A-J, K-J, A-5 and A-4. The hands that beat you are few, and many would have bet the flop. The price is about 30%, and you’re ahead most of the time.',
    streets: [
      { street: 'preflop', text: 'A splashy player raises under the gun and you 3-bet K♠K♣; the cutoff cold-calls and the raiser calls. Even a splashy player opens decent hands from first position.', range: 'Pairs, broadways like A-Q, K-Q and Q-J, A-J, suited aces.' },
      { street: 'flop', text: 'Q♠T♥4♦ checks round three ways. Checking kings keeps the pot small on a board that hits both callers, and the raiser’s check makes a set or two pair less likely.', range: 'Queens, tens, broadway draws like K-J, A-J and J-9, pairs.' },
      { street: 'turn', text: 'The 3♦ adds diamond and wheel draws. The splashy player bets 8 into 20, you call and the cutoff folds. A raise would fold the hands you want betting.', range: 'Queens, tens, two pairs, sets, A-5, A-4, A-J, K-J.' },
      { street: 'river', text: 'The 7♣ misses the draws and they bet 28 into 36. A splashy player bets weaker queens for value and missed hands as bluffs here.', range: 'Ahead: Q-T, Q-Q, T-T, 7-7. Behind: A-Q, K-Q, J-T, missed A-J, K-J, A-5, A-4.' },
    ],
    takeaway: 'A splashy player bets a wide range on the river: an overpair beats enough of it to call.',
  },
  'trip-aces-call-after-turn-check': {
    why: 'Call: their turn check took most strong aces out, and your ace leaves them just one more. What bets now is mostly missed K-Q, K-T and Q-T, plus K-K, Q-Q and T-T turned into bluffs. Full houses that slowed down and the last ace with a better kicker beat you, but they’re few, and raising only gets called by them. The price is about 28%.',
    streets: [
      { street: 'preflop', text: 'A newly seated player opens first in; you call A♦3♦ from middle position and a tight lojack calls too. With no read, give them a normal opening range.', range: 'Pairs, A-K to A-T, suited aces, broadways like K-Q and Q-J.' },
      { street: 'flop', text: 'You flop top pair on A♣J♣9♥. They c-bet 3 into 10; you call and the lojack folds. Your weak kicker calls rather than raises.', range: 'Aces, jacks, K-Q, K-T, Q-T drawing, K-K and Q-Q, clubs.' },
      { street: 'turn', text: 'The 4♥ and they check. A strong ace or two pair would usually bet again to charge the draws, so the check is pairs and draws far more often. You check behind.', range: 'K-K, Q-Q, T-T, K-Q, K-T, Q-T, clubs, a few slow aces or sets.' },
      { street: 'river', text: 'The A♥ gives you trips and they bet 10, about ⅔ pot. Only one ace is left for them, and the missed straight draws can only win by betting.', range: 'Ahead: J-J, 9-9, 4-4, the last ace with a better kicker. Behind: missed K-Q, K-T, Q-T, and K-K, Q-Q, T-T bluffing.' },
    ],
    takeaway: 'A turn check removes most of their strong hands, and holding the card they need cuts their value further: call the river.',
  },
  'ace-king-fold-flush-turn-paired-board': {
    why: 'Fold: their range now holds every flush plus trips and top pairs, and you have ace high with no heart. An ace or a king helps only against the queens, rarely against trips, never against flushes. You need 24%, and out of position with 40 big blinds, calling and hoping gets expensive fast.',
    streets: [
      { street: 'preflop', text: 'The lojack opens and you call from the small blind with A♠K♣, 40 big blinds deep; the big blind folds.', range: 'Pairs, broadways, suited aces, suited connectors.' },
      { street: 'flop', text: 'On Q♥8♥8♣ you check and call 3 into 7 with two overcards and a backdoor. One small bet is fine, but this board hits the opener many ways.', range: 'Queens, eights, heart draws, straight draws, big cards, some air.' },
      { street: 'turn', text: 'The 6♥ completes the flush and they bet 6 into 13. A second bet on the flush card is a strong made hand or a draw; most air gives up here.', range: 'Flushes, A-8, 9-8, 8-7, Q-Q, 6-6, A-Q, K-Q, Q-J, J-T, T-9, K-J without a heart.' },
    ],
    takeaway: 'When the turn completes a draw and you hold only overcards with no draw, fold to a second bet.',
  },
  'ace-king-fold-turn-shove-recreational': {
    why: 'Fold: when a straightforward player who check-called the flop suddenly shoves the turn, their range is hands that crush top pair: the 7-6 straight and A-9 and 9-8 two pair. A heart draw is the only bluff, and it’s rare from this player. You need about 24% and aren’t pot committed yet.',
    streets: [
      { street: 'preflop', text: 'A straightforward recreational player opens under the gun with 30 big blinds, a loose cutoff calls, and you 3-bet A♥K♣ on the button; both call.', range: 'The opener: pairs, suited aces like A-9, broadways, suited connectors like 7-6 and 9-8.' },
      { street: 'flop', text: 'You flop top pair, top kicker on A♦8♥5♥. You bet 8.25 into 18; the opener calls and the cutoff folds. Their check-call says no monster yet.', range: 'Aces like A-9 and A-T, eights, heart draws, straight draws like 7-6 and 7-4.' },
      { street: 'turn', text: 'The 9♣ completes 7-6 and gives A-9 and 9-8 two pair, and the opener shoves 16.5 into 35. Check-calling and then shoving the card that completes their likely hands says they got there.', range: 'Value: 7-6 suited, A-9, 9-8. Sometimes a heart draw.' },
    ],
    takeaway: 'When a straightforward player shoves the card that completes their likely hands, believe them.',
  },
  'eights-call-scary-club-river-polarized': {
    why: 'Call: an aggressive player turns missed heart draws and small pairs into bluffs on a card this scary, and your eights beat all of them. Many of their trips would have bet earlier, and a flush needed two running clubs. You need about 30%, and against this player you’re ahead more often; against a tight, passive player you’d fold.',
    streets: [
      { street: 'preflop', text: 'You open 8♣8♠ from first position in a deep tournament and five players call, including an aggressive champion right behind you, who would 3-bet the very top.', range: 'The champion: pairs, suited broadways, suited aces, suited connectors.' },
      { street: 'flop', text: '9♣9♥7♥ checks round six ways. A nine or a strong draw would often bet to build a pot, so a six-way check makes those less likely.', range: 'Slow-played nines, sevens, pairs, heart draws, straight draws like T-8 and 8-6, air.' },
      { street: 'turn', text: 'The 3♣ adds a club draw. You bet 7 into 17 and only the champion calls; air doesn’t call with four players still behind.', range: 'Nines, sevens, pairs, heart and club draws, straight draws.' },
      { street: 'river', text: 'The K♣ completes the clubs. You check and they bet ¾ pot. On a card this scary their range is polarised, and an aggressive player sees the K♣ as the perfect card to represent a flush.', range: 'Value: club flushes, A-9, T-9, 9-8, K-K, 7-7, 3-3. Bluffs: missed heart draws, small pairs.' },
    ],
    takeaway: 'Against an aggressive player, a scary river card is a bluffing card: call with a hand that beats the bluffs.',
  },
  'weak-ace-fold-river-straight-limped-pot': {
    why: 'Fold: the gutshots they bet on the flop and turn now have a straight, and two pair and sets bet here too. Your three doesn’t play: your best five is two aces with the board’s K-Q-T, so you only split with other weak aces. You need about 23%, and in a multiway pot a player who bets every street is rarely bluffing.',
    streets: [
      { street: 'preflop', text: 'Five players limp, you complete A♦3♦ from the small blind, and the big blind checks. Seven see the flop, and big pairs are rare because they’d usually raise.', range: 'Everyone: wide, with few big pairs.' },
      { street: 'flop', text: 'You flop a pair of aces on A♣K♠7♦. A middle player bets 3.25 into 7.5; the hijack calls and you call. A bet into six players is a real hand or a real draw.', range: 'Aces, kings, gutshots like Q-J and J-T, two pairs, sets.' },
      { street: 'turn', text: 'The T♦ gives Q-J a straight. They bet 6.25 into 17 and both of you call; a second bet into two players is a strong hand or a draw that kept going.', range: 'Aces with a good kicker, two pairs, sets, Q-J, gutshots like J-T and J-9, diamond draws.' },
      { street: 'river', text: 'The Q♣ makes a straight for any jack, and they bet 15 into 36; the hijack folds. Their bets into a crowd mostly came from hands that are now very strong.', range: 'Value: any jack, A-Q, A-T, K-Q and other two pairs, sets. Split: A-9 down to A-2. Bluffs: a few misses.' },
    ],
    takeaway: 'When the board plays as your kicker, a weak ace can only split: fold when the river completes the draws they bet.',
  },
  'nines-call-turn-bet-three-bet-pot': {
    why: 'Call: with a marginal made hand against a polarised range, call or fold, never raise. They bet big with draws and air as well as top pair or better, and your nines are well ahead of the draws and bluffs; a raise gets called only by better. You need about 26%. Call, and check behind if they check the river.',
    streets: [
      { street: 'preflop', text: 'You open 9♠9♦ from the hijack with 40 big blinds, a good, aggressive big blind 3-bets to 7, and you call. At this depth a 4-bet would turn your nines into a bluff.', range: 'Big pairs, big aces, suited broadways, suited connectors.' },
      { street: 'flop', text: 'On T♦8♣3♣ they bet 5 into 15.5, their whole range, and you call: you’re ahead of all but the tens and overpairs.', range: 'Overpairs, tens, club and straight draws, air.' },
      { street: 'turn', text: 'The 3♠ pairs the board and they bet 14 into 25.5. Going bigger after a small flop bet is polarised: strong hands grow the pot, draws and air want a fold, and medium hands check.', range: 'Value: overpairs, A-T, K-T, Q-T, J-T, T-9, sets. Draws: clubs, Q-J, 9-8, 8-7, 7-6. Bluffs: A-K, A-Q.' },
    ],
    takeaway: 'With a marginal hand against a polarised range, call or fold, never raise; call when the price is right.',
  },
};

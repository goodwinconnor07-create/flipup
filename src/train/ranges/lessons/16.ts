import type { Lesson } from '../model';

export const L16: Record<string, Lesson> = {
  'king-high-fold-river-aggressive-big-blind': {
    why: 'Fold: king high beats only queen high and worse. This player bets every jack, nine and deuce for value, and even underpairs and ace high that think they’re good, and those far outnumber the missed Q-T, T-8 and heart draws. You need about 30% and win much less often.',
    streets: [
      { street: 'preflop', text: 'In a small live game you open K♦4♦ from the hijack; the button and an aggressive big blind call. Getting a good price against two players, the big blind defends very wide.', range: 'Very wide: pairs, any ace, suited kings and queens, broadways, connectors.' },
      { street: 'flop', text: 'J♠2♦2♥ checks round three ways. A dry paired board misses most hands, and the big blind would often check a jack or a deuce too, so nothing is ruled out.', range: 'Jacks and deuces checking, pairs, ace high, hands that missed.' },
      { street: 'turn', text: 'The 9♥ adds draws. The big blind leads 11 into 18.5, you call with king high and a backdoor flush draw, and the button folds. This player bets value and draws alike when it checks to them.', range: 'Jacks, nines and deuces; underpairs and ace high as thin value; Q-T, T-8 and heart draws.' },
      { street: 'river', text: 'The 3♦ misses every draw, yours too, and they bet 30 into 40. Every pair beats you, and this player bets even weak pairs for value.', range: 'Value: a jack, nine or deuce, often an underpair or ace high. Bluffs: missed Q-T, T-8, heart draws.' },
    ],
    takeaway: 'A bluff catcher has to beat their value-bets too: against a player who bets thin, king high catches too little.',
  },
  'king-high-straight-fold-river-shove-flush-board': {
    why: 'Fold: a huge all-in raise over your river bet on a three-flush board is the classic flush line. Your straight splits with K-J and loses to every club flush; only a set bluffing loses to you, and very few small-stakes players raise all in as a bluff here. You need about 32%, and the raise is a flush far more often.',
    streets: [
      { street: 'preflop', text: 'In a $1-$3 game a player limps and you limp K♠J♥ from the cutoff. An unknown button raises to 5 and you both call.', range: 'The button: pairs, broadways like A-Q, K-Q and Q-J, suited aces, suited connectors.' },
      { street: 'flop', text: 'On Q♣9♦2♣ the button bets 8.33 into 16.5. The limper folds and you call with a gutshot and an overcard.', range: 'Queens, overpairs, nines, club draws, straight draws, some air.' },
      { street: 'turn', text: 'The 3♣ puts three clubs out. You lead 13.33 into 33 as a probe and they call, keeping the flushes, queens and big club draws.', range: 'Club flushes, queens and overpairs, sets, A♣x and K♣x draws.' },
      { street: 'river', text: 'The T♥ gives you a straight. You bet 25 into 60 and they raise all in to 123.33. Calling the flush card and then shoving over a river bet says flush.', range: 'Value: club flushes. Split: K-J. Bluffs: rarely, a set.' },
    ],
    takeaway: 'An all-in raise on a three-flush board from a live player is a flush: fold a straight.',
  },
  'nines-straight-fold-river-overbet-flush': {
    why: 'Fold: an all-in for almost twice the pot wants a call from a straight, so it’s a diamond flush or J-9, the higher straight. The only natural bluff is the A♦ with a jack, and a reasonable player doesn’t overbet a worse hand. The 39% price is good, but you win far less often.',
    streets: [
      { street: 'preflop', text: 'In a $1-$2 game a tight player raises from early position, a reasonable hijack calls, and you call 9♠9♥ from the small blind. The hijack would 3-bet its top hands.', range: 'The hijack: pairs, suited aces, suited broadways, suited connectors.' },
      { street: 'flop', text: 'On T♣8♦5♦ the hijack bets 5 into 8.5; you call and the raiser folds. Betting into two players narrows them to hands that like this board.', range: 'Tens, eights, diamond draws, straight draws like J-9, 7-6 and 9-7, sets.' },
      { street: 'turn', text: 'The 7♣ gives you an open-ender. You lead 12.5 into 18.5 and they call, keeping the draws.', range: 'Tens, two pairs, sets, diamond draws, J-9 and other straight draws, 9-6.' },
      { street: 'river', text: 'The 6♦ gives you a straight but puts three diamonds out. You check and they shove 80 into 43, almost twice the pot.', range: 'Value: diamond flushes, J-9. Bluffs: A♦ with a jack.' },
    ],
    takeaway: 'When a reasonable player overbets all in on the card that completes a flush, a straight is a fold.',
  },
  'fours-fold-river-big-blind-lead': {
    why: 'Fold: this player bets twice far more often with a missed heart draw than with pure air, and any queen, jack, deuce or pair of fives bets for value. Your fours beat only the missed hearts, and your own heart takes some of those away. You need about 26% and you’re well short.',
    streets: [
      { street: 'preflop', text: 'You open 4♥4♠ on the button with 24 big blinds, and a big blind who likes to bluff defends very wide.', range: 'Very wide: pairs, any ace, broadways, connectors.' },
      { street: 'flop', text: 'Q♦J♥2♣ checks through. Your fours have some showdown value, and a broadway board hits their range more than yours.', range: 'Queens and jacks, deuces, pairs, straight draws, air.' },
      { street: 'turn', text: 'The 2♥ adds a heart draw and they bet 4.5 into 5.5. You call, but it’s close: your heart removes some of the draws they’d bluff with.', range: 'Queens, jacks, deuces, pairs like 5-5 and 6-6, heart draws, some air.' },
      { street: 'river', text: 'The 5♦ misses the hearts and they bet 8 into 14.5. Their value bets for sure; the question is only how many missed hearts are left.', range: 'Value: a queen, jack, deuce, or 5-5. Bluffs: missed heart draws.' },
    ],
    takeaway: 'Even against a bluffer, a pair that only beats busted draws, while holding one of their draw cards, is a fold.',
  },
  'top-pair-fold-river-overbet-solver': {
    why: 'Fold: three growing bets ending in 140% of the pot is a very strong line, and with a bet this size an elite player is more likely being greedy with the top of their range than building a huge bluff. Their bluffs are missed spade draws, and your K♠8♠ removes some of them. A 37% price needs more bluffs than that.',
    streets: [
      { street: 'preflop', text: 'An elite player opens the lojack and you defend K♠8♠ from the big blind, both over 300 big blinds deep. Deep stacks give them room for big bets later.', range: 'Pairs, broadways, suited aces, suited kings, suited connectors.' },
      { street: 'flop', text: 'On a very connected 9♠7♠6♣ you check and call ⅔ pot with a flush draw and a gutshot. A big c-bet here leans to value and strong draws.', range: 'Sets, two pair, T-8, overpairs, top pairs, spade and straight draws.' },
      { street: 'turn', text: 'The K♥ gives you top pair. You check and call an overbet, 18.33 into 16: a set, a straight or two pair building the pot, or a draw betting big.', range: 'Sets 9-9, 7-7, 6-6, K-K; T-8; K-9, 7-6; top pairs with a better kicker; spade draws.' },
      { street: 'river', text: 'The 3♥ misses your draws. You check and they bet 75 into 53, the third bet in a row, each bigger than the last.', range: 'Value: 9-9, 7-7, 6-6, K-K, T-8, K-9, 7-6, some better top pairs. Bluffs: missed spade draws.' },
    ],
    takeaway: 'When a strong player builds to an overbet over three streets, top pair is a bluff catcher against a range with too few bluffs.',
  },
  'ace-nine-fold-turn-jam-after-min-raise': {
    why: 'Fold: a bet on the flop, a bet on the turn and a shove over your raise is almost always a made hand. Against flushes your draw is close to dead, and against the straights, sets and two pair you need to hit, which happens about a quarter of the time. You need 32%. A big draw is worth a shove only when the other player can still fold.',
    streets: [
      { street: 'preflop', text: 'In a $1-$2 game the first player raises, three call, you call A♥9♦ from the small blind, and the big blind comes too. Six see the flop.', range: 'Middle position: pairs, suited aces, suited broadways, suited connectors.' },
      { street: 'flop', text: 'On 8♥7♥4♣ middle position bets 5 into 12; you call and the rest fold. A bet into five players is usually a real hand or a real draw.', range: 'Overpairs, eights, sevens, two pairs, sets, heart draws, straight draws.' },
      { street: 'turn', text: 'The T♥ gives you the nut flush draw and an open-ender. You check, they bet 10, you raise to 20, and they shove for 73 more. A draw would usually just call your raise.', range: 'Flushes, J-9, 6-5, sets T-T, 8-8, 7-7, 4-4, T-8 and 8-7.' },
    ],
    takeaway: 'Against a shove after three strong actions, a big draw needs the price: fold when it isn’t there.',
  },
  'king-high-straight-value-bet-river-in-position': {
    why: 'Bet big: their range is full of strong hands that can’t fold. Two pair and sets call any size, A-A and A♣K♣ call a normal bet, and the same straight splits whatever you bet. Only A-T beats you, and a strong player wouldn’t have called the pot-size turn bet with it. ¾ pot is also fine and keeps A-Q and A-J calling.',
    streets: [
      { street: 'preflop', text: 'A strong player opens under the gun and you call K♦T♦ on the button. Suited king-ten makes straights and flushes on the broadway boards their range likes.', range: 'Pairs, A-K to A-T, suited broadways like K-Q, K-J and Q-J.' },
      { street: 'flop', text: 'On Q♣J♦9♦ they check, you bet 4 into 7 with an open-ender and a flush draw, and they call. This board hits their range hard.', range: 'Queens, jacks, two pairs, sets, K-T and T-8, A-T, diamond draws.' },
      { street: 'turn', text: 'The 7♣. They check and call a pot-size bet, which narrows them a lot: a strong player doesn’t pay a pot-size bet with a weak draw like A-T.', range: 'K-Q, K-J, Q-Q, J-J, 9-9, A-A, A♣K♣, Q-T, J-T, T-9, K-T, A-Q, A-J.' },
      { street: 'river', text: 'The K♠ gives you a king-high straight and they check. Sort their range by what it pays.', range: 'Any size: K-Q, K-J, Q-Q, J-J, 9-9. Normal bet: A-A, A♣K♣. Split: Q-T, J-T, T-9, K-T. Small only: A-Q, A-J.' },
    ],
    takeaway: 'When their range is full of strong hands that can’t fold, bet big with the nuts: the hands that call any size pay you the most.',
  },
  'top-pair-value-bet-river-checked-to': {
    why: 'Bet small: after a flop call and two checks they mostly hold a queen, an eight or a busted club draw, and almost none of that beats top pair. A big bet gets called only by K-Q and the few hands that beat you; a small one keeps Q-J, Q-T, 9-8 and 8-7 calling, which is most of their range.',
    streets: [
      { street: 'preflop', text: 'You open A♥9♥ from the cutoff and both blinds call. The small blind’s flat out of position leaves out its big pairs and A-K.', range: 'The small blind: pairs, suited aces, broadways like K-Q, Q-J and Q-T, suited connectors.' },
      { street: 'flop', text: 'On Q♣8♠3♣ you c-bet 4 into 7; the small blind calls and the big blind folds. Calling with a player behind takes a queen, an eight, a draw or a decent pair.', range: 'K-Q, Q-J, Q-T, 9-8, 8-7, club draws, pairs like 9-9 and 7-7, a few sets.' },
      { street: 'turn', text: 'The A♦ gives you top pair. They check and you check behind, which gives up some value; but their check without leading the ace makes a strong ace less likely.', range: 'Queens, eights, club draws, pairs, a few aces.' },
      { street: 'river', text: 'The 5♦ misses the clubs and they check again. A set or two pair would usually have bet by now, so the only question is how much their pairs pay.', range: 'Normal bet: K-Q. Small only: Q-J, Q-T, 9-8, 8-7. Fold: busted clubs. Beat you: a few aces and sets.' },
    ],
    takeaway: 'When they check twice and their range is mostly medium pairs, bet small so more of those pairs call.',
  },
  'two-pair-call-flush-turn-splashy-button': {
    why: 'Call: a big bet on the flush card is a flush or better, or thin value and bluffs, and a splashy player has plenty of the second kind: aces betting big and junk that picked up a spade. Your two pair beats all of it and removes some A-T and A-7. The price is about 32%, and you’re ahead more often.',
    streets: [
      { street: 'preflop', text: 'A loose, splashy player with 300 big blinds raises the button and you defend T♣7♦. Deep and splashy means they keep betting after the flop with almost anything.', range: 'Very wide: any ace, any king, broadways, connectors, pairs.' },
      { street: 'flop', text: 'On A♠T♠3♦ you check and call 3 into 6.5 with second pair. A small bet from the button here is their whole range.', range: 'Aces, tens, spade draws, pairs like 5-5 and 9-9, plenty of air.' },
      { street: 'turn', text: 'The 7♠ gives you two pair and completes the flush. You check and they bet 11 into 12.5. A splashy player bets that big with aces that don’t want to give a free card, and with junk holding a spade.', range: 'Value: flushes, A-T, A-3, A-7, 3-3. Thin value: A-K, A-Q, A-J. Bluffs: junk, single spades, straight draws.' },
    ],
    takeaway: 'Against a splashy player, a big bet on a scary card is often thin value or a bluff: two pair can call.',
  },
  'top-pair-weak-kicker-call-aggressive-button-limped': {
    why: 'Call: an overly aggressive player bets almost everything when checked to. Their value is better aces and two pair, but most of what they bet is worse aces, kings, eights, draws and air. You need about 23% and you’re ahead most of the time; raising would fold the hands you beat.',
    streets: [
      { street: 'preflop', text: 'Two tight players limp, you limp A♠9♠, an overly aggressive button limps, and both blinds come along. A button that only limps rarely has a big pair or A-K.', range: 'The button: wide with few big pairs: aces, kings, broadways, suited hands, connectors.' },
      { street: 'flop', text: 'A♥8♣2♠ checks to the button, who bets 3.5 into 7; the first limper and you call. The button bets every ace, but also any hand that wants the pot when five players check.', range: 'Aces, eights, deuces, gutshots, backdoor draws, lots of air.' },
      { street: 'turn', text: 'The K♦. It checks to the button, who bets 7.5 into 17.5, and the first limper folds. A small bet from this player is their whole range.', range: 'Ahead: A-K to A-T, A-8, A-2, K-8, K-2, K-K, 8-8, 2-2. Behind: worse aces, a king or eight, draws, air.' },
    ],
    takeaway: 'Against an overly aggressive player, top pair with a weak kicker calls small bets: their range is full of worse.',
  },
};

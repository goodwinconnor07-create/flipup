import type { Lesson } from '../model';

export const L13: Record<string, Lesson> = {
  'set-fold-big-river-donk-flush': {
    why: 'Fold: you’ve shown nothing but aggression, and they lead big the moment the flush comes in: a flush almost every time. A typical live player doesn’t turn K-Q into a big river bluff into someone who has bet every street, so your set is now a bluff catcher with almost no bluffs to catch.',
    streets: [
      { street: 'preflop', text: 'You open 4♦4♥ on the button and the big blind defends wide, with lots of suited hands.', range: 'Suited hands, connectors, pairs and broadways.' },
      { street: 'flop', text: 'You flop a set on K♣4♣3♥ and c-bet small. They’d raise two pair and sets, so their call is kings, pairs and draws.', range: 'Kings, pairs, club draws, straight draws like 5-2, 6-5 and 7-5.' },
      { street: 'turn', text: 'The 9♦ is a blank. Their kings and draws won’t fold, so you overbet to charge the draws, and they call.', range: 'Kings, club draws, straight draws.' },
      { street: 'river', text: 'The 6♣ completes the clubs and makes straights for 5-2 and 7-5, and they lead over half the pot. A player who switches from calling to leading on the card that completes the draw has the draw.', range: 'Value: club flushes, 5-2 and 7-5. Bluffs: kings turned into a bluff, almost never.' },
    ],
    takeaway: 'When you’ve done all the betting and they lead big as a draw completes, believe the draw.',
  },
  'second-pair-call-small-river-after-stab': {
    why: 'Call: after you check back the flop, many players over-bluff with small bets on the turn and river. Those bluffs are often small pairs and missed straight draws, while their stronger hands usually bet bigger. You need a quarter, and your nines beat every one of those bluffs.',
    streets: [
      { street: 'preflop', text: 'You open T♥9♥ on the button and a typical live player defends the big blind wide.', range: 'Suited hands, connectors, pairs and broadways.' },
      { street: 'flop', text: 'You flop second pair on A♠9♠7♦. On ace-high boards you bet big or check, and second pair is a showdown hand, so you check back.', range: 'Their whole range: aces, nines, sevens, draws and air.' },
      { street: 'turn', text: 'The 2♣ and they stab small. After you check, lots of players stab with anything, including hands with no showdown value. You call.', range: 'Aces, pairs, draws, many hands stabbing with little.' },
      { street: 'river', text: 'The Q♠ puts three spades out and they bet small again. Players often fire twice with 3-3, 4-4 or a missed straight draw once they think you’re weak.', range: 'Value: aces, two pair, sets, queens, flushes, usually bet bigger. Bluffs: 3-3 to 8-8, missed 8-6, 6-5, J-T, K-J.' },
    ],
    takeaway: 'When they stab the turn after your check and bet small again, call with your pairs.',
  },
  'middle-pair-call-small-river-after-checked-turn': {
    why: 'Call: they call too wide on the flop, raise their strong hands, and reach the river with lots of missed gutshots and overcards. A small bet after you check the turn is where those bluffs show up. You need a quarter, and you’re ahead about half the time.',
    streets: [
      { street: 'preflop', text: 'You open K♠5♠ on the button and a typical live player defends the big blind wide.', range: 'Suited hands, connectors, pairs and broadways.' },
      { street: 'flop', text: 'You flop middle pair on T♥5♦4♣ and c-bet small. This player raises strong hands too often, so their calls are weaker.', range: 'Tens, weak fives, gutshots like 8-7 and 7-6, overcards like K-J and A-J.' },
      { street: 'turn', text: 'The Q♠. They check and you check back to get to a showdown, which also tells them you’re weak and invites a bluff.', range: 'Tens and queens, gutshots, overcards, pairs.' },
      { street: 'river', text: 'The 2♦ misses almost everything and they bet half the pot. Live players bet big when strong; with a bluff they fear a call and bet small.', range: 'Value: tens, queens, straights, sets, two pair, better fives, usually bet bigger. Bluffs: K-J, A-J, A-9, J-9, 9-8, 8-7, 7-6.' },
    ],
    takeaway: 'Live players bet big when strong and small when bluffing: catch the small ones.',
  },
  'seven-high-river-overbet-bluff-capped': {
    why: 'Overbet: they’re so capped that their best hand is usually A-J or K-J, and their missed draws can’t call. You wouldn’t bet this big with a real hand just to be called by A-J, so this is the size where A-J folds. Seven high never wins at showdown.',
    streets: [
      { street: 'preflop', text: 'You open 7♦6♦ on the button and a typical live player defends the big blind. They’d 3-bet many of their best hands.', range: 'Wide and capped: suited hands, connectors, pairs and broadways.' },
      { street: 'flop', text: 'On J♠9♠2♣ you c-bet and they call. They’d raise most sets and two pair on a board this wet, so the call is jacks and draws.', range: 'Jacks, spade draws, straight draws like T-8, Q-T and K-Q.' },
      { street: 'turn', text: 'The 4♦. They won’t fold jacks or draws to any size, so you bet nearly twice the pot, and they call.', range: 'Jacks, spade draws, straight draws, the odd set.' },
      { street: 'river', text: 'The 3♣ misses everything, your draw included, and they check. They almost never have better than A-J.', range: 'Normal bet, not an overbet: A-J, K-J, Q-J, J-T, J-8. Fold: missed draws. Call: the odd 4-4 or 6♠5♠.' },
    ],
    takeaway: 'Against a capped range, size your bluff where their best hand folds.',
  },
  'king-flush-shove-over-river-check-raise': {
    why: 'Shove: only a handful of ace-high flushes beat you. Lower flushes, straights and sets all lose to you, they’re already half in, and some of their raises are bluffs aimed at your small bet. You’re far ahead of what they raise with, so put the rest in.',
    streets: [
      { street: 'preflop', text: 'The cutoff opens and you defend K♠2♠ from the big blind, about 66 big blinds deep. A late opener has plenty of small suited hands.', range: 'Suited hands, broadways, pairs and connectors.' },
      { street: 'flop', text: 'You flop top pair on K♥Q♥J♠ and check-call a c-bet. This board hits a late opener’s broadways hard.', range: 'Straights like A-T and T-9, big pairs, kings, queens, heart draws.' },
      { street: 'turn', text: 'The 9♠ gives you a flush draw, and it checks through. A straight or a set would often bet here to charge the draws, so the check is medium hands and draws.', range: 'Straights, sets, pairs that slowed down, heart and spade draws.' },
      { street: 'river', text: 'The 4♠ gives you a king-high flush. You bet small and they raise to half their stack. Lower flushes and straights raise here, and only a few A♠x flushes beat you.', range: 'Ahead: a few ace-high flushes. Behind: lower flushes, A-T and T-8, sets, missed heart draws raising.' },
    ],
    takeaway: 'When only a few hands beat you and they’re already half in, put the rest in.',
  },
  'bottom-pair-fold-small-river-bet-multiway': {
    why: 'Fold: your big flop lead folded the ace highs you could beat, so their range is pairs, and every one beats a deuce. After checking the turn, a small river bet is a one-pair hand going for a little value, and you can’t raise them off it.',
    streets: [
      { street: 'preflop', text: 'The hijack limps, a live player raises the button, and the small blind, you with J♣2♣, and the limper all call.', range: 'The button: strong pairs and broadways, plus some looser hands.' },
      { street: 'flop', text: 'On 4♣2♠5♣ you lead big with bottom pair and only the button calls. Most players fold plain ace high to a bet this big.', range: 'Overpairs, threes, fours, fives, weak aces with a pair, flush and straight draws.' },
      { street: 'turn', text: 'The T♠ checks through. Their check behind says a medium hand happy to show down, or a draw taking a free card.', range: 'Pairs, tens, overpairs, draws.' },
      { street: 'river', text: 'The Q♥. You check and they bet small: a one-pair hand after a checked turn, going for thin value.', range: 'Value: queens, tens, overpairs, threes, fives, fours, two pair, sets, straights. Bluffs: missed club draws, rarely.' },
    ],
    takeaway: 'When your big bet already folded the hands you beat, a small river bet is value: fold.',
  },
  'queens-check-river-four-bet-pot': {
    why: 'Check: an all in only gets called by hands that beat you. Flushes, jacks full, aces and kings all call, and the one worse hand left in their range, a missed 5-4, folds. Betting only loses more when you’re beaten.',
    streets: [
      { street: 'preflop', text: 'A strong small blind 3-bets your cutoff open and calls your 4-bet with Q♦Q♥.', range: 'Big pairs, A-K, A-Q, suited hands like 5-4.' },
      { street: 'flop', text: 'On 6♥6♦2♦ you bet small, 9.375 into 37, and they call. In a 4-bet pot almost nothing folds to a small bet here.', range: 'Big pairs, diamond draws, some sixes.' },
      { street: 'turn', text: 'The 7♠. You bet 18.75 into 56 and they call. Weaker pairs like T-T and 9-9 fold here, so what calls is stronger.', range: 'A-A, K-K, diamond draws with an ace or king, 5-4, sixes.' },
      { street: 'river', text: 'The J♦ completes the flush and they check. They hold every flush plus jacks full, aces and kings; the only worse hand is a missed 5-4.', range: 'Ahead (all call): flushes, jacks full, quads, A-A, K-K. Behind (folds): missed 5-4.' },
    ],
    takeaway: 'Bet only when worse hands call; when the one worse hand left folds, check.',
  },
  'bottom-two-pair-polarized-river-bet': {
    why: 'Call: the bet is a full house or a bluff. There’s one combo of K-9 suited and three of 7-7, against more than fifty missed flush and straight draws, and your two pair beats every one of those. You need about 32%, and you’re ahead far more often.',
    streets: [
      { street: 'preflop', text: 'A fairly tight big blind calls your button open with 9♥6♥ in your hand. A-A, K-K and A-K would have 3-bet.', range: 'Suited hands, broadways, pairs and connectors; no A-A, K-K or A-K.' },
      { street: 'flop', text: 'A♣K♥9♦ checks through: on a board this high, checking bottom pair keeps the pot small and their worse hands in.', range: 'Aces, kings, nines, broadway draws, air.' },
      { street: 'turn', text: 'The 7♦ adds a diamond draw. They bet small and you call. Betting into you here, their range fills with diamond and broadway draws.', range: 'Aces, kings, two pairs, 7-7, diamond draws, broadway draws.' },
      { street: 'river', text: 'The K♠ pairs the board and they bet almost the pot. With the big pairs and A-K gone, this is a full house or a missed draw.', range: 'Value: K♣9♣, 7-7. Bluffs: missed diamond draws, Q-J, Q-T, J-T.' },
    ],
    takeaway: 'Against a polarised bet, count value combos against bluffs: when the bluffs outnumber the value, call.',
  },
  'set-of-queens-check-on-flush-river': {
    why: 'Check: if you bet, the flushes call and the kings fold, so only better hands put more in. A player who just calls twice on this board mostly holds a heart draw, and every one got there. Check, and fold if they bet big.',
    streets: [
      { street: 'preflop', text: 'You open Q♠Q♣ under the gun and a live player who likes to just call calls on the button.', range: 'Pairs, suited aces, broadways and suited connectors.' },
      { street: 'flop', text: 'On 8♥4♥2♠ you c-bet and they call. A player who just calls here often has a heart draw rather than a pair of eights.', range: 'Heart draws, eights, small pairs, big cards.' },
      { street: 'turn', text: 'The K♠. You bet 14 into 21.5 and they call. An eight rarely calls twice, so the range leans further to heart draws and the odd king.', range: 'Heart draws and some kings.' },
      { street: 'river', text: 'The Q♥ gives you top set but completes the flush. You act first, and the hands that called twice are mostly heart draws that just got there.', range: 'Call a bet: heart draws that got there. Fold: K-J and K-T.' },
    ],
    takeaway: 'When only better hands will call, check, even with a set.',
  },
  'aces-fold-after-turn-call': {
    why: 'Fold: check-raise, bet, then all in, from a player who only bets big with monsters, is sets and two pair nearly every time. You called the turn to find out where you stood, and now you know. You need about 25%, and you win far less.',
    streets: [
      { street: 'preflop', text: 'You open A♦A♣ under the gun, 144 big blinds deep; the cutoff and a big blind who only bets big with monsters call.', range: 'The big blind: suited hands, pairs and connectors.' },
      { street: 'flop', text: 'On J♣5♦2♠ you bet and the big blind check-raises. From this player, that’s a strong hand most of the time.', range: 'Sets, two pairs, a few draws.' },
      { street: 'turn', text: 'The 6♥ and they bet 40 into 68.5. You call to see the river, not to put more in yourself.', range: 'Sets, two pairs like 6-5, draws like 8-7 and 4-3.' },
      { street: 'river', text: 'The T♠ makes J-T two pair and they move all in: the third strong action from a player who doesn’t bluff big.', range: 'Value: J-J, 6-6, 5-5, 2-2, 6-5 and J-T suited. A missed draw: 8-7 suited.' },
    ],
    takeaway: 'Against a player who only bets big with monsters, three strong actions mean sets and two pair: fold an overpair.',
  },
};

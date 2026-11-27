import type { Lesson } from '../model';

export const L13: Record<string, Lesson> = {
  'set-fold-big-river-donk-flush': {
    why: 'Fold: you’ve shown nothing but aggression, and they lead big the moment the flush comes in. That’s a flush almost every time. A typical live player doesn’t turn K-Q into a big river bluff into someone who has bet every street. Your set is now a bluff catcher, and there are almost no bluffs.',
    streets: [
      { street: 'preflop', text: 'You open 4♦4♥ on the button and the big blind defends with a wide range, including lots of suited hands.', range: 'Wide: suited hands, connectors, pairs and broadways.' },
      { street: 'flop', text: 'You flop a set on K♣4♣3♥ and c-bet small. They’d raise their two pair and sets, so they call with kings, pairs and draws: club draws and wheel draws like 5-2 and A-5.', range: 'Kings, pairs, club draws, and straight draws like 5-2, 6-5 and 7-5.' },
      { street: 'turn', text: 'The 9♦ is a blank. Their kings and draws won’t fold, so you overbet to charge the draws, and they call.', range: 'Kings, club draws, and straight draws.' },
      { street: 'river', text: 'The 6♣ completes the clubs and makes straights for 5-2 and 7-5, and they lead for over half the pot. You’ve bet every street; a player who switches from calling to leading on the card that completes the draw has the draw.', range: 'Value: club flushes, 5-2 and 7-5. Bluffs: kings turned into a bluff, almost never.' },
    ],
    takeaway: 'When you’ve done all the betting and they lead big as a draw completes, believe the draw.',
  },
  'second-pair-call-small-river-after-stab': {
    why: 'Call: after you check back the flop, many players over-bluff with small bets on the turn and river, often with small pairs and missed straight draws. Their stronger hands usually bet bigger. You need a quarter, and your nines beat all of those bluffs. Call with your pairs, from the top down.',
    streets: [
      { street: 'preflop', text: 'You open T♥9♥ on the button to 5, and a typical live player defends the big blind with a wide range of suited hands, broadways, pairs and connectors.', range: 'Wide: suited hands, connectors, pairs and broadways.' },
      { street: 'flop', text: 'You flop second pair on A♠9♠7♦. On ace-high boards you either bet big or check; second pair is a showdown hand, so you check back.', range: 'Their whole range: aces, nines, sevens, draws and air.' },
      { street: 'turn', text: 'The 2♣. They stab small. After you check, lots of players stab with anything, including hands with no showdown value. You call.', range: 'Aces, pairs, draws, and many hands stabbing with little.' },
      { street: 'river', text: 'The Q♠ puts three spades out, and they bet small again. Players often bet twice with hands like 3-3, 4-4 or a missed straight draw once they think you’re weak.', range: 'Value: aces, two pair, sets, queens and flushes, usually bet bigger. Bluffs: small pairs 3-3 to 8-8, and missed 8-6, 6-5, J-T and K-J.' },
    ],
    takeaway: 'When they stab the turn after your check and bet small again, call with your pairs.',
  },
  'middle-pair-call-small-river-after-checked-turn': {
    why: 'Call: they call too wide on the flop, raise their strong hands, and reach the river with lots of missed gutshots and overcards. A small bet after you check the turn is where those bluffs show up. You need a quarter, and you’re ahead about half the time.',
    streets: [
      { street: 'preflop', text: 'You open K♠5♠ on the button to 5, and a typical live player defends the big blind with a wide range of suited hands, broadways, pairs and connectors.', range: 'Wide: suited hands, connectors, pairs and broadways.' },
      { street: 'flop', text: 'You flop middle pair on T♥5♦4♣ and c-bet small. They raise their strong hands too often, so their calls are weaker: gutshots, 8-7 and overcards.', range: 'Tens, weak fives, gutshots like 8-7 and 7-6, overcards like K-J and A-J.' },
      { street: 'turn', text: 'The Q♠ adds a queen and straight draws. They check, and you check back your pair of fives to get to a showdown. Your check also tells them you’re weak, which invites a river bluff.', range: 'Tens and queens, gutshots, overcards and pairs.' },
      { street: 'river', text: 'The 2♦ misses almost everything, and they bet half the pot. When live players make a strong hand here they bet big; with a bluff they fear a call and bet small.', range: 'Value: tens, queens, straights, sets, two pair and better fives, usually bet bigger. Bluffs: K-J, A-J, A-9, J-9, 9-8, 8-7 and 7-6.' },
    ],
    takeaway: 'Live players bet big when strong and small when bluffing: catch the small ones.',
  },
  'seven-high-river-overbet-bluff-capped': {
    why: 'Overbet: they’re so capped that their best hand is usually A-J or K-J, and their missed draws can’t call. If you had a real hand you wouldn’t bet this big to get called by A-J, so this is the size where A-J folds. Seven high never wins at a showdown.',
    streets: [
      { street: 'preflop', text: 'You open 7♦6♦ on the button to 4, and a typical live player defends the big blind with a wide range. They would 3-bet many of their best hands, so their range is capped.', range: 'Wide: suited hands, connectors, pairs and broadways.' },
      { street: 'flop', text: 'The flop is J♠9♠2♣. They’d raise most sets and two pair on a wet flop, so their call is jacks and draws.', range: 'Jacks, spade draws, straight draws like T-8, Q-T and K-Q.' },
      { street: 'turn', text: 'The 4♦. They’re capped at A-J or K-J and won’t fold jacks or draws, so you bet nearly twice the pot. They call.', range: 'Jacks, spade draws, straight draws, and the odd set.' },
      { street: 'river', text: 'The 3♣ misses everything, including your straight draw, and they check. They almost never have better than A-J. An overbet this big is where A-J folds.', range: 'Jacks (A-J, K-J, Q-J, J-T, J-8: call a normal bet, fold to an overbet), missed draws (fold), the odd 4-4 or 6♠5♠ (call).' },
    ],
    takeaway: 'Against a capped range, size your bluff where their best hand folds.',
  },
  'king-flush-shove-over-river-check-raise': {
    why: 'Shove: only a handful of ace-high flushes beat you. Lower flushes, straights and sets all lose to you, and they’re already half in. Some of their raises are bluffs aimed at your small bet. You’re far ahead of what they raise with, so put the rest in.',
    streets: [
      { street: 'preflop', text: 'The cutoff opens and you defend K♠2♠ from the big blind, about 66 big blinds deep. A late opener has plenty of small suited hands.', range: 'Wide: suited hands, broadways, pairs and connectors.' },
      { street: 'flop', text: 'You flop top pair on K♥Q♥J♠. You check-call a c-bet. A late opener has lots of straights, big pairs and heart draws here.', range: 'Straights like A-T and T-9, big pairs, kings, queens and heart draws.' },
      { street: 'turn', text: 'The 9♠ gives you a king-high flush draw, and it goes check, check. A late opener checking back usually has a medium hand or a draw; a straight or a set would often bet to charge the flush draws.', range: 'Straights, sets, pairs that slowed down, and heart and spade draws.' },
      { street: 'river', text: 'The 4♠ gives you a king-high flush. You bet small and they raise to half their stack. A late opener has more small suited hands than usual, so more lower flushes, plus straights; only a few A♠-x flushes beat you. Your small bet also invites bluff raises.', range: 'Ahead of you: a few ace-high flushes. Behind you: lower flushes, A-T and T-8 straights, sets, and missed heart draws raising.' },
    ],
    takeaway: 'When only a few hands beat you and they’re already half in, put the rest in.',
  },
  'bottom-pair-fold-small-river-bet-multiway': {
    why: 'Fold: your big flop lead folded out the ace highs you could beat, so their range is pairs, and every one beats a deuce. After checking the turn, a small river bet is a one-pair hand going for a little value. You can’t raise them off it.',
    streets: [
      { street: 'preflop', text: 'The hijack limps, a live $2/$5 player raises the button to 3, and the small blind, you with J♣2♣, and the limper all call. Four players in a raised pot, with the button holding the strongest range.', range: 'The button: an iso-raise over a limper, strong pairs and broadways, plus some looser hands.' },
      { street: 'flop', text: 'The flop is 4♣2♠5♣. You lead big with bottom pair and only the button calls. Most players fold plain ace high to a bet this big.', range: 'Overpairs, threes, fours and fives, weak aces with a pair, and flush and straight draws.' },
      { street: 'turn', text: 'The T♠ goes check, check. Your check gives up the lead, and their check behind says they have a medium hand they’re happy to show down, or a draw taking a free card.', range: 'Pairs, tens, overpairs, and draws.' },
      { street: 'river', text: 'The Q♥. You check and they bet small. After checking the turn, this is a one-pair hand going for a little value: a queen, a ten, an overpair, threes. A raise won’t make any of that fold.', range: 'Value: queens, tens, overpairs, threes, fives and fours; two pair, sets and straights. Bluffs: missed club draws, rarely bet.' },
    ],
    takeaway: 'When your big bet already folded the hands you beat, a small river bet is value: fold.',
  },
  'queens-check-river-four-bet-pot': {
    why: 'Check: an all in only gets called by hands that beat you: flushes, jacks full, aces and kings. The one worse hand left in their range, a missed 5-4, folds to it. Betting only loses more when you’re beaten. Check and see a showdown.',
    streets: [
      { street: 'preflop', text: 'A strong small blind 3-bets your cutoff open and calls your 4-bet with Q♦Q♥. Calling a 4-bet: big pairs, strong aces and some suited hands.', range: 'Big pairs, A-K, A-Q, and suited hands like 5-4.' },
      { street: 'flop', text: 'The flop is 6♥6♦2♦. You bet small, 9.375 into about 37, and they call. Their range is full of big pairs and diamond draws: in a 4-bet pot almost nothing folds to a small bet here.', range: 'Big pairs, diamond draws, and some sixes.' },
      { street: 'turn', text: 'The 7♠ is a blank. You bet again, 18.75 into about 56, and they call. They fold weaker pairs like T-T and 9-9 here, so what calls is stronger: A-A, K-K, flush draws with an ace or king, and the odd 5-4.', range: 'Aces, kings, diamond draws, 5-4 drawing, and sixes.' },
      { street: 'river', text: 'The J♦ completes the flush, and they check. They hold all the flushes, plus jacks full, aces and kings; the only worse hand left is a missed 5-4, and that won’t call.', range: 'Ahead of you: flushes, jacks full, quads, A-A and K-K (all call). Behind you: missed 5-4 (folds).' },
    ],
    takeaway: 'Bet only when worse hands call; when the one worse hand left folds, check.',
  },
  'bottom-two-pair-polarized-river-bet': {
    why: 'Call: their bet is polarised, a full house or a bluff. There’s one combo of K-9 suited and three of 7-7, against more than fifty missed flush and straight draws, and your nines beat every one of those. You need about 32%, and you’re ahead far more often.',
    streets: [
      { street: 'preflop', text: 'A fairly tight player in the big blind calls your button open with 9♥6♥. With A-A, K-K and A-K they would have 3-bet.', range: 'Suited hands, broadways, pairs and connectors; no A-A, K-K or A-K.' },
      { street: 'flop', text: 'The flop is A♣K♥9♦. They check, and you check back bottom pair with a backdoor flush draw. Against a tight range on a board this high, checking keeps the pot small and keeps their worse hands in.', range: 'Aces, kings, nines, broadway draws and air.' },
      { street: 'turn', text: 'The 7♦ adds a diamond draw. They bet small and you call. Betting into you here, their range is full of diamond draws and broadway draws like Q-J and Q-T.', range: 'Aces, kings, two pairs, 7-7, diamond draws and broadway draws.' },
      { street: 'river', text: 'The K♠ pairs the board, and they bet almost the pot. The big pairs and A-K are gone from their range, so this bet is a full house or a missed draw.', range: 'Value: K♣9♣ and 7-7 (full houses). Bluffs: missed diamond draws, and Q-J, Q-T and J-T.' },
    ],
    takeaway: 'Against a polarised bet, count value combos against bluffs: when the bluffs outnumber the value, call.',
  },
  'set-of-queens-check-on-flush-river': {
    why: 'Check: if you bet, the flushes call and the kings fold, so only better hands put more money in. A player who calls twice on this board mostly holds a heart draw, and they all got there. Check, and fold if they bet big.',
    streets: [
      { street: 'preflop', text: 'You open Q♠Q♣ under the gun to 4, and a live player who likes to just call calls on the button. They call with pairs, suited hands, broadways and suited connectors.', range: 'Pairs, suited aces, broadways and suited connectors.' },
      { street: 'flop', text: 'The flop is 8♥4♥2♠. You c-bet and they call. A player who just calls on this board often has a heart draw rather than a pair of eights.', range: 'Heart draws, eights, small pairs, and big cards.' },
      { street: 'turn', text: 'The K♠. You bet again, 14 into about 21.5, and they call. Their range leans further towards heart draws, plus the odd king like K-J or K-T: a player who just calls rarely has an eight that would call twice.', range: 'Heart draws and some kings.' },
      { street: 'river', text: 'The Q♥ gives you top set, but completes the flush. You act first. Hands that called twice are mostly heart draws, and they all just made a flush.', range: 'Heart draws that got there (call a bet). Kings like K-J and K-T (fold).' },
    ],
    takeaway: 'When only better hands will call, check, even with a set.',
  },
  'aces-fold-after-turn-call': {
    why: 'Fold: check-raise, bet, then all in, from a player who only bets big with monsters, is sets and two pair nearly every time. You called the turn to find out where you stood; now you know. You need about 25%, and you win far less.',
    streets: [
      { street: 'preflop', text: 'You open A♦A♣ under the gun to 4, 144 big blinds deep; the cutoff and a player in the big blind who only bets big with monsters call.', range: 'The big blind: wide, suited hands, pairs and connectors.' },
      { street: 'flop', text: 'The flop is J♣5♦2♠. You bet and the big blind check-raises. From this player, a check-raise is already a strong hand most of the time.', range: 'Sets, two pairs, and a few draws.' },
      { street: 'turn', text: 'The 6♥ and they bet again, 40 into about 68.5; you call to see what they do on the river, not to put more in yourself. A second big bet from this player keeps their sets and two pair, and the odd draw.', range: 'Sets, two pairs like 6-5, and draws like 8-7 and 4-3.' },
      { street: 'river', text: 'The T♠ makes J-T two pair, and they move all in. This type of player only bets like this with sets and two pair; bluffs are very rare.', range: 'Value: sets J-J, 6-6, 5-5 and 2-2, and 6-5 and J-T suited. A missed draw: 8-7 suited.' },
    ],
    takeaway: 'Against a player who only bets big with monsters, three strong actions mean sets and two pair: fold an overpair.',
  },
};

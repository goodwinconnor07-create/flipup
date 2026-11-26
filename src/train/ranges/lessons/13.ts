import type { Lesson } from '../model';

export const L13: Record<string, Lesson> = {
  'set-fold-big-river-donk-flush': {
    why: 'Fold: you’ve shown nothing but aggression, and they lead big the moment the flush comes in. That’s a flush almost every time. A typical live player doesn’t turn K-Q into a big river bluff into someone who has bet every street. Your set is now a bluff catcher, and there are almost no bluffs.',
    read: [
      { about: 'preflop', text: 'You opened the button and the big blind defended with a wide range, including lots of suited hands.' },
      { about: 'position', text: 'They’re out of position. They check-called the flop and your turn overbet, then led the river.' },
      { about: 'board', text: 'K♣4♣3♥ gave you a set with a club draw out. The 9♦ is a blank, and the 6♣ completes the clubs and makes straights for 5-2 and 7-5.' },
      { about: 'sizing', text: 'A lead of over half the pot after calling an overbet. Changing from calling to leading on the card that completes the draw is the classic sign of a made flush.' },
      { about: 'range', text: 'For value: club flushes and 5-2 and 7-5 straights. Bluffs: kings turned into a bluff, almost never.' },
    ],
    takeaway: 'When you’ve done all the betting and they lead big as a draw completes, believe the draw.',
  },
  'second-pair-call-small-river-after-stab': {
    why: 'Call: after you check back the flop, many players over-bluff with small bets on the turn and river, often with small pairs and missed straight draws. Their stronger hands usually bet bigger. You need a quarter, and your nines beat all of those bluffs. Call with your pairs, from the top down.',
    read: [
      { about: 'preflop', text: 'You opened the button and the big blind defended: both ranges are wide.' },
      { about: 'position', text: 'You’re in position and checked back the ace-high flop with second pair, a hand that wants a showdown.' },
      { about: 'board', text: 'A♠9♠7♦ is ace-high with draws. The 2♣ is a blank, and the Q♠ puts three spades out.' },
      { about: 'sizing', text: 'A small turn stab after your check, then another small bet. Players stab with anything when you show weakness, and keep going with hands that can’t win otherwise.' },
      { about: 'opponent', text: 'Typical live players bet big with strong hands. Two small bets usually mean a weak hand trying to take the pot.' },
      { about: 'range', text: 'For value: aces, two pair, sets, queens and flushes, usually bet bigger. For bluffs: small pairs like 3-3 to 8-8, and missed straight draws like 8-6, 6-5, J-T and K-J.' },
    ],
    takeaway: 'When they stab the turn after your check and bet small again, call with your pairs.',
  },
  'middle-pair-call-small-river-after-checked-turn': {
    why: 'Call: they call too wide on the flop, raise their strong hands, and reach the river with lots of missed gutshots and overcards. A small bet after you check the turn is where those bluffs show up. You need a quarter, and you’re ahead about half the time.',
    read: [
      { about: 'preflop', text: 'You opened the button and the big blind defended with a wide range.' },
      { about: 'position', text: 'You’re in position. You c-bet small and then checked back the turn with your pair of fives.' },
      { about: 'board', text: 'T♥5♦4♣ has gutshots and straight draws. The Q♠ adds overcards, and the 2♦ misses almost everything.' },
      { about: 'sizing', text: 'A half-pot river lead. When live players make a strong hand here they bet big; with a bluff they fear a call and bet small.' },
      { about: 'opponent', text: 'Typical live players raise strong flop hands too often, so their flop calls are weaker than they should be.' },
      { about: 'range', text: 'For value: tens, queens, straights, sets, two pair and better fives, usually bet bigger. For bluffs: K-J, A-J, A-9, J-9, 9-8, 8-7 and 7-6.' },
    ],
    takeaway: 'Live players bet big when strong and small when bluffing: catch the small ones.',
  },
  'seven-high-river-overbet-bluff-capped': {
    why: 'Overbet: they’re so capped that their best hand is usually A-J or K-J, and their missed draws can’t call. If you had a real hand you wouldn’t bet this big to get called by A-J, so this is the size where A-J folds. Seven high never wins at a showdown. Bet huge.',
    read: [
      { about: 'preflop', text: 'You opened the button and the big blind defended.' },
      { about: 'position', text: 'You’re in position and bet every street. They check-called each time.' },
      { about: 'board', text: 'J♠9♠2♣ has spade and straight draws. The 4♦ and the 3♣ miss them, and yours too.' },
      { about: 'sizing', text: 'They called a flop bet and a turn bet of nearly twice the pot. Sets and two pair would have raised the wet flop, so they’re capped at a jack.' },
      { about: 'range', text: 'Jacks (A-J, K-J, Q-J, J-T and J-8) call a normal bet but fold to an overbet. Missed spades, T-8, Q-T and K-Q fold. The odd 4-4 or 6♠5♠ calls.' },
    ],
    takeaway: 'Against a capped range, size your bluff where their best hand folds.',
  },
  'king-flush-shove-over-river-check-raise': {
    why: 'Shove: only a handful of ace-high flushes beat you. Lower flushes, straights and sets all lose to you, and they’re already half in. Some of their raises are bluffs aimed at your small bet. You’re far ahead of what they raise with, so put the rest in.',
    read: [
      { about: 'preflop', text: 'The cutoff opened and you defended the big blind with K♠2♠. A late opener has plenty of small suited hands.' },
      { about: 'position', text: 'You’re out of position. You check-called the flop, the turn checked through, and you led small on the river.' },
      { about: 'board', text: 'K♥Q♥J♠ is broadway with a heart draw. The 9♠ adds a spade draw, and the 4♠ gives you a king-high flush.' },
      { about: 'sizing', text: 'Your small river bet invites raises, from value and from bluffs. Their raise is half their stack, so they can’t fold to a shove.' },
      { about: 'range', text: 'Ahead of you: a few ace-high flushes. Behind you: lower flushes, A-T and T-8 straights, sets, and missed heart draws raising as a bluff.' },
    ],
    takeaway: 'When only a few hands beat you and they’re already half in, put the rest in.',
  },
  'bottom-pair-fold-small-river-bet-multiway': {
    why: 'Fold: your big flop lead folded out the ace highs you could beat, so their range is pairs, and every one beats a deuce. After checking the turn, a small river bet is a one-pair hand going for a little value. You can’t raise them off it. You need 18%, and you’re almost never ahead.',
    read: [
      { about: 'preflop', text: 'The hijack limped, the button raised, and three players called. Everyone’s range is wide.' },
      { about: 'players', text: 'Four saw the flop, but only the button called your big lead. Calling a big bet into a multiway pot takes a pair or a draw.' },
      { about: 'board', text: '4♣2♠5♣ is low and connected with a club draw. The T♠ and Q♥ bring overcards to your deuce.' },
      { about: 'sizing', text: 'A small river bet after checking back the turn. That’s thin value from a queen, a ten or an overpair, not a bluff.' },
      { about: 'range', text: 'For value: queens, tens, overpairs, threes, fives and fours; two pair, sets and straights. Bluffs: missed club draws, rarely bet.' },
    ],
    takeaway: 'When your big bet already folded the hands you beat, a small river bet is value: fold.',
  },
  'queens-check-river-four-bet-pot': {
    why: 'Check: an all in only gets called by hands that beat you: flushes, jacks full, aces and kings. The one worse hand left in their range, a missed 5-4, folds to it. Betting only loses more when you’re beaten. Check and see a showdown.',
    read: [
      { about: 'preflop', text: 'A strong small blind 3-bet your cutoff open and called your 4-bet: big pairs, strong aces and some suited hands.' },
      { about: 'position', text: 'You’re in position, and they checked to you on every street.' },
      { about: 'board', text: '6♥6♦2♦ is paired with a diamond draw. The 7♠ is a blank, and the J♦ completes the diamonds and gives J-J a full house.' },
      { about: 'sizing', text: 'They called two bets. On the turn they fold weaker pairs like T-T and 9-9, so what’s left is stronger.' },
      { about: 'range', text: 'Ahead of you: flushes, jacks full, quads, aces and kings, all calling. Behind you: 5-4 that missed, which folds.' },
    ],
    takeaway: 'Bet only when worse hands call; when the one worse hand left folds, check.',
  },
  'bottom-two-pair-polarized-river-bet': {
    why: 'Call: their bet is polarised, a full house or a bluff. There’s one combo of K-9 suited and three of 7-7, against more than fifty missed flush and straight draws, and your nines beat every one of those. You need about 32%, and you’re ahead far more often.',
    read: [
      { about: 'preflop', text: 'A fairly tight player called your button open from the big blind. With A-A, K-K and A-K they would have 3-bet.' },
      { about: 'position', text: 'You’re in position. The flop checked through, and they led the turn and the river.' },
      { about: 'board', text: 'A♣K♥9♦ is broadway. The 7♦ adds a diamond draw, and the K♠ pairs the board, so K-9 and 7-7 now make full houses.' },
      { about: 'sizing', text: 'A small turn bet, then nearly the pot on the river. The big pairs and A-K are gone, so there’s little in between: full houses or missed draws.' },
      { about: 'range', text: 'For value: K♣9♣ and 7-7. For bluffs: missed diamond draws, and Q-J, Q-T and J-T that missed.' },
    ],
    takeaway: 'Against a polarised bet, count value combos against bluffs: when the bluffs outnumber the value, call.',
  },
  'set-of-queens-check-on-flush-river': {
    why: 'Check: if you bet, the flushes call and the kings fold, so only better hands put more money in. A player who calls twice on this board is mostly holding a heart draw, and they all got there. Check, and fold if they bet big.',
    read: [
      { about: 'preflop', text: 'You opened under the gun and the button called: pairs, suited aces, broadways and suited connectors.' },
      { about: 'opponent', text: 'A player who just calls doesn’t raise draws. They call along with them, so their range stays full of draws until the river.' },
      { about: 'board', text: '8♥4♥2♠ has a heart draw. The K♠ adds kings, and the Q♥ gives you top set but completes the hearts.' },
      { about: 'sizing', text: 'They called two bets on a board with a flush draw: more draws than pairs of eights.' },
      { about: 'range', text: 'Heart draws that got there, which call a bet. Kings like K-J and K-T, which fold.' },
    ],
    takeaway: 'When only better hands will call, check, even with a set.',
  },
  'aces-fold-after-turn-call': {
    why: 'Fold: check-raise, bet, then all in, from a player who only bets big with monsters, is sets and two pair nearly every time. You called the turn to find out where you stood; now you know. You need about 25%, and you win far less.',
    read: [
      { about: 'preflop', text: 'You opened under the gun with aces, and the cutoff and the big blind called.' },
      { about: 'opponent', text: 'This player only bets big with very strong hands. Against them, a big bet is a big hand.' },
      { about: 'board', text: 'J♣5♦2♠ is dry. The 6♥ makes 6-5 two pair, and the T♠ makes J-T two pair.' },
      { about: 'sizing', text: 'A flop check-raise, a turn bet and a river shove: three strong actions in a row.' },
      { about: 'range', text: 'For value: sets J-J, 6-6, 5-5 and 2-2; two pair with 6-5 and J-T suited. A missed draw: 8-7 suited.' },
    ],
    takeaway: 'Against a player who only bets big with monsters, three strong actions mean sets and two pair: fold an overpair.',
  },
};

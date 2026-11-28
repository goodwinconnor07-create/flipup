import type { Lesson } from '../model';

export const L6: Record<string, Lesson> = {
  'fours-full-check-behind': {
    why: 'Check and give up: your full house loses to every hand that called the turn, and none of them fold to a shove. Every king, queen and big pair now has a bigger full house than sixes full. A bluff here should come from hands that block their calls, like A-J or A-5, and sixes block nothing, so a shove just loses another stack and a half.',
    streets: [
      { street: 'preflop', text: 'You open 6♣6♥ from the cutoff, the button calls, a strong small blind 3-bets, and you call. A squeeze over an open and a call is strong.', range: 'Big pairs, A-K, A-Q, A-J, K-Q, some suited bluffs.' },
      { street: 'flop', text: 'On K♣4♦4♥ they c-bet and you call with a pair below the king. On a dry board that bet is most of their range.', range: 'Kings, big pairs, big aces and some air.' },
      { street: 'turn', text: 'The Q♠. They check and you bet over half the pot. A check-call against that size drops their weaker pairs and air; kings and queens stay.', range: 'Kings (A-K, K-Q, K-J), queens (A-Q, Q-J), big pairs, A-4 slow-playing.' },
      { street: 'river', text: 'The 4♣ puts trip fours on the board, giving every king, queen and big pair a bigger full house than yours. Your hand now plays as a bluff, and a poor one: it blocks none of their calls.', range: 'All better than you: kings, queens and big pairs (full houses), A-4 (quads).' },
    ],
    takeaway: 'When your hand beats nothing that calls, it’s a bluff: bluff with hands that block their calls, or give up.',
  },
  'king-high-overbet-bluff': {
    why: 'Overbet: checking wins only when they have nothing, but a big overbet wins almost every time. Their range is capped at a suited A♦x or K-T, and even those can’t call a huge bet. The river ace helps your story: the worst you can look like is a better ace. Play their range, not your cards.',
    streets: [
      { street: 'preflop', text: 'You open K♠7♠ from the cutoff; a weak small blind who calls too much and a passive big blind call. Their strongest hands would 3-bet, so both are capped.', range: 'Wide and capped: suited hands, connectors, pairs and broadways; few premiums.' },
      { street: 'flop', text: 'On T♦4♦4♣ you c-bet; the small blind calls and the big blind folds.', range: 'Tens, small pairs, diamond draws, some floats.' },
      { street: 'turn', text: 'The 3♣ adds club and wheel draws. You keep betting and they call quickly. A quick call is a medium hand or a draw; a strong hand would raise or think.', range: 'Tens, small pairs, diamond and club draws, wheel draws.' },
      { street: 'river', text: 'The A♥ scares every ten and small pair they hold, and they check. Their best hand is a suited A♦x or K-T; everything else is a pair or a missed draw.', range: 'Normal bet but not an overbet: A♦x and K-T. Small only: tens and small pairs. Fold: missed draws.' },
    ],
    takeaway: 'Against a capped range, a big overbet can fold even their best hands: play their range, not your cards.',
  },
  'middle-set-river-raise': {
    why: 'Raise all in: flushes are possible, but overpairs, top pairs and smaller sets all bet this river for value and call a raise, and together they outnumber the flushes and wheels by plenty. You need only 29% to call, but raising wins more because so many worse hands are betting.',
    streets: [
      { street: 'preflop', text: 'Under the gun opens in a tournament and you cold-call with 9♠9♣ and 60 big blinds.', range: 'Big pairs, strong aces, suited broadways, some suited aces like A-4.' },
      { street: 'flop', text: 'On J♥5♠2♦ they c-bet small and you call. A solver-like player bets small here with nearly everything, so the bet doesn’t narrow them.', range: 'Nearly everything: overpairs, jacks, A-K and A-Q, some suited aces.' },
      { street: 'turn', text: 'The 9♥ gives you a set and puts two hearts out. They bet small again, and you just call to keep their overpairs and top pairs betting.', range: 'Overpairs, jacks, sets, heart draws, A-4 with a wheel draw.' },
      { street: 'river', text: 'The 3♥ completes hearts and gives A-4 a wheel. They bet ⅔ pot. From a player who bets thin, that’s a merged range: flushes and straights, but also overpairs, top pairs and smaller sets.', range: 'Ahead: flushes, A-4, top set. Behind: smaller sets, overpairs, top pairs, missed big cards.' },
    ],
    takeaway: 'When their value range is wide, a set can raise even on a scary card: count the calling hands you beat.',
  },
  'nines-full-small-river-bet': {
    why: 'Bet small: a big bet only gets called by kings, which beat you. The hands you beat, ace high, Q-J, Q-T and pairs above nine, only call something small, so a quarter to a third of the pot gets value from them. Sevens full calls any size too.',
    streets: [
      { street: 'preflop', text: 'You open T♠9♠ from second position with about 30 big blinds, and the big blind defends wide against the min-raise.', range: 'Wide: suited hands, broadways, pairs and connectors.' },
      { street: 'flop', text: 'On K♣K♠9♦ you hold plenty of trips in your range, so you bet small with everything, and they call.', range: 'Kings, nines, pocket pairs, ace high, Q-J and Q-T drawing.' },
      { street: 'turn', text: 'The 7♦ adds a diamond draw. You check behind: few worse hands would call a second bet, and the better hands stay anyway.', range: 'Kings, nines, sevens, pairs, ace high and draws.' },
      { street: 'river', text: 'The 9♣ gives you nines full, and they check. A king beats you and never folds, underpairs always fold, and in between sit the hands that pay a small bet.', range: 'Beat you: kings. Split: nines. Calls any size: sevens full. Small only: ace high, Q-J, Q-T, pairs above nine. Fold: pairs below nine.' },
    ],
    takeaway: 'When only better hands call a big bet, bet small enough for the weak hands you beat to call.',
  },
  'aces-crying-call-vs-min-raise': {
    why: 'Call: the min-raise prices you at about one in five, and a loose-aggressive player bluffs more often than that, with paired tens and nines and pocket pairs that block the full houses. Full houses and trips beat you, but you don’t need many bluffs at this price. Fold only if they see you as a player who never folds.',
    streets: [
      { street: 'preflop', text: 'You open A♥A♦ under the gun to 2 and a loose-aggressive big blind defends very wide.', range: 'Wide: suited hands, pairs, connectors and broadways.' },
      { street: 'flop', text: 'On 9♣7♠3♦ you c-bet small, 2.67, and they call: a loose big blind calls a small bet with any piece of this board.', range: 'Pairs, nines and sevens, straight draws like T-8 and 8-6, sets.' },
      { street: 'turn', text: 'The 7♦ pairs the board and they lead small: trips, or a draw taking a cheap shot. Aces are well ahead of the draws, so you just call.', range: 'Trips with a seven, full houses, draws and pairs.' },
      { street: 'river', text: 'The T♥ and they check. A ten or a nine would check here, so you bet big for value, and they min-raise: full houses and trips, or a bluff.', range: 'Value: full houses and trips. Bluffs: paired tens and nines, pocket pairs turned into bluffs.' },
    ],
    takeaway: 'A min-raise offers a huge price: call with a strong one-pair hand unless they never bluff.',
  },
  'two-pair-river-call-not-raise': {
    why: 'Call: you beat the kings and queens that make up most of this bet, so folding is out. But a king or a queen won’t call a raise, and the better two pairs would. Calling wins against the hands you beat and loses least when you’re behind. You need 29%, and you’re well above it.',
    streets: [
      { street: 'preflop', text: 'You open K♥2♥ on the button in a high roller, and both blinds call.', range: 'Wide: suited hands, broadways and pairs.' },
      { street: 'flop', text: 'On Q♠9♥2♦ you c-bet bottom pair; the small blind calls and the big blind folds.', range: 'Queens, nines, straight draws like J-T and K-J, pairs.' },
      { street: 'turn', text: 'The A♠ adds broadway draws. You check behind, which keeps the pot small and makes your range look weaker.', range: 'Queens, nines, aces, broadway draws.' },
      { street: 'river', text: 'The K♦ gives you two pair and completes J-T. They lead ⅔ pot. After your turn check, that’s mostly a king or a queen that thinks it’s good, with some better two pairs.', range: 'Behind: K-J, K-T, Q-J, Q-T. Ahead: A-K, A-Q, K-Q, J-T, 9-9, Q-Q. Some pairs bluffing.' },
    ],
    takeaway: 'When a raise would only be called by better hands, call and let the worse hands keep betting.',
  },
  'ten-high-overbet-jam': {
    why: 'Shove: their range is capped and marginal, and you could easily have a flush or a straight. A shove puts their stack on the line with pairs and weak kings, and most of those fold; a small bet just gets called. Ten high never wins at showdown, so this is your only way to the pot.',
    streets: [
      { street: 'preflop', text: 'The lojack opens, the cutoff calls, and you defend T♠8♣ from the big blind.', range: 'The cutoff: pairs, suited broadways, suited aces and connectors.' },
      { street: 'flop', text: 'K♦7♣5♦ checks round three ways. When nobody bets, most of the strong hands that would have bet are gone from every range.', range: 'Weak kings, middle pairs, draws and air; few sets or strong kings.' },
      { street: 'turn', text: 'The 6♦ hits your range hard: flushes, straights and two pairs. With an open-ender you bet small; the lojack folds and the cutoff calls.', range: 'Pairs below the king, kings that checked, 8-7, 9-8 (a straight), the odd set.' },
      { street: 'river', text: 'The J♠ misses you. The cutoff checked the flop and only called the turn, so they’re capped at pairs and weak kings.', range: 'Normal bet but not a shove: pairs below the king, kings, 8-7. Call anything: J-J and 9-8.' },
    ],
    takeaway: 'Against a capped range, a shove folds the marginal hands that would call a small bet.',
  },
  'set-of-sevens-river-jam': {
    why: 'Shove: the missed spade draws fold to any size, so size for the hands that call. A calling station calls a big bet with tens, kings and even underpairs, and you beat them all. All in is only a little more than the pot and gets the most from those hands; only a bigger set beats you.',
    streets: [
      { street: 'preflop', text: 'Under the gun opens; you call with 7♥7♣ and three more call, including a big blind who is a calling station.', range: 'The big blind: very wide, any pair, lots of suited hands.' },
      { street: 'flop', text: 'You flop a set on T♠7♠2♦. It checks to you, you bet, and only the big blind calls.', range: 'Tens, pairs, spade draws, the odd set.' },
      { street: 'turn', text: 'The K♣ adds kings. You bet big: a calling station hates to fold, so tens and kings pay and the spade draws pay too.', range: 'Tens, kings, underpairs, spade draws, sets.' },
      { street: 'river', text: 'The 3♣ misses the spades and they check. The busted draws fold to anything; the pairs call big.', range: 'Call any size: tens, kings, underpairs. Fold: missed spade draws. Sometimes raise: bigger sets.' },
    ],
    takeaway: 'Against a calling station, size for the hands that call, and that usually means bigger.',
  },
  'top-set-turn-check-raise-all-in': {
    why: 'Check-raise all in: their range is overpairs, A-Q and K-Q, and you beat everything but Q-Q. A tight, passive player won’t bet three streets for you, so the money has to go in while they’re still putting chips in. Their overpairs and top pairs call the last 15 big blinds; calling and hoping for a river bet risks a check behind.',
    streets: [
      { street: 'preflop', text: 'Three players limp, a tight, passive player raises over them, and six of you call, you with T♠T♣ in the big blind. A tight raise over limpers is narrow.', range: 'Big pairs J-J to A-A, and A-K, A-Q and K-Q.' },
      { street: 'flop', text: 'You flop top set on a dry T♥6♠4♣. It checks to the raiser, who bets, and only you call.', range: 'Overpairs, A-K and A-Q betting, smaller sets.' },
      { street: 'turn', text: 'The Q♦ gives A-Q and K-Q top pair and Q-Q a set. They bet again, and a passive player often checks the river with one pair.', range: 'J-J, K-K, A-A, A-Q, K-Q, Q-Q, smaller sets.' },
    ],
    takeaway: 'Against a passive player who won’t keep betting, get your value in while they’re still putting chips in.',
  },
  'kings-vs-aggressive-turn-shove': {
    why: 'Call: an aggressive player shoves many pairs below yours, plus draws like 5-5, A-5 and A-3. Kings are far ahead of that range. You need about 35% and have much more; folding an overpair here would let them shove you off every hand.',
    streets: [
      { street: 'preflop', text: 'An aggressive middle-position player opens; you 3-bet K♥K♠ on the button and they call. Their best hands would 4-bet.', range: 'Pairs, suited aces and big cards, few A-A or K-K.' },
      { street: 'flop', text: 'On 2♣4♠6♥ you c-bet small and they check-raise, which an aggressive player does with pairs below yours and wheel draws.', range: 'Pairs 8-8 to Q-Q, sets, and 5-5, A-5, A-3 and 7-5.' },
      { street: 'turn', text: 'The 7♠ adds a spade draw and they shove: pairs below kings and draws that want you to fold.', range: 'Value: 8-8 to Q-Q. Semi-bluffs: 5-5, A-5 and A-3.' },
    ],
    takeaway: 'Against an aggressive player, an overpair calls a shove when their range is full of smaller pairs and draws.',
  },
};

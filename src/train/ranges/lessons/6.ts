import type { Lesson } from '../model';

export const L6: Record<string, Lesson> = {
  'fours-full-check-behind': {
    why: 'Check and give up: your full house loses to every hand that called the turn, and none of them fold to a shove. Every king or queen, and every big pair, now has a bigger full house than your sixes full. A bluff here should come from hands that block their calls, like A-J or A-5; sixes block nothing. Shoving would just lose another stack and a half.',
    streets: [
      { street: 'preflop', text: 'You open 6♣6♥ from the cutoff, the button calls, and a strong small blind 3-bets; you call and the button folds. A squeeze from the small blind over an open and a call is strong: big pairs, big aces and strong broadways.', range: 'Big pairs, A-K, A-Q, A-J, K-Q, and some suited bluffs.' },
      { street: 'flop', text: 'The flop is K♣4♦4♥. They c-bet and you call with a pair below the king. Their c-bet is most of their range on a dry board.', range: 'Their whole range: kings, big pairs, big aces and some air.' },
      { street: 'turn', text: 'The Q♠. They check, and you bet over half the pot. A check-call against that size drops their pairs worse than queens and their air; what stays is kings and queens.', range: 'Kings (A-K, K-Q, K-J), queens (A-Q, Q-J), big pairs, and A-4 slow-playing.' },
      { street: 'river', text: 'The 4♣ puts trip fours on the board. Every king, queen and big pair now has a bigger full house than your sixes full. Your hand plays like a bluff, and a poor one, because it blocks none of their calls.', range: 'All better than you: kings, queens, big pairs (all full houses), and A-4 (quads).' },
    ],
    takeaway: 'When your hand beats nothing that calls, it’s a bluff: bluff with hands that block their calls, or give up.',
  },
  'king-high-overbet-bluff': {
    why: 'Overbet: checking only wins when they have nothing, but a big overbet wins almost every time. Their range is capped at a suited A♦x or K-T, and even those can’t call a huge bet. The ace on the river makes your story stronger: the worst you can look like is a better ace. Play their range, not your cards.',
    streets: [
      { street: 'preflop', text: 'You open K♠7♠ from the cutoff; a weak small blind who calls too much and a passive big blind call. Both ranges are wide and capped: their strongest hands would 3-bet.', range: 'Wide and capped: suited hands, connectors, pairs and broadways; few premiums.' },
      { street: 'flop', text: 'The flop is T♦4♦4♣. You c-bet, the small blind calls and the big blind folds. A weak player calls with tens, small pairs and diamond draws.', range: 'Tens, small pairs, diamond draws, and some floats.' },
      { street: 'turn', text: 'The 3♣ adds a club draw and wheel draws. You keep the pressure on and they call quickly. A quick call like this is a medium hand or a draw; a strong hand would raise or think.', range: 'Tens, small pairs, diamond and club draws, and wheel draws.' },
      { street: 'river', text: 'The A♥ is a scare card for every ten and small pair they hold, and they check. Their best hands are a suited A♦x or K-T; everything else is a ten, a small pair or a missed draw.', range: 'A♦x and K-T (call a normal bet, fold to an overbet), tens and small pairs (call only small), missed diamond draws (fold).' },
    ],
    takeaway: 'Against a capped range, a big overbet can fold even their best hands: play their range, not your cards.',
  },
  'middle-set-river-raise': {
    why: 'Raise all in: flushes are possible, but overpairs, top pairs and smaller sets all bet this river for value and call a raise. Together they outnumber the flushes and wheels by plenty. You need only 29% to call, but raising wins more because so many worse hands are betting. When their value range is this wide, a set raises.',
    streets: [
      { street: 'preflop', text: 'Under the gun opens in a tournament and you cold-call with 9♠9♣ and 60 big blinds. An under-the-gun range is big pairs, strong aces and suited broadways.', range: 'Big pairs, strong aces, suited broadways and some suited aces like A-4.' },
      { street: 'flop', text: 'The flop is J♥5♠2♦. They c-bet small and you call. A solver-like player bets small here with nearly their whole range, so the bet doesn’t narrow them much.', range: 'Nearly everything: overpairs, jacks, A-K and A-Q, and some suited aces.' },
      { street: 'turn', text: 'The 9♥ gives you a set and puts two hearts out. They bet small again, and you just call to keep their overpairs and top pairs betting.', range: 'Overpairs, jacks, sets, heart draws, and A-4 with a wheel draw.' },
      { street: 'river', text: 'The 3♥ completes hearts and gives A-4 a wheel. They bet ⅔ pot. From a player who bets thin for value, that’s a merged range: flushes and straights, but also overpairs, top pairs and smaller sets.', range: 'Ahead of you: flushes, A-4 and top set. Behind you: smaller sets, overpairs, top pairs and missed big cards.' },
    ],
    takeaway: 'When their value range is wide, a set can raise even on a scary card: count the calling hands you beat.',
  },
  'nines-full-small-river-bet': {
    why: 'Bet small: a big bet only gets called by kings, which beat you. The hands you beat are ace high, Q-J, Q-T and pairs above nine, and they only call something small. A bet of a quarter to a third of the pot gets value from them. Sevens full calls any size too, so you lose nothing there.',
    streets: [
      { street: 'preflop', text: 'You open T♠9♠ from second position in a tournament, and the big blind defends with a wide range.', range: 'Wide: suited hands, broadways, pairs and connectors.' },
      { street: 'flop', text: 'The flop is K♣K♠9♦. You have plenty of trips in your range, so you bet small with everything. They call.', range: 'Kings, nines, pocket pairs, ace high, and broadway draws like Q-J and Q-T.' },
      { street: 'turn', text: 'The 7♦ adds a diamond draw. You check behind: few worse hands call a second bet, and mostly better hands stick around.', range: 'Kings, nines, sevens, pairs, ace high and draws.' },
      { street: 'river', text: 'The 9♣ gives you nines full, and they check. A king never folds, and it beats you now. Underpairs always fold. What’s left to pay you is ace high, Q-J and Q-T, and pairs above nine.', range: 'Kings (call, beat you), nines (split), sevens full (calls, loses), ace high, Q-J, Q-T and pairs above nine (call only small), pairs below nine (fold).' },
    ],
    takeaway: 'When only better hands call a big bet, bet small enough for the weak hands you beat to call.',
  },
  'aces-crying-call-vs-min-raise': {
    why: 'Call: the min-raise gives you a great price, so you need to be good only about one time in five. A loose-aggressive player bluffs more often than that, with paired tens and nines and pocket pairs that block your calls. Full houses and trips beat you, but you don’t need many bluffs at this price. Fold only if they see you as a player who never folds.',
    streets: [
      { street: 'preflop', text: 'You open A♥A♦ under the gun in a tournament and a loose-aggressive big blind defends.', range: 'Wide: suited hands, pairs, connectors and broadways.' },
      { street: 'flop', text: 'The flop is 9♣7♠3♦. You c-bet and they call with pairs, draws and some sevens.', range: 'Pairs, nines and sevens, straight draws like T-8 and 8-6, and sets.' },
      { street: 'turn', text: 'The 7♦ pairs the board, and they lead small. That’s a premium hand like trips, or a draw taking a cheap shot. Aces are well ahead of draws, so you just call.', range: 'Trips with a seven, full houses, draws and pairs.' },
      { street: 'river', text: 'The T♥ arrives and they check. A ten or a nine would check here, so you bet big for value. They min-raise. That’s full houses and trips, or a bluff from paired tens and nines, which block the full houses.', range: 'Value: full houses and trips. Bluffs: paired tens and nines, and pocket pairs turned into bluffs.' },
    ],
    takeaway: 'A min-raise offers a huge price: call with a strong one-pair hand unless they never bluff.',
  },
  'two-pair-river-call-not-raise': {
    why: 'Call: you beat the kings and queens that make up most of this bet, so folding is out. But a king or a queen won’t call a raise, and the better two pairs would. Calling wins against the hands you beat and loses the least when you’re behind. You need 29%, and you’re well above that.',
    streets: [
      { street: 'preflop', text: 'You open K♥2♥ on the button in a high roller, and both blinds call. Their ranges are wide: suited hands, broadways and pairs.', range: 'Wide: suited hands, broadways and pairs.' },
      { street: 'flop', text: 'The flop is Q♠9♥2♦. You c-bet bottom pair; the small blind calls and the big blind folds. The call is queens, nines and draws.', range: 'Queens, nines, straight draws like J-T and K-J, and pairs.' },
      { street: 'turn', text: 'The A♠ adds broadway draws. You check behind: betting big pressures queens and nines, but checking keeps the pot small. Both are fine; your check makes your range look weaker.', range: 'Queens, nines, aces, and broadway draws.' },
      { street: 'river', text: 'The K♦ gives you two pair and completes J-T’s straight. The small blind leads ⅔ pot. After you checked the turn, that lead is mostly a king or a queen that thinks it’s good, with some better two pairs.', range: 'Behind you: K-J, K-T, Q-J and Q-T. Ahead of you: A-K, A-Q, K-Q, J-T, 9-9 and Q-Q. Some pairs turned into bluffs.' },
    ],
    takeaway: 'When a raise would only be called by better hands, call and let the worse hands keep betting.',
  },
  'ten-high-overbet-jam': {
    why: 'Shove: their range is capped and marginal, and you could easily have a flush or a straight. A shove puts their stack on the line with pairs and weak kings, and most of those fold. A small bet just gets called by them. Ten high never wins at a showdown, so this is your only way to win the pot.',
    streets: [
      { street: 'preflop', text: 'The lojack opens in a tournament, the cutoff calls, and you defend T♠8♣ from the big blind. The cutoff’s range is pairs, suited broadways and connectors.', range: 'Pairs, suited broadways, suited aces and connectors.' },
      { street: 'flop', text: 'The flop is K♦7♣5♦ and it checks around three ways. When nobody bets, the strong hands that would have bet are mostly gone from every range.', range: 'Weak kings, middle pairs, draws and air; few sets or strong kings.' },
      { street: 'turn', text: 'The 6♦ puts three diamonds out and connects the board, which hits your range a lot: flushes, straights and two pairs. You have an open-ender, and you bet small; the lojack folds and the cutoff calls.', range: 'Pairs below the king, kings that checked the flop, 8-7, 9-8 (a straight), and the odd set.' },
      { street: 'river', text: 'The J♠ misses your straight draw. The cutoff checked the flop and just called the turn: a capped, marginal range of pairs and weak kings.', range: 'Pairs below the king, kings that checked the flop and 8-7 (call a normal bet, fold to a shove); a set of jacks and 9-8 (call anything).' },
    ],
    takeaway: 'Against a capped range, a shove folds the marginal hands that would call a small bet.',
  },
  'set-of-sevens-river-jam': {
    why: 'Shove: the missed spade draws fold to any size, so size for the hands that call. A calling station calls a big bet with tens, kings and even underpairs, and you beat all of them. All in is only a little more than the pot, and it gets the most from those hands. Only a bigger set beats you.',
    streets: [
      { street: 'preflop', text: 'Under the gun opens in a tournament; you call with 7♥7♣ in middle position, and three more call. Five see the flop, including a big blind who is a calling station.', range: 'The big blind: very wide, any pair and lots of suited hands.' },
      { street: 'flop', text: 'You flop middle set on T♠7♠2♦. It checks to you, you bet, and only the big blind calls. A calling station calls with tens, pairs and spade draws.', range: 'Tens, pairs, spade draws, and the odd set.' },
      { street: 'turn', text: 'The K♣ adds kings. You keep betting, and bet big: the calling station hates to fold, so you get value from kings and tens, and the spade draws pay too.', range: 'Tens, kings, underpairs, spade draws, and sets.' },
      { street: 'river', text: 'The 3♣ misses the spades, and they check. Busted draws fold to any size; tens, kings and even underpairs like 6-6 can call a big bet.', range: 'Tens, kings and underpairs (call any size), missed spade draws (fold), bigger sets (sometimes raise).' },
    ],
    takeaway: 'Against a calling station, size for the hands that call, and that usually means bigger.',
  },
  'top-set-turn-check-raise-all-in': {
    why: 'Check-raise all in: their range is overpairs, A-Q and K-Q, and you beat everything but Q-Q. A tight, passive player won’t bet three streets for you, so the money has to go in now while they’re still putting chips in. Their overpairs and top pairs will call the last 15 big blinds; calling and hoping for a river bet risks a check behind.',
    streets: [
      { street: 'preflop', text: 'Three players limp, a tight, passive player raises over them, and six of you call, you with T♠T♣ in the big blind. A tight player raising over limpers has a narrow range: big pairs and big cards.', range: 'Big pairs like J-J to A-A, and big cards like A-K, A-Q and K-Q.' },
      { street: 'flop', text: 'You flop top set on T♥6♠4♣, a dry board. It checks to the raiser, who bets; only you call. Their overpairs are paying.', range: 'Overpairs, A-K and A-Q (floating or c-betting), and smaller sets.' },
      { street: 'turn', text: 'The Q♦ gives A-Q and K-Q top pair and Q-Q a set. They bet again. A tight, passive player often checks the river with one pair, so the money has to go in now.', range: 'Overpairs J-J, K-K and A-A, top pairs A-Q and K-Q, Q-Q, and smaller sets.' },
    ],
    takeaway: 'Against a passive player who won’t keep betting, get your value in while they’re still putting chips in.',
  },
  'kings-vs-aggressive-turn-shove': {
    why: 'Call: an aggressive player shoves many pairs below yours, plus draws like 5-5, A-5 and A-3. Kings are far ahead of that range. You need about 35%, and you have much more. Folding an overpair here would let them shove you off every hand.',
    streets: [
      { street: 'preflop', text: 'An aggressive middle-position player opens; you 3-bet K♥K♠ on the button and they call. Their range is pairs, suited aces and big cards; their best hands would 4-bet.', range: 'Pairs, suited aces and big cards, few A-A or K-K.' },
      { street: 'flop', text: 'The flop is 2♣4♠6♥, low and connected. You c-bet small and they check-raise. An aggressive player does that with pairs below yours and wheel draws.', range: 'Pairs like 8-8 to Q-Q, sets, and draws like 5-5, A-5, A-3 and 7-5.' },
      { street: 'turn', text: 'The 7♠ adds a spade draw, and they shove. From an aggressive player, that’s many pairs below kings and draws that want fold equity.', range: 'Value: 8-8 to Q-Q. Semi-bluffs: 5-5, A-5 and A-3.' },
    ],
    takeaway: 'Against an aggressive player, an overpair calls a shove when their range is full of smaller pairs and draws.',
  },
};

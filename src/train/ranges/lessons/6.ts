import type { Lesson } from '../model';

export const L6: Record<string, Lesson> = {
  'fours-full-check-behind': {
    why: 'Check and give up: your full house loses to every hand that called the turn, and none of them fold to a shove. Every king or queen now has a bigger full house than your sixes full, and so does every big pair. A bluff here should come from hands that block their calls, like A-J or A-5; sixes block nothing. Shoving just loses another stack and a half.',
    read: [
      { about: 'preflop', text: 'A strong small blind 3-bet your cutoff open after a caller, and you called. Their range is big pairs, big aces and strong broadways.' },
      { about: 'opponent', text: 'A wily, experienced regular. They know a shove from you on this river is rarely what it claims, and they won’t fold a full house to it.' },
      { about: 'board', text: 'K♣4♦4♥ is paired. The Q♠ adds queens, and the 4♣ puts trips on the board: any pair bigger than sixes now beats your sixes full.' },
      { about: 'sizing', text: 'They check-called your turn bet of over half the pot. That drops most pairs worse than queens: they’re left with kings, queens and big pairs.' },
      { about: 'range', text: 'Kings (A-K, K-Q, K-J), queens (A-Q, Q-J) and big pairs all call, and all beat you. A-4 has quads.' },
    ],
    takeaway: 'When your hand beats nothing that calls, it’s a bluff: bluff with hands that block their calls, or give up.',
  },
  'king-high-overbet-bluff': {
    why: 'Bet big: checking only wins when they have nothing at all, but an overbet wins almost every time. Their range is capped at a suited A♦x or K-T, and even those struggle to call a huge bet. The ace on the river also makes your story stronger: the worst you can have looks like a better ace. Play their range, not your cards.',
    read: [
      { about: 'preflop', text: 'A weak small blind who calls too much and a passive big blind called your cutoff open. Both ranges are wide and capped: strong hands would 3-bet.' },
      { about: 'opponent', text: 'A weak player who flat-calls too much takes passive lines with every hand. When they never raise, their range never gets strong.' },
      { about: 'board', text: 'T♦4♦4♣ is paired with a diamond draw. The 3♣ adds clubs and wheel draws. The A♥ is a scare card for every ten and small pair they hold.' },
      { about: 'sizing', text: 'They called the flop and turn quickly. Quick calls like this are tens, small pairs and draws; strong hands would raise or think.' },
      { about: 'range', text: 'Their best hands are a suited A♦x and K-T, which call a normal bet but fold to an overbet. Tens and small pairs call only small, and missed diamond draws fold.' },
    ],
    takeaway: 'Against a capped range, a big overbet can fold even their best hands: play their range, not your cards.',
  },
  'middle-set-river-raise': {
    why: 'Raise all in: flushes are possible, but overpairs, top pairs and smaller sets all bet this river for value and call a raise. Together they outnumber the flushes and wheels by plenty. You need only 29% to call, but raising wins more because so many worse hands are betting. When their value range is this wide, a set raises.',
    read: [
      { about: 'preflop', text: 'An under-the-gun open in a tournament: big pairs, strong aces and suited broadways. You cold-called with 60 big blinds.' },
      { about: 'opponent', text: 'A solver-like player bets small with their whole range and bets thin for value on the river, including overpairs and top pairs on a flush card.' },
      { about: 'board', text: 'J♥5♠2♦ gave you nothing; the 9♥ gave you a set and put two hearts out. The 3♥ completes hearts and gives A-4 a wheel.' },
      { about: 'sizing', text: 'Two small bets and then ⅔ pot on the river is a merged value bet: strong hands and good one-pair hands, not only flushes.' },
      { about: 'range', text: 'Ahead of you: flushes, A-4 and top set. Behind you: smaller sets, overpairs, top pairs and missed big cards.' },
    ],
    takeaway: 'When their value range is wide, a set can raise even on a scary card: count the calling hands you beat.',
  },
  'nines-full-small-river-bet': {
    why: 'Bet small: a big bet only gets called by kings, which beat you. The hands you beat are ace high, Q-J, Q-T and pairs above nine, and they only call something small. A bet of a quarter to a third of the pot gets value from them. Sevens full calls any size too, so you lose nothing there.',
    read: [
      { about: 'preflop', text: 'The big blind defended your early open with a wide range: suited hands, broadways, pairs and connectors.' },
      { about: 'position', text: 'You’re in position. You checked back the turn because few worse hands would call a second bet.' },
      { about: 'board', text: 'K♣K♠9♦ is paired. The 7♦ adds a diamond draw, and the 9♣ gives you nines full. Any king beats you now.' },
      { about: 'sizing', text: 'They called a small flop bet and checked the turn and river. Kings would usually call or raise, but never fold; the rest are weak hands looking for a showdown.' },
      { about: 'range', text: 'Kings call any bet and beat you. Nines split, sevens full calls and loses. Ace high, Q-J, Q-T and pairs above nine call only small. Pairs below nine fold.' },
    ],
    takeaway: 'When only better hands call a big bet, bet small enough for the weak hands you beat to call.',
  },
  'aces-crying-call-vs-min-raise': {
    why: 'Call: the min-raise gives you a great price, so you need to be good only about one time in five. A loose-aggressive player bluffs more often than that, with paired tens and nines and pocket pairs. Full houses and trips beat you, but you don’t need many bluffs at this price. Fold only if they see you as a player who never folds.',
    read: [
      { about: 'preflop', text: 'A loose-aggressive big blind defended your early open with a wide range.' },
      { about: 'opponent', text: 'A loose-aggressive player turns medium hands into bluffs, especially with cards that block your strongest calls.' },
      { about: 'board', text: '9♣7♠3♦ is middling. The 7♦ pairs the board and gives sevens trips, and the T♥ gives tens and nines two pair.' },
      { about: 'sizing', text: 'A small turn lead, a river check, then a min-raise of your pot-size bet. The min-raise asks you to call only 15 into 60.' },
      { about: 'range', text: 'For value: full houses and trips. For bluffs: paired tens and nines, and pocket pairs that can’t call.' },
    ],
    takeaway: 'A min-raise offers a huge price: call with a strong one-pair hand unless they never bluff.',
  },
  'two-pair-river-call-not-raise': {
    why: 'Call: you beat the kings and queens that make up most of this bet, so folding is out. But a king or a queen won’t call a raise, and the better two pairs would. Calling wins against the hands you beat and loses the least when you’re behind. You need 29%, and you’re well above that.',
    read: [
      { about: 'preflop', text: 'Both blinds called your button open in a high roller: wide ranges of suited hands, broadways and pairs.' },
      { about: 'position', text: 'You’re in position and checked back the turn, which made your range look weaker. That invited them to lead the river.' },
      { about: 'board', text: 'Q♠9♥2♦ gave you bottom pair. The A♠ adds broadway draws, and the K♦ gives you two pair and completes J-T’s straight.' },
      { about: 'sizing', text: 'A ⅔-pot lead after you checked back the turn is a value bet: a king or queen that thinks it’s good, and some stronger hands.' },
      { about: 'range', text: 'Behind you: K-J, K-T, Q-J and Q-T. Ahead of you: A-K, A-Q, K-Q, J-T, 9-9 and Q-Q. Some pairs turned into bluffs.' },
    ],
    takeaway: 'When a raise would only be called by better hands, call and let the worse hands keep betting.',
  },
  'ten-high-overbet-jam': {
    why: 'Shove: their range is capped and marginal, and you could easily have a flush or a straight. A shove puts their stack on the line with pairs and weak kings, and most of those fold. A small bet just gets called by them. Ten high never wins at a showdown, so this is your only way to win the pot.',
    read: [
      { about: 'preflop', text: 'The cutoff called the lojack’s open, and you defended the big blind. The cutoff’s range is pairs, suited broadways and connectors.' },
      { about: 'players', text: 'Three players checked the flop. When nobody bets, the strong hands that would have bet are mostly gone from every range.' },
      { about: 'board', text: 'K♦7♣5♦ checked through. The 6♦ puts three diamonds out and connects the board, which helps your range a lot. The J♠ misses your straight draw.' },
      { about: 'sizing', text: 'The cutoff checked the flop and just called your small turn bet. A flush or a strong king would usually bet or raise, so their range is capped.' },
      { about: 'range', text: 'Pairs below the king, kings that checked the flop, and 8-7 call a normal bet but fold to a shove. A set of jacks and 9-8 call anything.' },
    ],
    takeaway: 'Against a capped range, a shove folds the marginal hands that would call a small bet.',
  },
  'set-of-sevens-river-jam': {
    why: 'Shove: the missed spade draws fold to any size, so size for the hands that call. A calling station calls a big bet with tens, kings and even underpairs, and you beat all of them. All in is only a little more than the pot, and it gets the most from those hands. Only a bigger set beats you.',
    read: [
      { about: 'preflop', text: 'Five players saw the flop. The big blind is a calling station who defends wide.' },
      { about: 'opponent', text: 'A calling station hates to fold a pair. Against them, bet bigger with strong hands and bluff less.' },
      { about: 'players', text: 'Five players took the flop, but only the big blind called your bet. Calling into a multiway pot shows a pair or a draw.' },
      { about: 'board', text: 'T♠7♠2♦ gives you middle set with a spade draw on the board. The K♣ adds kings, and the 3♣ misses the spades.' },
      { about: 'sizing', text: 'They check-called two big bets: pairs and draws that wanted to see the river. Now the draws have missed.' },
      { about: 'range', text: 'Tens, kings and underpairs call. Missed spade draws fold. Sets that beat you sometimes raise.' },
    ],
    takeaway: 'Against a calling station, size for the hands that call, and that usually means bigger.',
  },
  'top-set-turn-check-raise-all-in': {
    why: 'Check-raise all in: their range is overpairs, A-Q and K-Q, and you beat everything but Q-Q. A tight, passive player won’t bet three streets for you, so the money has to go in now while they’re still putting chips in. Their overpairs and top pairs will call the last 15 big blinds. Calling and hoping for a river bet risks a check behind.',
    read: [
      { about: 'preflop', text: 'A tight player raised over three limpers, and six of you saw the flop. Their range is narrow: big pairs and big cards.' },
      { about: 'opponent', text: 'A tight, passive regular bets when they’re ahead, but often checks the river with one pair. Get your value while they’re betting.' },
      { about: 'players', text: 'Six saw the flop, but only you called their bet. It’s now heads-up, and their range is still strong.' },
      { about: 'board', text: 'T♥6♠4♣ is dry: top set is far ahead. The Q♦ gives A-Q and K-Q top pair and Q-Q a set.' },
      { about: 'sizing', text: 'Two bets of about half the pot from a tight player: overpairs and top pairs that think they’re good.' },
      { about: 'range', text: 'Overpairs J-J, K-K and A-A; top pairs A-Q and K-Q; a set of queens; smaller sets. You beat everything but Q-Q.' },
    ],
    takeaway: 'Against a passive player who won’t keep betting, get your value in while they’re still putting chips in.',
  },
  'kings-vs-aggressive-turn-shove': {
    why: 'Call: an aggressive player shoves many pairs below yours, plus draws like 5-5, A-5 and A-3. Kings are far ahead of that range. You need about 35%, and you have much more. Folding an overpair here would let them shove you off every hand.',
    read: [
      { about: 'preflop', text: 'An aggressive middle-position player opened and called your 3-bet: pairs, suited aces and big cards. Their best hands would 4-bet.' },
      { about: 'opponent', text: 'An aggressive regular check-raises and shoves with medium pairs and draws, not just monsters.' },
      { about: 'board', text: '2♣4♠6♥ is low and connected, with wheel and straight draws. The 7♠ adds a spade draw.' },
      { about: 'sizing', text: 'A flop check-raise and then a turn shove. From an aggressive player that’s pairs that want to end the hand and draws with fold equity.' },
      { about: 'range', text: 'Pairs below yours: 8-8 to Q-Q. Draws: 5-5, A-5 and A-3.' },
    ],
    takeaway: 'Against an aggressive player, an overpair calls a shove when their range is full of smaller pairs and draws.',
  },
};

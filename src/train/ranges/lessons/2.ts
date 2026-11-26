import type { Lesson } from '../model';

export const L2: Record<string, Lesson> = {
  'flush-or-bluff': {
    why: 'Call: a river check-raise all in is a flush or a bluff, and against that range top pair does the same job as a straight. Calling 81 to win 322 needs you to be right one time in four. Your A♦ also means they can’t hold the nut flush they’re representing. Small pairs that can’t call your bet and missed straight draws give them plenty of bluffs.',
    read: [
      { about: 'preflop', text: 'The small blind 3-bet the button light and then called your 4-bet. Hands that strong usually 5-bet, so their range is pairs, suited aces, broadways and a few suited connectors.' },
      { about: 'position', text: 'You’re in position, so you checked the turn to see a cheap river with a hand that beats their pairs. They act first on every street.' },
      { about: 'board', text: '6♦2♦3♥ is low and connected, with a diamond draw. 5-4 flopped a straight, and the Q♦ put a third diamond out. The 8♠ changes nothing.' },
      { about: 'sizing', text: 'Checking twice and then raising all in on the river is a polarised line. Medium hands call or fold here; only the strongest hands and bluffs check-raise.' },
      { about: 'range', text: 'For value: flushes, 5-4, and some sets. For bluffs: small pairs like 4-4 that can’t call your bet, and missed hands like 6-5 and 7-6.' },
    ],
    takeaway: 'Against a polarised check-raise, every bluff catcher is the same: compare the price with the bluffs, and value a blocker to their nuts.',
  },
  'wheel-vs-overbet': {
    why: 'Call: your wheel beats aces, A-K, A-5 and every bluff; only kings full beats you. Don’t raise. A raise folds out every worse hand, and the hands that call it either beat you or split. Calling keeps their bluffs and thin value bets in, and that’s where your profit comes from. The price is 38%, and you’re far ahead of it.',
    read: [
      { about: 'preflop', text: 'The big blind cold 4-bet over your 3-bet and a cold call. That’s the strongest range at the table: aces, kings, queens, A-K, and a few suited aces as bluffs.' },
      { about: 'position', text: 'You’re in position with the button. They had to act first on the river without knowing whether you’d check behind.' },
      { about: 'board', text: 'K♣5♥2♦ is dry, and the 5♠ pairs the board. The 3♣ makes A-4 the wheel, A-2-3-4-5, and completes nothing else.' },
      { about: 'sizing', text: 'A small flop bet fits a range bet on a dry board. Checking the turn shows they gave up or slowed down with medium hands. An overbet out of nowhere on the river is polarised: very strong, or a bluff from the hands that gave up.' },
      { about: 'range', text: 'For value: kings full, aces, A-K and A-5. A-4 splits with you. The bluffs are A-Q and other hands that missed and can’t win by checking.' },
    ],
    takeaway: 'Raise only when worse hands will call; when a raise folds out everything you beat, just call.',
  },
  'queens-four-bet-pot': {
    why: 'Call: a flush needs a suited hand that 4-bet from under the gun, and there are very few of those. Your set beats every bluff and loses only to aces, the few flushes and 5-4. You need 32%, and you’re comfortably above that. A-K and K-K don’t shove this river; they check or give up, so what’s left is either very strong or a bluff.',
    read: [
      { about: 'preflop', text: 'Under the gun 4-bet your 3-bet: aces, kings, A-K, plus a few suited bluffs like A-5 and small suited connectors. That range has almost no suited hands that make a flush.' },
      { about: 'players', text: 'Heads-up in a 4-bet pot, the pot is already big compared with the stacks. Three bets are enough to get everything in.' },
      { about: 'board', text: 'A♣Q♣2♣ is monotone and ace-high: scary, but only the club-suited hands in their range made a flush. The 3♠ gives 5-4 a wheel. The 9♦ is a blank.' },
      { about: 'sizing', text: 'A small flop bet, a big turn bet, then a shove. Strong hands bet big to get all the money in, and the bluffs that keep firing have to go all the way.' },
      { about: 'range', text: 'For value: top set with aces, the few flushes, and 5-4. For bluffs: suited connectors that missed. A-K and K-K check rather than shove.' },
    ],
    takeaway: 'A monotone board looks scary, but count how many suited hands their range really holds before you fold a set.',
  },
  'rivered-set-tens': {
    why: 'Call: straights and bigger sets beat you, but you beat every bluff, every two pair, every smaller set and every thin one-pair bet. You need 28%, and against a loose player you’re well above it. Your call, call line already looks strong, so their river bets are aimed at exactly the hands you’d fold, and a set isn’t one of them.',
    read: [
      { about: 'preflop', text: 'A loose small blind 3-bet your open: big pairs, A-K, A-Q, and plenty of suited aces and connectors. Wide 3-bets mean wide ranges after the flop.' },
      { about: 'opponent', text: 'A loose recreational player bets often, thin for value and with air. They don’t fold aces easily, and missed aces turn into bluffs.' },
      { about: 'board', text: 'J♣8♠4♦ is dry, but the Q♦ brings straight draws for A-K, K-9 and T-9. The T♥ completes Q-J-T-9-8 for any nine and A-K-Q-J-T for A-K, and gives you a set.' },
      { about: 'sizing', text: 'A small c-bet, a pot-size turn and a ⅔-pot river: steady pressure, not an overbet. Loose players bet like this with a wide mix of strong hands, medium hands and air.' },
      { about: 'range', text: 'For value: A-K, A-9, 9-8 and T-9 straights, Q-Q and J-J. Worse value: 8-8, 4-4, Q-J, A-Q and A-J betting thin. Bluffs: aces with no pair, like A-5 and A-3.' },
    ],
    takeaway: 'Against a loose bettor, a set is a call even when the river completes a straight: too many worse hands and bluffs bet too.',
  },
  'raise-then-fold-eights': {
    why: 'Fold: the raise was right, but the shove almost always has aces full or quads, and you beat neither. Kings, a weak ace and worse full houses could pay your raise. A quiet player who re-raises all in on the river has something specific, and that’s only aces or fours. You need 27%, and the slow-played sevens are too rare to get you there.',
    read: [
      { about: 'preflop', text: 'The big blind 3-bet your cutoff open: big pairs, A-K, suited aces and some lighter hands.' },
      { about: 'position', text: 'Out of position, a 3-bettor who checks an ace-high flop is often slow-playing a monster or holding a medium pair that doesn’t want to bet.' },
      { about: 'board', text: 'A♥7♦4♣ is dry. The 4♠ pairs the board, and the 8♥ gives you eights full. Aces full (A-A) and quads (4-4) still beat you; A-4 is only fours full.' },
      { about: 'sizing', text: 'Two streets of checks remove most bluffs. A small river lead and then a re-raise all in is the strongest line there is: a player doesn’t re-raise with a hand they’d fold.' },
      { about: 'opponent', text: 'A quiet regular rarely turns a hand into a bluff after checking twice, and almost never re-raises all in without the nuts or close to it.' },
      { about: 'range', text: 'Their shove is A-A (aces full) or 4-4 (quads), and sometimes 7-7 slow-played. Only the sevens are worse than you.' },
    ],
    takeaway: 'Raise for value when worse hands can call; fold when a quiet player re-raises all in on the river.',
  },
  'aces-full-river-shove': {
    why: 'Call: count the combos. A-Q, a smaller full house, has six combos you beat; Q-Q and 8-8 have three each that beat you. That’s close to an even split, and you need about 32%. Even if they shove A-Q only half the time, the call is near break-even. Folding a full house here would take a read much stronger than the numbers.',
    read: [
      { about: 'preflop', text: 'Five players limped, you raised big from the button, and a solid player called from the small blind. That range is pairs, suited aces and broadways: the hands that play well out of position.' },
      { about: 'players', text: 'Three players saw the flop, so the small blind led into two opponents. Leading into a multiway pot is strong.' },
      { about: 'board', text: 'Q♠8♠2♠ is monotone. The 2♣ and 2♦ make trips on the board, so every pocket pair and every queen or eight makes a full house. Your aces make twos full of aces.' },
      { about: 'sizing', text: 'Leading and calling a big raise on the flop shows sets, flushes and two pair. Shoving the river into your flop raise with only a flush would risk too much, so the shove is full houses.' },
      { about: 'range', text: 'They shove A-Q (twos full of queens, which you beat) and Q-Q and 8-8 (bigger full houses). There are no bluffs.' },
    ],
    takeaway: 'Count combos: when the hands you beat are about as common as the ones that beat you, the pot odds decide.',
  },
  'nut-flush-paired-river': {
    why: 'Check: a bet only gets called by full houses, which beat you, while the smaller flushes fold. A good player never bluffs a smaller flush into you here. Full houses outnumber the flushes about four to one, so betting loses chips whatever happens. Check, and if they shove, make the disciplined fold.',
    read: [
      { about: 'preflop', text: 'Two good players called your under-the-gun open: pairs, suited aces, broadways and suited connectors.' },
      { about: 'players', text: 'Three to the flop, then heads-up. The hijack raised your turn bet and then called a re-raise: the strongest line on the turn.' },
      { about: 'board', text: 'Q♠8♠5♥ with the A♠ turn made your nut flush. The A♦ pairs the board, so every set and two pair is now a full house.' },
      { about: 'sizing', text: 'Calling a turn 3-bet on a three-flush board means a flush, a set, or two pair that can fill up. There are no bluffs left.' },
      { about: 'range', text: 'Full houses with A-Q, A-8, Q-Q, 8-8 and 5-5, and small flushes like J♠9♠, 9♠7♠ and 7♠6♠. The full houses call any bet; the flushes fold.' },
    ],
    takeaway: 'Bet for value only when worse hands call: when every caller beats you and every worse hand folds, check.',
  },
  'trip-aces-shove-for-value': {
    why: 'Bet big: any ace they hold calls whatever you bet, and more of their aces lose to you than beat you. The best kickers would have raised before the flop, so their aces are mostly A-8 down to A-2. A smaller bet leaves behind chips those aces would have paid. When the hands that call don’t care about size, bet the most you can.',
    read: [
      { about: 'preflop', text: 'The small blind limped and called your raise. That range is wide but capped: A-K and A-Q usually raise first, so their aces have weaker kickers.' },
      { about: 'position', text: 'You’re in position on the small blind, who checked to you on every street. They can only call or raise.' },
      { about: 'players', text: 'Three players took the flop; the limper folded the turn. Calling a bet into two players on the flop and again on the turn shows a real hand.' },
      { about: 'board', text: 'A♠4♠3♣ brings spade and wheel draws. The 9♣ adds clubs, and the A♦ gives you trips with a ten kicker. The draws all missed.' },
      { about: 'sizing', text: 'Check-calling twice shows a made hand that wants a showdown, mostly an ace. Missed draws fold to any bet; aces won’t fold to any size.' },
      { about: 'range', text: 'Smaller aces (A-8 to A-2) call. A-T splits. A-J, A-Q and A-K beat you, but most of them raised first. Full houses are rare. Spade draws that paired the nine call only small bets.' },
    ],
    takeaway: 'When the hands that call don’t care about the size, bet the biggest size you can.',
  },
};

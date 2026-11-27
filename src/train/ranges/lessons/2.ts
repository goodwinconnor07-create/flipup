import type { Lesson } from '../model';

export const L2: Record<string, Lesson> = {
  'flush-or-bluff': {
    why: 'Call: a river check-raise all in is a flush or a bluff, and against that range top pair does exactly the same job as a straight would. Calling 81 into a pot of 241.5 needs you to be right one time in four. Your A♦ also means they can never hold the nut flush they’re representing, and their small pairs and missed straight draws have no other way to win. When the range is this polarised, what matters is the price and the bluffs, not how strong your hand looks.',
    streets: [
      { street: 'preflop', text: 'The button opens, the small blind 3-bets light, and you cold 4-bet from the big blind with A♦Q♥. The button folds and the small blind calls. A light 3-bettor who just calls a 4-bet out of position rarely has A-A or K-K, which would usually 5-bet; what calls is the middle of their 3-bet range.', range: 'Pairs, suited aces, broadways like K-Q and Q-J, and a few suited connectors.' },
      { street: 'flop', text: 'The flop is 6♦2♦3♥, low with a diamond draw and straight draws, and 5-4 has already made a straight. You c-bet small and they call. Out of position in a 4-bet pot, they continue with any pair, any diamond draw, and the straight draws.', range: 'Pairs, diamond draws, straight draws like 5-4 (made), 7-5 and 6-5, and a few sets.' },
      { street: 'turn', text: 'The Q♦ gives you top pair and puts a third diamond out, completing every flush. They check, and you check behind. In position with one pair on a three-flush board, checking keeps the pot small and gets you to the river, where you can still value-bet against their pairs.', range: 'Flushes and sets, 5-4, pairs that didn’t want to bet, and missed draws like 7-6 and 6-5.' },
      { street: 'river', text: 'The 8♠ is a blank. They check, you bet for value, and they check-raise all in. Check-raising all in on the river is the most polarised line there is: medium hands like a pair call or fold, and only the strongest hands and the bluffs raise. Small pairs that can’t call your bet can turn into bluffs too.', range: 'Value: flushes (never the nut one, which you block), sets and 5-4. Bluffs: small pairs like 4-4, and missed 6-5 and 7-6.' },
    ],
    takeaway: 'Against a polarised check-raise, every bluff catcher is the same: compare the price with the bluffs, and value a blocker to their nuts.',
  },
  'wheel-vs-overbet': {
    why: 'Call: your wheel beats aces, A-K, A-5 and every bluff; only kings full beats you, and A-4 splits. Don’t raise. A raise folds every worse hand, and the hands that call it either beat you or split. Calling keeps in their bluffs and thin value bets, and that’s where your profit comes from. You need 38%, and you’re far ahead of that.',
    streets: [
      { street: 'preflop', text: 'The cutoff opens, you 3-bet the button with A♣4♣, the small blind cold-calls, and the big blind cold 4-bets. The cutoff folds and you call. A cold 4-bet over a 3-bet and a call is the strongest range at the table: aces, kings, queens, A-K, and a few suited aces as bluffs.', range: 'A-A, K-K, Q-Q, A-K, and a few suited aces like A-5.' },
      { street: 'flop', text: 'The flop is K♣5♥2♦, dry, and the big blind bets small, 16 into 55. On a king-high board their range is far ahead of yours, so they can bet small with everything. You call with an overcard and a gutshot to the wheel.', range: 'Their whole range: kings, aces, queens, A-K, and A-5 with a pair.' },
      { street: 'turn', text: 'The 5♠ pairs the board, and both of you check. That check matters: a player with a big range advantage who stops betting is usually holding a hand that wants a cheap showdown, like A-A, A-K or Q-Q, or has given up.', range: 'Aces, A-K and queens taking a showdown, A-5 with trips, and hands that gave up.' },
      { street: 'river', text: 'The 3♣ makes your wheel, A-2-3-4-5. Out of nowhere the big blind overbets, 142 into 87. An overbet after a checked turn is polarised: kings full wants to be paid, and the hands that gave up can only win by betting. Aces and A-K also bet here as thin value or as a bluff, since they now lose to any five.', range: 'Value: K-K (kings full), A-5 (trips), A-A and A-K. A-4 splits. Bluffs: A-Q and other hands that gave up.' },
    ],
    takeaway: 'Raise only when worse hands will call; when a raise folds out everything you beat, just call.',
  },
  'queens-four-bet-pot': {
    why: 'Call: a flush needs a suited hand that 4-bet from under the gun, and very few of those hold two clubs. Your set beats every bluff and loses only to aces, the few flushes and 5-4. You need 32%, and you’re comfortably above it. A-K and K-K don’t shove this river; they check or give up, so what’s left is either very strong or a bluff, and the bluffs are plentiful.',
    streets: [
      { street: 'preflop', text: 'Under the gun opens, you 3-bet Q♦Q♥ from the cutoff, and under the gun 4-bets to 29; you call. A 4-bet from under the gun, 300 big blinds deep, is aces, kings and A-K, plus a few suited bluffs like A-5 and small suited connectors.', range: 'A-A, K-K, A-K, and suited bluffs like A-5, 5-4 and 6-5.' },
      { street: 'flop', text: 'The flop is A♣Q♣2♣, monotone and ace-high. You flop a set, but it’s a scary board. They bet small, 18 into about 60, and you call. A 4-bet range has few clubs: only the suited hands, and only the club combos of those.', range: 'Aces, kings with the K♣, A-K, the few club flushes, and suited bluffs with a club.' },
      { street: 'turn', text: 'The 3♠ gives 5-4 a wheel. They bet big, 62 into about 96. Strong hands build the pot now, and draws with the K♣ keep going. Your set is still ahead of most of it, so calling is right.', range: 'Aces (top set), the few flushes, 5-4, the K♣ draws, and some suited bluffs.' },
      { street: 'river', text: 'The 9♦ is a blank, and they shove 191 into about 220. Their value is aces, the few flushes and 5-4; A-K and K-K check or give up rather than shove. That leaves the suited connectors that missed, which have to bet to win.', range: 'Value: aces, the few club flushes, 5-4. Bluffs: missed suited connectors.' },
    ],
    takeaway: 'A monotone board looks scary, but count how many suited hands their range really holds before you fold a set.',
  },
  'rivered-set-tens': {
    why: 'Call: straights and bigger sets beat you, but you beat every bluff, every two pair, every smaller set and every thin one-pair bet. You need 28%, and against a loose player you’re well above it. Your check-call line already looks strong, so their river bets are aimed at exactly the hands you’d fold, and a set isn’t one of them.',
    streets: [
      { street: 'preflop', text: 'You open T♣T♠ from the hijack, and a loose small blind 3-bets small; you call. A loose player 3-bets wide: big pairs, A-K and A-Q, but also lots of suited aces and connectors. A wide 3-bet range means a wide range after the flop.', range: 'Big pairs, A-K, A-Q, suited aces, suited broadways and suited connectors.' },
      { street: 'flop', text: 'The flop is J♣8♠4♦. They c-bet small and you call. A loose player bets almost everything here, so the bet tells you little; your tens are ahead of their missed hands.', range: 'Almost everything: overpairs, jacks, A-K and A-Q, draws and air.' },
      { street: 'turn', text: 'The Q♦ adds straight draws for A-K and K-9 and a diamond draw. They bet the pot. That narrows them toward overpairs, A-K and A-Q, draws and some air. Your tens have a gutshot and beat the air, so you call.', range: 'Overpairs, Q-J, A-Q and A-J, A-K with a straight draw, draws, and some air.' },
      { street: 'river', text: 'The T♥ gives you a set, but completes A-K and any nine. They bet 70 into 109, about ⅔ pot. A loose recreational player bets thin for value and bluffs missed aces here, so this size covers a wide range.', range: 'Value: A-K, A-9, 9-8 and T-9 straights, Q-Q and J-J. Worse value: 8-8, 4-4, Q-J, A-Q and A-J. Bluffs: missed aces like A-5 and A-3.' },
    ],
    takeaway: 'Against a loose bettor, a set calls even when the river completes a straight: too many worse hands and bluffs bet too.',
  },
  'raise-then-fold-eights': {
    why: 'Fold: the raise was right, but the shove is almost always aces full or quads, and you beat neither. When you raised, kings, a weak ace and worse full houses could all pay you. A quiet player who answers with an all-in re-raise has something specific, and with this board that’s only A-A or 4-4; a slow-played 7-7 is the one worse hand, and it’s rare. You need 27%. Raise-then-fold isn’t weakness: the raise wins against the hands that call it, and the fold saves you against the hands that re-raise.',
    streets: [
      { street: 'preflop', text: 'You open 8♣8♦ from the cutoff and the big blind 3-bets to 11; you call, 100 big blinds deep. A 3-bet from the big blind against a cutoff open is strong but not narrow: big pairs, A-K, suited aces, and some lighter hands.', range: 'Big pairs, A-K and A-Q, suited aces, and some light 3-bets with suited broadways.' },
      { street: 'flop', text: 'The flop is A♥7♦4♣, and the big blind checks; you check behind. A 3-bettor holds far more aces than you, so they’d usually bet this flop. A check out of position says one of two things: a medium pair that doesn’t want to face a raise, or a monster that wants you to bluff.', range: 'Medium pairs like 9-9 to Q-Q, some A-A and strong aces checking to trap, and a few sets.' },
      { street: 'turn', text: 'The 4♠ pairs the board and it checks through again. Two checks remove almost every bluff: a player who doesn’t bluff the flop or the turn rarely starts on the river. What’s left is hands that want a showdown, and traps.', range: 'Medium pairs, aces taking it slow, 4-4 (now quads), 7-7, and A-A waiting.' },
      { street: 'river', text: 'The 8♥ gives you eights full. The big blind leads small, 11 into 23.5, and you raise to 34: kings, an ace and worse full houses can all pay. Then they shove. A quiet regular re-raising all in on the river needs a hand that beats a full house, and on A-7-4-4-8 only aces full and quad fours do; A-4 is only fours full.', range: 'A-A (aces full) and 4-4 (quads), and very rarely a slow-played 7-7, which you beat.' },
    ],
    takeaway: 'Raise for value when worse hands can call, and fold when a quiet player re-raises all in on the river.',
  },
  'aces-full-river-shove': {
    why: 'Call: count the combos. A-Q, a smaller full house, has six combos you beat; Q-Q and 8-8 have three each that beat you. That’s close to an even split, and you need about 32%. Even if they shove A-Q only half the time, the call is near break-even, and a solid player can easily shove A-Q here thinking it’s good. Folding a full house would take a read far stronger than the numbers.',
    streets: [
      { street: 'preflop', text: 'Five players limp, you raise big from the button with A♣A♠, and the small blind and one limper call. Raising big over limpers thins the field; a solid player who still calls from the small blind, out of position, has a hand that plays well after the flop.', range: 'Pairs, suited aces and broadways like A-Q, K-Q and Q-J.' },
      { street: 'flop', text: 'The flop is Q♠8♠2♠, monotone. The small blind leads into two players, you raise, and they call; the limper folds. Leading into a multiway pot, then calling a raise, is a strong line: flushes, sets, two pair and big spade draws. Weak pairs don’t take it.', range: 'Flushes, sets Q-Q, 8-8 and 2-2, two pair like Q-8, A-Q with a big spade, and big spade draws.' },
      { street: 'turn', text: 'The 2♣ pairs the board and both of you check. Their check after leading the flop says they slowed down: a flush is now nervous of full houses, and the draws stay cheap. Bluffs are gone.', range: 'Flushes, sets that are now full houses, A-Q, and strong spade draws.' },
      { street: 'river', text: 'The 2♦ puts trips on the board, so every pocket pair and every queen or eight is a full house. The small blind shoves. Shoving a plain flush into your big flop raise on a board this paired would be reckless; the shove is a full house that thinks it’s good.', range: 'A-Q (twos full of queens, which you beat), Q-Q and 8-8 (bigger full houses). No bluffs.' },
    ],
    takeaway: 'Count combos: when the hands you beat are about as common as the ones that beat you, the pot odds decide.',
  },
  'nut-flush-paired-river': {
    why: 'Check: a bet only gets called by full houses, which beat you, while the smaller flushes fold. A good player never bluffs a smaller flush into you here, so there’s no bluff to catch either. Full houses outnumber the flushes about four to one, so betting loses chips whatever happens. Check, and if they shove, make the disciplined fold.',
    streets: [
      { street: 'preflop', text: 'You open K♠T♠ under the gun and two good players call, in the hijack and on the button. Calling an early open with players behind, good players keep hands that play well after the flop.', range: 'Pairs, suited aces, broadways and suited connectors.' },
      { street: 'flop', text: 'The flop is Q♠8♠5♥, with a spade draw. You c-bet big, the hijack calls and the button folds. A big bet on a draw-heavy board narrows them to real hands: queens, eights, sets and spade draws.', range: 'Queens, eights, two pair, sets, and spade draws like J♠9♠ and 7♠6♠.' },
      { street: 'turn', text: 'The A♠ gives you the nut flush. You bet small, the hijack raises, you re-raise and they call. Calling a re-raise on a three-flush board takes a flush, a set, or two pair that can fill up on the river.', range: 'Smaller flushes, sets Q-Q, 8-8 and 5-5, and two pairs A-Q and A-8.' },
      { street: 'river', text: 'The A♦ pairs the board, so every set and two pair is now a full house. You’re first to act. Most of their range just went past you; only three small flushes remain behind, and they have no bluffs.', range: 'Full houses A-Q, A-8, Q-Q, 8-8 and 5-5, which call any bet; small flushes J♠9♠, 9♠7♠ and 7♠6♠, which fold.' },
    ],
    takeaway: 'Bet for value only when worse hands call: when every caller beats you and every worse hand folds, check.',
  },
  'trip-aces-shove-for-value': {
    why: 'Bet big: any ace they hold calls whatever you bet, and more of their aces lose to you than beat you. The best kickers would have raised before the flop, so their aces are mostly A-8 down to A-2, and A-T splits. A smaller bet leaves behind chips those aces would have paid, while the missed draws fold to any size anyway. When the hands that call don’t care about the size, bet the most you can.',
    streets: [
      { street: 'preflop', text: 'Under the gun limps, the small blind completes, and you raise from the big blind with A♥T♠; both call. A limp-call is wide but capped: A-K and A-Q usually raise first, so the aces they hold have weaker kickers. That cap will decide the river.', range: 'Wide and capped: weak aces, suited kings, suited connectors and small pairs; rarely A-K or A-Q.' },
      { street: 'flop', text: 'The flop is A♠4♠3♣. You bet into two players and both call. On a low board with spade and wheel draws, calling a bet multiway takes an ace, a small pair, or a draw.', range: 'Aces with weak kickers, small pairs, spade draws and wheel draws like 5-2 and 6-5.' },
      { street: 'turn', text: 'The 9♣ adds a club draw. The limper folds and the small blind calls again. Two calls from the small blind are mostly an ace now, plus the draws that are still live.', range: 'Aces from A-9 down to A-2, some spade and wheel draws, and the odd two pair.' },
      { street: 'river', text: 'The A♦ gives you trips with a ten kicker, and the small blind checks. Every draw missed. Their aces don’t fold to any bet on a board with three aces; their missed draws fold to anything.', range: 'A-8 down to A-2 (call any size), A-T (split), A-J, A-Q and A-K (rare, beat you), full houses (rare), missed draws (fold).' },
    ],
    takeaway: 'When the hands that call don’t care about the size, bet the biggest size you can.',
  },
};

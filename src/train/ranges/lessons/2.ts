import type { Lesson } from '../model';

export const L2: Record<string, Lesson> = {
  'flush-or-bluff': {
    why: 'Call: a river check-raise all in is a flush or a bluff, and against that range top pair does the same job a straight would. You’re calling 81 into 241.5, so you need to be right one time in four. Your A♦ means they never hold the nut flush they represent, and their small pairs and missed straight draws have no other way to win. Against a range this polarised, the price and the bluffs decide, not how strong your hand looks.',
    streets: [
      { street: 'preflop', text: 'The button opens, the small blind 3-bets light, and you cold 4-bet A♦Q♥ from the big blind; the small blind calls. A light 3-bettor who flats a 4-bet out of position rarely has A-A or K-K, which would 5-bet.', range: 'Pairs, suited aces, broadways like K-Q and Q-J, a few suited connectors.' },
      { street: 'flop', text: 'On 6♦2♦3♥ you c-bet small and they call. In a 4-bet pot they continue with any pair or draw, and 5-4 has already made a straight.', range: 'Pairs, diamond draws, 5-4 (made), straight draws like 7-5 and 6-5, a few sets.' },
      { street: 'turn', text: 'The Q♦ gives you top pair and completes every flush. They check and you check behind: one pair on a three-flush board keeps the pot small and can still value-bet the river.', range: 'Flushes and sets, 5-4, pairs that didn’t bet, and missed draws like 7-6 and 6-5.' },
      { street: 'river', text: 'The 8♠ is a blank. They check, you bet for value, and they check-raise all in. That’s the most polarised line there is: a pair calls or folds, so only the strongest hands and bluffs raise, including small pairs that couldn’t call your bet.', range: 'Value: flushes (never the nut one, which you block), sets, 5-4. Bluffs: small pairs like 4-4, missed 6-5 and 7-6.' },
    ],
    takeaway: 'Against a polarised check-raise, every bluff catcher is the same: compare the price with the bluffs, and value a blocker to their nuts.',
  },
  'wheel-vs-overbet': {
    why: 'Call: your wheel beats aces, A-K, A-5 and every bluff; only kings full beats you, and A-4 splits. Don’t raise: a raise folds every worse hand, and the hands that call it beat you or split. Calling keeps in their bluffs and thin value bets, which is where the profit is. You need 38%, and you’re far ahead of that.',
    streets: [
      { street: 'preflop', text: 'You 3-bet A♣4♣ on the button over a cutoff open, the small blind cold-calls, and the big blind cold 4-bets; you call. A cold 4-bet over a 3-bet and a call is the strongest range at the table.', range: 'A-A, K-K, Q-Q, A-K, and a few suited aces like A-5.' },
      { street: 'flop', text: 'On K♣5♥2♦ the big blind bets small, 16 into 55. Their range is far ahead on a king-high board, so they bet small with everything. You call with an overcard and a wheel gutshot.', range: 'Their whole range: kings, aces, queens, A-K, and A-5.' },
      { street: 'turn', text: 'The 5♠ pairs the board and both of you check. A player with the bigger range who stops betting usually wants a cheap showdown with aces, A-K or queens, or has given up.', range: 'Aces, A-K and queens taking a showdown, A-5 with trips, and hands that gave up.' },
      { street: 'river', text: 'The 3♣ makes your wheel. The big blind overbets 142 into 87. After a checked turn that’s polarised: kings full wants paying, the hands that gave up can only win by betting, and aces and A-K now lose to any five, so they bet too.', range: 'Value: K-K, A-5, A-A and A-K. Split: A-4. Bluffs: A-Q and other hands that gave up.' },
    ],
    takeaway: 'Raise only when worse hands will call; when a raise folds out everything you beat, just call.',
  },
  'queens-four-bet-pot': {
    why: 'Call: a flush needs a suited hand that 4-bet from under the gun, and very few of those hold two clubs. Your set loses only to aces, the few flushes and 5-4, and beats every bluff. A-K and K-K check or give up rather than shove, so what’s left is very strong or a bluff, and the bluffs are plentiful. You need 32%, and you’re comfortably above it.',
    streets: [
      { street: 'preflop', text: 'You 3-bet Q♦Q♥ from the cutoff over an under-the-gun open, and they 4-bet to 29; you call, 300 big blinds deep. An early 4-bet is mostly premium hands with a few suited bluffs.', range: 'A-A, K-K, A-K, and suited bluffs like A-5, 5-4 and 6-5.' },
      { street: 'flop', text: 'You flop a set on A♣Q♣2♣, a scary monotone board. They bet small, 18 into 60, and you call. A 4-bet range holds few clubs: only the club combos of its suited hands.', range: 'Aces, K♣ hands, A-K, the few club flushes, and suited bluffs with a club.' },
      { street: 'turn', text: 'The 3♠ gives 5-4 a wheel. They bet big, 62 into 96: strong hands build the pot and K♣ draws keep going. Your set is still ahead of most of it.', range: 'Aces, the few flushes, 5-4, the K♣ draws, some suited bluffs.' },
      { street: 'river', text: 'The 9♦ is a blank and they shove 191 into 220. A-K and K-K would check or give up here, so the shove is aces, a flush, 5-4, or a missed suited connector that has to bet to win.', range: 'Value: aces, the few club flushes, 5-4. Bluffs: missed suited connectors.' },
    ],
    takeaway: 'A monotone board looks scary, but count how many suited hands their range really holds before you fold a set.',
  },
  'rivered-set-tens': {
    why: 'Call: straights and bigger sets beat you, but you beat every bluff, two pair, smaller set and thin one-pair bet. Your check-call line already looks strong, so their river bets are aimed at hands you’d fold, and a set isn’t one. You need 28%, and against a loose player you’re well above it.',
    streets: [
      { street: 'preflop', text: 'You open T♣T♠ from the hijack, a loose small blind 3-bets small, and you call. A wide 3-bet range means a wide range after the flop.', range: 'Big pairs, A-K, A-Q, suited aces, suited broadways and suited connectors.' },
      { street: 'flop', text: 'On J♣8♠4♦ they c-bet small and you call. A loose player bets almost everything here, so the bet tells you little, and your tens are ahead of their misses.', range: 'Almost everything: overpairs, jacks, A-K and A-Q, draws and air.' },
      { street: 'turn', text: 'The Q♦ adds straight and diamond draws, and they bet the pot. That narrows them toward overpairs, queens and jacks, draws and some air. Your tens have a gutshot and beat the air, so you call.', range: 'Overpairs, Q-J, A-Q and A-J, A-K with a straight draw, draws, some air.' },
      { street: 'river', text: 'The T♥ gives you a set but completes A-K and any nine. They bet 70 into 109. A loose player bets thin for value and bluffs missed aces here, so this size covers a wide range.', range: 'Value: A-K, A-9, 9-8, T-9, Q-Q and J-J. Worse value: 8-8, 4-4, Q-J, A-Q, A-J. Bluffs: missed aces like A-5 and A-3.' },
    ],
    takeaway: 'Against a loose bettor, a set calls even when the river completes a straight: too many worse hands and bluffs bet too.',
  },
  'raise-then-fold-eights': {
    why: 'Fold: the raise was right, but the shove is almost always aces full or quads, and you beat neither. When you raised, kings, a weak ace and worse full houses could pay you. A quiet player who answers with an all-in has a hand that beats a full house; a slow-played 7-7 is the only worse one, and it’s rare. You need 27%. Raise-then-fold isn’t weakness: the raise wins against the callers, the fold saves you against the re-raisers.',
    streets: [
      { street: 'preflop', text: 'You open 8♣8♦ from the cutoff, the big blind 3-bets to 11 and you call, 100 big blinds deep. A big blind 3-bets a cutoff open strong but not narrow.', range: 'Big pairs, A-K and A-Q, suited aces, some light suited broadways.' },
      { street: 'flop', text: 'On A♥7♦4♣ the big blind checks and you check behind. A 3-bettor holds far more aces than you and would usually bet, so the check is a medium pair avoiding a raise, or a monster setting a trap.', range: 'Pairs like 9-9 to Q-Q, some A-A and strong aces trapping, a few sets.' },
      { street: 'turn', text: 'The 4♠ pairs the board and it checks through again. A player who bluffs neither the flop nor the turn rarely starts on the river, so what’s left wants a showdown or is trapping.', range: 'Medium pairs, slow aces, 4-4 (now quads), 7-7, and A-A waiting.' },
      { street: 'river', text: 'The 8♥ gives you eights full. They lead small, 11 into 23.5, you raise to 34, and they shove. On A-7-4-4-8 only aces full and quad fours beat a full house; A-4 is only fours full.', range: 'A-A and 4-4, and very rarely a slow-played 7-7, which you beat.' },
    ],
    takeaway: 'Raise for value when worse hands can call, and fold when a quiet player re-raises all in on the river.',
  },
  'aces-full-river-shove': {
    why: 'Call: count the combos. A-Q, a smaller full house, is six combos you beat; Q-Q and 8-8 are three each that beat you. You need about 32%, so even if they shove A-Q only half the time the call is close to even, and a solid player can easily shove A-Q here thinking it’s good. Folding a full house would take a far stronger read.',
    streets: [
      { street: 'preflop', text: 'Five players limp and you raise big on the button with A♣A♠; the small blind and one limper call. A solid player who still calls out of position has a hand that plays well after the flop.', range: 'Pairs, suited aces, broadways like A-Q, K-Q and Q-J.' },
      { street: 'flop', text: 'On Q♠8♠2♠ the small blind leads into two players, you raise, and they call; the limper folds. Leading multiway and calling a raise is strong: weak pairs don’t take that line.', range: 'Flushes, sets Q-Q, 8-8 and 2-2, two pair like Q-8, A-Q with a big spade, big spade draws.' },
      { street: 'turn', text: 'The 2♣ pairs the board and both of you check. The leader slowed down: a flush now fears full houses and the draws stay cheap. The bluffs are gone.', range: 'Flushes, sets that are now full houses, A-Q, and strong spade draws.' },
      { street: 'river', text: 'The 2♦ puts trips on the board, so every pocket pair and every queen or eight is a full house. They shove. A plain flush shoving into your flop raise on this board would be reckless; this is a full house that thinks it’s good.', range: 'A-Q (twos full of queens, which you beat), and Q-Q and 8-8. No bluffs.' },
    ],
    takeaway: 'Count combos: when the hands you beat are about as common as the ones that beat you, the pot odds decide.',
  },
  'nut-flush-paired-river': {
    why: 'Check: a bet only gets called by full houses, which beat you, and the smaller flushes fold. A good player never bluffs a smaller flush into you here, so there’s nothing to catch either. Full houses outnumber their flushes about four to one, so betting loses whatever happens. Check, and fold if they shove.',
    streets: [
      { street: 'preflop', text: 'You open K♠T♠ under the gun, and two good players call in the hijack and on the button. With players behind, they keep hands that play well after the flop.', range: 'Pairs, suited aces, broadways and suited connectors.' },
      { street: 'flop', text: 'On Q♠8♠5♥ you c-bet big; the hijack calls and the button folds. A big bet on a draw-heavy board narrows them to real hands.', range: 'Queens, eights, two pair, sets, and spade draws like J♠9♠ and 7♠6♠.' },
      { street: 'turn', text: 'The A♠ gives you the nut flush. You bet small, they raise, you re-raise and they call. Calling a re-raise on a three-flush board takes a flush, a set, or two pair that can fill up.', range: 'Smaller flushes, sets Q-Q, 8-8 and 5-5, two pairs A-Q and A-8.' },
      { street: 'river', text: 'The A♦ pairs the board, so every set and two pair is now a full house. You act first. Most of their range just passed you; only three small flushes are behind, and they have no bluffs.', range: 'Full houses A-Q, A-8, Q-Q, 8-8 and 5-5 (call any bet). Small flushes J♠9♠, 9♠7♠ and 7♠6♠ (fold).' },
    ],
    takeaway: 'Bet for value only when worse hands call: when every caller beats you and every worse hand folds, check.',
  },
  'trip-aces-shove-for-value': {
    why: 'Bet big: any ace they hold calls whatever you bet, and more of their aces lose to you than beat you. Their best kickers would have raised before the flop, so their aces are mostly A-8 down to A-2, and A-T splits. A smaller bet leaves chips those aces would have paid, and the missed draws fold to any size anyway.',
    streets: [
      { street: 'preflop', text: 'Under the gun limps, the small blind completes, and you raise A♥T♠ from the big blind; both call. A limp-call is wide but capped: A-K and A-Q usually raise first, so their aces have weaker kickers.', range: 'Wide and capped: weak aces, suited kings, suited connectors, small pairs; rarely A-K or A-Q.' },
      { street: 'flop', text: 'On A♠4♠3♣ you bet into two players and both call. Calling a bet multiway on a low board takes an ace, a small pair or a draw.', range: 'Weak-kicker aces, small pairs, spade draws, wheel draws like 5-2 and 6-5.' },
      { street: 'turn', text: 'The 9♣ adds a club draw. The limper folds and the small blind calls again: mostly an ace now, plus the live draws.', range: 'Aces from A-9 down to A-2, some spade and wheel draws, the odd two pair.' },
      { street: 'river', text: 'The A♦ gives you trips with a ten kicker, and they check. Every draw missed. With three aces on the board, their aces won’t fold to any size, and their missed draws fold to anything.', range: 'Call any size: A-8 down to A-2. Split: A-T. Beat you: rare A-J, A-Q, A-K and full houses. Fold: missed draws.' },
    ],
    takeaway: 'When the hands that call don’t care about the size, bet the biggest size you can.',
  },
};

import type { Lesson } from '../model';

export const L9: Record<string, Lesson> = {
  'ace-five-fold-to-river-overbet': {
    why: 'Fold: their overbet is trip queens and full houses, or ace-high bluffs like A-2, A-3 and A-4 suited. You beat only the bluffs, and your A♥ removes some of them. You need 38% and you’re short. A five without an ace would be a better bluff catcher here, because it leaves their bluffs alone.',
    streets: [
      { street: 'preflop', text: 'The hijack opens and you 3-bet A♥5♥ from the cutoff; they call.', range: 'Pairs, big aces, suited broadways, suited aces like A-2 to A-4.' },
      { street: 'flop', text: 'On K♦Q♦5♠ you have bottom pair. You bet small and they call.', range: 'Kings, queens, diamond and straight draws, pairs, suited aces with a draw.' },
      { street: 'turn', text: 'The Q♣ pairs the board. They check and you check back: a five gets no value and can’t face a check-raise.', range: 'Kings and queens, full houses, draws, suited aces that missed.' },
      { street: 'river', text: 'The 7♥ and they overbet 1½ times the pot. A world-class player balances this: value from queens and full houses, bluffs from suited aces. Your A♥ takes away some of those bluffs.', range: 'Value: trip queens, K-Q, 7-7, 5-5, some kings full. Bluffs: A-2, A-3 and A-4 suited.' },
    ],
    takeaway: 'A blocker to their bluffs makes your bluff catcher worse: hold a card from their value hands instead.',
  },
  'top-pair-call-lag-river-barrel': {
    why: 'Call: J-T, 7-6 and two pair beat you, but a loose-aggressive player gets here with lots of missed diamond and straight draws and keeps firing them. You need 30%, and those bluffs clear it.',
    streets: [
      { street: 'preflop', text: 'You open A♦Q♥ from the cutoff and a loose-aggressive player defends the big blind.', range: 'Wide: suited hands, connectors, broadways and pairs.' },
      { street: 'flop', text: 'You flop top pair, top kicker on Q♠5♥3♦, and they check-raise: from this player often a draw or a weaker pair, as well as some strong hands. You call.', range: 'Two pairs, sets, weaker queens, draws like 6-4, A-4 and 4-2.' },
      { street: 'turn', text: 'The 8♦ adds a diamond draw and they bet ¾ pot, most often a draw or a pair with outs.', range: 'Two pairs and sets, diamond and straight draws, weaker pairs.' },
      { street: 'river', text: 'The 9♣ completes J-T and 7-6, and they bet ¾ pot again. Three streets of pressure is how this player plays draws as well as strong hands, and most of their draws missed.', range: 'Ahead: J-T, 7-6, two pairs, sets. Behind: missed diamond draws, 6-4, A-4, 4-2.' },
    ],
    takeaway: 'Against a player who keeps betting their draws, top pair, top kicker calls down unless they never bluff.',
  },
  'ace-king-call-splashy-river-lead': {
    why: 'Call: the lead could be two pair or a set, but from a splashy player it’s often a worse ace setting its own price. You need 25% and you’re ahead more than half the time. Fold only against a tight, straightforward player who never leads without a big hand.',
    streets: [
      { street: 'preflop', text: 'You open A♦K♣ from second position, 368 big blinds deep; three players call, including a splashy small blind.', range: 'The small blind: any ace, pairs, suited hands.' },
      { street: 'flop', text: 'You flop top pair, top kicker on A♣6♦2♥, and only the small blind calls your bet.', range: 'Aces, sixes and deuces, small pairs, wheel draws.' },
      { street: 'turn', text: 'The 9♥. You bet a medium size: worse aces call it, and a big bet would fold their sixes and deuces.', range: 'Worse aces, two pairs, sets, some sixes.' },
      { street: 'river', text: 'The 4♦ and they lead half the pot. That shows some strength, but a splashy player also leads worse aces here so they don’t face a bigger bet from you.', range: 'Value: two pair and sets. Often: worse aces making a blocker bet.' },
    ],
    takeaway: 'A small river lead from a loose player is often a worse hand setting its own price: call with top pair, top kicker.',
  },
  'flush-river-all-in-vs-checked-turn': {
    why: 'Shove: after they checked the turn, a bluff from them is unlikely, so checking won’t win more. Their jacks and aces call even a shove, and you beat both. Full houses beat you, but most would have bet the turn, and with so little behind any big bet is all in anyway.',
    streets: [
      { street: 'preflop', text: 'The chip leader opens to 2 under the gun +1, and you defend K♣2♣ from the big blind with 19 big blinds.', range: 'Pairs, broadways, suited aces and suited connectors.' },
      { street: 'flop', text: 'On J♠J♣7♣ you have a flush draw. You check-raise and they 3-bet, perhaps bullying with the big stack; you call.', range: 'Jacks, sevens, overpairs, club draws, bullying bluffs.' },
      { street: 'turn', text: 'The A♣ gives you the nut flush. You check, hoping they bet, but they check back. Strong hands would bet here, so the check says marginal.', range: 'A jack, an ace, an underpair or junk; few full houses.' },
      { street: 'river', text: 'The 6♠ is a blank and you act first. Their underpairs and junk would check behind, but their jacks, aces and full houses will call a bet.', range: 'Call even a shove: a jack, an ace. Beat you: A-J, 7-7, 6-6. Fold: underpairs and junk.' },
    ],
    takeaway: 'When their check means they won’t bluff, bet for value yourself: their trips and top pairs call even a shove.',
  },
  'two-pair-river-value-vs-aces': {
    why: 'Bet about ¾ pot: your targets are worse aces, and they call a solid bet but not a shove. Underpairs fold whatever you do. A smaller bet is fine but gets less from the aces, and a shove gets called by nothing worse.',
    streets: [
      { street: 'preflop', text: 'Under the gun opens, the hijack calls, and you call in the cutoff with A♠Q♣.', range: 'The opener: big pairs, big aces, suited broadways.' },
      { street: 'flop', text: 'You flop top pair on A♣6♦4♠. Both check to you; you bet and only under the gun calls.', range: 'Aces, underpairs, sets 6-6 and 4-4.' },
      { street: 'turn', text: 'The Q♠ gives you top two. You bet ¾ pot, a size worse aces call; a bigger one would fold them.', range: 'Worse aces like A-J, A-T and suited aces; A-Q; sets; underpairs.' },
      { street: 'river', text: 'The 9♣ changes nothing and they check. Underpairs fold to any bet; the worse aces are the hands that pay.', range: 'Normal bet, not a shove: worse aces. Split: A-Q. Beat you: 6-6, 4-4, 9-9. Fold: underpairs.' },
    ],
    takeaway: 'Find the hands that will pay, here worse aces, and bet the most they’ll call.',
  },
  'aces-river-shove-one-to-one': {
    why: 'Shove: the draws missed and fold anyway, so size for the one-pair hands that call. A queen, a nine, or K-K to T-T won’t fold often enough to make a smaller bet better, and only sets beat you. With about a pot behind, go all in.',
    streets: [
      { street: 'preflop', text: 'Under the gun opens and calls your 3-bet on the button with A♦A♥.', range: 'Pairs, big aces and suited broadways.' },
      { street: 'flop', text: 'On Q♦9♦2♣ you bet and they call; your A♦ blocks the best diamond draws.', range: 'Queens, nines, pairs, diamond and straight draws.' },
      { street: 'turn', text: 'The 4♣ adds a second flush draw. You bet 22 into 37.5, a size a queen or a nine can’t fold, and they call.', range: 'Queens, nines, K-K to T-T, sets, club and diamond draws.' },
      { street: 'river', text: 'The 5♥ misses both draws and they check. The busted draws fold to anything; the one-pair hands call, and you crush them.', range: 'Call: a queen, a nine, K-K, J-J, T-T. Beat you: sets. Fold: busted draws.' },
    ],
    takeaway: 'With about a pot left, one-pair hands that call a big bet usually call a shove: go all in.',
  },
  'set-river-shove-vs-sticky-player': {
    why: 'Shove: the draws missed and fold to anything, but this player calls with any pair, so bet the most you can. All in is only a little more than the pot, and a smaller bet just loses value against pairs that would have called anyway.',
    streets: [
      { street: 'preflop', text: 'Five players see the flop, you with 7♥7♣ in the hijack. The big blind is very sticky and hates to fold.', range: 'The big blind: very wide.' },
      { street: 'flop', text: 'You flop middle set on T♥7♠2♠. It checks to you, you bet, and only the sticky big blind calls.', range: 'Tens, pairs, spade and straight draws.' },
      { street: 'turn', text: 'The K♣ is great for you. You bet a medium size: big folds their top pairs, small gives draws a cheap call.', range: 'Tens, kings, pairs, two pairs, spade and straight draws.' },
      { street: 'river', text: 'The 3♣ misses every draw and they check. This player calls with any pair, and the busted draws fold whatever you bet.', range: 'Call any size: any pair, two pair. Beat you: sets. Fold: missed draws.' },
    ],
    takeaway: 'Against a sticky player, the hands that call don’t care about size: bet the most you can.',
  },
  'nut-flush-river-big-bet-paired-board': {
    why: 'Overbet: you have the effective nuts, and their second-best hands, two pair, straights and smaller flushes, call whatever you bet. Only the one-pair hands care about size, and you’re not betting for them. Full houses are possible, but that’s no reason to check.',
    streets: [
      { street: 'preflop', text: 'You open A♥5♥ on the button, 50 big blinds deep, and the big blind defends wide.', range: 'Suited hands, connectors, pairs and broadways.' },
      { street: 'flop', text: 'On J♥9♥2♦ you have the nut flush draw. You bet small, 1.5, and they call.', range: 'Jacks, nines, two pairs, straight draws like K-Q, Q-T and T-8, heart draws.' },
      { street: 'turn', text: 'The 2♥ gives you the nut flush. You bet nearly the pot: big enough to build it, small enough to keep nines and one-heart hands in.', range: 'Two pairs, straight draws, smaller hearts, trips, jacks.' },
      { street: 'river', text: 'The T♦ makes straights for K-Q, Q-8 and 8-7, and they check. Two pair, straights and flushes call any bet you make.', range: 'Call any size: smaller flushes, K-Q, Q-8, 8-7, J-9, J-T, T-9, trips and full houses. Small only: one pair.' },
    ],
    takeaway: 'When their second-best hands call any size, bet big with the nuts.',
  },
  'top-pair-value-monotone-river': {
    why: 'Bet about ¾ pot: their turn check takes most of the hands that beat you out of their range, and plenty of worse made hands are left. Worse jacks, nines, eights and small pairs call a normal bet; a huge bet folds them, and checking only works against someone who bluffs a lot.',
    streets: [
      { street: 'preflop', text: 'Near the bubble the hijack opens; you call in the small blind with A♠J♠ and the big blind calls too.', range: 'Pairs, broadways, suited aces and suited connectors.' },
      { street: 'flop', text: 'You flop top pair, top kicker on a monotone J♦8♦3♦ with no diamond. The hijack bets small, you call, the big blind folds.', range: 'Their whole range: jacks, pairs, diamonds, air.' },
      { street: 'turn', text: 'The 9♥ and they check back. A flush or a set would usually bet here, so their range just got weaker.', range: 'Worse jacks, nines, eights, pairs, a few strong hands checking.' },
      { street: 'river', text: 'The 6♣ and you act first. They hold lots of worse jacks, nines, eights and small pairs that call a normal bet.', range: 'Call a normal bet: K-J, Q-J, J-T, nines, eights, small pairs. Some better hands. Fold: ace and king high.' },
    ],
    takeaway: 'When their check behind removes most strong hands, bet top pair for value at a size worse hands call.',
  },
  'set-call-river-lead-straight-board': {
    why: 'Call: any five and T-9 beat you, and a loose defender has lots of those. But they also lead sets and two pair for thin value, and top set beats all of them. You need about 26% and you’re just above it; fold only if you’re sure they lead nothing but a straight.',
    streets: [
      { street: 'preflop', text: 'You open Q♦Q♣ from the lojack and a loose-aggressive player defends the big blind, with many fives in a range like that.', range: 'Wide: suited hands, connectors, pairs and broadways.' },
      { street: 'flop', text: 'On a low, connected 7♦6♦4♠ you check back your overpair: you don’t want a big pot on this board.', range: 'Pairs, straight and flush draws, two pairs and sets.' },
      { street: 'turn', text: 'The Q♠ gives you top set. They check, you bet 3.33, and they call.', range: 'Pairs, two pairs, sets, 8-5 and 5-3 straights, T-9, 9-8 and diamond draws.' },
      { street: 'river', text: 'The 8♥ makes a straight for any five and for T-9, and they lead over half the pot. A loose player leads straights, but also sets and two pair for thin value.', range: 'Ahead: any five, T-9. Behind: smaller sets and two pairs leading thin.' },
    ],
    takeaway: 'When a loose player leads a scary river, remember they lead thinner hands too: a set can call.',
  },
};

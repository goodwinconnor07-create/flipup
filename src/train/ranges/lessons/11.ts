import type { Lesson } from '../model';

export const L11: Record<string, Lesson> = {
  'eights-polarised-river-call': {
    why: 'Call: facing a half-pot bet you need to be good only a quarter of the time. They check-called a monotone flop with lots of single big spades, and those all missed, so their range holds plenty of bluffs. Raising does nothing: the bluffs fold and the value doesn’t.',
    streets: [
      { street: 'preflop', text: 'Under the gun opens and you call on the button with 8♠8♦, 75 big blinds deep. Many of their hands hold one big spade.', range: 'Big pairs, big aces and suited broadways.' },
      { street: 'flop', text: 'On a monotone 7♠3♠2♠ they check and call your bet. Plenty of players check-call here with any decent single spade, hoping for a fourth.', range: 'Overpairs, flushes, sets, big cards with one big spade.' },
      { street: 'turn', text: 'The 6♣ adds straight draws and both check. Checking keeps the pot small with a hand that wants a showdown.', range: 'Overpairs, flushes, sets, single big spades, straight draws like 5-4.' },
      { street: 'river', text: 'The 5♥ makes a straight for any four and for 9-8, and they bet half the pot: a strong hand, or one of the many single-spade hands that missed.', range: 'Value: 9-9 to A-A, sets, flushes, 4-4, A-4, 9-8. Bluffs: missed hands with one big spade.' },
    ],
    takeaway: 'When they check-call a monotone flop with single high cards of the suit, the river bet holds plenty of missed draws.',
  },
  'queens-block-bluffs-fold': {
    why: 'Fold: your two queens remove many of the K-Q and Q-J hands they’d bluff with, and leave every ace and set. You need about 30% and you’re ahead less often. A hand good enough to call the turn isn’t always good enough on a blank river.',
    streets: [
      { street: 'preflop', text: 'A regular opens the hijack and calls your 3-bet from the small blind with Q♦Q♠.', range: 'Pairs, broadways like K-Q, K-J and Q-J, A-Q, A-J, suited aces.' },
      { street: 'flop', text: 'On a monotone A♦T♦4♦ you check and call a small bet; your Q♦ blocks some flushes. In position they bet small with everything.', range: 'Aces, tens, flushes, big diamonds, broadways, sets.' },
      { street: 'turn', text: 'The 7♣ is a blank. They bet again and you check-call, though queens now sit near the bottom of your range.', range: 'Aces, two pairs, sets, the odd flush, broadways still betting.' },
      { street: 'river', text: 'The 2♠ is a blank and they move all in. Their natural bluffs are missed broadways like K-Q and Q-J, and your queens remove most of them.', range: 'Value: A-K, A-Q, A-J, A-5, A-T, A-4, T-T, 7-7, K♦J♦. Bluffs: K-Q, K-J and Q-J, mostly blocked.' },
    ],
    takeaway: 'Check what your cards remove: blocking their bluffs makes a call worse.',
  },
  'kj-full-house-fold-river-shove': {
    why: 'Fold: your full house beats only a bluff. Every pair they’d call a 4-bet with, queens, kings, aces and jacks, now makes a bigger one, and a regular rarely checks back the turn and then turns a missed hand into a river shove. You need 25%, and you’re short.',
    streets: [
      { street: 'preflop', text: 'You open K♣J♣ from the small blind, the big blind 3-bets, you 4-bet and they call. Calling a 4-bet that size takes a big hand.', range: 'Q-Q to A-A, J-J, A-K, A-Q and K-Q.' },
      { street: 'flop', text: 'On T♦8♠T♣ you bet small, 18 into 56, and they call. Big pairs and A-K are happy to call, and a ten would call to trap.', range: 'Big pairs, A-K, A-Q, K-Q, the odd ten.' },
      { street: 'turn', text: 'The J♦ gives you jacks up. You check and they check behind: big pairs that fear a ten keep the pot small, and A-K and K-Q take a free card.', range: 'Big pairs, A-K and A-Q with a broadway draw, K-Q.' },
      { street: 'river', text: 'The T♥ gives you tens full of jacks. You bet and they raise all in. Queens, kings, aces and jacks all made bigger full houses.', range: 'Value: Q-Q, K-K, A-A, J-J, A♠T♠. Bluffs: rare A-Q and K-Q.' },
    ],
    takeaway: 'A full house only counts if it beats their range: when every pair they hold made a bigger one, fold.',
  },
  'ace-ten-hero-call-paired-board': {
    why: 'Call: the weak pairs that beat you would check here, so this bet is a jack, a bigger hand or a bluff, and an aggressive player has plenty of busted straight draws. You need about a quarter, and you’re ahead more often. Raising only folds the bluffs and gets called by better.',
    streets: [
      { street: 'preflop', text: 'You open A♥T♣ from the lojack; both blinds call. The small blind is very active and aggressive.', range: 'The small blind: very wide.' },
      { street: 'flop', text: 'On 4♥3♦3♣ the small blind leads into you. This player leads made hands and draws alike, so ace high calls.', range: 'Threes, fours, pairs, straight draws, big cards.' },
      { street: 'turn', text: 'The J♠ and they bet again. Folding to every second barrel lets an aggressive player run you over, so you call.', range: 'Jacks, threes, pairs, straight draws, air.' },
      { street: 'river', text: 'The 8♣ and they bet big, nearly putting you all in. With an eight or a four they’d check for a cheap showdown, so the bet skips the weak pairs that beat you.', range: 'Value: A-J, K-J, Q-J, J-T, J-9, some pairs and full houses. Bluffs: busted straight draws, K-Q.' },
    ],
    takeaway: 'When a bet skips the weak pairs that beat you, it’s strong or a bluff; against an aggressive player, ace high can call.',
  },
  'second-pair-call-small-lead-vs-limper': {
    why: 'Call: their bet is only half the pot, and a typical live player usually bets bigger when they have you beat. After you checked the turn, their missed T-8, Q-T, K-T and spade draws have no other way to win. You need about a quarter, and those bluffs get you there.',
    streets: [
      { street: 'preflop', text: 'The cutoff limps, you raise Q♥9♥ on the button and they call. A typical live limp-call is loose, with few big pairs.', range: 'Suited hands, connectors, small pairs, weak aces, broadways.' },
      { street: 'flop', text: 'You flop second pair on J♠9♠2♣, and they call your small c-bet.', range: 'Jacks, nines, straight draws like T-8, Q-T and K-T, spade draws.' },
      { street: 'turn', text: 'The 4♦ checks through: you take a cheap showdown with your nines, which shows weakness and invites a river bluff.', range: 'Jacks, nines, and every draw.' },
      { street: 'river', text: 'The 6♥ misses every draw and they lead half the pot. A worse nine wouldn’t bet, but their missed draws can only win by betting, and a typical player bluffs small.', range: 'Value: top pair and better, usually bet bigger. Bluffs: missed T-8, Q-T, K-T, 8-7 and spade draws.' },
    ],
    takeaway: 'After you show weakness, a small river bet from a typical player is often a missed draw: call with a pair.',
  },
  'middle-pair-call-button-triple-barrel': {
    why: 'Call: you don’t beat their value, but against a half-pot bet you only need to be good a quarter of the time. A button that bets this wide still has lots of 9-7, 6-5, J-9, Q-9, K-Q and missed hearts, and those can only win by betting.',
    streets: [
      { street: 'preflop', text: 'A typical live player opens the button and you defend 8♣5♣ from the big blind. This player bets wide after the flop too.', range: 'Most suited hands, broadways, pairs and connectors.' },
      { street: 'flop', text: 'You flop middle pair on T♥8♥4♠. They c-bet small, 4 into 10.5, with almost everything, and you call.', range: 'Tens, overpairs, heart draws, straight draws like J-9, 9-7 and 7-6, overcards.' },
      { street: 'turn', text: 'The 3♦ and they bet small again, 8 into 18.5. You’ve only called, so they keep firing with draws and missed overcards.', range: 'Tens and better, draws, air still betting.' },
      { street: 'river', text: 'The 3♣ pairs the board, and they bet half the pot a third time. Their value beats you, but a range this wide still holds lots of hands that missed.', range: 'Value: top pairs, overpairs, sets, two pair, trips. Bluffs: 9-7, 7-6, 6-5, J-9, Q-9, K-Q, K-J, missed hearts.' },
    ],
    takeaway: 'Against a wide range that keeps betting small, a middle pair can call at a quarter-pot price.',
  },
  'two-pair-call-polar-ace-river': {
    why: 'Call: against a polarised bet you’re a pure bluff catcher, losing to all their value and beating all their bluffs, and they have enough missed Q-J, K-J and J-8 to make the call pay. Weak aces would check here, so the bet isn’t one-pair value. Raising only folds the bluffs you beat.',
    streets: [
      { street: 'preflop', text: 'A typical live player opens the button and you defend T♠8♠ from the big blind.', range: 'Suited hands, broadways, pairs and connectors.' },
      { street: 'flop', text: 'On a paired 6♣6♠9♥ they c-bet 5 into 10.5 and you call with a gutshot and overcards. The button bets this board with most of its range.', range: 'Nines, overpairs, sixes, big cards.' },
      { street: 'turn', text: 'The T♣ gives you two pair. They bet 12, with value and plenty of straight draws like Q-J and J-8; you call.', range: 'Tens, nines, sixes, overpairs, straight draws.' },
      { street: 'river', text: 'The A♦ and they bet 24 into 44.5. Weak aces would check and take a showdown, so the bet is strong aces and better, or a missed draw.', range: 'Value: A-K, A-Q, A-T, A-9, trips, straights, full houses. Bluffs: Q-J, K-Q, K-J, J-8, J-7, Q-8, 8-5, 7-5.' },
    ],
    takeaway: 'Against a polarised bet, a bluff catcher just calls: raising only folds the bluffs.',
  },
  'jacks-river-overbet-bluff-vs-reg': {
    why: 'Overbet as a bluff: checking gives up, because your jacks beat almost nothing they’d call twice with. A huge bet makes a decent player fold A-9 down to A-3 and K-Q nearly every time, and your two jacks make K-J, their one common strong hand, unlikely.',
    streets: [
      { street: 'preflop', text: 'You open J♠J♥ from the cutoff and a decent regular defends the big blind. They’d 3-bet most A-Q, A-A, Q-Q and T-T.', range: 'Wide, with few A-Q, A-A, Q-Q or T-T.' },
      { street: 'flop', text: 'On A♣Q♦T♥ you bet and they call. They rarely have A-Q or sets, but plenty of K-J, which your jacks block.', range: 'Aces, queens, tens, K-J, Q-T, broadway draws.' },
      { street: 'turn', text: 'The 2♣ is a blank. You overbet 25 into 18.5 and they call, which narrows them to aces, two pair and K-J, plus some K-Q and K-T.', range: 'Aces, Q-T, K-J, some sets and A-Q, K-Q and K-T.' },
      { street: 'river', text: 'The 6♠ and they check. Your jacks beat almost nothing that called twice, but their weak aces and K-Q can’t call a huge bet.', range: 'Call: K-J (rare), Q-T, sets, A-Q, A-K, A-J. Normal bet, not an overbet: weaker aces, K-Q, K-T.' },
    ],
    takeaway: 'Bluff with a hand that can’t win at a showdown, when your cards block their strongest calls and the size folds their medium hands.',
  },
  'ace-high-call-half-pot-river-lead': {
    why: 'Call: a half-pot bet after the turn checks through leans to missed draws like T-8, Q-T, K-T and spades, and your ace beats all of them. Typical live players bet bigger with trips or top pair. You need to win only a quarter of the time.',
    streets: [
      { street: 'preflop', text: 'You open A♥7♥ on the button in a live game and a typical player defends the big blind. Wide against wide.', range: 'Suited hands, connectors, pairs and broadways.' },
      { street: 'flop', text: 'On J♠9♠2♣ you c-bet small and they call.', range: 'Jacks, nines, small pairs, straight draws like T-8, Q-T, K-T and 8-7, spade draws.' },
      { street: 'turn', text: 'The 4♦ checks through. Your ace high beats their draws, so you take the free card toward a cheap showdown.', range: 'Jacks, nines, small pairs, every draw.' },
      { street: 'river', text: 'The 2♦ and they bet half the pot. After a checked turn, live players with trips or top pair get greedy and bet bigger; small bets carry more missed draws.', range: 'Value: top pair, trips, full houses, usually bet bigger. Bluffs: missed T-8, Q-T, K-T, 8-7 and spade draws.' },
    ],
    takeaway: 'Small river bets after a checked turn lean toward missed draws: bluff catch more against small sizes.',
  },
  'ace-high-fold-pot-size-river-lead': {
    why: 'Fold: same hand, bigger bet. Above about 60% of the pot, a typical live player’s range is weighted to jacks, trips and full houses, and they bluff less. You need a third now, and you’re ahead far less often.',
    streets: [
      { street: 'preflop', text: 'You open A♥7♥ on the button in a live game and a typical player defends the big blind. Wide against wide.', range: 'Suited hands, connectors, pairs and broadways.' },
      { street: 'flop', text: 'On J♠9♠2♣ you c-bet small and they call.', range: 'Jacks, nines, small pairs, straight draws like T-8, Q-T, K-T and 8-7, spade draws.' },
      { street: 'turn', text: 'The 4♦ checks through. Your ace high beats their draws, so you take the free card toward a cheap showdown.', range: 'Jacks, nines, small pairs, every draw.' },
      { street: 'river', text: 'The 2♦, and this time they bet the whole pot. Players are meant to bluff more with big bets, but most live players bluff less the bigger they go.', range: 'Value: top pair, trips, full houses. Bluffs: a few missed straight and spade draws.' },
    ],
    takeaway: 'Against typical live players, big bets are under-bluffed: fold bluff catchers.',
  },
};

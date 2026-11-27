import type { Lesson } from '../model';

export const L11: Record<string, Lesson> = {
  'eights-polarised-river-call': {
    why: 'Call: against a half-pot bet you need to be good only about a quarter of the time. They check-called a monotone flop with lots of single big spades, and those all missed, so their range holds plenty of bluffs. Raising does nothing: the bluffs fold and the value doesn’t.',
    streets: [
      { street: 'preflop', text: 'Under the gun opens in a tournament and you call on the button with 8♠8♦, 75 big blinds deep. Their range is big pairs, big aces and suited broadways, many of them with a big spade.', range: 'Big pairs, big aces and suited broadways.' },
      { street: 'flop', text: 'The flop is 7♠3♠2♠, monotone. They check and call your bet. Plenty of players check-call here with any decent single spade, hoping a fourth one comes, along with their overpairs and flushes.', range: 'Overpairs, flushes, sets, and big cards with one big spade.' },
      { street: 'turn', text: 'The 6♣ adds straight draws, and both check. Your eights are still good against a lot, and checking keeps the pot small with a hand that wants a showdown.', range: 'Overpairs, flushes, sets, single big spades, and straight draws like 5-4.' },
      { street: 'river', text: 'The 5♥ makes a straight for any four and for 9-8, and they bet half the pot. That’s polarised: overpairs, sets, flushes and straights, or one of the many single-spade hands that missed.', range: 'Value: overpairs 9-9 to A-A, sets, flushes, and 4-4, A-4 and 9-8. Bluffs: missed hands with one big spade.' },
    ],
    takeaway: 'When they check-call a monotone flop with single high cards of the suit, the river bet holds plenty of missed draws.',
  },
  'queens-block-bluffs-fold': {
    why: 'Fold: your two queens remove many of the K-Q and Q-J hands they’d bluff with, and leave every ace and set. Blockers can work against you. You need about 30%, and you’re ahead less often than that. A hand good enough to call the turn isn’t always good enough on a blank river.',
    streets: [
      { street: 'preflop', text: 'A regular opens the hijack and calls your 3-bet from the small blind with Q♦Q♠. Calling in position: pairs, broadways and suited aces.', range: 'Pairs, broadways like K-Q, K-J and Q-J, A-Q and A-J, and suited aces.' },
      { street: 'flop', text: 'The flop is A♦T♦4♦, monotone and ace-high. You check and call a small bet; your Q♦ blocks some flushes. A small bet in position is their whole range here.', range: 'Aces, tens, flushes, big diamonds, broadways, and sets.' },
      { street: 'turn', text: 'The 7♣ is a blank. They bet again and you check-call. Now your queens are near the bottom of what you could have here.', range: 'Aces, two pairs, sets, the odd flush, and broadways still betting.' },
      { street: 'river', text: 'The 2♠ is a blank, and they move all in. Their bluffs are broadway hands like K-Q and Q-J that missed, and your two queens remove most of them. Their aces, sets and flushes you don’t block.', range: 'Value: A-K, A-Q, A-J and A-5, A-T and A-4, T-T and 7-7, K♦J♦. Bluffs: K-Q, K-J and Q-J, mostly blocked by your queens.' },
    ],
    takeaway: 'Check what your cards remove: blocking their bluffs makes a call worse.',
  },
  'kj-full-house-fold-river-shove': {
    why: 'Fold: a full house sounds too good to fold, but yours only beats a bluff. Every pair they’d call a 4-bet with, queens, kings, aces and jacks, now makes a bigger full house. A regular rarely checks back the turn and then turns a missed hand into a river shove. You need 25%, and you’re short.',
    streets: [
      { street: 'preflop', text: 'You open K♣J♣ from the small blind, the big blind 3-bets, and you 4-bet; they call. Calling a 4-bet that size takes big pairs, A-K, A-Q or K-Q.', range: 'Big pairs Q-Q to A-A, J-J, A-K, A-Q and K-Q.' },
      { street: 'flop', text: 'The flop is T♦8♠T♣. You bet small, 18 into about 56, and they call. A 4-bet pot on a paired board: big pairs and A-K are happy to call a small bet, and a ten would often call too, to trap.', range: 'Big pairs, A-K, A-Q, K-Q, and the odd ten.' },
      { street: 'turn', text: 'The J♦ gives you jacks up with a king kicker. You check, and they check behind. They show no interest in building the pot: big pairs that fear a ten keep it small, and A-K and K-Q take a free card to their straight draws.', range: 'Big pairs, A-K and A-Q (now with a broadway draw), and K-Q.' },
      { street: 'river', text: 'The T♥ gives you tens full of jacks. You bet and they raise all in. Queens, kings, aces and jacks all make bigger full houses, and a regular rarely checks back the turn to bluff a river that fills so many.', range: 'Value: Q-Q, K-K and A-A full houses, J-J (jacks full), A♠T♠ (quads). Bluffs: rare A-Q and K-Q.' },
    ],
    takeaway: 'A full house only counts if it beats their range: when every pair they hold made a bigger one, fold.',
  },
  'ace-ten-hero-call-paired-board': {
    why: 'Call: the weak pairs that beat you would check here, so this bet is a jack, a bigger hand or a bluff, and an aggressive player has plenty of busted straight draws. You need about a quarter, and you’re ahead more often than that. Raising only folds the bluffs and gets called by better.',
    streets: [
      { street: 'preflop', text: 'You open A♥T♣ from the lojack in a tournament; both blinds call. The small blind is very active and aggressive.', range: 'The small blind: very wide.' },
      { street: 'flop', text: 'The flop is 4♥3♦3♣. The small blind leads into you; an aggressive player does this with made hands and draws alike, so ace high calls.', range: 'Threes, fours, pairs, straight draws, and big cards.' },
      { street: 'turn', text: 'The J♠ and they bet again. You call: folding to every second barrel lets an aggressive player run you over.', range: 'Jacks, threes, pairs, straight draws, and air.' },
      { street: 'river', text: 'The 8♣ and they bet big, nearly putting you all in. With an eight or a four they’d check for a cheap showdown; this bet is a jack, a stronger hand, or a busted straight draw.', range: 'Value: A-J, K-J, Q-J, J-T and J-9, and some pairs and full houses. Bluffs: busted straight draws and K-Q.' },
    ],
    takeaway: 'When a bet skips the weak pairs that beat you, it’s strong or a bluff; against an aggressive player, ace high can call.',
  },
  'second-pair-call-small-lead-vs-limper': {
    why: 'Call: their bet is only half the pot, and a typical live player usually bets bigger when they have you beat. After you checked back the turn, their missed T-8, Q-T, K-T and spade draws have no other way to win. You need about a quarter, and those bluffs get you there.',
    streets: [
      { street: 'preflop', text: 'The cutoff limps, you raise Q♥9♥ on the button to 7, and they call. A limp-call from a typical live player is a wide, loose range: suited hands, connectors, small pairs and weak aces, with few big pairs, which would raise.', range: 'Wide: suited hands, connectors, pairs and broadways.' },
      { street: 'flop', text: 'You flop second pair on J♠9♠2♣. They call your small c-bet with jacks, nines, straight draws and spade draws.', range: 'Jacks, nines, straight draws like T-8, Q-T and K-T, and spade draws.' },
      { street: 'turn', text: 'The 4♦ is a blank. They check, and you check back your pair of nines to get to a cheap showdown. That shows weakness and gives them room to bluff the river with the draws they called with.', range: 'Jacks, nines, and every draw.' },
      { street: 'river', text: 'The 6♥ misses every draw, and they lead half the pot. A worse nine wouldn’t bet, but their missed T-8, Q-T, K-T and spade draws can only win by betting, and a typical player bets small when bluffing.', range: 'Value: top pair and better, usually bet bigger. Bluffs: missed T-8, Q-T, K-T and 8-7, and missed spade draws.' },
    ],
    takeaway: 'After you show weakness, a small river bet from a typical player is often a missed draw: call with a pair.',
  },
  'middle-pair-call-button-triple-barrel': {
    why: 'Call: you don’t beat their value, but against a half-pot bet you only need to be good about a quarter of the time. A button that bets this wide still has lots of 9-7, 6-5, J-9, Q-9, K-Q and missed hearts with nothing. Those hands can only win by betting.',
    streets: [
      { street: 'preflop', text: 'A typical live player opens the button to 5, and you defend 8♣5♣ from the big blind. A button open is wide, and this player bets after the flop with a wide range too.', range: 'Wide: most suited hands, broadways, pairs and connectors.' },
      { street: 'flop', text: 'You flop middle pair on T♥8♥4♠. They c-bet small, 4 into about 10.5, with almost everything, and you call. Their range is still wide: tens, overpairs, heart draws, straight draws like J-9, 9-7 and 7-6, and overcards.', range: 'Almost everything: tens, overpairs, draws and air.' },
      { street: 'turn', text: 'The 3♦ and they bet small again, 8 into about 18.5. You call. You’ve only called, so you’ve given them room to keep firing with draws and missed overcards, as well as their tens and overpairs.', range: 'Tens and better, draws, and air still betting.' },
      { street: 'river', text: 'The 3♣ pairs the board. Their value is tens and better, which beats you, but a button that bets this wide still has lots of hands that missed.', range: 'Value: top pairs, overpairs, sets, two pair and trips. Bluffs: 9-7, 7-6, 6-5, J-9, Q-9, K-Q, K-J and missed hearts.' },
    ],
    takeaway: 'Against a wide range that keeps betting small, a middle pair can call at a quarter-pot price.',
  },
  'two-pair-call-polar-ace-river': {
    why: 'Call: against a polarised bet you’re a pure bluff catcher. You lose to all their value and beat all their bluffs, and they have enough missed Q-J, K-J and J-8 to make the call pay. Weak aces would check here, so the bet isn’t one-pair value. Raising only folds the bluffs you beat.',
    streets: [
      { street: 'preflop', text: 'A typical live player opens the button to 5, and you defend T♠8♠ from the big blind. A button open is wide: pairs, any ace, broadways, suited and connected hands.', range: 'Wide: suited hands, broadways, pairs and connectors.' },
      { street: 'flop', text: 'The flop is 6♣6♠9♥, paired. You check, they c-bet 5 into about 10.5, and you call with a gutshot and two overcards to the sixes. A button c-bets this board with most of its range, so the bet doesn’t narrow them.', range: 'Their whole range: nines, overpairs, sixes, and big cards.' },
      { street: 'turn', text: 'The T♣ gives you tens and sixes. They bet again, with value and plenty of straight draws like Q-J and J-8.', range: 'Tens, nines, sixes, overpairs, and straight draws.' },
      { street: 'river', text: 'The A♦. Weak aces would check here and take a showdown, so this bet is polarised: strong aces, trips, straights and full houses, or missed draws.', range: 'Value: A-K, A-Q, A-T and A-9, trips, straights and full houses. Bluffs: Q-J, K-Q, K-J, J-8, J-7, Q-8, 8-5 and 7-5.' },
    ],
    takeaway: 'Against a polarised bet, a bluff catcher just calls: raising only folds the bluffs.',
  },
  'jacks-river-overbet-bluff-vs-reg': {
    why: 'Overbet as a bluff: checking gives up, because your jacks beat almost nothing they’d call twice with. A huge bet makes a decent player fold A-9 down to A-3 and K-Q nearly every time. Your two jacks make K-J, their one common strong hand, unlikely. Go big.',
    streets: [
      { street: 'preflop', text: 'You open J♠J♥ from the cutoff and a decent regular defends the big blind. They’d 3-bet most A-Q, A-A, Q-Q and T-T, so those are rare.', range: 'Wide, with few A-Q, A-A, Q-Q or T-T.' },
      { street: 'flop', text: 'The flop is A♣Q♦T♥. You bet and they call. They call with lots of K-J, but rarely have A-Q or sets, which would 3-bet preflop. Your jacks block K-J, the one big hand they have plenty of.', range: 'Aces, queens, tens, K-J (a straight), Q-T, and broadway draws.' },
      { street: 'turn', text: 'The 2♣ is a blank. You overbet 25 into about 18.5, and they call. A call of an overbet narrows them to aces, two pair and K-J, plus some K-Q and K-T with a gutshot. Your two jacks make K-J rarer.', range: 'Aces, Q-T, K-J, some sets and A-Q, K-Q and K-T.' },
      { street: 'river', text: 'The 6♠ and they check. Your jacks beat almost nothing that called twice. Their weak aces and K-Q can’t call a huge bet.', range: 'K-J (rare, you hold two jacks), Q-T, some sets and A-Q, A-K and A-J (call); weaker aces, K-Q and K-T (call a normal bet, fold to an overbet).' },
    ],
    takeaway: 'Bluff with a hand that can’t win at a showdown, when your cards block their strongest calls and the size folds their medium hands.',
  },
  'ace-high-call-half-pot-river-lead': {
    why: 'Call: a bet of half the pot after the turn checks through leans toward missed draws like T-8, Q-T, K-T and spades, and your ace beats all of them. Typical live players bet bigger when they have trips or top pair. You need to win only about a quarter of the time.',
    streets: [
      { street: 'preflop', text: 'You open A♥7♥ on the button to 5 in a live cash game, and a typical player defends the big blind. It’s wide against wide: both ranges are full of suited hands, broadways and connectors.', range: 'Wide: suited hands, connectors, pairs and broadways.' },
      { street: 'flop', text: 'The flop is J♠9♠2♣. You c-bet small, 5 into about 10.5, and they call with jacks, nines, small pairs, and lots of draws: spades, and straight draws like T-8, Q-T, K-T and 8-7.', range: 'Jacks, nines, small pairs, straight draws and spade draws.' },
      { street: 'turn', text: 'The 4♦ is a blank. They check, and you check back. Your ace high still beats all their draws, so you aim for a cheap showdown. Their check keeps their whole range in.', range: 'Jacks, nines, small pairs, and every draw.' },
      { street: 'river', text: 'The 2♦ and they bet half the pot. After a checked turn, players with trips or top pair get greedy and bet bigger; small bets carry more missed draws.', range: 'Value: top pair, trips and full houses, usually bet bigger. Bluffs: missed T-8, Q-T, K-T and 8-7, and missed spade draws.' },
    ],
    takeaway: 'Small river bets after a checked turn lean toward missed draws: bluff catch more against small sizes.',
  },
  'ace-high-fold-pot-size-river-lead': {
    why: 'Fold: it’s the same hand with a bigger bet. Above about 60% of the pot, a typical live player’s range is weighted toward jacks, trips and full houses, and they bluff less often. You need a third now, and you’re ahead far less often. Against a range that under-bluffs, every bluff catcher is a fold.',
    streets: [
      { street: 'preflop', text: 'You open A♥7♥ on the button to 5 in a live cash game, and a typical player defends the big blind. It’s wide against wide: both ranges are full of suited hands, broadways and connectors.', range: 'Wide: suited hands, connectors, pairs and broadways.' },
      { street: 'flop', text: 'The flop is J♠9♠2♣. You c-bet small, 5 into about 10.5, and they call with jacks, nines, small pairs, and lots of draws: spades, and straight draws like T-8, Q-T, K-T and 8-7.', range: 'Jacks, nines, small pairs, straight draws and spade draws.' },
      { street: 'turn', text: 'The 4♦ is a blank. They check, and you check back. Your ace high still beats all their draws, so you aim for a cheap showdown. Their check keeps their whole range in.', range: 'Jacks, nines, small pairs, and every draw.' },
      { street: 'river', text: 'The 2♦, and this time they bet the whole pot. Players are meant to bluff more with big bets, but most live players bluff less the bigger they go.', range: 'Value: top pair, trips and full houses. Bluffs: a few missed straight and spade draws.' },
    ],
    takeaway: 'Against typical live players, big bets are under-bluffed: fold bluff catchers.',
  },
};

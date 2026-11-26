import type { Lesson } from '../model';

export const L11: Record<string, Lesson> = {
  'eights-polarised-river-call': {
    why: 'Call: against a half-pot bet you need to be good only about a quarter of the time. They check-called a monotone flop with lots of single big spades, and those all missed, so their range holds plenty of bluffs. Raising does nothing: the bluffs fold and the value doesn’t.',
    read: [
      { about: 'preflop', text: 'You called an under-the-gun open on the button with eights, 75 big blinds deep. Their range is big pairs, big aces and suited broadways.' },
      { about: 'position', text: 'You’re in position, and you checked back the turn to keep the pot small with a medium-strength hand.' },
      { about: 'board', text: '7♠3♠2♠ is monotone. The 6♣ adds straight draws, and the 5♥ makes a straight for any 4 and for 9-8.' },
      { about: 'sizing', text: 'Check-call, check, then half pot on the river. Many players check-call a monotone flop with one big spade hoping for a fourth, and bet the river when it misses.' },
      { about: 'range', text: 'For value: overpairs, sets, flushes, and straights with 4-4, A-4 and 9-8. For bluffs: missed hands with one big spade.' },
    ],
    takeaway: 'When they check-call a monotone flop with single high cards of the suit, the river bet holds plenty of missed draws.',
  },
  'queens-block-bluffs-fold': {
    why: 'Fold: your two queens remove many of the K-Q and Q-J hands they’d bluff with, and leave every ace and set. Blockers can work against you. You need about 30%, and you’re ahead less often than that. A hand good enough to call the turn isn’t always good enough on the river.',
    read: [
      { about: 'preflop', text: 'A regular opened and called your 3-bet from the small blind: pairs, broadways and suited aces.' },
      { about: 'position', text: 'They’re in position and bet every street while you check-called. Your range looks like medium hands.' },
      { about: 'board', text: 'A♦T♦4♦ is monotone and ace-high. Your Q♦ blocks some flushes. The 7♣ and 2♠ change nothing.' },
      { about: 'sizing', text: 'Two smaller bets and then a shove. A river shove is polarised: strong hands and missed broadways.' },
      { about: 'range', text: 'For value: A-K, A-Q, A-J and A-5; A-T and A-4; T-T and 7-7; K♦J♦. For bluffs: K-Q, K-J and Q-J, most of which your queens block.' },
    ],
    takeaway: 'Check what your cards remove: blocking their bluffs makes a call worse.',
  },
  'kj-full-house-fold-river-shove': {
    why: 'Fold: a full house sounds too good to fold, but yours only beats a bluff. Every pair they’d call a 4-bet with, queens, kings, aces and jacks, now makes a bigger full house. A regular rarely checks back the turn and then turns a missed hand into a river shove. You need 25%, and you’re short.',
    read: [
      { about: 'preflop', text: 'You opened the small blind, the big blind 3-bet and then called your big 4-bet. Calling a 4-bet that size takes big pairs, A-K, A-Q or K-Q.' },
      { about: 'players', text: 'A heads-up 4-bet pot: the pot is huge compared with the stacks, so every bet commits a lot.' },
      { about: 'board', text: 'T♦8♠T♣ is paired. The J♦ gives you a pair of jacks, and the T♥ gives you tens full of jacks. Any bigger pair now makes a bigger full house.' },
      { about: 'sizing', text: 'They checked back the turn, then raised all in over your river bet. A raise all in over a bet is the strongest line; it’s rarely a bluff from a regular.' },
      { about: 'range', text: 'For value: Q-Q, K-K and A-A full houses, J-J (jacks full) and A♠T♠ (quads). Rare bluffs: A-Q and K-Q.' },
    ],
    takeaway: 'A full house only counts if it beats their range: when every pair they hold made a bigger one, fold.',
  },
  'ace-ten-hero-call-paired-board': {
    why: 'Call: the weak pairs that beat you would check here, so this bet is a jack, a bigger hand or a bluff, and an aggressive player has plenty of busted straight draws. You need about a quarter, and you’re ahead more often than that. Raising only folds the bluffs and gets called by better.',
    read: [
      { about: 'preflop', text: 'Both blinds called your open. The small blind is very active and aggressive, with a wide range.' },
      { about: 'opponent', text: 'A very active player leads and barrels with made hands and draws alike. Folding to every second barrel lets them run you over.' },
      { about: 'position', text: 'They’re out of position and led every street into you. Leading from out of position keeps the betting in their hands.' },
      { about: 'board', text: '4♥3♦3♣ is low and paired, with straight draws. The J♠ adds jacks, and the 8♣ completes little.' },
      { about: 'sizing', text: 'A big river bet nearly puts you all in. With an eight or a four they’d check for a cheap showdown; the size is a jack, a strong hand or a bluff.' },
      { about: 'range', text: 'For value: A-J, K-J, Q-J, J-T and J-9, and some pairs and full houses. For bluffs: busted straight draws and K-Q.' },
    ],
    takeaway: 'When a bet skips the weak pairs that beat you, it’s strong or a bluff; against an aggressive player, ace high can call.',
  },
  'second-pair-call-small-lead-vs-limper': {
    why: 'Call: their bet is only half the pot, and a typical live player usually bets bigger when they have you beat. After you checked back the turn, their missed T-8, Q-T, K-T and spade draws have no other way to win. You need about a quarter, and those bluffs get you there.',
    read: [
      { about: 'preflop', text: 'The cutoff limped and called your raise: a wide, loose range of suited hands, connectors and pairs.' },
      { about: 'opponent', text: 'A typical live player bets big with strong hands to get paid, and smaller with missed draws to win cheaply.' },
      { about: 'position', text: 'You’re in position and checked back the turn with your pair of nines. That shows weakness and invites a bluff.' },
      { about: 'board', text: 'J♠9♠2♣ has spade and straight draws. The 4♦ and the 6♥ miss all of them.' },
      { about: 'sizing', text: 'A half-pot lead after you checked back. Small leads after a checked turn lean toward missed draws.' },
      { about: 'range', text: 'For value: top pair and better, which usually bet bigger. For bluffs: missed T-8, Q-T, K-T and 8-7, and missed spade draws.' },
    ],
    takeaway: 'After you show weakness, a small river bet from a typical player is often a missed draw: call with a pair.',
  },
  'middle-pair-call-button-triple-barrel': {
    why: 'Call: you don’t beat their value, but against a half-pot bet you only need to be good about a quarter of the time. A button that bets this wide still has lots of 9-7, 6-5, J-9, Q-9, K-Q and missed hearts with nothing. Those hands can only win by betting.',
    read: [
      { about: 'preflop', text: 'The button opened a wide range and you defended your big blind.' },
      { about: 'position', text: 'They’re in position and bet every street. You only called, which gives them room to keep firing.' },
      { about: 'board', text: 'T♥8♥4♠ has a heart draw and straight draws. The 3♦ and the 3♣ miss all of them and pair the board.' },
      { about: 'sizing', text: 'Small bets on the flop and turn, then half pot. A wide range that keeps betting small has plenty of air in it.' },
      { about: 'range', text: 'For value: top pair, overpairs, sets, two pair and trips. For bluffs: 9-7, 7-6, 6-5, J-9, Q-9, K-Q, K-J and missed hearts.' },
    ],
    takeaway: 'Against a wide range that keeps betting small, a middle pair can call at a quarter-pot price.',
  },
  'two-pair-call-polar-ace-river': {
    why: 'Call: against a polarised bet you’re a pure bluff catcher. You lose to all their value and beat all their bluffs, and they have enough missed Q-J, K-J and J-8 to make the call pay. Weak aces would check here, so the bet isn’t one-pair value. Just call; raising only folds the bluffs you beat.',
    read: [
      { about: 'preflop', text: 'You defended the big blind against a button open: both ranges are wide.' },
      { about: 'position', text: 'They’re in position and bet every street. You check-called each time.' },
      { about: 'board', text: '6♣6♠9♥ is paired. The T♣ gives you two pair and adds straight draws like Q-J and J-8. The A♦ changes the top pair.' },
      { about: 'sizing', text: 'A third bet on the ace. Weak aces would take a showdown, so the bet is strong aces, trips and straights, or missed draws.' },
      { about: 'range', text: 'For value: A-K, A-Q, A-T and A-9; trips, straights and full houses. For bluffs: Q-J, K-Q, K-J, J-8, J-7, Q-8, 8-5 and 7-5.' },
    ],
    takeaway: 'Against a polarised bet, a bluff catcher just calls: raising only folds the bluffs.',
  },
  'jacks-river-overbet-bluff-vs-reg': {
    why: 'Overbet as a bluff: checking gives up, because your jacks beat almost nothing they’d call twice with. A huge bet makes a decent player fold A-9 down to A-3 and K-Q nearly every time. Your two jacks make K-J, their one common strong hand, unlikely. Go big.',
    read: [
      { about: 'preflop', text: 'A decent regular defended the big blind against your cutoff open. They’d 3-bet most A-Q, A-A, Q-Q and T-T, so those are rare.' },
      { about: 'position', text: 'You’re in position and bet every street. They check-called each time, never taking the lead.' },
      { about: 'board', text: 'A♣Q♦T♥ is broadway: K-J has the nut straight. The 2♣ and 6♠ change nothing.' },
      { about: 'sizing', text: 'They called a big flop bet and a turn overbet. That’s aces, two pair and K-J, plus some K-Q and K-T with a gutshot.' },
      { about: 'range', text: 'K-J (rare, because you hold two jacks), Q-T, some sets and A-Q, and A-K and A-J call. Weaker aces, K-Q and K-T call a normal bet but fold to an overbet.' },
    ],
    takeaway: 'Bluff with a hand that can’t win at a showdown, when your cards block their strongest calls and the size folds their medium hands.',
  },
  'ace-high-call-half-pot-river-lead': {
    why: 'Call: a bet of half the pot after the turn checks through leans toward missed draws like T-8, Q-T, K-T and spades, and your ace beats all of them. Typical live players bet bigger when they have trips or top pair. You need to win only about a quarter of the time.',
    read: [
      { about: 'preflop', text: 'You opened the button and the big blind defended: wide against wide.' },
      { about: 'position', text: 'You’re in position and checked back the turn with ace high to get to a cheap showdown.' },
      { about: 'board', text: 'J♠9♠2♣ has spade and straight draws. The 4♦ and the 2♦ miss them all.' },
      { about: 'sizing', text: 'A half-pot lead after a checked turn. Players with trips or top pair often bet bigger; smaller bets carry more missed draws.' },
      { about: 'opponent', text: 'Typical live players size by hand strength: big when strong, small when bluffing or unsure.' },
      { about: 'range', text: 'For value: top pair, trips and full houses, usually bet bigger. For bluffs: missed T-8, Q-T, K-T and 8-7, and missed spade draws.' },
    ],
    takeaway: 'Small river bets after a checked turn lean toward missed draws: bluff catch more against small sizes.',
  },
  'ace-high-fold-pot-size-river-lead': {
    why: 'Fold: it’s the same hand with a bigger bet. Above about 60% of the pot, a typical live player’s range is weighted toward jacks, trips and full houses, and they bluff less often. You need a third now, and you’re ahead far less often. Against a range that under-bluffs, every bluff catcher is a fold.',
    read: [
      { about: 'preflop', text: 'You opened the button and the big blind defended: wide against wide.' },
      { about: 'position', text: 'You’re in position and checked back the turn with ace high to get to a cheap showdown.' },
      { about: 'board', text: 'J♠9♠2♣ has spade and straight draws. The 4♦ and the 2♦ miss them all.' },
      { about: 'sizing', text: 'A pot-size lead. In theory big bets carry more bluffs, but most live players bluff less the bigger they bet.' },
      { about: 'opponent', text: 'Typical live players save their biggest bets for their biggest hands. They rarely bluff the pot.' },
      { about: 'range', text: 'For value: top pair, trips and full houses. Few bluffs: some missed straight and spade draws.' },
    ],
    takeaway: 'Against typical live players, big bets are under-bluffed: fold bluff catchers.',
  },
};

import type { Lesson } from '../model';

export const L17: Record<string, Lesson> = {
  'weak-ace-call-lag-river-ace-barrel': {
    why: 'Call: the A♠ scares exactly the hands you look like, a ten or a draw, so a loose, aggressive player fires it to make you fold. Better aces, two pair, 9-8 and sets beat you, but every missed straight and club draw, plus pairs and air turned into bluffs, bets here too. You need about 28%, and you’re ahead far more often.',
    streets: [
      { street: 'preflop', text: 'A loose, aggressive regular opens the button and you defend A♦8♦ from the big blind. A range of about half of all hands misses most flops, so a lot of its bets are bluffs.', range: 'Very wide: any ace, most kings, broadways, connectors, all pairs.' },
      { street: 'flop', text: 'On a very connected T♣7♠6♥ you check and call a small c-bet. A loose button bets small here with almost everything.', range: 'Tens, sevens, sixes, 9-8, sets, straight draws, plenty of air.' },
      { street: 'turn', text: 'The 2♣ adds a club draw. They bet 6 into 12.5 and you call. From their side you look like a ten or a draw, and they keep going with draws and pairs.', range: 'Tens and better pairs, two pair, sets, 9-8, straight draws like J-9 and 8-5, club draws, some air.' },
      { street: 'river', text: 'The A♠ pairs your ace, and they bet 16 into 24.5. The ace scares every ten and missed draw you could hold, the perfect card to try to buy the pot.', range: 'Ahead: A-K, A-Q, A-J, A-T, A-9, A-7, A-6, 9-8, T-T, 7-7, 6-6. Behind: missed draws, pairs and air bluffing.' },
    ],
    takeaway: 'Against a loose, aggressive player, a river scare card is a bluffing card: call down wider with a hand that beats the bluffs.',
  },
  'top-two-pair-fold-fish-river-lead-flush': {
    why: 'Fold: a loose, passive player calls with everything and bets only when strong. This one called twice, then led 80% of the pot on the one card that completes both the flush and K-T’s straight. Even fish can see three diamonds. You need about 31%, and top two pair is almost never good.',
    streets: [
      { street: 'preflop', text: 'You open A♠Q♠ on the button and a loose, passive player calls from the big blind with almost any two suited cards.', range: 'Very wide: suited hands, connectors, any ace, pairs.' },
      { street: 'flop', text: 'You flop top two pair on A♦3♦Q♥. You bet 5 into 6.5 and they call, which from a calling station only means they found something.', range: 'Aces, queens, threes, diamond draws, K-J, K-T, J-T, small pairs, sets.' },
      { street: 'turn', text: 'The 8♣ is a blank. You bet the pot and they call again; a passive player rarely raises even a set.', range: 'Aces, queens, diamond draws, K-T, K-J, 8-8, 3-3 and other sets, weaker two pairs.' },
      { street: 'river', text: 'The J♦ completes the flush and K-T, and the passive player suddenly leads 40 into 49.5. A calling station who has called twice doesn’t start betting with a pair.', range: 'Value: diamond flushes, K-T, 3-3, 8-8, J-J. Rarely: a worse two pair.' },
    ],
    takeaway: 'When a passive caller suddenly leads the card that completes the draws, believe them: even fish can see three of a suit.',
  },
  'set-value-bet-river-calling-station-backdoor-flush': {
    why: 'Bet ¾ pot: a calling station calls with any queen, any nine, tens and even ace high, and a station with a flush would often lead it, so their check doesn’t point to one. Your set beats every one-pair hand they called with. A small bet also works and keeps the missed gutshots calling, but the queens and nines pay more.',
    streets: [
      { street: 'preflop', text: 'You open 7♥7♣ from the cutoff and a typical calling station defends the big blind very wide.', range: 'Very wide: suited hands, broadways, any ace, connectors, pairs.' },
      { street: 'flop', text: 'You flop a set on Q♦9♥7♠. You bet 5 into 6.5 and they call, as a station does, with any pair or straight draw.', range: 'Queens, nines, pairs, draws like K-T, J-T, J-8, T-8 and 8-6.' },
      { street: 'turn', text: 'The 3♠ adds a backdoor spade draw. You bet 12 into 16.5 and they call, still on one pair or a draw.', range: 'Queens, nines, tens, straight draws, K♠J♠ and J♠T♠.' },
      { street: 'river', text: 'The 2♠ completes the backdoor flush and they check. Most of their range is a pair that wants to see your cards.', range: 'Normal bet: queens, nines, tens. Small only: missed K-T, J-T, J-8, T-8, 8-6. Beat you: spade flushes, bigger sets.' },
    ],
    takeaway: 'Against a calling station, value-bet your strong hands on the river even when a backdoor draw lands: their pairs still call.',
  },
  'jack-high-probe-river-after-turn-check-back': {
    why: 'Bet ¾ pot: their turn check means they gave up most of the time, and nobody is happy with their hand. A flush is very unlikely for them, their tens and middle pairs don’t want to call a big bet, and jack high can’t win at showdown. A small bet works too, but the bigger one folds more of their pairs.',
    streets: [
      { street: 'preflop', text: 'A tight, aggressive button opens and you defend J♥9♥. They c-bet often and give up when it isn’t working.', range: 'Wide: pairs, any ace, broadways, suited kings and queens, suited connectors.' },
      { street: 'flop', text: 'On Q♣T♠5♦ you check and call a c-bet with an open-ender. A tight button c-bets most of its range here.', range: 'Queens, tens, kings and aces with draws, middle pairs, ace high and king high.' },
      { street: 'turn', text: 'The 2♦ checks through. A tight player bets a strong queen again, so the check takes out most strong hands: they gave up or want a cheap showdown.', range: 'Ace high and king high, a ten or middle pair, a weak queen, a few draws.' },
      { street: 'river', text: 'The 7♦ misses you and puts three diamonds out. They rarely check back a strong diamond draw, so a flush is unlikely.', range: 'Fold: ace high, king high, missed draws. Small only: a ten or middle pair. Call: a weak queen.' },
    ],
    takeaway: 'When they check back the turn, they usually gave up: a river bet takes the pot from the hands that can’t call.',
  },
  'ace-high-third-barrel-capped-big-blind': {
    why: 'Bet ¾ pot: their range is capped, with no Q-Q or better, no A-K, probably no A-Q, and no set, which would have raised by now. Their draws all missed, and the K♣ puts an overcard on their jacks; a tight player rarely calls a big third bet with second or third pair. Ace high can’t win at showdown, so bet.',
    streets: [
      { street: 'preflop', text: 'You open A♦3♦ from the small blind and a tight, aggressive big blind calls. Q-Q or better and A-K would 3-bet, so their best hands are gone already.', range: 'Pairs J-J and below, broadways below A-K, suited connectors and gappers, some suited aces.' },
      { street: 'flop', text: 'On J♣4♦2♦ you c-bet 4 into 6 and they call. You have ace high, a wheel gutshot and a backdoor flush draw.', range: 'Jacks, small pairs, diamond draws, Q-T, T-9, Q-9, T-7 with backdoors.' },
      { street: 'turn', text: 'The 8♠. You bet 7 into 14 and they call. A set would have raised on a board this wet, so what calls twice is a jack, a smaller pair or a draw.', range: 'A jack, eights and small pairs, Q-T, T-9, Q-9, T-7, diamond draws.' },
      { street: 'river', text: 'The K♣ misses every draw and puts an overcard on their jacks. Kings are a small part of what called twice; K-J is the main one.', range: 'Small only: a jack. Fold: eights, fours, deuces, missed draws. Call: a king.' },
    ],
    takeaway: 'When their range is capped and their draws miss, a third barrel on an overcard folds out their pairs.',
  },
  'second-pair-call-maniac-river-ace': {
    why: 'Call: a maniac bets and calls with anything, so their lines don’t mean what a normal player’s would. They’re representing an ace, but aces are a small part of a range this loose, and most of what bets is pairs below yours, missed draws and air. A third-pot bet prices you at about 20%, and you’re ahead far more often.',
    streets: [
      { street: 'preflop', text: 'You open K♣J♣ on the button and a maniac calls from the small blind with almost any two cards.', range: 'Almost any two cards.' },
      { street: 'flop', text: 'You flop top pair on J♠8♥2♠. They lead the pot and you call, which keeps their bluffs in.', range: 'Almost anything: jacks, eights, spade and straight draws, pairs, air.' },
      { street: 'turn', text: 'The 4♥. They bet 1 big blind into 21, you raise to 14 for value, and they call; a maniac calls raises light too.', range: 'Pairs, draws, two pairs, sets and air: still very wide.' },
      { street: 'river', text: 'The A♣ puts an ace over your jacks and they bet 16 into 49. A maniac bets whenever they can, so pairs and missed draws bet here too.', range: 'Ahead: an ace, two pair, sets, better jacks. Behind: smaller pairs, missed draws, air.' },
    ],
    takeaway: 'Against a maniac, read the range, not the story: a small bet on a scare card is still mostly hands you beat.',
  },
  'full-house-overbet-river-passive-caller': {
    why: 'Bet bigger than the pot: you have jacks full and only T-T beats you. A loose, passive player doesn’t fold trips, flushes or weaker full houses, and the river turned their calling range into exactly those, so the biggest bet wins the most. The missed straight draws fold to any bet anyway.',
    streets: [
      { street: 'preflop', text: 'You open J♥J♣ from the cutoff, 150 big blinds deep, and a loose, passive player calls from the big blind.', range: 'Wide: pairs, suited hands, broadways, connectors, any ace.' },
      { street: 'flop', text: 'You flop top set on J♠T♦2♠ and bet the pot; they call. A pot-size bet charges the draws, and their call says they hold one or a ten.', range: 'Tens, straight draws like K-Q, Q-9 and 9-8, spade draws, medium pairs, a few sets.' },
      { street: 'turn', text: 'The 5♦ is a blank. You bet the pot again and they call: tens, draws, and now T-5 and 5-5.', range: 'Tens, T-5, 5-5, spade and straight draws, stubborn medium pairs.' },
      { street: 'river', text: 'The T♠ gives you jacks full and completes the spades, and they check. Every ten made trips, every spade draw a flush, and T-5 and 5-5 full houses.', range: 'Call any size: trip tens, T-5, 5-5, 2-2, spade flushes. Fold: missed K-Q, Q-9, 9-8. Small only: medium pairs.' },
    ],
    takeaway: 'When the river turns their calling range into strong hands that can’t fold, overbet your full house.',
  },
  'ace-king-fold-turn-check-raise-draw-board': {
    why: 'Fold: a turn check-raise on the scariest card says they aren’t afraid of the board; a decent regular never does this with A-J or A-T. What raises here is straights, flushes, sets and two pair, plus a few big draws, and top pair with no diamond can’t get there. You need about 21%, and you win far less.',
    streets: [
      { street: 'preflop', text: 'You open A♥K♥ under the gun and the big blind calls. Big pairs and A-K would 3-bet.', range: 'Medium and small pairs, suited connectors like 8-7 and 6-5, suited aces, broadways like K-Q and J-T.' },
      { street: 'flop', text: 'On A♦9♣7♦ you c-bet top pair, top kicker, 5 into 6.5, and they call.', range: 'Aces like A-J and A-T, nines, sevens, two pair, sets, diamond and straight draws.' },
      { street: 'turn', text: 'The 8♦ completes J-T, 6-5 and the flush. You bet 8 into 16.5 and they check-raise to 20. A-J and A-T would just call or fold; a raise on the worst card for you is a hand that loves it.', range: 'Value: J-T, 6-5, flushes, 9-9, 8-8, 7-7, A-9, A-8, A-7, 9-8, 8-7. Bluffs: a few K♦ and Q♦ gutshots.' },
    ],
    takeaway: 'When a decent player check-raises the card that completes everything, top pair is a fold.',
  },
  'ace-high-check-turn-loose-passive-button': {
    why: 'Check: a loose, passive player who didn’t fold the flop won’t fold the turn either. Their range is jacks, sevens, other pairs and a huge number of draws, and almost all of it calls another bet. A bluff only works when it gets folds; ace high has some showdown value, so check and keep the pot small.',
    streets: [
      { street: 'preflop', text: 'You open A♥Q♥ from the cutoff and a loose, passive player calls on the button. They call a lot and rarely 3-bet.', range: 'Wide: pairs, suited hands, broadways, connectors, weak aces.' },
      { street: 'flop', text: 'On J♦7♠2♦ you c-bet small and they call. A passive player’s flop call is weak, wide and full of draws.', range: 'Jacks, sevens, pairs, diamond draws, straight draws like T-9, 9-8 and 8-6, overcards.' },
      { street: 'turn', text: 'The 8♠ adds a spade draw and more straight draws, and you act first. This card gave many of their draws more outs, so even fewer of their hands will fold.', range: 'Call: jacks, sevens, pairs, diamond, spade and straight draws. Fold: overcards that called once.' },
    ],
    takeaway: 'Don’t bluff a player who doesn’t fold: against a loose, passive caller on a wet board, check ace high.',
  },
  'weak-ace-call-river-shove-three-bet-pot': {
    why: 'Call: a third barrel is often strong, but it also comes from busted spade draws and missed K-J, K-T and 5-4. The paired board takes your kicker away, so every weaker ace splits, while A-K, A-Q, A-6, Q-Q and 6-6 beat you. You need about 27%, and you win or split often enough.',
    streets: [
      { street: 'preflop', text: 'An online regular opens the button and you 3-bet A♥4♥ from the small blind; they call, keeping A-A, K-K and A-K mostly for a 4-bet.', range: 'Pairs, suited broadways like K-Q, K-J and K-T, suited aces, A-Q and A-J, suited connectors like 5-4.' },
      { street: 'flop', text: 'You flop top pair on A♠6♦3♠, check and call a small bet, 7 into 21. Your weak kicker calls rather than builds a pot.', range: 'Aces, sixes, pairs, spade draws, wheel draws like 5-4, broadways betting.' },
      { street: 'turn', text: 'The Q♥. You check and call 25 into 35. A bigger second bet narrows them to better aces, queens, sets and draws.', range: 'A-K, A-Q and other aces, Q-Q, 6-6, spade draws, K-J, K-T, 5-4.' },
      { street: 'river', text: 'The 3♦ pairs the board, so your kicker no longer plays, and they shove 50 into 85. Busted spade and straight draws can only win by betting.', range: 'Ahead: A-K, A-Q, A-6, Q-Q, 6-6. Split: weaker aces. Behind: busted spade draws, K-J, K-T, 5-4.' },
    ],
    takeaway: 'When their river shove includes every missed draw, top pair calls even when the board takes its kicker away.',
  },
};

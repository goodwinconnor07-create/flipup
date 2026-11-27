import type { Lesson } from '../model';

export const L9: Record<string, Lesson> = {
  'ace-five-fold-to-river-overbet': {
    why: 'Fold: their overbet is trip queens and full houses, or ace-high bluffs like A-2, A-3 and A-4 suited. You only beat the bluffs, and your A♥ removes some of them. You need 38%, and you’re short. A five without an ace would actually be a better bluff catcher here, because it leaves their bluffs alone.',
    streets: [
      { street: 'preflop', text: 'The hijack opens in a tournament and you 3-bet A♥5♥ from the cutoff; they call. Their range is pairs, big aces and suited broadways.', range: 'Pairs, big aces, suited broadways and suited aces like A-2 to A-4.' },
      { street: 'flop', text: 'The flop is K♦Q♦5♠, and you have bottom pair. You bet small and they call with kings, queens, draws and pairs.', range: 'Kings, queens, diamond and straight draws, pairs, and suited aces with a draw.' },
      { street: 'turn', text: 'The Q♣ pairs the board. They check and you check back: you can’t get value from a five, and you don’t want to face a check-raise.', range: 'Kings and queens (now trips), full houses, draws, and suited aces that missed.' },
      { street: 'river', text: 'The 7♥ changes little, and they overbet about 1½ times the pot. A world-class player balances big bets carefully: value from queens and full houses, and bluffs from suited aces, the cards that block your best calls. Your A♥ takes away some of those bluffs.', range: 'Value: trip queens, K-Q, 7-7 and 5-5 (full houses), and some kings full. Bluffs: A-2, A-3 and A-4 suited.' },
    ],
    takeaway: 'A blocker to their bluffs makes your bluff catcher worse: hold a card from their value hands instead.',
  },
  'top-pair-call-lag-river-barrel': {
    why: 'Call: J-T, 7-6 and two pair beat you, but a loose-aggressive player arrives here with lots of missed diamond and straight draws and keeps firing them. You need 30%, and those bluffs are enough to clear it. Top pair, top kicker calls unless they never bluff.',
    streets: [
      { street: 'preflop', text: 'You open A♦Q♥ from the cutoff and a loose-aggressive player defends the big blind: suited hands, connectors and broadways.', range: 'Wide: suited hands, connectors, broadways and pairs.' },
      { street: 'flop', text: 'You flop top pair, top kicker on Q♠5♥3♦. They check-raise, which from this player is often a draw or a weaker pair, as well as some strong hands. You call.', range: 'Two pairs, sets, weaker queens, and draws like 6-4, A-4 and 4-2.' },
      { street: 'turn', text: 'The 8♦ adds a diamond draw, and they bet ¾ pot. Most often that’s a straight draw or a pair with some outs; you call and see the river.', range: 'Two pairs and sets, diamond and straight draws, and weaker pairs.' },
      { street: 'river', text: 'The 9♣ completes J-T and 7-6 straights, and they bet ¾ pot again. Three streets of pressure is how a loose player plays draws, as well as strong hands, and plenty of their draws missed.', range: 'Ahead of you: J-T, 7-6, two pairs and sets. Behind you: missed diamond draws, and missed straight draws like 6-4, A-4 and 4-2.' },
    ],
    takeaway: 'Against a player who keeps betting their draws, top pair, top kicker calls down unless they never bluff.',
  },
  'ace-king-call-splashy-river-lead': {
    why: 'Call: their lead could be two pair or a set, but from a splashy player it’s often a worse ace setting its own price. You need 25%, and you’re ahead more than half the time. Fold only against a very weak, tight, straightforward player who never leads without a big hand.',
    streets: [
      { street: 'preflop', text: 'You open A♦K♣ from second position, 368 big blinds deep; three players call, including a splashy small blind with a wide range.', range: 'The small blind: wide, any ace, pairs and suited hands.' },
      { street: 'flop', text: 'You flop top pair, top kicker on A♣6♦2♥. Only the small blind calls your bet. An ace, a six or a deuce, most likely.', range: 'Aces, sixes and deuces, small pairs, and wheel draws.' },
      { street: 'turn', text: 'The 9♥. You bet a medium size: worse aces call it, while a big bet would fold their sixes and deuces.', range: 'Worse aces, two pairs, sets, and some sixes.' },
      { street: 'river', text: 'The 4♦ and they lead about half the pot. A lead shows some strength, but a splashy player also leads worse aces here, so they don’t have to call a bigger bet from you.', range: 'Value: two pair and sets. Often: worse aces making a blocker bet.' },
    ],
    takeaway: 'A small river lead from a loose player is often a worse hand setting its own price: call with top pair, top kicker.',
  },
  'flush-river-all-in-vs-checked-turn': {
    why: 'Shove: after they checked the turn, a bluff from them is unlikely, so checking won’t win more. Their jacks and aces call even a shove, and you beat both. Full houses beat you, but most of them would have bet the turn. With so little behind, any big bet is all in anyway.',
    streets: [
      { street: 'preflop', text: 'The chip leader opens to 2 under the gun +1, and you defend your big blind with K♣2♣ and 19 big blinds. A chip leader opens wide from early position, and suited king-deuce gets a good price to defend.', range: 'Pairs, broadways, suited aces and suited connectors.' },
      { street: 'flop', text: 'The flop is J♠J♣7♣, and you have a flush draw. You check-raise and they 3-bet; with a big stack they may be bullying you. You call.', range: 'Jacks, sevens, overpairs, club draws, and bullying bluffs.' },
      { street: 'turn', text: 'The A♣ gives you the nut flush. You check, wanting them to bet a worse hand or bluff, but they check back. Strong hands would bet the turn; a check says marginal.', range: 'A jack, an ace, an underpair, or junk; few full houses.' },
      { street: 'river', text: 'The 6♠ is a blank. You act first. Most of their range would check behind: underpairs and junk that gave up after the turn. But their jacks, aces and full houses will still call a bet, and with 19 big blinds a bet of most of your stack gets the most from them.', range: 'A jack and an ace (call even a shove), A-J, 7-7 and 6-6 (full houses), underpairs and junk (fold).' },
    ],
    takeaway: 'When their check means they won’t bluff, bet for value yourself: their trips and top pairs call even a shove.',
  },
  'two-pair-river-value-vs-aces': {
    why: 'Bet about ¾ pot: your targets are worse aces, and they’ll call a solid bet but not a shove. Underpairs fold whatever you do. A smaller bet is fine too, but it gets less from the aces. Don’t shove: nothing worse calls it.',
    streets: [
      { street: 'preflop', text: 'Under the gun opens in a tournament, the hijack calls, and you call in the cutoff with A♠Q♣. The opener’s range is strong: big pairs, big aces and suited broadways.', range: 'Big pairs, big aces and suited broadways.' },
      { street: 'flop', text: 'You flop top pair on A♣6♦4♠. Both check to you; you bet and only under the gun calls: an ace, a six, a four or an underpair.', range: 'Aces, underpairs, and sets 6-6 and 4-4.' },
      { street: 'turn', text: 'The Q♠ gives you top two. You bet about ¾ pot: worse aces call that, and a bigger bet would fold them.', range: 'Worse aces like A-J, A-T and suited aces; A-Q; sets; and underpairs.' },
      { street: 'river', text: 'The 9♣ changes nothing, and they check. Their range is worse aces, A-Q, sets and underpairs. Underpairs fold to any bet; the worse aces are the hands that pay you, and they call a ¾-pot bet but fold to more.', range: 'Worse aces (call a normal bet, fold to a shove), A-Q (a split), sets 6-6, 4-4 and 9-9 (beat you), underpairs (fold).' },
    ],
    takeaway: 'Find the hands that will pay, here worse aces, and bet the most they’ll call.',
  },
  'aces-river-shove-one-to-one': {
    why: 'Shove: the draws missed and will fold anyway, so size for the one-pair hands that call. A queen, a nine, or K-K to T-T won’t fold often enough to make a smaller bet better. With about a pot left behind, go all in. Only sets beat you.',
    streets: [
      { street: 'preflop', text: 'Under the gun opens in a tournament and calls your button 3-bet with A♦A♥. Their range: pairs, big aces and suited broadways.', range: 'Pairs, big aces and suited broadways.' },
      { street: 'flop', text: 'The flop is Q♦9♦2♣. You bet and they call with queens, nines and draws; your A♦ blocks the best diamond draws.', range: 'Queens, nines, pairs, diamond draws, and straight draws.' },
      { street: 'turn', text: 'The 4♣ adds a second flush draw. You bet 22 into about 37.5, a medium size that a queen or a nine can’t fold. They call again, keeping queens, nines, pairs like K-K and J-J, sets and both flush draws.', range: 'Queens, nines, K-K to T-T, sets, and club and diamond draws.' },
      { street: 'river', text: 'The 5♥ misses both flush draws, and they check. Busted draws will fold to anything; one-pair hands like a queen or a nine will call, and you crush them.', range: 'A queen or a nine and K-K, J-J and T-T (call), sets (beat you), busted draws (fold).' },
    ],
    takeaway: 'With about a pot left, one-pair hands that call a big bet usually call a shove: go all in.',
  },
  'set-river-shove-vs-sticky-player': {
    why: 'Shove: the draws missed and will fold to anything, but this player calls with any pair. So bet the most you can. All in is only a little more than the pot. A smaller bet just loses value against pairs that would have called anyway.',
    streets: [
      { street: 'preflop', text: 'Five players see the flop in a tournament, you with 7♥7♣ in the hijack. The big blind is very sticky and doesn’t like to fold.', range: 'The big blind: very wide.' },
      { street: 'flop', text: 'You flop middle set on T♥7♠2♠. It checks to you; you bet and only the sticky big blind calls with tens, pairs and spade draws.', range: 'Tens, pairs, spade draws and straight draws.' },
      { street: 'turn', text: 'The K♣ is excellent for you. You bet a medium size: a big bet folds their top pairs, a small one gives draws a cheap call.', range: 'Tens, kings, pairs, two pairs, and spade and straight draws.' },
      { street: 'river', text: 'The 3♣ misses every draw, and they check. A player like this calls with any pair; the busted draws fold whatever you bet.', range: 'Any pair and two pair (call any size), sets (beat you), missed spade and straight draws (fold).' },
    ],
    takeaway: 'Against a sticky player, the hands that call don’t care about size: bet the most you can.',
  },
  'nut-flush-river-big-bet-paired-board': {
    why: 'Overbet: you have the effective nuts. Their second-best hands, two pair, straights and smaller flushes, call whatever you bet, so make it big. Only the one-pair hands care about size, and you’re not betting for them. Full houses are possible, but that’s no reason to check.',
    streets: [
      { street: 'preflop', text: 'You open A♥5♥ on the button to 2.3 in a tournament, 50 big blinds deep, and the big blind defends. Against a button open the big blind defends wide: pairs, suited hands, broadways and connectors.', range: 'Wide: suited hands, connectors, pairs and broadways.' },
      { street: 'flop', text: 'The flop is J♥9♥2♦, and you have the nut flush draw. You bet small, 1.5, and they call with jacks, nines, heart draws, straight draws like K-Q, Q-T and T-8, and pairs.', range: 'Jacks, nines, two pairs, straight draws and heart draws.' },
      { street: 'turn', text: 'The 2♥ gives you the nut flush and pairs the board. You bet nearly the pot: you’re thrilled to build it, but a huge bet would fold the nines and one-heart hands you want in.', range: 'Two pairs, straight draws, smaller hearts, trips, and jacks.' },
      { street: 'river', text: 'The T♦ makes straights for K-Q, Q-8 and 8-7, and they check. Two pair, straights and flushes call any bet you make.', range: 'Smaller flushes, K-Q, Q-8 and 8-7, two pairs J-9, J-T and T-9, trips and full houses (call), one pair (calls only small).' },
    ],
    takeaway: 'When their second-best hands call any size, bet big with the nuts.',
  },
  'top-pair-value-monotone-river': {
    why: 'Bet about ¾ pot: their turn check takes most of the hands that beat you out of their range, and plenty of worse made hands are left. Worse jacks, nines, eights and small pairs call a normal bet. A huge bet folds them, and checking only works against someone who bluffs a lot.',
    streets: [
      { street: 'preflop', text: 'Near the bubble, the hijack opens; you call in the small blind with A♠J♠ and the big blind calls too.', range: 'Pairs, broadways, suited aces and suited connectors.' },
      { street: 'flop', text: 'You flop top pair, top kicker on J♦8♦3♦, monotone, without a diamond. The hijack bets small, you call, and the big blind folds.', range: 'Their whole range: jacks, pairs, diamonds, and air.' },
      { street: 'turn', text: 'The 9♥ and they check back. A flush or a set would usually bet this turn, so their range just got weaker.', range: 'Worse jacks, nines, eights, pairs, and a few strong hands checking.' },
      { street: 'river', text: 'The 6♣ and you’re first. They have lots of worse jacks, nines, eights and small pairs, and those call a normal bet. A huge one folds them.', range: 'Worse jacks (K-J, Q-J, J-T), a nine or an eight, and pairs below the jack call a normal bet. Some better hands checked the turn. Ace and king high fold.' },
    ],
    takeaway: 'When their check behind removes most strong hands, bet top pair for value at a size worse hands call.',
  },
  'set-call-river-lead-straight-board': {
    why: 'Call: any five and T-9 beat you, and a loose defender has lots of those. But they also lead sets and two pair for thin value, and your top set beats all of them. You need about 26%, and you’re just above that. Fold only if you’re sure they lead nothing but a straight.',
    streets: [
      { street: 'preflop', text: 'You open Q♦Q♣ from the lojack and a loose-aggressive player defends the big blind: suited hands and connectors, including many fives.', range: 'Wide: suited hands, connectors, pairs and broadways.' },
      { street: 'flop', text: 'The flop is 7♦6♦4♠, low and connected. You check back your overpair: it’s a board where you don’t want a big pot.', range: 'Pairs, straight and flush draws, two pairs and sets.' },
      { street: 'turn', text: 'The Q♠ gives you top set. They check, you bet 3.33, and they call. A loose player calls with pairs, two pair and sets, the 8-5 and 5-3 straights they already have, and draws like T-9, 9-8 and diamonds that want to see the river.', range: 'Pairs, two pairs, sets, straight draws like 8-5 and 5-3, and flush draws.' },
      { street: 'river', text: 'The 8♥ completes straights for any five and T-9. They lead more than half the pot. A loose player leads straights, but also sets and two pair for thin value.', range: 'Ahead of you: any five and T-9. Behind you: smaller sets and two pairs leading for value.' },
    ],
    takeaway: 'When a loose player leads a scary river, remember they lead thinner hands too: a set can call.',
  },
};

import type { Lesson } from '../model';

export const L9: Record<string, Lesson> = {
  'ace-five-fold-to-river-overbet': {
    why: 'Fold: their overbet is trip queens and full houses, or ace-high bluffs like A-2, A-3 and A-4 suited. You only beat the bluffs, and your A♥ removes some of them. You need 38%, and you’re short. A five without an ace would actually be a better bluff catcher here, because it leaves their bluffs alone.',
    read: [
      { about: 'preflop', text: 'You 3-bet the hijack from the cutoff with A♥5♥ and they called: pairs, big aces and suited broadways.' },
      { about: 'opponent', text: 'A world-class regular balances big bets carefully and picks their bluffs from hands with an ace, the cards that block your best calls.' },
      { about: 'board', text: 'K♦Q♦5♠ gave you bottom pair. The Q♣ pairs the board, so trips and full houses are possible, and the 7♥ changes little.' },
      { about: 'sizing', text: 'An overbet of about 1½ times the pot is polarised: the strongest hands or a bluff. Medium hands like a king just check.' },
      { about: 'range', text: 'For value: trip queens; full houses K-Q, 7-7 and 5-5; kings full they slow-played. For bluffs: A-2, A-3 and A-4 suited.' },
    ],
    takeaway: 'A blocker to their bluffs makes your bluff catcher worse: hold a card from their value hands instead.',
  },
  'top-pair-call-lag-river-barrel': {
    why: 'Call: J-T, 7-6 and two pair beat you, but a loose-aggressive player arrives here with lots of missed diamond and straight draws and keeps firing them. You need 30%, and those bluffs are enough to clear it. Top pair, top kicker calls unless they never bluff.',
    read: [
      { about: 'preflop', text: 'A loose-aggressive player defended the big blind against your cutoff open: suited hands, connectors and broadways.' },
      { about: 'opponent', text: 'A loose-aggressive player check-raises draws and weaker pairs and fires again when the draw misses. Their bets cover far more than strong hands.' },
      { about: 'board', text: 'Q♠5♥3♦ gave you top pair, top kicker. The 8♦ adds a diamond draw, and the 9♣ completes J-T and 7-6 straights.' },
      { about: 'sizing', text: 'A flop check-raise, then ¾ pot on the turn and the river. Three streets of pressure is how a loose player plays draws, as well as strong hands.' },
      { about: 'range', text: 'Ahead of you: J-T, 7-6, two pairs and sets. Behind you: missed diamond draws, and missed straight draws like 6-4, A-4 and 4-2.' },
    ],
    takeaway: 'Against a player who keeps betting their draws, top pair, top kicker calls down unless they never bluff.',
  },
  'ace-king-call-splashy-river-lead': {
    why: 'Call: their lead could be two pair or a set, but from a splashy player it’s often a worse ace setting its own price. You need 25%, and you’re ahead more than half the time. Fold only against a very weak, tight, straightforward player who never leads without a big hand.',
    read: [
      { about: 'preflop', text: 'You raised early and three players called, including a splashy small blind with a wide range.' },
      { about: 'opponent', text: 'A splashy player likes to lead the river with a medium hand so they don’t have to call a bigger bet from you. That’s a blocker bet.' },
      { about: 'players', text: 'Four saw the flop, and only the small blind called your bet. With top pair top kicker you kept betting.' },
      { about: 'board', text: 'A♣6♦2♥ gave you top pair, top kicker. The 9♥ and 4♦ changed little for the hands that matter.' },
      { about: 'sizing', text: 'A half-pot lead after calling twice. Strong hands usually check to let you bet; a smaller lead is often a worse ace wanting a cheap showdown.' },
      { about: 'range', text: 'For value: two pair and sets. Often: worse aces making a blocker bet.' },
    ],
    takeaway: 'A small river lead from a loose player is often a worse hand setting its own price: call with top pair, top kicker.',
  },
  'flush-river-all-in-vs-checked-turn': {
    why: 'Shove: after they checked the turn, a bluff from them is unlikely, so checking won’t win more. Their jacks and aces call even a shove, and you beat both. Full houses beat you, but most of them would have bet the turn. With so little behind, any big bet is all in anyway.',
    read: [
      { about: 'preflop', text: 'The chip leader opened early and you defended your big blind with 19 big blinds.' },
      { about: 'opponent', text: 'A chip leader uses their stack to put pressure on shorter stacks. Their flop 3-bet could be strength, or just bullying.' },
      { about: 'position', text: 'You’re out of position. You checked the turn hoping they’d bet; they checked back instead.' },
      { about: 'board', text: 'J♠J♣7♣ gave you a club draw. The A♣ made your nut flush, and the 6♠ changes nothing.' },
      { about: 'sizing', text: 'A flop 3-bet and then a turn check. Strong hands would bet the turn; a check says marginal: a jack, an ace, an underpair or junk.' },
      { about: 'range', text: 'A jack and an ace call even a shove. A-J, 7-7 and 6-6 full houses beat you. Underpairs and junk fold.' },
    ],
    takeaway: 'When their check means they won’t bluff, bet for value yourself: their trips and top pairs call even a shove.',
  },
  'two-pair-river-value-vs-aces': {
    why: 'Bet about ¾ pot: your targets are worse aces, and they’ll call a solid bet but not a shove. Underpairs fold whatever you do. A smaller bet is fine too, but it gets less from the aces. Don’t shove: nothing worse calls it.',
    read: [
      { about: 'preflop', text: 'Under the gun opened, the hijack called, and you called in the cutoff. The opener’s range is strong: big pairs, big aces and suited broadways.' },
      { about: 'position', text: 'You’re in position, and under the gun checked to you every street. They’re letting you set the price.' },
      { about: 'board', text: 'A♣6♦4♠ gave you top pair. The Q♠ gave you top two, and the 9♣ makes a set for 9-9.' },
      { about: 'sizing', text: 'They check-called the flop and a bigger turn bet: an ace, a set or an underpair. Strong hands would have raised.' },
      { about: 'range', text: 'Worse aces call a normal bet but fold to a shove. A-Q splits. Sets 6-6, 4-4 and 9-9 beat you. Underpairs fold.' },
    ],
    takeaway: 'Find the hands that will pay, here worse aces, and bet the most they’ll call.',
  },
  'aces-river-shove-one-to-one': {
    why: 'Shove: the draws missed and will fold anyway, so size for the one-pair hands that call. A queen, a nine, or K-K to T-T won’t fold often enough to make a smaller bet better. With about a pot left behind, go all in. Only sets beat you.',
    read: [
      { about: 'preflop', text: 'Under the gun opened and called your button 3-bet with aces: pairs, big aces and suited broadways.' },
      { about: 'position', text: 'You’re in position, and they checked to you every street. You control the size of the pot.' },
      { about: 'board', text: 'Q♦9♦2♣ has a diamond draw, and your A♦ blocks the best of it. The 4♣ adds a club draw, and the 5♥ misses both flush draws.' },
      { about: 'sizing', text: 'They check-called two solid bets: a queen, a nine, a pocket pair or a draw. Now the draws missed.' },
      { about: 'range', text: 'A queen or a nine and K-K, J-J and T-T call. Sets beat you. Busted draws fold.' },
    ],
    takeaway: 'With about a pot left, one-pair hands that call a big bet usually call a shove: go all in.',
  },
  'set-river-shove-vs-sticky-player': {
    why: 'Shove: the draws missed and will fold to anything, but this player calls with any pair. So bet the most you can. All in is only a little more than the pot. A smaller bet just loses value against pairs that would have called anyway.',
    read: [
      { about: 'preflop', text: 'Five players saw the flop. The big blind is very sticky and doesn’t like to fold.' },
      { about: 'opponent', text: 'A sticky player calls with any pair and rarely folds once they’ve called. Against them, bet big with strong hands and bluff rarely.' },
      { about: 'players', text: 'Five took the flop; only the sticky big blind called your bet. They called a multiway bet with a pair or a draw.' },
      { about: 'board', text: 'T♥7♠2♠ gave you middle set with a spade draw on the board. The K♣ helps you, and the 3♣ misses every draw.' },
      { about: 'sizing', text: 'They check-called two medium bets. You sized the turn so their top pairs would stay in and draws would pay.' },
      { about: 'range', text: 'Any pair (tens, kings and others) and two pair call. Sets beat you. Missed spade and straight draws fold.' },
    ],
    takeaway: 'Against a sticky player, the hands that call don’t care about size: bet the most you can.',
  },
  'nut-flush-river-big-bet-paired-board': {
    why: 'Overbet: you have the effective nuts. Their second-best hands, two pair, straights and smaller flushes, call whatever you bet, so make it big. Only the one-pair hands care about size, and you’re not betting for them. Full houses are possible, but they’re no reason to check.',
    read: [
      { about: 'preflop', text: 'You opened the button and the big blind defended with a wide range.' },
      { about: 'position', text: 'You’re in position, and they checked to you every street.' },
      { about: 'board', text: 'J♥9♥2♦ gave you the nut flush draw, and the 2♥ made the flush and paired the board. The T♦ adds straights for K-Q, Q-8 and 8-7.' },
      { about: 'sizing', text: 'They called a small flop bet and a near-pot turn bet. On this board that’s two pair, straight draws, smaller hearts and trips.' },
      { about: 'range', text: 'Smaller flushes, K-Q, Q-8 and 8-7 straights, and J-9, J-T and T-9 two pairs call any bet. Trip deuces and full houses call too. One pair calls only small.' },
    ],
    takeaway: 'When their second-best hands call any size, bet big with the nuts.',
  },
  'top-pair-value-monotone-river': {
    why: 'Bet about ¾ pot: their turn check takes most of the hands that beat you out of their range, and plenty of worse made hands are left. Worse jacks, nines, eights and small pairs call a normal bet. A huge bet folds them, and checking only works against someone who bluffs a lot.',
    read: [
      { about: 'preflop', text: 'Near the bubble, the hijack opened. You called in the small blind, and the big blind called too.' },
      { about: 'players', text: 'Three saw the flop; the big blind folded to the bet. Near the bubble, players are more careful with big pots.' },
      { about: 'board', text: 'J♦8♦3♦ is monotone, and you have top pair, top kicker without a diamond. The 9♥ and 6♣ add straights but no fourth diamond.' },
      { about: 'sizing', text: 'A small flop bet, then a turn check. A flush or a set would usually bet the turn; the check leaves mostly one-pair hands.' },
      { about: 'range', text: 'Worse jacks (K-J, Q-J, J-T), a nine or an eight, and pairs below the jack call a normal bet. A few better hands checked the turn. Ace and king high fold.' },
    ],
    takeaway: 'When their check behind removes most strong hands, bet top pair for value at a size worse hands call.',
  },
  'set-call-river-lead-straight-board': {
    why: 'Call: any five and T-9 beat you, and a loose defender has lots of those. But they also lead sets and two pair for thin value, and your top set beats all of them. You need about 26%, and you’re just above that. Fold only if you’re sure they lead nothing but a straight here.',
    read: [
      { about: 'preflop', text: 'A loose-aggressive player defended the big blind against your lojack open: suited hands and connectors, including many fives.' },
      { about: 'opponent', text: 'A loose-aggressive player leads the river with thin value as well as the nuts. That widens what beats them.' },
      { about: 'board', text: '7♦6♦4♠ is connected. The Q♠ gave you top set, and the 8♥ completes straights for any five and T-9.' },
      { about: 'sizing', text: 'A lead of just over half the pot after check-calling the turn. Straights would often check-raise; thinner hands lead to get paid.' },
      { about: 'range', text: 'Ahead of you: any five and T-9. Behind you: smaller sets and two pairs leading for value.' },
    ],
    takeaway: 'When a loose player leads a scary river, remember they lead thinner hands too: a set can call.',
  },
};

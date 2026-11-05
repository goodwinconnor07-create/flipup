// The range training hands: 100bb cash hands played to the turn or the river, heads-up or multiway. Each opponent's
// `range` is their hands at the decision, grouped by what they do there; the tests deal every combo out and check
// the answer is the play with the best EV by a clear margin, and that every hand fits that player's preflop chart
// (charts.ts). Write clues as what the action on that street says about the hands, in plain words.

import type { Scenario } from './model';
import { MORE_SCENARIOS } from './moreScenarios';
import { expandHand, expandRange } from './model';

const FIRST: Scenario[] = [
  {
    id: 'ace-overbet',
    title: 'The overbet on the ace',
    concept: 'Polarised river bets',
    hero: { pos: 'BB', cards: ['Kc', 'Qd'], pre: 'BB vs late open' },
    stack: 100,
    board: ['Kh', '8d', '4c', '2s', 'Ah'],
    actions: [
      { street: 'preflop', who: 'CO', move: 'raise', to: 2.5 },
      { street: 'preflop', who: 'BB', move: 'call' },
      { street: 'flop', who: 'BB', move: 'check' },
      { street: 'flop', who: 'CO', move: 'bet', to: 1.8 },
      { street: 'flop', who: 'BB', move: 'call' },
      { street: 'turn', who: 'BB', move: 'check' },
      { street: 'turn', who: 'CO', move: 'bet', to: 6.8 },
      { street: 'turn', who: 'BB', move: 'call' },
      { street: 'river', who: 'BB', move: 'check' },
      { street: 'river', who: 'CO', move: 'bet', to: 28 },
    ],
    opponents: [
      {
        pos: 'CO',
        type: 'Solid regular',
        pre: 'CO open',
        range: [
          { label: 'Aces up: A-K, A-8, A-4', hands: 'AK, A8s, A4s', role: 'value' },
          { label: 'Sets', hands: '88, 44, 22, KK', role: 'value' },
          { label: 'Aces', hands: 'AA', role: 'value' },
          { label: 'The wheel: 5-3 hit the ace', hands: '53s', role: 'value' },
          { label: 'King-eight', hands: 'K8s', role: 'value' },
          { label: 'Missed straight draws', hands: '76s, 65s', role: 'bluff' },
          { label: 'Give-ups that fire anyway', hands: 'QJs, QTs', role: 'bluff', weight: 0.3 },
        ],
      },
    ],
    best: 'fold',
    clues: [
      { street: 'preflop', text: 'The cutoff opens about a quarter of hands: lots of aces, kings, pairs and suited connectors.' },
      { street: 'flop', text: 'A small bet on K-8-4 with no flush draw is a bet with almost everything. It tells you very little yet.' },
      {
        street: 'turn',
        text: 'The 2 changes nothing, but a big second bet does. Now it’s strong kings, sets, and the draws that picked something up: 6-5, 5-3, A-3 and A-5.',
      },
      {
        street: 'river',
        text: 'The ace is a great card for them. A-K, A-8 and A-4 make two pair, 5-3 makes a straight. A bet bigger than the pot says “very strong or nothing”: that’s a polarised bet.',
      },
    ],
    why: 'King-queen beats only a bluff now, and there aren’t many bluffs left: the missed draws are just 7-6 and 6-5. Calling an overbet this big needs you to be right about 36% of the time, but the ace hit their betting range so hard that you’re good far less often than that. Fold, and don’t feel bad: this is a spot where top pair is a bluff catcher, nothing more.',
  },
  {
    id: 'thin-value-river',
    title: 'Three checks to you',
    concept: 'Thin value',
    hero: { pos: 'BTN', cards: ['Kc', 'Jh'], pre: 'BTN open' },
    stack: 100,
    board: ['Jd', '7c', '3s', '2h', '5d'],
    actions: [
      { street: 'preflop', who: 'BTN', move: 'raise', to: 2.5 },
      { street: 'preflop', who: 'BB', move: 'call' },
      { street: 'flop', who: 'BB', move: 'check' },
      { street: 'flop', who: 'BTN', move: 'bet', to: 1.8 },
      { street: 'flop', who: 'BB', move: 'call' },
      { street: 'turn', who: 'BB', move: 'check' },
      { street: 'turn', who: 'BTN', move: 'check' },
      { street: 'river', who: 'BB', move: 'check' },
    ],
    opponents: [
      {
        pos: 'BB',
        type: 'Loose-passive live player',
        pre: 'BB vs late open',
        range: [
          { label: 'Weaker jacks: J-T, J-9, J-8, J-6', hands: 'JT, J9, J8s, J6s, J4s', role: 'calls', big: 'folds' },
          { label: 'Sevens: A-7, 8-7, 9-7, 7-6', hands: 'A7s, 87s, 97s, 76s', role: 'folds', small: 'calls' },
          { label: 'Pocket pairs under the jack', hands: 'TT, 99, 88, 66, 44', role: 'folds', small: 'calls' },
          { label: 'Better jacks that just called', hands: 'AJ, QJ', role: 'calls', weight: 0.5 },
          { label: 'Slow-played sets', hands: '77, 33, 55', role: 'raises', weight: 0.4 },
          { label: 'Straights and two pair: A-4, 6-4, J-5', hands: 'A4s, 64s, J5s', role: 'raises' },
          { label: 'Missed draws and air', hands: '98s, T9s, T8s, 86s, 65s, A6s', role: 'folds' },
        ],
      },
    ],
    best: 'bet33',
    clues: [
      {
        street: 'preflop',
        text: 'The big blind calls a button raise with a very wide range: lots of weak aces, suited cards and small pairs.',
      },
      {
        street: 'flop',
        text: 'Check-calling a small bet on J-7-3: they have a jack, a seven, a pair or a draw. With a set or two pair this player would often raise.',
      },
      { street: 'turn', text: 'You checked back to keep the pot small. They didn’t lead, so they still don’t have much.' },
      {
        street: 'river',
        text: 'A third check. This player almost never bluffs or slow-plays a big hand three times, so their range is capped: mostly one pair, worse than yours.',
      },
    ],
    why: 'Ask who calls a small bet: J-T, J-9, J-8, every seven and the pocket pairs, and they’re all worse than your king-jack. Only a few hands beat you, and a passive player who checks three times rarely has them. Bet small (about a third of the pot): a big bet folds out exactly the weak pairs you want calling. Checking back wins nothing extra.',
  },
  {
    id: 'checkraise-wet-flop',
    title: 'Queens after a check-raise',
    concept: 'Check-raise ranges',
    hero: { pos: 'CO', cards: ['Qh', 'Qs'], pre: 'CO open' },
    stack: 100,
    board: ['Jd', 'Td', '6c', '2s'],
    actions: [
      { street: 'preflop', who: 'CO', move: 'raise', to: 2.5 },
      { street: 'preflop', who: 'BB', move: 'call' },
      { street: 'flop', who: 'BB', move: 'check' },
      { street: 'flop', who: 'CO', move: 'bet', to: 1.8 },
      { street: 'flop', who: 'BB', move: 'raise', to: 7 },
      { street: 'flop', who: 'CO', move: 'call' },
      { street: 'turn', who: 'BB', move: 'bet', to: 13 },
    ],
    opponents: [
      {
        pos: 'BB',
        type: 'Aggressive regular',
        pre: 'BB vs late open',
        range: [
          { label: 'Sets: tens, sixes, and twos on the turn', hands: 'TT, 66, 22', role: 'value' },
          { label: 'Two pair: J-T, J-6, T-6', hands: 'JT, J6s, T6s', role: 'value' },
          { label: 'Jacks they flat-called with', hands: 'JJ', role: 'value', weight: 0.4 },
          { label: 'Flush draws', hands: 'AKs@d, AQs@d, A5s@d, A4s@d, A3s@d, KdQd, Kd9d, Qd9d, 9d8d, 8d7d', role: 'bluff' },
          { label: 'Straight draws: K-Q, Q-9, 9-8', hands: 'KQo, Q9o, Q9s@c, 98s@h, 98s@s, 98s@c', role: 'bluff' },
        ],
      },
    ],
    best: 'call',
    clues: [
      { street: 'preflop', text: 'The big blind defends wide against a cutoff raise, with lots of suited and connected hands.' },
      {
        street: 'flop',
        text: 'J-T-6 with two diamonds is a board where the big blind has many sets, two pairs and draws. A check-raise here means a set, two pair, or a strong draw like a flush draw or an open-ender.',
      },
      {
        street: 'turn',
        text: 'The 2 of spades completes nothing. Value hands keep betting, but so do all the draws: they need to win now or hit the river.',
      },
    ],
    why: 'You’re crushed by their sets and two pairs, but more than half of their range is still a draw: flush draws, K-Q, Q-9, 9-8. You need about 29% to call this bet, and queens win much more than that. Calling keeps the draws in. Raising all in would only get called by the hands that beat you and by the biggest draws, so just call and look at the river.',
  },
  {
    id: 'flush-turn-check',
    title: 'The flush comes and they check',
    concept: 'Reading a check',
    hero: { pos: 'CO', cards: ['As', 'Td'], pre: 'Cold call' },
    stack: 100,
    board: ['Th', '9h', '4c', '2h'],
    actions: [
      { street: 'preflop', who: 'HJ', move: 'raise', to: 2.5 },
      { street: 'preflop', who: 'CO', move: 'call' },
      { street: 'flop', who: 'HJ', move: 'bet', to: 2.2 },
      { street: 'flop', who: 'CO', move: 'call' },
      { street: 'turn', who: 'HJ', move: 'check' },
    ],
    opponents: [
      {
        pos: 'HJ',
        type: 'Solid regular',
        pre: 'HJ open',
        range: [
          {
            label: 'Weaker tens: K-T, Q-T, J-T',
            hands: 'KTs@s, KTs@c, KTs@d, QTs@s, QTs@c, QTs@d, JTs@s, JTs@c, JTs@d, KTo',
            role: 'calls',
            big: 'folds',
          },
          {
            label: 'Nines: A-9, K-9, 9-8',
            hands: 'A9s@s, A9s@d, A9s@c, K9s@s, K9s@c, K9s@d, 98s@s, 98s@c, 98s@d',
            role: 'folds',
            small: 'calls',
          },
          { label: 'A-K with the ace of hearts (nut flush draw)', hands: 'AhKs, AhKc, AhKd', role: 'folds', small: 'calls' },
          { label: 'Pocket pairs: sevens and eights', hands: '88, 77', role: 'folds', small: 'calls', weight: 0.6 },
          { label: 'Overpairs: jacks to kings', hands: 'JJ, QQ, KK', role: 'calls', weight: 0.5 },
          { label: 'Flushes it checks to trap', hands: 'KQs@h, KJs@h, QJs@h, J8s@h, 87s@h', role: 'raises', weight: 0.25 },
          { label: 'Sets and two pair', hands: '99, 44, T9s', role: 'raises', weight: 0.3 },
          { label: 'Gave up: ace-high and gutshots', hands: 'AQo, AJo, KQo, QJo, KJo', role: 'folds' },
        ],
      },
    ],
    best: 'bet33',
    alsoOk: ['bet75'],
    clues: [
      { street: 'preflop', text: 'The hijack opens and you call in the cutoff with ace-ten.' },
      { street: 'flop', text: 'They bet small on T-9-4 with two hearts: a bet with most of their range.' },
      {
        street: 'turn',
        text: 'The third heart comes and they check. Someone with a flush usually bets here to get value and to charge one-heart hands, so a check means they rarely have one. They’re mostly one pair, overpairs and ace-high.',
      },
    ],
    why: 'Their check takes most flushes out of their range. You still beat K-T, Q-T, J-T, every nine, the small pairs, and A-K with the ace of hearts, and those hands will call a small bet. Bet a third to three-quarters of the pot: that gets value from the tens and nines and charges A-K with the ace of hearts, which could make the nut flush on the river. Checking gives all of those a free card for nothing. Don’t overbet, though: only their overpairs would call, and they beat you.',
  },
  {
    id: 'bluffcatch-missed-draws',
    title: 'Three barrels, and the draws missed',
    concept: 'Bluff catching',
    hero: { pos: 'BB', cards: ['Ac', 'Jd'], pre: 'BB vs late open' },
    stack: 100,
    board: ['Js', '8s', '3d', '5h', '2c'],
    actions: [
      { street: 'preflop', who: 'BTN', move: 'raise', to: 2.5 },
      { street: 'preflop', who: 'BB', move: 'call' },
      { street: 'flop', who: 'BB', move: 'check' },
      { street: 'flop', who: 'BTN', move: 'bet', to: 1.8 },
      { street: 'flop', who: 'BB', move: 'call' },
      { street: 'turn', who: 'BB', move: 'check' },
      { street: 'turn', who: 'BTN', move: 'bet', to: 6.8 },
      { street: 'turn', who: 'BB', move: 'call' },
      { street: 'river', who: 'BB', move: 'check' },
      { street: 'river', who: 'BTN', move: 'bet', to: 17 },
    ],
    opponents: [
      {
        pos: 'BTN',
        type: 'Aggressive regular',
        pre: 'BTN open',
        range: [
          { label: 'Overpairs', hands: 'AA, KK, QQ', role: 'value' },
          { label: 'Sets', hands: '88, 33, 55, 22', role: 'value' },
          { label: 'Two pair: J-8, 5-3', hands: 'J8s, 53s', role: 'value' },
          { label: 'Straights on the river: 6-4, A-4', hands: '64s, A4s', role: 'value' },
          { label: 'Missed spade draws', hands: 'AKs@s, AQs@s, ATs@s, A9s@s, A7s@s, A6s@s, KQs@s, KTs@s, QTs@s', role: 'bluff' },
          { label: 'Missed straight draws: T-9, 9-7, 7-6', hands: 'T9s, 97s, 76s', role: 'bluff' },
        ],
      },
    ],
    best: 'call',
    clues: [
      { street: 'preflop', text: 'The button opens very wide, so there are lots of suited and connected hands in their range.' },
      {
        street: 'flop',
        text: 'J-8-3 with two spades: the small bet is with almost everything, including every spade draw and straight draw.',
      },
      {
        street: 'turn',
        text: 'The 5 adds more straight draws (7-6, 6-4). An aggressive player keeps betting with value and with all those draws.',
      },
      {
        street: 'river',
        text: 'A blank: the 2 of clubs. Every spade draw and most straight draws missed. Their range is now polarised: overpairs, sets and two pair for value, and a lot of missed draws that can only win by betting.',
      },
    ],
    why: 'Ace-jack loses to every value hand, but it beats every missed draw, and this player has plenty of them: nine spade draws plus T-9, 9-7 and 7-6. You need to win about 30% of the time to call. Against this range you win more than that. Your ace of clubs also matters: it doesn’t block any of their spade bluffs. Call.',
  },
  {
    id: 'probe-capped',
    title: 'They checked back the flop',
    concept: 'Capped ranges',
    hero: { pos: 'BB', cards: ['Kc', '6c'], pre: 'BB vs late open' },
    stack: 100,
    board: ['Kd', '9s', '4h', '2c'],
    actions: [
      { street: 'preflop', who: 'CO', move: 'raise', to: 2.5 },
      { street: 'preflop', who: 'BB', move: 'call' },
      { street: 'flop', who: 'BB', move: 'check' },
      { street: 'flop', who: 'CO', move: 'check' },
    ],
    opponents: [
      {
        pos: 'CO',
        type: 'Solid regular',
        pre: 'CO open',
        range: [
          { label: 'Nines: A-9, J-9, T-9, 9-8', hands: 'A9, J9s, T9s, 98s, 97s', role: 'folds', small: 'calls' },
          { label: 'Big pocket pairs: queens to tens', hands: 'QQ, JJ, TT', role: 'calls', big: 'folds' },
          { label: 'Small pocket pairs', hands: '88, 77, 55, 33', role: 'folds', small: 'calls' },
          { label: 'Weak king: K-5', hands: 'K5s', role: 'calls' },
          { label: 'Kings with a better kicker', hands: 'K7s, K8s', role: 'calls', weight: 0.6 },
          { label: 'Straight draw: 5-3', hands: '53s', role: 'folds', small: 'calls' },
          { label: 'Sets it slow-played', hands: '99, 44, 22', role: 'raises', weight: 0.4 },
          { label: 'Ace-high and air', hands: 'AQo, AJo, ATo, QJo, QTo, JTo, 76s, 65s', role: 'folds' },
        ],
      },
    ],
    best: 'bet33',
    alsoOk: ['bet75'],
    clues: [
      { street: 'preflop', text: 'The cutoff opens about a quarter of hands and you defend king-six suited from the big blind.' },
      {
        street: 'flop',
        text: 'K-9-4 is a great board for the cutoff’s range, so it bets nearly everything with a king, and a lot more besides. When it checks back, it rarely has a good king: its range is capped at middle pairs, weak kings and ace-high.',
      },
      {
        street: 'turn',
        text: 'The 2 of clubs changes nothing. You’re first to act, with a hand much stronger than most of what they checked.',
      },
    ],
    why: 'Their check took the good kings out of their range, so your weak top pair is now ahead of almost everything they have: nines, pocket pairs, worse kings. Bet (this is called a probe bet). A small bet gets called by all of those, and it denies ace-high a free card. A bigger bet works too, but folds more of the pairs you beat.',
  },
  {
    id: 'live-river-checkraise',
    title: 'The river check-raise',
    concept: 'Live river raises',
    hero: { pos: 'HJ', cards: ['As', 'Kd'], pre: 'HJ open' },
    stack: 100,
    board: ['Ah', 'Kc', '7d', '9s', 'Ts'],
    actions: [
      { street: 'preflop', who: 'HJ', move: 'raise', to: 2.5 },
      { street: 'preflop', who: 'BB', move: 'call' },
      { street: 'flop', who: 'BB', move: 'check' },
      { street: 'flop', who: 'HJ', move: 'bet', to: 2.5 },
      { street: 'flop', who: 'BB', move: 'call' },
      { street: 'turn', who: 'BB', move: 'check' },
      { street: 'turn', who: 'HJ', move: 'bet', to: 8 },
      { street: 'turn', who: 'BB', move: 'call' },
      { street: 'river', who: 'BB', move: 'check' },
      { street: 'river', who: 'HJ', move: 'bet', to: 20 },
      { street: 'river', who: 'BB', move: 'raise', to: 60 },
    ],
    opponents: [
      {
        pos: 'BB',
        type: 'Tight-passive live player',
        pre: 'BB vs middle open',
        range: [
          { label: 'Broadway: Q-J', hands: 'QJ', role: 'value' },
          { label: 'Jack-eight straight', hands: 'J8s', role: 'value' },
          { label: 'Sets', hands: '77, 99, TT', role: 'value' },
          { label: 'Top set and second set', hands: 'AA, KK', role: 'value', weight: 0.2 },
          { label: 'Aces up: A-7, A-9', hands: 'A7s, A9s', role: 'value', weight: 0.5 },
          { label: 'Two pair: T-9', hands: 'T9s', role: 'value', weight: 0.5 },
          { label: 'A rare bluff', hands: 'QTs, 86s', role: 'bluff', weight: 0.15 },
        ],
      },
    ],
    best: 'fold',
    clues: [
      { street: 'preflop', text: 'A tight-passive player defends the big blind with broadways, suited aces, pairs and connectors.' },
      { street: 'flop', text: 'They check-call on A-K-7: an ace, a king, or a gutshot like Q-J or Q-T.' },
      { street: 'turn', text: 'The 9 brings more draws (J-T, J-8, T-8). They call again.' },
      {
        street: 'river',
        text: 'The T completes Q-J and J-8. A passive live player who check-raises the river almost always has it: they rarely bluff here, and they don’t raise with worse two pairs.',
      },
    ],
    why: 'Top two pair feels strong, but against this player a river check-raise is a straight or a set nearly every time. You need to win about 27% to call, and the bluffs in their range are tiny. You beat only A-9, A-7, T-9 and the odd bluff. Fold. Many live players never bluff-raise a river, so believe them.',
  },
  {
    id: 'pot-control-ace-turn',
    title: 'Second pair when the ace hits',
    concept: 'Pot control',
    hero: { pos: 'LJ', cards: ['Ts', '9s'], pre: 'MP open (9-handed)' },
    table: 9,
    stack: 100,
    board: ['Tc', '6d', '3h', 'Ah'],
    actions: [
      { street: 'preflop', who: 'LJ', move: 'raise', to: 2.5 },
      { street: 'preflop', who: 'BB', move: 'call' },
      { street: 'flop', who: 'BB', move: 'check' },
      { street: 'flop', who: 'LJ', move: 'bet', to: 1.8 },
      { street: 'flop', who: 'BB', move: 'call' },
      { street: 'turn', who: 'BB', move: 'check' },
    ],
    opponents: [
      {
        pos: 'BB',
        type: 'Typical live player',
        pre: 'BB vs middle open',
        range: [
          {
            label: 'Aces they called the flop with: A-6, A-3, A-T, A-J and more',
            hands: 'A6s, A3s, AT, AJo, A9o, A8o, A7s, A5s, A4s, A2s',
            role: 'calls',
          },
          { label: 'Better tens: K-T, Q-T, J-T', hands: 'KT, QTs, JTs', role: 'calls' },
          { label: 'Sets', hands: '66, 33, TT', role: 'raises', weight: 0.4 },
          { label: 'Sixes and small pairs', hands: '76s, 65s, 86s, 87s, 55, 44, 77, 88', role: 'folds' },
          { label: 'Gutshots: 5-4, 8-7', hands: '54s', role: 'folds' },
        ],
      },
    ],
    best: 'check',
    clues: [
      { street: 'preflop', text: 'The big blind defends with lots of aces, especially suited ones and the weaker offsuit aces.' },
      { street: 'flop', text: 'They check-call your small bet on T-6-3: a ten, a six, a pocket pair, an ace with something, or a draw.' },
      {
        street: 'turn',
        text: 'An ace is the card their calling range hits most: every A-x that floated the flop now has top pair. Your ten-nine just became second pair.',
      },
    ],
    why: 'If you bet, who calls? The aces and the better tens, and they all beat you. The sixes and small pairs you beat will fold. A bet that only gets called by better hands is a mistake, so check back. You keep the pot small, see the river for free, and your hand can still win a showdown against their weaker pairs.',
  },
  {
    id: 'overbet-straight',
    title: 'The nuts against a capped range',
    concept: 'Overbetting',
    hero: { pos: 'CO', cards: ['9h', '7h'], pre: 'CO open' },
    stack: 100,
    board: ['8h', '6c', '2d', '5s', 'Kd'],
    actions: [
      { street: 'preflop', who: 'CO', move: 'raise', to: 2.5 },
      { street: 'preflop', who: 'BB', move: 'call' },
      { street: 'flop', who: 'BB', move: 'check' },
      { street: 'flop', who: 'CO', move: 'bet', to: 1.8 },
      { street: 'flop', who: 'BB', move: 'call' },
      { street: 'turn', who: 'BB', move: 'check' },
      { street: 'turn', who: 'CO', move: 'bet', to: 6.8 },
      { street: 'turn', who: 'BB', move: 'call' },
      { street: 'river', who: 'BB', move: 'check' },
    ],
    opponents: [
      {
        pos: 'BB',
        type: 'Typical live player',
        pre: 'BB vs late open',
        range: [
          { label: 'Sets they slow-played', hands: '88, 66, 22, 55', role: 'calls', weight: 0.5 },
          { label: 'Two pair: 8-6, 8-5, 6-5, K-8', hands: '86s, 85s, 65s, K8s', role: 'calls' },
          { label: 'Smaller straights: 7-4, 4-3', hands: '74s, 43s', role: 'calls' },
          { label: 'The same straight: 9-7', hands: '97s', role: 'calls' },
          { label: 'Top pair that won’t let go', hands: 'A8s, 98s, 87s', role: 'calls', weight: 0.3 },
          { label: 'Top pair that folds to a big bet', hands: 'A8s, 98s, 87s', role: 'folds', weight: 0.7 },
          { label: 'Pocket pairs', hands: '77, 99, TT', role: 'folds' },
        ],
      },
    ],
    best: 'bet125',
    alsoOk: ['bet75'],
    clues: [
      { street: 'preflop', text: 'The big blind defends with lots of connected cards and pairs.' },
      { street: 'flop', text: 'They check-call on 8-6-2: an eight, a six, a pair or a straight draw.' },
      {
        street: 'turn',
        text: 'The 5 gives you the nine-high straight. They check-call again; with a big hand many players would have raised by now.',
      },
      {
        street: 'river',
        text: 'The K changes nothing for you. They check a third time: their range is capped at two pair, sets they slowed down, smaller straights and top pair.',
      },
    ],
    why: 'You have the best possible hand, and their range is full of strong-but-worse hands: two pair, sets, 7-4 and 4-3 straights. Those hands find it very hard to fold even to a big bet, so bet bigger than the pot. Their capped range can’t raise you, and every extra chip comes from hands that can’t beat a nine-high straight.',
  },
  {
    id: 'river-bluff-capped',
    title: 'They gave up on the turn',
    concept: 'Bluffing a capped range',
    hero: { pos: 'BB', cards: ['7h', '6h'], pre: 'BB vs middle open' },
    stack: 100,
    board: ['Jh', '9h', '3c', '2s', 'Kd'],
    actions: [
      { street: 'preflop', who: 'HJ', move: 'raise', to: 2.5 },
      { street: 'preflop', who: 'BB', move: 'call' },
      { street: 'flop', who: 'BB', move: 'check' },
      { street: 'flop', who: 'HJ', move: 'bet', to: 1.8 },
      { street: 'flop', who: 'BB', move: 'call' },
      { street: 'turn', who: 'BB', move: 'check' },
      { street: 'turn', who: 'HJ', move: 'check' },
    ],
    opponents: [
      {
        pos: 'HJ',
        type: 'Solid regular',
        pre: 'HJ open',
        range: [
          { label: 'Middle pairs: A-9, T-9, 9-8', hands: 'A9s, T9s, 98s, A9o', role: 'folds', small: 'calls' },
          { label: 'Small pairs', hands: '88, 77, 66, 55, 44, TT', role: 'folds', small: 'calls', weight: 1 },
          { label: 'Missed draws: Q-T, T-8, 8-7', hands: 'QTs, T8s, 87s', role: 'folds' },
          { label: 'Ace-high that gave up', hands: 'AQo, ATo, A5s, A4s', role: 'folds' },
          { label: 'Kings: A-K, K-Q, K-T, K-J', hands: 'AKo, KQo, KTs, KJs', role: 'calls' },
          { label: 'Weak jacks they checked for pot control', hands: 'JTs, QJs, AJo', role: 'calls', weight: 0.4 },
          { label: 'Sets it slow-played', hands: '99, 33, 22', role: 'raises', weight: 0.3 },
        ],
      },
    ],
    best: 'bet75',
    alsoOk: ['bet125'],
    clues: [
      { street: 'preflop', text: 'The hijack opens; you defend seven-six of hearts from the big blind.' },
      {
        street: 'flop',
        text: 'J-9-3 with two hearts: they bet small, as they would with most of their range. You call with a flush draw.',
      },
      {
        street: 'turn',
        text: 'A blank, and they check back. With a good jack they’d keep betting to charge all the draws on this board. Checking says they have a middle pair, a small pair, ace-high, or a draw that gave up.',
      },
      {
        street: 'river',
        text: 'Your flush missed, so seven-high can’t win a showdown. The K is a card you can represent: your check-calls include K-J, K-9 and K-T.',
      },
    ],
    why: 'Their turn check capped their range: most of it is middle and small pairs, ace-high and missed draws, which can’t call a big bet. Only their kings and the odd slow-played set want to continue. A three-quarter-pot bet needs to work about 43% of the time, and far more of their range folds than that. Seven-high never wins if you check, so bet.',
  },
  {
    id: 'blocker-call',
    title: 'The flush gets there',
    concept: 'Blockers',
    hero: { pos: 'BTN', cards: ['As', 'Qd'], pre: 'Cold call' },
    stack: 100,
    board: ['Qs', '7s', '3d', '9c', '2s'],
    actions: [
      { street: 'preflop', who: 'HJ', move: 'raise', to: 2.5 },
      { street: 'preflop', who: 'BTN', move: 'call' },
      { street: 'flop', who: 'HJ', move: 'bet', to: 3 },
      { street: 'flop', who: 'BTN', move: 'call' },
      { street: 'turn', who: 'HJ', move: 'bet', to: 8.5 },
      { street: 'turn', who: 'BTN', move: 'call' },
      { street: 'river', who: 'HJ', move: 'bet', to: 22 },
    ],
    opponents: [
      {
        pos: 'HJ',
        type: 'Aggressive regular',
        pre: 'HJ open',
        range: [
          {
            label: 'Flushes (no ace-high ones: you hold the A♠)',
            hands: 'KJs@s, KTs@s, K9s@s, JTs@s, T8s@s, 98s@s, 86s@s, 65s@s, 54s@s',
            role: 'value',
          },
          { label: 'Sets', hands: '77, 33, 99', role: 'value' },
          { label: 'Top set', hands: 'QQ', role: 'value', weight: 0.5 },
          { label: 'Two pair: Q-9, 9-7', hands: 'Q9s, 97s', role: 'value' },
          { label: 'Queens it bets thinly: K-Q, Q-J', hands: 'KQs, QJs', role: 'value', weight: 0.5 },
          { label: 'Ace-queen (a split)', hands: 'AQ', role: 'value', weight: 0.5 },
          {
            label: 'Missed straight draws: J-T, T-8, 8-6',
            hands: 'JTo, JTs@h, JTs@d, JTs@c, T8s@h, T8s@d, T8s@c, 86s@h, 86s@d, 86s@c',
            role: 'bluff',
          },
          { label: 'King-jack gutshot', hands: 'KJo', role: 'bluff', weight: 0.5 },
        ],
      },
    ],
    best: 'call',
    clues: [
      { street: 'preflop', text: 'The hijack opens; you call with ace-queen on the button.' },
      { street: 'flop', text: 'Q-7-3 with two spades. They bet half the pot: queens, sevens, sets and draws.' },
      {
        street: 'turn',
        text: 'The 9 of clubs adds straight draws: J-T, T-8, 8-6 all have eight outs now. An aggressive player keeps barrelling them.',
      },
      {
        street: 'river',
        text: 'The 2 of spades completes the flush. But you hold the ace of spades, so they can never have the nut flush, and every A-x of spades draw they might have had is gone.',
      },
    ],
    why: 'The flush came, but your ace of spades blocks all the ace-high flushes, the most common flush they’d bet. What’s left is a handful of other flushes and sets, against a lot of missed straight draws: J-T, T-8 and 8-6 all missed. You need to win about 30% to call this three-quarter-pot bet, and top pair with the ace of spades wins more often than that.',
  },
  {
    id: 'set-straight-river',
    title: 'A set when the straight comes',
    concept: 'Betting only gets called by better',
    hero: { pos: 'BB', cards: ['7s', '7d'], pre: 'BB vs late open' },
    stack: 100,
    board: ['9c', '7h', '4s', '2d', '8c'],
    actions: [
      { street: 'preflop', who: 'CO', move: 'raise', to: 2.5 },
      { street: 'preflop', who: 'BB', move: 'call' },
      { street: 'flop', who: 'BB', move: 'check' },
      { street: 'flop', who: 'CO', move: 'bet', to: 1.8 },
      { street: 'flop', who: 'BB', move: 'call' },
      { street: 'turn', who: 'BB', move: 'check' },
      { street: 'turn', who: 'CO', move: 'bet', to: 6.8 },
      { street: 'turn', who: 'BB', move: 'call' },
    ],
    opponents: [
      {
        pos: 'CO',
        type: 'Aggressive regular',
        pre: 'CO open',
        range: [
          { label: 'Straights: J-T, 6-5', hands: 'JT, 65s', role: 'calls' },
          { label: 'Higher sets', hands: '99', role: 'raises' },
          { label: 'Overpairs that won’t fold', hands: 'TT, JJ, QQ', role: 'calls', weight: 0.3 },
          { label: 'Overpairs that fold to a big bet', hands: 'TT, JJ, QQ', role: 'folds', weight: 0.7 },
          { label: 'Top pair: A-9, K-9, T-9', hands: 'A9, K9s, T9s', role: 'folds' },
          { label: 'Missed draws', hands: 'Q9s, AKs, AQs', role: 'folds' },
          { label: 'Draws that only paired the eight: T-8, 8-6', hands: 'T8s, 86s', role: 'folds' },
        ],
      },
    ],
    best: 'check',
    clues: [
      { street: 'preflop', text: 'The cutoff opens; you defend sevens from the big blind.' },
      { street: 'flop', text: 'You flop a set on 9-7-4 and slow-play. They bet small: most of their range.' },
      { street: 'turn', text: 'They bet again on the 2: top pairs, overpairs, and draws like J-T, T-8, 6-5 and 8-6.' },
      { street: 'river', text: 'The 8 completes J-T and 6-5, exactly the draws that barrelled the turn.' },
    ],
    why: 'Picture betting: the straights call or raise, and the one-pair hands and missed draws you beat fold. Your set is strong, but a bet here mostly gets called by better. Check: their busted draws and top pairs may bet, and you can decide on their bet (a big shove now looks a lot like a straight).',
  },
  {
    id: 'block-bet-raise',
    title: 'A small lead on the river',
    concept: 'Small bets mean weak',
    hero: { pos: 'BTN', cards: ['Kh', 'Qh'], pre: 'BTN open' },
    stack: 100,
    board: ['Ks', '8h', '4d', '2c', '7s'],
    actions: [
      { street: 'preflop', who: 'BTN', move: 'raise', to: 2.5 },
      { street: 'preflop', who: 'BB', move: 'call' },
      { street: 'flop', who: 'BB', move: 'check' },
      { street: 'flop', who: 'BTN', move: 'bet', to: 1.8 },
      { street: 'flop', who: 'BB', move: 'call' },
      { street: 'turn', who: 'BB', move: 'check' },
      { street: 'turn', who: 'BTN', move: 'bet', to: 6.8 },
      { street: 'turn', who: 'BB', move: 'call' },
      { street: 'river', who: 'BB', move: 'bet', to: 5 },
    ],
    opponents: [
      {
        pos: 'BB',
        type: 'Passive live player',
        pre: 'BB vs late open',
        range: [
          { label: 'Weaker kings: K-J, K-T, K-9, K-5', hands: 'KJ, KT, K9s, K5s, K3s', role: 'value' },
          { label: 'Eights it’s scared to check: A-8, 9-8', hands: 'A8s, 98s', role: 'value' },
          { label: 'Two pair: 8-7, 7-4', hands: '87s, 74s', role: 'value' },
          { label: 'Missed draws: 6-5, 5-3', hands: '65s, 53s', role: 'bluff', weight: 0.5 },
        ],
      },
    ],
    best: 'raise',
    alsoOk: ['call'],
    clues: [
      { street: 'preflop', text: 'A passive player defends the big blind.' },
      { street: 'flop', text: 'K-8-4: they check-call, so a king, an eight, or a draw like 6-5 or 5-3.' },
      { street: 'turn', text: 'They call again on the 2: still mostly a king or an eight.' },
      {
        street: 'river',
        text: 'Now they lead for about a fifth of the pot. From a passive player, a tiny bet is usually a medium hand trying to see a cheap showdown: a weak king or an eight. With a strong hand they’d check to you or bet much more.',
      },
    ],
    why: 'King-queen beats every weaker king and every eight they’d make this little bet with. Raise for value: worse kings will call, and this player rarely has 8-7 or 7-4 here. Just calling isn’t wrong, but it leaves money behind against a range you’re crushing.',
  },
];

/** Every hand, mixing heads-up and multiway: one of the new ones after every two of the first set. */
export const SCENARIOS: Scenario[] = FIRST.flatMap((s, i) =>
  i % 2 === 1 && MORE_SCENARIOS[(i - 1) / 2] ? [s, MORE_SCENARIOS[(i - 1) / 2]] : [s],
).concat(MORE_SCENARIOS.slice(Math.floor(FIRST.length / 2)));

/**
 * Generated hands are stored compactly: a group's combos become hand classes ("AKs", "QQ") wherever every live combo
 * of the class is in it, and exact combos ("AhKh") for the rest. `unpack` also reads the older format, the combos
 * run together ("AhKhAdKd").
 */
export function pack(list: Scenario[]): Scenario[] {
  const R = '23456789TJQKA';
  const classOf = (c: string) => {
    const [a, b] = [c.slice(0, 2), c.slice(2, 4)].sort((x, y) => R.indexOf(y[0]) - R.indexOf(x[0]));
    return a[0] === b[0] ? a[0] + b[0] : `${a[0]}${b[0]}${a[1] === b[1] ? 's' : 'o'}`;
  };
  return list.map((s) => {
    const dead = new Set([...s.hero.cards, ...s.board]);
    const live = (cls: string) => expandHand(cls).filter((c) => !dead.has(c[0]) && !dead.has(c[1])).length;
    return {
      ...s,
      opponents: s.opponents.map((o) => ({
        ...o,
        range: o.range.map((g) => {
          // Exact combos first (a group may already be packed), less any card you can see.
          const combos = expandRange(g.hands)
            .filter((c) => !dead.has(c[0]) && !dead.has(c[1]))
            .map((c) => c.join(''));
          const by = new Map<string, string[]>();
          for (const c of combos) by.set(classOf(c), [...(by.get(classOf(c)) ?? []), c]);
          const tokens = [...by.entries()].flatMap(([cls, cs]) => (cs.length === live(cls) ? [cls] : cs));
          return { ...g, hands: tokens.join(',') };
        }),
      })),
    };
  });
}
export const unpack = (list: Scenario[]): Scenario[] =>
  list.map((s) => ({
    ...s,
    opponents: s.opponents.map((o) => ({
      ...o,
      range: o.range.map((g) => ({
        ...g,
        hands: /^([2-9TJQKA][shdc]){2,}$/.test(g.hands) && g.hands.length > 4 ? (g.hands.match(/.{4}/g) ?? []).join(', ') : g.hands,
      })),
    })),
  }));

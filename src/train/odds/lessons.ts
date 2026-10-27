// The formula card for each odds and outs topic: the formula, how to use it, a worked example and a tip.
// Plain words, contractions, no jargon without saying what it means. Sources are where the ideas are taught.

import { read, write } from '../../state/persist';
import type { TopicId } from './bank';

export interface Lesson {
  id: TopicId;
  title: string;
  hint: string;
  emoji: string;
  formula: string;
  how: string[];
  example: string;
  tip: string;
}

export const LESSONS: Lesson[] = [
  {
    id: 'outs',
    title: 'Counting outs',
    hint: 'Cards that win you the pot',
    emoji: '🎯',
    formula: 'Outs = the unseen cards that give you the best hand',
    how: [
      'Work out what you need: a flush needs one of the 9 cards left in your suit, an open-ended straight draw one of 8, a gutshot one of 4.',
      'Add every other card that helps: an overcard that pairs, a card that makes trips.',
      'Take away dirty outs: cards that make your hand but give them a better one (a flush card that pairs the board against a set).',
      'Count each card once: if the nine of hearts makes both your flush and your straight, it\'s still one out.',
    ],
    example: 'You have [Ah][Kh] on [Qh][7h][2c][4s] against a pair of queens: 9 hearts + 3 aces + 3 kings = 15 outs.',
    tip: 'Against a set, a flush card that pairs the board is no good. Count those as zero.',
  },
  {
    id: 'equity',
    title: 'Outs to equity',
    hint: 'The rule of 2 and 4',
    emoji: '📈',
    formula: 'One card to come: outs × 2.  Two cards (all-in on the flop): outs × 4.',
    how: [
      'Exactly, with one card: outs ÷ unseen cards (46 on the turn, 47 on the flop).',
      'Exactly, with two: 1 − (misses ÷ 47) × ((misses − 1) ÷ 46), where misses = 47 − outs. That\'s the chance you miss twice, taken from 100%.',
      'The rule of 4 overshoots big draws: take off 1% for every out above 8.',
      'Only use × 4 when you\'re all-in. If they can bet again on the turn, you\'re only paying for one card.',
    ],
    example: '9 outs on the flop, all-in: 9 × 4 = 36%. Exactly it\'s 35.0%. On the turn: 9 × 2 = 18%, exactly 19.6%.',
    tip: 'Common draws to know cold: flush draw 35% (flop) / 20% (turn), open-ender 31.5% / 17%, gutshot 16.5% / 9%.',
  },
  {
    id: 'potodds',
    title: 'Pot odds',
    hint: 'What a call needs to win',
    emoji: '⚖️',
    formula: 'Equity needed = call ÷ (pot + their bet + your call)',
    how: [
      'Add the pot, their bet and your call: that\'s what you play for.',
      'Divide your call by it. Win more often than that and the call makes money.',
      'As odds: (pot + bet) to bet. To turn odds into a percentage, 1 ÷ (odds + 1).',
    ],
    example: 'Pot 100, they bet 50: you call 50 to win 200 in total, so you need 50 ÷ 200 = 25% (3 to 1).',
    tip: 'Half pot needs 25%, two-thirds pot 28.6%, pot 33%, double pot 40%.',
  },
  {
    id: 'call',
    title: 'Call or fold?',
    hint: 'Your draw against the price',
    emoji: '🤔',
    formula: 'Call when your equity > the equity the price needs',
    how: [
      'Count your outs and turn them into equity (one card or two?).',
      'Work out the equity the bet asks for.',
      'If your equity is bigger, call. If not, you need implied odds, fold equity (raise) or to let it go.',
    ],
    example: 'Turn, flush draw (19.6%) facing a pot-size bet (needs 33%): fold unless they\'ll pay you a lot on the river.',
    tip: 'On the flop, facing a bet that isn\'t all-in, use one-card odds. The turn might bring another bet.',
  },
  {
    id: 'implied',
    title: 'Implied odds',
    hint: 'What you\'ll win when you hit',
    emoji: '💰',
    formula: 'Extra needed = (1 − equity) × call ÷ equity − (pot + bet)',
    how: [
      'When the price is too high, ask how much more you\'d have to win later to make it a call.',
      'Total you need to win = call × (1 − equity) ÷ equity. Take off what\'s already in the pot.',
      'Then be honest: will they pay that much when your draw comes in?',
    ],
    example: 'Turn: flush draw (19.6%), pot 100, bet 100. You need to win about 411 in total, so about 211 more on the river.',
    tip: 'Obvious draws (a third heart) get paid less. Hidden ones (a gutshot, a set) get paid more. Deep stacks help too.',
  },
  {
    id: 'mdf',
    title: 'Minimum defence (MDF)',
    hint: 'How much you can fold',
    emoji: '🛡️',
    formula: 'MDF = pot ÷ (pot + bet)',
    how: [
      'MDF is how much of your range you keep (call or raise) so their bluffs don\'t profit with any two cards.',
      'The bigger the bet, the more you\'re allowed to fold.',
      'It\'s most exact on the river, where there are no cards to come.',
    ],
    example: 'They bet 50 into 100: keep 100 ÷ 150 = 67% of your hands. Fold the weakest third.',
    tip: 'A guide, not a law. Against someone who never bluffs, fold more. Out of position, you\'ll fold a bit more too.',
  },
  {
    id: 'bluff',
    title: 'Bluffing maths',
    hint: 'How often a bluff must work',
    emoji: '🎭',
    formula: 'Break-even folds = bet ÷ (bet + pot)',
    how: [
      'You risk your bet to win the pot. Divide the risk by risk plus reward.',
      'If they fold more often than that, the bluff makes money even when it never wins at showdown.',
      'It\'s MDF turned round: the two always add up to 100%.',
      'Against two players who decide on their own, each must fold the square root of it.',
    ],
    example: 'Bluff 75 into 100: you need 75 ÷ 175 = 43% folds.',
    tip: 'Half pot needs 33% folds, pot needs 50%, double pot 67%. Bluff less into more players.',
  },
  {
    id: 'ratio',
    title: 'Value-to-bluff ratio',
    hint: 'How many bluffs your river bets carry',
    emoji: '🧮',
    formula: 'Bluff share = bet ÷ (pot + 2 × bet).  Value : bluffs = (pot + bet) : bet',
    how: [
      'On the river, a bluff-catcher can\'t do better by calling or folding when your bluffs match the equity it needs.',
      'So the share of bluffs in your betting range equals the pot odds you give them.',
      'Bigger bets can carry more bluffs: pot-size is 2 value hands for every bluff, half pot is 3 for 1.',
    ],
    example: 'Bet 100 into 100: bluffs can be 100 ÷ 300 = 33% of your bets (2 value hands for each bluff).',
    tip: 'Most players don\'t bluff enough on the river. Against them, fold your bluff-catchers more.',
  },
  {
    id: 'combos',
    title: 'Counting combos',
    hint: 'How many hands they can have',
    emoji: '🃏',
    formula: 'Pairs: 6.  Unpaired: 16 (4 suited, 12 offsuit).  Then take off what you can see.',
    how: [
      'For a pair, combos = cards left × (cards left − 1) ÷ 2. With 3 left that\'s 3, with 2 left it\'s 1.',
      'For an unpaired hand, combos = cards left of one rank × cards left of the other.',
      'Every card in your hand or on the board takes combos away: that\'s card removal (blockers).',
      'Count their value hands and their bluffs, then check the bluff share against your pot odds.',
    ],
    example: 'On [Kh][7c][2d] holding [As][Kd]: ace-king is 3 aces × 2 kings = 6 combos, not 16.',
    tip: 'Sets are rare: a card on the board leaves only 3 combos of that set, and if you hold one too, just 1.',
  },
  {
    id: 'spr',
    title: 'Stack-to-pot ratio',
    hint: 'How committed you are',
    emoji: '📏',
    formula: 'SPR = smaller stack ÷ pot on the flop',
    how: [
      'Use the effective stack: the smaller of the two stacks in the hand.',
      'Low SPR (under about 3): top pair and overpairs are usually happy to get all-in.',
      'Middle (3 to 6): it depends on the board and position.',
      'High (over 6): you want two pair or better to play for stacks. Draws and small pairs (set mining) gain value.',
    ],
    example: 'Pot 150 on the flop, 300 behind: SPR 2. Top pair should usually be ready to go all-in.',
    tip: 'Plan the hand around SPR before the flop: three-bet pots have low SPRs, so big pairs play themselves.',
  },
  {
    id: 'ev',
    title: 'Expected value (EV)',
    hint: 'What a play wins on average',
    emoji: '🧠',
    formula: 'EV = (chance you win × what you win) − (chance you lose × what you lose)',
    how: [
      'Call: equity × (pot + their bet) − (1 − equity) × your call.',
      'Pure bluff: fold % × pot − call % × your bet.',
      'Semi-bluff: fold % × pot + call % × (equity × final pot − your bet).',
      'Positive EV makes money over many hands, even when this one loses.',
    ],
    example: 'Bluff 75 into 100 and they fold half the time: 0.5 × 100 − 0.5 × 75 = +12.5.',
    tip: 'A semi-bluff wins two ways: they fold now, or they call and you hit. That\'s why draws make the best bluffs.',
  },
  {
    id: 'preflop',
    title: 'Preflop odds',
    hint: 'Starting hands and matchups',
    emoji: '🎲',
    formula: '1,326 starting hands: 78 pairs, 312 suited, 936 offsuit',
    how: [
      'You\'re dealt a pair 1 time in 17, aces 1 in 221, ace-king 1 in 83.',
      'With a pair you flop a set about 1 time in 8.5 (11.8%).',
      'Pair against two overcards: about 55-45. Bigger pair against smaller: about 80-20. Dominated hand: about 25-30%.',
      'Suited cards make a flush by the river only about 6% of the time.',
    ],
    example: 'QQ against AK all-in: queens win about 57% of the time.',
    tip: 'Set mining needs deep stacks: call a raise with a small pair when you can win about 15 to 20 times the call.',
  },
];

export const lessonFor = (id: TopicId) => LESSONS.find((l) => l.id === id)!;

/** Where the ideas come from, shown at the bottom of the trainer. */
export const SOURCES =
  'Built from poker maths taught by Jonathan Little (PokerCoaching, CardPlayer), PokerNews strategy (implied odds, set mining, combo counting), Pokerology and VIP-Grinders (SPR), PokerStrategy.com (fold equity), The Poker Bank, CardPlayer\'s J.C. Tran on discounted outs, and the books The Mathematics of Poker (Chen and Ankenman) and Poker Math That Matters (Owen Gaines). Every number here is worked out exactly by the app.';

// Progress: right and asked, per topic, kept on this phone.

const KEY = 'flipup.odds';

export type OddsProgress = Partial<Record<TopicId, { right: number; asked: number }>>;

export function loadOdds(): OddsProgress {
  const p = read<OddsProgress>(KEY);
  return p && typeof p === 'object' ? p : {};
}

export function recordOdds(topic: TopicId, right: boolean): OddsProgress {
  const p = loadOdds();
  const t = p[topic] ?? { right: 0, asked: 0 };
  p[topic] = { right: t.right + (right ? 1 : 0), asked: t.asked + 1 };
  write(KEY, p);
  return p;
}

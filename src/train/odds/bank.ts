// The odds and outs question bank. Each question is a small spec (cards, pot, bet...) and the answer, the wrong
// choices and the worked explanation are all computed from it, so nothing can drift out of date. Cards in text
// are written like [Ah] and drawn as small cards on screen.

import { hashString, seededRng, type Card } from '../../game/cards';
import {
  alpha,
  bluffEV,
  bluffShare,
  callEV,
  choose,
  combosOf,
  countCombos,
  countOuts,
  exactEquity,
  hitChance,
  impliedNeed,
  mdf,
  potOddsNeed,
  ruleOf,
  semiBluffEV,
  type HandClass,
} from './math';

export type TopicId = 'outs' | 'equity' | 'potodds' | 'call' | 'implied' | 'mdf' | 'bluff' | 'ratio' | 'combos' | 'spr' | 'ev' | 'preflop';

export interface Question {
  id: string;
  topic: TopicId;
  /** The question, plain text with [Ah]-style cards. */
  prompt: string;
  hero?: Card[];
  board?: Card[];
  /** The hand you've put them on, when the question gives you one. */
  villain?: Card[];
  /** Small labelled numbers under the cards: pot, bet, stack. */
  facts?: [string, string][];
  choices: string[];
  answer: number;
  /** The worked answer, one line per step. */
  steps: string[];
}

const S = (s: string): Card[] => s.match(/../g) ?? [];
const pc = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`;
const cards = (cs: Card[]) => cs.map((c) => `[${c}]`).join(' ');
const n0 = (x: number) => Math.round(x).toString();
const signed1 = (x: number) => (x < 0 ? `−${Math.abs(x).toFixed(1)}` : x.toFixed(1));
const signed = (x: number) => (Math.round(x) > 0 ? `+${Math.round(x)}` : Math.round(x) === 0 ? '0' : `−${Math.abs(Math.round(x))}`);

/**
 * Four choices: the answer, the traps (common mistakes) first, then near misses. Choices too close to the answer
 * or to each other are skipped, so there's only ever one right one. The order is fixed per question.
 */
function pick(id: string, value: number, fmt: (x: number) => string, traps: number[], spread: number[], gap: number, lo = 0, hi = Infinity) {
  const rng = seededRng(hashString(id));
  const chosen = [value];
  const labels = new Set([fmt(value)]);
  const ok = (x: number) => Number.isFinite(x) && x >= lo && x <= hi && !labels.has(fmt(x)) && chosen.every((c) => Math.abs(c - x) >= gap);
  for (const t of traps) if (chosen.length < 4 && ok(t)) (chosen.push(t), labels.add(fmt(t)));
  const near = spread.map((d) => value + d).sort(() => rng() - 0.5);
  for (const t of near) if (chosen.length < 4 && ok(t)) (chosen.push(t), labels.add(fmt(t)));
  for (let k = 2; chosen.length < 4 && k < 50; k++) {
    const t = value + (k % 2 ? -1 : 1) * Math.ceil(k / 2) * gap * 2;
    if (ok(t)) (chosen.push(t), labels.add(fmt(t)));
  }
  const order = chosen.map((v, i) => ({ v, i, r: rng() })).sort((a, b) => a.r - b.r);
  return { choices: order.map((o) => fmt(o.v)), answer: order.findIndex((o) => o.i === 0) };
}

const PCT_SPREAD = [-0.15, -0.1, -0.07, -0.05, 0.05, 0.07, 0.1, 0.15];

// ---------------------------------------------------------------------------------------------------------
// Outs against a hand you've put them on

interface CardSpot {
  hero: string;
  villain: string;
  board: string;
  /** A teaching line for the explanation (checked against the count by the unit test). */
  note?: string;
  /** The count people often get to (all the draw's cards, say), offered as a wrong choice. */
  trap?: number;
}

const TURN_SPOTS: CardSpot[] = [
  { hero: 'AhKh', villain: 'QsJd', board: 'Qh7h2c4s', note: 'Nine hearts make your flush, and the three other aces and three other kings give you a pair that beats their queens.', trap: 9 },
  { hero: 'JcTc', villain: 'Ks9s', board: '9d8s2hKc', note: 'An open-ended straight draw: any queen or seven.' },
  { hero: '6s5s', villain: 'AcKd', board: '8h7d2cAh', note: 'Four nines and four fours make your straight.' },
  { hero: '9h8h', villain: 'KsQd', board: 'Kh6c2hTd', note: 'Nine hearts, plus the three sevens that aren\'t hearts for a straight (6-7-8-9-10).', trap: 9 },
  { hero: 'Ah5h', villain: 'KsKd', board: 'Kh9h9c3d', note: 'They already have kings full. A flush doesn\'t beat a full house, so you\'re drawing dead.', trap: 9 },
  { hero: 'QdQc', villain: 'KdJh', board: 'Ks8d4c2h', note: 'Only the last two queens help: a set beats their pair of kings.' },
  { hero: 'AsKs', villain: 'JcTd', board: 'Js8d3h2c', note: 'Three aces and three kings: any pair bigger than their jacks wins.' },
  { hero: 'AcQh', villain: 'Kc9d', board: 'KdJc4s2h', note: 'Four tens make your straight and three aces give you a bigger pair. A queen gives you queens, still behind their kings.', trap: 10 },
  { hero: 'Th9h', villain: 'KcKd', board: '8h7c2hKs', note: 'They have a set. Nine hearts and six jacks or sixes look like 15 outs, but the [7h] and [Kh] pair the board and give them a full house, so 13 are clean.', trap: 15 },
  { hero: 'AdKd', villain: '7h8h', board: 'Ac7s7d3h', note: 'They have trips. A king gives you two pair, which still loses. Only an ace (aces full) gets you there.', trap: 5 },
  { hero: '7c6c', villain: 'AhAs', board: '8c5d2cKh', note: 'Nine clubs plus the six fours and nines that aren\'t clubs: a 15-out monster draw.' },
  { hero: 'AcJc', villain: 'KdKs', board: 'Tc9c3h2d', note: 'Nine clubs, and three aces for a pair above their kings.' },
  { hero: 'KhQh', villain: 'AsKs', board: 'Kc8h4h2d', note: 'Nine hearts plus three queens for kings and queens, which beats their pair of kings with an ace kicker.' },
  { hero: '8d8c', villain: 'AhJd', board: 'JsTd5c3h', note: 'Two eights left for a set.' },
  { hero: 'QsJs', villain: 'AdAc', board: 'Ts9d4h2c', note: 'Any king or eight makes your straight.' },
  { hero: 'Ad4d', villain: 'QcQh', board: 'Qd8d3s2c', note: 'They have a set. Of the nine diamonds, the [2d] and [3d] pair the board for their full house, so seven are clean. Three more fives make you a wheel (A-2-3-4-5).', trap: 9 },
  { hero: '5h4h', villain: 'AsTd', board: '6h3c9dJs', note: 'They only have ace high. Eight cards make your straight, and six fours or fives give you a winning pair.', trap: 8 },
  { hero: 'KcJc', villain: 'AdQd', board: 'QcTh5c2s', note: 'Nine clubs, the aces and nines for a straight, and three kings for a bigger pair than theirs.', trap: 15 },
  { hero: 'AsQs', villain: 'AhJh', board: 'Jc7d3s9s', note: 'Nine spades and three queens. An ace doesn\'t help: they\'d have aces and jacks.', trap: 15 },
  { hero: 'TdTc', villain: '9h9s', board: '9c6d2sAh', note: 'They flopped a set. Only the last two tens save you.' },
];

const FLOP_SPOTS: CardSpot[] = [
  { hero: 'AhQh', villain: 'KsKc', board: 'Jh7h2c', note: 'Nine hearts and three aces.' },
  { hero: '9s8s', villain: 'AdKd', board: 'Ts7c2h', note: 'They only have ace high: eight cards make your straight, and six nines or eights give you a pair that\'s ahead.' },
  { hero: 'AcKd', villain: 'QsQh', board: 'Js7d2c', note: 'Two overcards: three aces and three kings.' },
  { hero: 'JhTh', villain: 'AsAc', board: 'Qh9h3d', note: 'Flush draw plus open-ended straight draw: 9 hearts and 6 more kings and eights.' },
  { hero: '6d6c', villain: 'AhKs', board: 'Kd8s3c', note: 'Two sixes left for a set.' },
  { hero: 'KdQd', villain: 'AhAs', board: 'JdTs4d', note: 'Nine diamonds, three non-diamond nines and the one ace that isn\'t in their hand or a diamond.' },
  { hero: '7s6s', villain: 'JcJd', board: '5s4h2s', note: 'Nine spades plus the threes and eights that aren\'t spades.' },
  { hero: 'AsJs', villain: 'KcKh', board: 'Ks8s4d', note: 'They have a set. The [4s] pairs the board and gives them a full house, so eight spades put you ahead.', trap: 9 },
  { hero: 'Th9d', villain: 'AcJh', board: 'Jc8s2h', note: 'Open-ended: any queen or seven.' },
  { hero: '5c4c', villain: 'QhQd', board: '6c3s9c', note: 'Nine clubs plus the sevens and twos that aren\'t clubs.' },
  { hero: 'AdTd', villain: '8h8s', board: '8d7d2c', note: 'They have a set. The [2d] pairs the board for their full house, so eight diamonds are clean.', trap: 9 },
  { hero: 'QcJc', villain: 'AsKh', board: 'Kc9c4d', note: 'Nine clubs plus three tens that aren\'t clubs (a gutshot).' },
  { hero: '8h7h', villain: 'AdAc', board: '6h5s2d', note: 'Open-ended: any nine or four.' },
  { hero: 'AhKh', villain: '9c9d', board: '9h6h2s', note: 'Against a set, the [6h] and [2h] give them a full house, so only eight hearts help. Your overcards are no good.', trap: 15 },
  { hero: 'KsQs', villain: 'AcJd', board: 'Jh9s3s', note: 'Nine spades, three more tens for a straight, and six kings or queens for a pair above their jacks.' },
];

function outsQuestion(spot: CardSpot, i: number, street: 'turn' | 'flop'): Question {
  const [hero, villain, board] = [S(spot.hero), S(spot.villain), S(spot.board)];
  const { outs, splits } = countOuts(hero, villain, board);
  const id = `outs-${street}-${i}`;
  const n = outs.length;
  const left = 52 - 4 - board.length;
  const { choices, answer } = pick(id, n, n0, spot.trap != null ? [spot.trap] : [], [-4, -3, -2, -1, 1, 2, 3, 4], 1, 0);
  const steps = [
    n === 0 ? 'No card puts you ahead.' : `${n} cards put you ahead: ${cards(outs)}.`,
    ...(spot.note ? [spot.note] : []),
    ...(splits.length ? [`${cards(splits)} would split the pot.`] : []),
    street === 'turn'
      ? `With their two cards known, ${left} are left, so your chance on the river is ${n}/${left} = ${pc(n / left, 1)}.`
      : `That's for the turn alone. With both cards to come your exact equity is ${pc(exactEquity(hero, villain, board), 1)}.`,
  ];
  return {
    id,
    topic: 'outs',
    prompt:
      street === 'turn'
        ? 'On the turn you put them on this hand. How many outs do you have for the river?'
        : 'On the flop you put them on this hand. How many turn cards put you ahead?',
    hero,
    villain,
    board,
    choices,
    answer,
    steps,
  };
}

// ---------------------------------------------------------------------------------------------------------
// Equity from outs

const DRAWS: [string, number][] = [
  ['a gutshot straight draw', 4],
  ['two overcards', 6],
  ['an open-ended straight draw', 8],
  ['a flush draw', 9],
  ['a flush draw and a gutshot', 12],
  ['a flush draw and an open-ended straight draw', 15],
  ['a pocket pair hoping to hit a set', 2],
];

function equityQuestion(name: string, outs: number, cardsLeft: 1 | 2, i: number): Question {
  const id = `eq-${cardsLeft}-${i}`;
  const left = cardsLeft === 2 ? 47 : 46;
  const exact = hitChance(outs, left, cardsLeft);
  const rule = ruleOf(outs, cardsLeft);
  const wrongRule = ruleOf(outs, cardsLeft === 2 ? 1 : 2);
  const { choices, answer } = pick(id, exact, (x) => pc(x), [wrongRule], PCT_SPREAD, 0.03, 0.01, 0.99);
  const steps = [
    `You have ${outs} outs with ${cardsLeft === 2 ? 'two cards (turn and river)' : 'one card'} to come.`,
    `Quick way, the rule of 2 and 4: ${outs} × ${cardsLeft === 2 ? 4 : 2} ≈ ${pc(rule)}.`,
    cardsLeft === 2
      ? `Exactly: 1 − (${left - outs}/${left} × ${left - 1 - outs}/${left - 1}) = ${pc(exact, 1)}. That's the chance you miss twice, taken away from 100%.`
      : `Exactly: ${outs}/${left} = ${pc(exact, 1)} (${left} cards you haven't seen).`,
    ...(cardsLeft === 2 && outs >= 10 ? [`With lots of outs the rule of 4 runs high. Take off 1% for every out above 8 to get closer (${pc(rule - (outs - 8) / 100)}).`] : []),
  ];
  return {
    id,
    topic: 'equity',
    prompt: `You have ${name} (${outs} outs) on the ${cardsLeft === 2 ? 'flop and you\'re all-in, so you\'ll see the turn and river' : 'turn, with just the river to come'}. How often do you hit?`,
    choices,
    answer,
    steps,
  };
}

const ALLIN_FLOPS = [0, 2, 3, 5, 7, 9, 13, 14];

function allinEquityQuestion(spot: CardSpot, i: number): Question {
  const [hero, villain, board] = [S(spot.hero), S(spot.villain), S(spot.board)];
  const id = `eq-allin-${i}`;
  const { outs } = countOuts(hero, villain, board);
  const exact = exactEquity(hero, villain, board);
  const rule = ruleOf(outs.length, 2);
  const { choices, answer } = pick(id, exact, (x) => pc(x), [rule], PCT_SPREAD, 0.03, 0.01, 0.99);
  return {
    id,
    topic: 'equity',
    prompt: 'You\'re all-in on the flop against this hand. What\'s your equity (your share of the pot by the river)?',
    hero,
    villain,
    board,
    choices,
    answer,
    steps: [
      `You have ${outs.length} outs on the turn. The rule of 4 says about ${pc(rule)}.`,
      `Counting every turn and river card, your exact equity is ${pc(exact, 1)}.`,
      Math.abs(rule - exact) >= 0.03
        ? rule > exact
          ? 'The rule runs high here: some of your outs can still lose on the river (the board pairs, or they hit too), and big draws overcount.'
          : 'You beat the rule here: two-card runners (backdoor draws) and extra pairs add equity the out count misses.'
        : 'The rule of 4 is close here.',
    ],
  };
}

// ---------------------------------------------------------------------------------------------------------
// Pot odds

const POT_ODDS: [number, number][] = [
  [100, 50], [100, 100], [100, 33], [100, 75], [60, 40], [200, 150], [80, 20], [100, 200], [90, 60], [150, 50],
];

function potOddsQuestion(pot: number, bet: number, i: number): Question {
  const id = `po-${i}`;
  const need = potOddsNeed(pot, bet);
  const { choices, answer } = pick(id, need, (x) => pc(x), [alpha(pot, bet), bet / pot], PCT_SPREAD, 0.03, 0.01, 0.99);
  return {
    id,
    topic: 'potodds',
    prompt: `The pot is ${pot} and they bet ${bet}. How much equity do you need to call?`,
    facts: [['Pot', String(pot)], ['Bet', String(bet)]],
    choices,
    answer,
    steps: [
      'Equity needed = your call ÷ (the pot after you call).',
      `After you call the pot is ${pot} + ${bet} + ${bet} = ${pot + 2 * bet}.`,
      `${bet} ÷ ${pot + 2 * bet} = ${pc(need, 1)}. Win more often than that and calling makes money.`,
      `A common slip is ${bet} ÷ ${pot + bet} (${pc(alpha(pot, bet))}): that forgets your own call goes in the pot too.`,
    ],
  };
}

const ratio = (x: number) => `${Number.isInteger(Math.round(x * 10) / 10) ? Math.round(x) : (Math.round(x * 10) / 10).toFixed(1)} to 1`;

function ratioQuestion(pot: number, bet: number, i: number): Question {
  const id = `po-ratio-${i}`;
  const r = (pot + bet) / bet;
  const { choices, answer } = pick(id, r, ratio, [pot / bet, (pot + 2 * bet) / bet], [-1.5, -1, -0.5, 0.5, 1, 1.5, 2], 0.4, 1);
  return {
    id,
    topic: 'potodds',
    prompt: `The pot is ${pot} and they bet ${bet}. What pot odds are you getting?`,
    facts: [['Pot', String(pot)], ['Bet', String(bet)]],
    choices,
    answer,
    steps: [
      'Pot odds = what you can win : what it costs.',
      `You can win the pot plus their bet: ${pot + bet}. It costs ${bet}.`,
      `${pot + bet} : ${bet} = ${ratio(r)}.`,
      `To turn odds into equity, add both sides: 1 ÷ (${Number(r.toFixed(2))} + 1) = ${pc(1 / (r + 1), 1)}.`,
    ],
  };
}

// ---------------------------------------------------------------------------------------------------------
// Call or fold with a draw

interface CallSpot {
  draw: string;
  outs: number;
  street: 'flop' | 'turn' | 'flop all-in';
  pot: number;
  bet: number;
}

const CALLS: CallSpot[] = [
  { draw: 'a flush draw', outs: 9, street: 'turn', pot: 100, bet: 100 },
  { draw: 'a flush draw', outs: 9, street: 'turn', pot: 100, bet: 25 },
  { draw: 'an open-ended straight draw', outs: 8, street: 'turn', pot: 100, bet: 75 },
  { draw: 'a gutshot', outs: 4, street: 'turn', pot: 100, bet: 20 },
  { draw: 'a gutshot', outs: 4, street: 'turn', pot: 150, bet: 10 },
  { draw: 'a flush draw and an open-ended straight draw', outs: 15, street: 'turn', pot: 100, bet: 50 },
  { draw: 'a flush draw', outs: 9, street: 'flop all-in', pot: 100, bet: 80 },
  { draw: 'an open-ended straight draw', outs: 8, street: 'flop all-in', pot: 100, bet: 200 },
  { draw: 'a flush draw and a gutshot', outs: 12, street: 'flop all-in', pot: 100, bet: 150 },
  { draw: 'a flush draw', outs: 9, street: 'flop', pot: 100, bet: 66 },
  { draw: 'two overcards', outs: 6, street: 'turn', pot: 60, bet: 45 },
  { draw: 'a flush draw', outs: 9, street: 'turn', pot: 120, bet: 60 },
];

function callQuestion(c: CallSpot, i: number): Question {
  const id = `call-${i}`;
  const two = c.street === 'flop all-in';
  const left = c.street === 'turn' ? 46 : 47;
  const eq = hitChance(c.outs, left, two ? 2 : 1);
  const need = potOddsNeed(c.pot, c.bet);
  const call = eq > need;
  return {
    id,
    topic: 'call',
    prompt: `${c.street === 'turn' ? 'On the turn' : c.street === 'flop' ? 'On the flop (more betting can come on the turn)' : 'On the flop, facing an all-in'} you have ${c.draw} (${c.outs} outs). The pot is ${c.pot} and they bet ${c.bet}. Ignoring what you might win later, call or fold?`,
    facts: [['Pot', String(c.pot)], ['Bet', String(c.bet)], ['Outs', String(c.outs)]],
    choices: ['Call', 'Fold'],
    answer: call ? 0 : 1,
    steps: [
      `You need ${c.bet} ÷ (${c.pot} + ${c.bet} + ${c.bet}) = ${pc(need, 1)} equity.`,
      two
        ? `All-in, you see both cards: ${c.outs} outs is ${pc(eq, 1)} (rule of 4: ${pc(ruleOf(c.outs, 2))}).`
        : `You're only paying to see one card, so use one-card odds: ${c.outs}/${left} = ${pc(eq, 1)} (rule of 2: ${pc(ruleOf(c.outs, 1))}).`,
      call ? `${pc(eq, 1)} is more than ${pc(need, 1)}, so it's a call.` : `${pc(eq, 1)} is less than ${pc(need, 1)}, so it's a fold unless you'll win enough later (implied odds).`,
      ...(c.street === 'flop' ? ['Don\'t use the rule of 4 when they can bet again on the turn: that counts a card you haven\'t paid for yet.'] : []),
    ],
  };
}

// ---------------------------------------------------------------------------------------------------------
// Implied odds

const IMPLIED: [string, number, number, number][] = [
  ['a flush draw', 9, 100, 100],
  ['an open-ended straight draw', 8, 100, 75],
  ['a gutshot', 4, 100, 50],
  ['a flush draw', 9, 60, 60],
  ['a gutshot', 4, 50, 25],
  ['an open-ended straight draw', 8, 150, 150],
];

function impliedQuestion([draw, outs, pot, bet]: (typeof IMPLIED)[number], i: number): Question {
  const id = `imp-${i}`;
  const eq = outs / 46;
  const x = impliedNeed(pot, bet, eq);
  const { choices, answer } = pick(id, x, n0, [(1 - eq) * bet / eq, x - bet, x + pot], [-60, -40, -25, 25, 40, 60, 90], Math.max(8, x * 0.15), 0);
  return {
    id,
    topic: 'implied',
    prompt: `On the turn you have ${draw} (${outs} outs). The pot is ${pot} and they bet ${bet}. How much more do you need to win on the river when you hit, for the call to break even?`,
    facts: [['Pot', String(pot)], ['Bet', String(bet)], ['Outs', String(outs)]],
    choices,
    answer,
    steps: [
      `Your equity: ${outs}/46 = ${pc(eq, 1)}. Calling needs ${pc(potOddsNeed(pot, bet), 1)}, so the price alone isn't enough.`,
      'Break even when: equity × (what you win) = (1 − equity) × your call.',
      `What you need to win in total: ${pc(1 - eq, 1)} × ${bet} ÷ ${pc(eq, 1)} = ${n0(((1 - eq) * bet) / eq)}.`,
      `The pot and their bet already give you ${pot + bet}, so you need about ${n0(x)} more from them on the river.`,
      'Ask yourself: will they really pay that much when the draw comes in? If not, fold.',
    ],
  };
}

// ---------------------------------------------------------------------------------------------------------
// MDF, bluffs and river ratios

const SIZES: [number, number][] = [[100, 33], [100, 50], [100, 75], [100, 100], [100, 150], [100, 200]];

function mdfQuestion([pot, bet]: [number, number], i: number): Question {
  const id = `mdf-${i}`;
  const v = mdf(pot, bet);
  const { choices, answer } = pick(id, v, (x) => pc(x), [alpha(pot, bet), 1 - potOddsNeed(pot, bet)], PCT_SPREAD, 0.04, 0.05, 0.95);
  return {
    id,
    topic: 'mdf',
    prompt: `They bet ${bet} into a pot of ${pot}. What's your minimum defence frequency (MDF): how much of your range must you keep (call or raise) so their bluffs don't print money?`,
    facts: [['Pot', String(pot)], ['Bet', String(bet)]],
    choices,
    answer,
    steps: [
      'MDF = pot ÷ (pot + bet).',
      `${pot} ÷ (${pot} + ${bet}) = ${pc(v, 1)}.`,
      `Fold more than ${pc(1 - v, 1)} of your hands and they can bet any two cards for profit.`,
      'MDF is a guide, not a law: out of position or against someone who never bluffs, folding a bit more is fine.',
    ],
  };
}

function bluffQuestion([pot, bet]: [number, number], i: number): Question {
  const id = `alpha-${i}`;
  const v = alpha(pot, bet);
  const { choices, answer } = pick(id, v, (x) => pc(x), [mdf(pot, bet), potOddsNeed(pot, bet)], PCT_SPREAD, 0.04, 0.05, 0.95);
  return {
    id,
    topic: 'bluff',
    prompt: `You bluff ${bet} into a pot of ${pot} with a hand that can't win. How often must they fold for the bluff to break even?`,
    facts: [['Pot', String(pot)], ['Your bet', String(bet)]],
    choices,
    answer,
    steps: [
      'Break-even fold rate = what you risk ÷ (what you risk + what you can win).',
      `${bet} ÷ (${bet} + ${pot}) = ${pc(v, 1)}.`,
      `If they fold more than ${pc(v, 1)} of the time, the bluff makes money on its own.`,
      `It's MDF turned round: MDF here is ${pc(mdf(pot, bet), 1)}, and the two add up to 100%.`,
    ],
  };
}

function ratioRiverQuestion([pot, bet]: [number, number], i: number): Question {
  const id = `ratio-${i}`;
  const v = bluffShare(pot, bet);
  const { choices, answer } = pick(id, v, (x) => pc(x), [alpha(pot, bet), 0.5], PCT_SPREAD, 0.04, 0.05, 0.95);
  return {
    id,
    topic: 'ratio',
    prompt: `On the river you bet ${bet} into ${pot}, with some value hands and some bluffs. What share of your betting range can be bluffs so their bluff-catchers can't do better by calling or folding?`,
    facts: [['Pot', String(pot)], ['Your bet', String(bet)]],
    choices,
    answer,
    steps: [
      'They\'re indifferent when your bluff share equals the equity they need to call.',
      `That's bet ÷ (pot + 2 × bet) = ${bet} ÷ ${pot + 2 * bet} = ${pc(v, 1)}.`,
      `As a ratio that's ${((pot + bet) / bet).toFixed(1).replace(/\.0$/, '')} value hands for every bluff (value : bluffs = (pot + bet) : bet).`,
      'Bigger bets can carry more bluffs, and they need to: the caller gets a worse price.',
    ],
  };
}

function multiwayBluffQuestion(players: number, pot: number, bet: number, i: number): Question {
  const id = `alpha-mw-${i}`;
  const whole = alpha(pot, bet);
  const each = whole ** (1 / players);
  const { choices, answer } = pick(id, each, (x) => pc(x), [whole, whole / players, 1 - (1 - whole) / players], PCT_SPREAD, 0.04, 0.05, 0.99);
  return {
    id,
    topic: 'bluff',
    prompt: `You bluff ${bet} into ${pot} against ${players} opponents. If each decides on their own, how often must each one fold for the bluff to break even?`,
    facts: [['Pot', String(pot)], ['Your bet', String(bet)], ['Opponents', String(players)]],
    choices,
    answer,
    steps: [
      `Everyone has to fold for the bluff to work, and you need that ${pc(whole, 1)} of the time (${bet} ÷ ${bet + pot}).`,
      `The chances multiply, so each player must fold the ${players === 2 ? 'square' : 'cube'} root of that: ${pc(each, 1)}.`,
      'That\'s why bluffing into more players needs far more folds. Bluff less in multiway pots.',
    ],
  };
}

// ---------------------------------------------------------------------------------------------------------
// Combos

interface ComboSpot {
  prompt: string;
  classes: HandClass[];
  dead?: string;
  board?: string;
  hero?: string;
  explain: string;
}

const cl = (s: string): HandClass[] => s.split(' ').map((c) => (c.includes(':') ? { cls: c.split(':')[0], suit: c.split(':')[1] } : { cls: c }));

const COMBOS: ComboSpot[] = [
  { prompt: 'Before the flop, how many ways can someone be dealt ace-king?', classes: cl('AK'), explain: 'Four aces × four kings = 16: 4 suited and 12 offsuit.' },
  { prompt: 'Before the flop, how many ways can someone be dealt a pair of queens?', classes: cl('QQ'), explain: 'Pick 2 of the 4 queens: 4 × 3 ÷ 2 = 6.' },
  { prompt: 'Before the flop, how many ways can someone be dealt ace-king offsuit?', classes: cl('AKo'), explain: '16 ace-kings minus the 4 suited ones = 12.' },
  { prompt: 'Before the flop, how many ways can someone be dealt any pocket pair?', classes: cl('AA KK QQ JJ TT 99 88 77 66 55 44 33 22'), explain: '13 ranks × 6 combos each = 78, about 1 hand in 17.' },
  { prompt: 'The flop is shown and you hold the cards below. How many ways can they have ace-king?', classes: cl('AK'), hero: 'AsKd', board: 'Kh7c2d', explain: 'You hold an ace, and a king is in your hand and on the board: 3 aces × 2 kings = 6.' },
  { prompt: 'How many ways can they have a set (KK, 77 or 22) on this flop?', classes: cl('KK 77 22'), hero: 'AsKd', board: 'Kh7c2d', explain: 'Two kings are gone (yours and the board\'s), so 1 combo of KK. Three sevens and three twos are left: 3 combos each. 1 + 3 + 3 = 7.' },
  { prompt: 'How many ways can they have pocket aces here?', classes: cl('AA'), hero: 'AhQh', board: 'Ac9s4d', explain: 'Two aces are gone, so only one pair of aces is left: 1 combo.' },
  { prompt: 'How many ways can they have exactly ace-queen here?', classes: cl('AQ'), hero: 'QdJd', board: 'AsQc7h', explain: 'Three aces left × two queens left = 6.' },
  { prompt: 'How many flush draws with suited king-queen, queen-jack or jack-ten in hearts can they have?', classes: cl('KQs:h QJs:h JTs:h'), hero: 'AhAd', board: '9h5h2c', explain: 'Each suited hand has one heart combo, and none of those cards are gone: 3 combos.' },
  { prompt: 'How many two-pair combos (9-8, 9-4 or 8-4) can they have on this flop?', classes: cl('98 94 84'), hero: 'AsAc', board: '9h8d4c', explain: 'One of each rank is on the board, leaving 3 × 3 = 9 combos for each: 27.' },
  { prompt: 'Your hand blocks some of theirs. How many combos of pocket jacks and jack-ten can they have?', classes: cl('JJ JT'), hero: 'JhTh', board: 'Js8c3d', explain: 'Two jacks are left, so 1 combo of JJ. Jack-ten: 2 jacks × 3 tens = 6. That\'s 7.' },
  { prompt: 'How many combos of ace-king and ace-queen can they have?', classes: cl('AK AQ'), hero: 'AcQs', board: 'Qd8h3c', explain: 'Three aces are left. Ace-king: 3 × 4 = 12. Ace-queen: 3 × 2 = 6. Total 18.' },
];

function comboQuestion(c: ComboSpot, i: number): Question {
  const id = `combo-${i}`;
  const dead = [...S(c.hero ?? ''), ...S(c.board ?? ''), ...S(c.dead ?? '')];
  const n = countCombos(c.classes, dead);
  const base = countCombos(c.classes, []);
  const { choices, answer } = pick(id, n, n0, [base, n * 2], [-4, -3, -2, -1, 1, 2, 3, 4, 6], 1, 0);
  return {
    id,
    topic: 'combos',
    prompt: c.prompt,
    hero: c.hero ? S(c.hero) : undefined,
    board: c.board ? S(c.board) : undefined,
    choices,
    answer,
    steps: [c.explain, ...(n !== base ? [`Without the cards you can see it would be ${base}: that's card removal.`] : []), 'Pairs have 6 combos, unpaired hands 16 (4 suited, 12 offsuit), and every card you see takes some away.'],
  };
}

interface RiverRange {
  hero: string;
  board: string;
  pot: number;
  bet: number;
  value: string;
  bluffs: string;
  story: string;
}

const RIVERS: RiverRange[] = [
  {
    hero: 'KcJd',
    board: 'Kh9h4s2c3d',
    pot: 100,
    bet: 75,
    value: 'AK KQ K9s 99 44',
    bluffs: 'AQs:h AJs:h QJs:h JTs:h T8s:h 87s:h',
    story: 'They bet the river after the heart draw missed. You think they have a strong king or a set, or a missed heart draw.',
  },
  {
    hero: 'AsTc',
    board: 'Td8c5s2hKd',
    pot: 80,
    bet: 80,
    value: 'KT K8 88 55 T8s',
    bluffs: '97s 76s 64s J9s',
    story: 'The king rolls off and they bet the pot. You think they have two pair or a set, or a missed straight draw.',
  },
  {
    hero: 'QhQs',
    board: 'Jc7c3d2sAh',
    pot: 120,
    bet: 60,
    value: 'AJ A7s 77 33 AQ',
    bluffs: 'KQs:c KTs:c QTs:c T9s:c 98s:c 65s:c',
    story: 'The ace hits and they bet half the pot. You think they have an ace or a set, or a missed club draw.',
  },
];

function riverQuestions(r: RiverRange, i: number): Question[] {
  const [hero, board] = [S(r.hero), S(r.board)];
  const dead = [...hero, ...board];
  const vClasses = cl(r.value);
  const bClasses = cl(r.bluffs);
  const v = countCombos(vClasses, dead);
  const b = countCombos(bClasses, dead);
  const share = b / (v + b);
  const need = potOddsNeed(r.pot, r.bet);
  const detail = (cs: HandClass[]) => cs.map((h) => `${h.cls}${h.suit ? ` (${h.suit === 'h' ? 'hearts' : h.suit === 'c' ? 'clubs' : h.suit === 'd' ? 'diamonds' : 'spades'})` : ''}: ${combosOf(h, dead).length}`).join(', ');
  const facts: [string, string][] = [['Pot', String(r.pot)], ['Bet', String(r.bet)]];
  const valueQ = pick(`river-${i}-v`, v, n0, [countCombos(vClasses, [])], [-6, -4, -3, -2, 2, 3, 4, 6], 1, 0);
  const bluffQ = pick(`river-${i}-b`, b, n0, [countCombos(bClasses, [])], [-4, -3, -2, -1, 1, 2, 3, 4], 1, 0);
  return [
    {
      id: `river-${i}-v`,
      topic: 'combos',
      prompt: `${r.story} Their value hands: ${r.value.replace(/ /g, ', ')}. How many value combos is that, given the cards you can see?`,
      hero,
      board,
      facts,
      ...valueQ,
      steps: [detail(vClasses), `That's ${v} value combos.`, 'Count each hand, then take off what your hand and the board block.'],
    },
    {
      id: `river-${i}-b`,
      topic: 'combos',
      prompt: `${r.story} Their bluffs: ${r.bluffs.replace(/:[hcds]/g, '').replace(/ /g, ', ')}${r.bluffs.includes(':') ? ', only in the draw\'s suit' : ' (suited)'}. How many bluff combos is that?`,
      hero,
      board,
      facts,
      ...bluffQ,
      steps: [detail(bClasses), `That's ${b} bluff combos.`],
    },
    {
      id: `river-${i}-call`,
      topic: 'combos',
      prompt: `${r.story} With ${v} value combos and ${b} bluffs in their range, and your hand beating only bluffs, call or fold?`,
      hero,
      board,
      facts,
      choices: ['Call', 'Fold'],
      answer: share > need ? 0 : 1,
      steps: [
        `Bluffs are ${b} of ${v + b} combos: ${pc(share, 1)}.`,
        `Calling ${r.bet} into ${r.pot} needs ${pc(need, 1)}.`,
        share > need ? 'They bluff often enough: call.' : 'They don\'t bluff often enough: fold.',
      ],
    },
  ];
}

// ---------------------------------------------------------------------------------------------------------
// SPR

const SPRS: [number, number, string][] = [
  [500, 100, 'You\'re on the flop.'],
  [970, 70, 'You opened, one player called, and you\'re on the flop.'],
  [300, 150, 'A three-bet pot on the flop.'],
  [1000, 400, 'A four-bet pot on the flop.'],
  [2000, 150, 'Deep stacks, single-raised pot.'],
  [450, 300, 'A short stack has called your three-bet.'],
];

function sprQuestion([stack, pot, story]: (typeof SPRS)[number], i: number): Question {
  const id = `spr-${i}`;
  const v = stack / pot;
  const fmt = (x: number) => (Math.round(x * 10) / 10).toFixed(1);
  const { choices, answer } = pick(id, v, fmt, [pot / stack, (stack + pot) / pot], [-3, -2, -1, 1, 2, 3, 5], Math.max(0.5, v * 0.2), 0.1);
  return {
    id,
    topic: 'spr',
    prompt: `${story} The pot is ${pot} and the smaller stack has ${stack} behind. What's the stack-to-pot ratio (SPR)?`,
    facts: [['Pot', String(pot)], ['Effective stack', String(stack)]],
    choices,
    answer,
    steps: [
      'SPR = the smaller stack ÷ the pot on the flop.',
      `${stack} ÷ ${pot} = ${fmt(v)}.`,
      v <= 3
        ? 'Low SPR (about 3 or less): top pair and overpairs are usually strong enough to get all-in.'
        : v <= 6
          ? 'Middle SPR (about 3 to 6): top pair can stack off on dry boards but needs care on wet ones.'
          : 'High SPR (above about 6): you usually want two pair or better to play for stacks; draws and small pairs gain value.',
    ],
  };
}

// ---------------------------------------------------------------------------------------------------------
// EV

const CALL_EVS: [number, number, number][] = [[100, 50, 0.3], [100, 100, 0.4], [200, 100, 0.2], [60, 30, 0.35], [100, 75, 0.25]];
const BLUFF_EVS: [number, number, number][] = [[100, 75, 0.5], [100, 50, 0.3], [100, 100, 0.45], [80, 60, 0.4]];
const SEMI_EVS: [number, number, number, number][] = [[100, 100, 0.4, 0.2], [100, 150, 0.3, 0.33], [60, 90, 0.5, 0.18]];

function callEVQuestion([pot, bet, eq]: (typeof CALL_EVS)[number], i: number): Question {
  const id = `ev-call-${i}`;
  const v = callEV(pot, bet, eq);
  const { choices, answer } = pick(id, v, signed, [eq * (pot + bet), eq * pot - (1 - eq) * bet], [-30, -20, -12, 12, 20, 30], 4, -Infinity);
  return {
    id,
    topic: 'ev',
    prompt: `The pot is ${pot}, they bet ${bet} and your equity is ${pc(eq)}. On average, what does calling win or lose (its EV)?`,
    facts: [['Pot', String(pot)], ['Bet', String(bet)], ['Equity', pc(eq)]],
    choices,
    answer,
    steps: [
      'EV of a call = equity × (pot + their bet) − (1 − equity) × your call.',
      `${pc(eq)} × ${pot + bet} − ${pc(1 - eq)} × ${bet} = ${(eq * (pot + bet)).toFixed(1)} − ${((1 - eq) * bet).toFixed(1)} = ${signed(v)}.`,
      v > 0 ? 'Positive, so calling makes money over time.' : 'Negative, so calling loses money over time.',
    ],
  };
}

function bluffEVQuestion([pot, bet, fold]: (typeof BLUFF_EVS)[number], i: number): Question {
  const id = `ev-bluff-${i}`;
  const v = bluffEV(pot, bet, fold);
  const { choices, answer } = pick(id, v, signed, [fold * pot, fold * (pot + bet) - bet], [-30, -20, -12, 12, 20, 30], 4, -Infinity);
  return {
    id,
    topic: 'ev',
    prompt: `You bluff ${bet} into ${pot} with a hand that can't win, and they fold ${pc(fold)} of the time. What's the bluff's EV?`,
    facts: [['Pot', String(pot)], ['Your bet', String(bet)], ['They fold', pc(fold)]],
    choices,
    answer,
    steps: [
      'EV of a bluff = fold % × pot − call % × your bet.',
      `${pc(fold)} × ${pot} − ${pc(1 - fold)} × ${bet} = ${(fold * pot).toFixed(1)} − ${((1 - fold) * bet).toFixed(1)} = ${signed(v)}.`,
      `It breaks even at ${pc(alpha(pot, bet), 1)} folds (${bet} ÷ ${pot + bet}).`,
    ],
  };
}

function semiBluffQuestion([pot, bet, fold, eq]: (typeof SEMI_EVS)[number], i: number): Question {
  const id = `ev-semi-${i}`;
  const v = semiBluffEV(pot, bet, fold, eq);
  const { choices, answer } = pick(id, v, signed, [bluffEV(pot, bet, fold), fold * pot], [-30, -20, -12, 12, 20, 30], 4, -Infinity);
  return {
    id,
    topic: 'ev',
    prompt: `On the turn you shove ${bet} into ${pot} with a draw. They fold ${pc(fold)} of the time, and when they call you hit ${pc(eq)} of the time. What's the shove's EV?`,
    facts: [['Pot', String(pot)], ['Your shove', String(bet)], ['They fold', pc(fold)], ['Your equity', pc(eq)]],
    choices,
    answer,
    steps: [
      'Two ways to win: they fold, or they call and you hit.',
      `When they fold: ${pc(fold)} × ${pot} = ${(fold * pot).toFixed(1)}.`,
      `When they call (${pc(1 - fold)}): you win ${pc(eq)} of a ${pot + 2 * bet} pot and you put in ${bet}, so ${pc(1 - fold)} × (${(eq * (pot + 2 * bet)).toFixed(1)} − ${bet}) = ${signed1((1 - fold) * (eq * (pot + 2 * bet) - bet))}.`,
      `Total: ${signed(v)}. As a pure bluff it would be ${signed(bluffEV(pot, bet, fold))}: your draw adds the difference.`,
    ],
  };
}

// ---------------------------------------------------------------------------------------------------------
// Preflop odds (counted exactly with combinatorics; matchups enumerated over every board, checked by the test)

export const MATCHUPS: [string, string, number][] = [
  ['QsQh', 'AdKc', 0.5716],
  ['AdKc', 'AsQh', 0.7402],
  ['2c2d', 'AhKh', 0.4992],
  ['AsAh', 'KdKc', 0.8126],
  ['JhTh', 'AsKd', 0.4118],
  ['9s9c', 'AhTd', 0.5594],
  ['KsQs', 'AdAc', 0.1768],
  ['8c7c', 'AsKd', 0.419],
];

const MATCHUP_NOTE: Record<string, string> = {
  QsQh: 'A pair against two overcards is close to a coin flip, but the pair is a small favourite.',
  AdKc: 'A shared ace with a worse kicker is "dominated": the ace-queen needs a queen (or a lucky board) to win.',
  '2c2d': 'Even the smallest pair is about even with ace-king suited: the suits and straights give AK back most of the gap.',
  AsAh: 'A bigger pair against a smaller one wins about 4 times in 5.',
  JhTh: 'Two live cards against two higher cards: about 40%, more when suited and connected.',
  '9s9c': 'A pair against one overcard and one undercard: the pair is ahead, but only by about 55-45 here.',
  KsQs: 'Against a pair above both your cards you\'re around 17-20%, a little better when suited.',
  '8c7c': 'Suited connectors against ace-king: about 40%. Not a disaster when the money goes in.',
};

function matchupQuestion([a, b, eq]: (typeof MATCHUPS)[number], i: number): Question {
  const id = `pf-m-${i}`;
  const { choices, answer } = pick(id, eq, (x) => pc(x), [1 - eq, 0.5], [-0.15, -0.1, -0.07, 0.07, 0.1, 0.15, 0.2], 0.04, 0.03, 0.97);
  return {
    id,
    topic: 'preflop',
    prompt: 'All-in before the flop. Roughly how often does your hand win (ties count half)?',
    hero: S(a),
    villain: S(b),
    choices,
    answer,
    steps: [`Over every possible board: ${pc(eq, 1)}.`, MATCHUP_NOTE[a]],
  };
}

const total5 = choose(50, 5);
const total3 = choose(50, 3);
const FACTS: { prompt: string; value: number; steps: string[]; traps: number[] }[] = [
  {
    prompt: 'How often are you dealt a pocket pair?',
    value: 78 / 1326,
    steps: ['There are 1,326 two-card hands and 78 of them are pairs (13 ranks × 6).', '78 ÷ 1,326 = 5.9%, about 1 hand in 17.'],
    traps: [1 / 13, 6 / 1326],
  },
  {
    prompt: 'How often are you dealt pocket aces?',
    value: 6 / 1326,
    steps: ['6 combos of aces out of 1,326 hands.', '6 ÷ 1,326 = 0.45%, once every 221 hands.'],
    traps: [78 / 1326, 16 / 1326],
  },
  {
    prompt: 'How often are you dealt ace-king (suited or not)?',
    value: 16 / 1326,
    steps: ['16 combos of ace-king out of 1,326.', '16 ÷ 1,326 = 1.2%, about once every 83 hands.'],
    traps: [6 / 1326, 4 / 1326],
  },
  {
    prompt: 'With a pocket pair, how often do you flop a set or better?',
    value: 1 - choose(48, 3) / total3,
    steps: ['Two of your rank are left among 50 unseen cards.', `Chance of missing all three flop cards: 48/50 × 47/49 × 46/48 = ${pc(choose(48, 3) / total3, 1)}.`, `So you flop a set ${pc(1 - choose(48, 3) / total3, 1)} of the time, about 1 in 8.5.`, 'That\'s why set mining needs deep stacks: a common guide is calling raises only when you can win 15 to 20 times the call.'],
    traps: [0.06, 0.19],
  },
  {
    prompt: 'With a pocket pair, how often do you make a set or better by the river?',
    value: 1 - choose(48, 5) / total5,
    steps: [`Missing all five board cards: C(48,5) ÷ C(50,5) = ${pc(choose(48, 5) / total5, 1)}.`, `So you hit ${pc(1 - choose(48, 5) / total5, 1)} of the time, about 1 in 5.`],
    traps: [1 - choose(48, 3) / total3, 0.3],
  },
  {
    prompt: 'With two suited cards, how often do you flop a flush draw (exactly two of your suit)?',
    value: (choose(11, 2) * 39) / total3,
    steps: ['11 cards of your suit are left, 39 others.', `Two of your suit and one other: C(11,2) × 39 ÷ C(50,3) = ${55 * 39} ÷ ${total3} = ${pc((55 * 39) / total3, 1)}.`],
    traps: [choose(11, 3) / total3 + 0.05, 0.19],
  },
  {
    prompt: 'With two suited cards, how often do you flop a flush?',
    value: choose(11, 3) / total3,
    steps: [`All three flop cards in your suit: C(11,3) ÷ C(50,3) = 165 ÷ ${total3} = ${pc(choose(11, 3) / total3, 2)}.`, 'About once every 119 flops.'],
    traps: [0.05, 0.11],
  },
  {
    prompt: 'With two suited cards, how often do you make a flush by the river?',
    value: (choose(11, 3) * choose(39, 2) + choose(11, 4) * 39 + choose(11, 5)) / total5,
    steps: ['You need at least three of the 11 cards of your suit among the five on the board.', `Three, four or five of them: (165 × 741 + 330 × 39 + 462) ÷ ${total5.toLocaleString()} = ${pc((choose(11, 3) * choose(39, 2) + choose(11, 4) * 39 + choose(11, 5)) / total5, 1)}.`, 'So suited cards add only a couple of percent of equity. Nice, but not a reason to play a weak hand.'],
    traps: [0.2, 0.35],
  },
];

const fmtFact = (x: number) => pc(x, x < 0.02 ? 2 : 1);

function factQuestion(f: (typeof FACTS)[number], i: number): Question {
  const id = `pf-f-${i}`;
  const { choices, answer } = pick(id, f.value, fmtFact, f.traps, f.value < 0.02 ? [-0.004, 0.006, 0.01, 0.02, 0.04] : [-0.04, -0.03, 0.03, 0.05, 0.08, 0.12], f.value < 0.02 ? 0.002 : 0.02, 0.0005, 0.99);
  return { id, topic: 'preflop', prompt: f.prompt, choices, answer, steps: f.steps };
}

// ---------------------------------------------------------------------------------------------------------

let bank: Question[] | null = null;

/** Every question, built once. */
export function allQuestions(): Question[] {
  if (bank) return bank;
  bank = [
    ...TURN_SPOTS.map((s, i) => outsQuestion(s, i, 'turn')),
    ...FLOP_SPOTS.map((s, i) => outsQuestion(s, i, 'flop')),
    ...DRAWS.flatMap(([name, outs], i) => [equityQuestion(name, outs, 2, i), equityQuestion(name, outs, 1, i)]),
    ...ALLIN_FLOPS.map((k, i) => allinEquityQuestion(FLOP_SPOTS[k], i)),
    ...POT_ODDS.map(([p, b], i) => potOddsQuestion(p, b, i)),
    ...POT_ODDS.slice(0, 6).map(([p, b], i) => ratioQuestion(p, b, i)),
    ...CALLS.map(callQuestion),
    ...IMPLIED.map(impliedQuestion),
    ...SIZES.map(mdfQuestion),
    ...SIZES.map(bluffQuestion),
    multiwayBluffQuestion(2, 100, 50, 0),
    multiwayBluffQuestion(2, 100, 100, 1),
    multiwayBluffQuestion(3, 100, 75, 2),
    ...SIZES.map(ratioRiverQuestion),
    ...COMBOS.map(comboQuestion),
    ...RIVERS.flatMap(riverQuestions),
    ...SPRS.map(sprQuestion),
    ...CALL_EVS.map(callEVQuestion),
    ...BLUFF_EVS.map(bluffEVQuestion),
    ...SEMI_EVS.map(semiBluffQuestion),
    ...MATCHUPS.map(matchupQuestion),
    ...FACTS.map(factQuestion),
  ];
  return bank;
}

export const questionsFor = (topic: TopicId) => allQuestions().filter((q) => q.topic === topic);

/** A round of `size` questions: one topic, or a mix of all of them. */
export function deal(topic: TopicId | 'mixed', size: number, rng: () => number): Question[] {
  const pool = topic === 'mixed' ? allQuestions() : questionsFor(topic);
  const order = pool.map((q) => ({ q, r: rng() })).sort((a, b) => a.r - b.r).map((o) => o.q);
  return order.slice(0, size);
}

// Exported for the unit test.
export const SPECS = { TURN_SPOTS, FLOP_SPOTS, COMBOS, CALLS };

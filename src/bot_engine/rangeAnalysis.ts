import { rankOf } from '../game/cards';
import { CLASS_INDEX, TOP } from '../game/botRange';
import { classify } from '../train/ranges/classify';
import type { InformationSet } from './information';
import type { OpponentRange } from './ranges';
import { ownHandKind } from './handPlan';

export function handClass(cards: string[]): string {
  const hole = [...cards].sort((a, b) => rankOf(b) - rankOf(a));
  return hole[0][0] + hole[1][0] + (hole[0][0] === hole[1][0] ? '' : hole[0][1] === hole[1][1] ? 's' : 'o');
}

/**
 * What a bet into an unopened street says, by its size as a share of the pot before it. The strength a hand needs to be
 * likely to bet (`threshold`, on the same 0-1 scale as `strength` below) and how much of everything else stays in
 * (`floor`). Half to three quarters of a pot reads as before this was added (0.42, 0.06); smaller bets read wider and
 * overbets a little stronger. The owner's recorded hand of 13 Nov
 * 2026 (a one big blind bet into 210 read as a strong hand, so pocket nines folded getting 13 to 1) is the case.
 */
export function betRead(share: number): { threshold: number; floor: number } {
  const points: [number, number, number][] = [
    // share of pot, threshold, floor
    [0.15, 0.26, 0.2],
    [0.33, 0.36, 0.1],
    [0.5, 0.42, 0.06],
    [0.75, 0.42, 0.06],
    [1.25, 0.48, 0.06],
  ];
  if (share <= points[0][0]) return { threshold: points[0][1], floor: points[0][2] };
  for (let n = 1; n < points.length; n++)
    if (share <= points[n][0]) {
      const [a, b] = [points[n - 1], points[n]];
      const t = (share - a[0]) / (b[0] - a[0]);
      return { threshold: a[1] + (b[1] - a[1]) * t, floor: a[2] + (b[2] - a[2]) * t };
    }
  const last = points[points.length - 1];
  return { threshold: last[1], floor: last[2] };
}

/** The pot before each of these postflop actions, worked back from the chips in now (blinds and antes included). */
export function potsBeforeActions(i: InformationSet, postflop: InformationSet['actions']): number[] {
  const increments: number[] = [];
  let street = '';
  let committed = new Map<string, number>();
  for (const a of postflop) {
    if (a.street !== street) {
      street = a.street;
      committed = new Map();
    }
    const put = a.move === 'call' || a.move === 'bet' || a.move === 'raise' || a.move === 'allin' ? Math.max(0, a.to - (committed.get(a.playerId) ?? 0)) : 0;
    if (put) committed.set(a.playerId, a.to);
    increments.push(put);
  }
  let pot = i.players.reduce((s, p) => s + p.total, 0);
  const before: number[] = new Array(postflop.length);
  for (let n = postflop.length - 1; n >= 0; n--) {
    pot -= increments[n];
    before[n] = pot;
  }
  return before;
}

/** Public-action likelihoods, independent of lesson answers, opponent types and private profiles. */
export function publicRangeLikelihood(i: InformationSet, playerId: string, cards: [string, string], classifyHolding = classify): number {
  const quality = 1 - TOP[CLASS_INDEX.get(handClass(cards))!];
  let weight = 1,
    price = i.bigBlind,
    raises = 0;
  for (const action of i.actions.filter((a) => a.street === 'preflop' && !a.outOfTurn)) {
    const aggressive = (action.move === 'bet' || action.move === 'raise' || action.move === 'allin') && action.to > price;
    if (action.playerId === playerId) {
      if (aggressive) {
        const threshold = raises === 0 ? 0.7 : raises === 1 ? 0.84 : 0.92;
        weight *= 0.015 + 0.985 / (1 + Math.exp(-(quality - threshold) / 0.075));
      } else if (action.move === 'call' || action.move === 'allin') {
        const player = i.players.find((p) => p.id === playerId)!;
        const commitment = action.to / Math.max(i.bigBlind, player.stack + player.total);
        const threshold = raises === 0 ? 0.38 : Math.min(0.9, 0.56 + commitment * 0.5 + Math.max(0, raises - 1) * 0.1);
        weight *= 0.03 + 0.97 / (1 + Math.exp(-(quality - threshold) / 0.11));
      }
    }
    if (aggressive) {
      price = action.to;
      raises++;
    }
  }
  const prices = new Map<string, number>();
  const kinds = new Map<string, ReturnType<typeof classify>>();
  const postflop = i.actions.filter((a) => a.street !== 'preflop' && !a.outOfTurn);
  const potBefore = potsBeforeActions(i, postflop);
  postflop.forEach((action, n) => {
    const beforePrice = prices.get(action.street) ?? 0;
    const aggressive = (action.move === 'bet' || action.move === 'raise' || action.move === 'allin') && action.to > beforePrice;
    if (aggressive) prices.set(action.street, action.to);
    if (action.playerId !== playerId) return;
    const board = i.board.slice(0, { preflop: 0, flop: 3, turn: 4, river: 5 }[action.street]);
    if (!kinds.has(action.street)) kinds.set(action.street, classifyHolding(cards, board));
    const kind = kinds.get(action.street)!;
    const strength = Math.max(kind.level / 11, kind.draw !== 'none' ? 0.46 : 0.04);
    if (aggressive) {
      // Retain draws/bluffs instead of treating all aggression as a made monster. A raise reads as one strength; a bet
      // reads by its size against the pot (betRead): a poke of a tenth of the pot can be almost anything, a pot-sized
      // bet much less so.
      const raising = beforePrice > 0;
      const read = raising ? { threshold: 0.61, floor: 0.06 } : betRead(action.to / Math.max(i.bigBlind, potBefore[n]));
      weight *= read.floor + (1 - read.floor) / (1 + Math.exp(-(strength - read.threshold) / 0.14));
    } else if (action.move === 'call' || action.move === 'allin') weight *= 0.16 + strength * 0.72;
    else if (action.move === 'check') weight *= 0.95 - Math.min(0.45, strength * 0.45);
  });
  return Math.max(1e-12, weight);
}

export interface RangeRead {
  playerId: string;
  combinations: number;
  effectiveCombinations: number;
  groups: { label: string; combinations: number; probability: number }[];
  topClasses: { hand: string; probability: number; combinations: number }[];
}
/** Same hand-group vocabulary as Range training. Probabilities are posterior mass,
 * not frequencies with which this opponent would play every possible hand. */
export function summarizeRange(i: InformationSet, range: OpponentRange): RangeRead {
  const groups = new Map<string, { combinations: number; probability: number }>();
  const classes = new Map<string, { combinations: number; probability: number }>();
  const before = i.board.length === 5 ? i.board.slice(0, 4) : undefined;
  for (const h of range.holdings) {
    const classifyHolding = range.source === 'public-action-range-model-2' ? ownHandKind : classify;
    const label = i.board.length >= 3 ? classifyHolding(h.cards, i.board, before).label : handClass(h.cards);
    const cls = handClass(h.cards);
    for (const [map, key] of [
      [groups, label],
      [classes, cls],
    ] as const) {
      const row = map.get(key) ?? { combinations: 0, probability: 0 };
      row.combinations++;
      row.probability += h.weight;
      map.set(key, row);
    }
  }
  return {
    playerId: range.playerId,
    combinations: range.holdings.length,
    effectiveCombinations: 1 / range.holdings.reduce((s, h) => s + h.weight * h.weight, 0),
    groups: [...groups].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.probability - a.probability),
    topClasses: [...classes]
      .map(([hand, v]) => ({ hand, ...v }))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 8),
  };
}

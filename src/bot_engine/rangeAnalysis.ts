import { rankOf } from '../game/cards';
import { CLASS_INDEX, TOP } from '../game/botRange';
import { classify } from '../train/ranges/classify';
import type { InformationSet } from './information';
import type { OpponentRange } from './ranges';

export function handClass(cards: string[]): string {
  const hole = [...cards].sort((a, b) => rankOf(b) - rankOf(a));
  return hole[0][0] + hole[1][0] + (hole[0][0] === hole[1][0] ? '' : hole[0][1] === hole[1][1] ? 's' : 'o');
}

/** Public-action likelihoods, independent of lesson answers, opponent types and private profiles. */
export function publicRangeLikelihood(i: InformationSet, playerId: string, cards: [string, string]): number {
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
  for (const action of i.actions.filter((a) => a.street !== 'preflop' && !a.outOfTurn)) {
    const beforePrice = prices.get(action.street) ?? 0;
    const aggressive = (action.move === 'bet' || action.move === 'raise' || action.move === 'allin') && action.to > beforePrice;
    if (aggressive) prices.set(action.street, action.to);
    if (action.playerId !== playerId) continue;
    const board = i.board.slice(0, { preflop: 0, flop: 3, turn: 4, river: 5 }[action.street]);
    if (!kinds.has(action.street)) kinds.set(action.street, classify(cards, board));
    const kind = kinds.get(action.street)!;
    const strength = Math.max(kind.level / 11, kind.draw !== 'none' ? 0.46 : 0.04);
    if (aggressive) {
      // Retain draws/bluffs instead of treating all aggression as a made monster.
      const raising = beforePrice > 0;
      weight *= 0.06 + 0.94 / (1 + Math.exp(-(strength - (raising ? 0.61 : 0.42)) / 0.14));
    } else if (action.move === 'call' || action.move === 'allin') weight *= 0.16 + strength * 0.72;
    else if (action.move === 'check') weight *= 0.95 - Math.min(0.45, strength * 0.45);
  }
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
    const label = i.board.length >= 3 ? classify(h.cards, i.board, before).label : handClass(h.cards);
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

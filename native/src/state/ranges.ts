// Range training on the phone. Grades are kept in `flipup.ranges` ({ [hand id]: 'best' | 'ok' | 'mistake' }, your
// best grade on each), the same key and shape as the web's RangeTrainer.tsx. Nothing here touches the server, your
// poker record, the streak or Home's last game.
//
// The hands and every number come from the shared model (src/train/ranges). Working the numbers out takes up to a
// second in a browser and several on the phone's JavaScript engine (a 40,000-deal sample for multiway pots), so
// they're worked out ahead in src/data/range-numbers.json; tests/ranges.test.ts checks that file against the model
// (`UPDATE_RANGES=1 npm test` writes it again). A hand that isn't in it is worked out on the phone.
import { analyse, gradeOf, spotOf, type Grade, type OptionId, type Pos, type Replay, type Scenario } from '@train/ranges/model';
import { SCENARIOS } from '@train/ranges/scenarios';

import NUMBERS from '../data/range-numbers.json';
import { read, save, useStored } from './storage';

const KEY = 'flipup.ranges';
const EMPTY: Record<string, Grade> = {};
const RANK: Record<Grade, number> = { mistake: 0, ok: 1, best: 2 };

function clean(raw: unknown): Record<string, Grade> {
  if (!raw || typeof raw !== 'object') return EMPTY;
  const out: Record<string, Grade> = {};
  for (const [id, g] of Object.entries(raw as Record<string, unknown>)) if (g === 'best' || g === 'ok' || g === 'mistake') out[id] = g;
  return out;
}

export function useRangeGrades(): Record<string, Grade> {
  return clean(useStored<unknown>(KEY, EMPTY));
}

/** How many hands you've played the best way. */
export const solvedCount = (grades: Record<string, Grade>) => SCENARIOS.filter((s) => grades[s.id] === 'best').length;

/** Grades an answer and keeps it if it's your best on that hand. */
export function answerHand(s: Scenario, pick: OptionId): Grade {
  const grade = gradeOf(s, pick);
  const all = clean(read<unknown>(KEY, EMPTY));
  if (all[s.id] === undefined || RANK[grade] > RANK[all[s.id]]) save(KEY, { ...all, [s.id]: grade });
  return grade;
}

/** The next hand: ones you haven't played the best way yet first, in order, then the rest (as on the web). */
export function nextHand(after: string | null): Scenario {
  const done = clean(read<unknown>(KEY, EMPTY));
  const start = after ? SCENARIOS.findIndex((s) => s.id === after) + 1 : 0;
  const order = [...SCENARIOS.slice(start), ...SCENARIOS.slice(0, start)];
  return order.find((s) => done[s.id] !== 'best' && s.id !== after) ?? order[0];
}

/** Everything the "why" page shows, in numbers. */
export interface HandNumbers {
  /** Your share of the pot at a showdown now, against everyone still in. */
  equity: number;
  /** Facing a bet: the share you need to call. */
  price: number;
  /** What each play wins on average, in big blinds. */
  rows: { id: OptionId; ev: number }[];
  /** Each live opponent's groups, in the order the scenario lists them: combos, share weight, your win rate. */
  views: { pos: Pos; groups: { combos: number; weight: number; equity: number }[] }[];
}

const round = (n: number) => Math.round(n * 10000) / 10000;

/** Works the numbers out with the shared model (the slow way). */
export function computeNumbers(s: Scenario, r: Replay): HandNumbers {
  const views = analyse(s, r).map((v) => ({ pos: v.opponent.pos, groups: v.groups.map((g) => ({ combos: g.combos, weight: round(g.weight), equity: round(g.equity) })) }));
  const spot = spotOf(s, r);
  if (r.toCall > 0) return { equity: round(spot.equity), price: round(spot.price!), rows: [{ id: 'fold', ev: 0 }, { id: 'call', ev: round(spot.evCall!) }], views };
  const bets = (['bet33', 'bet75', 'bet125'] as const).map((id) => ({ id, ev: round(spotOf(s, r, id).bet!.ev) }));
  return { equity: round(spot.equity), price: 0, rows: [{ id: 'check', ev: round(spot.evCheck!) }, ...bets], views };
}

/** The numbers for a hand: from the file when it has them, else worked out here. */
export function numbersFor(s: Scenario, r: Replay): HandNumbers {
  return (NUMBERS as Record<string, HandNumbers>)[s.id] ?? computeNumbers(s, r);
}

export const hasStoredNumbers = (id: string) => id in (NUMBERS as Record<string, unknown>);

export { SCENARIOS };

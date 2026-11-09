// Range training on the phone: the web's RangeTrainer.tsx, the same hands and the same rules. Grades are kept in
// `flipup.ranges` ({ [hand id]: 'best' | 'ok' | 'mistake' }, your best grade on each), the same key and shape as the
// web. Nothing here touches the server or your poker record.
//
// The hands and every number come from the shared model (src/train/ranges). Working the numbers out takes up to a
// second in a browser and several on the phone's JavaScript engine (a 40,000-deal sample for multiway pots), so
// they're worked out ahead in src/data/range-numbers.json; tests/ranges.test.ts checks that file against the model
// (`UPDATE_RANGES=1 npm test` writes it again). A hand that isn't in it is worked out on the phone.
import { analyse, gradeOf, spotOf, type Grade, type OptionId, type Pos, type Replay, type Scenario } from '@train/ranges/model';
import { SCENARIOS } from '@train/ranges/scenarios';

import { readRangeHistory, recordAnswer, roughPatch } from './range-history';
import { read, save, useStored } from './storage';

/** Every hand, the same list as the web: each one from a published hand breakdown (src/train/ranges/scenarios.ts). */
export const allHands = (): Scenario[] => SCENARIOS;

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

/** Your best grade on each hand, read once. */
export const readRangeGrades = (): Record<string, Grade> => clean(read<unknown>(KEY, EMPTY));

/** Grades an answer and keeps it if it's your best on that hand. */
export function answerHand(s: Scenario, pick: OptionId): Grade {
  const grade = gradeOf(s, pick);
  const all = readRangeGrades();
  if (all[s.id] === undefined || RANK[grade] > RANK[all[s.id]]) save(KEY, { ...all, [s.id]: grade });
  recordAnswer(s, pick, grade);
  return grade;
}

/**
 * The next hand, as on the web: a random one you haven't got right yet (the whole set once they're all done), never
 * the same kind of spot twice running.
 */
export function nextHand(after: Scenario | null, rng: () => number = Math.random, focus?: readonly string[]): Scenario {
  // Practising the spots you miss: only hands of those concepts (every hand of them once you've got them all).
  const all = focus?.length && allHands().some((s) => focus.includes(s.concept)) ? allHands().filter((s) => focus.includes(s.concept)) : allHands();
  const done = readRangeGrades();
  // After a rough patch (a miss, and three of the last five), an easy one: a hand you've already got right, of another kind.
  if (!focus?.length && after && roughPatch(readRangeHistory())) {
    const easy = all.filter((s) => s !== after && done[s.id] === 'best' && s.concept !== after.concept);
    if (easy.length) return easy[Math.floor(rng() * easy.length)];
  }
  const fresh = all.filter((s) => s !== after && done[s.id] !== 'best');
  const pool = fresh.length ? fresh : all.filter((s) => s !== after);
  const varied = after ? pool.filter((s) => s.concept !== after.concept || s.hero.pos !== after.hero.pos) : pool;
  const from = varied.length ? varied : pool;
  return from[Math.floor(rng() * from.length)] ?? all[0];
}

/** Everything the review shows, in numbers. */
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

let NUMBERS: Record<string, HandNumbers> | null = null;
/** The worked-out numbers, read the first time they're needed (the file is big). */
function numbers(): Record<string, HandNumbers> {
  NUMBERS ??= require('../data/range-numbers.json') as Record<string, HandNumbers>;
  return NUMBERS;
}

/** The numbers for a hand: from the file when it has them, else worked out here. */
export function numbersFor(s: Scenario, r: Replay): HandNumbers {
  return numbers()[s.id] ?? computeNumbers(s, r);
}

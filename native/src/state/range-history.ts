// Every answer you give in Range training, kept so the Stats view can show how you're doing. `flipup.ranges` only
// keeps your best grade on each hand (so a miss is forgotten); this keeps each answer with when it happened, the
// last 600 of them. Nothing here leaves the phone.
import type { Grade, OptionId, Scenario } from '@train/ranges/model';
import { SCENARIOS } from '@train/ranges/scenarios';

import { read, save, useStored } from './storage';

const KEY = 'flipup.rangehistory';
const MAX = 600;

export interface Answer {
  id: string;
  pick: OptionId;
  grade: Grade;
  at: number;
}

function clean(raw: unknown): Answer[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (a): a is Answer =>
      !!a && typeof a.id === 'string' && typeof a.pick === 'string' && typeof a.at === 'number' && (a.grade === 'best' || a.grade === 'ok' || a.grade === 'mistake'),
  );
}

const EMPTY: Answer[] = [];
export const readRangeHistory = (): Answer[] => clean(read<unknown>(KEY, EMPTY));
export const useRangeHistory = (): Answer[] => clean(useStored<unknown>(KEY, EMPTY));

export function recordAnswer(s: Scenario, pick: OptionId, grade: Grade, at = Date.now()): void {
  save(KEY, [...readRangeHistory(), { id: s.id, pick, grade, at }].slice(-MAX));
}

export interface Tally {
  label: string;
  total: number;
  best: number;
  /** Share of answers that were the best play, 0 to 1. */
  rate: number;
}

export interface RangeStats {
  total: number;
  best: number;
  ok: number;
  mistake: number;
  rate: number;
  /** The last 20 answers, and the 20 before them (null until there are enough to compare). */
  recent: number | null;
  before: number | null;
  /** Best-play rate in each run of 10 answers, oldest first, the last 8 runs. */
  trend: number[];
  /** Your longest run of best plays in a row. */
  longest: number;
  byConcept: Tally[];
  byPosition: Tally[];
  byFormat: Tally[];
  /** The three concepts you miss most (at least 3 answers each). */
  weakest: Tally[];
}

const rateOf = (xs: Answer[]) => (xs.length ? xs.filter((a) => a.grade === 'best').length / xs.length : 0);

function group(history: Answer[], byId: Map<string, Scenario>, key: (s: Scenario) => string, min: number): Tally[] {
  const m = new Map<string, Answer[]>();
  for (const a of history) {
    const s = byId.get(a.id);
    if (!s) continue;
    const k = key(s);
    m.set(k, [...(m.get(k) ?? []), a]);
  }
  return [...m.entries()]
    .filter(([, xs]) => xs.length >= min)
    .map(([label, xs]) => ({ label, total: xs.length, best: xs.filter((a) => a.grade === 'best').length, rate: rateOf(xs) }))
    .sort((a, b) => a.rate - b.rate || b.total - a.total);
}

/** The numbers behind the Stats view, from your answers and the hands they were on. */
export function rangeStats(history: Answer[], scenarios: Scenario[] = SCENARIOS): RangeStats {
  const byId = new Map(scenarios.map((s) => [s.id, s]));
  const known = history.filter((a) => byId.has(a.id));
  const count = (g: Grade) => known.filter((a) => a.grade === g).length;
  const last = known.slice(-20);
  const prev = known.slice(-40, -20);
  const trend: number[] = [];
  for (let end = known.length; end > 0 && trend.length < 8; end -= 10) trend.unshift(rateOf(known.slice(Math.max(0, end - 10), end)));
  const byConcept = group(known, byId, (s) => s.concept, 2);
  return {
    total: known.length,
    best: count('best'),
    ok: count('ok'),
    mistake: count('mistake'),
    rate: rateOf(known),
    recent: last.length >= 10 ? rateOf(last) : null,
    before: last.length >= 10 && prev.length >= 10 ? rateOf(prev) : null,
    trend,
    longest: longestRun(known),
    byConcept,
    byPosition: group(known, byId, (s) => s.hero.pos, 2),
    byFormat: group(known, byId, (s) => (s.format === 'tournament' ? 'Tournament' : 'Cash'), 1),
    weakest: byConcept.filter((t) => t.total >= 3 && t.rate < 1).slice(0, 3),
  };
}

/** How many best plays you've given in a row, counting back from your latest answer. */
export function runOf(history: Answer[]): number {
  let n = 0;
  for (let i = history.length - 1; i >= 0 && history[i].grade === 'best'; i--) n++;
  return n;
}

/** A rough patch: your last answer was a miss and three of your last five were. */
export function roughPatch(history: Answer[]): boolean {
  const last = history.slice(-5);
  return last.length >= 4 && last[last.length - 1].grade === 'mistake' && last.filter((a) => a.grade === 'mistake').length >= 3;
}

/** Your longest run of best plays in a row, over all the answers kept. */
export function longestRun(history: Answer[]): number {
  let best = 0;
  let run = 0;
  for (const a of history) {
    run = a.grade === 'best' ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

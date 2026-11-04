// Range training on the phone. Grades are kept in `flipup.ranges` ({ [hand id]: 'best' | 'ok' | 'mistake' }, your
// best grade on each), the same key and shape as the web's RangeTrainer.tsx. Nothing here touches the server, your
// poker record or Home's last game; a finished session marks the daily streak (see `finishSession()`).
//
// The hands and every number come from the shared model (src/train/ranges). Working the numbers out takes up to a
// second in a browser and several on the phone's JavaScript engine (a 40,000-deal sample for multiway pots), so
// they're worked out ahead in src/data/range-numbers.json; tests/ranges.test.ts checks that file against the model
// (`UPDATE_RANGES=1 npm test` writes it again). A hand that isn't in it is worked out on the phone.
import { cleanDays, dayKey, streakOf, withToday } from '@/engine';
import { analyse, gradeOf, spotOf, type Grade, type OptionId, type Pos, type Replay, type Scenario } from '@train/ranges/model';
import { SCENARIOS } from '@train/ranges/scenarios';

import NUMBERS from '../data/range-numbers.json';
import { DAILY_SIZE, dailyIds, type Level, type Mode } from './range-logic';
import { read, save, useStored } from './storage';
import { markPlayedToday } from './streak';

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

/** The grades, read once (to deal a round). */
export const readRangeGrades = (): Record<string, Grade> => clean(read<unknown>(KEY, EMPTY));

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

export const scenarioById = (id: string): Scenario | undefined => SCENARIOS.find((s) => s.id === id);

// ── Play: your level, the daily three, the flame, Blitz and round bests ────────
//
// `flipup.rangeplay` holds everything the modes need on top of the grades. A finished round, daily or Blitz marks
// the day for Range training's own flame (`days`) and for the app's daily streak too (`markPlayedToday()`, the
// owner's call). It never touches the server or your poker record.

const PLAY_KEY = 'flipup.rangeplay';

export interface RangePlay {
  /** Easy keeps the numbers out of the way; Pro shows them, and adds Lock it in and Guess your odds. */
  level: Level;
  /** Days with a finished round, daily or Blitz, as local dates. */
  days: string[];
  /** The daily three, by day: the grades so far, in order. */
  daily: Record<string, Grade[]>;
  blitzBest: number;
  roundBest: number;
  rounds: number;
  /** Every point you've scored. */
  points: number;
  /** How many times you've swiped your cards to answer: the swipe hint goes once you have a few times. */
  swipes: number;
}

const START: RangePlay = { level: 'easy', days: [], daily: {}, blitzBest: 0, roundBest: 0, rounds: 0, points: 0, swipes: 0 };
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

function cleanPlay(raw: unknown): RangePlay {
  if (!raw || typeof raw !== 'object') return START;
  const r = raw as Partial<Record<keyof RangePlay, unknown>>;
  const daily: Record<string, Grade[]> = {};
  if (r.daily && typeof r.daily === 'object')
    for (const [day, list] of Object.entries(r.daily as Record<string, unknown>))
      if (/^\d{4}-\d{2}-\d{2}$/.test(day) && Array.isArray(list)) daily[day] = list.filter((g): g is Grade => g === 'best' || g === 'ok' || g === 'mistake').slice(0, DAILY_SIZE);
  return {
    level: r.level === 'pro' ? 'pro' : 'easy',
    days: cleanDays(r.days),
    daily,
    blitzBest: num(r.blitzBest),
    roundBest: num(r.roundBest),
    rounds: num(r.rounds),
    points: num(r.points),
    swipes: num(r.swipes),
  };
}

const readPlay = () => cleanPlay(read<unknown>(PLAY_KEY, null));
/** The play record, read once (to start a session). */
export const readRangePlay = readPlay;
const writePlay = (patch: Partial<RangePlay>) => save(PLAY_KEY, { ...readPlay(), ...patch });

export const useRangePlay = (): RangePlay => cleanPlay(useStored<unknown>(PLAY_KEY, null));

export const setLevel = (level: Level) => writePlay({ level });
export const noteSwipe = () => writePlay({ swipes: readPlay().swipes + 1 });

/** Range training's own flame: days in a row with a finished session. */
export const flameOf = (play: RangePlay, now = new Date()) => streakOf(play.days, now);

/** Today's three hands, and how far you've got with them. */
export function dailyToday(play: RangePlay, now = new Date()): { day: string; ids: string[]; grades: Grade[]; done: boolean } {
  const day = dayKey(now);
  const ids = dailyIds(day, SCENARIOS);
  const grades = play.daily[day] ?? [];
  return { day, ids, grades, done: grades.length >= ids.length };
}

/** Keeps a daily answer as it's made, so leaving halfway picks up where you were. Old days are let go after 60. */
export function noteDaily(day: string, grade: Grade): void {
  const play = readPlay();
  const have = play.daily[day] ?? [];
  if (have.length >= DAILY_SIZE) return;
  const days = Object.keys(play.daily).sort().slice(-59);
  const kept = Object.fromEntries(days.filter((d) => d !== day).map((d) => [d, play.daily[d]]));
  writePlay({ daily: { ...kept, [day]: [...have, grade] } });
}

/** A finished session: marks today (here and on the app's streak), keeps bests, adds the points. Says what's new. */
export function finishSession(mode: Mode, score: number, now = new Date()): { newBest: boolean } {
  const play = readPlay();
  const newBest = (mode === 'blitz' && score > play.blitzBest) || (mode === 'round' && score > play.roundBest);
  writePlay({
    days: withToday(play.days, now),
    blitzBest: mode === 'blitz' ? Math.max(play.blitzBest, score) : play.blitzBest,
    roundBest: mode === 'round' ? Math.max(play.roundBest, score) : play.roundBest,
    rounds: play.rounds + 1,
    points: play.points + Math.max(0, score),
  });
  markPlayedToday();
  return { newBest };
}

/** Each concept's progress: 1 when every hand of it is a best play, half credit for also good. */
export function trickProgress(grades: Record<string, Grade>): Record<string, { done: number; total: number; best: boolean; ids: string[] }> {
  const out: Record<string, { done: number; total: number; best: boolean; ids: string[] }> = {};
  for (const s of SCENARIOS) {
    const t = (out[s.concept] ??= { done: 0, total: 0, best: false, ids: [] });
    t.total++;
    t.ids.push(s.id);
    t.done += grades[s.id] === 'best' ? 1 : grades[s.id] === 'ok' ? 0.5 : 0;
  }
  for (const t of Object.values(out)) t.best = t.done >= t.total;
  return out;
}

// The Train tab's path: every Range training trick as a lesson, in four units (the trick families), each unit's
// lessons in the order the hands first appear. A lesson opens once the one before it is collected (or once you've
// played it, so nobody loses a lesson they'd already started); the first open lesson you haven't collected is the
// one the path points at. Pure, so tests/train-path.test.ts can check it.
import { dayKey } from '@/engine';
import { ROUND_SIZE } from '@/state/range-logic';
import type { TrickProgress } from '@/state/ranges';

import { FAMILY, trickOf, type Family, type Trick } from '../ranges/words';

/** The units, in path order. */
export const UNITS: Family[] = ['reads', 'calls', 'value', 'bluffs'];

export type LessonState = 'done' | 'current' | 'open' | 'locked';

export interface Lesson {
  concept: string;
  trick: Trick;
  unit: Family;
  state: LessonState;
  /** Best plays so far (half for also good), out of `goal`. */
  done: number;
  goal: number;
  /** How many hands a lesson deals: a round's worth, or every hand the trick has when it has fewer. */
  hands: number;
  /** The lesson before it on the path, for a locked lesson's note. */
  before: string | null;
}

export interface Unit {
  family: Family;
  /** 1-based. */
  number: number;
  name: string;
  line: string;
  lessons: Lesson[];
  collected: number;
}

/** Builds the path from every concept (in the order the hands list them) and your progress on each. */
export function buildPath(concepts: readonly string[], progress: Record<string, TrickProgress>): { units: Unit[]; current: Lesson | null; collected: number; total: number } {
  const unique = [...new Set(concepts)];
  const ordered = UNITS.flatMap((family) => unique.filter((c) => trickOf(c).family === family));
  const lessons: Lesson[] = [];
  let current: Lesson | null = null;
  ordered.forEach((concept, i) => {
    const p = progress[concept];
    const prev = i > 0 ? lessons[i - 1] : null;
    const open = !prev || prev.state === 'done' || !!p?.started;
    const state: LessonState = p?.best ? 'done' : !open ? 'locked' : current ? 'open' : 'current';
    const lesson: Lesson = { concept, trick: trickOf(concept), unit: trickOf(concept).family, state, done: p?.done ?? 0, goal: p?.goal ?? 1, hands: Math.min(ROUND_SIZE, p?.total ?? 1), before: prev?.concept ?? null };
    if (state === 'current') current = lesson;
    lessons.push(lesson);
  });
  const units = UNITS.map((family, i) => {
    const mine = lessons.filter((l) => l.unit === family);
    return { family, number: i + 1, name: FAMILY[family].name, line: FAMILY[family].line, lessons: mine, collected: mine.filter((l) => l.state === 'done').length };
  }).filter((u) => u.lessons.length > 0);
  units.forEach((u, i) => (u.number = i + 1));
  return { units, current, collected: lessons.filter((l) => l.state === 'done').length, total: lessons.length };
}

/** How far each node on the path sits from the middle, as a share of the swing: the path weaves like a river. */
const WEAVE = [0, 0.55, 1, 0.55, 0, -0.55, -1, -0.55];
export const weaveAt = (i: number): number => WEAVE[i % WEAVE.length];

/** The seven days ending today, as local dates, oldest first, with a one-letter name each. */
export function lastWeek(now = new Date()): { key: string; letter: string; today: boolean }[] {
  const out: { key: string; letter: string; today: boolean }[] = [];
  for (let back = 6; back >= 0; back--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back, 12);
    out.push({ key: dayKey(d), letter: 'SMTWTFS'[d.getDay()], today: back === 0 });
  }
  return out;
}

/** "5 hands", "1 hand". */
export const handsLabel = (n: number): string => `${n} hand${n === 1 ? '' : 's'}`;

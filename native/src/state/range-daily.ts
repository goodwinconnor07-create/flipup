// The daily hand: one hand a day (DAILY_HANDS), the same on every phone (state/daily-quiz.ts), free for everyone; it's the whole of
// Range training without Premium. Your answers for the day are kept so you can leave and pick up where you were, and
// the days you finished it make a streak. Nothing here leaves the phone.
import { dayKey, streakOf } from '@/engine';
import type { Grade, OptionId, Scenario } from '@train/ranges/model';

import { dailySetIds, DAILY_HANDS } from './daily-quiz';
import { allHands } from './ranges';
import { read, save, useStored } from './storage';

const KEY = 'flipup.rangedaily';

export interface DailyAnswer {
  id: string;
  pick: OptionId;
  grade: Grade;
}

interface Stored {
  /** The day the answers are for. */
  day: string;
  answers: DailyAnswer[];
  /** Every day you finished the quiz, for the streak. */
  done: string[];
}

const EMPTY: Stored = { day: '', answers: [], done: [] };

function clean(raw: unknown): Stored {
  if (!raw || typeof raw !== 'object') return EMPTY;
  const r = raw as Partial<Stored>;
  const answers = Array.isArray(r.answers) ? r.answers.filter((a): a is DailyAnswer => !!a && typeof a.id === 'string' && typeof a.pick === 'string' && (a.grade === 'best' || a.grade === 'ok' || a.grade === 'mistake')) : [];
  const done = Array.isArray(r.done) ? r.done.filter((d): d is string => typeof d === 'string').slice(-730) : [];
  return { day: typeof r.day === 'string' ? r.day : '', answers, done };
}

export interface DailyQuiz {
  day: string;
  /** Today's hands, in order. */
  hands: Scenario[];
  /** Today's answers so far, in order. */
  answers: DailyAnswer[];
  started: boolean;
  finished: boolean;
  /** Days in a row with the quiz finished (counting today if it's done, else up to yesterday). */
  streak: number;
}

function quizOf(s: Stored, now: Date): DailyQuiz {
  const day = dayKey(now);
  const all = allHands();
  const ids = dailySetIds(day, all.map((h) => h.id));
  const hands = ids.flatMap((id) => all.filter((h) => h.id === id));
  const answers = s.day === day ? s.answers.slice(0, hands.length) : [];
  return { day, hands, answers, started: answers.length > 0, finished: answers.length >= Math.min(DAILY_HANDS, hands.length), streak: streakOf(s.done, now).days };
}

export const readDaily = (now = new Date()): DailyQuiz => quizOf(clean(read<unknown>(KEY, EMPTY)), now);
export const useDaily = (now = new Date()): DailyQuiz => quizOf(clean(useStored<unknown>(KEY, EMPTY)), now);

/** Keeps one answer for today's quiz (in order), and marks the day finished on the last one. */
export function noteDailyAnswer(answer: DailyAnswer, now = new Date()): void {
  const s = clean(read<unknown>(KEY, EMPTY));
  const q = quizOf(s, now);
  if (q.finished || q.hands[q.answers.length]?.id !== answer.id) return;
  const answers = [...q.answers, answer];
  const finished = answers.length >= q.hands.length;
  save(KEY, { day: q.day, answers, done: finished && !s.done.includes(q.day) ? [...s.done, q.day] : s.done });
}

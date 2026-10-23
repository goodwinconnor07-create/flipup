// What this phone keeps about solved hands (`flipup.quiz`): which hands you've had, so new ones come
// first, and running totals of your grades.

import type { Colour } from '../gto/types';
import { read, write } from '../state/persist';

export interface QuizSave {
  /** Hand ids, oldest first (the last 2,000). */
  seen: string[];
  hands: number;
  green: number;
  yellow: number;
  red: number;
}

const KEY = 'flipup.quiz';
const EMPTY: QuizSave = { seen: [], hands: 0, green: 0, yellow: 0, red: 0 };

export function loadQuiz(): QuizSave {
  return { ...EMPTY, ...(read<QuizSave>(KEY) ?? {}) };
}

/** Counts a finished hand and its grades. */
export function saveQuizHand(id: string, grades: Colour[]): QuizSave {
  const s = loadQuiz();
  const next: QuizSave = {
    seen: [...s.seen.filter((x) => x !== id), id].slice(-2000),
    hands: s.hands + 1,
    green: s.green + grades.filter((g) => g === 'green').length,
    yellow: s.yellow + grades.filter((g) => g === 'yellow').length,
    red: s.red + grades.filter((g) => g === 'red').length,
  };
  write(KEY, next);
  return next;
}

// What this phone keeps about solved hands (`flipup.quiz`): which hands you've had, so new ones come
// first, and running totals of your grades.

import type { Colour } from '../gto/types';
import { read, write } from '../state/persist';
import type { QuizHand } from './hands';
import type { ScrollScenario } from './scenarios';

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

// ── Study bank ───────────────────────────────────────────────────────────────
// Hands you played stay for 24 hours (`flipup.quizrecent`); save one to the study bank (`flipup.quizbank`)
// with a name to keep it until you delete it.

export interface PlayedQuiz {
  id: string;
  at: number;
  /** "BTN K♣9♦ on J♣ 9♥ Q♦", and your hole cards, for the list. */
  title: string;
  cards: string[];
  /** Your pick at each decision (index into its options), when you made one. */
  picks: (number | null)[];
  grades: Colour[];
  /** Full immutable content, so saved hands survive remote pack updates and offline use. */
  snapshot?: QuizHand | ScrollScenario;
}

export interface BankHand extends PlayedQuiz {
  name: string;
  /** When it went into the bank. */
  saved: number;
}

const RECENT = 'flipup.quizrecent';
const BANK = 'flipup.quizbank';
export const KEEP_MS = 24 * 60 * 60 * 1000;

/** Hands played in the last 24 hours, newest first (older ones are deleted here). */
export function loadRecent(now = Date.now()): PlayedQuiz[] {
  const all = read<PlayedQuiz[]>(RECENT) ?? [];
  const kept = all.filter((h) => Number.isFinite(h.at) && h.at <= now && now - h.at < KEEP_MS);
  if (kept.length !== all.length) write(RECENT, kept);
  return [...kept].sort((a, b) => b.at - a.at);
}

/** Notes a hand you played (replacing an earlier play of the same hand). */
export function recordPlayed(hand: PlayedQuiz, now = Date.now()): void {
  const kept = loadRecent(now).filter((h) => h.id !== hand.id);
  write(RECENT, [hand, ...kept].slice(0, 300));
}

export function loadBank(): BankHand[] {
  return [...(read<BankHand[]>(BANK) ?? [])].sort((a, b) => b.saved - a.saved);
}

/** Saves a hand to the study bank under a name (saving it again renames it). */
export function saveToBank(hand: PlayedQuiz, name: string, now = Date.now()): BankHand[] {
  const entry: BankHand = { ...hand, name: name.trim() || 'Saved hand', saved: now };
  const next = [entry, ...loadBank().filter((h) => h.id !== hand.id)];
  write(BANK, next);
  const persisted = read<BankHand[]>(BANK);
  if (!persisted?.some(h => h.id === entry.id && h.saved === entry.saved && h.name === entry.name))
    throw new Error('This device could not save the hand. Free some storage and try again.');
  return next;
}

export function renameBanked(id: string, name: string): BankHand[] {
  const next = loadBank().map((h) => (h.id === id ? { ...h, name: name.trim() || h.name } : h));
  write(BANK, next);
  return next;
}

export function removeBanked(id: string): BankHand[] {
  const next = loadBank().filter((h) => h.id !== id);
  write(BANK, next);
  return next;
}

export const isBanked = (id: string) => loadBank().some((h) => h.id === id);

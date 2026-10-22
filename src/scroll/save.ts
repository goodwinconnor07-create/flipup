// What Scroll keeps on this phone: your level and stars, the combo, which card you're on, how each kind of
// card has been going (for picking the next one) and the hands you've played, for the Scroll hands list in Train.

import type { HandRecord } from '../game';
import { read, write } from '../state/persist';
import type { CardRef, Decision, Outcome, Theme } from './types';

const KEY = 'flipup.scroll';
const HANDS_KEY = 'flipup.scrollhands';

export interface Finished {
  id: string;
  seed: number;
  theme: Theme;
  passed: boolean;
  stars: number;
  at: number;
}

export interface ScrollSave {
  /** Stars earned in all. */
  stars: number;
  /** Cards finished. */
  cards: number;
  passed: number;
  combo: number;
  bestCombo: number;
  /** Most stars earned on each template. */
  best: Record<string, number>;
  /** The latest cards, newest last, for choosing what's next. */
  recent: Finished[];
  /** The card you're on (and the one after it, once this one is done). */
  current: CardRef | null;
  upcoming: CardRef | null;
  /** Counts up, so every card gets its own deal. */
  seed: number;
}

export const emptySave = (): ScrollSave => ({
  stars: 0,
  cards: 0,
  passed: 0,
  combo: 0,
  bestCombo: 0,
  best: {},
  recent: [],
  current: null,
  upcoming: null,
  seed: 0,
});

const num = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? n : 0);
const ref = (r: unknown): CardRef | null => {
  const x = r as Partial<CardRef> | null;
  return x && typeof x.id === 'string' && typeof x.seed === 'number' ? { id: x.id, seed: x.seed } : null;
};

export function loadScroll(): ScrollSave {
  const s = read<Partial<ScrollSave>>(KEY);
  if (!s || typeof s !== 'object') return emptySave();
  return {
    stars: num(s.stars),
    cards: num(s.cards),
    passed: num(s.passed),
    combo: num(s.combo),
    bestCombo: num(s.bestCombo),
    best: s.best && typeof s.best === 'object' ? Object.fromEntries(Object.entries(s.best).filter(([, v]) => typeof v === 'number')) : {},
    recent: Array.isArray(s.recent) ? s.recent.filter((r) => r && typeof r.id === 'string' && typeof r.seed === 'number').slice(-80) : [],
    current: ref(s.current),
    upcoming: ref(s.upcoming),
    seed: num(s.seed),
  };
}

export function saveScroll(s: ScrollSave): void {
  write(KEY, { ...s, recent: s.recent.slice(-80) });
}

// ── Levels ──────────────────────────────────────────────────────────────────

/** Stars needed for each level, from level 1. */
const STEPS = [0, 8, 20, 36, 56, 80, 110, 150, 200, 260];
const NAMES = ['Rookie', 'Regular', 'Grinder', 'Reader', 'Sharp', 'Shark', 'Pro', 'Crusher', 'Master', 'Legend'];

export interface Level {
  level: number;
  name: string;
  /** Stars into this level, and stars this level takes (0 at the top). */
  into: number;
  span: number;
  /** The hardest cards (1 to 4) this level is dealt. */
  cap: 1 | 2 | 3 | 4;
}

export function levelOf(stars: number): Level {
  let i = 0;
  while (i + 1 < STEPS.length && stars >= STEPS[i + 1]) i++;
  const top = i === STEPS.length - 1;
  const cap = ([1, 1, 2, 2, 3, 3, 4, 4, 4, 4] as const)[i];
  return { level: i + 1, name: NAMES[i], into: stars - STEPS[i], span: top ? 0 : STEPS[i + 1] - STEPS[i], cap };
}

// ── Scroll hands ────────────────────────────────────────────────────────────

/** A card you've played, kept for the Scroll hands list. */
export interface ScrollHand {
  /** The same key the coach's review of this hand is saved under. */
  key: string;
  ref: CardRef;
  theme: Theme;
  title: string;
  at: number;
  outcome: Outcome;
  decisions: Decision[];
  /** Your seat, for the review. */
  heroId: string;
  /** The hand as data, once it was played to the end (a quick card stops at your decision and has none). */
  record: HandRecord | null;
}

/** Hands kept: this many, or more when they're ones worth looking at again (missed cards and three-star ones). */
export const KEEP = 100;
const KEEP_MAX = 200;

const worthKeeping = (h: ScrollHand) => !h.outcome.passed || h.outcome.stars === 3;

export function loadScrollHands(): ScrollHand[] {
  const h = read<ScrollHand[]>(HANDS_KEY);
  return Array.isArray(h) ? h.filter((x) => x && typeof x.key === 'string' && x.outcome && Array.isArray(x.decisions)) : [];
}

/** The list with `hand` added. Over the limit, the oldest plain pass goes first, then (past the hard limit) the oldest of anything. */
export function withHand(hands: ScrollHand[], hand: ScrollHand): ScrollHand[] {
  let all = [...hands.filter((h) => h.key !== hand.key), hand];
  while (all.length > KEEP) {
    const i = all.findIndex((h) => !worthKeeping(h));
    if (i === -1) break;
    all = all.filter((_, j) => j !== i);
  }
  return all.slice(-KEEP_MAX);
}

export function addScrollHand(hand: ScrollHand): void {
  write(HANDS_KEY, withHand(loadScrollHands(), hand));
}

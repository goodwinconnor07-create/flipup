// What the coach is doing while it reviews a hand, and how long that should take. The service only
// reports "hand k of n", so the steps inside a hand are worked out from the hand itself and paced by
// how long reviews of the same shape took on this phone before. The per-hand counts are real; the
// steps between them are an estimate and the screen says so.

import { useEffect, useRef, useState } from 'react';
import type { HandHistory } from '../gto/types';
import { read, write } from '../state/persist';

export interface Step {
  id: string;
  label: string;
  detail?: string;
  /** Roughly how many seconds this step takes. */
  seconds: number;
}

const STREETS = ['flop', 'turn', 'river'] as const;
const SUIT: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
const prettyCard = (c: string) => `${c[0] === 'T' ? '10' : c[0]}${SUIT[c[1]] ?? c[1]}`;

/** The solver's size buckets for a stack, in big blinds (gto/flipup_gto/review.py). */
const STACK_BUCKETS = [8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 60, 75, 100, 125, 150, 200, 250];
export function stackBucket(hand: HandHistory): number {
  const bb = hand.big_blind || 1;
  const eff = Math.min(...hand.players.map((p) => p.stack / bb));
  return STACK_BUCKETS.reduce((best, b) => (Math.abs(Math.log(b) - Math.log(Math.max(eff, 1))) < Math.abs(Math.log(best) - Math.log(Math.max(eff, 1))) ? b : best));
}

const configKey = (hand: HandHistory) => `${hand.players.length}p-${stackBucket(hand)}bb`;

/** Seconds to solve a preflop game from scratch, by table size (the service caches it afterwards). */
const FRESH_PREFLOP = [0, 0, 15, 30, 60, 120, 240, 240, 300, 300];

interface Timings {
  /** Average seconds for a whole hand, by how many streets after the flop it reached (0 to 3). */
  byStreets: Record<string, { avg: number; n: number }>;
  seen: string[];
}

const KEY = 'flipup.reviewtimes';

function loadTimings(): Timings {
  const t = read<Timings>(KEY);
  return { byStreets: t?.byStreets ?? {}, seen: Array.isArray(t?.seen) ? t!.seen : [] };
}

function postflopStreets(hand: HandHistory): number {
  return STREETS.filter((s) => hand.actions.some((a) => a.street === s)).length;
}

export function isFirstAtSize(hand: HandHistory): boolean {
  return !loadTimings().seen.includes(configKey(hand));
}

/** The steps for one hand. */
export function planSteps(hand: HandHistory): Step[] {
  const timings = loadTimings();
  const n = hand.players.length;
  const streets = postflopStreets(hand);
  const fresh = !timings.seen.includes(configKey(hand));
  const known = timings.byStreets[String(streets)];
  const steps: Step[] = [];
  const bb = hand.big_blind || 1;
  steps.push({
    id: 'read',
    label: 'Reading the hand',
    detail: `${n} players, blinds ${hand.small_blind}/${hand.big_blind}, ${hand.actions.length} actions${streets ? `, reaches the ${STREETS[streets - 1]}` : ', ends before the flop'}`,
    seconds: 1,
  });
  steps.push({
    id: 'preflop',
    label: fresh ? `Solving ${n}-handed preflop at ${stackBucket(hand)}bb` : `Loading the ${n}-handed preflop solution (${stackBucket(hand)}bb)`,
    detail: fresh ? 'First time at this table size, so the coach solves it from scratch. Later reviews are much faster.' : 'Already solved, so this is a lookup.',
    seconds: fresh ? FRESH_PREFLOP[Math.min(n, 9)] : 2,
  });
  steps.push({ id: 'ranges', label: 'Working out each player’s range from the preflop betting', detail: `${hand.actions.filter((a) => a.street === 'preflop').length} preflop actions`, seconds: 2 });
  for (let i = 0; i < streets; i++) {
    const board = hand.board.slice(0, i === 0 ? 3 : 3 + i).map(prettyCard).join(' ');
    const bets = hand.actions.filter((a) => a.street === STREETS[i]).length;
    steps.push({
      id: STREETS[i],
      label: `Solving the ${STREETS[i]}`,
      detail: `${board} · ${bets} action${bets === 1 ? '' : 's'} to fit into the solution (${Math.round(Math.min(...hand.players.map((p) => p.stack)) / bb)}bb deep)`,
      seconds: i === 0 ? 14 : 8,
    });
  }
  steps.push({ id: 'grade', label: 'Grading each decision against GTO', detail: 'Comparing what was played with what each option is worth', seconds: 2 });
  steps.push({ id: 'explain', label: 'Writing the explanations', seconds: 2 });

  // If hands like this have been reviewed here before, scale the guesses to match what really happened.
  if (known && !fresh) {
    const guess = steps.reduce((a, s) => a + s.seconds, 0);
    const scale = known.avg / guess;
    steps.forEach((s) => (s.seconds = Math.max(0.5, s.seconds * scale)));
  }
  return steps;
}

export const planSeconds = (steps: Step[]) => steps.reduce((a, s) => a + s.seconds, 0);

/** Remembers how long a hand took, once its table size had been solved before (so a cold start doesn't skew the average). */
export function recordTiming(hand: HandHistory, seconds: number): void {
  const t = loadTimings();
  const key = configKey(hand);
  if (t.seen.includes(key)) {
    const k = String(postflopStreets(hand));
    const old = t.byStreets[k];
    t.byStreets[k] = old ? { avg: old.avg * 0.6 + seconds * 0.4, n: old.n + 1 } : { avg: seconds, n: 1 };
  } else {
    t.seen = [...t.seen, key].slice(-40);
  }
  write(KEY, t);
}

export function formatClock(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export function formatLeft(s: number): string {
  if (s < 8) return 'a few seconds';
  if (s < 50) return `about ${Math.round(s / 5) * 5} seconds`;
  const m = Math.round(s / 60);
  return `about ${Math.max(1, m)} minute${m <= 1 ? '' : 's'}`;
}

/**
 * A running clock for a review of `total` hands, given how many the service says are done.
 * Hands finish one at a time, so each hand's own clock restarts when the count goes up.
 */
export function useReviewClock(done: number, total: number) {
  const startedAt = useRef(Date.now());
  const handStartedAt = useRef(Date.now());
  const finished = Math.min(total, Math.floor(done));
  const lastFinished = useRef(0);
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, []);
  if (finished !== lastFinished.current) {
    lastFinished.current = finished;
    handStartedAt.current = Date.now();
  }
  return {
    elapsed: (Date.now() - startedAt.current) / 1000,
    handElapsed: (Date.now() - handStartedAt.current) / 1000,
    finished,
  };
}

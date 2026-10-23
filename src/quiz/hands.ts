// Solved hands: full hands played out ahead of time by the GTO solver (gto/scripts/quiz_hands.py) and
// shipped as static files in public/gto/quiz. Each of your decisions comes with every option, GTO's
// frequency for your exact cards and what each option is worth, so grading is instant and needs no
// server. The hand then carries on the way it was solved, whatever you picked.

import { scoreHand, type Card, type HandRecord, type Move, type Street } from '../game';
import type { Colour } from '../gto/types';

export interface QuizOption {
  label: string;
  kind: Move;
  /** Street wager after the move, in big blinds. */
  to: number;
  /** How often GTO takes it with this exact hand. */
  freq: number;
  /** What it's worth, in big blinds (compare options within one decision); null for a move GTO never makes here. */
  ev: number | null;
}

export interface QuizDecision {
  /** Index of the move in the hand's steps. */
  at: number;
  pot: number;
  toCall: number;
  options: QuizOption[];
  /** The option the hand carries on with. */
  line: number;
  /** Your hand's equity against the other player's range here (postflop). */
  eq?: number | null;
}

export interface QuizHand {
  id: string;
  hero: number;
  villain: number;
  cards: Card[];
  villainCards: Card[];
  board: Card[];
  /** [street initial, seat, move, street wager after it in big blinds]. Seats: 0 UTG ... 5 BB. */
  steps: [string, number, Move, number][];
  decisions: QuizDecision[];
  showdown: boolean;
}

export const POSITIONS = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
/** Chips per big blind in the replayed hand (blinds 50 and 100, 100 big blinds deep). */
export const QUIZ_BB = 100;
const STREETS: Record<string, Street> = { p: 'preflop', f: 'flop', t: 'turn', r: 'river' };
const EMOJIS = ['🦊', '🐻', '🐼', '🦁', '🐯', '🐸'];

export const seatId = (seat: number) => `s${seat}`;

/** The hand as a normal hand record, so the replay table can play it back. */
export function toRecord(h: QuizHand): HandRecord {
  const players = POSITIONS.map((pos, seat) => ({
    id: seatId(seat),
    name: seat === h.hero ? 'You' : pos,
    emoji: EMOJIS[seat],
    seat,
    stack: 100 * QUIZ_BB,
  }));
  const actions = h.steps.map(([s, seat, move, to]) => ({ street: STREETS[s], playerId: seatId(seat), move, to: Math.round(to * QUIZ_BB) }));

  // What each player put in, street by street (the blinds first), to work out who gets the pot.
  const put = new Map<number, number>();
  let wager = new Map<number, number>([
    [4, 0.5 * QUIZ_BB],
    [5, QUIZ_BB],
  ]);
  let street = 'p';
  const close = () => wager.forEach((v, k) => put.set(k, (put.get(k) ?? 0) + v));
  const folded = new Set<number>();
  for (const [s, seat, move, to] of h.steps) {
    if (s !== street) {
      close();
      wager = new Map();
      street = s;
    }
    if (move === 'fold') folded.add(seat);
    else if (move !== 'check') wager.set(seat, Math.round(to * QUIZ_BB));
  }
  close();
  const pot = [...put.values()].reduce((a, b) => a + b, 0);
  const live = [h.hero, h.villain].filter((s) => !folded.has(s));
  let winners = live;
  if (live.length === 2 && h.board.length === 5) {
    const score = (c: Card[]) => scoreHand([...c, ...h.board]);
    const a = score(h.cards);
    const b = score(h.villainCards);
    winners = a > b ? [h.hero] : b > a ? [h.villain] : live;
  }
  const won: Record<string, number> = {};
  winners.forEach((s, i) => (won[seatId(s)] = Math.floor(pot / winners.length) + (i === 0 ? pot % winners.length : 0)));
  return {
    tableId: `quiz-${h.id}`,
    number: 1,
    at: 0,
    smallBlind: QUIZ_BB / 2,
    bigBlind: QUIZ_BB,
    buttonId: seatId(3),
    players,
    actions,
    board: h.board,
    holes: { [seatId(h.hero)]: h.cards, [seatId(h.villain)]: h.villainCards },
    won,
    showdown: h.showdown,
  };
}

export interface QuizGrade {
  colour: Colour;
  /** Big blinds given up against GTO's best option (0 for the best; null for a move GTO never makes here). */
  loss: number | null;
  best: QuizOption;
}

/**
 * Good when GTO takes the option a fair share of the time or it gives up next to nothing; a close call
 * when the gap is small next to the pot; costly otherwise.
 */
export function gradeChoice(d: QuizDecision, pick: number): QuizGrade {
  const solved = d.options.filter((o) => o.ev != null);
  const best = solved.reduce((a, b) => (b.ev! > a.ev! ? b : a), solved[0] ?? d.options[d.line]);
  const o = d.options[pick];
  // A move outside the solved tree: GTO never makes it here, so there's no number to give.
  if (o.ev == null) return { colour: 'red', loss: null, best };
  const loss = Math.max(0, (best.ev ?? o.ev) - o.ev);
  const colour: Colour = o.freq >= 0.15 || loss <= Math.max(0.05, 0.01 * d.pot) ? 'green' : loss <= Math.max(0.5, 0.05 * d.pot) ? 'yellow' : 'red';
  return { colour, loss, best };
}

/** GTO's mix at a decision, most used first, leaving out what it never does. */
export function gtoMix(d: QuizDecision): QuizOption[] {
  return d.options.filter((o) => o.freq >= 0.01).sort((a, b) => b.freq - a.freq);
}

// ── Loading ─────────────────────────────────────────────────────────────────

interface QuizIndex {
  count: number;
  shards: string[];
}

let index: Promise<QuizIndex> | null = null;
const shards = new Map<string, Promise<QuizHand[]>>();

function getJson<T>(path: string): Promise<T> {
  return fetch(path).then((r) => {
    if (!r.ok) throw new Error('No solved hands here yet.');
    return r.json() as Promise<T>;
  });
}

/** A hand you haven't seen (or the least recent one once you've seen them all). */
export async function nextHand(seen: string[]): Promise<QuizHand> {
  index ??= getJson<QuizIndex>('/gto/quiz/index.json').catch((e) => {
    index = null;
    throw e;
  });
  const idx = await index;
  if (idx.shards.length === 0) throw new Error('No solved hands here yet.');
  const done = new Set(seen);
  const order = idx.shards.map((_, i) => i).sort(() => Math.random() - 0.5);
  for (const i of order) {
    const name = idx.shards[i];
    if (!shards.has(name)) shards.set(name, getJson<QuizHand[]>(`/gto/quiz/${name}`));
    const hands = await shards.get(name)!;
    const fresh = hands.filter((h) => !done.has(h.id));
    if (fresh.length) return fresh[Math.floor(Math.random() * fresh.length)];
  }
  // Seen them all: start again from the one seen longest ago.
  const first = idx.shards[0];
  if (!shards.has(first)) shards.set(first, getJson<QuizHand[]>(`/gto/quiz/${first}`));
  const hands = await shards.get(first)!;
  const age = new Map(seen.map((id, i) => [id, i]));
  return [...hands].sort((a, b) => (age.get(a.id) ?? -1) - (age.get(b.id) ?? -1))[0];
}

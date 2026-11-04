// Range training's play on the phone, as pure functions (no storage, no screen): which hands a round, the daily
// three or a Blitz deals, who the opponents are, the hand told as a story, what a bet usually means, their range in
// three piles, one hand they could have, and the points. The hands, grades and numbers are the shared model's
// (src/train/ranges); this only arranges them. Tested in tests/range-play.test.ts.
import { BOTS } from '@/engine';
import { bb, combosOf, type Grade, type OptionId, type Pos, type RangeGroup, type Replay, type Role, type Scenario, type Street } from '@train/ranges/model';

import type { HandNumbers } from './ranges';

export type Mode = 'round' | 'daily' | 'blitz' | 'hand' | 'fix';
export type Level = 'easy' | 'pro';

export const ROUND_SIZE = 5;
export const DAILY_SIZE = 3;
export const BLITZ_MS = 60_000;

const STREETS: Street[] = ['preflop', 'flop', 'turn', 'river'];
/** Board cards showing on each street. */
const SHOWN: Record<Street, number> = { preflop: 0, flop: 3, turn: 4, river: 5 };

/** A small, stable hash (FNV-1a), so the same day or hand always picks the same thing on every phone. */
export function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A seeded random number generator (mulberry32), for shuffles that have to come out the same. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(list: readonly T[], rng: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Today's three hands, the same on every phone for that date ("2026-11-04"). */
export function dailyIds(day: string, all: readonly Scenario[]): string[] {
  return shuffle(
    all.map((s) => s.id),
    seeded(hash(`daily:${day}`)),
  ).slice(0, Math.min(DAILY_SIZE, all.length));
}

/** A round: hands you haven't played the best way first (in a random order), then the rest. */
export function roundIds(grades: Record<string, Grade>, all: readonly Scenario[], size = ROUND_SIZE, rng: () => number = Math.random): string[] {
  const open = shuffle(
    all.filter((s) => grades[s.id] !== 'best'),
    rng,
  );
  const done = shuffle(
    all.filter((s) => grades[s.id] === 'best'),
    rng,
  );
  return [...open, ...done].slice(0, Math.min(size, all.length)).map((s) => s.id);
}

/** Blitz: every hand once in a random order, then again, as long as the clock lasts. */
export function blitzIds(all: readonly Scenario[], rng: () => number = Math.random): string[] {
  const first = shuffle(
    all.map((s) => s.id),
    rng,
  );
  return [...first, ...shuffle(first, rng), ...shuffle(first, rng)];
}

export interface Character {
  name: string;
  emoji: string;
}

/** The app's named bots (Luna, Emma, Kai...), not the regulars with an initial. */
const CAST = (() => {
  const named = BOTS.filter((b) => !b.name.includes(' '));
  return named.length >= 8 ? named : BOTS;
})();

/** Each opponent as one of the app's bots, the same one every time you see that hand, never two alike. */
export function charactersOf(s: Scenario): Record<string, Character> {
  const out: Record<string, Character> = {};
  const used = new Set<string>();
  for (const o of s.opponents) {
    let i = hash(`${s.id}:${o.pos}`) % CAST.length;
    while (used.has(CAST[i].name) || used.has(CAST[i].emoji)) i = (i + 1) % CAST.length;
    used.add(CAST[i].name);
    used.add(CAST[i].emoji);
    out[o.pos] = { name: CAST[i].name, emoji: CAST[i].emoji };
  }
  return out;
}

export interface StoryStep {
  street: Street;
  /** Board cards showing. */
  shown: number;
  /** What happened, in one line ("Emma raises to 2.5bb, you call"). */
  line: string;
  /** The pot at this point. */
  pot: number;
  /** The decision street: the last step. */
  final: boolean;
}

/** The hand as a story, one step a street, with the players' names. `name(pos)` is "you" for your own seat. */
export function storySteps(s: Scenario, r: Replay, name: (pos: Pos) => string): StoryStep[] {
  const streets = STREETS.slice(0, s.board.length - 1);
  return streets.map((street, i) => {
    const final = i === streets.length - 1;
    const moves = s.actions.filter((a) => a.street === street);
    let current = street === 'preflop' ? 1 : 0;
    const phrases = moves.map((m) => {
      const who = name(m.who);
      const you = m.who === s.hero.pos;
      const verb = (plain: string, third: string) => `${who} ${you ? plain : third}`;
      switch (m.move) {
        case 'fold':
          return verb('fold', 'folds');
        case 'check':
          return verb('check', 'checks');
        case 'call': {
          const limp = street === 'preflop' && current === 1;
          if (limp) return m.who === 'SB' ? verb('complete', 'completes') : verb('limp', 'limps');
          return verb('call', 'calls');
        }
        case 'bet':
          current = m.to ?? current;
          return verb(`bet ${bb(m.to ?? 0)}`, `bets ${bb(m.to ?? 0)}`);
        case 'raise':
          current = m.to ?? current;
          return verb(`raise to ${bb(m.to ?? 0)}`, `raises to ${bb(m.to ?? 0)}`);
      }
    });
    const text = phrases.length ? phrases.join(', ') : final ? 'It’s on you' : 'Nobody bets';
    const pot = final ? r.pot : (r.potAt[streets[i + 1]] ?? r.potAt[street] ?? 1.5);
    return { street, shown: SHOWN[street], line: capital(text), pot: tenth(pot), final };
  });
}

/** Rounded to a tenth of a big blind, so sums of bets never show as 16.0999. */
export const tenth = (n: number) => Math.round(n * 10) / 10;

const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** What a player's last move on the decision street usually means, in plain words. */
export function betRead(s: Scenario, r: Replay, pos: Pos): string {
  if (!r.live.includes(pos)) return 'Folded. Out of the hand.';
  const street = streetAt(s);
  let pot = r.potAt[street] ?? 0;
  const put: Partial<Record<Pos, number>> = {};
  let current = 0;
  let read: string | null = null;
  for (const m of s.actions.filter((a) => a.street === street)) {
    const before = pot;
    if (m.move === 'bet' || m.move === 'raise') {
      const to = m.to ?? 0;
      const add = to - (put[m.who] ?? 0);
      if (m.who === pos) {
        const ratio = add / Math.max(0.5, before);
        if (m.move === 'raise' || current > 0) read = 'A raise this late is nearly always a strong hand.';
        else if (ratio <= 0.4) read = 'A small bet: often a medium hand, or a cheap bluff.';
        else if (ratio <= 0.85) read = 'A normal-sized bet: good hands, and some bluffs.';
        else if (ratio <= 1.1) read = 'A pot-sized bet: strong, or trying to push you out.';
        else read = 'Bigger than the pot: very strong, or nothing at all.';
      }
      pot += add;
      put[m.who] = to;
      current = to;
    } else if (m.move === 'call') {
      const add = current - (put[m.who] ?? 0);
      pot += add;
      put[m.who] = current;
      if (m.who === pos) read = 'A call: often a decent hand or a draw, rarely a monster.';
    } else if (m.move === 'check' && m.who === pos) {
      read = 'A check: usually a medium or weak hand.';
    }
  }
  return read ?? 'Acts after you on this street.';
}

/** The street the decision is on. */
export const streetAt = (s: Scenario): Street => (s.board.length === 4 ? 'turn' : 'river');

/** The `why` in a line or two: the first sentence, and the next one too when the first is only a word or a question. */
export function shortWhy(why: string): string {
  const parts = why.split(/(?<=[.!?])\s+/);
  const first = parts[0] ?? why;
  if ((first.length < 40 || first.endsWith('?')) && parts[1]) return `${first} ${parts[1]}`;
  return first;
}

export type PileId = 'behind' | 'close' | 'ahead';

export interface PileGroup {
  label: string;
  role: Role;
  /** Its share of that player's range. */
  share: number;
  /** How often your hand wins against it. */
  equity: number;
  combos: number;
  /** One real combo from it, to show. */
  example: [string, string] | null;
}

export interface Pile {
  id: PileId;
  /** Share of their range in this pile. */
  share: number;
  /** How often you win against the pile. */
  equity: number;
  groups: PileGroup[];
}

/** Which pile a group falls in, by how often your hand wins against it. */
export const pileOf = (equity: number): PileId => (equity < 0.35 ? 'behind' : equity > 0.65 ? 'ahead' : 'close');

/** One opponent's range in three piles: hands that beat you, close ones, and hands you beat. Empty piles are left out. */
export function pilesFor(s: Scenario, numbers: HandNumbers, pos: Pos): Pile[] {
  const opp = s.opponents.find((o) => o.pos === pos);
  const view = numbers.views.find((v) => v.pos === pos);
  if (!opp || !view) return [];
  const dead = [...s.hero.cards, ...s.board];
  const total = view.groups.reduce((n, g) => n + g.weight, 0) || 1;
  const groups: (PileGroup & { pile: PileId })[] = opp.range.map((g: RangeGroup, i) => {
    const v = view.groups[i] ?? { combos: 0, weight: 0, equity: 0 };
    const combos = v.combos ? combosOf(g, dead) : [];
    return {
      label: g.label,
      role: g.role,
      share: v.weight / total,
      equity: v.equity,
      combos: v.combos,
      example: combos.length ? [combos[0][0], combos[0][1]] : null,
      pile: pileOf(v.equity),
    };
  });
  const order: PileId[] = ['behind', 'close', 'ahead'];
  return order
    .map((id) => {
      const inPile = groups.filter((g) => g.pile === id && g.share > 0);
      const share = inPile.reduce((n, g) => n + g.share, 0);
      const equity = share ? inPile.reduce((n, g) => n + g.equity * g.share, 0) / share : 0;
      return { id, share, equity, groups: inPile.sort((a, b) => b.share - a.share).map(({ pile: _pile, ...g }) => g) };
    })
    .filter((p) => p.share > 0);
}

export interface Sampled {
  pos: Pos;
  cards: [string, string];
  label: string;
  role: Role;
}

/**
 * One hand each live opponent could have, drawn from their range by how often they play it this way, with no card
 * held twice. Only a picture of one possibility: the grade never depends on it.
 */
export function sampleHands(s: Scenario, r: Replay, rng: () => number = Math.random): Sampled[] {
  const used = new Set<string>([...s.hero.cards, ...s.board]);
  const out: Sampled[] = [];
  for (const o of s.opponents.filter((x) => r.live.includes(x.pos))) {
    const pool = o.range.flatMap((g) => combosOf(g, [...used]).map((c) => ({ c, g, w: g.weight ?? 1 })));
    if (!pool.length) continue;
    const total = pool.reduce((n, e) => n + e.w, 0);
    let x = rng() * total;
    let pick = pool[pool.length - 1];
    for (const e of pool) {
      x -= e.w;
      if (x <= 0) {
        pick = e;
        break;
      }
    }
    used.add(pick.c[0]);
    used.add(pick.c[1]);
    out.push({ pos: o.pos, cards: [pick.c[0], pick.c[1]], label: pick.g.label, role: pick.g.role });
  }
  return out;
}

/** The opponent who matters most: whoever made the biggest bet on this street, else the first one still in. */
export function mainOpponent(s: Scenario, r: Replay): Pos | null {
  const live = s.opponents.filter((o) => r.live.includes(o.pos)).map((o) => o.pos);
  if (!live.length) return null;
  return [...live].sort((a, b) => (r.bets[b] ?? 0) - (r.bets[a] ?? 0))[0];
}

/** "Worth it" when your chance to win beats the price. */
export const worthIt = (equity: number, price: number): boolean => equity >= price;

// ── Points ──────────────────────────────────────────────────────────────────

export const POINTS: Record<Grade, number> = { best: 100, ok: 60, mistake: 0 };

/**
 * A hand's points. Locked in (Pro): a best play counts double, and a miss costs 50. A guess at your chance to win
 * (Pro) adds 30 within 5 points of the truth and 15 within 10.
 */
export function handPoints(grade: Grade, opts: { locked?: boolean; guess?: number | null; equity?: number } = {}): { points: number; bonus: number } {
  let points = POINTS[grade];
  if (opts.locked) points = grade === 'best' ? points * 2 : grade === 'mistake' ? -50 : points;
  let bonus = 0;
  if (opts.guess != null && opts.equity != null) {
    const off = Math.abs(opts.guess - Math.round(opts.equity * 100));
    bonus = off <= 5 ? 30 : off <= 10 ? 15 : 0;
  }
  return { points, bonus };
}

/** Stars for a finished round or daily, by the share of the most a plain answer can score. */
export function starsFor(score: number, hands: number): 0 | 1 | 2 | 3 {
  const most = hands * POINTS.best || 1;
  const f = score / most;
  return f >= 0.8 ? 3 : f >= 0.5 ? 2 : f >= 0.2 ? 1 : 0;
}

/** Blitz's multiplier for a run of good answers: ×1, then ×2 from the third, ×3 from the sixth. */
export const blitzMultiplier = (run: number): number => (run >= 6 ? 3 : run >= 3 ? 2 : 1);

/** A Blitz answer's points: best 100, also good 50, times the run's multiplier (the run counts this answer). */
export function blitzPoints(grade: Grade, run: number): number {
  if (grade === 'mistake') return 0;
  return (grade === 'best' ? 100 : 50) * blitzMultiplier(run);
}

/** The share line's squares: gold for best, violet for also good, black for a miss. */
export const SQUARE: Record<Grade, string> = { best: '🟨', ok: '🟪', mistake: '⬛' };
export const squares = (grades: Grade[]): string => grades.map((g) => SQUARE[g]).join('');

/** What a pick puts in, for the chips that fly: nothing for a fold or a check. */
export const putsChips = (id: OptionId): boolean => id !== 'fold' && id !== 'check';

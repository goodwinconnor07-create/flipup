import { describe, expect, it, vi } from 'vitest';

import { replay } from '@train/ranges/model';
import { SCENARIOS } from '@train/ranges/scenarios';

// Range training's play on the phone (src/state/range-logic.ts and the words in components/ranges/words.ts): the
// daily three, rounds, the opponents, the story, the piles, the sampled hands and the points.
vi.mock('expo-sqlite/localStorage/install', () => ({}));
vi.mock('../src/components/icon', () => ({}));

const logic = await import('../src/state/range-logic');
const { numbersFor } = await import('../src/state/ranges');
const { TRICKS } = await import('../src/components/ranges/words');

describe('Range training play', () => {
  it('names every hand’s concept as a trick', () => {
    for (const s of SCENARIOS) expect(TRICKS[s.concept], s.concept).toBeDefined();
  });

  it('deals the same three different hands for a day on every phone', () => {
    const a = logic.dailyIds('2026-11-04', SCENARIOS);
    expect(a).toEqual(logic.dailyIds('2026-11-04', SCENARIOS));
    expect(new Set(a).size).toBe(logic.DAILY_SIZE);
    expect(logic.dailyIds('2026-11-05', SCENARIOS)).not.toEqual(a);
  });

  it('starts a round with the hands you haven’t got right yet', () => {
    const grades = Object.fromEntries(SCENARIOS.slice(0, -2).map((s) => [s.id, 'best' as const]));
    const ids = logic.roundIds(grades, SCENARIOS, 5, logic.seeded(1));
    expect(ids).toHaveLength(5);
    expect(new Set(ids.slice(0, 2))).toEqual(new Set(SCENARIOS.slice(-2).map((s) => s.id)));
  });

  it('tells each hand as a story that ends on the decision, with the pot', () => {
    for (const s of SCENARIOS) {
      const r = replay(s);
      const chars = logic.charactersOf(s);
      expect(new Set(Object.values(chars).map((c) => c.name)).size).toBe(s.opponents.length);
      const steps = logic.storySteps(s, r, (p) => (p === s.hero.pos ? 'you' : chars[p].name));
      expect(steps).toHaveLength(s.board.length - 1);
      expect(steps.at(-1)!.final).toBe(true);
      expect(steps.at(-1)!.pot).toBeCloseTo(r.pot, 1);
      expect(steps.at(-1)!.shown).toBe(s.board.length);
      for (const step of steps) expect(step.line.length).toBeGreaterThan(3);
    }
  });

  it('reads the bettor’s move on every hand you face a bet', () => {
    for (const s of SCENARIOS) {
      const r = replay(s);
      if (r.toCall <= 0) continue;
      const bettor = logic.mainOpponent(s, r)!;
      expect(logic.betRead(s, r, bettor)).not.toBe('Acts after you on this street.');
    }
  });

  it('splits each range into piles that add up to the whole range', () => {
    for (const s of SCENARIOS) {
      const r = replay(s);
      const numbers = numbersFor(s, r);
      for (const pos of r.live) {
        const piles = logic.pilesFor(s, numbers, pos);
        expect(piles.length).toBeGreaterThan(0);
        expect(piles.reduce((n, p) => n + p.share, 0)).toBeCloseTo(1, 5);
      }
    }
  });

  it('draws hands the opponents could have, never a card twice', () => {
    for (const s of SCENARIOS) {
      const r = replay(s);
      const hands = logic.sampleHands(s, r, logic.seeded(7));
      expect(hands).toHaveLength(r.live.length);
      const cards = [...s.hero.cards, ...s.board, ...hands.flatMap((h) => h.cards)];
      expect(new Set(cards).size).toBe(cards.length);
    }
  });

  it('keeps the short why to a sentence or two', () => {
    for (const s of SCENARIOS) {
      const short = logic.shortWhy(s.why);
      expect(short.length).toBeGreaterThan(20);
      expect(s.why.startsWith(short)).toBe(true);
    }
  });

  it('scores locks, guesses, stars and Blitz runs', () => {
    expect(logic.handPoints('best')).toEqual({ points: 100, bonus: 0 });
    expect(logic.handPoints('best', { locked: true }).points).toBe(200);
    expect(logic.handPoints('mistake', { locked: true }).points).toBe(-50);
    expect(logic.handPoints('ok', { guess: 40, equity: 0.37 }).bonus).toBe(30);
    expect(logic.handPoints('ok', { guess: 40, equity: 0.31 }).bonus).toBe(15);
    expect(logic.starsFor(500, 5)).toBe(3);
    expect(logic.starsFor(260, 5)).toBe(2);
    expect(logic.starsFor(0, 5)).toBe(0);
    expect(logic.blitzPoints('best', 1)).toBe(100);
    expect(logic.blitzPoints('best', 3)).toBe(200);
    expect(logic.blitzPoints('ok', 6)).toBe(150);
    expect(logic.squares(['best', 'ok', 'mistake'])).toBe('🟨🟪⬛');
  });
});

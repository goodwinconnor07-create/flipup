import { describe, expect, it } from 'vitest';
import { equity } from '../../game/equity';
import { ahead, alpha, baseCombos, bluffShare, callEV, countCombos, countOuts, hitChance, impliedNeed, mdf, potOddsNeed, semiBluffEV } from './math';
import { allQuestions, deal, MATCHUPS, SPECS, type TopicId } from './bank';

const S = (s: string) => s.match(/../g) ?? [];

describe('odds maths', () => {
  it('matches the textbook numbers', () => {
    expect(hitChance(9, 47, 2)).toBeCloseTo(0.3497, 3);
    expect(hitChance(8, 47, 2)).toBeCloseTo(0.3145, 3);
    expect(hitChance(15, 47, 2)).toBeCloseTo(0.5412, 3);
    expect(hitChance(9, 46, 1)).toBeCloseTo(0.1957, 3);
    expect(potOddsNeed(100, 50)).toBe(0.25);
    expect(potOddsNeed(100, 100)).toBeCloseTo(1 / 3);
    expect(mdf(100, 50)).toBeCloseTo(2 / 3);
    expect(alpha(100, 100)).toBe(0.5);
    expect(bluffShare(100, 100)).toBeCloseTo(1 / 3);
    expect(baseCombos({ cls: 'AK' })).toBe(16);
    expect(baseCombos({ cls: 'AKs' })).toBe(4);
    expect(baseCombos({ cls: 'AKo' })).toBe(12);
    expect(baseCombos({ cls: 'QQ' })).toBe(6);
  });

  it('breaks even where the formulas say', () => {
    // A call at exactly the pot odds price has zero EV; implied odds fill the gap exactly.
    expect(callEV(100, 50, potOddsNeed(100, 50))).toBeCloseTo(0, 9);
    const eq = 9 / 46;
    const extra = impliedNeed(100, 100, eq);
    expect(eq * (100 + 100 + extra) - (1 - eq) * 100).toBeCloseTo(0, 9);
    // A semi-bluff with no equity is just a bluff; with folds at alpha it breaks even.
    expect(semiBluffEV(100, 100, alpha(100, 100), 0)).toBeCloseTo(0, 9);
  });

  it('counts outs card by card', () => {
    expect(countOuts(S('AhKh'), S('QsJd'), S('Qh7h2c4s')).outs).toHaveLength(15);
    expect(countOuts(S('Ah5h'), S('KsKd'), S('Kh9h9c3d')).outs).toHaveLength(0);
    expect(countCombos([{ cls: 'KK' }, { cls: '77' }, { cls: '22' }], S('AsKdKh7c2d'))).toBe(7);
  });
});

describe('question bank', () => {
  const qs = allQuestions();

  it('has plenty of questions in every topic', () => {
    expect(qs.length).toBeGreaterThanOrEqual(140);
    const topics: TopicId[] = ['outs', 'equity', 'potodds', 'call', 'implied', 'mdf', 'bluff', 'ratio', 'combos', 'spr', 'ev', 'preflop'];
    for (const t of topics) expect(qs.filter((q) => q.topic === t).length, t).toBeGreaterThanOrEqual(5);
    expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length);
  });

  it('gives every question one right answer among distinct choices', () => {
    for (const q of qs) {
      expect(q.choices.length, q.id).toBeGreaterThanOrEqual(2);
      expect(new Set(q.choices).size, q.id).toBe(q.choices.length);
      expect(q.answer, q.id).toBeGreaterThanOrEqual(0);
      expect(q.answer, q.id).toBeLessThan(q.choices.length);
      expect(q.steps.length, q.id).toBeGreaterThan(0);
      expect(q.steps.join(' '), q.id).not.toMatch(/NaN|undefined|Infinity/);
      expect(q.prompt, q.id).not.toMatch(/NaN|undefined/);
    }
  });

  it('never shows the same card twice', () => {
    for (const q of qs) {
      const seen = [...(q.hero ?? []), ...(q.villain ?? []), ...(q.board ?? [])];
      expect(new Set(seen).size, q.id).toBe(seen.length);
    }
  });

  it('only asks for outs when you are behind, and never offers the answer as a trap', () => {
    for (const s of [...SPECS.TURN_SPOTS, ...SPECS.FLOP_SPOTS]) {
      expect(ahead(S(s.hero), S(s.villain), S(s.board)), s.hero + s.board).toBe(false);
      if (s.trap != null) expect(countOuts(S(s.hero), S(s.villain), S(s.board)).outs.length).not.toBe(s.trap);
    }
  });

  it('writes combo explanations that state the right count', () => {
    for (const c of SPECS.COMBOS) {
      const dead = [...S(c.hero ?? ''), ...S(c.board ?? '')];
      const n = countCombos(c.classes, dead);
      const nums = c.explain.match(/\d+/g)!.map(Number);
      expect(nums, c.prompt).toContain(n);
    }
  });

  it('keeps call-or-fold spots clear of the break-even line', () => {
    for (const c of SPECS.CALLS) {
      const two = c.street === 'flop all-in';
      const eq = hitChance(c.outs, c.street === 'turn' ? 46 : 47, two ? 2 : 1);
      expect(Math.abs(eq - potOddsNeed(c.pot, c.bet)), c.draw).toBeGreaterThan(0.02);
    }
  });

  it('has the preflop matchups right', () => {
    for (const [a, b, eq] of MATCHUPS) {
      const e = equity([S(a), S(b)], [], 40000);
      expect(e.win[0] + e.tie[0] / 2, a + b).toBeCloseTo(eq, 1);
    }
  });

  it('deals a round from one topic or all of them', () => {
    let seed = 1;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    expect(deal('mdf', 10, rng).every((q) => q.topic === 'mdf')).toBe(true);
    expect(deal('mixed', 10, rng)).toHaveLength(10);
  });
});

import { describe, expect, it } from 'vitest';
import { drillFromFile, PREFLOP_SCENARIOS, type PFile } from './preflop';
import raw from '../../public/gto/preflop-6p-100bb.json?raw';
import reference from './preflop.reference.json';

const file = JSON.parse(raw) as PFile;

describe('local preflop drills', () => {
  it("matches the solver's own numbers for hands at known spots", () => {
    for (const r of reference as { path: number[]; cls: string; labels: string[]; reach: number; strat: number[]; ev: number[] }[]) {
      const node = file.nodes[r.path.join('.')];
      expect(node, `node ${r.path}`).toBeTruthy();
      const c = file.classes.indexOf(r.cls);
      expect(node.reach[c] / 100).toBeCloseTo(r.reach, 1);
      r.strat.forEach((x, i) => expect(node.strat[i][c] / 100).toBeCloseTo(x, 1));
      r.ev.forEach((x, i) => expect(node.ev[i][c] / 100).toBeCloseTo(x, 1));
    }
  });

  it('deals every scenario, with a sound answer', () => {
    for (const s of PREFLOP_SCENARIOS) {
      for (let seed = 1; seed <= 60; seed++) {
        const d = drillFromFile(file, s.id, seed);
        expect(d.scenario).toBe(s.id);
        expect(d.street).toBe('preflop');
        expect(d.hand).toMatch(/^[2-9TJQKA][cdhs][2-9TJQKA][cdhs]$/);
        expect(d.actions.length).toBe(d.answer.options.length);
        // Frequencies add up, and the best action has the most EV.
        const total = d.answer.options.reduce((a, o) => a + o.frequency, 0);
        expect(total).toBeGreaterThan(0.97);
        expect(total).toBeLessThan(1.03);
        const top = Math.max(...d.answer.options.map((o) => o.ev_bb));
        expect(d.answer.options.find((o) => o.action === d.answer.best_action)!.ev_bb).toBe(top);
        expect(d.answer.options.every((o) => o.colour !== null)).toBe(true);
        expect(d.pot_bb).toBeGreaterThan(0);
      }
    }
  });

  it('is repeatable for a seed and different across seeds', () => {
    expect(drillFromFile(file, 'rfi', 7)).toEqual(drillFromFile(file, 'rfi', 7));
    const hands = new Set(Array.from({ length: 30 }, (_, i) => drillFromFile(file, 'rfi', i).hand));
    expect(hands.size).toBeGreaterThan(10);
  });

  it('opens sensibly: aces raise, seven-deuce folds, from the first seat', () => {
    const node = file.nodes[''];
    const at = (cls: string) => file.classes.indexOf(cls);
    const raise = node.actions.findIndex((a) => a.t === 'raise');
    expect(node.strat[raise][at('AA')]).toBeGreaterThan(95);
    expect(node.strat[0][at('72o')]).toBeGreaterThan(95);
  });
});

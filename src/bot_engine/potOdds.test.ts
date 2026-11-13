import { describe, expect, it } from 'vitest';
import type { Card } from '../game/cards';
import { informationFor } from './information';
import { everydayThought } from './everydayLive';
import { applyPotOdds, realisation } from './potOdds';
import { recordedHand } from './testFixtures';

function tables(n: number, hole?: Card[], flopBet?: number) {
  const out: NonNullable<ReturnType<typeof recordedHand>>[] = [];
  for (let seed = 1; out.length < n && seed < 300; seed++) {
    const t = recordedHand(seed, hole, flopBet);
    if (t) out.push(t);
  }
  return out;
}

const foldShare = (t: NonNullable<ReturnType<typeof recordedHand>>) => {
  everydayThought(t.game, t.sb);
  const trace = t.game.botTable!.traces.at(-1)!;
  return trace.finalDistribution[trace.prediction.actions.findIndex((a) => a.move === 'fold')];
};

describe('pot-odds check', () => {
  it('calls with pocket nines for 20 into 250 (the recorded hand)', () => {
    const folds = tables(8).map(foldShare);
    const avg = folds.reduce((a, b) => a + b, 0) / folds.length;
    // It needs 7.4%; the nines win 11 to 19% of the time against these ranges. A borderline table may still fold.
    expect(avg).toBeLessThan(0.25);
    expect(folds.filter((f) => f <= 0.1).length).toBeGreaterThanOrEqual(6);
  }, 60_000);

  it('still lets nothing fold to the same small bet', () => {
    const [t] = tables(1, ['7h', '2c']);
    const info = informationFor(t.game, t.sb);
    const fold = [1, 0, 0, 0, 0, 0, 0];
    const r = applyPotOdds(info, [{ move: 'fold' }, { move: 'call' }, ...Array(5).fill({ move: 'raise', to: 100 })], fold);
    expect(r.distribution).toEqual(fold);
    expect(r.note).toBeNull();
  });

  it('leaves a big bet to the model', () => {
    const [t] = tables(1, ['9h', '9d'], 900);
    const info = informationFor(t.game, t.sb);
    const dist = [0.9, 0.1, 0];
    const r = applyPotOdds(info, [{ move: 'fold' }, { move: 'call' }, { move: 'raise', to: 3000 }], dist);
    expect(r.distribution).toEqual(dist);
    expect(r.check).toBeUndefined();
  });

  it('only moves fold to call: never adds a raise or a fold, and still sums to one', () => {
    for (const t of tables(4)) {
      const info = informationFor(t.game, t.sb);
      const dist = [0.7, 0.1, 0.15, 0.05];
      const r = applyPotOdds(info, [{ move: 'fold' }, { move: 'call' }, { move: 'raise', to: 60 }, { move: 'raise', to: 300 }], dist);
      expect(r.distribution[0]).toBeLessThanOrEqual(dist[0]);
      expect(r.distribution[2]).toBe(dist[2]);
      expect(r.distribution[3]).toBe(dist[3]);
      expect(r.distribution.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    }
  });

  it('keeps all its equity on the river and less with streets to come or players behind', () => {
    expect(realisation('river', 0)).toBe(1);
    expect(realisation('flop', 0)).toBeLessThan(realisation('turn', 0));
    expect(realisation('flop', 2)).toBeLessThan(realisation('flop', 0));
    expect(realisation('flop', 9)).toBeGreaterThanOrEqual(0.6);
  });

  it('does nothing before the flop', () => {
    const [t] = tables(1);
    const info = { ...informationFor(t.game, t.sb), street: 'preflop' as const };
    const dist = [1, 0];
    expect(applyPotOdds(info, [{ move: 'fold' }, { move: 'call' }], dist).distribution).toBe(dist);
  });
});

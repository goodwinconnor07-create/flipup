import { describe, expect, it } from 'vitest';
import { calibrationContexts } from './calibration';
import { inferRanges } from './ranges';
import { BaselineProvider } from './strategy';
import { blueprintMix } from './blueprint';
import { legalActions } from './information';

describe('Street-aware strategy', () => {
  it('weights flop aggression by made strength instead of starting-hand rank', () => {
    const info = structuredClone(calibrationContexts().find((i) => i.street === 'river')!);
    info.hole = ['Ts', '9s'];
    info.board = ['7s', '7h', '2c', '4d', '5c'];
    const opponent = info.players.find((p) => p.id !== info.heroId)!.id;
    info.actions = [{ playerId: opponent, street: 'flop', move: 'bet', to: 20 }];
    const odds = (revision: 'legacy' | 'street-aware') => {
      const range = inferRanges(info, revision)[0];
      const weight = (a: string, b: string) => range.holdings.find((h) => h.cards.includes(a) && h.cards.includes(b))!.weight;
      return weight('7c', '7d') / weight('As', 'Ah');
    };
    expect(odds('legacy')).toBeLessThan(1);
    expect(odds('street-aware')).toBeGreaterThan(1);
    const before = odds('street-aware');
    info.board = ['7s', '7h', '2c', '4h', '5h'];
    expect(odds('street-aware')).toBeCloseTo(before, 10);
  });
  it('reports coarse coverage honestly and never blends multiplayer or all-in states', () => {
    const info = calibrationContexts().find((i) => i.street === 'turn')!;
    const actions = legalActions(info),
      p = actions.map(() => 1 / actions.length),
      values = actions.map(() => 0);
    expect(blueprintMix(info, actions, p, values)).not.toBeNull();
    const allIn = structuredClone(info);
    allIn.players.find((p) => p.id !== info.heroId)!.allIn = true;
    expect(blueprintMix(allIn, actions, p, values)).toBeNull();
    const prediction = new BaselineProvider().predict(info);
    expect(prediction.modelVersion).toBe('baseline-3');
    expect(prediction.source).toBe('coarse-blueprint-blend');
    expect(new BaselineProvider(160, 'baseline-2').predict(info).modelVersion).toBe('baseline-2');
  });
});

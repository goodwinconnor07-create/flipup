import { describe, expect, it } from 'vitest';
import { calibratePopulation, calibrationContexts, policyDistance } from './calibration';
import { validateInformation, legalActions } from './information';
import { BotFactory, validateProfile } from './identity';
import { BotService } from './service';
import { emptyMemory } from './memory';
import { normalize, type StrategyPrediction } from './strategy';

describe('Measured identity variation and deviation limits', () => {
  it('uses actual legal contexts across all four streets and computes total variation correctly', () => {
    const contexts = calibrationContexts();
    expect(new Set(contexts.map((i) => i.street))).toEqual(new Set(['preflop', 'flop', 'turn', 'river']));
    contexts.forEach(validateInformation);
    expect(policyDistance([[0.2, 0.8]], [[0.5, 0.5]])).toBeCloseTo(0.3);
    expect(policyDistance([[0.2, 0.8]], [[0.2, 0.8]])).toBe(0);
  });
  it('accepts 20 distinguishable profiles on the battery and labels impossible diversity honestly', () => {
    const population = calibratePopulation(20);
    expect(population.status).toBe('accepted');
    expect(population.profiles).toHaveLength(20);
    expect(population.profiles[0].profile.seed).toBe(1001);
    expect(population.profiles.slice(1).every((p) => p.nearestPolicyDistance! >= population.minimumDistance)).toBe(true);
    expect(
      population.profiles.every((p) => Math.abs(Object.values(p.sampledActionFrequencies).reduce((a, b) => a + b, 0) - 1) < 1e-10),
    ).toBe(true);
    const impossible = calibratePopulation(2, 1001, 1, 3);
    expect(impossible.status).toBe('insufficient-diversity');
    expect(impossible.profiles).toHaveLength(1);
  }, 30000);
  it('bounds estimated chip loss even when a preference favors a much worse action', () => {
    const info = calibrationContexts()[0];
    const profile = new BotFactory().generate(info.heroId, 1);
    profile.traits.aggression = 1;
    profile.traits.curiosity = 0;
    const actions = legalActions(info);
    const prediction: StrategyPrediction = {
      actions,
      probabilities: actions.map(() => 1 / actions.length),
      values: actions.map((a) => (a.to !== undefined ? -1e6 : 0)),
      equity: 0.4,
      equityStandardError: 0.01,
      source: 'range-equity-fallback',
      coverage: 'fallback',
      modelVersion: 'baseline-2',
      warnings: ['Synthetic loss-budget test'],
    };
    const result = new BotService({ predict: () => prediction }).decide(info, profile, emptyMemory(info.heroId, info.tableId), 1);
    const expected = (probs: number[]) => probs.reduce((sum, p, n) => sum + p * prediction.values![n], 0);
    expect(expected(prediction.probabilities) - expected(result.finalDistribution)).toBeLessThanOrEqual(result.deviation.budget + 1e-7);
    expect(result.deviation.blend).toBeLessThan(1);
  });
  it('rejects incomplete persisted traits and normalizes huge finite weights without overflow', () => {
    expect(() => validateProfile({ ...new BotFactory().generate('test', 1), traits: {} } as ReturnType<BotFactory['generate']>)).toThrow(
      'Invalid profile',
    );
    expect(normalize([Number.MAX_VALUE, Number.MAX_VALUE])).toEqual([0.5, 0.5]);
  });
});

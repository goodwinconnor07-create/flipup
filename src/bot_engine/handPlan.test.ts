import { describe, expect, it } from 'vitest';
import { calibrationContexts } from './calibration';
import { BotFactory } from './identity';
import { everydayProfile } from './everyday';
import { handIntent, ownHandKind, planForHand } from './handPlan';
import { BotService } from './service';
import { emptyMemory } from './memory';
import { legalActions } from './information';
import type { StrategyPrediction } from './strategy';

describe('Whole-hand continuity', () => {
  it('recognizes a private improvement to a made river board', () => {
    expect(ownHandKind(['Ah', '2c'], ['Kh', 'Jh', '9h', '7h', '4h'])).toMatchObject({ level: 10, label: 'Flushes' });
    expect(ownHandKind(['Tc', '3c'], ['5h', '6s', '7d', '8c', '9h'])).toMatchObject({ level: 9, label: 'Straights' });
    expect(ownHandKind(['Ac', '2c'], ['As', 'Ah', 'Ad', 'Kh', 'Kd']).level).toBe(11);
  });
  it('revises a semi-bluff after improvement, a missed draw, and new opposing strength', () => {
    const hole = ['Ah', 'Kh'],
      turn = ['2h', '7h', 'Qc', '3c'];
    expect(handIntent(hole, turn, turn.slice(0, 3), true, false).intent).toBe('semi-bluff');
    expect(handIntent(hole, [...turn, 'Jh'], turn, true, false)).toMatchObject({ intent: 'value', completedDraw: true });
    expect(handIntent(hole, [...turn, '9d'], turn, true, false)).toMatchObject({ intent: 'give-up', missedDraw: true });
    expect(handIntent(['8s', '6c'], [...turn, '9d'], turn, true, true).intent).toBe('give-up');
    expect(handIntent(['Qs', 'Jc'], [...turn, '9d'], turn, true, true).intent).toBe('bluff-catch');
    expect(handIntent(['8s', '7s'], ['6h', '5c', '8d', '7d'], ['6h', '5c', '8d'], true, false)).toMatchObject({
      intent: 'value',
      improved: true,
      completedDraw: false,
    });
  });
  it('keeps hand-level pressure choices through retries and reloads while updating the reason', () => {
    const i = structuredClone(calibrationContexts().find((i) => i.street === 'turn')!);
    const profile = everydayProfile(new BotFactory().generate(i.heroId, 1001), 'Mick');
    const first = planForHand(i, profile);
    i.sequence += 2;
    expect(planForHand(JSON.parse(JSON.stringify(i)), JSON.parse(JSON.stringify(profile))).lineId).toBe(first.lineId);
    expect(planForHand(i, profile).selectivePressure).toBe(first.selectivePressure);
    i.hand++;
    expect(planForHand(i, profile).lineId).not.toBe(first.lineId);
  });
  it('affects final decisions, retains the cost bound, and is absent in historical models', () => {
    const i = structuredClone(calibrationContexts().find((i) => i.street === 'river' && i.legal.canCheck)!);
    i.hole = ['Ah', 'Kh'];
    i.board = ['2h', '7h', 'Qc', '3c', '9d'];
    i.actions = [{ playerId: i.heroId, street: 'turn', move: 'bet', to: 20 }];
    const actions = legalActions(i);
    const prediction: StrategyPrediction = {
      actions,
      modelVersion: 'baseline-7',
      source: 'multi-street-lookahead',
      coverage: 'modelled',
      probabilities: actions.map(() => 1 / actions.length),
      values: actions.map(() => 0),
      rolloutValues: actions.map(() => 0),
      equity: 0.5,
      equityStandardError: 0,
      warnings: [],
    };
    const profile = everydayProfile(new BotFactory().generate(i.heroId, 1), 'Mick');
    const memory = emptyMemory(i.heroId, i.tableId);
    const run = () => new BotService({ predict: () => structuredClone(prediction) }).decide(i, profile, memory, 2);
    const missed = run();
    expect(missed.handPlan?.reason).toBe('draw-missed');
    expect(missed.coherenceWeights?.some((v) => v !== 0)).toBe(true);
    expect(missed.deviation.estimatedValueLoss!).toBeLessThanOrEqual(missed.deviation.budget);
    const aggression = (t: ReturnType<typeof run>) =>
      t.prediction.actions.reduce((s, a, k) => s + (a.to !== undefined ? t.finalDistribution[k] : 0), 0);
    i.board[4] = 'Jh';
    expect(aggression(run())).toBeGreaterThan(aggression(missed));
    prediction.modelVersion = 'baseline-6';
    i.board[4] = '9d';
    const historical = run();
    expect(historical.handPlan).toBeUndefined();
    expect(historical.finalDistribution).not.toEqual(missed.finalDistribution);
  });
});

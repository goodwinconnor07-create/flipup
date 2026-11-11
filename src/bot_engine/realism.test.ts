import { describe, expect, it } from 'vitest';
import { RealismAudit, rateInterval } from './realism';
import { calibrationContexts } from './calibration';
import { BotService } from './service';
import { BotFactory } from './identity';
import { emptyMemory } from './memory';
import { legalActions } from './information';
import type { StrategyPrediction } from './strategy';
import { simulate } from './simulation';

function trace() {
  const i = structuredClone(calibrationContexts().find((i) => i.street === 'flop' && i.legal.canCheck)!);
  i.hole = ['As', 'Ah'];
  i.board = ['Ad', 'Kd', '2c'];
  const actions = legalActions(i);
  const p: StrategyPrediction = {
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
  return new BotService({ predict: () => p }).decide(i, new BotFactory().generate(i.heroId, 1), emptyMemory(i.heroId, i.tableId), 1);
}
describe('Automated realism diagnostics', () => {
  it('keeps a trace observer outside the agent information and action boundary', () => {
    const options = { everyday: 'casual' as const, pairedDecks: true };
    const before = simulate(6, 81819, 3, options);
    let observed = 0;
    const after = simulate(6, 81819, 3, {
      ...options,
      onDecision: (t) => {
        observed++;
        expect(JSON.stringify(t.information)).not.toMatch(/deck|botTable|humanPoker/);
        expect(t.information.players.every((p) => !('cards' in p))).toBe(true);
        t.action = { move: 'bet', to: 100000000 };
        t.information.hole = ['As', 'As'];
      },
    });
    expect(observed).toBeGreaterThan(0);
    expect(after.handReturnsBb).toEqual(before.handReturnsBb);
    expect(after.behavior).toEqual(before.behavior);
  });
  it('detects a repetitive whole-hand script across distinct deals', () => {
    const audit = new RealismAudit(),
      template = trace();
    for (let hand = 0; hand < 40; hand++)
      for (const street of ['flop', 'turn'] as const) {
        const t = structuredClone(template);
        t.information.hand = hand;
        t.information.street = street;
        if (street === 'turn') t.information.board.push('3h');
        t.decisionId = `${hand}:${street}`;
        const check = t.prediction.actions.findIndex((a) => a.move === 'check');
        t.action = { move: 'check' };
        t.finalDistribution = t.finalDistribution.map((_, k) => Number(k === check));
        audit.observe(t);
      }
    const r = audit.report();
    expect(r.repetition.qualifyingHands).toBe(40);
    expect(r.repetition.dominantLineShare).toBe(1);
    expect(r.flags).toContain('repetitive-whole-hand-line');
  });
  it('detects a deterministic sizing tell only after enough comparable observations', () => {
    const audit = new RealismAudit(),
      template = trace();
    const raises = template.prediction.actions.map((a, k) => ({ a, k })).filter(({ a }) => a.to !== undefined);
    const small = raises[0].k,
      large = raises[Math.min(raises.length - 1, 3)].k;
    for (let hand = 0; hand < 24; hand++) {
      const t = structuredClone(template),
        value = hand % 2 === 0;
      t.information.hole = value ? ['As', 'Ah'] : ['8s', '6c'];
      t.handPlan = undefined;
      t.decisionId = `size-${hand}`;
      const selected = value ? large : small;
      t.finalDistribution = t.finalDistribution.map((_, k) => Number(k === selected));
      t.action = t.prediction.actions[selected];
      audit.observe(t);
      if (hand === 3) {
        expect(audit.report().flags).not.toContain('near-perfect-context-matched-sizing-tell');
        expect(audit.report().sizing.comparisons[0].coverage).toBe('insufficient');
      }
    }
    expect(audit.report().flags).toContain('near-perfect-context-matched-sizing-tell');
  });
  it('deduplicates retries, distinguishes missing coverage, and catches illegal actions and cost overruns', () => {
    const audit = new RealismAudit(),
      t = trace();
    audit.observe(t);
    audit.observe(structuredClone(t));
    expect(audit.report().decisions).toBe(1);
    audit.observe(t, 'different-table');
    expect(audit.report().decisions).toBe(2);
    expect(audit.report().repetition.dominantLineShare).toBeNull();
    t.decisionId += '-bad';
    t.action = { move: 'bet', to: 100000000 };
    t.deviation.estimatedValueLoss = 1000;
    audit.observe(t);
    expect(audit.report().flags).toEqual(expect.arrayContaining(['illegal-action', 'cost-budget']));
    expect(rateInterval(0, 0)).toBeNull();
    expect(rateInterval(0, 10)![1]).toBeGreaterThan(0);
  });
});

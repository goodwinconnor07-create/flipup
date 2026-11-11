import { describe, expect, it } from 'vitest';
import { PERSONALITIES, withPersonality, personalityWeights } from './personalities';
import { BotFactory, validateProfile } from './identity';
import { decisionFixture } from './testFixtures';
import { BotService } from './service';
import { emptyMemory } from './memory';
import { simulate } from './simulation';
import { calibrationContexts } from './calibration';
import { parseSettings } from '../game/validate';
import { applyAction } from '../game/reducer';
import { updateHumanPokerMemory } from './live';
import { legalActions } from './information';
import { BaselineProvider, type StrategyPrediction } from './strategy';

describe('Persistent, distinct personalities', () => {
  it('validates the wire value and keeps old profiles readable', () => {
    const base = new BotFactory().generate('hero', 1001);
    expect(() => validateProfile(base)).not.toThrow();
    for (const p of PERSONALITIES) {
      expect(() => validateProfile(withPersonality(base, p.id))).not.toThrow();
      expect(parseSettings({ botPersonality: p.id }, true)).toEqual({ botPersonality: p.id });
    }
    expect(parseSettings({ botPersonality: 'original' }, true)).toEqual({ botPersonality: 'original' });
    expect(parseSettings({ botPersonality: 'cheater' }, true)).toBeNull();
  });
  it('changes decisions in matching contexts, stays inside its cost budget and replays identically', () => {
    const contexts = [...calibrationContexts(), decisionFixture([27, 65, 130, 40], [30, 'call']).info];
    // Compare identities on the same independently copied strategy predictions.
    // Strategy replay itself is covered by the planning tests.
    const provider = new BaselineProvider();
    const predictions = contexts.map((info) => provider.predict(info));
    const signatures: Record<string, number[][]> = {};
    for (const id of ['patient', 'curious', 'aggressive'] as const) {
      signatures[id] = contexts.map((info, n) => {
        const profile = withPersonality(new BotFactory().generate(info.heroId, 1001), id);
        const service = new BotService({ predict: () => structuredClone(predictions[n]) });
        const memory = emptyMemory(info.heroId, info.tableId);
        const a = service.decide(info, profile, memory, 77);
        const b = service.decide(info, JSON.parse(JSON.stringify(profile)), JSON.parse(JSON.stringify(memory)), 77);
        expect(a.action).toEqual(b.action);
        expect(a.finalDistribution).toEqual(b.finalDistribution);
        expect(a.identityPolicyVersion).toBe('personality-1');
        expect(a.deviation.estimatedValueLoss!).toBeLessThanOrEqual(a.deviation.budget + 1e-8);
        return a.finalDistribution;
      });
    }
    for (const [a, b] of [
      ['patient', 'curious'],
      ['patient', 'aggressive'],
      ['curious', 'aggressive'],
    ]) {
      const tv =
        signatures[a].reduce((s, row, k) => s + row.reduce((sum, p, j) => sum + Math.abs(p - signatures[b][k][j]), 0) / 2, 0) /
        contexts.length;
      expect(tv).toBeGreaterThan(0.01);
    }
  });
  it('keeps the active personality until next hand, preserves memory and rejects non-host edits', () => {
    const { game, ctx } = decisionFixture([100, 100]);
    const bot = game.players[1];
    bot.bot = true;
    bot.botKind = 'human-poker';
    game.settings.humanPoker = true;
    game.settings.botPersonality = 'patient';
    const before = updateHumanPokerMemory(game)!;
    expect(before.profile?.personality).toBe('patient');
    const action = { type: 'settings' as const, settings: { botPersonality: 'curious' as const } };
    expect(applyAction(game, action, { ...ctx, deviceId: 'stranger' }).ok).toBe(false);
    const changed = applyAction(game, action, { ...ctx, deviceId: game.hostDeviceId });
    if (!changed.ok) throw new Error(changed.error);
    expect(changed.game.humanPoker?.profile?.personality).toBe('patient');
    expect(changed.game.humanPoker?.memory).toEqual(before.memory);
    changed.game.hand!.number++;
    expect(updateHumanPokerMemory(changed.game)!.profile?.personality).toBe('curious');
  });
  it('prefers larger sizes for pressure and extra draw calls for curiosity in the same decision', () => {
    const info = calibrationContexts().find((i) => i.street === 'flop' && !i.legal.canCheck)!;
    info.hole = ['As', 'Js'];
    info.board = ['2s', '7s', '9h'];
    const actions = legalActions(info);
    const p: StrategyPrediction = {
      actions,
      probabilities: actions.map(() => 1 / actions.length),
      values: actions.map(() => 0),
      source: 'range-equity-fallback',
      coverage: 'fallback',
      modelVersion: 'baseline-5',
      equity: 0.45,
      equityStandardError: null,
      warnings: [],
    };
    const base = new BotFactory().generate(info.heroId, 1001);
    const patient = personalityWeights(info, p, withPersonality(base, 'patient'));
    const curious = personalityWeights(info, p, withPersonality(base, 'curious'));
    const aggressive = personalityWeights(info, p, withPersonality(base, 'aggressive'));
    const call = actions.findIndex((a) => a.move === 'call');
    expect(curious[call]).toBeGreaterThan(patient[call]);
    const raises = actions
      .map((a, k) => ({ a, k }))
      .filter(({ a }) => a.to !== undefined)
      .sort((a, b) => a.a.to! - b.a.to!);
    // Compare preferences for the minimum versus pot-size candidate with identical values.
    const small = raises[0].k,
      large = raises[Math.min(2, raises.length - 1)].k;
    expect(aggressive[large] - aggressive[small]).toBeGreaterThan(patient[large] - patient[small]);
  });
  it('keeps weak bets mixed and excludes routine deep overbets after the budget guard', () => {
    const info = calibrationContexts().find((i) => i.street === 'flop' && i.legal.canCheck)!;
    info.hole = ['2c', '3d'];
    info.board = ['As', 'Kh', '9s'];
    const pot = info.players.reduce((s, p) => s + p.total, 0) + info.legal.toCall;
    const hero = info.players.find((p) => p.id === info.heroId)!;
    for (const [id, cap] of [
      ['patient', 0.18],
      ['curious', 0.25],
      ['aggressive', 0.55],
    ] as const) {
      const profile = withPersonality(new BotFactory().generate(info.heroId, 1001), id);
      const trace = new BotService().decide(info, profile, emptyMemory(info.heroId, info.tableId), 8);
      const weakBets = trace.prediction.actions.reduce((s, a, k) => s + (a.to !== undefined ? trace.finalDistribution[k] : 0), 0);
      expect(weakBets).toBeLessThanOrEqual(cap + 1e-9);
      trace.prediction.actions.forEach((a, k) => {
        if (a.to !== undefined && a.to - hero.bet - info.legal.toCall > pot * 2) expect(trace.finalDistribution[k]).toBe(0);
      });
    }
  });
  it('finishes multiplayer unequal-stack sessions with deterministic behavior', () => {
    const options = {
      agents: ['bot', 'competent', 'loose-aggressive', 'calling-station'] as (
        'bot' | 'competent' | 'loose-aggressive' | 'calling-station'
      )[],
      personality: 'curious' as const,
      pairedDecks: true,
      startingStacksBb: [35, 80, 150, 55],
      carryStacks: true,
    };
    const a = simulate(12, 901, 4, options),
      b = simulate(12, 901, 4, options);
    expect(a.behavior).toEqual(b.behavior);
    expect(a.handReturnsBb).toEqual(b.handReturnsBb);
    expect(a.preflopCoverage.modelledDecisions).toBeGreaterThan(0);
    expect(a.preflopCoverage.unequalStackDecisions).toBeGreaterThan(0);
    expect(a.behavior.hands).toBe(12);
    // Two complete 12-hand sessions include multiplayer future-street inference.
    // Per-decision latency is checked in the benchmark rather than this replay test.
  }, 20000);
});

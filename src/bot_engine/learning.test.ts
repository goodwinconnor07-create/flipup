import { describe, expect, it } from 'vitest';
import { BotService } from './service';
import { BOT_001 } from './identity';
import { contextKey, emptyMemory, observe, validateMemory } from './memory';
import { riverLearningFixture, learningPrediction, learningSession, evaluateLearning } from './learningBench';
import { LEARNING_CONFIG } from './learningConfig';
import { publicResponses } from './observations';
import { initialTrainingState, learningGate, learningSeeds, trainingCycle } from './training';

describe('Contextual learning and training safeguards', () => {
  it('isolates streets, sizes, multiway observations and observers', () => {
    const info = riverLearningFixture(),
      memory = emptyMemory(info.heroId, info.tableId);
    const service = new BotService({ predict: () => learningPrediction() });
    const before = service.decide(info, BOT_001, memory, 1).finalDistribution;
    for (let n = 1; n <= 120; n++)
      observe(memory, {
        observerId: info.heroId,
        targetId: 'opponent',
        tableId: info.tableId,
        sequence: n,
        foldedToBet: true,
        context: { street: n % 3 ? 'preflop' : 'river', size: n % 3 === 0 ? 'large' : 'medium', headsUp: false },
      });
    expect(service.decide(info, BOT_001, memory, 1).finalDistribution).toEqual(before);
    expect(emptyMemory('BOT_002', info.tableId).contexts).toBeUndefined();
    expect(memory.contexts?.opponent?.[contextKey({ street: 'river', size: 'medium', headsUp: true })]).toBeUndefined();
  });
  it('ignores tiny samples, exploits supported overfolding, then reverses without peeking at a regime', () => {
    const info = riverLearningFixture(),
      memory = emptyMemory(info.heroId, info.tableId);
    const prediction = Object.freeze({ ...learningPrediction(), probabilities: Object.freeze([0.98, 0.02]) }) as unknown as ReturnType<
      typeof learningPrediction
    >;
    const service = new BotService({ predict: () => prediction });
    const initial = service.decide(info, BOT_001, memory, 1).finalDistribution[1];
    const event = {
      observerId: info.heroId,
      targetId: 'opponent',
      tableId: info.tableId,
      foldedToBet: true,
      context: { street: 'river', size: 'medium', headsUp: true } as const,
    };
    for (let n = 1; n <= 4; n++) observe(memory, { ...event, sequence: n });
    expect(service.decide(info, BOT_001, memory, 1).finalDistribution[1]).toBe(initial);
    for (let n = 5; n <= 100; n++) observe(memory, { ...event, sequence: n });
    expect(service.decide(info, BOT_001, memory, 1).finalDistribution[1]).toBeGreaterThan(initial + 0.05);
    for (let n = 101; n <= 220; n++) observe(memory, { ...event, sequence: n, foldedToBet: false });
    expect(service.decide(info, BOT_001, memory, 1).finalDistribution[1]).toBeLessThan(initial);
    expect(prediction.probabilities).toEqual([0.98, 0.02]);
  });
  it('preserves contextual counts on serialization and never double-counts retries', () => {
    const m = emptyMemory('BOT_001', 'table');
    const event = {
      observerId: m.botId,
      tableId: m.tableId,
      targetId: 'opp',
      sequence: 1,
      foldedToBet: true,
      context: { street: 'river', size: 'medium', headsUp: true } as const,
    };
    observe(m, event);
    const once = JSON.stringify(m);
    observe(m, event);
    expect(JSON.stringify(m)).toBe(once);
    const restored = JSON.parse(once);
    validateMemory(restored);
    expect(restored).toEqual(m);
    expect(() => observe(m, { ...event, sequence: 2, context: { ...event.context, street: 'future' } } as unknown as typeof event)).toThrow(
      'Invalid observation',
    );
  });
  it('does not transfer a fold-to-bet read to a raise', () => {
    const info = riverLearningFixture(),
      memory = emptyMemory(info.heroId, info.tableId);
    info.currentBet = 50;
    info.players[1].bet = 50;
    info.players[1].total = 100;
    info.legal = { ...info.legal, toCall: 50, canCheck: false, minTo: 100, word: 'Raise' };
    const p = learningPrediction();
    p.actions = [{ move: 'fold' }, { move: 'call' }, { move: 'raise', to: 100 }];
    p.probabilities = [0.8, 0.18, 0.02];
    p.values = [0, -50, -100];
    const service = new BotService({ predict: () => p });
    const before = service.decide(info, BOT_001, memory, 1).finalDistribution;
    for (let n = 1; n <= 100; n++)
      observe(memory, {
        observerId: info.heroId,
        targetId: 'opponent',
        tableId: info.tableId,
        sequence: n,
        foldedToBet: true,
        context: { street: 'river', size: 'small', headsUp: true },
      });
    expect(service.decide(info, BOT_001, memory, 1).finalDistribution).toEqual(before);
  });
  it('processes actual faced bets, excluding checks and out-of-turn folds', () => {
    const events = publicResponses({
      playerIds: ['a', 'b'],
      sbId: 'a',
      bbId: 'b',
      smallBlind: 5,
      bigBlind: 10,
      startStacks: { a: 1000, b: 1000 },
      actions: [
        { playerId: 'a', street: 'preflop', move: 'call', to: 10 },
        { playerId: 'b', street: 'preflop', move: 'check', to: 10 },
        { playerId: 'a', street: 'flop', move: 'bet', to: 30 },
        { playerId: 'b', street: 'flop', move: 'fold', to: 0 },
      ],
    });
    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({ targetId: 'b', foldedToBet: true, context: { street: 'flop', size: 'large', headsUp: true } });
    const short = publicResponses({
      playerIds: ['a', 'b', 'c'],
      sbId: 'a',
      bbId: 'b',
      smallBlind: 100,
      bigBlind: 200,
      startStacks: { a: 1, b: 1000, c: 50 },
      actions: [{ playerId: 'c', street: 'preflop', move: 'allin', to: 50 }],
    });
    expect(short[0].context.size).toBe('small');
  });
  it('measures profitable learning and recovery on independently seeded known-payoff subgames', () => {
    const report = evaluateLearning(LEARNING_CONFIG, [501, 503, 509, 521]);
    expect(report.meanGain).toBeGreaterThan(0);
    expect(report.recovery).toBe(true);
    expect(report.scenarios.find((s) => s.scenario === 'conflicting-context')!.gain).toBeGreaterThan(0);
    const phases = learningSession('switching', 17).phases;
    expect(phases[1].correctionOpportunities).toBeLessThanOrEqual(32);
  });
  it('uses disjoint train/validation/test seeds and rejects an inconclusive promotion', () => {
    const parts = ['training', 'validation', 'test'] as const;
    const seeds = parts.flatMap((p) => learningSeeds(p, 0, 12));
    expect(new Set(seeds).size).toBe(seeds.length);
    const report = evaluateLearning(LEARNING_CONFIG, [29, 31, 37]);
    expect(learningGate({ ...report, descriptiveSessionInterval: [-1, 2] })).toBe(false);
    expect(learningGate({ ...report, recovery: false })).toBe(false);
    const result = trainingCycle(initialTrainingState());
    expect(result.next.nextCycle).toBe(1);
    expect(result.trainingSeeds.every((s) => !result.validation.seeds.includes(s))).toBe(true);
    expect(result.next.cycles).toHaveLength(1);
  }, 30000);
});

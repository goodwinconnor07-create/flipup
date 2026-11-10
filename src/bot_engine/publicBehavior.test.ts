import { describe, it, expect } from 'vitest';
import { emptyMemory, validateMemory, MemoryRepository } from './memory';
import { observeBehavior, behaviorSnapshot, type BehaviorEvent } from './behaviorMemory';
import { opponentEvidence, opponentResponse, opponentSizing } from './opponentModel';
import { behaviorKey, publicBehaviorEvents } from './publicBehavior';
import { specifiedWorlds } from './specifiedWorlds';
import { PlanningRound, continuationView } from './multiplayerPlanning';
import { priorResponse } from './guardedResponse';
import { BehavioralProvider, behavioralRanges } from './behavioralProvider';
import { EverydayProvider } from './everydayProvider';
import { BotService } from './service';
import { BotFactory } from './identity';

const world = () => specifiedWorlds().find((w) => w.id === 'losing-call')!.information;
function view() {
  const i = world(),
    r = new PlanningRound(i);
  return continuationView(
    r,
    r.seats.findIndex((s) => s.playerId === i.heroId),
    i.hole,
  );
}
function event(hand: number, label: 0 | 1 | 2, context = behaviorKey(view()), targetId = 'opponent'): BehaviorEvent {
  return { observerId: 'hero', tableId: 'table', targetId, hand, actionIndex: 0, context, label };
}
function learned(label: 0 | 1 | 2, n = 60) {
  const m = emptyMemory('hero', 'table');
  for (let hand = 1; hand <= n; hand++) observeBehavior(m, event(hand, label));
  return m;
}
describe('Private public-behavior learning', () => {
  it('retains exact V7 decisions with no completed evidence and supports old persisted snapshots', async () => {
    const i = world(),
      m = emptyMemory('hero', 'table'),
      p = new BehavioralProvider(16);
    expect(p.predict(i)).toEqual(new EverydayProvider(16, 'baseline-7').predict(i));
    observeBehavior(m, event(1, 1));
    expect(behaviorSnapshot(m, 1, ['opponent']).opponents).toEqual({});
    expect(p.predict(i, behaviorSnapshot(m, 1, ['opponent']))).toEqual(new EverydayProvider(16, 'baseline-7').predict(i));
    const store = new Map<string, string>();
    const repo = new MemoryRepository({
      get: async (k) => store.get(k) ?? null,
      put: async (k, v) => {
        store.set(k, v);
      },
    });
    await repo.save(m);
    expect(await repo.load('hero', 'table')).toEqual(m);
    validateMemory(emptyMemory('old', 'table'));
  });
  it('deduplicates, caps one-hand evidence and does not learn from the action it is currently explaining', () => {
    const m = learned(1, 12),
      before = behaviorSnapshot(m, 13, ['opponent']);
    observeBehavior(m, event(13, 2));
    observeBehavior(m, event(13, 2));
    for (let actionIndex = 1; actionIndex < 30; actionIndex++) observeBehavior(m, { ...event(13, 2), actionIndex });
    expect(behaviorSnapshot(m, 13, ['opponent'])).toEqual(before);
    expect(m.behavior!.opponents.opponent.cells[behaviorKey(view())].pending.reduce((a, b) => a + b, 0)).toBe(2);
    expect(behaviorSnapshot(m, 14, ['opponent'])).not.toEqual(before);
    expect(m.latestSequence).toBe(-1);
    expect(m.opponents).toEqual({});
    expect(() => behaviorSnapshot(m, 12, ['opponent'])).toThrow(/future/);
    expect(() => observeBehavior(m, { ...event(14, 0), observerId: 'other' })).toThrow();
  });
  it('grows cautiously, forgets stale evidence, and follows a changed player', () => {
    const v = view(),
      small = learned(1, 2),
      large = learned(1);
    const a = opponentEvidence(behaviorSnapshot(small, 3, ['opponent']), 'opponent', v);
    const b = opponentEvidence(behaviorSnapshot(large, 61, ['opponent']), 'opponent', v);
    expect(a.trust).toBeLessThan(0.1);
    expect(b.trust).toBeGreaterThan(a.trust);
    expect(b.trust).toBeLessThan(0.65);
    expect(opponentEvidence(behaviorSnapshot(large, 401, ['opponent']), 'opponent', v).trust).toBeLessThan(0.001);
    for (let hand = 61; hand <= 140; hand++) observeBehavior(large, event(hand, 2));
    const changed = opponentEvidence(behaviorSnapshot(large, 141, ['opponent']), 'opponent', v);
    expect(changed.frequencies[2]).toBeGreaterThan(changed.frequencies[1]);
    expect(opponentResponse(v, behaviorSnapshot(large, 141, ['opponent']), 'opponent')[2]).toBeGreaterThan(priorResponse(v)[2]);
  });
  it('separates opponents and open/facing and multiplayer contexts, with only bounded partial pooling', () => {
    const m = learned(1),
      s = behaviorSnapshot(m, 61, ['opponent']),
      v = view();
    expect(opponentEvidence(s, 'stranger', v).trust).toBe(0);
    expect(opponentEvidence(s, 'opponent', { ...v, live: 3 }).trust).toBe(0);
    expect(opponentEvidence(s, 'opponent', { ...v, toCall: 0 }).trust).toBe(0);
    expect(opponentEvidence(s, 'opponent', { ...v, board: v.board.slice(0, 3) }).trust).toBeLessThan(
      opponentEvidence(s, 'opponent', v).trust,
    );
    for (let n = 0; n < 25; n++) observeBehavior(m, event(62 + n, 1, undefined, `visitor${n}`));
    expect(Object.keys(m.behavior!.opponents)).toHaveLength(16);
    validateMemory(m);
  });
  it('learns bounded sizing, masks impossible actions, and excludes departures from voluntary observations', () => {
    const m = emptyMemory('hero', 'table'),
      v = view();
    for (let hand = 1; hand <= 60; hand++) observeBehavior(m, { ...event(hand, 2), sizing: 2 });
    const s = behaviorSnapshot(m, 61, ['opponent']);
    expect(opponentSizing(v, s, 'opponent', 0.33)).toBeGreaterThan(0.33);
    expect(opponentSizing(v, s, 'opponent', 0.33)).toBeLessThan(1.1);
    expect(opponentResponse({ ...v, toCall: 0, canRaise: false }, s, 'opponent')).toEqual([0, 1, 0]);
    const royal = { ...v, board: ['Ts', 'Js', 'Qs', 'Ks', 'As'] };
    expect(opponentResponse(royal, s, 'opponent')).toEqual([0, 1, 0]);
    const i = world();
    i.actions.push({ street: 'river', playerId: 'hero', move: 'fold', to: 0, outOfTurn: true });
    expect(publicBehaviorEvents(i, 1).some((e) => e.actionIndex === i.actions.length - 1)).toBe(false);
  });
  it('widens a frequent caller’s call range without using actual opposing cards', () => {
    const i = specifiedWorlds().find((w) => w.id === 'thin-value')!.information;
    i.hand = 61;
    i.actions.push(
      { street: 'river', playerId: 'hero', move: 'bet', to: 100 },
      { street: 'river', playerId: 'opponent', move: 'call', to: 100 },
    );
    const m = emptyMemory('hero', 'table');
    for (let hand = 1; hand <= 60; hand++) observeBehavior(m, event(hand, 1, 'river|HU|facing|medium'));
    const prior = [
      {
        playerId: 'opponent',
        source: 'public-action-range-model-2' as const,
        holdings: [
          { cards: ['8s', '6s'] as [string, string], weight: 0.5 },
          { cards: ['9h', '9s'] as [string, string], weight: 0.5 },
        ],
      },
    ];
    const ranges = behavioralRanges(i, prior, behaviorSnapshot(m, 61, ['opponent']));
    expect(ranges[0].holdings[0].weight).toBeGreaterThan(0.5);
    expect(ranges[0].holdings.reduce((s, h) => s + h.weight, 0)).toBeCloseTo(1, 12);
  });
  it('projects only this observer’s counts and cannot mutate stored memory through a provider', () => {
    const i = world();
    i.tableId = 'table';
    i.hand = 61;
    const m = learned(1),
      before = structuredClone(m);
    new BotService({
      predict: (info, s) => {
        expect(JSON.stringify(s)).not.toMatch(/hole|deck|profile|latestSequence/);
        s!.opponents.opponent[behaviorKey(view())].counts[0] = 100000;
        return new EverydayProvider(4, 'baseline-7').predict(info);
      },
    }).decide(i, new BotFactory().generate('hero', 1), m, 3);
    expect(m).toEqual(before);
  });
  it('honors learning-off and ignores unknown private fields with established evidence', () => {
    const i = world();
    i.tableId = 'table';
    i.hand = 61;
    const m = learned(1),
      s = behaviorSnapshot(m, 61, ['opponent']);
    const p = new BehavioralProvider(8);
    expect(p.predict({ ...i, deck: ['As'], opponentCards: ['Ac', 'Ad'] } as typeof i, s)).toEqual(p.predict(i, s));
    const profile = new BotFactory().generate('hero', 1);
    const disabled = new BotService(p, 'off').decide(i, profile, m, 3);
    const reference = new BotService(new EverydayProvider(8, 'baseline-7'), 'off').decide(i, profile, m, 3);
    expect(disabled.prediction).toEqual(reference.prediction);
    expect(disabled.finalDistribution).toEqual(reference.finalDistribution);
  });
});

import { describe, expect, it } from 'vitest';
import { createTable, DEFAULT_SETTINGS } from '../game/reducer';
import { startHand, makeMove } from '../game/holdem';
import { seededRng } from '../game/cards';
import { informationFor, legalActions } from './information';
import { BOT_001, BotFactory } from './identity';
import { emptyMemory, foldEstimate, MemoryRepository, observe } from './memory';
import { BotService } from './service';
import { BaselineProvider, type StrategyProvider } from './strategy';
import { simulate } from './simulation';
import { inferRanges, sampleDeal } from './ranges';
import { features } from './features';

function fixture() {
  const rng = seededRng(7);
  const game = createTable({
    hostDeviceId: 'test',
    name: 'Test',
    emoji: '🃏',
    settings: DEFAULT_SETTINGS,
    bots: 1,
    code: null,
    now: 0,
    rng,
  });
  startHand(game, { now: 0, deviceId: 'test', rng });
  return game;
}

describe('Human Poker foundation', () => {
  it('physically omits hidden cards, deck, private identities and beliefs', () => {
    const g = fixture(),
      id = g.hand!.toAct!;
    const before = informationFor(g, id);
    const service = new BotService();
    const profile = new BotFactory().generate(id, 1001);
    const memory = emptyMemory(id, g.id);
    const prediction = service.decide(before, profile, memory, 123).finalDistribution;
    g.hand!.deck.reverse();
    g.hand!.seats.filter((s) => s.playerId !== id).forEach((s) => {
      s.cards = ['2s', '3s'];
    });
    g.reads = {};
    g.minds = { other: { tilt: 1, confidence: 1 } };
    expect(informationFor(g, id)).toEqual(before);
    expect(service.decide(informationFor(g, id), profile, memory, 123).finalDistribution).toEqual(prediction);
    expect(JSON.stringify(before)).not.toMatch(/deck|minds|reads|botProfile/);
    g.hand!.board.push('As');
    expect(before.board).toHaveLength(0);
  });
  it('generates only actions accepted by the production engine', () => {
    const g = fixture();
    const info = informationFor(g, g.hand!.toAct!);
    for (const action of legalActions(info)) {
      const copy = structuredClone(g);
      expect(makeMove(copy, action.move, action.to, { now: 0, deviceId: 'test', rng: seededRng(4) })).toBeNull();
    }
    info.legal.canRaise = false;
    expect(legalActions(info).every((a) => a.to === undefined)).toBe(true);
  });
  it('rejects invalid visible cards and unsupported variants', () => {
    const g = fixture();
    const hero = g.hand!.seats.find((s) => s.playerId === g.hand!.toAct)!;
    hero.cards = ['As', 'As'];
    expect(() => informationFor(g, hero.playerId)).toThrow('Invalid visible cards');
    g.hand!.variant = 'ghost';
    expect(() => informationFor(g, hero.playerId)).toThrow('Unsupported variant');
  });
  it('replays policy and action from serialized identity, memory, info and seed', () => {
    const g = fixture(),
      info = informationFor(g, g.hand!.toAct!);
    const profile = new BotFactory().generate(info.heroId, 1001);
    const service = new BotService();
    const first = service.decide(info, profile, emptyMemory(info.heroId, g.id), 88);
    const saved = JSON.parse(JSON.stringify(first));
    const replay = service.decide(saved.information, saved.profile, saved.memory, saved.samplingSeed);
    expect(replay.action).toEqual(first.action);
    expect(replay.finalDistribution).toEqual(first.finalDistribution);
    expect(first.finalDistribution.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    const actions = new Set(Array.from({ length: 300 }, (_, n) => JSON.stringify(service.decide(info, profile, first.memory, n).action)));
    expect(actions.size).toBeGreaterThan(1);
  });
  it('learns conservatively, deduplicates events, reverses stale beliefs and isolates bots', async () => {
    const m = emptyMemory('BOT_001', 'table');
    const event = { observerId: m.botId, targetId: 'opponent', tableId: 'table', sequence: 1, foldedToBet: true };
    observe(m, event);
    observe(m, event);
    expect(m.opponents.opponent.samples).toBe(1);
    expect(foldEstimate(m.opponents.opponent).confidence).toBeLessThan(0.04);
    for (let n = 2; n <= 100; n++) observe(m, { ...event, sequence: n });
    expect(foldEstimate(m.opponents.opponent).mean).toBeGreaterThan(0.9);
    for (let n = 101; n <= 260; n++) observe(m, { ...event, sequence: n, foldedToBet: false });
    expect(foldEstimate(m.opponents.opponent).mean).toBeLessThan(0.1);
    expect(emptyMemory('BOT_002', 'table').opponents).toEqual({});
    const disk = new Map<string, string>();
    const storage = {
      get: async (k: string) => disk.get(k) ?? null,
      put: async (k: string, v: string) => {
        disk.set(k, v);
      },
    };
    await new MemoryRepository(storage).save(m);
    expect(await new MemoryRepository(storage).load(m.botId, m.tableId)).toEqual(m);
    expect(await new MemoryRepository(storage).load('BOT_002', m.tableId)).toEqual(emptyMemory('BOT_002', m.tableId));
  });
  it('generates reproducible profiles without special casing BOT_001', () => {
    const f = new BotFactory();
    expect(f.generate('BOT_001', 1001)).toEqual(BOT_001);
    const profiles = Array.from({ length: 20 }, (_, n) => f.generate(`BOT_${n}`, n));
    expect(new Set(profiles.map((p) => p.traits.aggression)).size).toBe(20);
  });
  it('normalizes combination weights and never samples duplicate or blocked cards', () => {
    const g = fixture(),
      info = informationFor(g, g.hand!.toAct!);
    const ranges = inferRanges(info);
    for (const range of ranges) {
      expect(range.holdings.reduce((sum, h) => sum + h.weight, 0)).toBeCloseTo(1);
      expect(range.holdings.every((h) => h.cards.every((c) => !info.hole.includes(c)))).toBe(true);
    }
    const rng = seededRng(123);
    for (let n = 0; n < 200; n++) {
      const deal = sampleDeal(info, ranges, rng);
      const cards = [...info.hole, ...deal.board, ...deal.opponents.flat()];
      expect(new Set(cards).size).toBe(cards.length);
    }
  });
  it('computes chip-normalized pot odds and excludes ineligible side-pot money', () => {
    const g = fixture(),
      info = informationFor(g, g.hand!.toAct!);
    const hero = info.players.find((p) => p.id === info.heroId)!;
    const other = info.players.find((p) => p.id !== info.heroId)!;
    hero.total = 20;
    hero.stack = 10;
    other.total = 100;
    info.legal.toCall = 10;
    const f = features(info);
    expect(f.simplifiedCallThreshold).toBeCloseTo(10 / 60);
    const scaled = structuredClone(info);
    scaled.bigBlind *= 10;
    scaled.players.forEach((p) => {
      p.stack *= 10;
      p.total *= 10;
      p.bet *= 10;
    });
    scaled.legal.toCall *= 10;
    expect(features(scaled).potBb).toBe(f.potBb);
    expect(features(scaled).simplifiedCallThreshold).toBe(f.simplifiedCallThreshold);
  });
  it('labels unsupported chart coverage explicitly', () => {
    const g = fixture(),
      info = informationFor(g, g.hand!.toAct!);
    info.players.forEach((p) => (p.stack += 13));
    expect(new BaselineProvider().predict(info).coverage).toBe('fallback');
  });
  it('uses bounded evidence to expand bluffs, then reverses when opponents stop folding', () => {
    const g = fixture(),
      info = informationFor(g, g.hand!.toAct!);
    const profile = new BotFactory().generate(info.heroId, 1001);
    const actions = legalActions(info);
    const provider: StrategyProvider = {
      predict: () => ({
        actions,
        probabilities: actions.map(() => 1 / actions.length),
        values: null,
        equity: 0.2,
        equityStandardError: 0.02,
        coverage: 'fallback',
        source: 'range-equity-fallback',
        modelVersion: 'baseline-1',
        warnings: ['Synthetic test policy'],
      }),
    };
    const service = new BotService(provider, 'pooled');
    const memory = emptyMemory(info.heroId, g.id);
    const targetId = info.players.find((p) => p.id !== info.heroId)!.id;
    const aggression = () =>
      service.decide(info, profile, memory, 1).finalDistribution.reduce((sum, p, n) => sum + (actions[n].to !== undefined ? p : 0), 0);
    const initial = aggression();
    for (let n = 0; n < 100; n++) observe(memory, { observerId: info.heroId, targetId, tableId: g.id, sequence: n, foldedToBet: true });
    expect(aggression()).toBeGreaterThan(initial);
    for (let n = 100; n < 300; n++) observe(memory, { observerId: info.heroId, targetId, tableId: g.id, sequence: n, foldedToBet: false });
    expect(aggression()).toBeLessThan(initial);
  });
  it('rejects a provider that attempts an illegal bet or invalid probabilities', () => {
    const g = fixture(),
      info = informationFor(g, g.hand!.toAct!);
    const profile = new BotFactory().generate(info.heroId, 1001);
    const prediction = new BaselineProvider().predict(info);
    const service = new BotService({ predict: () => prediction });
    prediction.probabilities[0] = NaN;
    expect(() => service.decide(info, profile, emptyMemory(info.heroId, g.id), 1)).toThrow('Invalid policy');
    prediction.actions = [{ move: 'raise', to: 999999999 }];
    prediction.probabilities = [1];
    expect(() => service.decide(info, profile, emptyMemory(info.heroId, g.id), 1)).toThrow('illegal action space');
  });
  it('runs a full multiway table without illegal actions or lost chips', () => {
    expect(simulate(8, 33, 6).memories).toHaveLength(6);
  }, 30000);
  it('finishes real hands with independent agents and conserved chips', () => {
    const report = simulate(12, 14);
    expect(report.hands).toBe(12);
    expect(report.decisions).toBeGreaterThan(12);
    expect(report.memories[0].botId).not.toEqual(report.memories[1].botId);
  }, 30000);
});

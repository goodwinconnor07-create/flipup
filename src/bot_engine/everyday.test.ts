import { describe, expect, it } from 'vitest';
import { BotFactory, validateProfile } from './identity';
import { balancedBotPool, everydayProfile, EVERYDAY_FOCUSES, focusForName, everydayThinkMs } from './everyday';
import { everydayThought, updateEverydayMemory } from './everydayLive';
import { createTable, applyAction, DEFAULT_SETTINGS } from '../game/reducer';
import { seededRng } from '../game/cards';
import { startHand, makeMove, dealNextStreet } from '../game/holdem';
import { decisionFixture } from './testFixtures';
import { informationFor } from './information';
import { redactForDevice } from '../game/redact';
import { botView } from '../game/variants';
import { parseSettings } from '../game/validate';
import { calibrationContexts } from './calibration';
import { BotService } from './service';
import { emptyMemory } from './memory';
import { EverydayProvider } from './everydayProvider';

const ctx = () => ({ deviceId: 'host', now: 0, rng: seededRng(413) });
const table = (bots = 4) =>
  createTable({
    hostDeviceId: 'host',
    name: 'Human',
    emoji: '🙂',
    bots,
    settings: DEFAULT_SETTINGS,
    code: null,
    now: 0,
    rng: seededRng(413),
  });
describe('Everyday poker tables', () => {
  it('uses multiplayer plans in live dispatch while isolating the actual deck and opposing holes', () => {
    const { game, ctx } = decisionFixture([60, 12, 100]);
    while (game.hand!.toAct) {
      const i = informationFor(game, game.hand!.toAct!);
      expect(makeMove(game, i.legal.canCheck ? 'check' : 'call', undefined, ctx)).toBeNull();
    }
    dealNextStreet(game, ctx);
    const id = game.hand!.toAct!;
    game.players.find((p) => p.id === id)!.bot = true;
    const first = everydayThought(game, id)!;
    const trace = game.botTable!.traces.at(-1)!;
    expect(trace.prediction.modelVersion).toBe('baseline-7');
    expect(trace.prediction.planning).toMatchObject({ version: 'multi-street-2', opponents: 2, futureStreets: ['turn', 'river'] });
    expect(trace.handPlan?.version).toBe('hand-plan-1');
    game.hand!.deck.reverse();
    for (const seat of game.hand!.seats) if (seat.playerId !== id) seat.cards = ['2s', '3h'];
    expect(everydayThought(game, id)).toEqual(first);
    expect(JSON.stringify(redactForDevice(game, game.hostDeviceId))).not.toMatch(/coherenceWeights|hand-plan-1|rangeReads/);
  });
  it('automatically balances eight seats without altering names or duplicates', () => {
    for (let seed = 0; seed < 30; seed++) {
      const g = createTable({
        hostDeviceId: 'host',
        name: 'Human',
        emoji: '🙂',
        bots: 8,
        settings: DEFAULT_SETTINGS,
        code: null,
        now: 0,
        rng: seededRng(seed + 1),
      });
      const bots = g.players.filter((p) => p.bot);
      expect(new Set(bots.map((p) => p.name)).size).toBe(8);
      const counts = EVERYDAY_FOCUSES.map((f) => bots.filter((p) => focusForName(p.name) === f).length);
      expect(counts).toEqual([2, 2, 2, 2]);
    }
    expect(balancedBotPool([], [])).toEqual([]);
  });
  it('keeps restrained individual traits stable across games and levels', () => {
    const base = new BotFactory().generate('id', 1);
    for (const focus of EVERYDAY_FOCUSES) {
      const a = everydayProfile(base, 'Mick', 'casual', focus),
        b = everydayProfile(base, 'Mick', 'challenge', focus);
      expect(a.traits).toEqual(b.traits);
      expect(() => validateProfile(a)).not.toThrow();
      for (const v of Object.values(a.traits)) expect(v).toBeGreaterThanOrEqual(0.36);
      for (const v of Object.values(a.traits)) expect(v).toBeLessThanOrEqual(0.65);
      expect(everydayProfile(base, 'Mick', 'casual', focus)).toEqual(a);
    }
    expect(parseSettings({ botDifficulty: 'challenge' }, true)).toEqual({ botDifficulty: 'challenge' });
    expect(parseSettings({ botDifficulty: 'rigged' }, true)).toBeNull();
  });
  it('uses the new engine by default, learns separately and physically omits every private observer from views', () => {
    const g = table(),
      c = ctx();
    startHand(g, c);
    updateEverydayMemory(g);
    expect(Object.keys(g.botTable!.players)).toHaveLength(4);
    const memory = Object.values(g.botTable!.players).map((p) => p.memory);
    expect(new Set(memory).size).toBe(4);
    for (let k = 0; k < 5 && g.hand?.toAct; k++) {
      const actor = g.players.find((p) => p.id === g.hand!.toAct)!;
      const info = informationFor(g, actor.id),
        thought = everydayThought(g, actor.id);
      if (actor.bot) expect(thought).not.toBeNull();
      expect(makeMove(g, thought?.move.move ?? (info.legal.canCheck ? 'check' : 'call'), thought?.move.to, c)).toBeNull();
      updateEverydayMemory(g);
    }
    expect(g.botTable!.traces.length).toBeGreaterThan(0);
    expect(g.botTable!.traces.length).toBeLessThanOrEqual(4);
    expect(g.botTable!.traces[0].identityPolicyVersion).toBe('everyday-1');
    expect(JSON.stringify(g.botTable!.traces.map((t) => t.information))).not.toMatch(/"deck"|"botTable"|"deviceId"/);
    expect(redactForDevice(g, 'host').botTable).toBeUndefined();
    expect(botView(g, g.hand!, g.hand!.seats[0]).game.botTable).toBeUndefined();
    expect(JSON.parse(JSON.stringify(g)).botTable).toEqual(g.botTable);
    const before = structuredClone(g.botTable!.players);
    updateEverydayMemory(g);
    expect(g.botTable!.players).toEqual(before);
  });
  it('freezes the level for a hand and preserves memories when it changes', () => {
    const g = table();
    startHand(g, ctx());
    updateEverydayMemory(g);
    const result = applyAction(g, { type: 'settings', settings: { botDifficulty: 'challenge' } }, ctx());
    if (!result.ok) throw new Error(result.error);
    expect(result.game.botTable!.difficulty).toBe('casual');
    const oldMemory = structuredClone(Object.values(result.game.botTable!.players)[0].memory);
    result.game.hand!.number++;
    updateEverydayMemory(result.game);
    expect(result.game.botTable!.difficulty).toBe('challenge');
    expect(Object.values(result.game.botTable!.players)[0].memory).toEqual(oldMemory);
    expect(applyAction(g, { type: 'settings', settings: { botDifficulty: 'challenge' } }, { ...ctx(), deviceId: 'stranger' }).ok).toBe(
      false,
    );
  });
  it('ignores hidden cards and retains the special-mode engines', () => {
    const g = table(1);
    startHand(g, ctx());
    const bot = g.players.find((p) => p.bot)!;
    g.hand!.toAct = bot.id;
    const first = everydayThought(g, bot.id)!;
    g.hand!.deck.reverse();
    g.hand!.seats.filter((s) => s.playerId !== bot.id).forEach((s) => {
      s.cards = ['2s', '3h'];
    });
    expect(everydayThought(g, bot.id)).toEqual(first);
    g.settings.variant = 'ghost';
    expect(everydayThought(g, bot.id)).toBeNull();
    g.settings.variant = 'holdem';
    bot.legend = 'test';
    expect(everydayThought(g, bot.id)).toBeNull();
  });
  it('keeps profiles different but much closer than the experimental extremes', () => {
    const contexts = calibrationContexts();
    const signatures = EVERYDAY_FOCUSES.map((f) =>
      contexts.map((info) => {
        const profile = everydayProfile(new BotFactory().generate(info.heroId, 1), 'Mick', 'casual', f);
        return new BotService(new EverydayProvider()).decide(info, profile, emptyMemory(info.heroId, info.tableId), 15);
      }),
    );
    for (const row of signatures)
      for (const trace of row) {
        if (trace.deviation.estimatedValueLoss === null) expect(trace.information.street).toBe('preflop');
        else expect(trace.deviation.estimatedValueLoss).toBeLessThanOrEqual(trace.deviation.budget + 1e-8);
      }
    for (let k = 1; k < signatures.length; k++) {
      const tv =
        signatures[0].reduce(
          (s, t, j) => s + t.finalDistribution.reduce((v, p, n) => v + Math.abs(p - signatures[k][j].finalDistribution[n]), 0) / 2,
          0,
        ) / contexts.length;
      expect(tv).toBeGreaterThan(0.001);
      expect(tv).toBeLessThan(0.1);
    }
    const mixed = signatures[0].filter((t) => Math.max(...t.finalDistribution) < 0.98).length / contexts.length;
    expect(mixed).toBeGreaterThan(0.1);
    const info = contexts[0],
      p = everydayProfile(new BotFactory().generate(info.heroId, 1), 'Mick');
    const timings = Array.from({ length: 25 }, (_, k) => everydayThinkMs(info, p, k));
    expect(new Set(timings).size).toBeGreaterThan(20);
    expect(Math.max(...timings)).toBeLessThan(2000);
  }, 30000);
  it('keeps the same physical cards at both levels with the same dealing seed', () => {
    const a = table(),
      b = table();
    b.settings.botDifficulty = 'challenge';
    startHand(a, ctx());
    startHand(b, ctx());
    expect(a.hand!.deck).toEqual(b.hand!.deck);
    expect(a.hand!.seats.map((s) => s.cards)).toEqual(b.hand!.seats.map((s) => s.cards));
    updateEverydayMemory(a);
    updateEverydayMemory(b);
    expect(a.botTable!.difficulty).toBe('casual');
    expect(b.botTable!.difficulty).toBe('challenge');
  });
});

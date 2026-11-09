import { describe, expect, it } from 'vitest';
import { applyAction, createTable, DEFAULT_SETTINGS } from '../game/reducer';
import { seededRng } from '../game/cards';
import { redactForDevice } from '../game/redact';
import { parseSettings } from '../game/validate';
import { withVariant } from '../game/tableSetup';
import { botView } from '../game/variants';
import type { Game, Action } from '../game/types';

function setup(enabled = true) {
  return createTable({
    hostDeviceId: 'host',
    name: 'Human',
    emoji: '🙂',
    settings: { ...DEFAULT_SETTINGS, humanPoker: enabled, rebuys: true },
    bots: 0,
    code: null,
    now: 0,
    rng: seededRng(5),
  });
}
function step(game: Game, action: Action, now: number, deviceId = 'host'): Game {
  const result = applyAction(game, action, { deviceId, now, rng: seededRng(now + 7) });
  if (!result.ok) throw new Error(result.error);
  return result.game;
}
function play(game: Game, handCount: number): Game {
  let now = 0;
  for (let guard = 0; guard < 800 && (game.logs.length < handCount || !game.humanPoker?.lastDecision); guard++) {
    now = Math.max(now + 10000, game.wakeAt ?? 0);
    const h = game.hand,
      actor = h && game.players.find((p) => p.id === h.toAct);
    if (h && !h.result && actor && !actor.bot) {
      const seat = h.seats.find((s) => s.playerId === actor.id)!;
      game = step(game, { type: 'act', hand: h.number, seq: h.seq, move: seat.bet >= h.currentBet ? 'check' : 'call' }, now);
    } else game = step(game, { type: 'tick' }, now, 'server');
  }
  return game;
}
describe('Opt-in BOT_001 at real tables', () => {
  it('is absent by default, is seated exactly once when enabled, and validates the wire setting', () => {
    expect(setup(false).players.some((p) => p.botKind)).toBe(false);
    let game = setup();
    expect(game.players.find((p) => p.botKind)?.name).toBe('BOT_001');
    game = step(game, { type: 'settings', settings: { humanPoker: true } }, 1);
    expect(game.players.filter((p) => p.botKind)).toHaveLength(1);
    expect(parseSettings({ humanPoker: 'yes' }, true)).toBeNull();
    expect(parseSettings({ humanPoker: true }, true)).toEqual({ humanPoker: true });
    expect(withVariant(game.settings, 'ghost').humanPoker).toBe(false);
  });
  it('plays complete hands through reducer ticks and survives persisted-state reload', () => {
    let game = step(setup(), { type: 'start' }, 0);
    game = play(game, 2);
    expect(game.logs.length).toBeGreaterThanOrEqual(2);
    expect(game.humanPoker?.lastDecision?.model).toBe('baseline-5');
    expect(
      game.players.reduce((sum, p) => sum + p.stack, 0) + (game.hand?.result ? 0 : game.hand!.seats.reduce((sum, s) => sum + s.total, 0)),
    ).toBe(game.players.reduce((sum, p) => sum + p.bought, 0));
    const loaded: Game = JSON.parse(JSON.stringify(game));
    expect(loaded.humanPoker).toEqual(game.humanPoker);
    expect(loaded.humanPoker?.traces?.length).toBeGreaterThan(0);
    expect(loaded.humanPoker!.traces!.length).toBeLessThanOrEqual(8);
    expect(JSON.stringify(loaded.humanPoker!.traces!.map((t) => t.information))).not.toMatch(/"deck"|"botKind"|"deviceId"/);
    const view = redactForDevice(loaded, 'host');
    expect(view.humanPoker).toBeUndefined();
    expect(view.players.every((p) => p.botKind === undefined)).toBe(true);
    if (loaded.hand) expect(botView(loaded, loaded.hand, loaded.hand.seats[0]).game.humanPoker).toBeUndefined();
  }, 30000);
  it('lets only the host toggle the seat and leaves a hand in progress intact', () => {
    let game = step(setup(), { type: 'start' }, 0);
    game = step(game, { type: 'tick' }, 100000, 'server');
    for (let n = 0; !game.hand && n < 20; n++)
      game = step(game, { type: 'tick' }, Math.max(100001 + n * 100000, game.wakeAt ?? 0), 'server');
    expect(game.hand).not.toBeNull();
    const bot = game.players.find((p) => p.botKind)!;
    const denied = applyAction(
      game,
      { type: 'settings', settings: { humanPoker: false } },
      { deviceId: 'stranger', now: 100001, rng: seededRng(1) },
    );
    expect(denied.ok).toBe(false);
    game = step(game, { type: 'settings', settings: { humanPoker: false } }, 100001);
    expect(game.players.some((p) => p.id === bot.id)).toBe(true);
  });
  it('does not displace someone at a full table', () => {
    const game = createTable({
      hostDeviceId: 'host',
      name: 'Human',
      emoji: '🙂',
      settings: DEFAULT_SETTINGS,
      bots: 8,
      code: null,
      now: 0,
      rng: seededRng(4),
    });
    const result = applyAction(game, { type: 'settings', settings: { humanPoker: true } }, { deviceId: 'host', now: 1, rng: seededRng(1) });
    expect(result).toEqual({ ok: false, error: 'Free a seat before inviting BOT_001.' });
  });
});

import { describe, expect, it } from 'vitest';

import { readOf } from './botRange';
import { playerStyle, styleOf, ultraStyle } from './botStyles';
import { withoutPremiumLook } from './premiumGate';
import { applyAction, createTable, DEFAULT_SETTINGS } from './reducer';
import { redactForDevice } from './redact';
import type { PlayerRead } from './types';
import { parseAction } from './validate';

const table = (opts: Partial<Parameters<typeof createTable>[0]> = {}) =>
  createTable({ hostDeviceId: 'host-device-0001', name: 'Me', emoji: '🙂', settings: { ...DEFAULT_SETTINGS }, bots: 3, code: null, now: 0, rng: () => 0.3, ...opts });

describe('ULTRA bots', () => {
  it('seats every bot as ULTRA, including bots added later, and shows it on the table', () => {
    const g = table({ ultra: true });
    expect(g.ultra).toBe(true);
    expect(g.players.filter((p) => p.bot).every((p) => p.ultra)).toBe(true);
    const r = applyAction(g, { type: 'addBot' }, { deviceId: 'host-device-0001', now: 1, rng: () => 0.7 });
    expect(r.ok && r.game.players.filter((p) => p.bot).every((p) => p.ultra)).toBe(true);
    expect(redactForDevice(g, 'host-device-0001').players.filter((p) => p.bot).every((p) => p.ultra)).toBe(true);
  });

  it('is never set on an online table or without asking', () => {
    expect(table({ ultra: true, code: 'ABCDE' }).ultra).toBeUndefined();
    expect(table().players.some((p) => p.ultra)).toBe(false);
  });

  it('starts from what it remembers of you, under your new id', () => {
    const memory: PlayerRead = { hands: 40, vpip: 30, pfr: 4, betsFaced: 20, foldsToBet: 16, aggr: 3, calls: 20 };
    const g = table({ ultra: true, memory });
    expect(g.reads?.[g.players[0].id]).toEqual(memory);
    expect(redactForDevice(g, 'host-device-0001').reads).toBeUndefined();
  });

  it('plays the shark game without leaks and never tilts', () => {
    const u = ultraStyle(styleOf('station'));
    expect(u.post.chase + u.post.pairs + u.post.scared + u.post.tell).toBe(0);
    expect(u.mind.tilt).toBe(0);
    expect(u.post.sense).toBe(1);
    expect(u.post.wobble).toBeLessThan(styleOf('shark').post.wobble);
    expect(u.talk).toEqual(styleOf('station').talk);
    expect(playerStyle({ style: 'station', ultra: true })).toBe(u);
  });

  it('reads a habit after far fewer hands', () => {
    // Ten hands of folding to every bet.
    const r: PlayerRead = { hands: 10, vpip: 3, pfr: 1, betsFaced: 10, foldsToBet: 10, aggr: 0, calls: 0 };
    expect(readOf(r, true).foldToBet).toBeGreaterThan(readOf(r).foldToBet + 0.05);
  });
});

describe('Gold name', () => {
  it('is part of your look, and a phone without Premium loses it', () => {
    const a = parseAction({ type: 'setLook', name: 'Me', emoji: '🙂', gold: true });
    expect(a).toEqual({ type: 'setLook', name: 'Me', emoji: '🙂', gold: true });
    expect(parseAction({ type: 'setLook', name: 'Me', emoji: '🙂', gold: 'yes' })).toBeNull();
    expect(withoutPremiumLook(a!)).toEqual({ type: 'setLook', name: 'Me', emoji: '🙂' });
    const g = table();
    const r = applyAction(g, a!, { deviceId: 'host-device-0001', now: 1, rng: () => 0.5 });
    expect(r.ok && r.game.players[0].gold).toBe(true);
    const off = applyAction(r.ok ? r.game : g, { type: 'setLook', name: 'Me', emoji: '🙂' }, { deviceId: 'host-device-0001', now: 2, rng: () => 0.5 });
    expect(off.ok && off.game.players[0].gold).toBeUndefined();
  });
});

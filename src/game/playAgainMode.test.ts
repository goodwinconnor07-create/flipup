import { describe, expect, it } from 'vitest';

import { actionNeedsPremium, applyAction, createTable, DEFAULT_SETTINGS, parseAction, seededRng, type Game } from './index';

const HOST = 'host-device-secret-0001';
const GUEST = 'guest-device-secret-002';

function endedTable(): Game {
  const rng = seededRng(2);
  let g = createTable({ hostDeviceId: HOST, name: 'Host', emoji: '😎', settings: { ...DEFAULT_SETTINGS, variant: 'holdem' }, bots: 2, code: 'ACES42', now: 0, rng });
  const join = applyAction(g, { type: 'join', name: 'Guest', emoji: '🙂' }, { deviceId: GUEST, now: 0, rng });
  if (join.ok) g = join.game;
  const start = applyAction(g, { type: 'start' }, { deviceId: HOST, now: 0, rng });
  if (!start.ok) throw new Error(start.error);
  const end = applyAction(start.game, { type: 'end' }, { deviceId: HOST, now: 1, rng });
  if (!end.ok) throw new Error(end.error);
  expect(end.game.status).toBe('ended');
  return end.game;
}

describe('Play again in another mode', () => {
  it('lets the host open the next game in a different mode', () => {
    const r = applyAction(endedTable(), { type: 'playAgain', variant: 'pineapple' }, { deviceId: HOST, now: 2, rng: seededRng(3) });
    expect(r.ok && r.game.status).toBe('lobby');
    expect(r.ok && r.game.settings.variant).toBe('pineapple');
  });

  it('keeps the same mode when none is asked for', () => {
    const r = applyAction(endedTable(), { type: 'playAgain' }, { deviceId: HOST, now: 2, rng: seededRng(3) });
    expect(r.ok && r.game.settings.variant).toBe('holdem');
  });

  it("ignores a guest's mode: a guest only says they're in", () => {
    const g = endedTable();
    const r = applyAction(g, { type: 'playAgain', variant: 'imposter' }, { deviceId: GUEST, now: 2, rng: seededRng(3) });
    expect(r.ok && r.game.status).toBe('ended');
    expect(r.ok && r.game.settings.variant).toBe('holdem');
  });

  it('only accepts a real mode from the network', () => {
    expect(parseAction({ type: 'playAgain', variant: 'ghost' })).toEqual({ type: 'playAgain', variant: 'ghost' });
    expect(parseAction({ type: 'playAgain', variant: 'nope' })).toEqual({ type: 'playAgain' });
    expect(parseAction({ type: 'playAgain', variant: { a: 1 } })).toEqual({ type: 'playAgain' });
    expect(parseAction({ type: 'playAgain', off: true, variant: 'ghost' })).toEqual({ type: 'playAgain', off: true });
  });
});

describe('opening a Premium game after the table is made', () => {
  it('needs Premium whether the host changes the mode or plays again in one', () => {
    expect(actionNeedsPremium({ type: 'playAgain', variant: 'imposter' })).toBe(true);
    expect(actionNeedsPremium({ type: 'settings', settings: { variant: 'imposter' } })).toBe(true);
  });
  it('does not need it for the free modes or when no mode changes', () => {
    expect(actionNeedsPremium({ type: 'playAgain', variant: 'pineapple' })).toBe(false);
    expect(actionNeedsPremium({ type: 'playAgain' })).toBe(false);
    expect(actionNeedsPremium({ type: 'settings', settings: { bigBlind: 40 } })).toBe(false);
    expect(actionNeedsPremium({ type: 'act', hand: 1, seq: 1, move: 'fold' })).toBe(false);
  });
});

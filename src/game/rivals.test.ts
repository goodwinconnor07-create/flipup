import { describe, expect, it } from 'vitest';
import { applyAction, createTable, DEFAULT_SETTINGS, seededRng } from './index';

const start = (rivals?: Record<string, { tables: number; beat: number; lost: number }>, seed = 1) => {
  const game = createTable({ hostDeviceId: 'me', name: 'Me', emoji: '😎', settings: DEFAULT_SETTINGS, bots: 3, botNames: ['Mick H', 'Dave B', 'Steve D'], code: null, now: 0, rivals, rng: seededRng(seed) });
  const r = applyAction(game, { type: 'start' }, { deviceId: 'me', now: 0, rng: seededRng(seed) });
  if (!r.ok) throw new Error(r.error);
  return r.game;
};

describe('bots you know', () => {
  it('a bot you met at another table greets you as a regular', () => {
    let greeted = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const g = start({ 'dave b': { tables: 2, beat: 1, lost: 3 } }, seed);
      const dave = g.players.find((p) => p.name === 'Dave B');
      if (g.pendingTalk?.event === 'rememberHello' && g.pendingTalk.playerId === dave?.id) greeted++;
    }
    expect(greeted).toBeGreaterThan(10);
  });

  it('strangers get the usual welcome, and an online table never carries the memory', () => {
    expect(start().pendingTalk?.event).toBe('welcome');
    const online = createTable({ hostDeviceId: 'me', name: 'Me', emoji: '😎', settings: DEFAULT_SETTINGS, bots: 1, code: 'BCDFG', now: 0, rivals: { x: { tables: 1, beat: 0, lost: 0 } } });
    expect(online.rivals).toBeUndefined();
  });
});

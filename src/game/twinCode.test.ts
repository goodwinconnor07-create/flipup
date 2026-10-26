import { describe, expect, it } from 'vitest';
import { applyAction, createTable, DEFAULT_SETTINGS } from './reducer';
import { handRecord } from './record';
import { redactForDevice } from './redact';
import { parseAction } from './validate';
import type { Game } from './types';

const ctx = (deviceId: string) => ({ deviceId, now: 1000, rng: () => 0.5 });
const table = (twinCode?: string) => createTable({ hostDeviceId: 'h', name: 'Host', emoji: '😎', settings: DEFAULT_SETTINGS, bots: 0, twinCode, code: 'BCDFG', now: 1000 });
const must = (g: Game, action: Parameters<typeof applyAction>[1], device: string) => {
  const r = applyAction(g, action, ctx(device));
  if (!r.ok) throw new Error(r.error);
  return r.game;
};

describe('showing your shared twin at a table', () => {
  it('keeps the code a player joins with, and the host starts with theirs', () => {
    expect(table('KLMNP').players[0].twinCode).toBe('KLMNP');
    expect(table().players[0]).not.toHaveProperty('twinCode');
    let g = table();
    g = must(g, { type: 'join', name: 'Ann', emoji: '🐸', twinCode: 'BCDFG' }, 'd1');
    expect(g.players[1].twinCode).toBe('BCDFG');
    // Sitting down again without a code (sharing is off now) takes it down; with a new one, changes it.
    g = must(g, { type: 'join', name: 'Ann', emoji: '🐸', twinCode: 'KLMNP' }, 'd1');
    expect(g.players[1].twinCode).toBe('KLMNP');
    g = must(g, { type: 'join', name: 'Ann', emoji: '🐸' }, 'd1');
    expect(g.players[1]).not.toHaveProperty('twinCode');
  });

  it('is public (friends use it), and goes into the hand record', () => {
    let g = table('KLMNP');
    g = must(g, { type: 'join', name: 'Ann', emoji: '🐸', twinCode: 'BCDFG' }, 'd1');
    expect(redactForDevice(g, 'd1').players.map((p) => p.twinCode)).toEqual(['KLMNP', 'BCDFG']);
    g = must(g, { type: 'start' }, 'h');
    // Deal the first hand and fold it out.
    let now = 1000;
    for (let i = 0; i < 20 && !g.hand?.result; i++) {
      const h = g.hand;
      if (h && !h.result && h.toAct) {
        const who = g.players.find((p) => p.id === h.toAct)!;
        g = must(g, { type: 'act', hand: h.number, seq: h.seq, move: 'fold' }, who.deviceId!);
      } else {
        now = Math.max(now + 1, g.wakeAt ?? now + 1);
        const r = applyAction(g, { type: 'tick' }, { deviceId: 'server', now, rng: () => 0.5 });
        if (r.ok) g = r.game;
      }
    }
    const rec = handRecord(g, g.hand!, 1)!;
    expect(rec.players.map((p) => p.twinCode).sort()).toEqual(['BCDFG', 'KLMNP']);
  });

  it('is only read from a join, and only when it looks like a code', () => {
    expect(parseAction({ type: 'join', name: 'Ann', emoji: '🐸', twinCode: 'BCDFG' })).toEqual({ type: 'join', name: 'Ann', emoji: '🐸', twinCode: 'BCDFG' });
    expect(parseAction({ type: 'join', name: 'Ann', emoji: '🐸', twinCode: 'bcdfg' })).toEqual({ type: 'join', name: 'Ann', emoji: '🐸' });
    expect(parseAction({ type: 'join', name: 'Ann', emoji: '🐸', twinCode: 'AEIOU' })).toEqual({ type: 'join', name: 'Ann', emoji: '🐸' });
    expect(parseAction({ type: 'join', name: 'Ann', emoji: '🐸', twinCode: 12345 })).toEqual({ type: 'join', name: 'Ann', emoji: '🐸' });
    expect(parseAction({ type: 'setLook', name: 'Ann', emoji: '🐸', twinCode: 'BCDFG' })).toEqual({ type: 'setLook', name: 'Ann', emoji: '🐸' });
  });
});

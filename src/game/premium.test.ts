import { describe, expect, it } from 'vitest';
import {
  applyAction,
  BUBBLE_STYLES,
  CARD_PACKS,
  createTable,
  DEFAULT_SETTINGS,
  legendById,
  LEGENDS,
  parseAction,
  redactForDevice,
  seededRng,
  type Action,
  type Game,
} from './index';

// What FlipUp Premium adds to a table: a bubble colour on a player, and AI Legends in the bot seats.

const HOST = 'dhost';
const NOW = 1_700_000_000_000;
const settings = { ...DEFAULT_SETTINGS, turnSeconds: 0 };
const table = (opts: { bots?: number; botNames?: string[]; bubble?: string; cardPack?: string } = {}): Game =>
  createTable({ hostDeviceId: HOST, name: 'Sam', emoji: '😎', settings, bots: 0, code: null, now: NOW, ...opts });

function run(g: Game, action: Action, deviceId = HOST): Game {
  const r = applyAction(g, action, { deviceId, now: NOW, rng: seededRng(5) });
  if (!r.ok) throw new Error(r.error);
  return r.game;
}

describe('bubble colours', () => {
  it('there are five, each with a name', () => {
    expect(BUBBLE_STYLES).toHaveLength(5);
    expect(new Set(BUBBLE_STYLES.map((b) => b.id)).size).toBe(5);
  });

  it('are set with the rest of a player look, and cleared by leaving one out', () => {
    let g = run(table({ bots: 1 }), { type: 'setLook', name: 'Sam', emoji: '😎', bubble: 'rainbow' });
    expect(g.players[0].bubble).toBe('rainbow');
    g = run(g, { type: 'setLook', name: 'Sam', emoji: '🦊' });
    expect(g.players[0].bubble).toBeUndefined();
  });

  it('can be there from the first seat', () => {
    expect(table({ bubble: 'gold' }).players[0].bubble).toBe('gold');
    expect(table({ bubble: 'not-a-colour' }).players[0].bubble).toBeUndefined();
  });

  it('only come over the network when they are one of ours', () => {
    expect(parseAction({ type: 'setLook', name: 'Sam', emoji: '😎', bubble: 'neon' })).toEqual({
      type: 'setLook',
      name: 'Sam',
      emoji: '😎',
      bubble: 'neon',
    });
    expect(parseAction({ type: 'setLook', name: 'Sam', emoji: '😎', bubble: 'x'.repeat(40) })).toBeNull();
    expect(parseAction({ type: 'setLook', name: 'Sam', emoji: '😎', bubble: '<script>' })).toBeNull();
    expect(parseAction({ type: 'setLook', name: 'Sam', emoji: '😎' })).toEqual({ type: 'setLook', name: 'Sam', emoji: '😎' });
  });

  it('every other phone gets to see them', () => {
    const g = run(table({ bots: 1 }), { type: 'setLook', name: 'Sam', emoji: '😎', bubble: 'aurora' });
    expect(redactForDevice(g, 'someone-else').players[0].bubble).toBe('aurora');
  });
});

describe('card packs', () => {
  it('are set with the rest of a look, seen by everyone, and cleared by leaving one out', () => {
    let g = run(table({ bots: 1 }), { type: 'setLook', name: 'Sam', emoji: '😎', cardPack: 'holo', bubble: 'gold' });
    expect(g.players[0].cardPack).toBe('holo');
    expect(g.players[0].bubble).toBe('gold');
    expect(redactForDevice(g, 'someone-else').players[0].cardPack).toBe('holo');
    g = run(g, { type: 'setLook', name: 'Sam', emoji: '😎', bubble: 'gold' });
    expect(g.players[0].cardPack).toBeUndefined();
    expect(table({ cardPack: 'ruby' }).players[0].cardPack).toBe('ruby');
    expect(table({ cardPack: 'nope' }).players[0].cardPack).toBeUndefined();
  });

  it('only come over the network when they are one of ours', () => {
    expect(CARD_PACKS.filter((p) => !p.venue)).toHaveLength(5);
    expect(parseAction({ type: 'setLook', name: 'Sam', emoji: '😎', cardPack: 'neon' })).toEqual({
      type: 'setLook',
      name: 'Sam',
      emoji: '😎',
      cardPack: 'neon',
    });
    expect(parseAction({ type: 'setLook', name: 'Sam', emoji: '😎', cardPack: 'x'.repeat(40) })).toBeNull();
    expect(parseAction({ type: 'setLook', name: 'Sam', emoji: '😎', cardPack: 5 })).toBeNull();
  });
});

describe('AI Legends at the table', () => {
  it('sit down by name when a table is made, with their style and their face', () => {
    const g = table({ botNames: ['Ivey', 'Brunson'] });
    const ivey = g.players.find((p) => p.legend === 'ivey')!;
    expect(ivey).toBeDefined();
    expect(ivey.bot).toBe(true);
    expect(ivey.name).toBe('Ivey');
    expect(ivey.emoji).toBe(legendById('ivey')!.emoji);
    expect(ivey.twin).toBeDefined();
    expect(g.players.some((p) => p.legend === 'brunson')).toBe(true);
  });

  it('are added one at a time by the host, once each', () => {
    let g = run(table({ bots: 1 }), { type: 'addBot', legend: 'dwan' });
    expect(g.players.filter((p) => p.legend === 'dwan')).toHaveLength(1);
    const again = applyAction(g, { type: 'addBot', legend: 'dwan' }, { deviceId: HOST, now: NOW, rng: seededRng(5) });
    expect(again.ok).toBe(false);
    const stranger = applyAction(g, { type: 'addBot', legend: 'ivey' }, { deviceId: 'dother', now: NOW, rng: seededRng(5) });
    expect(stranger.ok).toBe(false);
  });

  it('are checked against the list when they come over the network', () => {
    expect(parseAction({ type: 'addBot' })).toEqual({ type: 'addBot' });
    expect(parseAction({ type: 'addBot', legend: 'ivey' })).toEqual({ type: 'addBot', legend: 'ivey' });
    expect(parseAction({ type: 'addBot', legend: 'nobody' })).toBeNull();
    expect(parseAction({ type: 'addBot', legend: 7 })).toBeNull();
  });

  it('play a whole game without losing a chip', () => {
    let g = table({ botNames: LEGENDS.slice(0, 3).map((l) => l.short) });
    g = run(g, { type: 'start' });
    const total = () => g.players.reduce((sum, p) => sum + p.stack, 0) + (g.hand ? g.hand.seats.reduce((sum, s) => sum + s.bet, 0) : 0);
    const before = total();
    for (let i = 0; i < 400 && g.wakeAt != null; i++) {
      const r = applyAction(g, { type: 'tick' }, { deviceId: 'clock', now: g.wakeAt, rng: seededRng(i) });
      if (!r.ok) break;
      g = r.game;
      const human = g.hand && g.players.find((p) => p.deviceId === HOST);
      if (human && g.hand && !g.hand.result && g.hand.toAct === human.id) {
        const r2 = applyAction(
          g,
          { type: 'act', hand: g.hand.number, seq: g.hand.seq, move: 'fold' },
          { deviceId: HOST, now: g.wakeAt ?? NOW, rng: seededRng(i) },
        );
        if (r2.ok) g = r2.game;
      }
    }
    expect(g.hand?.number ?? 0).toBeGreaterThan(1);
    expect(total()).toBe(before);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The Durable Object base class only stores ctx and env; rooms and boards run here over an in-memory storage.
vi.mock('cloudflare:workers', () => ({
  DurableObject: class {
    ctx: unknown;
    env: unknown;
    constructor(ctx: unknown, env: unknown) {
      this.ctx = ctx;
      this.env = env;
    }
  },
}));
(globalThis as Record<string, unknown>).WebSocketRequestResponsePair = class {};

const { BankrollRoom } = await import('./bankroll');
const { Leaderboard } = await import('./leaderboard');
import type { Game } from '../src/game';

function memoryCtx() {
  const store = new Map<string, unknown>();
  let alarm: number | null = null;
  return {
    store,
    alarmAt: () => alarm,
    id: { name: undefined },
    setWebSocketAutoResponse: () => undefined,
    getWebSockets: () => [],
    storage: {
      get: async (k: string) => structuredClone(store.get(k)),
      put: async (k: string | Record<string, unknown>, v?: unknown) => void (typeof k === 'string' ? store.set(k, structuredClone(v)) : Object.entries(k).forEach(([a, b]) => store.set(a, structuredClone(b)))),
      delete: async (k: string) => store.delete(k),
      deleteAll: async () => store.clear(),
      list: async ({ prefix }: { prefix: string }) => new Map([...store].filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k, structuredClone(v)])),
      setAlarm: async (at: number) => void (alarm = at),
      deleteAlarm: async () => void (alarm = null),
    },
  };
}

const SEASON = '2026-11';
const LOOK = { username: 'sam', emoji: '🙂', name: 'Sam' };
let board: InstanceType<typeof Leaderboard>;
let ctx: ReturnType<typeof memoryCtx>;
let room: InstanceType<typeof BankrollRoom>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(Date.UTC(2026, 10, 5, 12));
  board = new Leaderboard(memoryCtx() as never, {} as never);
  ctx = memoryCtx();
  room = new BankrollRoom(ctx as never, { LEADERBOARD: { getByName: () => board } } as never);
});
afterEach(() => vi.useRealTimers());

/** Runs the room's clock until its table closes (nobody acts for the person, so they time out and the table closes). */
async function runUntilClosed(): Promise<Game> {
  for (let i = 0; i < 5000; i++) {
    const game = ctx.store.get('game') as Game;
    if (game.status === 'ended') return game;
    vi.setSystemTime(Math.max(Date.now() + 1, ctx.alarmAt() ?? Date.now()));
    await room.alarm();
  }
  throw new Error('The table never closed.');
}

describe('BankrollRoom', () => {
  it('starts everyone at 1,000 and puts the stack back into the bankroll when the table closes', async () => {
    expect((await room.status('111111', SEASON, LOOK)).bankroll).toBe(1000);
    expect(await room.sit('dev-1')).toBeNull();
    const game = await runUntilClosed();
    const person = game.players.find((p) => !p.bot)!;
    const after = await room.status('111111', SEASON);
    expect(after.bankroll).toBe(game.bankroll!.bank + person.stack);
    expect(after.handsToday).toBe(game.bankroll!.played);
    // Back again: the new table starts from exactly that bankroll, with the bots' read of the month seeded in.
    expect(await room.sit('dev-1')).toBeNull();
    const again = ctx.store.get('game') as Game;
    expect(again.bankroll!.start).toBe(after.bankroll);
    expect(again.bankroll!.today).toBe(after.handsToday);
    expect(Object.values(again.reads ?? {})[0]?.hands).toBeGreaterThan(0);
    expect((await board.row('111111'))?.score).toBe(after.bankroll);
  }, 60_000);

  it('won’t pass the day’s 50 hands', async () => {
    await room.status('111111', SEASON, LOOK);
    const rec = ctx.store.get('rec') as { handsToday: number };
    ctx.store.set('rec', { ...rec, handsToday: 50 });
    (room as unknown as { rec: undefined }).rec = undefined;
    expect(await room.sit('dev-1')).toBe('Back tomorrow.');
  });

  it('gives one rebuy a month', async () => {
    await room.status('111111', SEASON, LOOK);
    const rec = ctx.store.get('rec') as Record<string, unknown>;
    ctx.store.set('rec', { ...rec, bankroll: 0, status: 'busted', hands: 5 });
    (room as unknown as { rec: undefined }).rec = undefined;
    expect(await room.rebuy(true)).toBeNull();
    expect((await room.status('111111', SEASON)).bankroll).toBe(1000);
    ctx.store.set('rec', { ...(ctx.store.get('rec') as object), bankroll: 0, status: 'busted' });
    (room as unknown as { rec: undefined }).rec = undefined;
    expect(await room.rebuy(true)).toBe('The rebuy is used for this month.');
  });
});

describe('Leaderboard', () => {
  const row = (code: string, score: number) => ({ code, username: `p${code}`, emoji: '🙂', score, peak: score, rebuy: false, status: 'alive' as const, at: 0 });

  it('ranks ties together, cuts the bottom tenth once, and keeps a cut player cut', async () => {
    for (let i = 0; i < 20; i++) await board.report(row(String(100000 + i), i === 1 ? 0 : 1000 + i * 10));
    await board.report(row('200000', 1190));
    const view = await board.view('200000');
    expect(view.top[0].pos).toBe(1);
    expect(view.top[1].pos).toBe(1);
    expect(await board.cut(1)).toHaveLength(2);
    expect(await board.cut(1)).toEqual([]);
    expect((await board.report(row('100001', 5000))).status).toBe('cut');
    await board.remove('200000');
    expect((await board.view('200000')).me).toBeNull();
  });

  it('hides rows with a username that isn’t allowed', async () => {
    await board.report({ ...row('300000', 10), username: 'Bad Name!' });
    expect((await board.view(null)).top).toHaveLength(0);
  });
});

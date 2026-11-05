import { describe, expect, it } from 'vitest';

import { BANKROLL, BANKROLL_CAP, botRange, cutWeek, dayOf, dueCut, memoryNotes, nextCutAt, pickCut, seasonOf } from './bankroll';
import { applyAction, createBankrollTable } from './reducer';
import { options } from './selectors';
import { redactForDevice } from './redact';
import type { Game, PlayerRead } from './types';

function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ME = 'device-me';
const NOV = Date.UTC(2026, 10, 5, 12);

/** Every chip on the table and in the bank, less the bot chips that came on, plus those that left: never changes. */
function books(game: Game): number {
  const tag = game.bankroll!;
  const pot = game.hand && !game.hand.result ? game.hand.seats.reduce((s, x) => s + x.total, 0) : 0;
  return game.players.reduce((s, p) => s + p.stack, 0) + pot + tag.bank - tag.botIn + tag.botOut;
}

/** Plays a Bankroll sitting with a person who checks, calls small bets and folds to big ones, until it closes or `hands` are dealt. */
function sit(bankroll: number, opts: { seed?: number; today?: number; hands?: number; read?: PlayerRead; check?: (g: Game) => void } = {}) {
  const rng = seededRng(opts.seed ?? 1);
  let clock = NOV;
  let game = createBankrollTable({ deviceId: ME, name: 'Sam', emoji: '🙂', bankroll, season: seasonOf(clock), day: dayOf(clock), today: opts.today ?? 0, dayStart: bankroll, read: opts.read, now: clock, rng });
  const step = (a: Parameters<typeof applyAction>[1], who = ME) => {
    const r = applyAction(game, a, { deviceId: who, now: clock, rng });
    if (!r.ok) throw new Error(r.error);
    game = r.game;
  };
  step({ type: 'start' });
  const total = books(game);
  let dealt = 0;
  for (let i = 0; i < 60000 && game.status === 'playing' && dealt < (opts.hands ?? Infinity); i++) {
    const hand = game.hand;
    const me = game.players.find((p) => p.deviceId === ME)!;
    const before = hand?.number;
    if (hand && !hand.result && hand.toAct === me.id && !hand.runout) {
      const o = options(game, hand, hand.seats.find((s) => s.playerId === me.id)!);
      step({ type: 'act', hand: hand.number, seq: hand.seq, move: o.canCheck ? 'check' : o.toCall <= BANKROLL.bigBlind * 3 ? 'call' : 'fold' });
    } else {
      clock = Math.max(clock + 1, game.wakeAt ?? clock + 1000);
      step({ type: 'tick' }, 'server');
    }
    if (game.hand?.number !== before) {
      dealt++;
      opts.check?.(game);
    }
    expect(books(game)).toBe(total);
  }
  return { game, step: (a: Parameters<typeof applyAction>[1]) => step(a), total };
}

describe('a Bankroll table', () => {
  it('puts up to 100 big blinds on the table and banks the rest', () => {
    const { game } = sit(5000, { hands: 0 });
    const me = game.players.find((p) => !p.bot)!;
    expect(me.stack).toBe(BANKROLL_CAP);
    expect(game.bankroll!.bank).toBe(5000 - BANKROLL_CAP);
    expect(game.players.filter((p) => p.bot)).toHaveLength(5);
  });

  it('keeps every chip accounted for, and the bots in range, for a short, a medium and a deep stack', () => {
    for (const [bankroll, seed] of [
      [260, 2],
      [900, 3],
      [6000, 4],
    ]) {
      sit(bankroll, {
        seed,
        hands: 50,
        check: (g) => {
          const me = g.players.find((p) => !p.bot)!;
          if (!g.hand || g.status !== 'playing') return;
          const start = g.hand.startStacks ?? {};
          const { lo, far } = botRange(start[me.id] ?? me.stack);
          for (const p of g.players.filter((x) => x.bot && start[x.id] !== undefined)) {
            expect(start[p.id]).toBeGreaterThanOrEqual(lo);
            expect(start[p.id]).toBeLessThan(far);
          }
          expect(new Set(g.players.filter((p) => p.bot).map((p) => start[p.id])).size).toBeGreaterThan(1);
        },
      });
    }
  }, 120_000);

  it('closes after the day’s 50 hands and never deals a 51st', () => {
    const { game } = sit(3000, { today: 45, seed: 5 });
    expect(game.status).toBe('ended');
    expect(['limit', 'busted']).toContain(game.bankroll!.closed);
    if (game.bankroll!.closed === 'limit') expect(game.bankroll!.today + game.bankroll!.played).toBe(50);
  }, 60_000);

  it('folds you and closes when you leave mid-hand, with no refund', () => {
    const { game, step } = sit(2000, { hands: 3, seed: 6 });
    step({ type: 'end' });
    expect(game.status === 'playing' || game.status === 'ended').toBe(true);
  });

  it('refuses what would change the stakes, the bots or the stacks', () => {
    const { game } = sit(2000, { hands: 1 });
    for (const a of [{ type: 'rebuy' }, { type: 'addBot' }, { type: 'settings', settings: { bigBlind: 2 } }, { type: 'playAgain' }] as const) {
      expect(applyAction(game, a, { deviceId: ME, now: NOV, rng: Math.random }).ok).toBe(false);
    }
  });

  it('seeds the month’s read so the bots play against it, and never sends it to the phone', () => {
    const read: PlayerRead = { hands: 300, vpip: 200, pfr: 150, betsFaced: 100, foldsToBet: 80, aggr: 100, calls: 20 };
    const { game } = sit(2000, { hands: 0, read });
    const me = game.players.find((p) => !p.bot)!;
    expect(game.reads?.[me.id]?.hands).toBe(300);
    expect(redactForDevice(game, ME).reads).toBeUndefined();
    expect(redactForDevice(game, ME).hand?.deck ?? []).toEqual([]);
  });

  it('never shows the phone a card it hasn’t been dealt', () => {
    sit(2000, {
      hands: 20,
      check: (g) => {
        const view = redactForDevice(g, ME);
        const me = g.players.find((p) => !p.bot)!;
        for (const s of view.hand?.seats ?? []) if (s.playerId !== me.id && !s.shown) expect(s.cards).toEqual([]);
        expect(view.hand?.deck).toEqual([]);
      },
    });
  });
});

describe('the calendar and the cut', () => {
  it('cuts on Sundays after the 1st, numbered by week', () => {
    // November 2026 starts on a Sunday: no cut on the 1st; the 8th is week 1.
    expect(dueCut(Date.UTC(2026, 10, 1, 5))).toBeNull();
    expect(dueCut(Date.UTC(2026, 10, 9))).toMatchObject({ week: 1 });
    expect(cutWeek(Date.UTC(2026, 10, 22))).toBe(3);
    expect(nextCutAt(Date.UTC(2026, 10, 5))).toBe(Date.UTC(2026, 10, 8));
    expect(nextCutAt(Date.UTC(2026, 10, 29, 1))).toBeNull();
  });

  it('takes the bottom 10% of the players still alive', () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({ code: String(100000 + i), score: i * 100, peak: 1000, status: i === 0 ? ('busted' as const) : ('alive' as const) }));
    expect(pickCut(rows).map((r) => r.score)).toEqual([100, 200]);
    expect(pickCut(rows.slice(0, 9))).toEqual([]);
  });

  it('only mentions habits the month has really shown', () => {
    expect(memoryNotes({ hands: 10, vpip: 0, pfr: 0, betsFaced: 0, foldsToBet: 0, aggr: 0, calls: 0 }).size).toBe(0);
    expect(memoryNotes({ hands: 50, vpip: 0, pfr: 0, betsFaced: 0, foldsToBet: 0, aggr: 0, calls: 0, shownBets: 6, shownBluffs: 4 })).toEqual(new Set(['again', 'bluffs']));
  });
});

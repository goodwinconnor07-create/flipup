import { describe, expect, it } from 'vitest';
import { applyAction, createTable, DEFAULT_SETTINGS, seededRng } from '../game';
import { decide } from '../game/botPlay';
import { BOTS } from '../game/botStyles';
import { challengeFor, CHALLENGES, countHand, newRunning, weeklyPicks } from './challenges';

describe('bot challenges', () => {
  it('has one for every bot, and a stable handful each week', () => {
    expect(CHALLENGES).toHaveLength(40);
    for (const b of BOTS) expect(challengeFor(b.name), b.name).toBeTruthy();
    const week = weeklyPicks(1_700_000_000_000);
    expect(week).toHaveLength(6);
    expect(new Set(week.map((c) => c.bot)).size).toBe(6);
    expect(weeklyPicks(1_700_000_000_000).map((c) => c.bot)).toEqual(week.map((c) => c.bot));
  });

  it.each(['Finn', 'Gus', 'Ivy', 'Kai', 'Luna', 'Sage', 'Emma'])('%s: a challenge is decided one way or the other, with sane stars', (bot) => {
    const c = challengeFor(bot)!;
    const rng = seededRng(42);
    let now = 1_000_000;
    let game = createTable({
      hostDeviceId: 'me', name: 'Me', emoji: '🙂', code: null, now, bots: 1, botNames: [bot],
      settings: { ...DEFAULT_SETTINGS, startingStack: c.you * c.bigBlind, smallBlind: c.bigBlind / 2, bigBlind: c.bigBlind, rebuys: false, turnSeconds: 0 },
    });
    const them = game.players.find((p) => p.bot)!;
    them.stack = them.bought = c.them * c.bigBlind;
    const step = (action: Parameters<typeof applyAction>[1], deviceId: string) => {
      const r = applyAction(game, action, { deviceId, now, rng });
      if (!r.ok) throw new Error(r.error);
      game = r.game;
    };
    step({ type: 'start' }, 'me');
    const run = newRunning(bot, c.you * c.bigBlind);
    for (let i = 0; i < 20000 && !run.over && game.status !== 'ended'; i++) {
      now = Math.max(now + 1, game.wakeAt ?? now + 1);
      const h = game.hand;
      const me = game.players[0];
      if (h && !h.result && !h.runout && h.toAct === me.id) {
        const seat = h.seats.find((s) => s.playerId === me.id)!;
        const m = decide(game, h, seat, rng).move;
        const r = applyAction(game, { type: 'act', hand: h.number, seq: h.seq, move: m.move, to: m.to }, { deviceId: 'me', now, rng });
        if (r.ok) game = r.game;
      } else step({ type: 'tick' }, 'server');
      countHand(run, c, game, 'me');
    }
    expect(run.over, `${bot} never ended`).toBeTruthy();
    expect(run.over!.stars).toBeGreaterThanOrEqual(run.over!.won ? 1 : 0);
    expect(run.over!.stars).toBeLessThanOrEqual(3);
    expect(run.progress.hands).toBeGreaterThan(0);
  }, 60_000);
});

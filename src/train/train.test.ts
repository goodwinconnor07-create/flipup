import { describe, expect, it } from 'vitest';
import { applyAction, createTable, handRecord, recordNet, type Game } from '../game';
import { computeStats } from './stats';
import type { PlayedHand } from '../state/training';

function playBots(): Game {
  let game = createTable({ hostDeviceId: 'dev', name: 'Me', emoji: '🙂', settings: { startingStack: 200, smallBlind: 1, bigBlind: 2, rebuys: true, turnSeconds: 0 }, bots: 3, code: null, now: 0 });
  let now = 1;
  let seed = 7;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const ctx = (deviceId: string) => ({ deviceId, now, rng });
  game = (applyAction(game, { type: 'start' }, ctx('dev')) as { game: Game }).game;
  for (let step = 0; step < 4000 && (game.logs?.length ?? 0) < 6; step++) {
    now = Math.max(now + 1, (game.wakeAt ?? now) + 1);
    const hand = game.hand;
    const me = game.players.find((p) => p.deviceId === 'dev')!;
    if (hand && !hand.result && hand.toAct === me.id) {
      const r = applyAction(game, { type: 'act', hand: hand.number, seq: hand.seq, move: hand.currentBet > (hand.seats.find((s) => s.playerId === me.id)?.bet ?? 0) ? 'call' : 'check' }, ctx('dev'));
      if (r.ok) game = r.game;
      continue;
    }
    const r = applyAction(game, { type: 'tick' }, ctx('clock'));
    if (r.ok) game = r.game;
  }
  return game;
}

describe('hand records', () => {
  it('records every move and balances chips', () => {
    const game = playBots();
    const logs = game.logs ?? [];
    expect(logs.length).toBeGreaterThan(0);
    for (const l of logs) {
      const r = l.record!;
      expect(r).toBeTruthy();
      expect(r.actions.length).toBeGreaterThan(0);
      const total = r.players.reduce((t, p) => t + recordNet(r, p.id), 0);
      expect(Math.abs(total)).toBeLessThanOrEqual(r.players.length); // odd chips aside, zero-sum
    }
    expect(handRecord(game, game.hand!, 0)?.number ?? logs.at(-1)!.number).toBeGreaterThan(0);
  });

  it('computes stats from played hands', () => {
    const game = playBots();
    const me = game.players.find((p) => p.deviceId === 'dev')!;
    const hands: PlayedHand[] = (game.logs ?? []).map((l) => ({ key: `${game.id}#${l.number}`, heroId: me.id, record: l.record! }));
    const s = computeStats(hands, {}, { cbet_ip: { attempts: 4, green: 1, yellow: 1, red: 2, evLoss: 3 } });
    expect(s.hands).toBe(hands.length);
    expect(s.wins + s.losses).toBeLessThanOrEqual(s.hands);
    expect(s.vpip).toBeGreaterThanOrEqual(0);
    expect(s.weaknesses.map((w) => w.id)).toContain('cbet_ip');
  });
});

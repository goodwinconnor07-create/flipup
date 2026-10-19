import { describe, expect, it } from 'vitest';
import { applyAction, createTable, handRecord, recordNet, type Game } from '../game';
import { replay, type BuilderSetup } from './builder';
import { computeStats } from './stats';
import type { PlayedHand } from '../state/training';

const setup: BuilderSetup = {
  players: [
    { id: 'a', name: 'Ana', stack: 200 },
    { id: 'b', name: 'Ben', stack: 200 },
    { id: 'c', name: 'Cat', stack: 200 },
  ],
  buttonIndex: 0,
  smallBlind: 1,
  bigBlind: 2,
};

describe('custom hand builder', () => {
  it('starts with the player after the big blind', () => {
    const s = replay(setup, [], 0);
    expect(s.toAct).toBe('a'); // 3-handed: button acts first preflop
    expect(s.toCall).toBe(2);
    expect(s.minTo).toBe(4);
    expect(s.pot).toBe(3);
  });

  it('asks for the flop, then moves to the first player left of the button', () => {
    const acts = [
      { street: 'preflop', playerId: 'a', move: 'raise', to: 6 },
      { street: 'preflop', playerId: 'b', move: 'fold', to: 0 },
      { street: 'preflop', playerId: 'c', move: 'call', to: 6 },
    ] as const;
    const s = replay(setup, [...acts], 0);
    expect(s.toAct).toBeNull();
    expect(s.needCards).toBe(3);
    const f = replay(setup, [...acts], 3);
    expect(f.street).toBe('flop');
    expect(f.toAct).toBe('c');
    expect(f.canCheck).toBe(true);
    expect(f.pot).toBe(13);
  });

  it('ends the hand when everyone else folds and rejects illegal moves', () => {
    const s = replay(setup, [
      { street: 'preflop', playerId: 'a', move: 'fold', to: 0 },
      { street: 'preflop', playerId: 'b', move: 'fold', to: 0 },
    ], 0);
    expect(s.over).toBe(true);
    expect(() => replay(setup, [{ street: 'preflop', playerId: 'b', move: 'fold', to: 0 }], 0)).toThrow();
    expect(() => replay(setup, [{ street: 'preflop', playerId: 'a', move: 'raise', to: 3 }], 0)).toThrow();
  });

  it('runs out the board when everyone is all in', () => {
    const s = replay(setup, [
      { street: 'preflop', playerId: 'a', move: 'allin', to: 200 },
      { street: 'preflop', playerId: 'b', move: 'fold', to: 0 },
      { street: 'preflop', playerId: 'c', move: 'call', to: 200 },
    ], 0);
    expect(s.runout).toBe(true);
    expect(s.needCards).toBe(5);
  });
});

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

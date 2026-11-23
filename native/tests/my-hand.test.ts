import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS, applyAction, createTable, seatFor, type Card, type Game } from '@game/index';
import { RANKINGS } from '@design/handRankings';

import { myHandNow } from '../src/state/my-hand';

const ME = 'device-me-000001';

/** A Hold'em bots table with its first hand dealt, your seat's cards and the board set by hand. */
function table(hole: Card[], board: Card[], patch: { folded?: boolean } = {}): Game {
  let x = 7;
  const rng = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
  let game = createTable({ hostDeviceId: ME, name: 'Me', emoji: '🙂', settings: { ...DEFAULT_SETTINGS, turnSeconds: 0 }, bots: 2, code: null, now: 1, rng });
  let now = 10;
  const step = (deviceId: string, a: Parameters<typeof applyAction>[1]) => {
    const r = applyAction(game, a, { deviceId, now, rng });
    if (r.ok) game = r.game;
  };
  step(ME, { type: 'start' });
  for (let i = 0; i < 50 && !game.hand; i++) {
    now = Math.max(now + 1, game.wakeAt ?? now + 1000);
    step('clock', { type: 'tick' });
  }
  const me = game.players.find((p) => p.deviceId === ME)!.id;
  const hand = game.hand!;
  return {
    ...game,
    hand: { ...hand, moment: undefined, board, seats: hand.seats.map((s) => (s.playerId === me ? { ...s, cards: hole, folded: !!patch.folded } : s)) },
  };
}

describe('your hand now', () => {
  it('names two pair with its five cards and its row on the chart', () => {
    const mine = myHandNow(table(['Kc', '7c'], ['Ks', '7d', '2c', 'Ah', '9s']), ME, Date.now())!;
    expect(mine.name).toBe('Two pair');
    expect(RANKINGS[mine.row!].name).toBe('Two pair');
    expect(mine.best).toHaveLength(5);
    expect(mine.best).toContain('Ah');
  });

  it('has nothing to name before the flop without a pair, and names a pocket pair', () => {
    expect(myHandNow(table(['Kc', '7d'], []), ME, Date.now())).toBeNull();
    const pair = myHandNow(table(['8c', '8d'], []), ME, Date.now())!;
    expect(RANKINGS[pair.row!].name).toBe('Pair');
  });

  it('is nothing once you fold, or with no table', () => {
    expect(myHandNow(table(['Kc', 'Kd'], ['Ks', '7d', '2c'], { folded: true }), ME, Date.now())).toBeNull();
    expect(myHandNow(null, ME, Date.now())).toBeNull();
    const game = table(['Kc', 'Kd'], ['Ks', '7d', '2c']);
    expect(seatFor(game.hand!, game.players.find((p) => p.deviceId === ME)!.id)).toBeTruthy();
    expect(myHandNow(game, 'someone-else', Date.now())).toBeNull();
  });
});

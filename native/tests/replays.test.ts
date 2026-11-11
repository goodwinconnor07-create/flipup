import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-sqlite/localStorage/install', () => ({}));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

import { DEFAULT_SETTINGS, applyAction, createTable, type Game } from '@game/index';

import { handData, shareText, statsData } from '../src/components/share/data';
import { lastHand, momentsOf, noteReplay, putIn, saveLastHand, allReplays, type Replay } from '../src/state/replays';

beforeEach(() => {
  const mem = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k) });
});

const ME = 'device-me-000001';

/** A small seeded random number generator (a constant one sends the bots' sampling round in circles). */
function seeded(seed = 7): () => number {
  let x = seed;
  return () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
}

/** Plays a bots table until the first hand is over, calling or checking for you. */
function finishedHand(): Game {
  const rng = seeded();
  let game = createTable({ hostDeviceId: ME, name: 'Me', emoji: '🙂', settings: { ...DEFAULT_SETTINGS, turnSeconds: 0 }, bots: 2, code: null, now: 1, rng });
  let now = 10;
  const step = (deviceId: string, a: Parameters<typeof applyAction>[1]) => {
    const r = applyAction(game, a, { deviceId, now, rng });
    if (r.ok) game = r.game;
  };
  step(ME, { type: 'start' });
  for (let i = 0; i < 400 && !game.hand?.result; i++) {
    now = Math.max(now + 1, game.wakeAt ?? now + 1000);
    const hand = game.hand;
    if (hand?.toAct && game.players.find((p) => p.id === hand.toAct)?.deviceId === ME) {
      const owe = hand.currentBet > (hand.seats.find((s) => s.playerId === hand.toAct)?.bet ?? 0);
      step(ME, { type: 'act', hand: hand.number, seq: hand.seq, move: owe ? 'call' : 'check' });
    }
    step('clock', { type: 'tick' });
  }
  return game;
}

describe('hand bank', () => {
  it('holds the last hand without saving it, and saves it on Save hand', () => {
    const game = finishedHand();
    expect(game.hand?.result).toBeTruthy();
    noteReplay(game, ME, 'bots');
    expect(lastHand()?.number).toBe(1);
    expect(allReplays()).toHaveLength(0);
    expect(saveLastHand()).toBe(`${game.id}/1`);
    expect(allReplays()).toHaveLength(1);
    // Saving twice keeps one copy.
    saveLastHand();
    expect(allReplays()).toHaveLength(1);
    const r = allReplays()[0];
    // Chips add up: what everyone put in is the pot, and your net is what you got back less what you put in.
    const put = putIn(r);
    expect(Object.values(put).reduce((a, b) => a + b, 0)).toBe(r.pot);
    expect(r.net).toBe((r.won[r.me] ?? 0) - (put[r.me] ?? 0));
    expect(r.holes[r.me]).toHaveLength(2);
  });

  it('picks the hands worth sharing', () => {
    const base = { smallBlind: 5, bigBlind: 10, sbId: 'a', bbId: 'b', actions: [], streets: { flop: 3, turn: 4, river: 5 }, names: {}, won: {}, players: [] } as unknown as Replay;
    const win = { ...base, id: 'w', me: 'm', net: 500, showdown: false, board: ['2c', '7d', '9h', 'Js', '3c'], holes: { m: ['Ah', 'Kd'] } } as Replay;
    const best = { ...base, id: 'b', me: 'm', net: 0, showdown: true, myScore: 9, myHand: 'Four of a kind', board: [], holes: { m: [] } } as unknown as Replay;
    const moments = momentsOf([win, best]);
    expect(moments.find((m) => m.kind === 'bigWin')?.replay.id).toBe('w');
    expect(moments.find((m) => m.kind === 'bestHand')?.replay.id).toBe('b');
    expect(momentsOf([win, best], ['b'])[0]).toMatchObject({ kind: 'starred' });
    // Won without a showdown holding nothing: a bluff that worked (already the big win, so it isn't listed twice).
    expect(moments.filter((m) => m.replay.id === 'w')).toHaveLength(1);
  });
});

describe('share card data', () => {
  const who = { name: 'Me', emoji: '🙂', username: 'me' };
  it('turns a hand into a card with the hand line by line', () => {
    const game = finishedHand();
    noteReplay(game, ME, 'bots');
    const d = handData(lastHand()!, 'Biggest win', who);
    expect(d.eyebrow).toBe('BIGGEST WIN');
    expect(d.lines?.at(-1)?.left).toBe('Pot');
    expect(shareText(d)).toContain('FlipUp');
  });
  it('turns your record into a card', () => {
    const d = statsData({ hands: 10, won: 4, biggestPot: 300, best: null, games: [], seen: [] }, 3, who);
    expect(d.headline).toBe('40%');
    expect(d.stats?.find((s) => s.label === 'STREAK')?.value).toBe('3d');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-sqlite/localStorage/install', () => ({}));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

import { DEFAULT_SETTINGS, applyAction, createTable, seededRng, type Action, type Game, type Settings } from '@game/index';

import { forgetLastHand, lastHand, noteReplay, putIn } from '../src/state/replays';
import { reviewOf } from '../src/state/hand-review';

beforeEach(() => {
  const mem = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k) });
  forgetLastHand();
});

const ME = 'device-me-000001';
let clock = 1_000_000;

function must(game: Game, action: Action, deviceId: string): Game {
  const r = applyAction(game, action, { deviceId, now: clock, rng: seededRng(3) });
  if (!r.ok) throw new Error(r.error);
  return r.game;
}

/** Three people, the house rules given, everyone folds to the big blind. */
function foldedHand(settings: Partial<Settings>): Game {
  let g = createTable({ hostDeviceId: ME, name: 'Me', emoji: '😎', settings: { ...DEFAULT_SETTINGS, turnSeconds: 0, ...settings }, bots: 0, code: 'BCDFG', now: clock });
  g = must(g, { type: 'join', name: 'Ann', emoji: '🐸' }, 'd-ann');
  g = must(g, { type: 'join', name: 'Bo', emoji: '🐼' }, 'd-bo');
  g = must(g, { type: 'start' }, ME);
  while (!g.hand) {
    clock = g.wakeAt! + 1;
    g = must(g, { type: 'tick' }, 'server');
  }
  while (!g.hand!.result) {
    const who = g.players.find((p) => p.id === g.hand!.toAct)!;
    const seat = g.hand!.seats.find((s) => s.playerId === who.id)!;
    g = must(g, { type: 'act', hand: g.hand!.number, seq: g.hand!.seq, move: g.hand!.currentBet > seat.bet ? 'fold' : 'check' }, who.deviceId!);
    while (g.hand && !g.hand.result && !g.hand.toAct && g.wakeAt != null) {
      clock = g.wakeAt + 1;
      g = must(g, { type: 'tick' }, 'server');
    }
  }
  return g;
}

describe('saved hands under house rules', () => {
  it('count the antes and the straddle in what everyone put in', () => {
    const g = foldedHand({ ante: 50, straddle: true });
    noteReplay(g, ME, 'online');
    const r = lastHand()!;
    expect(r.ante).toBe(50);
    expect(r.straddle?.amount).toBe(20);
    const put = putIn(r);
    const total = Object.values(put).reduce((a, b) => a + b, 0);
    // Three antes of 5, the blinds and the straddle, before the uncalled part comes back.
    expect(total).toBe(15 + 5 + 10 + 20);
  });

  it('count a bomb pot as dead money with no blinds', () => {
    let g = foldedHand({ bombEvery: 5 });
    for (let i = 0; i < 4; i++) {
      clock = g.nextHandAt! + 1;
      g = must(g, { type: 'tick' }, 'server');
      if (!g.hand!.bomb) {
        while (!g.hand!.result) {
          const who = g.players.find((p) => p.id === g.hand!.toAct);
          if (!who) {
            clock = g.wakeAt! + 1;
            g = must(g, { type: 'tick' }, 'server');
            continue;
          }
          const seat = g.hand!.seats.find((s) => s.playerId === who.id)!;
          g = must(g, { type: 'act', hand: g.hand!.number, seq: g.hand!.seq, move: g.hand!.currentBet > seat.bet ? 'fold' : 'check' }, who.deviceId!);
        }
      }
    }
    expect(g.hand!.bomb).toBe(20);
    while (!g.hand!.result) {
      const who = g.players.find((p) => p.id === g.hand!.toAct);
      if (!who) {
        clock = g.wakeAt! + 1;
        g = must(g, { type: 'tick' }, 'server');
        continue;
      }
      g = must(g, { type: 'act', hand: g.hand!.number, seq: g.hand!.seq, move: 'check' }, who.deviceId!);
    }
    noteReplay(g, ME, 'online');
    const r = lastHand()!;
    expect(r.bomb).toBe(true);
    expect(putIn(r)).toEqual(Object.fromEntries(r.players.map((p) => [p.id, 20])));
    // A hand you checked down can still be reviewed.
    expect(reviewOf(r)).not.toBeNull();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addObservedHand, emptyTwin, twinNumbers, type HandRecord, type Move, type Street } from '../game';
import { addFriendByCode, bestTwin, loadFriend, loadFriends, notePlayed, observeHand, refreshFriend, removeFriend, type Friend } from './friends';

const storage = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v), removeItem: (k: string) => storage.delete(k) };
beforeEach(() => storage.clear());
afterEach(() => vi.unstubAllGlobals());

/** A heads-up hand seen from outside: 'me' on the button, 'foe' in the big blind with a twin code and no cards showing. */
function seen(n: number, actions: [Street, 'me' | 'foe', Move, number][], board: string[] = [], code: string | undefined = 'BCDFG'): HandRecord {
  return {
    tableId: 't',
    number: n,
    at: 0,
    smallBlind: 5,
    bigBlind: 10,
    buttonId: 'me',
    players: [
      { id: 'me', name: 'Me', emoji: '🙂', seat: 0, stack: 1000 },
      { id: 'foe', name: 'Dana', emoji: '🦊', seat: 1, stack: 1000, ...(code ? { twinCode: code } : {}) },
    ],
    actions: actions.map(([street, who, move, to]) => ({ street, playerId: who, move, to })),
    board,
    holes: { me: ['As', 'Kd'] },
    won: {},
    showdown: false,
  };
}

const sharedTwin = (hands: number) => ({ code: 'BCDFG', name: 'Dana', emoji: '🦊', updatedAt: 5, profile: { v: 1, hands, spots: {}, stats: { vpip: Math.round(hands / 4) }, seen: [] } });

describe('counting someone else from the outside', () => {
  it("counts what doesn't need their cards, and never their spots", () => {
    const t = emptyTwin();
    const hands = [
      seen(1, [['preflop', 'me', 'raise', 25], ['preflop', 'foe', 'fold', 0]]),
      seen(2, [['preflop', 'me', 'raise', 25], ['preflop', 'foe', 'call', 25], ['flop', 'foe', 'check', 0], ['flop', 'me', 'bet', 20], ['flop', 'foe', 'fold', 0]], ['2c', '7d', '9h']),
      seen(3, [['preflop', 'me', 'raise', 25], ['preflop', 'foe', 'raise', 80], ['preflop', 'me', 'call', 80], ['flop', 'foe', 'bet', 60], ['flop', 'me', 'fold', 0]], ['2c', '7d', '9h']),
    ];
    hands.forEach((h, i) => expect(addObservedHand(t, h, 'foe', `t#${i + 1}`)).toBe(true));
    expect(addObservedHand(t, hands[0], 'foe', 't#1')).toBe(false);
    expect(t.hands).toBe(3);
    expect(t.spots).toEqual({});
    expect(t.stats).toMatchObject({ vpip: 2, pfr: 1, raiseFaced: 3, foldsToRaise: 1, threeBets: 1, betsFaced: 1, foldsToBet: 1, betOpps: 2, bets: 1, sizeSum: [0, 0, 0, 0, 0, 0, 0] });
    expect(t.stats.bigN + t.stats.smallN).toBe(1);
    expect(twinNumbers(t, 0).foldToBet).toBe(1);
  });

  it('counts a hand they were dealt into even when they never got to act', () => {
    const t = emptyTwin();
    expect(addObservedHand(t, seen(1, [['preflop', 'me', 'fold', 0]]), 'foe', 'k')).toBe(true);
    expect(t.hands).toBe(1);
    expect(t.stats.vpip).toBe(0);
  });
});

describe('the friends list', () => {
  const hands = (from: number, n: number) => Array.from({ length: n }, (_, i) => seen(from + i, [['preflop', 'me', 'raise', 25], ['preflop', 'foe', 'fold', 0]]));

  it('meets a friend at a table, counts their hands once, and only when they show a twin code', () => {
    vi.stubGlobal('fetch', async () => new Response('{}', { status: 404 }));
    const list = hands(1, 3);
    for (const [i, h] of list.entries()) observeHand(h, `t#${i + 1}`, 'me');
    observeHand(list[0], 't#1', 'me');
    const f = loadFriend('BCDFG')!;
    expect(f).toMatchObject({ name: 'Dana', emoji: '🦊', shared: null, plays: 0 });
    expect(f.seen.hands).toBe(3);
    observeHand(seen(9, [['preflop', 'me', 'raise', 25], ['preflop', 'foe', 'fold', 0]], [], undefined), 't#9', 'me');
    expect(loadFriends()).toHaveLength(1);
  });

  it("doesn't bring back a friend you removed", () => {
    vi.stubGlobal('fetch', async () => new Response('{}', { status: 404 }));
    observeHand(hands(1, 1)[0], 't#1', 'me');
    removeFriend('BCDFG');
    expect(loadFriends()).toEqual([]);
    observeHand(hands(2, 1)[0], 't#2', 'me');
    expect(loadFriends()).toEqual([]);
  });

  it('adds a friend by their code, keeps what you saw of them, and marks a code that has stopped working', async () => {
    vi.stubGlobal('fetch', async () => new Response('{}', { status: 404 }));
    observeHand(hands(1, 2)[0], 't#1', 'me');
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify(sharedTwin(80)), { status: 200 }));
    const f = await addFriendByCode('BCDFG');
    expect(f.shared?.profile.hands).toBe(80);
    expect(f.seen.hands).toBe(1);
    expect(loadFriends()).toHaveLength(1);
    notePlayed('BCDFG');
    expect(loadFriend('BCDFG')!.plays).toBe(1);
    vi.stubGlobal('fetch', async () => new Response('{}', { status: 404 }));
    await refreshFriend('BCDFG');
    expect(loadFriend('BCDFG')).toMatchObject({ gone: true });
    expect(loadFriend('BCDFG')!.shared?.profile.hands).toBe(80);
    await expect(addFriendByCode('KLMNP')).rejects.toThrow('No twin with that code');
  });

  it('plays the shared twin when it has learned enough, and what you saw until then', () => {
    const base: Friend = { code: 'BCDFG', name: 'Dana', emoji: '🦊', shared: null, seen: emptyTwin(), addedAt: 0, plays: 0 };
    expect(bestTwin(base)).toBeNull();
    const seenOnly = { ...base, seen: { ...emptyTwin(), hands: 35 } };
    expect(bestTwin(seenOnly)).toMatchObject({ source: 'seen', ready: true, hands: 35 });
    expect(bestTwin({ ...base, seen: { ...emptyTwin(), hands: 10 } })).toMatchObject({ source: 'seen', ready: false });
    const shared = { profile: { ...emptyTwin(), hands: 20 }, at: 0, updatedAt: 0 };
    expect(bestTwin({ ...seenOnly, shared })).toMatchObject({ source: 'seen', ready: true });
    expect(bestTwin({ ...base, shared })).toMatchObject({ source: 'shared', ready: false, hands: 20 });
    expect(bestTwin({ ...seenOnly, shared: { ...shared, profile: { ...emptyTwin(), hands: 90 } } })).toMatchObject({ source: 'shared', ready: true, hands: 90 });
  });
});

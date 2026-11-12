import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-sqlite/localStorage/install', () => ({}));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

import { DEFAULT_SETTINGS, applyAction, createTable, redactForDevice, type Game, type HandAction } from '@game/index';

import { handData } from '../src/components/share/data';
import { cardsLabel, chenScore, isJunk, momentOf, oddsByStreet } from '../src/state/hand-moments';
import { allReplays, lastHand, noteReplay, saveLastHand, type Replay } from '../src/state/replays';

beforeEach(() => {
  const mem = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k) });
});

const act = (street: HandAction['street'], playerId: string, move: HandAction['move'], to = 0): HandAction => ({ street, playerId, move, to });

/**
 * You call a button raise from the big blind with 7-2 off against ace-king, are behind on the flop, make two pair on
 * the turn and a full house on the river. Blinds 10/20; the small blind folds.
 */
function sevenTwo(over: Partial<Replay> = {}): Replay {
  return {
    id: 't1/42',
    tableId: 't1',
    at: 0,
    mode: 'online',
    variant: 'holdem',
    number: 42,
    smallBlind: 10,
    bigBlind: 20,
    buttonId: 'p2',
    sbId: 'p3',
    bbId: 'p1',
    me: 'p1',
    players: [
      { id: 'p1', name: 'Me', emoji: '🦊', stack: 2000 },
      { id: 'p2', name: 'Sam', emoji: '🐻', stack: 2000 },
      { id: 'p3', name: 'Rook', emoji: '🦉', stack: 2000, bot: true },
    ],
    actions: [
      act('preflop', 'p2', 'raise', 60),
      act('preflop', 'p3', 'fold', 10),
      act('preflop', 'p1', 'call', 60),
      act('flop', 'p1', 'check'),
      act('flop', 'p2', 'bet', 80),
      act('flop', 'p1', 'call', 80),
      act('turn', 'p1', 'check'),
      act('turn', 'p2', 'bet', 200),
      act('turn', 'p1', 'call', 200),
      act('river', 'p1', 'bet', 400),
      act('river', 'p2', 'call', 400),
    ],
    board: ['Kc', '7h', '4s', '2h', '7d'],
    streets: { flop: 3, turn: 4, river: 5 },
    holes: { p1: ['7c', '2d'], p2: ['Ad', 'Kd'] },
    won: { p1: 1490 },
    names: {},
    showdown: true,
    net: 750,
    pot: 1490,
    ...over,
  };
}

describe('reading a hand', () => {
  it('names two cards the way players say them', () => {
    expect(cardsLabel(['7c', '2d'])).toBe('7-2');
    expect(cardsLabel(['Kd', 'As'])).toBe('A-K');
    expect(cardsLabel(['Th', 'Js'])).toBe('J-10');
  });

  it('scores hands by the Chen formula', () => {
    expect(chenScore(['As', 'Ad'])).toBe(20);
    expect(chenScore(['7c', '2d'])).toBe(-1);
    expect(chenScore(['As', 'Ks'])).toBe(12);
    expect(chenScore(['5c', '5d'])).toBe(5);
    expect(isJunk(['7c', '2d'])).toBe(true);
    expect(isJunk(['9c', '8c'])).toBe(false);
    expect(isJunk(['Kc', '2d'])).toBe(false);
  });
});

describe('odds by street', () => {
  it('works out your chance on each street when every hand still in is known', () => {
    const odds = oddsByStreet(sevenTwo());
    expect(odds.map((o) => o.street)).toEqual(['preflop', 'flop', 'turn', 'river']);
    const at = Object.fromEntries(odds.map((o) => [o.street, Math.round(o.you * 100)]));
    expect(at.preflop).toBeGreaterThanOrEqual(29);
    expect(at.preflop).toBeLessThanOrEqual(33);
    expect(at.flop).toBe(18);
    expect(at.turn).toBe(82);
    expect(at.river).toBe(100);
    for (const o of odds) expect(o.you + o.them).toBeCloseTo(1, 5);
  });

  it('gives nothing while someone still in never showed', () => {
    expect(oddsByStreet(sevenTwo({ id: 't1/43', holes: { p1: ['7c', '2d'] } }))).toEqual([]);
  });

  it('leaves out a street with a hand nobody saw', () => {
    // The small blind called and folded the flop without showing: no odds before the flop, then the two who stayed.
    const r = sevenTwo({ id: 't1/44', actions: [act('preflop', 'p2', 'raise', 60), act('preflop', 'p3', 'call', 60), act('preflop', 'p1', 'call', 60), act('flop', 'p1', 'check'), act('flop', 'p2', 'bet', 80), act('flop', 'p3', 'fold'), act('flop', 'p1', 'call', 80)] });
    expect(oddsByStreet(r).map((o) => o.street)).toEqual(['flop', 'turn', 'river']);
    // Once the folder showed, every street has odds.
    const shown = sevenTwo({ ...r, id: 't1/45', holes: { ...r.holes, p3: ['Qs', 'Js'] } });
    expect(oddsByStreet(shown).map((o) => o.street)).toEqual(['preflop', 'flop', 'turn', 'river']);
  });

  it('has no odds in Imposter', () => {
    expect(oddsByStreet(sevenTwo({ id: 't1/46', variant: 'imposter' }))).toEqual([]);
  });
});

describe('the moment', () => {
  it('calls out a junk hand that won', () => {
    const m = momentOf(sevenTwo());
    expect(m?.kind).toBe('junk');
    expect(m?.headline).toBe('Called with 7-2. Hit a boat.');
    expect(m?.line).toContain('Full house, sevens full of twos beat two pair, kings and sevens');
    expect(m?.line).toContain('18% on the flop');
  });

  it('finds the junk hand without odds too', () => {
    expect(momentOf(sevenTwo({ holes: { p1: ['7c', '2d'] } }), { odds: false })?.headline).toBe('Called with 7-2. Hit a boat.');
  });

  it("doesn't count the big blind checking a junk hand", () => {
    const r = sevenTwo({ id: 't1/47', actions: sevenTwo().actions.map((a) => (a.street === 'preflop' && a.playerId === 'p1' ? { ...a, move: 'check' as const, to: 20 } : a)) });
    expect(momentOf(r)?.kind).not.toBe('junk');
  });

  it('calls a comeback', () => {
    const r = sevenTwo({ id: 't2/1', holes: { p1: ['9c', '9s'], p2: ['Ad', 'Kd'] }, board: ['Kc', '7h', '4s', '9h', '2c'] });
    const m = momentOf(r);
    expect(m?.kind).toBe('comeback');
    expect(m?.headline).toMatch(/^\d+% on the flop\. Won anyway\.$/);
    expect(m?.line).toMatch(/nines beat a pair of kings$/);
  });

  it('calls a bad beat', () => {
    const r = sevenTwo({ id: 't2/2', holes: { p1: ['Ad', 'Kd'], p2: ['9c', '9s'] }, board: ['Kc', '7h', '4s', '9h', '2c'], net: -740, won: { p2: 1490 } });
    const m = momentOf(r);
    expect(m?.kind).toBe('badBeat');
    expect(m?.headline).toMatch(/^9\d% on the flop\. Still lost\.$/);
  });

  it('calls a bluff that worked', () => {
    const r = sevenTwo({
      id: 't3/1',
      holes: { p1: ['Qc', 'Jd'] },
      actions: [act('preflop', 'p2', 'call', 20), act('preflop', 'p3', 'call', 20), act('preflop', 'p1', 'check', 20), act('flop', 'p1', 'bet', 40), act('flop', 'p2', 'fold'), act('flop', 'p3', 'fold')],
      board: ['Kc', '7h', '4s'],
      streets: { flop: 3, turn: 4, river: 3 },
      showdown: false,
      pot: 100,
      net: 60,
      won: { p1: 100 },
    });
    expect(momentOf(r)?.kind).toBe('bluff');
  });

  it('calls a hero call', () => {
    const actions = [...sevenTwo().actions.slice(0, -2), act('river', 'p1', 'check'), act('river', 'p2', 'bet', 400), act('river', 'p1', 'call', 400)];
    const r = sevenTwo({ id: 't4/1', actions, holes: { p1: ['Ah', '6c'], p2: ['Qd', 'Jd'] }, board: ['Ac', '9h', '4s', '3d', '8c'] });
    const m = momentOf(r);
    expect(m?.kind).toBe('heroCall');
    expect(m?.headline).toBe('Hero call with a pair of aces.');
  });

  it('leaves an ordinary hand alone', () => {
    const r = sevenTwo({ id: 't5/1', holes: { p1: ['Ah', 'Kc'] }, showdown: false, net: 30, pot: 70, board: ['Kh', '7h', '4s'], streets: { flop: 3, turn: 4, river: 3 }, actions: [act('preflop', 'p1', 'raise', 60), act('preflop', 'p2', 'fold'), act('preflop', 'p3', 'fold')] });
    expect(momentOf(r)).toBeNull();
  });

  it('goes on the share card', () => {
    const d = handData(sevenTwo(), 'Big win', { name: 'Me', emoji: '🦊', username: 'me' });
    expect(d.moment?.headline).toBe('Called with 7-2. Hit a boat.');
    expect(d.odds?.map((o) => Math.round(o.you * 100))).toEqual([expect.any(Number), 18, 82, 100]);
    // A person shows as Opponent; a bot keeps its name.
    expect(d.matchup?.them?.name).toBe('Opponent');
    expect(d.matchup?.them?.cards).toEqual(['Ad', 'Kd']);
    expect(d.matchup?.you.hand).toBe('Full house, sevens full of twos');
  });
});

// ── Cards shown after the hand ──────────────────────────────────────────────

const ME = 'device-me-000001';

function seeded(seed = 7): () => number {
  let x = seed;
  return () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
}

/** A bots table played to the end of its first hand, calling or checking for you. */
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

describe('cards shown after the hand', () => {
  it('join the last hand and the saved copy', () => {
    const after = redactForDevice(finishedHand(), ME);
    expect(after.hand?.result).toBeTruthy();
    const me = after.players.find((p) => p.deviceId === ME)!;
    const them = after.hand!.seats.find((s) => s.playerId !== me.id && s.cards.length > 0)!;
    expect(them).toBeTruthy();
    // What the phone saw as the hand ended: their cards still hidden.
    const before: Game = structuredClone(after);
    const seat = before.hand!.seats.find((s) => s.playerId === them.playerId)!;
    seat.cards = [];
    seat.shown = false;
    noteReplay(before, ME, 'bots');
    const first = lastHand()!;
    expect(first.holes[them.playerId]).toBeUndefined();
    saveLastHand();

    // They tap Show cards while the result is still on the table.
    noteReplay(after, ME, 'bots');
    expect(lastHand()!.holes[them.playerId]).toEqual(them.cards);
    expect(lastHand()!.at).toBe(first.at);
    expect(allReplays()).toHaveLength(1);
    expect(allReplays()[0].holes[them.playerId]).toEqual(them.cards);
    // Nothing new: nothing changes.
    const same = lastHand();
    noteReplay(after, ME, 'bots');
    expect(lastHand()).toBe(same);
  });
});

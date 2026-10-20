import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTable, DEFAULT_SETTINGS } from '../game';
import { CHALLENGES, loadResults, newRunning } from './challenges';
import { loadLastBots, loadSession, loadSettings, loadStats, loadStreak, markPlayedToday, saveSession } from './persist';
import { addHand, loadDrills, loadHistory, loadSummaries, recordDrill, saveReview } from './training';

/** A phone's storage, in memory. `limit` makes writes over that many characters fail like a full phone does. */
function fakeStorage(limit = Infinity) {
  const data = new Map<string, string>();
  const store = {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (v.length > limit) throw new DOMException('full', 'QuotaExceededError');
      data.set(k, v);
    },
    removeItem: (k: string) => void data.delete(k),
  };
  vi.stubGlobal('localStorage', store);
  return store;
}

beforeEach(() => {
  fakeStorage();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const localGame = () => createTable({ hostDeviceId: 'dev12345678', name: 'Me', emoji: '🙂', settings: DEFAULT_SETTINGS, bots: 2, code: null, now: 0 });

describe('stored data that has been damaged or edited', () => {
  it('falls back to defaults instead of crashing', () => {
    localStorage.setItem('flipup.settings', '{not json');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    localStorage.setItem('flipup.settings', JSON.stringify({ startingStack: -5, bigBlind: 'x' }));
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    localStorage.setItem('flipup.settings', JSON.stringify({ startingStack: 2000, smallBlind: 10, bigBlind: 20, rebuys: false, turnSeconds: 0, extra: 1 }));
    expect(loadSettings()).toEqual({ startingStack: 2000, smallBlind: 10, bigBlind: 20, rebuys: false, turnSeconds: 0 });
    localStorage.setItem('flipup.stats', '"nope"');
    expect(loadStats()).toEqual({ net: 0, tables: 0, hands: 0, counted: [], games: [] });
    localStorage.setItem('flipup.lastbots', JSON.stringify({ bots: ['Luna'], at: 1, settings: { startingStack: 'lots' } }));
    expect(loadLastBots()?.settings).toEqual(DEFAULT_SETTINGS);
    localStorage.setItem('flipup.lastbots', JSON.stringify({ bots: 'Luna', at: 1 }));
    expect(loadLastBots()).toBeNull();
  });

  it('caps what it reads back, so a huge list cannot slow the app', () => {
    const games = Array.from({ length: 500 }, (_, i) => ({ at: i, net: i, hands: 1, players: 2 }));
    localStorage.setItem('flipup.stats', JSON.stringify({ net: 1, tables: -4, hands: 2, counted: Array.from({ length: 500 }, (_, i) => `g${i}`), games }));
    const s = loadStats();
    expect(s.games).toHaveLength(40);
    expect(s.games.at(-1)!.at).toBe(499);
    expect(s.counted).toHaveLength(30);
    expect(s.tables).toBe(0);
  });

  it('drops a saved table that could not be drawn, and keeps a good one', () => {
    const game = localGame();
    saveSession({ mode: 'local', code: null, game });
    expect(loadSession()?.game?.id).toBe(game.id);
    localStorage.setItem('flipup.session', JSON.stringify({ mode: 'local', code: null, game: { id: 'x', players: 'many' } }));
    expect(loadSession()).toBeNull();
    localStorage.setItem('flipup.session', JSON.stringify({ mode: 'online', code: 'not a code', game: null }));
    expect(loadSession()).toBeNull();
    localStorage.setItem('flipup.session', JSON.stringify({ mode: 'online', code: 'BCDFG', game: null, joining: 'yes' }));
    expect(loadSession()).toEqual({ mode: 'online', code: 'BCDFG', game: null, joining: undefined, challenge: undefined });
  });

  it('drops a challenge whose numbers are damaged, keeps an intact one', () => {
    const game = localGame();
    const run = newRunning('Luna', 1000);
    saveSession({ mode: 'local', code: null, game, challenge: run });
    expect(loadSession()?.challenge).toEqual(run);
    saveSession({ mode: 'local', code: null, game, challenge: { bot: 'Luna', progress: { hands: 'many' } } as never });
    expect(loadSession()?.challenge).toBeUndefined();
  });

  it('shows only real stars for real bots', () => {
    localStorage.setItem('flipup.challenges', JSON.stringify({ Luna: { stars: 9, at: 1 }, Eli: { stars: 2, at: 5 }, Nobody: { stars: 3, at: 1 } }));
    expect(loadResults()).toEqual({ Eli: { stars: 2, at: 5 } });
    localStorage.setItem('flipup.challenges', '[1,2]');
    expect(loadResults()).toEqual({});
    expect(CHALLENGES.length).toBeGreaterThan(0);
  });

  it('does not keep an old table when the new copy will not fit', () => {
    const store = fakeStorage();
    const game = localGame();
    saveSession({ mode: 'local', code: null, game });
    expect(store.data.has('flipup.session')).toBe(true);
    const full = fakeStorage(10);
    full.data.set('flipup.session', 'old');
    saveSession({ mode: 'local', code: null, game });
    expect(full.data.has('flipup.session')).toBe(false);
  });
});

describe('the daily streak', () => {
  const at = (iso: string) => vi.useFakeTimers().setSystemTime(new Date(iso));

  it('counts days in a row, survives until tonight, and breaks on a gap', () => {
    at('2026-03-10T09:00:00');
    localStorage.setItem('flipup.days', JSON.stringify(['2026-03-07', '2026-03-08', '2026-03-09']));
    expect(loadStreak()).toEqual({ days: 3, today: false });
    markPlayedToday();
    markPlayedToday();
    expect(JSON.parse(localStorage.getItem('flipup.days')!)).toHaveLength(4);
    expect(loadStreak()).toEqual({ days: 4, today: true });
    at('2026-03-12T09:00:00');
    expect(loadStreak()).toEqual({ days: 0, today: false });
  });

  it('steps over a month and a clock change without skipping or repeating a day', () => {
    at('2026-03-30T00:30:00');
    localStorage.setItem('flipup.days', JSON.stringify(['2026-03-28', '2026-03-29', '2026-03-30']));
    expect(loadStreak()).toEqual({ days: 3, today: true });
    at('2026-04-02T23:59:00');
    localStorage.setItem('flipup.days', JSON.stringify(['2026-03-31', '2026-04-01', '2026-04-02', 'junk', '2026-04-02']));
    expect(loadStreak()).toEqual({ days: 3, today: true });
  });
});

describe('training data kept on the phone', () => {
  const record = {
    tableId: 't', number: 1, at: 1, smallBlind: 1, bigBlind: 2, buttonId: 'a',
    players: [{ id: 'a', name: 'A', emoji: '🙂', seat: 0, stack: 100 }, { id: 'b', name: 'B', emoji: '🙂', seat: 1, stack: 100 }],
    actions: [{ street: 'preflop' as const, playerId: 'a', move: 'fold' as const, to: 0 }],
    board: [], holes: {}, won: { b: 3 }, showdown: false,
  };

  it('skips saved hands that the stats could not read', () => {
    addHand({ key: 't#1', heroId: 'a', record });
    localStorage.setItem(
      'flipup.history',
      JSON.stringify([
        ...JSON.parse(localStorage.getItem('flipup.history')!),
        { key: 'bad#1', heroId: 'a', record: { ...record, actions: null } },
        { key: 'bad#2', heroId: 'a', record: { ...record, bigBlind: 0 } },
        7,
        null,
      ]),
    );
    expect(loadHistory().map((h) => h.key)).toEqual(['t#1']);
  });

  it('makes room when storage is nearly full, and keeps the newest hands', () => {
    const hands = Array.from({ length: 50 }, (_, i) => ({ key: `t#${i}`, heroId: 'a', record: { ...record, number: i } }));
    const size = JSON.stringify(hands.slice(-10)).length + 10;
    fakeStorage(size);
    for (const h of hands) addHand(h);
    const kept = loadHistory();
    expect(kept.length).toBeGreaterThan(0);
    expect(kept.at(-1)!.key).toBe('t#49');
  });

  it('keeps only as many review summaries as there are saved hands', () => {
    for (let i = 0; i < 405; i++) saveReview({ key: `k${i}`, at: i, decisions: [] }, { n: i });
    const all = loadSummaries();
    expect(Object.keys(all)).toHaveLength(400);
    expect(all.k404).toBeTruthy();
    expect(all.k0).toBeUndefined();
  });

  it('cleans damaged review summaries and drill scores', () => {
    localStorage.setItem('flipup.reviews', JSON.stringify({ a: { key: 'a', at: 1 }, b: { key: 'b', at: 2, decisions: [{ street: 'flop', colour: 'red', evLoss: 'x', scenario: 3 }, { street: 'flop', colour: 'purple' }] } }));
    expect(loadSummaries()).toEqual({ b: { key: 'b', at: 2, decisions: [{ street: 'flop', colour: 'red', evLoss: null, scenario: null }] } });
    localStorage.setItem('flipup.drills', JSON.stringify({ rfi: { attempts: 'a', green: 2 }, bad: 5 }));
    expect(loadDrills()).toEqual({ rfi: { attempts: 0, green: 2, yellow: 0, red: 0, evLoss: 0 } });
  });

  it('does not let one odd number poison the drill totals', () => {
    recordDrill('rfi', 'red', Number.NaN);
    recordDrill('rfi', 'green', 0.5);
    expect(loadDrills().rfi).toEqual({ attempts: 2, green: 1, yellow: 0, red: 1, evLoss: 0.5 });
  });
});

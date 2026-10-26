import { describe, expect, it } from 'vitest';
import { addHandToTwin, emptyTwin, heroDecisions, parseSpotKey, POST_BUCKETS, preflopTier, sanitizeTwin, spotKey, TWIN_MOVES, twinConfidence, twinName, shareableTwin } from './twin';
import { options } from './selectors';
import { seededRng } from './cards';
import { applyAction, createTable, DEFAULT_SETTINGS } from './reducer';
import type { Action, Game, HandAction, HandRecord, Move, Street } from './types';

/** A heads-up hand: 'me' on the button (small blind), 'foe' in the big blind. */
function record(actions: [Street, 'me' | 'foe', Move, number][], board: string[], holes: string[] | null = ['As', 'Kd'], showdown = false): HandRecord {
  return {
    tableId: 't',
    number: 1,
    at: 0,
    smallBlind: 5,
    bigBlind: 10,
    buttonId: 'me',
    players: [
      { id: 'me', name: 'Me', emoji: '🙂', seat: 0, stack: 1000 },
      { id: 'foe', name: 'Foe', emoji: '🤖', seat: 1, stack: 1000 },
    ],
    actions: actions.map(([street, who, move, to]): HandAction => ({ street, playerId: who, move, to })),
    board,
    holes: holes ? { me: holes } : {},
    won: { me: 0, foe: 0 },
    showdown,
  };
}

describe('twin memory', () => {
  it('ranks starting hands from junk to premium', () => {
    expect(preflopTier(['As', 'Ad'])).toBe(7);
    expect(preflopTier(['As', 'Ks'])).toBe(7);
    expect(preflopTier(['Js', 'Ts'])).toBeGreaterThanOrEqual(5);
    expect(preflopTier(['7s', '2d'])).toBe(0);
    expect(preflopTier(['Ah', 'Kd'])).toBeGreaterThan(preflopTier(['9h', '8d']));
  });

  it('turns a hand into the spots the hero was in', () => {
    const r = record(
      [
        ['preflop', 'me', 'raise', 25],
        ['preflop', 'foe', 'call', 25],
        ['flop', 'foe', 'check', 0],
        ['flop', 'me', 'bet', 30],
        ['flop', 'foe', 'raise', 90],
        ['flop', 'me', 'fold', 0],
      ],
      ['2c', '7d', '9h'],
    );
    const d = heroDecisions(r, 'me');
    expect(d.map((x) => x.move)).toEqual(['betS', 'betB', 'fold']);
    expect(d[0].spot).toMatchObject({ street: 'preflop', pos: 'sb', facing: 'none', players: 2 });
    expect(d[1].spot).toMatchObject({ street: 'flop', pos: 'ip', facing: 'none' });
    expect(d[1].spot.strength).toBe(POST_BUCKETS.indexOf('weak'));
    expect(d[2].spot.facing).toBe('raise');
  });

  it('counts the usual stats', () => {
    const t = emptyTwin();
    const r = record(
      [
        ['preflop', 'me', 'raise', 25],
        ['preflop', 'foe', 'call', 25],
        ['flop', 'foe', 'check', 0],
        ['flop', 'me', 'bet', 15],
        ['flop', 'foe', 'call', 15],
        ['turn', 'foe', 'check', 0],
        ['turn', 'me', 'check', 0],
        ['river', 'foe', 'bet', 40],
        ['river', 'me', 'fold', 0],
      ],
      ['2c', '7d', '9h', 'Js', '3s'],
    );
    expect(addHandToTwin(t, r, 'me', 'k1')).toBe(true);
    expect(t.hands).toBe(1);
    expect(t.stats).toMatchObject({ vpip: 1, pfr: 1, firstIn: 1, opens: 1, sawFlop: 1, cbetOpps: 1, cbets: 1, betOpps: 2, bets: 1, betsFaced: 1, foldsToBet: 1, postAgg: 1, postBluffs: 1, showdowns: 0 });
    expect(t.stats.openBb).toBeCloseTo(2.5);
    // A small bet, 15 into 50, is recorded as 30% of the pot with ace-king high on a low board (a weak hand).
    const weak = POST_BUCKETS.indexOf('weak');
    expect(t.stats.sizeN[weak]).toBe(1);
    expect(t.stats.sizeSum[weak]).toBeCloseTo(0.3);
    expect(Object.values(t.spots).flat().reduce((a, b) => a + b, 0)).toBe(4);
  });

  it('never counts the same hand twice, or a hand without your cards', () => {
    const t = emptyTwin();
    const r = record([['preflop', 'me', 'fold', 0]], []);
    expect(addHandToTwin(t, r, 'me', 'k')).toBe(true);
    expect(addHandToTwin(t, r, 'me', 'k')).toBe(false);
    expect(addHandToTwin(t, record([['preflop', 'me', 'fold', 0]], [], null), 'me', 'other')).toBe(false);
    expect(t.hands).toBe(1);
  });

  it('keeps spot keys readable both ways', () => {
    const spot = { street: 'turn', pos: 'oop', strength: 4, facing: 'big', players: 3, role: 'a' } as const;
    expect(parseSpotKey(spotKey(spot))).toEqual(spot);
  });

  it('throws away a saved twin that is the wrong shape and cleans up a good one', () => {
    expect(sanitizeTwin({ v: 2 }).hands).toBe(0);
    expect(sanitizeTwin('nope').hands).toBe(0);
    const t = emptyTwin();
    addHandToTwin(t, record([['preflop', 'me', 'fold', 0]], []), 'me', 'k');
    const copy = sanitizeTwin(JSON.parse(JSON.stringify(t)));
    expect(copy).toEqual(t);
    copy.spots['junk'] = [1];
    expect(Object.keys(sanitizeTwin(copy).spots)).not.toContain('junk');
  });

  it("names a twin after its person, within the ten character limit", () => {
    expect(twinName('Kavi')).toBe('Kavi AI');
    expect(twinName('Kavisha')).toBe('Kavisha AI');
    expect(twinName('Alexandria')).toBe('Alexand AI');
    expect(twinName('  Jo  ')).toBe('Jo AI');
    expect(twinName('Alexandria AI').length).toBeLessThanOrEqual(10);
  });

  it('shares only counters: no list of hands, and only the spots seen most', () => {
    const t = emptyTwin();
    t.hands = 500;
    t.seen = ['a#1', 'a#2'];
    let n = 0;
    for (const street of ['flop', 'turn', 'river'])
      for (const pos of ['ip', 'oop'])
        for (let strength = 0; strength < 7; strength++)
          for (const facing of ['none', 'limp', 'small', 'big', 'raise', 'allin'])
            for (const players of [2, 3, 4])
              for (const role of ['a', 'd']) {
                if (n++ < 1700) t.spots[`${street}|${pos}|${strength}|${facing}|${players}|${role}`] = [0, n === 3 ? 99 : 1, 0, 0, 0, 0, 0];
              }
    expect(Object.keys(t.spots)).toHaveLength(1512);
    for (let i = 0; i < 400; i++) t.spots[`preflop|ep|${i % 8}|none|${(i % 3) + 2}|d`] = [1, 1, 0, 0, 0, 0, 0];
    t.spots['preflop|ep|7|big|4|d'] = [50, 50, 0, 0, 0, 0, 0];
    const shared = shareableTwin(t);
    expect(shared.seen).toEqual([]);
    expect(t.seen).toHaveLength(2);
    expect(shared.hands).toBe(500);
    expect(Object.keys(shared.spots).length).toBeLessThanOrEqual(1500);
    // The most-seen spot survives the trimming.
    expect(shared.spots['preflop|ep|7|big|4|d']).toEqual([50, 50, 0, 0, 0, 0, 0]);
    expect(Object.keys(t.spots).length).toBeGreaterThan(1500);
  });

  it('is fully confident at 300 hands', () => {
    expect(twinConfidence(0)).toBe(0);
    expect(twinConfidence(150)).toBe(0.5);
    expect(twinConfidence(900)).toBe(1);
  });

  // The memory has to cope with whatever real tables produce, and stay small.
  it('learns from a hundred bot hands without growing past a small size', () => {
    const rng = seededRng(7);
    let clock = 1_000_000;
    let game: Game = createTable({ hostDeviceId: 'me', name: 'Me', emoji: '🙂', settings: { ...DEFAULT_SETTINGS, turnSeconds: 0, rebuys: true }, bots: 2, code: null, now: clock });
    const step = (deviceId: string, action: Action) => {
      const r = applyAction(game, action, { deviceId, now: clock, rng });
      if (r.ok) game = r.game;
      return r.ok;
    };
    step('me', { type: 'start' });
    const twin = emptyTwin();
    let guard = 0;
    let logged = 0;
    while (twin.hands < 100 && guard++ < 20_000) {
      clock = Math.max(clock + 1, game.wakeAt ?? clock + 1000);
      const hand = game.hand;
      const me = game.players.find((p) => p.deviceId === 'me')!;
      if (me.stack === 0) me.stack = DEFAULT_SETTINGS.startingStack;
      if (hand && !hand.result && !hand.runout && hand.toAct === me.id) {
        // Checks when it's free, calls small bets, folds to big ones, so the bots fight out the pots.
        const o = options(game, hand, hand.seats.find((x) => x.playerId === me.id)!);
        const move = o.canCheck ? 'check' : o.toCall <= game.settings.bigBlind * 3 ? 'call' : 'fold';
        step('me', { type: 'act', hand: hand.number, seq: hand.seq, move });
      } else step('server', { type: 'tick' });
      for (const log of game.logs.slice(logged)) {
        const rec = log.record;
        if (rec && rec.holes[me.id]) addHandToTwin(twin, rec, me.id, `${rec.tableId}#${rec.number}`);
      }
      logged = game.logs.length;
    }
    expect(twin.hands).toBe(100);
    const s = twin.stats;
    expect(s.vpip).toBeLessThanOrEqual(100);
    expect(s.pfr).toBeLessThanOrEqual(s.vpip);
    expect(s.opens).toBeLessThanOrEqual(s.firstIn);
    expect(s.foldsToBet).toBeLessThanOrEqual(s.betsFaced);
    expect(s.cbets).toBeLessThanOrEqual(s.cbetOpps);
    expect(s.showdowns).toBeLessThanOrEqual(s.sawFlop);
    expect(s.vpip).toBeGreaterThan(10);
    // Each spot's counts line up with the move list.
    for (const counts of Object.values(twin.spots)) expect(counts).toHaveLength(TWIN_MOVES.length);
    expect(JSON.stringify(twin).length).toBeLessThan(100_000);
  });
});

import { describe, expect, it } from 'vitest';
import {
  applyAction,
  createTable,
  DEFAULT_SETTINGS,
  MISSION_GOAL,
  MISSION_SWAP_AFTER,
  missionDone,
  options,
  redactForDevice,
  rewardOf,
  SECRET_MISSION_IDS,
  seededRng,
  settleMissions,
  type Action,
  type Game,
  type Hand,
  type HandAction,
  type MissionId,
  type Settings,
} from './index';

const HOST = 'device-host';
let clock = 9_000_000;
const ctx = (deviceId: string, rng = seededRng(7)) => ({ deviceId, now: clock, rng });

function must(game: Game, action: Action, deviceId: string, rng = seededRng(7)): Game {
  const r = applyAction(game, action, { ...ctx(deviceId), rng });
  if (!r.ok) throw new Error(`${action.type}: ${r.error}`);
  return r.game;
}

function table(players: number, settings: Partial<Settings> = {}): Game {
  let game = createTable({ hostDeviceId: HOST, name: 'Host', emoji: '😎', settings: { ...DEFAULT_SETTINGS, turnSeconds: 0, variant: 'missions', ...settings }, bots: 0, code: 'BCDFG', now: clock });
  for (let i = 1; i < players; i++) game = must(game, { type: 'join', name: `P${i}`, emoji: '🐸' }, `device-${i}`);
  let g = must(game, { type: 'start' }, HOST);
  for (let i = 0; i < 5 && !g.hand; i++) {
    clock = g.wakeAt ?? clock + 1;
    g = must(g, { type: 'tick' }, 'server');
  }
  return g;
}

const deviceOf = (game: Game, id: string) => game.players.find((p) => p.id === id)!.deviceId!;
const idOf = (game: Game, name: string) => game.players.find((p) => p.name === name)!.id;

function settle(game: Game): Game {
  let g = game;
  for (let i = 0; i < 12; i++) {
    const hand = g.hand!;
    if (hand.result) return g;
    if (hand.toAct && hand.nextStreetAt == null && hand.bettingAt == null && hand.showdownAt == null && !hand.runout) return g;
    clock = (g.wakeAt ?? clock) + 1;
    g = must(g, { type: 'tick' }, 'server');
  }
  return g;
}

function act(game: Game, move: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin', to?: number): Game {
  const hand = game.hand!;
  return settle(must(game, { type: 'act', hand: hand.number, seq: hand.seq, move, to }, deviceOf(game, hand.toAct!)));
}

/** Plays to the next hand: everyone checks or calls, then waits for the deal. */
function nextHand(game: Game): Game {
  let g = game;
  const n = g.hand!.number;
  for (let i = 0; i < 40 && g.hand!.number === n; i++) {
    const hand = g.hand!;
    if (!hand.result && hand.toAct) {
      const o = options(g, hand, hand.seats.find((s) => s.playerId === hand.toAct)!);
      g = act(g, o.canCheck ? 'check' : 'call');
    } else {
      clock = (g.wakeAt ?? clock) + 1;
      g = must(g, { type: 'tick' }, 'server');
    }
  }
  return g;
}

function chipsInPlay(game: Game): number {
  return game.players.reduce((sum, p) => sum + p.stack, 0) + (game.hand && !game.hand.result ? game.hand.seats.reduce((s, x) => s + x.total, 0) : 0);
}

/** A made-up finished hand for checking one mission: who won, how, the cards and the moves. */
function finished(over: { cards?: string[]; board?: string[]; won?: boolean; showdown?: boolean; amount?: number; actions?: HandAction[]; otherOut?: boolean; button?: boolean; bb?: boolean; chop?: boolean; crowd?: boolean; allIn?: boolean }): { game: Game; hand: Hand } {
  const game = createTable({ hostDeviceId: HOST, name: 'Host', emoji: '😎', settings: { ...DEFAULT_SETTINGS, variant: 'missions' }, bots: 0, code: 'BCDFG', now: clock });
  game.players.push({ ...game.players[0], id: 'other', name: 'Other', deviceId: 'device-other', seat: 1, stack: over.otherOut ? 0 : 1000 });
  const me = game.players[0].id;
  const amount = over.amount ?? 100;
  const hand: Hand = {
    number: 1, seq: 0, buttonId: over.button === false ? 'other' : me, sbId: me, bbId: over.bb ? me : 'other',
    seats: [
      { playerId: me, cards: over.cards ?? ['Ah', 'Kd'], bet: 0, total: 50, folded: false, allIn: !!over.allIn, acted: true, shown: false, last: null },
      { playerId: 'other', cards: ['2c', '3d'], bet: 0, total: 50, folded: !over.showdown, allIn: false, acted: true, shown: false, last: null },
      ...(over.crowd ? ['x1', 'x2'].map((id) => ({ playerId: id, cards: [], bet: 0, total: 10, folded: true, allIn: false, acted: true, shown: false, last: null })) : []),
    ],
    deck: [], board: over.board ?? ['Qs', '9h', '4c', '8d', '2s'], street: 'river', toAct: null, currentBet: 0, minRaise: 20, aggressorId: null,
    runout: false, actAt: null, deadline: null, log: [], actions: (over.actions ?? []).map((a) => (a.playerId === 'ME' ? { ...a, playerId: me } : a)), startStacks: { [me]: 1000, other: 1000 },
    result: {
      pots: [{ amount, eligible: [me, 'other'], winners: over.won === false ? ['other'] : over.chop ? [me, 'other'] : [me] }],
      won: over.won === false ? { other: amount } : { [me]: amount },
      names: {}, showdown: !!over.showdown,
    },
  };
  return { game, hand };
}

const check = (id: MissionId, over: Parameters<typeof finished>[0]) => {
  const { game, hand } = finished(over);
  return missionDone(game, hand, game.players[0].id, id);
};

describe('Secret Missions', () => {
  it('gives everyone a secret mission at the deal, and shows each phone only its own', () => {
    const g = table(3);
    const m = g.missions!;
    expect(m.race).toBe(1);
    for (const s of g.hand!.seats) expect(SECRET_MISSION_IDS).toContain(m.players[s.playerId].mission);
    const theirs = redactForDevice(g, 'device-1');
    const mine = idOf(g, 'P1');
    for (const [id, p] of Object.entries(theirs.missions!.players)) expect(p.mission === null).toBe(id !== mine);
  });

  it('checks each mission from what happened in the hand', () => {
    const A: (street: HandAction['street'], move: HandAction['move']) => HandAction = (street, move) => ({ street, playerId: 'p', move, to: 0 });
    const me = (acts: HandAction[], id: string) => acts.map((a) => ({ ...a, playerId: id }));
    const host = 'ME';
    expect(check('smallball', { cards: ['Ah', 'Kd'], board: ['As', '9h', '4c', '8d', '2s'] })).toBe(true);
    expect(check('smallball', { cards: ['Ah', 'Ad'], board: ['As', '9h', '4c', '8d', '2s'] })).toBe(false);
    expect(check('silent', { showdown: false })).toBe(true);
    expect(check('silent', { showdown: true })).toBe(false);
    expect(check('slowroll', { actions: me([A('flop', 'call'), A('turn', 'check')], host) })).toBe(true);
    expect(check('slowroll', { actions: me([A('flop', 'bet')], host) })).toBe(false);
    expect(check('herocall', { showdown: true, actions: me([A('river', 'call')], host) })).toBe(true);
    expect(check('herocall', { showdown: true, actions: me([A('river', 'bet')], host) })).toBe(false);
    expect(check('pressure', { actions: [...me([A('river', 'bet')], host), { street: 'river', playerId: 'other', move: 'fold', to: 0 }] })).toBe(true);
    expect(check('lucky7', { cards: ['7h', 'Kd'] })).toBe(true);
    expect(check('lucky7', { cards: ['8h', 'Kd'] })).toBe(false);
    expect(check('biggame', { amount: 25 * DEFAULT_SETTINGS.bigBlind })).toBe(true);
    expect(check('biggame', { amount: 25 * DEFAULT_SETTINGS.bigBlind - 1 })).toBe(false);
    expect(check('relentless', { actions: me([A('flop', 'bet'), A('turn', 'raise')], host) })).toBe(true);
    expect(check('relentless', { actions: me([A('flop', 'bet'), A('turn', 'call')], host) })).toBe(false);
    expect(check('monster', { showdown: true, cards: ['Th', 'Jd'], board: ['Qs', '9h', '8c', '2d', '3s'] })).toBe(true);
    expect(check('monster', { showdown: true, cards: ['Ah', 'Kd'] })).toBe(false);
    expect(check('knockout', { showdown: true, otherOut: true })).toBe(true);
    expect(check('knockout', { showdown: true })).toBe(false);
    expect(check('bluffmaster', { cards: ['Ah', 'Kd'], board: ['Qs', '9h', '4c', '8d', '2s'] })).toBe(true);
    expect(check('bluffmaster', { cards: ['Ah', 'Kd'], board: ['As', '9h', '4c', '8d', '2s'] })).toBe(false);
    expect(check('smallball', { won: false })).toBe(false);
    // The newer, lighter missions.
    expect(check('suited', { cards: ['Ah', 'Kh'] })).toBe(true);
    expect(check('suited', { cards: ['Ah', 'Kd'] })).toBe(false);
    expect(check('twins', { cards: ['8h', '8d'] })).toBe(true);
    expect(check('twins', { cards: ['8h', '9d'] })).toBe(false);
    expect(check('red', { cards: ['Ah', 'Kd'] })).toBe(true);
    expect(check('red', { cards: ['Ah', 'Ks'] })).toBe(false);
    expect(check('royalty', { cards: ['Jh', '4d'] })).toBe(true);
    expect(check('royalty', { cards: ['Ah', '4d'] })).toBe(false);
    expect(check('button', {})).toBe(true);
    expect(check('button', { button: false })).toBe(false);
    expect(check('defender', { bb: true })).toBe(true);
    expect(check('defender', {})).toBe(false);
    expect(check('steal', { board: [], actions: me([A('preflop', 'raise')], host) })).toBe(true);
    expect(check('steal', { board: ['Qs', '9h', '4c'], actions: me([A('preflop', 'raise')], host) })).toBe(false);
    expect(check('riverrat', {})).toBe(true);
    expect(check('riverrat', { board: ['Qs', '9h', '4c', '8d'] })).toBe(false);
    expect(check('underdog', { cards: ['9h', '4d'] })).toBe(true);
    expect(check('underdog', { cards: ['Th', '4d'] })).toBe(false);
    expect(check('connected', { cards: ['8h', '7d'] })).toBe(true);
    expect(check('connected', { cards: ['Ah', '2d'] })).toBe(true);
    expect(check('connected', { cards: ['8h', '6d'] })).toBe(false);
    expect(check('twopair', { showdown: true, cards: ['Qh', '9d'] })).toBe(true);
    expect(check('twopair', { showdown: true, cards: ['Qh', '5d'] })).toBe(false);
    expect(check('trapdoor', { won: false, actions: me([A('turn', 'check'), A('turn', 'raise')], host) })).toBe(true);
    expect(check('trapdoor', { actions: me([A('turn', 'bet'), A('turn', 'raise')], host) })).toBe(false);
    expect(check('shove', { allIn: true })).toBe(true);
    expect(check('shove', {})).toBe(false);
    expect(check('crowd', { crowd: true })).toBe(true);
    expect(check('crowd', {})).toBe(false);
    expect(check('deuce', { cards: ['2h', 'Kd'] })).toBe(true);
    expect(check('deuce', { cards: ['3h', 'Kd'] })).toBe(false);
    expect(check('bully', { won: false, actions: me([A('preflop', 'raise'), A('flop', 'bet'), A('turn', 'bet')], host) })).toBe(true);
    expect(check('bully', { actions: me([A('preflop', 'raise'), A('flop', 'bet')], host) })).toBe(false);
    expect(check('chop', { showdown: true, chop: true })).toBe(true);
    expect(check('chop', { showdown: true })).toBe(false);
  });

  it('pays a completed mission from every other player and gives a new one next hand', () => {
    let g = table(3);
    const host = idOf(g, 'Host');
    g = structuredClone(g);
    g.missions!.players[host].mission = 'silent';
    const total = chipsInPlay(g);
    // Everyone calls, then the host bets the flop and the others fold: a win after the flop without a showdown.
    while (g.hand!.street === 'preflop') {
      const o = options(g, g.hand!, g.hand!.seats.find((s) => s.playerId === g.hand!.toAct)!);
      g = act(g, o.canCheck ? 'check' : 'call');
    }
    for (let i = 0; i < 6 && !g.hand!.result; i++) g = g.hand!.toAct === host ? act(g, 'bet', 40) : act(g, options(g, g.hand!, g.hand!.seats.find((s) => s.playerId === g.hand!.toAct)!).canCheck ? 'check' : 'fold');
    const done = g.hand!.missionsDone!;
    expect(done.map((d) => d.by)).toContain(host);
    const mine = done.find((d) => d.by === host)!;
    expect(Object.values(mine.paid)).toEqual([rewardOf('silent') * DEFAULT_SETTINGS.bigBlind, rewardOf('silent') * DEFAULT_SETTINGS.bigBlind]);
    expect(g.missions!.players[host]).toMatchObject({ mission: null, done: 1 });
    expect(chipsInPlay(g)).toBe(total);
    g = nextHand(g);
    expect(SECRET_MISSION_IDS).toContain(g.missions!.players[host].mission);
  });

  it('keeps a mission that isn’t completed, and swaps it after 15 hands', () => {
    let g = table(2);
    const host = idOf(g, 'Host');
    g = structuredClone(g);
    g.missions!.players[host] = { mission: 'monster', since: g.hand!.number, done: 0 };
    g = nextHand(g);
    if (!g.hand!.result) expect(g.missions!.players[host].mission).toBe('monster');
    g = structuredClone(g);
    g.missions!.players[host] = { mission: 'monster', since: g.hand!.number - MISSION_SWAP_AFTER + 1, done: 0 };
    g = nextHand(g);
    expect(g.missions!.players[host].mission).not.toBe('monster');
  });

  it('settles the race once half the table has finished, changing stacks by place', () => {
    const g = table(4);
    const ids = g.players.map((p) => p.id);
    const m = g.missions!;
    // Two of four have finished (half the table): the race is settled at the end of this hand.
    m.finished = [ids[2], ids[0]];
    m.players[ids[1]].done = 3;
    m.players[ids[3]].done = 1;
    for (const id of ids) m.players[id].mission = 'monster';
    const before = Object.fromEntries(g.players.map((p) => [p.id, p.stack]));
    g.hand!.result = { pots: [], won: {}, names: {}, showdown: false };
    expect(settleMissions(g, g.hand!)).toBe(true);
    const after = (id: string) => g.players.find((p) => p.id === id)!.stack;
    expect(after(ids[2])).toBe(Math.round(before[ids[2]] * 2.5));
    expect(after(ids[0])).toBe(Math.round(before[ids[0]] * 2));
    expect(after(ids[1])).toBe(Math.round(before[ids[1]] * 1.5));
    expect(after(ids[3])).toBe(Math.round(before[ids[3]] * 1.25));
    expect(m.race).toBe(2);
    expect(m.finished).toEqual([]);
    for (const id of ids) expect(m.players[id]).toMatchObject({ done: 0, mission: null });
    expect(m.last!.places.map((x) => x.id)).toEqual([ids[2], ids[0], ids[1], ids[3]]);
  });

  it(`finishing ${MISSION_GOAL} missions takes a place in the race`, () => {
    const g = table(4);
    const host = idOf(g, 'Host');
    g.missions!.players[host] = { mission: 'silent', since: 1, done: MISSION_GOAL - 1 };
    for (const s of g.hand!.seats) if (s.playerId !== host) s.folded = true;
    g.hand!.board = ['2c', '3d', '9h'];
    g.hand!.result = { pots: [{ amount: 30, eligible: [host], winners: [host] }], won: { [host]: 30 }, names: {}, showdown: false };
    settleMissions(g, g.hand!);
    expect(g.missions!.finished).toEqual([host]);
    expect(g.missions!.race).toBe(1);
  });

  it('keeps every chip accounted for over many bot hands, except what a race adds or takes away', () => {
    let game = createTable({ hostDeviceId: HOST, name: 'Host', emoji: '😎', settings: { ...DEFAULT_SETTINGS, turnSeconds: 5, variant: 'missions' }, bots: 4, code: null, now: clock });
    const styles = ['pro', 'maniac', 'station', 'gambler'];
    game.players.filter((p) => p.bot).forEach((p, i) => (p.style = styles[i]));
    game = must(game, { type: 'start' }, HOST);
    let total = chipsInPlay(game);
    const rng = seededRng(5);
    let hands = 0;
    let completed = 0;
    let seen = -1;
    for (let i = 0; i < 9000 && game.status === 'playing' && hands < 80; i++) {
      const before = game.hand?.number;
      const hostId = game.players.find((p) => p.deviceId === HOST)!.id;
      const hand = game.hand;
      let r;
      if (hand && !hand.result && hand.toAct === hostId) {
        const o = options(game, hand, hand.seats.find((x) => x.playerId === hostId)!);
        r = applyAction(game, { type: 'act', hand: hand.number, seq: hand.seq, move: o.canCheck ? 'check' : o.toCall <= game.settings.bigBlind * 2 ? 'call' : 'fold' }, ctx(HOST));
      } else {
        clock = (game.wakeAt ?? clock) + 1;
        r = applyAction(game, { type: 'tick' }, { deviceId: 'server', now: clock, rng });
      }
      if (!r.ok) throw new Error(r.error);
      game = r.game;
      if (game.hand?.number !== before) hands++;
      if (game.hand?.result && game.hand.number !== seen) {
        seen = game.hand.number;
        completed += game.hand.missionsDone?.length ?? 0;
        // A race settled this hand: its changes are the only chips made or taken away.
        if (game.missions?.last?.hand === game.hand.number) total += game.missions.last.places.reduce((a, x) => a + x.chips, 0);
      }
      expect(chipsInPlay(game)).toBe(total);
      for (const p of game.players) expect(p.stack).toBeGreaterThanOrEqual(0);
    }
    expect(hands).toBeGreaterThan(10);
    expect(completed).toBeGreaterThan(0);
  }, 40000);
});

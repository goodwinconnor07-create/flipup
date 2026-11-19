// House rules: antes, the straddle, bomb pots and running it twice (docs/RULES.md "House rules").

import { describe, expect, it } from 'vitest';
import { applyAction, createTable, DEFAULT_SETTINGS, handNet, options, parseAction, recordNet, seededRng, showdownWinners, startWait, type Action, type Game, type Settings } from './index';

const HOST = 'device-host';
let clock = 5_000_000;
const ctx = (deviceId: string, rng = seededRng(7)) => ({ deviceId, now: clock, rng });
const h = (s: string) => s.split(' ');

function must(game: Game, action: Action, deviceId: string, rng = seededRng(7)): Game {
  const r = applyAction(game, action, { ...ctx(deviceId), rng });
  if (!r.ok) throw new Error(`${action.type}: ${r.error}`);
  return r.game;
}

function table(players: number, settings: Partial<Settings> = {}): Game {
  let game = createTable({
    hostDeviceId: HOST,
    name: 'Host',
    emoji: '😎',
    settings: { ...DEFAULT_SETTINGS, turnSeconds: 0, ...settings },
    bots: 0,
    code: 'BCDFG',
    now: clock,
  });
  for (let i = 1; i < players; i++) game = must(game, { type: 'join', name: `P${i}`, emoji: '🐸' }, `device-${i}`);
  let g = must(game, { type: 'start' }, HOST);
  expect(g.nextHandAt).toBe(clock + startWait(g));
  for (let i = 0; i < 5 && !g.hand; i++) {
    clock = g.wakeAt ?? clock + 1;
    g = must(g, { type: 'tick' }, 'server');
  }
  return g;
}

const deviceOf = (game: Game, id: string) => game.players.find((p) => p.id === id)!.deviceId!;
const nameOf = (game: Game, id: string | null | undefined) => game.players.find((p) => p.id === id)?.name;
const chips = (game: Game) => game.players.reduce((s, p) => s + p.stack, 0) + (game.hand && !game.hand.result ? game.hand.seats.reduce((s, x) => s + x.total, 0) : 0);

/** Ticks the table along until `done` (or nothing more is due). */
function run(game: Game, done: (g: Game) => boolean, limit = 30): Game {
  let g = game;
  for (let i = 0; i < limit && !done(g) && g.wakeAt != null; i++) {
    clock = g.wakeAt + 1;
    g = must(g, { type: 'tick' }, 'server');
  }
  return g;
}

function act(game: Game, move: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin', to?: number): Game {
  const hand = game.hand!;
  const g = must(game, { type: 'act', hand: hand.number, seq: hand.seq, move, to }, deviceOf(game, hand.toAct!));
  return g.hand?.nextStreetAt != null ? run(g, (x) => x.hand!.nextStreetAt == null) : g;
}

/** Fixes the hole cards and the deck: `deck` is dealt from the top, burns included. */
function rig(game: Game, holes: Record<string, string>, deck: string): Game {
  const g = structuredClone(game);
  for (const s of g.hand!.seats) s.cards = h(holes[nameOf(g, s.playerId)!]);
  g.hand!.deck = h(deck);
  return g;
}

describe('antes', () => {
  it('takes an ante from everyone as dead money, and the bet to call stays the big blind', () => {
    const game = table(4, { ante: 50 });
    const hand = game.hand!;
    expect(hand.dead && Object.values(hand.dead)).toEqual([5, 5, 5, 5]);
    expect(hand.currentBet).toBe(10);
    expect(hand.seats.reduce((s, x) => s + x.total, 0)).toBe(20 + 15);
    expect(hand.log.some((l) => l === 'Everyone antes 5')).toBe(true);
    // The player after the big blind acts first, as always.
    const ids = hand.seats.map((s) => s.playerId);
    expect(hand.toAct).toBe(ids[(ids.indexOf(hand.bbId) + 1) % 4]);
  });

  it('counts the ante in what each player won or lost', () => {
    let game = table(3, { ante: 100 });
    game = act(act(game, 'fold'), 'fold');
    const r = game.logs.at(-1)!.record!;
    expect(r.dead).toBeDefined();
    const nets = r.players.map((p) => recordNet(r, p.id));
    expect(nets.reduce((a, b) => a + b, 0)).toBe(0);
    expect(recordNet(r, game.hand!.bbId)).toBe(25);
  });

  it('refuses an ante that is not one of the choices', () => {
    expect(parseAction({ type: 'settings', settings: { ante: 25 } })).not.toBeNull();
    const game = table(2);
    expect(applyAction(game, { type: 'settings', settings: { ante: 33 } }, ctx(HOST)).ok).toBe(false);
  });
});

describe('the straddle', () => {
  it('puts in two big blinds after the big blind, who raises the minimum by a straddle and gets the option', () => {
    let game = table(4, { straddle: true });
    const hand = game.hand!;
    const ids = hand.seats.map((s) => s.playerId);
    const straddler = ids[(ids.indexOf(hand.bbId) + 1) % 4];
    expect(hand.straddle).toEqual({ id: straddler, amount: 20 });
    expect(hand.currentBet).toBe(20);
    // Next to act is the button, the seat after the straddle.
    expect(hand.toAct).toBe(ids[(ids.indexOf(straddler) + 1) % 4]);
    expect(applyAction(game, { type: 'act', hand: 1, seq: hand.seq, move: 'raise', to: 39 }, ctx(deviceOf(game, hand.toAct!))).ok).toBe(false);
    // Everyone calls: the straddler can still raise.
    game = act(game, 'call');
    game = act(game, 'call');
    game = act(game, 'call');
    expect(game.hand!.toAct).toBe(straddler);
    const seat = game.hand!.seats.find((s) => s.playerId === straddler)!;
    expect(options(game, game.hand!, seat).canRaise).toBe(true);
    game = act(game, 'check');
    expect(game.hand!.street).toBe('flop');
  });

  it('is never posted heads-up', () => {
    const game = table(2, { straddle: true });
    expect(game.hand!.straddle).toBeUndefined();
    expect(game.hand!.currentBet).toBe(10);
  });
});

describe('bomb pots', () => {
  it('every fifth hand, everyone puts in two big blinds and the hand starts on the flop', () => {
    let game = table(3, { bombEvery: 5 });
    for (let n = 1; n < 5; n++) {
      expect(game.hand!.bomb).toBeUndefined();
      game = act(act(game, 'fold'), 'fold');
      clock += 60_000;
      game = must(game, { type: 'tick' }, 'server');
    }
    const hand = game.hand!;
    expect(hand.number).toBe(5);
    expect(hand.bomb).toBe(20);
    expect(hand.seats.map((s) => s.total)).toEqual([20, 20, 20]);
    game = run(game, (g) => g.hand!.toAct != null);
    expect(game.hand!.street).toBe('flop');
    expect(game.hand!.board.length).toBe(3);
    expect(game.hand!.currentBet).toBe(0);
    expect(game.hand!.log).toContain('Bomb pot: everyone puts in 20');
  });
});

describe('run it twice', () => {
  /** Heads-up, both all in before the flop, with two runs that split the pot. */
  function allIn(): Game {
    let game = table(2, { runTwice: true });
    const [a, b] = game.hand!.seats.map((s) => nameOf(game, s.playerId)!);
    // Run one: aces hold. Run two: the sevens make a set.
    game = rig(game, { [a]: 'Ah Ad', [b]: '7c 7d' }, '2c Ks 9c 5d 2d 3h 2h Jc 3c Qs 7h 4d 3d Th 4c 8s');
    game = act(game, 'allin');
    return act(game, 'call');
  }

  it('asks both players, deals two boards when both agree, and splits the pot between the runs', () => {
    let game = allIn();
    const t = game.hand!.twice!;
    expect(t.until).not.toBeNull();
    expect(t.asked.length).toBe(2);
    const [x, y] = t.asked;
    game = must(game, { type: 'runTwice', hand: game.hand!.number, yes: true }, deviceOf(game, x));
    expect(game.hand!.twice!.until).not.toBeNull();
    game = must(game, { type: 'runTwice', hand: game.hand!.number, yes: true }, deviceOf(game, y));
    expect(game.hand!.twice!.agreed).toBe(true);
    game = run(game, (g) => !!g.hand!.result);
    const result = game.hand!.result!;
    expect(result.runs!.map((r) => r.board)).toEqual([h('Ks 9c 5d 3h Jc'), h('Qs 7h 4d Th 8s')]);
    // Each player takes one half.
    expect(game.players.map((p) => p.stack).sort()).toEqual([1000, 1000]);
    // Breaking even is shown as 0, not as the 1,000 that came back; each run lights its own winner on its own board.
    for (const p of game.players) expect(handNet(game.hand!, p.id)).toBe(0);
    const lit = showdownWinners(game.hand!);
    expect(lit.map((w) => w.board)).toEqual(result.runs!.map((r) => r.board));
    expect(lit[0].ids).not.toEqual(lit[1].ids);
    expect(game.logs.at(-1)!.record!.firstBoard).toEqual(h('Ks 9c 5d 3h Jc'));
  });

  it('runs it once when anyone says no', () => {
    let game = allIn();
    const [x] = game.hand!.twice!.asked;
    game = must(game, { type: 'runTwice', hand: game.hand!.number, yes: false }, deviceOf(game, x));
    expect(game.hand!.twice!.agreed).toBe(false);
    game = run(game, (g) => !!g.hand!.result);
    expect(game.hand!.result!.runs).toBeUndefined();
    expect(game.players.map((p) => p.stack).sort((a, b) => a - b)).toEqual([0, 2000]);
  });

  it('runs it once when nobody answers in time', () => {
    let game = allIn();
    game = run(game, (g) => !!g.hand!.result);
    expect(game.hand!.twice!.agreed).toBe(false);
    expect(game.hand!.result!.runs).toBeUndefined();
  });

  it("doesn't ask when the all-in is on the river", () => {
    let game = table(2, { runTwice: true });
    game = act(act(game, 'call'), 'check');
    game = act(act(game, 'check'), 'check');
    game = act(act(game, 'check'), 'check');
    game = act(act(game, 'allin'), 'call');
    expect(game.hand!.twice).toBeUndefined();
  });
});

describe('house rules together', () => {
  it('keeps every chip accounted for over many hands with bots', () => {
    let game = createTable({
      hostDeviceId: HOST,
      name: 'Host',
      emoji: '😎',
      settings: { ...DEFAULT_SETTINGS, turnSeconds: 5, ante: 25, straddle: true, bombEvery: 5, runTwice: true, startingStack: 400, rebuys: true },
      bots: 5,
      code: null,
      now: clock,
    });
    game.legacyBotSimulation = true;
    ['pro', 'maniac', 'station', 'trapper', 'gambler'].forEach((s, i) => (game.players.filter((p) => p.bot)[i].style = s));
    game = must(game, { type: 'start' }, HOST);
    let total = chips(game);
    const rng = seededRng(11);
    let hands = 0;
    for (let i = 0; i < 4000 && game.status === 'playing' && hands < 50; i++) {
      const before = game.hand?.number;
      const hostId = game.players.find((p) => p.deviceId === HOST)!.id;
      const hand = game.hand;
      let r;
      // The host buys back in when they bust, so the table keeps going.
      if (game.players.find((p) => p.id === hostId)!.stack === 0 && (!hand || hand.result)) {
        r = applyAction(game, { type: 'rebuy' }, ctx(HOST));
        // A rebuy brings new chips to the table.
        if (r.ok) total += game.settings.startingStack;
      } else if (hand && !hand.result && hand.twice?.until != null && hand.twice.asked.includes(hostId) && hand.twice.votes[hostId] === undefined) {
        r = applyAction(game, { type: 'runTwice', hand: hand.number, yes: true }, ctx(HOST));
      } else if (hand && !hand.result && hand.toAct === hostId) {
        const o = options(game, hand, hand.seats.find((x) => x.playerId === hostId)!);
        const move = o.canCheck ? 'check' : o.toCall <= game.settings.bigBlind * 4 ? 'call' : 'allin';
        r = applyAction(game, { type: 'act', hand: hand.number, seq: hand.seq, move }, ctx(HOST));
      } else {
        clock = (game.wakeAt ?? clock) + 1;
        r = applyAction(game, { type: 'tick' }, { deviceId: 'server', now: clock, rng });
      }
      if (!r.ok) throw new Error(r.error);
      game = r.game;
      if (game.hand?.number !== before) hands++;
      expect(chips(game)).toBe(total);
      for (const p of game.players) expect(p.stack).toBeGreaterThanOrEqual(0);
    }
    expect(hands).toBeGreaterThanOrEqual(50);
  });
});

import { describe, expect, it } from 'vitest';
import {
  TIMING,
  applyAction,
  buildPots,
  createTable,
  DEFAULT_SETTINGS,
  describeHand,
  equity,
  isEmoji,
  options,
  positionOf,
  parseAction,
  redactForDevice,
  redactLogs,
  scoreHand,
  seededRng,
  type Action,
  type Game,
  type Seat,
  type Settings,
} from './index';

// ── Hand ranking ────────────────────────────────────────────────────────────

const h = (s: string) => s.split(' ');

describe('hand ranking', () => {
  it('names every category', () => {
    const cases: [string, string][] = [
      ['As Ks Qs Js Ts 2d 3c', 'Royal flush'],
      ['9h 8h 7h 6h 5h Ad Kc', 'Straight flush'],
      ['7c 7d 7h 7s Kd 2c 3c', 'Four of a kind'],
      ['Qc Qd Qh 4s 4d 2c 3c', 'Full house'],
      ['Ad 9d 7d 4d 2d Kc Qs', 'Flush'],
      ['5c 6d 7h 8s 9d Kc 2s', 'Straight'],
      ['Jc Jd Jh 9s 4d 2c 3h', 'Three of a kind'],
      ['Kc Kd 5h 5s 9d 2c 3h', 'Two pair'],
      ['4s 9c 5h 8h 8s 3c Ac', 'Pair'],
      ['Ac Jd 9h 7s 4d 3c 2h', 'High card'],
    ];
    for (const [cards, name] of cases) expect(describeHand(h(cards)).name, cards).toBe(name);
  });

  it('puts categories in the right order', () => {
    const order = [
      'Ac Jd 9h 7s 4d',
      '8c 8d 9h 7s 4d',
      '8c 8d 9h 9s 4d',
      '8c 8d 8h 9s 4d',
      '5c 6d 7h 8s 9d',
      'Ad 9d 7d 4d 2d',
      'Qc Qd Qh 4s 4d',
      '7c 7d 7h 7s Kd',
      '9h 8h 7h 6h 5h',
    ];
    const scores = order.map((c) => scoreHand(h(c)));
    for (let i = 1; i < scores.length; i++) expect(scores[i]).toBeGreaterThan(scores[i - 1]);
  });

  it('treats the ace as low in a wheel, and a wheel loses to a six-high straight', () => {
    const wheel = describeHand(h('Ac 2d 3h 4s 5d Kc Qh'));
    expect(wheel.name).toBe('Straight');
    expect(wheel.detail).toBe('Straight, five high');
    expect(scoreHand(h('2d 3h 4s 5d 6c Kc Qh'))).toBeGreaterThan(wheel.score);
  });

  it('uses kickers to break ties and calls exact ties equal', () => {
    expect(scoreHand(h('Ah Ad Kc 9s 4d 3c 2h'))).toBeGreaterThan(scoreHand(h('Ac As Qc 9s 4d 3c 2h')));
    // Both play the board.
    expect(scoreHand(h('2c 3d As Ks Qs Js Ts'))).toBe(scoreHand(h('4c 5d As Ks Qs Js Ts')));
  });

  it('takes the best kicker with three pairs', () => {
    const v = describeHand(h('Kc Kd Qh Qs Jd Jc 2h'));
    expect(v.name).toBe('Two pair');
    expect(v.best.map((c) => c[0]).join('')).toBe('KKQQJ');
    // An ace beats the third pair as the kicker.
    expect(scoreHand(h('Kc Kd Qh Qs Jd Jc Ah'))).toBeGreaterThan(v.score);
  });

  it('picks the best five cards for the highlight', () => {
    // The screenshot hand: board 4♠ 9♣ 5♥ 8♥ 8♠ with 3♣ A♣ is a pair of eights, using the 9, 5 and ace.
    const v = describeHand(h('4s 9c 5h 8h 8s 3c Ac'));
    expect(v.detail).toBe('Pair of eights');
    expect(new Set(v.best)).toEqual(new Set(['8h', '8s', 'Ac', '9c', '5h']));
  });

  it('finds a flush over a straight and a straight flush over quads', () => {
    expect(describeHand(h('4h 5h 6h 7h 8c 2h Kd')).name).toBe('Flush');
    expect(describeHand(h('9s Ts Js Qs Ks 9h 9d')).name).toBe('Straight flush');
    expect(scoreHand(h('9s Ts Js Qs Ks'))).toBeGreaterThan(scoreHand(h('Ac Ad Ah As Kd')));
  });
});

describe('odds', () => {
  it('counts every run-out exactly once the flop is out', () => {
    // Set on the flop against an overpair: the set is a big favourite.
    const e = equity([h('7c 7d'), h('Ah Ad')], h('7s 2c 9d'));
    expect(e.win[0]).toBeGreaterThan(0.85);
    expect(e.win[0] + e.win[1] + e.tie[0]).toBeCloseTo(1, 6);
  });

  it('gives a split when both hands play the board', () => {
    const e = equity([h('2c 3d'), h('4c 5d')], h('As Ks Qs Js Ts'));
    expect(e.tie).toEqual([1, 1]);
  });

  it('samples before the flop and is about right', () => {
    const e = equity([h('Ah As'), h('Kh Ks')], []);
    expect(e.win[0]).toBeGreaterThan(0.78);
    expect(e.win[0]).toBeLessThan(0.86);
  });

  it('shows the same numbers on every phone', () => {
    expect(equity([h('Ah 7s'), h('Kh Qs')], [])).toEqual(equity([h('Ah 7s'), h('Kh Qs')], []));
  });
});

// ── Table helpers ───────────────────────────────────────────────────────────

const HOST = 'device-host';
let clock = 1_000_000;
const ctx = (deviceId: string, rng = seededRng(7)) => ({ deviceId, now: clock, rng });

function table(players: number, settings: Partial<Settings> = {}, seed = 1): Game {
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
  return begin(game, seed);
}

/** Starts the game and waits out the few seconds before the first cards (and the bot's hello). */
function begin(game: Game, seed = 7): Game {
  let g = must(game, { type: 'start' }, HOST, seededRng(seed));
  expect(g.hand).toBeNull();
  expect(g.nextHandAt).toBe(clock + TIMING.startDelay);
  for (let i = 0; i < 5 && !g.hand; i++) {
    clock = g.wakeAt ?? clock + 1;
    g = must(g, { type: 'tick' }, 'server', seededRng(seed));
  }
  return g;
}

function must(game: Game, action: Action, deviceId: string, rng = seededRng(7)): Game {
  const r = applyAction(game, action, { ...ctx(deviceId), rng });
  if (!r.ok) throw new Error(`${action.type}: ${r.error}`);
  return r.game;
}

const deviceOf = (game: Game, id: string) => game.players.find((p) => p.id === id)!.deviceId!;
const nameOf = (game: Game, id: string | null) => game.players.find((p) => p.id === id)?.name;
const seat = (game: Game, name: string) => game.hand!.seats.find((s) => nameOf(game, s.playerId) === name)!;
const stack = (game: Game, name: string) => game.players.find((p) => p.name === name)!.stack;

/** The player whose turn it is makes a move. */
/** Lets the short pause before a new street pass, as the table's clock would. */
function afterPause(game: Game): Game {
  const hand = game.hand;
  if (!hand || hand.result || hand.nextStreetAt == null) return game;
  clock = hand.nextStreetAt + 1;
  return must(game, { type: 'tick' }, 'server');
}

function act(game: Game, move: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin', to?: number): Game {
  const hand = game.hand!;
  return afterPause(must(game, { type: 'act', hand: hand.number, seq: hand.seq, move, to }, deviceOf(game, hand.toAct!)));
}

function tryAct(game: Game, move: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin', to?: number) {
  const hand = game.hand!;
  return applyAction(game, { type: 'act', hand: hand.number, seq: hand.seq, move, to }, ctx(deviceOf(game, hand.toAct!)));
}

/** Replaces the deck and hole cards so a hand plays out the same way every time. */
function rig(game: Game, holes: Record<string, string>, board: string): Game {
  const g = structuredClone(game);
  const hand = g.hand!;
  for (const s of hand.seats) s.cards = h(holes[nameOf(g, s.playerId)!]);
  const b = h(board);
  // Burn, flop, burn, turn, burn, river.
  hand.deck = ['2c', b[0], b[1], b[2], '2c', b[3], '2c', b[4]];
  return g;
}

function chipsInPlay(game: Game): number {
  return (
    game.players.reduce((sum, p) => sum + p.stack, 0) +
    (game.hand && !game.hand.result ? game.hand.seats.reduce((s, x) => s + x.total, 0) : 0)
  );
}

describe('dealing and blinds', () => {
  it('posts blinds left of the button and starts with the player after the big blind', () => {
    const game = table(4);
    const hand = game.hand!;
    const order = hand.seats.map((s) => s.playerId);
    const b = order.indexOf(hand.buttonId);
    expect(hand.sbId).toBe(order[(b + 1) % 4]);
    expect(hand.bbId).toBe(order[(b + 2) % 4]);
    expect(hand.toAct).toBe(order[(b + 3) % 4]);
    expect(hand.seats.every((s) => s.cards.length === 2)).toBe(true);
    expect(new Set(hand.seats.flatMap((s) => s.cards)).size).toBe(8);
    expect(hand.deck.length).toBe(52 - 8);
  });

  it('heads-up: the button is the small blind and acts first before the flop, last after it', () => {
    let game = table(2);
    const hand = game.hand!;
    expect(hand.sbId).toBe(hand.buttonId);
    expect(hand.toAct).toBe(hand.buttonId);
    game = act(game, 'call');
    // Big blind gets the option.
    expect(game.hand!.toAct).toBe(hand.bbId);
    game = act(game, 'check');
    expect(game.hand!.street).toBe('flop');
    expect(game.hand!.board.length).toBe(3);
    expect(game.hand!.toAct).toBe(hand.bbId);
  });

  it('moves the button one seat each hand', () => {
    let game = table(3);
    const first = game.hand!.buttonId;
    // Everyone folds to the big blind.
    game = act(act(game, 'fold'), 'fold');
    expect(game.hand!.result).not.toBeNull();
    clock += 60_000;
    game = must(game, { type: 'tick' }, 'server');
    const order = game.players
      .slice()
      .sort((a, b) => a.seat - b.seat)
      .map((p) => p.id);
    expect(game.hand!.buttonId).toBe(order[(order.indexOf(first) + 1) % 3]);
    expect(game.hand!.number).toBe(2);
  });

  it('gives the big blind back its uncalled chips when everyone folds', () => {
    let game = table(3);
    const bb = nameOf(game, game.hand!.bbId)!;
    const sb = nameOf(game, game.hand!.sbId)!;
    game = act(act(game, 'fold'), 'fold');
    expect(stack(game, bb)).toBe(1005);
    expect(stack(game, sb)).toBe(995);
    expect(game.hand!.result!.showdown).toBe(false);
  });
});

describe('betting', () => {
  it('enforces the minimum raise and lets a short stack go all in for less', () => {
    let game = table(3);
    // First raise: at least the big blind more.
    expect(tryAct(game, 'raise', 15).ok).toBe(false);
    game = act(game, 'raise', 30);
    expect(game.hand!.minRaise).toBe(20);
    // Re-raise must be at least 20 more: to 50.
    expect(tryAct(game, 'raise', 45).ok).toBe(false);
    game = act(game, 'raise', 50);
    expect(game.hand!.currentBet).toBe(50);
  });

  it("doesn't let a player who's acted re-raise after a short all-in", () => {
    let game = table(3, { startingStack: 1000 });
    const hand = game.hand!;
    const utg = nameOf(game, hand.toAct)!;
    const sb = nameOf(game, hand.sbId)!;
    // The small blind has only 40 behind the 5 they posted.
    game.players.find((p) => p.name === sb)!.stack = 40;
    game = act(game, 'raise', 30); // UTG raises to 30
    game = act(game, 'allin'); // SB all in for 45: a raise of 15, less than the full 20
    expect(seat(game, sb).allIn).toBe(true);
    expect(game.hand!.currentBet).toBe(45);
    game = act(game, 'call'); // BB calls 45 (they hadn't acted, so they could have raised)
    // Back to UTG, who already acted: call or fold only.
    expect(nameOf(game, game.hand!.toAct)).toBe(utg);
    const o = options(game, game.hand!, seat(game, utg));
    expect(o.canRaise).toBe(false);
    expect(tryAct(game, 'raise', 200).ok).toBe(false);
    game = act(game, 'call');
    expect(game.hand!.street).toBe('flop');
  });

  it('rejects a stale or doubled tap', () => {
    let game = table(3);
    const hand = game.hand!;
    const device = deviceOf(game, hand.toAct!);
    game = act(game, 'call');
    const again = applyAction(game, { type: 'act', hand: hand.number, seq: hand.seq, move: 'call' }, ctx(device));
    expect(again.ok).toBe(false);
  });

  it('keeps every chip accounted for over many hands with bots', () => {
    let game = createTable({
      hostDeviceId: HOST,
      name: 'Host',
      emoji: '😎',
      settings: { ...DEFAULT_SETTINGS, turnSeconds: 5 },
      bots: 5,
      code: null,
      now: clock,
    });
    // A fixed mix of styles (bots are seated at random), so every run plays the same hands.
    const styles = ['pro', 'maniac', 'station', 'trapper', 'gambler'];
    game.players.filter((p) => p.bot).forEach((p, i) => (p.style = styles[i]));
    game = begin(game);
    const total = chipsInPlay(game);
    const rng = seededRng(42);
    let hands = 0;
    for (let i = 0; i < 4000 && game.status === 'playing' && hands < 60; i++) {
      const before = game.hand?.number;
      const hostId = game.players.find((p) => p.deviceId === HOST)!.id;
      let r;
      if (game.hand && !game.hand.result && game.hand.toAct === hostId) {
        // The host checks when it's free and calls small bets, so the bots fight out the big pots.
        const o = options(
          game,
          game.hand,
          game.hand.seats.find((x) => x.playerId === hostId)!,
        );
        const move = o.canCheck ? 'check' : o.toCall <= game.settings.bigBlind * 2 ? 'call' : 'fold';
        r = applyAction(game, { type: 'act', hand: game.hand.number, seq: game.hand.seq, move }, ctx(HOST));
      } else {
        clock = (game.wakeAt ?? clock) + 1;
        r = applyAction(game, { type: 'tick' }, { deviceId: 'server', now: clock, rng });
      }
      if (!r.ok) throw new Error(r.error);
      game = r.game;
      if (game.hand?.number !== before) hands++;
      // Busted bots leave with no chips, so the total never changes.
      expect(chipsInPlay(game)).toBe(total);
      for (const p of game.players) expect(p.stack).toBeGreaterThanOrEqual(0);
    }
    expect(hands).toBeGreaterThan(5);
  });
});

describe('all-ins, side pots and showdowns', () => {
  it('builds a main pot and a side pot', () => {
    const seats = [
      { playerId: 'a', total: 100, folded: false },
      { playerId: 'b', total: 300, folded: false },
      { playerId: 'c', total: 300, folded: false },
      { playerId: 'd', total: 50, folded: true },
    ] as Seat[];
    const pots = buildPots(seats);
    expect(pots.map((p) => p.amount)).toEqual([350, 400]);
    expect(pots[0].eligible).toEqual(['a', 'b', 'c']);
    expect(pots[1].eligible).toEqual(['b', 'c']);
  });

  it('runs out the board with every hand face up, then pays the side pot to the right player', () => {
    let game = table(3, { startingStack: 1000 });
    const names = game.hand!.seats.map((s) => nameOf(game, s.playerId)!);
    const [a, b, c] = names;
    game = rig(game, { [a]: 'Ah Ad', [b]: 'Kh Kd', [c]: 'Qh Qd' }, '2s 7c 9d 3h 4c');
    // Make one short: they can only win the main pot.
    const short = game.players.find((p) => p.id === game.hand!.toAct)!;
    short.stack = 200;
    const shortName = short.name;
    const total = chipsInPlay(game);

    game = act(game, 'allin');
    game = act(game, 'allin');
    game = act(game, 'allin');
    const hand = game.hand!;
    expect(hand.runout).toBe(true);
    expect(hand.seats.every((s) => s.shown)).toBe(true);
    // Every hand can be seen by everyone now.
    const view = redactForDevice(game, 'someone-else');
    expect(view.hand!.seats.every((s) => s.cards.length === 2)).toBe(true);
    expect(view.hand!.deck).toEqual([]);

    for (let i = 0; i < 6 && !game.hand!.result; i++) {
      clock = game.wakeAt! + 1;
      game = must(game, { type: 'tick' }, 'server');
    }
    const result = game.hand!.result!;
    expect(game.hand!.board).toEqual(h('2s 7c 9d 3h 4c'));
    expect(result.showdown).toBe(true);
    // Aces win everything they're in for. If they were the short stack, kings take the side pot.
    if (a === shortName) {
      expect(stack(game, a)).toBe(600);
      expect(stack(game, b)).toBe(1600);
      expect(result.pots.length).toBe(2);
    } else {
      expect(stack(game, a)).toBe(2200);
    }
    expect(chipsInPlay(game)).toBe(total);
    const aId = game.players.find((p) => p.name === a)!.id;
    expect(result.names[aId]).toBe('Pair of aces');
  });

  it('splits a pot and gives the odd chip left of the button', () => {
    let game = table(3, { smallBlind: 5, bigBlind: 10 });
    const order = game.hand!.seats.map((s) => nameOf(game, s.playerId)!);
    const holes = Object.fromEntries(order.map((n, i) => [n, ['2c 3d', '2d 3c', '4h 5h'][i]]));
    game = rig(game, holes, 'As Ks Qs Js Ts');
    // Everyone sees it to the river and checks it down.
    game = act(game, 'call');
    game = act(game, 'call');
    game = act(game, 'check');
    for (let street = 0; street < 3; street++) for (let i = 0; i < 3; i++) game = act(game, 'check');
    const result = game.hand!.result!;
    expect(result.pots[0].winners.length).toBe(3);
    expect(Object.values(result.won).reduce((a, b) => a + b, 0)).toBe(30);
  });

  it('mucks a losing hand at showdown instead of showing it', () => {
    let game = table(2);
    const [a, b] = game.hand!.seats.map((s) => nameOf(game, s.playerId)!);
    game = rig(game, { [a]: 'Ah Ad', [b]: '7c 2d' }, 'Ks 9c 5d 3h Jc');
    game = act(game, 'call');
    game = act(game, 'check');
    for (let i = 0; i < 6; i++) game = act(game, 'check');
    const result = game.hand!.result!;
    expect(result.showdown).toBe(true);
    // The big blind acts first after the flop, so shows first when nobody bet the river.
    const winner = game.players.find((p) => p.name === a)!.id;
    expect(Object.keys(result.won)).toEqual([winner]);
    const loserSeat = seat(game, b);
    const winnerSeat = seat(game, a);
    expect(winnerSeat.shown).toBe(true);
    // The loser only shows if they went first.
    const loserFirst = game.hand!.bbId === game.players.find((p) => p.name === b)!.id;
    expect(loserSeat.shown).toBe(loserFirst);
  });
});

describe('table', () => {
  it('ends the table when one player has all the chips and rebuys are off', () => {
    let game = table(2, { rebuys: false, startingStack: 100, smallBlind: 5, bigBlind: 10 });
    const [a, b] = game.hand!.seats.map((s) => nameOf(game, s.playerId)!);
    game = rig(game, { [a]: 'Ah Ad', [b]: '7c 2d' }, 'Ks 9c 5d 3h Jc');
    game = act(game, 'allin');
    game = act(game, 'call');
    for (let i = 0; i < 6 && game.status === 'playing'; i++) {
      clock = (game.wakeAt ?? clock) + 1;
      game = must(game, { type: 'tick' }, 'server');
    }
    expect(game.status).toBe('ended');
    expect(stack(game, a)).toBe(200);
  });

  it('lets a busted player rebuy, and counts it against them', () => {
    let game = table(2, { startingStack: 100, smallBlind: 5, bigBlind: 10 });
    const [a, b] = game.hand!.seats.map((s) => nameOf(game, s.playerId)!);
    game = rig(game, { [a]: 'Ah Ad', [b]: '7c 2d' }, 'Ks 9c 5d 3h Jc');
    game = act(game, 'allin');
    game = act(game, 'call');
    for (let i = 0; i < 6 && !game.hand!.result; i++) {
      clock = (game.wakeAt ?? clock) + 1;
      game = must(game, { type: 'tick' }, 'server');
    }
    const loser = game.players.find((p) => p.name === b)!;
    expect(loser.stack).toBe(0);
    game = must(game, { type: 'rebuy' }, loser.deviceId!);
    const after = game.players.find((p) => p.name === b)!;
    expect(after.stack).toBe(100);
    expect(after.bought).toBe(200);
  });

  it('without rebuys, keeps the deciding hand on screen for a few seconds before the game ends', () => {
    let game = table(2, { rebuys: false, startingStack: 100, smallBlind: 5, bigBlind: 10 });
    const [a, b] = game.hand!.seats.map((s) => nameOf(game, s.playerId)!);
    game = rig(game, { [a]: 'Ah Ad', [b]: '7c 2d' }, 'Ks 9c 5d 3h Jc');
    game = act(game, 'allin');
    game = act(game, 'call');
    for (let i = 0; i < 6 && !game.hand!.result; i++) {
      clock = (game.wakeAt ?? clock) + 1;
      game = must(game, { type: 'tick' }, 'server');
    }
    expect(game.status).toBe('playing');
    expect(game.hand!.result).not.toBeNull();
    expect(game.wakeAt).toBeGreaterThan(clock + 5000);
    clock = game.wakeAt! + 1;
    game = must(game, { type: 'tick' }, 'server');
    expect(game.status).toBe('ended');
  });

  it('ends with a winner when one player has all the chips, after a window to rebuy', () => {
    let game = table(2, { startingStack: 100, smallBlind: 5, bigBlind: 10 });
    const [a, b] = game.hand!.seats.map((s) => nameOf(game, s.playerId)!);
    game = rig(game, { [a]: 'Ah Ad', [b]: '7c 2d' }, 'Ks 9c 5d 3h Jc');
    game = act(game, 'allin');
    game = act(game, 'call');
    for (let i = 0; i < 6 && !game.hand!.result; i++) {
      clock = (game.wakeAt ?? clock) + 1;
      game = must(game, { type: 'tick' }, 'server');
    }
    expect(game.status).toBe('playing');
    // The winner tapping Next hand doesn't skip the loser's chance to rebuy.
    game = must(game, { type: 'next', hand: game.hand!.number }, game.players.find((p) => p.name === a)!.deviceId!);
    expect(game.status).toBe('playing');
    clock = game.wakeAt! + 1;
    game = must(game, { type: 'tick' }, 'server');
    expect(game.status).toBe('ended');
  });

  it('logs every action, and lets a player show their cards after the hand', () => {
    let game = table(3);
    const n = game.hand!.number;
    game = act(act(game, 'raise', 30), 'fold');
    game = act(game, 'fold');
    const entry = game.logs.at(-1)!;
    expect(entry.number).toBe(n);
    expect(entry.lines[0]).toMatch(/^-- Hand #1 \(dealer: /);
    expect(entry.lines.some((l) => /posts the big blind 10/.test(l))).toBe(true);
    expect(entry.lines.some((l) => /raises to 30/.test(l))).toBe(true);
    expect(entry.lines.some((l) => /Uncalled 20 returned/.test(l))).toBe(true);
    expect(entry.lines.at(-1)).toMatch(/wins 25$/);
    // Phones never get the log with state updates, and only see their own cards in it.
    const folder = game.hand!.seats.find((s) => s.folded)!;
    const device = deviceOf(game, folder.playerId);
    expect(redactForDevice(game, device).logs).toEqual([]);
    expect(Object.keys(redactLogs(game, device)[0].holes)).toEqual([folder.playerId]);
    // They show their folded hand: everyone sees it now.
    game = must(game, { type: 'show', hand: n }, device);
    expect(game.hand!.seats.find((s) => s.playerId === folder.playerId)!.shown).toBe(true);
    expect(redactForDevice(game, 'someone-else').hand!.seats.find((s) => s.playerId === folder.playerId)!.cards.length).toBe(2);
    expect(game.logs.at(-1)!.lines.at(-1)).toMatch(/shows \[/);
  });

  it('lets a busted player see every hole card, only when the host turns it on', () => {
    let game = table(3);
    const busted = game.players.find((p) => !p.bot && p.deviceId)!;
    game = { ...game, players: game.players.map((p) => (p.id === busted.id ? { ...p, stack: 0 } : p)) };
    game.hand = { ...game.hand!, seats: game.hand!.seats.map((s) => (s.playerId === busted.id ? { ...s, folded: true } : s)) };
    const others = (g: Game, d: string) => redactForDevice(g, d).hand!.seats.filter((s) => s.playerId !== busted.id);
    expect(others(game, busted.deviceId!).every((s) => s.cards.length === 0)).toBe(true);
    const on = { ...game, settings: { ...game.settings, showToBusted: true } };
    expect(others(on, busted.deviceId!).every((s) => s.cards.length === 2)).toBe(true);
    // A player with chips, or a stranger, sees nothing extra.
    const other = on.players.find((p) => p.deviceId && p.id !== busted.id);
    if (other) expect(redactForDevice(on, other.deviceId!).hand!.seats.filter((s) => s.playerId !== other.id).every((s) => s.cards.length === 0)).toBe(true);
    expect(redactForDevice(on, 'someone-else').hand!.seats.every((s) => s.cards.length === 0)).toBe(true);
  });

  it("keeps each player's last action for the speech bubble, and a call says what was added", () => {
    let game = table(3);
    const hand = game.hand!;
    const raiser = nameOf(game, hand.toAct)!;
    game = act(game, 'raise', 30);
    expect(seat(game, raiser).last).toMatchObject({ move: 'raise', amount: 30 });
    // The small blind has 5 in already: calling 30 adds 25.
    const sbName = nameOf(game, hand.sbId)!;
    const sbTurn = nameOf(game, game.hand!.toAct) === sbName;
    if (sbTurn) {
      game = act(game, 'call');
      expect(seat(game, sbName).last).toMatchObject({ move: 'call', amount: 25 });
    } else {
      game = act(game, 'fold');
      game = act(game, 'call');
    }
    // Everyone else calls too. On the flop, the preflop actions are still there, marked as from preflop.
    while (game.hand!.street === 'preflop')
      game = act(game, game.hand!.currentBet > seat(game, nameOf(game, game.hand!.toAct)!).bet ? 'call' : 'check');
    expect(game.hand!.street).toBe('flop');
    const shown = game.hand!.seats.filter((x) => !x.folded);
    expect(shown.every((x) => x.last && x.last.street === 'preflop')).toBe(true);
    expect(shown.find((x) => x.last!.move === 'call')!.last!.amount).toBeGreaterThan(0);
  });

  it('takes quick messages from seated players, from the list only', () => {
    let game = table(2);
    const device = deviceOf(game, game.hand!.seats[0].playerId);
    const id = game.hand!.seats[0].playerId;
    game = must(game, { type: 'react', id: 'nice' }, device);
    expect(game.reactions![id]).toEqual({ id: 'nice', n: 1 });
    game = must(game, { type: 'react', id: 'nice' }, device);
    expect(game.reactions![id].n).toBe(2);
    expect(applyAction(game, { type: 'react', id: 'nope' }, ctx(device)).ok).toBe(false);
    expect(applyAction(game, { type: 'react', id: 'nice' }, ctx('stranger')).ok).toBe(false);
    expect(parseAction({ type: 'react', id: 'lucky' })).toEqual({ type: 'react', id: 'lucky' });
    expect(parseAction({ type: 'react', id: '<script>' })).toBeNull();
  });

  it('names every position from the button: BTN, SB, BB, then UTG up to the cutoff', () => {
    const names = (n: number) => {
      const game = table(n);
      return game.hand!.seats.map((s) => positionOf(game.hand, s.playerId)!.label);
    };
    const around = (n: number) => {
      const game = table(n);
      const b = game.hand!.seats.findIndex((s) => s.playerId === game.hand!.buttonId);
      return game.hand!.seats.map((_, i) => positionOf(game.hand, game.hand!.seats[(b + i) % n].playerId)!.label);
    };
    expect(around(2)).toEqual(['B/SB', 'BB']);
    expect(around(3)).toEqual(['BTN', 'SB', 'BB']);
    expect(around(6)).toEqual(['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO']);
    expect(around(9)).toEqual(['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'LJ', 'HJ', 'CO']);
    expect(new Set(names(7)).size).toBe(7);
  });

  it("lets the host reveal every bot's hand once the hand is over, and nobody else's", () => {
    let game = createTable({
      hostDeviceId: HOST,
      name: 'Host',
      emoji: '😎',
      settings: { ...DEFAULT_SETTINGS, turnSeconds: 0 },
      bots: 2,
      code: null,
      now: clock,
    });
    // Bots are seated at random; fix their styles so the hand plays out the same every run.
    for (const p of game.players) if (p.bot) p.style = 'rock';
    game = must(game, { type: 'join', name: 'Friend', emoji: '🐸' }, 'device-friend');
    game = begin(game);
    const n = game.hand!.number;
    // Not while the hand is still being played.
    expect(applyAction(game, { type: 'revealBots', hand: n }, ctx(HOST)).ok).toBe(false);
    // Everyone folds round to one player.
    while (!game.hand!.result) {
      const id = game.hand!.toAct!;
      const who = game.players.find((p) => p.id === id)!;
      game = who.bot
        ? must(game, { type: 'tick' }, 'server', seededRng(3))
        : must(game, { type: 'act', hand: game.hand!.number, seq: game.hand!.seq, move: 'fold' }, who.deviceId!);
      if (who.bot) clock = (game.wakeAt ?? clock) + 1;
    }
    const bots = game.players.filter((p) => p.bot).map((p) => p.id);
    const hiddenFrom = (device: string, id: string) =>
      redactForDevice(game, device).hand!.seats.find((s) => s.playerId === id)!.cards.length === 0;
    const hiddenBots = bots.filter((id) => !game.hand!.seats.find((s) => s.playerId === id)!.shown);
    expect(hiddenBots.length).toBeGreaterThan(0);
    // Only the host can.
    expect(applyAction(game, { type: 'revealBots', hand: n }, ctx('device-friend')).ok).toBe(false);
    // Tapping one bot turns over just that one.
    if (hiddenBots.length > 1) {
      const one = must(game, { type: 'revealBots', hand: n, playerId: hiddenBots[0] }, HOST);
      expect(redactForDevice(one, 'device-friend').hand!.seats.find((s) => s.playerId === hiddenBots[0])!.cards.length).toBe(2);
      expect(one.hand!.seats.find((s) => s.playerId === hiddenBots[1])!.shown).toBe(false);
    }
    game = must(game, { type: 'revealBots', hand: n }, HOST);
    expect(bots.every((id) => !hiddenFrom('device-friend', id))).toBe(true);
    expect(game.logs.at(-1)!.lines.some((l) => /shows \[/.test(l))).toBe(true);
    // A human who kept their cards hidden still has them hidden.
    const friend = game.players.find((p) => p.deviceId === 'device-friend')!.id;
    if (!game.hand!.seats.find((s) => s.playerId === friend)!.shown) expect(hiddenFrom(HOST, friend)).toBe(true);
  });

  it('waits a beat after the last bet of a street before the next card comes', () => {
    let game = table(2);
    // Heads up the button (small blind) acts first before the flop: call, then the big blind checks.
    game = must(game, { type: 'act', hand: game.hand!.number, seq: game.hand!.seq, move: 'call' }, deviceOf(game, game.hand!.toAct!));
    const before = clock;
    game = must(game, { type: 'act', hand: game.hand!.number, seq: game.hand!.seq, move: 'check' }, deviceOf(game, game.hand!.toAct!));
    // The street is over, but no card yet and nobody's on the clock.
    expect(game.hand!.board).toHaveLength(0);
    expect(game.hand!.toAct).toBeNull();
    expect(game.wakeAt).toBe(before + TIMING.streetPause);
    // Too early: nothing happens.
    clock = before + TIMING.streetPause - 200;
    expect(must(game, { type: 'tick' }, 'server').hand!.board).toHaveLength(0);
    // After the beat: the flop, and someone to act.
    clock = before + TIMING.streetPause + 1;
    game = must(game, { type: 'tick' }, 'server');
    expect(game.hand!.board).toHaveLength(3);
    expect(game.hand!.toAct).not.toBeNull();
  });

  it('turns up the cards of anyone who is all in at the showdown, even a loser on the river', () => {
    let game = table(2);
    game = rig(game, { Host: 'Ah Ad', P1: '7c 2d' }, 'Ks 9d 4h 8s 3c');
    // Check it down to the river.
    game = act(game, 'call');
    game = act(game, 'check');
    for (let i = 0; i < 6 && game.hand!.street !== 'river'; i++) game = act(game, 'check');
    expect(game.hand!.street).toBe('river');
    // Whoever's first on the river goes all in with the worse hand or the better one; the other calls.
    const bettor = game.hand!.toAct!;
    game = act(game, 'allin');
    game = act(game, 'call');
    expect(game.hand!.result?.showdown).toBe(true);
    const loser = game.hand!.seats.find((s) => !game.hand!.result!.won[s.playerId])!;
    // The loser put everything in too, so their cards are face up, not mucked.
    expect(loser.shown).toBe(true);
    expect(game.hand!.seats.every((s) => s.shown)).toBe(true);
    expect(bettor).toBeTruthy();
  });

  it('doubles the blinds on the clock, as the next hand is dealt, and stops at the cap', () => {
    let game = table(2, { blindMinutes: 5, startingStack: 1000 });
    expect(game.hand!.number).toBe(1);
    expect(game.blindsRaiseAt).toBe(clock + 5 * 60_000);
    expect(game.settings.bigBlind).toBe(10);
    // Fold the hand. Blinds don't change mid-hand or before the time.
    game = act(game, 'fold');
    clock = game.wakeAt! + 1;
    game = must(game, { type: 'tick' }, 'server');
    expect(game.hand!.number).toBe(2);
    expect(game.settings.bigBlind).toBe(10);
    // Once the five minutes are up, the next hand is dealt with both blinds doubled.
    game = act(game, 'fold');
    clock = game.blindsRaiseAt! + 1;
    game = must(game, { type: 'tick' }, 'server');
    expect(game.hand!.number).toBe(3);
    expect([game.settings.smallBlind, game.settings.bigBlind]).toEqual([10, 20]);
    expect(game.hand!.log.some((l) => /Blinds go up to 10\/20/.test(l))).toBe(true);
    // The clock restarts for the next level.
    expect(game.blindsRaiseAt).toBe(clock + 5 * 60_000);
    // They keep doubling, even past half a stack, until a cap is set.
    const rise = () => {
      game = act(game, 'fold');
      clock = game.blindsRaiseAt! + 1;
      game = must(game, { type: 'tick' }, 'server');
    };
    for (let i = 0; i < 6; i++) rise();
    expect(game.settings.bigBlind).toBe(20 * 2 ** 6);
    // A cap stops the rise, and the last step lands on it.
    game = must(game, { type: 'settings', settings: { ...game.settings, blindCap: 1500 } }, HOST);
    rise();
    expect(game.settings.bigBlind).toBe(1500);
    rise();
    expect(game.settings.bigBlind).toBe(1500);
    // Turning it off stops the clock.
    game = must(game, { type: 'settings', settings: { blindMinutes: 0 } }, HOST);
    expect(game.blindsRaiseAt).toBeNull();
    expect(parseAction({ type: 'settings', settings: { blindMinutes: 'soon' } })).toBeNull();
    expect(applyAction(game, { type: 'settings', settings: { blindMinutes: 500 } }, ctx(HOST)).ok).toBe(false);
  });

  it('times out a slow player: checks or folds, and sits them out after two', () => {
    let game = table(3, { turnSeconds: 20 });
    const slow = game.hand!.toAct!;
    expect(game.wakeAt).toBe(game.hand!.deadline);
    clock = game.wakeAt! + 1;
    game = must(game, { type: 'tick' }, 'server');
    const s = game.hand!.seats.find((x) => x.playerId === slow)!;
    expect(s.folded).toBe(true);
    expect(game.players.find((p) => p.id === slow)!.timeouts).toBe(1);
  });

  it('hides other hands and the deck from each phone', () => {
    const game = table(3);
    const me = game.players[1];
    const view = redactForDevice(game, me.deviceId!);
    for (const s of view.hand!.seats) expect(s.cards.length).toBe(s.playerId === me.id ? 2 : 0);
    expect(view.hand!.deck).toEqual([]);
  });

  it('removes a player mid-hand by folding them', () => {
    let game = table(3);
    const hand = game.hand!;
    const notTurn = hand.seats.find((s) => s.playerId !== hand.toAct)!.playerId;
    game = must(game, { type: 'remove', playerId: notTurn }, HOST);
    expect(game.hand!.seats.find((s) => s.playerId === notTurn)!.folded).toBe(true);
  });

  it('never accepts a tick or junk from a phone', () => {
    expect(parseAction({ type: 'tick' })).toBeNull();
    expect(parseAction({ type: 'act', hand: 1, seq: 0, move: 'cheat' })).toBeNull();
    expect(parseAction({ type: 'join', name: 'Kavi', emoji: 'not an emoji' })).toBeNull();
    expect(parseAction({ type: 'act', hand: 1, seq: 0, move: 'raise', to: 40 })).toEqual({
      type: 'act',
      hand: 1,
      seq: 0,
      move: 'raise',
      to: 40,
    });
  });

  it('accepts real emojis only', () => {
    for (const e of ['😎', '🧑‍🚀', '👍🏽', '🇬🇧', '❤️', '🏳️‍🌈']) expect(isEmoji(e), e).toBe(true);
    for (const e of ['a', '😎😎', '', 'hi😎', '<b>']) expect(isEmoji(e), e).toBe(false);
  });
});


describe('names at one table', () => {
  const join = (g: Game, device: string, name: string) => must(g, { type: 'join', name, emoji: '🐸' }, device);
  const make = (bots = 0) =>
    createTable({ hostDeviceId: HOST, name: 'Sam', emoji: '😎', settings: DEFAULT_SETTINGS, bots, code: 'BCDFG', now: clock });

  it("gives a second 'Sam' a number, whatever the case, and never lets a name run past ten characters", () => {
    let g = make();
    g = join(g, 'd1', 'Sam');
    g = join(g, 'd2', 'sam');
    g = join(g, 'd3', 'SAM');
    expect(g.players.map((p) => p.name)).toEqual(['Sam', 'Sam 2', 'sam 3', 'SAM 4']);
    g = join(g, 'd4', 'Alexandrina');
    g = join(g, 'd5', 'Alexandrina');
    const long = g.players.map((p) => p.name).filter((n) => n.startsWith('Alexandr'));
    expect(long).toEqual(['Alexandrin', 'Alexandr 2']);
    expect(g.players.every((p) => p.name.length <= 10)).toBe(true);
  });

  it("won't let a person take a bot's name, and renaming into a taken name gets a number too", () => {
    let g = make(2);
    const bot = g.players.find((p) => p.bot)!;
    g = join(g, 'd1', bot.name);
    // The number goes on the end; a long name is cut to leave room for it (names stop at 10 characters).
    const mine = g.players.find((p) => p.deviceId === 'd1')!.name;
    expect(mine).toMatch(/ 2$/);
    expect(mine.length).toBeLessThanOrEqual(10);
    expect(mine.toLowerCase()).not.toBe(bot.name.toLowerCase());
    g = join(g, 'd2', 'Zed');
    g = must(g, { type: 'setLook', name: 'Sam', emoji: '🐸' }, 'd2');
    expect(g.players.find((p) => p.deviceId === 'd2')!.name).toBe('Sam 2');
    expect(new Set(g.players.map((p) => p.name.toLowerCase())).size).toBe(g.players.length);
    // Sending your own name again changes nothing.
    const again = applyAction(g, { type: 'join', name: 'Sam', emoji: '😎' }, ctx(HOST));
    expect(again.ok && again.changed).toBe(false);
  });
});

describe('play again', () => {
  function endedGame() {
    let g = createTable({ hostDeviceId: HOST, name: 'Sam', emoji: '😎', settings: { ...DEFAULT_SETTINGS, turnSeconds: 0 }, bots: 2, code: 'BCDFG', now: clock });
    g = must(g, { type: 'join', name: 'Ann', emoji: '🐸' }, 'd1');
    g = must(g, { type: 'join', name: 'Bob', emoji: '🐸' }, 'd2');
    g = begin(g);
    g.settings.smallBlind = 50;
    g.settings.bigBlind = 100;
    g.players[1].stack = 5;
    return must(g, { type: 'end' }, HOST);
  }
  const ids = (g: Game) => g.players.map((p) => p.name);

  it('lets the host open a new game with only the friends who asked, the bots back, and the first blinds', () => {
    let g = endedGame();
    const oldId = g.id;
    expect(g.status).toBe('ended');
    // A friend asking just waits: nothing changes for anyone else.
    g = must(g, { type: 'playAgain' }, 'd1');
    expect(g.status).toBe('ended');
    expect(g.again).toHaveLength(1);
    g = must(g, { type: 'playAgain' }, HOST);
    expect(g.status).toBe('lobby');
    expect(g.id).not.toBe(oldId);
    expect(ids(g)).toContain('Sam');
    expect(ids(g)).toContain('Ann');
    expect(ids(g)).not.toContain('Bob');
    expect(g.players.filter((p) => p.bot)).toHaveLength(2);
    expect(g.players.every((p) => p.stack === DEFAULT_SETTINGS.startingStack && p.bought === DEFAULT_SETTINGS.startingStack)).toBe(true);
    expect(g.settings.smallBlind).toBe(DEFAULT_SETTINGS.smallBlind);
    expect(g.hand).toBeNull();
    expect(g.again).toBeUndefined();
    expect(g.logs).toEqual([]);
    // The one who didn't ask can sit down by hand, and the host can deal again.
    g = must(g, { type: 'join', name: 'Bob', emoji: '🐸' }, 'd2');
    expect(ids(g)).toContain('Bob');
    g = begin(g);
    expect(g.hand).not.toBeNull();
  });

  it("only seats people who asked: the host opening it alone puts nobody else in", () => {
    let g = endedGame();
    g = must(g, { type: 'playAgain' }, HOST);
    expect(g.players.filter((p) => !p.bot).map((p) => p.name)).toEqual(['Sam']);
  });

  it('lets a friend take their request back, and ignores Play again outside an ended game', () => {
    let g = endedGame();
    g = must(g, { type: 'playAgain' }, 'd1');
    g = must(g, { type: 'playAgain', off: true }, 'd1');
    g = must(g, { type: 'playAgain' }, HOST);
    expect(ids(g)).not.toContain('Ann');
    const lobby = applyAction(g, { type: 'playAgain' }, ctx('d2'));
    expect(lobby.ok).toBe(false);
    const host = applyAction(g, { type: 'playAgain' }, ctx(HOST));
    expect(host.ok && host.changed).toBe(false);
  });

  it('brings back a bot that busted out of the last game', () => {
    let g = endedGame();
    g.players = g.players.filter((p) => !p.bot);
    g = must(g, { type: 'playAgain' }, HOST);
    expect(g.players.filter((p) => p.bot)).toHaveLength(2);
  });
});

describe('a phone that drops off the table', () => {
  const online = (game: Game, ...devices: string[]) => must(game, { type: 'presence', online: devices }, 'server');
  const playerOf = (game: Game, device: string) => game.players.find((p) => p.deviceId === device)!;

  it('shows them as offline, puts them back when they return, and ignores a repeat', () => {
    let g = table(2, { turnSeconds: 45 });
    g = online(g, HOST);
    expect(playerOf(g, 'device-1').offline).toBe(true);
    expect(playerOf(g, HOST).offline).toBeUndefined();
    const again = applyAction(g, { type: 'presence', online: [HOST] }, ctx('server'));
    expect(again.ok && again.changed).toBe(false);
    g = online(g, HOST, 'device-1');
    expect(playerOf(g, 'device-1').offline).toBeUndefined();
  });

  it("cuts the clock to 15 seconds when it's their turn, and keeps that short clock if they come back", () => {
    let g = table(2, { turnSeconds: 45 });
    const turn = playerOf(g, g.hand!.toAct === playerOf(g, HOST).id ? HOST : 'device-1');
    const device = turn.deviceId!;
    const other = device === HOST ? 'device-1' : HOST;
    expect(g.hand!.deadline).toBe(clock + 45_000);
    g = online(g, other);
    expect(g.hand!.deadline).toBe(clock + TIMING.offlineClock);
    expect(g.hand!.actAt).toBe(g.hand!.deadline);
    expect(g.wakeAt).toBe(g.hand!.deadline);
    // Back with time to spare: still the short clock, not a fresh 45 seconds.
    g = online(g, device, other);
    expect(g.hand!.deadline).toBe(clock + TIMING.offlineClock);
    // When the clock runs out, they're checked or folded like anyone else.
    g = online(g, other);
    clock = g.hand!.deadline!;
    g = must(g, { type: 'tick' }, 'server');
    expect(playerOf(g, device).timeouts).toBe(1);
  });

  it('gives an offline player the short clock when the turn reaches them', () => {
    let g = table(2, { turnSeconds: 45 });
    const first = g.hand!.toAct!;
    const firstDevice = g.players.find((p) => p.id === first)!.deviceId!;
    const second = firstDevice === HOST ? 'device-1' : HOST;
    g = online(g, firstDevice); // the one who isn't on the clock drops
    const seat = g.hand!.seats.find((s) => s.playerId === first)!;
    const o = options(g, g.hand!, seat);
    g = must(g, { type: 'act', hand: g.hand!.number, seq: g.hand!.seq, move: o.canCheck ? 'check' : 'call' }, firstDevice);
    expect(g.hand!.toAct).toBe(g.players.find((p) => p.deviceId === second)!.id);
    expect(g.hand!.deadline).toBe(clock + TIMING.offlineClock);
  });

  it('leaves a table without a clock alone, and never takes a presence report from a phone', () => {
    let g = table(2, { turnSeconds: 0 });
    g = online(g, HOST);
    expect(playerOf(g, 'device-1').offline).toBe(true);
    expect(g.hand!.deadline).toBeNull();
    expect(parseAction({ type: 'presence', online: [] })).toBeNull();
  });
});

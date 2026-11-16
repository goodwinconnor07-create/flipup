import { describe, expect, it } from 'vitest';
import {
  applyAction,
  climb,
  createTable,
  DEFAULT_SETTINGS,
  links,
  omahaSets,
  options,
  peelChoice,
  ploBest,
  ploBoards,
  redactForDevice,
  seededRng,
  type Action,
  type Game,
  type Settings,
  type Variant,
} from './index';

const HOST = 'device-host';
let clock = 7_000_000;

function must(game: Game, action: Action, deviceId: string, rng = seededRng(clock)): Game {
  const r = applyAction(game, action, { deviceId, now: clock, rng });
  if (!r.ok) throw new Error(`${action.type}: ${r.error}`);
  return r.game;
}

function table(variant: Variant, people: number, bots = 0, settings: Partial<Settings> = {}): Game {
  let game = createTable({ hostDeviceId: HOST, name: 'Host', emoji: '😎', settings: { ...DEFAULT_SETTINGS, turnSeconds: 0, variant, ...settings }, bots, code: 'BCDFG', now: clock });
  for (let i = 1; i < people; i++) game = must(game, { type: 'join', name: `P${i}`, emoji: '🐸' }, `device-${i}`);
  let g = must(game, { type: 'start' }, HOST);
  for (let i = 0; i < 5 && !g.hand; i++) {
    clock = g.wakeAt ?? clock + 1;
    g = must(g, { type: 'tick' }, 'server');
  }
  return g;
}

const deviceOf = (game: Game, id: string) => game.players.find((p) => p.id === id)!.deviceId!;
const total = (g: Game) => g.players.reduce((s, p) => s + p.stack, 0) + (g.hand && !g.hand.result ? g.hand.seats.reduce((s, x) => s + x.total, 0) : 0);

/** One step: a person checks or calls (folding to big bets when `careful`), peels their first card, or the clock ticks. */
function step(g: Game, careful = false): Game {
  const hand = g.hand!;
  if (!hand.result && hand.peeling) {
    const due = hand.seats.find((s) => !s.folded && !hand.peelPicked?.includes(s.playerId) && s.cards.length > 2 && !g.players.find((p) => p.id === s.playerId)!.bot);
    if (due) return must(g, { type: 'peel', hand: hand.number, card: due.cards[0] }, deviceOf(g, due.playerId));
  }
  const person = hand.toAct && !g.players.find((p) => p.id === hand.toAct)!.bot;
  if (!hand.result && person && hand.bettingAt == null && hand.nextStreetAt == null && hand.showdownAt == null) {
    const o = options(g, hand, hand.seats.find((s) => s.playerId === hand.toAct)!);
    const move = o.canCheck ? 'check' : careful && o.toCall > g.settings.bigBlind * 2 ? 'fold' : 'call';
    return must(g, { type: 'act', hand: hand.number, seq: hand.seq, move }, deviceOf(g, hand.toAct!));
  }
  clock = (g.wakeAt ?? clock) + 1;
  return must(g, { type: 'tick' }, 'server');
}

/** Plays until `until` holds or the hand is over. */
function playUntil(g: Game, until: (g: Game) => boolean): Game {
  const n = g.hand!.number;
  for (let i = 0; i < 400 && g.hand!.number === n && !until(g); i++) g = step(g);
  return g;
}

/** Bots plus one person who checks and calls: many hands, checking chips and cards never appear or vanish. */
function soak(variant: Variant, hands: number, bots = 4) {
  let g = table(variant, 1, bots);
  const start = total(g);
  let seen = 0;
  for (let i = 0; i < 6000 && (g.hand?.number ?? 0) < hands && g.status !== 'ended'; i++) {
    const hand = g.hand;
    if (hand && !hand.result && variant !== 'elevator') {
      const cards = [...hand.board, ...hand.deck, ...hand.seats.flatMap((s) => s.cards), ...(hand.burned ?? []), ...(hand.dropped ?? []), ...Object.values(hand.peeled ?? {}).flat()];
      expect(new Set(cards).size).toBe(cards.length);
    }
    if (hand && !hand.result) seen = Math.max(seen, hand.number);
    g = step(g, true);
    expect(total(g)).toBe(start);
  }
  return { g, seen };
}

describe('Headband', () => {
  it("hides your forehead card from you and shows everyone else's", () => {
    const g = table('headband', 3);
    const [a, b, c] = g.hand!.seats;
    const view = redactForDevice(g, deviceOf(g, a.playerId)).hand!;
    expect(view.seats[0].cards).toEqual([a.cards[0]]);
    expect(view.headbands).toEqual({ [b.playerId]: b.cards[1], [c.playerId]: c.cards[1] });
    expect(JSON.stringify(view)).not.toContain(`"${a.cards[1]}"`);
  });

  it('turns your forehead card over once the hand is done', () => {
    let g = table('headband', 2);
    g = playUntil(g, (x) => !!x.hand!.result);
    const me = g.hand!.seats[0];
    const view = redactForDevice(g, deviceOf(g, me.playerId)).hand!;
    expect(view.seats[0].cards).toHaveLength(2);
    expect(view.headbands?.[me.playerId]).toBe(me.cards[1]);
  });

  it('keeps every chip and card over many bot hands', () => {
    expect(soak('headband', 25).seen).toBeGreaterThan(5);
  });
});

describe('Conveyor Belt', () => {
  it('deals four cards each and keeps three on the belt, one falling off each street, with a last stop', () => {
    let g = table('belt', 2);
    expect(g.hand!.seats.every((s) => s.cards.length === 4)).toBe(true);
    g = playUntil(g, (x) => x.hand!.street === 'flop' && x.hand!.toAct !== null && x.hand!.bettingAt == null);
    const flop = [...g.hand!.board];
    expect(flop).toHaveLength(3);
    g = playUntil(g, (x) => x.hand!.street === 'turn');
    expect(g.hand!.board).toHaveLength(3);
    expect(g.hand!.dropped).toEqual([flop[0]]);
    expect(g.hand!.board.slice(0, 2)).toEqual(flop.slice(1));
    g = playUntil(g, (x) => !!x.hand!.lastStop);
    expect(g.hand!.street).toBe('river');
    expect(g.hand!.dropped).toHaveLength(3);
    expect(g.hand!.board).toHaveLength(3);
    g = playUntil(g, (x) => !!x.hand!.result);
    // Four rounds of betting after the deal: flop, turn, river and the last stop.
    const rounds = new Set(g.hand!.actions!.filter((a) => a.street !== 'preflop').map((a, i, all) => `${a.street}${all.slice(0, i).filter((b) => b.street === 'river').length > 1 && a.street === 'river' ? '2' : ''}`));
    expect(rounds.size).toBeGreaterThanOrEqual(3);
    expect(g.hand!.log.some((l) => l.startsWith('Last stop'))).toBe(true);
  });

  it('keeps every chip and card over many bot hands', () => {
    expect(soak('belt', 25).seen).toBeGreaterThan(5);
  });
});

describe('Onion', () => {
  it('peels from five to four after the flop betting, three after the turn and two when the river lands', () => {
    let g = table('onion', 2);
    expect(g.hand!.seats.every((s) => s.cards.length === 5)).toBe(true);
    g = playUntil(g, (x) => !!x.hand!.peeling);
    expect(g.hand!.street).toBe('flop');
    // A pick stays secret until everyone has picked.
    const [a, b] = g.hand!.seats;
    g = must(g, { type: 'peel', hand: g.hand!.number, card: a.cards[0] }, deviceOf(g, a.playerId));
    expect(redactForDevice(g, deviceOf(g, b.playerId)).hand!.peels).toEqual({});
    g = must(g, { type: 'peel', hand: g.hand!.number, card: g.hand!.seats[1].cards[0] }, deviceOf(g, b.playerId));
    expect(g.hand!.seats.every((s) => s.cards.length === 4)).toBe(true);
    expect(Object.values(g.hand!.peeled!).every((p) => p.length === 1)).toBe(true);
    g = playUntil(g, (x) => x.hand!.street === 'turn' && !!x.hand!.peeling);
    for (const s of g.hand!.seats) g = must(g, { type: 'peel', hand: g.hand!.number, card: g.hand!.seats.find((x) => x.playerId === s.playerId)!.cards[0] }, deviceOf(g, s.playerId));
    expect(g.hand!.seats.every((s) => s.cards.length === 3)).toBe(true);
    g = playUntil(g, (x) => x.hand!.street === 'river' && !!x.hand!.peeling);
    // The river's peel comes before any river betting.
    expect(g.hand!.actions!.some((a) => a.street === 'river')).toBe(false);
    for (const s of g.hand!.seats) g = must(g, { type: 'peel', hand: g.hand!.number, card: g.hand!.seats.find((x) => x.playerId === s.playerId)!.cards[0] }, deviceOf(g, s.playerId));
    expect(g.hand!.seats.every((s) => s.cards.length === 2)).toBe(true);
  });

  it('peels the card that helps least when the choice is the app’s', () => {
    // Keeping the pair of kings and the ace: the 2 goes.
    expect(peelChoice(['Kh', 'Kd', '2c', 'As'], ['Ks', '7d', '9c'])).toBe('2c');
  });

  it('keeps every chip and card over many bot hands', () => {
    expect(soak('onion', 25).seen).toBeGreaterThan(5);
  });
});

describe('Chain Reaction', () => {
  it('only lets a card onto the board if it shares a rank or a suit with the one before it', () => {
    expect(links('Kh', '2h')).toBe(true);
    expect(links('Kh', 'Ks')).toBe(true);
    expect(links('Kh', '2s')).toBe(false);
    let g = table('chain', 2);
    g = playUntil(g, (x) => !!x.hand!.result);
    const board = g.hand!.board;
    expect(board).toHaveLength(5);
    for (let i = 1; i < board.length; i++) expect(links(board[i - 1], board[i])).toBe(true);
  });

  it('keeps every chip and card over many bot hands', () => {
    expect(soak('chain', 25).seen).toBeGreaterThan(5);
  });
});

describe('Elevator', () => {
  it('lifts every card already on the board a rank as each new card lands, aces round to 2', () => {
    expect(climb(['7c', 'Kd', 'As'])).toEqual(['8c', 'Ad', '2s']);
    let g = table('elevator', 2);
    g = playUntil(g, (x) => x.hand!.street === 'flop' && x.hand!.toAct !== null && x.hand!.bettingAt == null);
    const flop = [...g.hand!.board];
    g = playUntil(g, (x) => x.hand!.street === 'turn');
    expect(g.hand!.board.slice(0, 3)).toEqual(climb(flop));
    g = playUntil(g, (x) => x.hand!.street === 'river');
    expect(g.hand!.board.slice(0, 3)).toEqual(climb(climb(flop)));
    expect(new Set(g.hand!.board).size).toBe(5);
  });

  it('never makes or loses a chip over many bot hands', () => {
    expect(soak('elevator', 25).seen).toBeGreaterThan(5);
  });
});

describe('Double Board PLO', () => {
  it('deals five cards (four at a nine-player table) and two boards of five', () => {
    let g = table('plo', 2);
    expect(g.hand!.seats.every((s) => s.cards.length === 5)).toBe(true);
    g = playUntil(g, (x) => !!x.hand!.result);
    expect(g.hand!.board).toHaveLength(10);
    expect(ploBoards(g.hand!.board).map((b) => b.length)).toEqual([5, 5]);
    expect(table('plo', 1, 8).hand!.seats.every((s) => s.cards.length === 4)).toBe(true);
  });

  it('uses exactly two hole cards and three board cards', () => {
    // Four hearts in the hand and two on the board: only two of yours count, so no flush.
    const one = ['Ah', '9h', '4c', '8s', '2d'];
    const two = ['Kc', 'Kd', 'Ks', 'Qc', 'Jd'];
    // Dealt as both flops, both turns, both rivers.
    const board = [...one.slice(0, 3), ...two.slice(0, 3), one[3], two[3], one[4], two[4]];
    expect(ploBoards(board)).toEqual([one, two]);
    expect(ploBest(['Kh', 'Qh', '7h', '6h', '3c'], board, 0).category).not.toBe(5);
    expect(omahaSets(['Kh', 'Qh', '7h', '6h', '3c'], ['Ah', '9h', '4c']).every((s) => s.length === 5)).toBe(true);
    // Board two has three kings: with any two cards, at least trips.
    expect(ploBest(['2c', '3h', '5s', '7d', '9c'], board, 1).category).toBeGreaterThanOrEqual(3);
  });

  it('splits every pot between the two boards, and caps raises at the pot', () => {
    let g = table('plo', 2);
    const hand = g.hand!;
    const o = options(g, hand, hand.seats.find((s) => s.playerId === hand.toAct)!);
    expect(o.maxTo).toBeLessThan(g.players[0].stack);
    g = playUntil(g, (x) => !!x.hand!.result);
    const result = g.hand!.result!;
    if (result.showdown) {
      expect(result.plo?.winners[0]).toHaveLength(result.pots.length);
      expect(result.plo?.winners[1]).toHaveLength(result.pots.length);
    }
  });

  it('keeps every chip and card over many bot hands', () => {
    expect(soak('plo', 20).seen).toBeGreaterThan(5);
  });
});

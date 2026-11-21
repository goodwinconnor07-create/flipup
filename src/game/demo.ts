// The Demo: one hand of each game, dealt to order, with bots that follow a script, so the game's twist shows up the
// same way every time and you win the hand at the end. The app's coach (native/src/components/demo) walks you through
// it on the real table, one highlighted thing at a time. The engine plays the hand by its own rules; this file only
// stacks the deck and says what the bots do. Tested by demo.test.ts, which plays every demo through the engine.

import { fullDeck, type Card } from './cards';
import { createTable } from './reducer';
import { burns, holeCount, streetCards, type Variant } from './variants';
import type { DemoDeal, DemoMove, Game, Hand, Move, PowerId, Seat, Settings, Street } from './types';

/** The two bots at every demo table (both from the free ten). */
export const DEMO_BOTS = ['Luna', 'Max'] as const;

/** What you do in a demo, in order (the coach asks for each). `bet` is a bet or raise to that street total. */
export type DemoPlay = Move | { bet: number } | { hit: true } | { discard: Card } | { power: true };

/** One game's demo hand, written the way it's read: who holds what, the board as it comes, and what the bots do. */
export interface DemoSpec {
  variant: Variant;
  /** Hole cards by seat, counted from the button: you on the button (0), Luna in the small blind (1), Max in the big blind (2). */
  holes: [Card[], Card[], Card[]];
  /** Board cards in the order they come off the deck (Red River's extra cards included; before a die swaps one). */
  board: Card[];
  /** Haunted Pot: the ghost's two cards. */
  ghost?: Card[];
  /** Haunted Pot: chips the ghost is already holding from earlier hands (it's a bounty for whoever beats it). */
  bounty?: number;
  /** Cards dealt to players after a street's board cards: Bean Stalk's new hole cards, Hit Me's hits (in the order they're taken). */
  after?: Partial<Record<'flop' | 'turn' | 'river', Card[]>>;
  /** Die on the River: what it rolls, and the card that comes in for a 1 to 5. */
  dice?: { roll: number; fresh?: Card };
  /** Memory Poker: the twenty cards shown and taken out. */
  memory?: Card[];
  /** Power Cards: each seat's power, from the button. */
  powers?: [PowerId, PowerId, PowerId];
  moves?: DemoDeal['moves'];
  hits?: DemoDeal['hits'];
  /** What you'll be asked to do, in order. */
  plays: DemoPlay[];
}

const SEAT = { you: 0, luna: 1, max: 2 } as const;
const key = (seat: number, street: Street) => `${seat}:${street}`;
const bet = (to: number): DemoMove => ({ move: 'bet', to });
const check: DemoMove = { move: 'check' };
const fold: DemoMove = { move: 'fold' };

/** Every game's demo. You always sit on the button, so you're first to act before the flop and last after it. */
export const DEMO_SPECS: Record<Variant, DemoSpec> = {
  // A flush draw that comes in on the river: call, call, check, then bet it.
  holdem: {
    variant: 'holdem',
    holes: [['Kh', 'Qh'], ['Ac', '9d'], ['8s', '8c']],
    board: ['Ah', '7h', '2c', '9s', 'Jh'],
    moves: { [key(SEAT.luna, 'flop')]: [bet(40)], [key(SEAT.max, 'river')]: [check, fold] },
    plays: ['call', 'call', 'check', { bet: 100 }],
  },
  // Three cards: a pair of kings flops a set, and the seven goes.
  pineapple: {
    variant: 'pineapple',
    holes: [['Ks', 'Kd', '7c'], ['Ah', 'Qd', '5s'], ['Jc', 'Td', '9h']],
    board: ['Kc', '7h', '2s', '9d', '4h'],
    moves: { [key(SEAT.max, 'turn')]: [bet(40)] },
    plays: ['call', 'check', { discard: '7c' }, 'call', 'check'],
  },
  // A wild 2 in your hand, another on the board, and the river king: five of a kind against four nines.
  deuces: {
    variant: 'deuces',
    holes: [['2h', 'Ks'], ['Qc', 'Jd'], ['9h', '9s']],
    board: ['Kd', '9c', '2s', '5h', 'Kc'],
    moves: {
      [key(SEAT.luna, 'flop')]: [check, fold],
      [key(SEAT.max, 'flop')]: [bet(40)],
      [key(SEAT.max, 'turn')]: [bet(80)],
      [key(SEAT.max, 'river')]: [bet(160)],
    },
    plays: ['call', 'call', 'call', 'call'],
  },
  // Aces beat the table, then the ghost's jacks, and take the bounty it was holding.
  ghost: {
    variant: 'ghost',
    holes: [['Ah', 'Qh'], ['9d', '8d'], ['Kc', 'Ts']],
    ghost: ['Jc', 'Js'],
    bounty: 400,
    board: ['Ad', '7s', '3c', '5h', '2d'],
    moves: { [key(SEAT.max, 'turn')]: [bet(60)] },
    plays: ['call', 'check', 'call', 'check'],
  },
  // An open-ended draw: the first river misses, the third makes a queen-high straight.
  pittsburgh: {
    variant: 'pittsburgh',
    holes: [['Jh', 'Th'], ['9c', '9s'], ['Ac', '3d']],
    board: ['9h', '8c', '2d', '3s', 'Ks', '7d', 'Qc'],
    moves: { [key(SEAT.luna, 'flop')]: [bet(40)] },
    plays: ['call', 'call', 'check', 'check'],
  },
  // Nothing on the river until the die rolls a 4: the turn card goes, the 5 of clubs comes, and that's a straight.
  dice: {
    variant: 'dice',
    holes: [['6h', '7h'], ['Kd', 'Qs'], ['3c', '3d']],
    board: ['8s', '9d', 'Kc', '2s', 'Ac'],
    dice: { roll: 4, fresh: '5c' },
    moves: { [key(SEAT.luna, 'flop')]: [bet(40)], [key(SEAT.luna, 'river')]: [bet(80)], [key(SEAT.max, 'river')]: [fold] },
    plays: ['call', 'call', 'check', 'call'],
  },
  // A red river, another red card (the king that makes your straight), then a black one ends it.
  redriver: {
    variant: 'redriver',
    holes: [['Qd', 'Jd'], ['Tc', '9h'], ['8s', '8h']],
    board: ['Td', '4c', '9s', '2c', '3h', 'Kd', '5c'],
    moves: { [key(SEAT.luna, 'flop')]: [bet(40)] },
    plays: ['call', 'call', 'check', 'check'],
  },
  // Down the cross makes your straight; across makes Luna's three sevens.
  crucifix: {
    variant: 'crucifix',
    holes: [['Kd', 'Qs'], ['7s', '6h'], ['Tc', '5c']],
    // Middle, top, right, bottom, left; then outer top and outer right; then outer bottom and outer left.
    board: ['Th', 'Jh', '9s', '4s', '7d', 'Ac', '3h', '2d', '7c'],
    moves: { [key(SEAT.luna, 'river')]: [bet(60)] },
    plays: ['call', 'check', 'check', 'call'],
  },
  // Twelve, two and four o'clock run queen, king, nine: with your ten and jack, a straight.
  circle: {
    variant: 'circle',
    holes: [['Th', 'Jh'], ['4s', '8d'], ['Qc', '3s']],
    // 12 and 6 o'clock; then 8 and 2; then 10 and 4.
    board: ['Qs', '4h', '4c', 'Kd', '7d', '9c'],
    moves: { [key(SEAT.luna, 'river')]: [bet(60)] },
    plays: ['call', 'check', 'check', 'call'],
  },
  // All four aces leave with the twenty, so nobody can hold one: your kings are the best pair there can be.
  memory: {
    variant: 'memory',
    holes: [['Ks', 'Qs'], ['Jc', 'Jd'], ['7s', '6s']],
    board: ['Kh', '7d', '2c', '9s', '4h'],
    memory: ['Ac', 'Ad', 'Ah', 'As', 'Kc', '3d', '8h', 'Tc', '5s', 'Qh', '6c', '2h', 'Js', '9d', '3c', '8c', 'Th', '4s', '5d', '2s'],
    moves: { [key(SEAT.luna, 'flop')]: [bet(40)] },
    plays: ['call', 'call', 'check', 'check'],
  },
  // A card of your own on every street: by the river your five make a king-high flush.
  beanstalk: {
    variant: 'beanstalk',
    holes: [['5h', '6h'], ['Qc', 'Qd'], ['9s', '8s']],
    board: ['Kh', '9c', '2h', '4d', 'Ts'],
    // Each street: Luna, Max, then you.
    after: { flop: ['3c', '9d', 'Jh'], turn: ['Ks', '7c', '3d'], river: ['2d', '6c', '8h'] },
    moves: { [key(SEAT.max, 'flop')]: [bet(40)] },
    plays: ['call', 'call', 'check', 'check'],
  },
  // You hit to 20 and make a straight; Luna hits to 21. Half the pot each.
  bjholdem: {
    variant: 'bjholdem',
    holes: [['9h', '3c'], ['Kc', '5d'], ['Qs', 'Qh']],
    board: ['9s', '4d', '7c', 'Tc', 'Js'],
    // Luna hits first (the 6 of hearts, 21), then you (the 8 of diamonds, 20).
    after: { flop: ['6h', '8d'] },
    hits: { [SEAT.luna]: 1 },
    plays: ['call', { hit: true }, 'check', 'check', 'check'],
  },
  // A Peek on the flop shows the king coming on the turn: your straight, and only you know.
  power: {
    variant: 'power',
    holes: [['Qh', 'Jh'], ['Tc', 'Ts'], ['5d', '5c']],
    board: ['Th', '9c', '2s', 'Kd', '4c'],
    powers: ['peek', 'shield', 'bounty'],
    moves: { [key(SEAT.luna, 'flop')]: [bet(40)], [key(SEAT.luna, 'turn')]: [bet(80)], [key(SEAT.max, 'turn')]: [fold] },
    plays: ['call', { power: true }, 'call', 'call', 'check'],
  },
};

/**
 * The deck in the order the engine deals it (holdem.ts's `startHand()` and `dealStreet()`): hole cards one at a time
 * from the small blind round to the button, the ghost's two, then each street's burn (if the game burns), its board
 * cards, a die's new card on the river, and any cards dealt to players on that street. The rest of the deck follows.
 */
export function stackDeck(spec: DemoSpec): Card[] {
  const v = spec.variant;
  const n = spec.holes.length;
  const named = [
    ...spec.holes.flat(),
    ...(spec.ghost ?? []),
    ...spec.board,
    ...(spec.dice?.fresh ? [spec.dice.fresh] : []),
    ...Object.values(spec.after ?? {}).flat(),
    ...(spec.memory ?? []),
  ];
  if (new Set(named).size !== named.length) throw new Error(`The ${v} demo uses a card twice`);
  const spare = fullDeck().filter((c) => !named.includes(c));
  const order: Card[] = [];
  for (let round = 0; round < holeCount(v); round++) for (let i = 1; i <= n; i++) order.push(spec.holes[i % n][round]);
  if (spec.ghost) order.push(...spec.ghost);
  let at = 0;
  for (const street of ['flop', 'turn', 'river'] as const) {
    if (burns(v)) order.push(spare.shift()!);
    // The river takes the rest of the board: one card, Pittsburgh's three, or Red River's run of reds and the black.
    const count = street === 'river' ? spec.board.length - at : streetCards(v, street);
    order.push(...spec.board.slice(at, at + count));
    at += count;
    if (street === 'river' && spec.dice?.fresh) order.push(spec.dice.fresh);
    order.push(...(spec.after?.[street] ?? []));
  }
  return [...order, ...spare];
}

/** The engine's half of a demo: the stacked deck and the bots' script. */
export function demoDeal(variant: Variant): DemoDeal {
  const spec = DEMO_SPECS[variant];
  return {
    at: SEAT.you,
    deck: stackDeck(spec),
    ...(spec.memory ? { memory: spec.memory.slice() } : {}),
    ...(spec.dice ? { roll: spec.dice.roll } : {}),
    ...(spec.powers ? { powers: spec.powers.slice() } : {}),
    ...(spec.moves ? { moves: structuredClone(spec.moves) } : {}),
    ...(spec.hits ? { hits: { ...spec.hits } } : {}),
  };
}

/** Chips and blinds at every demo table, with no clock: the coach waits for you. */
export const DEMO_SETTINGS: Omit<Settings, 'variant'> = { startingStack: 1000, smallBlind: 10, bigBlind: 20, rebuys: false, turnSeconds: 0 };

/** A demo table for this phone, in the lobby: start it to deal (after the usual short wait). */
export function createDemoTable(opts: { variant: Variant; deviceId: string; name: string; emoji: string; now: number }): Game {
  const spec = DEMO_SPECS[opts.variant];
  const game = createTable({
    hostDeviceId: opts.deviceId,
    name: opts.name,
    emoji: opts.emoji,
    settings: { ...DEMO_SETTINGS, ...(opts.variant !== 'holdem' ? { variant: opts.variant } : {}) },
    bots: 0,
    botNames: [...DEMO_BOTS],
    code: null,
    now: opts.now,
  });
  game.demo = demoDeal(opts.variant);
  if (spec.bounty) game.ghostPot = spec.bounty;
  return game;
}

/** A seat's place counted clockwise from the button (0 the button). */
function fromButton(hand: Hand, seat: Seat): number {
  const n = hand.seats.length;
  const b = hand.seats.findIndex((s) => s.playerId === hand.buttonId);
  return (hand.seats.indexOf(seat) - b + n) % n;
}

/** A demo bot's move: the next one in its script for this street, else a check, or a call when there's a bet. */
export function demoBotMove(game: Game, hand: Hand, seat: Seat): DemoMove {
  const demo = game.demo!;
  const k = key(fromButton(hand, seat), hand.street);
  const list = demo.moves?.[k] ?? [];
  const done = demo.used?.[k] ?? 0;
  if (done < list.length) {
    demo.used = { ...demo.used, [k]: done + 1 };
    return list[done];
  }
  return { move: hand.currentBet > seat.bet ? 'call' : 'check' };
}

/** Hit Me: whether a demo bot takes another card now (it takes as many as its script says, on the flop). */
export function demoHits(game: Game, hand: Hand, seat: Seat): boolean {
  const demo = game.demo!;
  const pos = fromButton(hand, seat);
  const k = `hit:${pos}`;
  const done = demo.used?.[k] ?? 0;
  if (done >= (demo.hits?.[pos] ?? 0)) return false;
  demo.used = { ...demo.used, [k]: done + 1 };
  return true;
}

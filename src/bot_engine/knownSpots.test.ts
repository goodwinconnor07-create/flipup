import { describe, expect, it } from 'vitest';
import type { Card } from '../game/cards';
import type { HandAction, Move, Street } from '../game/types';
import { explainHand, explainText, type ExplainedMove, type SavedHand } from './explainHand';

/**
 * Known spots: hands with a plain right answer that any decent player gets right, played up to one bot's decision and
 * checked against the Casual bots' whole pipeline (model, style, sizing, habits, multiway, pot odds). Each spot is a
 * saved hand cut short (`explainHand()` explains the bot to act next), so a bad hand from the app can be added here
 * from `Copy hand data` in Saved hands. The limits leave room for a bot's style; they catch blunders, not leanings.
 * The first two are the owner's recorded hand of 13 Nov 2026.
 */

type Seat = { id: string; cards: [Card, Card]; stack?: number };
interface Spot {
  name: string;
  /** In seat order; the first is the button. The last listed player is the person (`me`, a table needs one), never asked. */
  seats: Seat[];
  board?: Card[];
  moves: [string, Street, Move, number?][];
  /** The bot to act's chance of each kind of move: [at least, at most]. */
  expect: Partial<Record<'fold' | 'check' | 'call' | 'bet' | 'raise', [number, number]>>;
  blinds?: [number, number];
}

const spot = (s: Spot): SavedHand => {
  const [sb, bb] = s.blinds ?? [10, 20];
  const n = s.seats.length;
  return {
    variant: 'holdem',
    smallBlind: sb,
    bigBlind: bb,
    buttonId: s.seats[0].id,
    sbId: n === 2 ? s.seats[0].id : s.seats[1].id,
    bbId: n === 2 ? s.seats[1].id : s.seats[2].id,
    me: s.seats[n - 1].id,
    players: s.seats.map((p) => ({ id: p.id, name: p.id, stack: p.stack ?? 10000, bot: true })),
    holes: Object.fromEntries(s.seats.map((p) => [p.id, p.cards])),
    board: s.board ?? [],
    actions: s.moves.map(([playerId, street, move, to]): HandAction => ({ playerId, street, move, to: to ?? 0 })),
  };
};

const kind = (label: string) => label.split(' ')[0].replace('allin', 'raise') as 'fold' | 'check' | 'call' | 'bet' | 'raise';
function decision(s: Spot): ExplainedMove {
  const moves = explainHand(spot(s));
  const last = moves.at(-1)!;
  expect(last.played).toBe('(to act)');
  return last;
}
const chances = (m: ExplainedMove) => {
  const c: Record<string, number> = { fold: 0, check: 0, call: 0, bet: 0, raise: 0 };
  for (const o of m.options) c[kind(o.label)] += o.chance;
  return c;
};

// Five-handed, as in the recording: button, small blind, big blind, then two more; the person is last.
const RECORDED: Seat[] = [
  { id: 'Mark', cards: ['2c', 'Kd'] },
  { id: 'Uma', cards: ['9h', '9d'] },
  { id: 'Andre', cards: ['5h', '5c'] },
  { id: 'Vic', cards: ['6s', '5d'] },
  { id: 'You', cards: ['6d', '3d'] },
];
const RECORDED_PREFLOP: Spot['moves'] = [
  ['Vic', 'preflop', 'fold'],
  ['You', 'preflop', 'call', 20],
  ['Mark', 'preflop', 'fold'],
  ['Uma', 'preflop', 'raise', 70],
  ['Andre', 'preflop', 'call', 70],
  ['You', 'preflop', 'call', 70],
];

const SPOTS: Spot[] = [
  {
    name: 'pocket nines call 20 into 250 on A-J-10 (recorded hand)',
    seats: RECORDED,
    board: ['Js', 'Ac', 'Td'],
    moves: [...RECORDED_PREFLOP, ['Uma', 'flop', 'check'], ['Andre', 'flop', 'bet', 20], ['You', 'flop', 'call', 20]],
    expect: { fold: [0, 0.15] },
  },
  {
    name: 'pocket fives check into two players on A-J-10 (recorded hand)',
    seats: RECORDED,
    board: ['Js', 'Ac', 'Td'],
    moves: [...RECORDED_PREFLOP, ['Uma', 'flop', 'check']],
    expect: { bet: [0, 0.1] },
  },
  {
    name: 'aces never fold to a single raise',
    seats: [
      { id: 'Btn', cards: ['Kd', 'Qd'] },
      { id: 'Sb', cards: ['7c', '2h'] },
      { id: 'Bb', cards: ['As', 'Ah'] },
      { id: 'Me', cards: ['9c', '9s'] },
    ],
    moves: [
      ['Me', 'preflop', 'fold'],
      ['Btn', 'preflop', 'raise', 60],
      ['Sb', 'preflop', 'fold'],
    ],
    expect: { fold: [0, 0.01], raise: [0.3, 1] },
  },
  {
    name: 'seven-two folds first in from early position',
    seats: [
      { id: 'Btn', cards: ['Kd', 'Qd'] },
      { id: 'Sb', cards: ['Jc', 'Th'] },
      { id: 'Bb', cards: ['8s', '8h'] },
      { id: 'Utg', cards: ['7c', '2d'] },
      { id: 'Hj', cards: ['5s', '4s'] },
      { id: 'Me', cards: ['9c', '9s'] },
    ],
    moves: [],
    expect: { fold: [0.9, 1] },
  },
  {
    name: 'a set never folds to a small flop bet',
    seats: [
      { id: 'Btn', cards: ['8d', '8c'] },
      { id: 'Bb', cards: ['Ks', 'Qs'] },
    ],
    board: ['8h', 'Kd', '3c'],
    moves: [
      ['Btn', 'preflop', 'raise', 50],
      ['Bb', 'preflop', 'call', 50],
      ['Bb', 'flop', 'bet', 35],
    ],
    expect: { fold: [0, 0.02] },
  },
  {
    name: 'top pair, top kicker calls or raises a half-pot flop bet',
    seats: [
      { id: 'Btn', cards: ['Ah', 'Kc'] },
      { id: 'Bb', cards: ['Qs', 'Js'] },
    ],
    board: ['Kd', '7s', '2h'],
    moves: [
      ['Btn', 'preflop', 'raise', 50],
      ['Bb', 'preflop', 'call', 50],
      ['Bb', 'flop', 'bet', 50],
    ],
    expect: { fold: [0, 0.05] },
  },
  {
    name: 'the nut flush bets the river when checked to',
    seats: [
      { id: 'Btn', cards: ['Ah', '4h'] },
      { id: 'Bb', cards: ['Kc', 'Qd'] },
    ],
    board: ['Kh', '9h', '2c', '7d', '3h'],
    moves: [
      ['Btn', 'preflop', 'raise', 50],
      ['Bb', 'preflop', 'call', 50],
      ['Bb', 'flop', 'check'],
      ['Btn', 'flop', 'bet', 35],
      ['Bb', 'flop', 'call', 35],
      ['Bb', 'turn', 'check'],
      ['Btn', 'turn', 'check'],
      ['Bb', 'river', 'check'],
    ],
    expect: { bet: [0.75, 1] },
  },
  {
    name: 'nothing at all folds to a pot-sized river bet',
    seats: [
      { id: 'Btn', cards: ['7c', '6c'] },
      { id: 'Bb', cards: ['Ks', 'Kh'] },
    ],
    board: ['Ad', 'Js', '9d', '4s', '2h'],
    moves: [
      ['Btn', 'preflop', 'raise', 50],
      ['Bb', 'preflop', 'call', 50],
      ['Bb', 'flop', 'check'],
      ['Btn', 'flop', 'check'],
      ['Bb', 'turn', 'check'],
      ['Btn', 'turn', 'check'],
      ['Bb', 'river', 'bet', 100],
    ],
    expect: { fold: [0.8, 1] },
  },
  {
    // Found by the feel lab's blunder count: the pot-odds check left river calls over a third of the stack to the model.
    name: 'a king-high flush calls a third-pot river bet on a paired board, even for a third of its chips',
    seats: [
      { id: 'Btn', cards: ['Kd', 'Td'], stack: 1000 },
      { id: 'Bb', cards: ['Ah', '3h'], stack: 1000 },
    ],
    board: ['3c', 'Jd', '7d', 'Js', '3d'],
    moves: [
      ['Btn', 'preflop', 'call', 20],
      ['Bb', 'preflop', 'raise', 60],
      ['Btn', 'preflop', 'call', 60],
      ['Bb', 'flop', 'bet', 80],
      ['Btn', 'flop', 'call', 80],
      ['Bb', 'turn', 'bet', 200],
      ['Btn', 'turn', 'call', 200],
      ['Bb', 'river', 'bet', 230],
    ],
    expect: { fold: [0, 0.08] },
  },
];

describe('known spots: the Casual bots get the plain answers right', () => {
  for (const s of SPOTS)
    it(s.name, () => {
      const m = decision(s);
      const c = chances(m);
      for (const [move, [lo, hi]] of Object.entries(s.expect)) {
        const got = c[move];
        expect(got, `${m.name} [${m.hole.join(' ')}] ${move}: ${(got * 100).toFixed(1)}%`).toBeGreaterThanOrEqual(lo - 1e-9);
        expect(got, `${m.name} [${m.hole.join(' ')}] ${move}: ${(got * 100).toFixed(1)}%`).toBeLessThanOrEqual(hi + 1e-9);
      }
    }, 30_000);
});

describe('npm run bot:explain', () => {
  it('explains every bot move of the whole recorded hand, in order', () => {
    const whole = spot({
      name: 'recorded hand',
      seats: RECORDED,
      board: ['Js', 'Ac', 'Td', '8c'],
      moves: [...RECORDED_PREFLOP, ['Uma', 'flop', 'check'], ['Andre', 'flop', 'bet', 20], ['You', 'flop', 'call', 20], ['Uma', 'flop', 'fold'], ['Andre', 'turn', 'bet', 20], ['You', 'turn', 'fold']],
      expect: {},
    });
    const moves = explainHand(whole);
    expect(moves.map((m) => `${m.street} ${m.name} ${m.played}`)).toEqual([
      'preflop Vic fold',
      'preflop Mark fold',
      'preflop Uma raise 70',
      'preflop Andre call',
      'flop Uma check',
      'flop Andre bet 20',
      'flop Uma fold',
      'turn Andre bet 20',
    ]);
    for (const m of moves) expect(m.options.reduce((s, o) => s + o.chance, 0)).toBeCloseTo(1, 9);
    expect(explainText(moves)).toContain('flop (Js Ac Td): Uma [9h 9d], facing 20 into 250');
  }, 30_000);

  it('refuses a game mode, whose bots are different', () => {
    expect(() => explainHand({ ...spot({ name: '', seats: RECORDED, moves: [], expect: {} }), variant: 'onion' })).toThrow(/Texas Hold'em/);
  });
});

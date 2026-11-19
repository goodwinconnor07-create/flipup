import { describe, expect, it } from 'vitest';

import { applyAction, createTable, DEFAULT_SETTINGS, seededRng, type Action, type Game, type Settings } from '../game';
import { canReview, judge, reviewHand, reviewSummary, type ReviewHand } from './handReview';

const HOST = 'device-host';
let clock = 9_000_000;
const h = (s: string) => s.split(' ');

function must(game: Game, action: Action, deviceId: string): Game {
  const r = applyAction(game, action, { deviceId, now: clock, rng: seededRng(5) });
  if (!r.ok) throw new Error(`${action.type}: ${r.error}`);
  return r.game;
}

function table(settings: Partial<Settings> = {}): Game {
  let g = createTable({ hostDeviceId: HOST, name: 'Host', emoji: '😎', settings: { ...DEFAULT_SETTINGS, turnSeconds: 0, ...settings }, bots: 0, code: 'BCDFG', now: clock });
  g = must(g, { type: 'join', name: 'Rival', emoji: '🐸' }, 'device-1');
  g = must(g, { type: 'start' }, HOST);
  while (!g.hand) {
    clock = g.wakeAt! + 1;
    g = must(g, { type: 'tick' }, 'server');
  }
  return g;
}

const hostId = (g: Game) => g.players.find((p) => p.deviceId === HOST)!.id;

function act(g: Game, move: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin', to?: number): Game {
  const hand = g.hand!;
  let next = must(g, { type: 'act', hand: hand.number, seq: hand.seq, move, to }, g.players.find((p) => p.id === hand.toAct)!.deviceId!);
  while (next.hand && !next.hand.result && !next.hand.toAct && next.wakeAt != null) {
    clock = next.wakeAt + 1;
    next = must(next, { type: 'tick' }, 'server');
  }
  return next;
}

/** Heads-up with fixed cards, checked to the river, where the rival bets `bet` and you answer with `answer`. */
function riverSpot(mine: string, theirs: string, board: string, bet: number, answer: 'fold' | 'call', settings: Partial<Settings> = {}): ReviewHand {
  let g = table(settings);
  const me = hostId(g);
  for (const s of g.hand!.seats) s.cards = h(s.playerId === me ? mine : theirs);
  const b = h(board);
  g.hand!.deck = ['2c', b[0], b[1], b[2], '2s', b[3], '2h', b[4], ...g.hand!.deck.filter((c) => !b.includes(c) && !['2c', '2s', '2h'].includes(c))];
  g = act(g, g.hand!.currentBet > (g.hand!.seats.find((s) => s.playerId === g.hand!.toAct)!.bet) ? 'call' : 'check');
  g = act(g, 'check');
  for (const street of ['flop', 'turn'])
    while (g.hand!.street === street) g = act(g, 'check');
  if (g.hand!.toAct === me) g = act(g, 'check');
  g = act(g, 'bet', bet);
  g = act(g, answer);
  const hand = g.hand!;
  return {
    variant: 'holdem',
    smallBlind: g.settings.smallBlind,
    bigBlind: g.settings.bigBlind,
    buttonId: hand.buttonId,
    bbId: hand.bbId,
    me,
    players: hand.seats.map((s) => ({ id: s.playerId, stack: hand.startStacks![s.playerId] })),
    actions: hand.actions!,
    board: hand.board,
    holes: { [me]: hand.seats.find((s) => s.playerId === me)!.cards },
    house: { ante: settings.ante, straddle: settings.straddle },
  };
}

describe('mistake review', () => {
  it('flags folding the nuts to a small river bet', () => {
    const spot = riverSpot('Ah Ad', '7c 6d', 'As Kd 8h 3c 2d', 10, 'fold');
    const moves = reviewHand(spot)!;
    expect(moves).not.toBeNull();
    const fold = moves.at(-1)!;
    expect(fold.move).toBe('fold');
    expect(fold.street).toBe('river');
    expect(fold.price).toBeCloseTo(10 / 40, 2);
    expect(fold.equity).toBeGreaterThan(0.9);
    expect(fold.verdict).toBe('mistake');
    expect(fold.title).toBe('Fold was too tight');
    expect(fold.costBb).toBeGreaterThan(2);
    expect(reviewSummary(moves).mistakes).toBe(1);
  });

  it('flags calling a pot-size river bet with nothing', () => {
    const spot = riverSpot('7c 2d', 'Ah Kd', 'As Kh 9s 8s 4h', 20, 'call');
    const call = reviewHand(spot)!.at(-1)!;
    expect(call.move).toBe('call');
    expect(call.equity).toBeLessThan(0.15);
    expect(call.verdict).toBe('mistake');
    expect(call.title).toBe('Call was too loose');
  });

  it('calls a good fold good', () => {
    const spot = riverSpot('7c 2d', 'Ah Kd', 'As Kh 9s 8s 4h', 20, 'fold');
    expect(reviewHand(spot)!.at(-1)!.verdict).toBe('good');
  });

  it('rebuilds hands dealt with antes and a straddle', () => {
    const spot = riverSpot('Ah Ad', '7c 6d', 'As Kd 8h 3c 2d', 10, 'fold', { ante: 50 });
    expect(reviewHand(spot)).not.toBeNull();
  });

  it('reviews Texas Hold\'em hands with your cards only', () => {
    const spot = riverSpot('Ah Ad', '7c 6d', 'As Kd 8h 3c 2d', 10, 'fold');
    expect(canReview({ ...spot, variant: 'deuces' })).toBe(false);
    expect(reviewHand({ ...spot, variant: 'deuces' })).toBeNull();
    expect(canReview({ ...spot, holes: {} })).toBe(false);
  });

  it('points out a river check that left value behind, and never marks a bluff wrong', () => {
    expect(judge('check', 0.9, null, 0, 100, 'river', 10, false).title).toBe('Missed value');
    expect(judge('check', 0.9, null, 0, 100, 'flop', 10, false).verdict).toBe('fine');
    expect(judge('bet', 0.1, null, 0, 100, 'river', 10, false).verdict).toBe('fine');
    expect(judge('raise', 0.8, 0.3, 50, 100, 'turn', 10, false).verdict).toBe('good');
  });

  it('gives a call room for the cards still to come', () => {
    // 22% against a price of 33%: too loose on the river, only thin on the flop.
    expect(judge('call', 0.22, 0.33, 50, 100, 'river', 10, false).verdict).toBe('mistake');
    expect(judge('call', 0.22, 0.33, 50, 100, 'flop', 10, false).verdict).toBe('close');
  });
});

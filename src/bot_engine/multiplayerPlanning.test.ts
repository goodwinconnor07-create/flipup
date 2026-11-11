import { afterEach, describe, expect, it, vi } from 'vitest';
import { seededRng } from '../game/cards';
import { dealNextStreet, makeMove, runoutStep, showdown } from '../game/holdem';
import { informationFor, legalActions } from './information';
import { decisionFixture } from './testFixtures';
import { PlanningRound, continuationView, continuationIntent, estimateMultiplayer } from './multiplayerPlanning';
import { BaselineProvider } from './strategy';
import * as rangesModule from './ranges';
import type { OpponentRange } from './ranges';
import { calibrationContexts } from './calibration';

function flop(stacks = [100, 100, 100]) {
  const { game, ctx } = decisionFixture(stacks);
  while (game.hand!.toAct) {
    const i = informationFor(game, game.hand!.toAct!);
    expect(makeMove(game, i.legal.canCheck ? 'check' : 'call', undefined, ctx)).toBeNull();
  }
  dealNextStreet(game, ctx);
  return { game, ctx, info: informationFor(game, game.hand!.toAct!) };
}
afterEach(() => vi.restoreAllMocks());

describe('Multiplayer betting and future-street planning', () => {
  it('keeps analysis stable under player-array permutation and circular seat gaps', () => {
    const i = flop().info,
      provider = new BaselineProvider(16);
    const first = provider.predict(i);
    i.players.reverse();
    expect(provider.predict(i)).toEqual(first);
    i.players.forEach((p) => {
      p.seat = ([0, 3, 7][p.seat] + 4) % 9;
    });
    const rotated = provider.predict(i);
    expect(rotated.values).toEqual(first.values);
    expect(rotated.probabilities).toEqual(first.probabilities);
  });
  it('uses more caution against strength and never folds a shared royal-flush board', () => {
    const i = flop().info,
      round = new PlanningRound(i);
    const view = continuationView(round, 0, ['Ac', 'Qh']);
    view.board = ['As', '9c', '3d', '4c'];
    view.previousBoard = view.board.slice(0, 3);
    view.toCall = 20;
    view.eligiblePot = 80;
    const open = continuationIntent({ ...view, facingStrength: false });
    const multiway = continuationIntent({ ...view, live: 4, facingStrength: false });
    expect(multiway.betProbability).toBeLessThan(open.betProbability);
    const weak = { ...view, hole: ['8h', '6c'], board: ['As', 'Kd', '2c'], previousBoard: [] };
    expect(continuationIntent({ ...weak, drySidePot: true }).betProbability).toBeLessThan(
      continuationIntent({ ...weak, drySidePot: false }).betProbability,
    );
    expect(continuationIntent({ ...view, facingStrength: true }).callProbability).toBeLessThan(open.callProbability);
    const shared = { ...view, board: ['Ts', 'Js', 'Qs', 'Ks', 'As'], hole: ['2h', '3h'] };
    expect(continuationIntent(shared).callProbability).toBe(1);
  });
  it('matches production reopening, turn order and chip transitions in random legal betting lines', () => {
    const random = seededRng(73111);
    let checked = 0,
      multiway = 0;
    for (const seats of [2, 3, 6, 9])
      for (let trial = 0; trial < 6; trial++) {
        const { game, ctx } = decisionFixture(Array.from({ length: seats }, (_, n) => [7, 18, 40, 100][(n + trial) % 4]));
        for (let steps = 0; !game.hand!.result && steps < 150; steps++) {
          const h = game.hand!;
          if (h.runout) {
            runoutStep(game, ctx);
            continue;
          }
          if (h.showdownAt) {
            showdown(game, ctx);
            continue;
          }
          if (!h.toAct) {
            dealNextStreet(game, ctx);
            continue;
          }
          const i = informationFor(game, h.toAct),
            actions = legalActions(i);
          const action = actions[Math.floor(random() * actions.length)];
          if (i.street === 'preflop') {
            expect(makeMove(game, i.legal.canCheck ? 'check' : 'call', undefined, ctx)).toBeNull();
            continue;
          }
          const ledger = new PlanningRound(i),
            at = ledger.seats.findIndex((s) => s.playerId === i.heroId);
          expect(ledger.options(at)).toEqual({
            toCall: i.legal.toCall,
            minTo: i.legal.minTo,
            maxTo: i.legal.maxTo,
            canRaise: i.legal.canRaise,
          });
          expect(ledger.hand.minRaise).toBe(h.minRaise);
          ledger.apply(at, action);
          const next = ledger.next(at);
          expect(makeMove(game, action.move, action.to, ctx)).toBeNull();
          if (next >= 0) {
            expect(h.toAct).toBe(ledger.seats[next].playerId);
            for (const seat of ledger.seats) {
              const real = h.seats.find((s) => s.playerId === seat.playerId)!;
              expect({ bet: seat.bet, total: seat.total, folded: seat.folded, allIn: seat.allIn, acted: seat.acted }).toEqual({
                bet: real.bet,
                total: real.total,
                folded: real.folded,
                allIn: real.allIn,
                acted: real.acted,
              });
              expect(ledger.stacks[ledger.seats.indexOf(seat)]).toBe(game.players.find((p) => p.id === seat.playerId)!.stack);
            }
          } else {
            expect(h.toAct).toBeNull();
            if (!h.result) {
              ledger.refundUncalled();
              expect(ledger.seats.map((s) => s.total)).toEqual(h.seats.map((s) => s.total));
            }
          }
          checked++;
          if (i.players.filter((p) => !p.folded).length > 2) multiway++;
        }
        expect(game.hand!.result).not.toBeNull();
      }
    expect(checked).toBeGreaterThan(50);
    expect(multiway).toBeGreaterThan(25);
  });

  it('keeps betting closed after a short all-in and still models the remaining decisions', () => {
    const { game, ctx } = flop();
    const order = [] as string[];
    for (let k = 0; k < 3; k++) {
      const id = game.hand!.toAct!;
      order.push(id);
      if (k === 2) game.players.find((p) => p.id === id)!.stack = 25;
      expect(makeMove(game, k === 1 ? 'call' : k === 0 ? 'bet' : 'raise', k === 1 ? undefined : k === 0 ? 20 : 25, ctx)).toBeNull();
    }
    const i = informationFor(game, order[0]);
    expect(i.legal.canRaise).toBe(false);
    expect(new PlanningRound(i).options(new PlanningRound(i).seats.findIndex((s) => s.playerId === i.heroId)).canRaise).toBe(false);
    const prediction = new BaselineProvider(8).predict(i);
    expect(prediction.planning?.version).toBe('multi-street-2');
    expect(prediction.actions.every((a) => a.to === undefined)).toBe(true);
    expect(prediction.values!.every(Number.isFinite)).toBe(true);
  });

  it('separates a short hero main pot from future side pots and refunds unmatched jams', () => {
    const i = flop().info;
    i.street = 'turn';
    i.board = ['As', 'Ah', 'Kd', '2c'];
    i.hole = ['Ac', 'Ad'];
    i.actions = [];
    i.players.forEach((p) => {
      p.bet = 0;
      p.total = 100;
      p.stack = p.id === i.heroId ? 50 : 400;
    });
    i.currentBet = 0;
    i.legal = { ...i.legal, canCheck: true, canRaise: true, toCall: 0, minTo: 10, maxTo: 50 };
    const opponents = i.players.filter((p) => p.id !== i.heroId);
    const ranges: OpponentRange[] = opponents.map((p, k) => ({
      playerId: p.id,
      source: 'public-action-range-model',
      holdings: [{ cards: k === 0 ? ['7h', '6h'] : ['9s', '9d'], weight: 1 }],
    }));
    const actions = legalActions(i),
      jam = actions.findIndex((a) => a.to === 50);
    const result = estimateMultiplayer(i, ranges, actions, () => 0, 4);
    expect(result.values[jam]).toBe(400);
    expect(result.planning.futureCostBb[jam]).toBe(0);
    expect(result.planning.futureBetShare[jam]).toBe(0);
    // A deep hero cannot lose uncalled chips to two short callers.
    i.players.forEach((p) => {
      p.stack = p.id === i.heroId ? 900 : 50;
    });
    i.legal.maxTo = 900;
    const deep = estimateMultiplayer(i, ranges, [{ move: 'bet', to: 900 }], () => 0, 4);
    expect(deep.values[0]).toBe(400);
  });

  it('does not reveal a sampled river to turn policies and limits policy input to own cards', () => {
    const i = structuredClone(calibrationContexts().find((i) => i.street === 'flop' && i.legal.canCheck)!);
    i.hole = ['Ah', 'Kh'];
    i.board = ['2h', '7h', 'Qc'];
    const opponent = i.players.find((p) => p.id !== i.heroId)!;
    const ranges: OpponentRange[] = [
      { playerId: opponent.id, source: 'public-action-range-model', holdings: [{ cards: ['Qs', 'Jd'], weight: 1 }] },
    ];
    const mock = vi.spyOn(rangesModule, 'sampleDeal');
    const seen = (river: string) => {
      mock.mockReturnValue({ opponents: [['Qs', 'Jd']], board: [...i.board, '3c', river] });
      const turns: unknown[] = [];
      estimateMultiplayer(i, ranges, legalActions(i), seededRng(838), 16, (e) => {
        if (e.view.board.length === 4) turns.push(e);
      });
      return turns;
    };
    const before = seen('Jh');
    expect(before.length).toBeGreaterThan(0);
    expect(seen('9d')).toEqual(before);
    const view = continuationView(new PlanningRound(i), 0, i.hole);
    expect(Object.keys(view)).not.toContain('information');
    expect(JSON.stringify(view)).not.toMatch(/deck|opponents|players|actions/);
  });
});

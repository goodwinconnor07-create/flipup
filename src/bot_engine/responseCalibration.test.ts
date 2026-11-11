import { describe, it, expect } from 'vitest';
import { calibrationContexts } from './calibration';
import { PlanningRound, continuationView, estimateMultiplayer } from './multiplayerPlanning';
import { responseProbabilities, responseFeatures } from './responseModel';
import { publicResponseContexts, calibratedRanges } from './responseRanges';
import { inferRanges } from './ranges';
import { legalActions } from './information';
import { seededRng } from '../game/cards';
import { DecisionQualityAudit } from './decisionQuality';
import { BotService } from './service';
import { BotFactory } from './identity';
import { emptyMemory } from './memory';
import { CalibratedProvider } from './calibratedProvider';
import { simulate } from './simulation';
describe('Calibrated responses and decision quality', () => {
  it('masks impossible actions and ignores unknown private input fields', () => {
    const i = calibrationContexts().find((i) => i.street === 'turn')!,
      round = new PlanningRound(i),
      at = round.seats.findIndex((s) => s.playerId === i.heroId);
    const v = continuationView(round, at, i.hole),
      p = responseProbabilities(v);
    expect(p.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 12);
    expect(responseFeatures({ ...v, deck: ['As'] } as typeof v)).toEqual(responseFeatures(v));
    expect(responseProbabilities({ ...v, toCall: 0, canRaise: false })).toEqual([0, 1, 0]);
    expect(responseProbabilities({ ...v, board: ['Ts', 'Js', 'Qs', 'Ks', 'As'] })).toEqual([0, 1, 0]);
    const provider = new CalibratedProvider(4),
      before = provider.predict(i);
    expect(provider.predict({ ...i, deck: ['As'], opponentCards: ['Ah', 'Ad'] } as typeof i)).toEqual(before);
  });
  it('reconstructs prices before actions and narrows without using future boards', () => {
    const i = structuredClone(calibrationContexts().find((i) => i.street === 'river')!);
    i.hole = ['Ts', '9s'];
    i.board = ['7s', '7h', '2c', '4d', '5c'];
    const opponent = i.players.find((p) => p.id !== i.heroId)!.id;
    i.actions = [
      { street: 'flop', playerId: opponent, move: 'bet', to: 20 },
      { street: 'flop', playerId: i.heroId, move: 'call', to: 20 },
    ];
    const first = publicResponseContexts(i).get(opponent)![0];
    expect(first.view.board).toEqual(i.board.slice(0, 3));
    expect(first.view.toCall).toBe(0);
    const before = calibratedRanges(i, inferRanges(i, 'public-range-v2'))[0];
    i.board[4] = 'Ac';
    const after = publicResponseContexts(i).get(opponent)![0];
    expect(after).toEqual(first);
    expect(before.holdings.reduce((s, h) => s + h.weight, 0)).toBeCloseTo(1, 10);
  });
  it('replays production public contexts without observing another player’s cards', () => {
    let observations = 0;
    simulate(8, 741911, 6, {
      everyday: 'casual',
      startingStacksBb: [60, 12, 100, 35, 80, 45],
      agents: ['bot', 'competent', 'loose-passive', 'calling-station', 'competent', 'loose-passive'],
      onAction: (i, a) => {
        if (i.street === 'preflop') return;
        const round = new PlanningRound(i),
          at = round.seats.findIndex((s) => s.playerId === i.heroId),
          expected = continuationView(round, at, []);
        const actor = i.players.find((p) => p.id === i.heroId)!;
        const history = {
          ...i,
          actions: [
            ...i.actions,
            { street: i.street, playerId: i.heroId, move: a.move, to: a.to ?? (a.move === 'call' ? actor.bet + i.legal.toCall : 0) },
          ],
        };
        const replay = publicResponseContexts(history).get(i.heroId)!.at(-1)!.view;
        expect(replay).toEqual(expected);
        observations++;
      },
    });
    expect(observations).toBeGreaterThan(15);
  }, 20000);
  it('keeps raising closed after a short all-in and reopens after a full raise', () => {
    const base = structuredClone(calibrationContexts().find((i) => i.street === 'river')!);
    const make = (raiseTo: number) => ({
      ...base,
      buttonId: 'a',
      players: [
        { id: 'a', seat: 0, stack: 0, bet: raiseTo, total: raiseTo + 2, folded: false, allIn: true },
        { id: 'b', seat: 1, stack: 78, bet: 20, total: 22, folded: false, allIn: false },
        { id: 'c', seat: 2, stack: 78, bet: 20, total: 22, folded: false, allIn: false },
      ],
      smallBlind: 1,
      bigBlind: 2,
      actions: [
        { street: 'preflop' as const, playerId: 'a', move: 'call' as const, to: 2 },
        { street: 'preflop' as const, playerId: 'b', move: 'call' as const, to: 2 },
        { street: 'preflop' as const, playerId: 'c', move: 'check' as const, to: 0 },
        { street: 'flop' as const, playerId: 'b', move: 'bet' as const, to: 20 },
        { street: 'flop' as const, playerId: 'c', move: 'call' as const, to: 20 },
        { street: 'flop' as const, playerId: 'a', move: 'allin' as const, to: raiseTo },
        { street: 'flop' as const, playerId: 'b', move: 'call' as const, to: raiseTo },
      ],
    });
    const short = publicResponseContexts(make(25)).get('b')!.at(-1)!.view;
    expect(short.toCall).toBe(5);
    expect(short.canRaise).toBe(false);
    expect(publicResponseContexts(make(40)).get('b')!.at(-1)!.view.canRaise).toBe(true);
  });
  it('prices thin value, avoids losing calls and recognizes profitable bluffs in controlled worlds', () => {
    const i = structuredClone(calibrationContexts().find((i) => i.street === 'river' && i.legal.canCheck)!);
    i.hole = ['Ac', 'Ad'];
    i.board = ['As', 'Ah', 'Kd', '2c', '5s'];
    i.actions = [];
    const opponent = i.players.find((p) => p.id !== i.heroId)!;
    const ranges = [
      {
        playerId: opponent.id,
        source: 'public-action-range-model' as const,
        holdings: [{ cards: ['7h', '6h'] as [string, string], weight: 1 }],
      },
    ];
    const actions = legalActions(i),
      check = actions.findIndex((a) => a.move === 'check');
    const value = estimateMultiplayer(i, ranges, actions, seededRng(13), 16, undefined, () => [0, 1, 0]);
    expect(Math.max(...value.values)).toBeGreaterThan(value.values[check]);
    i.hole = ['Ks', 'Qc'];
    i.board = ['Kd', '9c', '4s', '2h', '7d'];
    ranges[0].holdings[0].cards = ['6s', '6h'];
    const thin = estimateMultiplayer(i, ranges, actions, seededRng(13), 16, undefined, () => [0, 1, 0]);
    expect(Math.max(...thin.values)).toBeGreaterThan(thin.values[check]);
    i.board = ['As', 'Ah', 'Kd', '2c', '5s'];
    i.hole = ['7h', '6h'];
    ranges[0].holdings[0].cards = ['Ac', 'Ad'];
    const bluff = estimateMultiplayer(i, ranges, actions, seededRng(13), 16, undefined, (v) => (v.toCall ? [1, 0, 0] : [0, 1, 0]));
    expect(Math.max(...bluff.values)).toBeGreaterThan(bluff.values[check]);
    i.currentBet = 20;
    opponent.bet = 20;
    opponent.total += 20;
    opponent.stack -= 20;
    i.legal = { ...i.legal, toCall: 20, canCheck: false, minTo: 40 };
    const facing = legalActions(i),
      loss = estimateMultiplayer(i, ranges, facing, seededRng(13), 16, undefined, () => [0, 1, 0]);
    expect(loss.values[facing.findIndex((a) => a.move === 'call')]).toBeLessThan(0);
  });
  it('flags a deliberately missed value bet instead of judging solely by aggression frequency', () => {
    const i = calibrationContexts().find((i) => i.street === 'river' && i.legal.canCheck)!;
    const actions = legalActions(i),
      values = actions.map((a) => (a.to === undefined ? 0 : 100));
    const t = new BotService({
      predict: () => ({
        actions,
        probabilities: actions.map(() => 1 / actions.length),
        values,
        rolloutValues: values,
        valueStandardErrors: actions.map(() => 0),
        modelVersion: 'baseline-7',
        source: 'multi-street-lookahead',
        coverage: 'modelled',
        equity: 0.9,
        equityStandardError: 0,
        warnings: [],
      }),
    }).decide(i, new BotFactory().generate(i.heroId, 1), emptyMemory(i.heroId, i.tableId), 1);
    t.finalDistribution = actions.map((a) => Number(a.move === 'check'));
    const audit = new DecisionQualityAudit();
    audit.observe(t);
    expect(audit.report().missedValue).toBe(1);
    t.prediction.equity = 0.1;
    audit.observe(t);
    expect(audit.report().abandonedBluffs).toBe(1);
    t.prediction.actions = [{ move: 'fold' }, { move: 'call' }];
    t.prediction.values = [0, -20];
    t.prediction.rolloutValues = [0, -20];
    t.prediction.valueStandardErrors = [0, 0];
    t.finalDistribution = [0, 1];
    audit.observe(t);
    expect(audit.report().weakCalls).toBe(1);
  });
});

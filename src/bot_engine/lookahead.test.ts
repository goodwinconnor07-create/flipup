import { afterEach, describe, expect, it, vi } from 'vitest';
import { seededRng } from '../game/cards';
import { calibrationContexts } from './calibration';
import { legalActions, type InformationSet } from './information';
import { estimateLookahead, lookaheadCoverage, streetIntent } from './lookahead';
import * as rangesModule from './ranges';
import type { OpponentRange } from './ranges';
import { BaselineProvider } from './strategy';
import { simulate } from './simulation';

const contexts = calibrationContexts();
const context = (street: 'flop' | 'turn' | 'river') => structuredClone(contexts.find((i) => i.street === street && i.legal.canCheck)!);
function singleRange(i: InformationSet, cards: [string, string]): OpponentRange[] {
  return [
    {
      playerId: i.players.find((p) => p.id !== i.heroId && !p.folded)!.id,
      holdings: [{ cards, weight: 1 }],
      source: 'public-action-range-model',
    },
  ];
}
afterEach(() => vi.restoreAllMocks());

describe('One-street planning', () => {
  it('uses planning on flop/turn and explicitly falls back for river, multiway and all-in states', () => {
    const provider = new BaselineProvider(8, 'baseline-6');
    for (const street of ['flop', 'turn'] as const) {
      const prediction = provider.predict(context(street));
      expect(provider.predict(structuredClone(context(street)))).toEqual(prediction);
      expect(prediction.source).toBe('one-street-lookahead');
      expect(prediction.planning?.nextStreet).toBe(street === 'flop' ? 'turn' : 'river');
      expect(prediction.rangeReads).toHaveLength(1);
    }
    const river = provider.predict(context('river'));
    expect(river.planning).toBeUndefined();
    expect(river.planningFallback).toBe('not-flop-or-turn');
    const multiway = context('flop');
    multiway.players.push({ ...multiway.players.find((p) => p.id !== multiway.heroId)!, id: 'third', seat: 8 });
    expect(provider.predict(multiway).planningFallback).toBe('multiway');
    const allIn = context('flop');
    const opponent = allIn.players.find((p) => p.id !== allIn.heroId)!;
    opponent.stack = 0;
    opponent.allIn = true;
    expect(lookaheadCoverage(allIn)).toEqual({ eligible: false, reason: 'all-in' });
  });

  it('returns unmatched chips and never bets a future street after an all-in', () => {
    const i = context('turn');
    i.hole = ['Ac', 'Ad'];
    i.board = ['As', 'Ah', 'Kd', '2c'];
    i.currentBet = 0;
    i.players.forEach((p) => {
      p.bet = 0;
      p.total = 100;
      p.stack = p.id === i.heroId ? 900 : 50;
    });
    i.legal = { ...i.legal, toCall: 0, canCheck: true, canRaise: true, minTo: 10, maxTo: 900 };
    const actions = legalActions(i);
    const jam = actions.findIndex((a) => a.to === 900);
    const win = estimateLookahead(i, singleRange(i, ['7h', '6h']), actions, () => 0, 8);
    expect(win.values[jam]).toBe(250); // Existing pot + opponent's capped call.
    expect(win.planning.futureCostBb[jam]).toBe(0);
    expect(win.planning.futureBetShare[jam]).toBe(0);
    i.hole = ['7h', '6h'];
    i.board = ['As', 'Ah', 'Ad', '2c'];
    const loss = estimateLookahead(i, singleRange(i, ['Ac', 'Kd']), actions, () => 0, 8);
    expect(loss.values[jam]).toBe(-50); // The other 850 chips come back.
  });

  it('does not let a hypothetical river affect flop-to-turn betting policies', () => {
    const i = context('flop');
    i.hole = ['Ah', 'Kh'];
    i.board = ['2h', '7h', 'Qc'];
    const ranges = singleRange(i, ['Qs', 'Jd']),
      actions = legalActions(i);
    const deal = vi.spyOn(rangesModule, 'sampleDeal');
    deal.mockReturnValue({ opponents: [['Qs', 'Jd']], board: [...i.board, '3c', 'Jh'] });
    const flush = estimateLookahead(i, ranges, actions, seededRng(19), 64);
    deal.mockReturnValue({ opponents: [['Qs', 'Jd']], board: [...i.board, '3c', '9d'] });
    const miss = estimateLookahead(i, ranges, actions, seededRng(19), 64);
    expect(flush.planning).toEqual(miss.planning);
    expect(flush.values).not.toEqual(miss.values);
  });

  it('prices a possible re-raise and bounds every branch by available chips', () => {
    const i = context('flop');
    i.hole = ['Ac', 'Qc'];
    i.board = ['2h', '8s', 'Kd'];
    const actions = legalActions(i),
      hero = i.players.find((p) => p.id === i.heroId)!;
    const opponent = i.players.find((p) => p.id !== i.heroId)!;
    const estimate = estimateLookahead(i, singleRange(i, ['2c', '2d']), actions, () => 0, 8);
    expect(estimate.planning.reRaiseShare.some((p) => p > 0)).toBe(true);
    estimate.values.forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(-hero.stack);
      expect(value).toBeLessThanOrEqual(i.players.reduce((s, p) => s + p.total, 0) + opponent.stack);
    });
    expect(streetIntent(['Ah', 'Kh'], ['2h', '7h', 'Qc', '3h'], true, true).betProbability).toBeGreaterThan(
      streetIntent(['Ah', 'Kh'], ['2h', '7h', 'Qc', '3c', '9d'], true, true).betProbability,
    );
  });

  it('completes whole hands through production rules with uneven stacks and cold callers', () => {
    for (const seats of [2, 6]) {
      const r = simulate(12, 886321, seats, {
        everyday: 'casual',
        pairedDecks: true,
        carryStacks: true,
        agents: seats === 2 ? ['bot', 'competent'] : ['bot', 'bot', 'loose-passive', 'competent', 'loose-passive', 'bot'],
        startingStacksBb: seats === 2 ? [35, 120] : [60, 35, 100, 140, 80, 45],
      });
      expect(r.hands).toBe(12);
      expect(r.decisions).toBeGreaterThan(12);
      expect(r.handReturnsBb.every(Number.isFinite)).toBe(true);
      expect(r.postflopCoverage.rangeAnalysedDecisions).toBe(r.postflopCoverage.decisions);
      if (seats === 2) expect(r.postflopCoverage.plannedDecisions).toBeGreaterThan(0);
    }
  }, 30000);
});

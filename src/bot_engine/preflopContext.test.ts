import { describe, expect, it } from 'vitest';
import { preflopContext } from './preflopContext';
import { decisionFixture } from './testFixtures';
import { BaselineProvider } from './strategy';
import { makeMove } from '../game/holdem';
import { inferRanges } from './ranges';
import { informationFor } from './information';

describe('Unequal stacks and cold callers', () => {
  it('models unequal depths directly without selecting an equal-stack chart', () => {
    const { game, ctx, info } = decisionFixture([18, 73, 140, 45], [30, 'call']);
    const p = new BaselineProvider(160).predict(info);
    expect(p.preflop).toEqual({ matched: false, reason: 'unequal-starting-stacks' });
    expect(p.source).toBe('commitment-aware-preflop');
    expect(p.coverage).toBe('modelled');
    expect(p.preflopContext).toMatchObject({ unequalStacks: true, callers: 1, squeeze: true, coldCall: true, raiseCount: 1 });
    expect(p.preflopContext!.depthsBb.sort((a, b) => a - b)).toEqual([18, 45, 73, 140]);
    expect(p.values!.every(Number.isFinite)).toBe(true);
    for (const a of p.actions) expect(makeMove(structuredClone(game), a.move, a.to, ctx)).toBeNull();
    const before = p.probabilities;
    game.hand!.deck.reverse();
    game
      .hand!.seats.filter((s) => s.playerId !== info.heroId)
      .forEach((s) => {
        s.cards = ['2c', '3d'];
      });
    expect(new BaselineProvider().predict(informationFor(game, info.heroId)).probabilities).toEqual(before);
  });
  it('adds callers to squeeze sizing, caps it to effective stacks and respects reopening', () => {
    const open = decisionFixture([100, 100, 100, 100], [30]).info;
    const cold = decisionFixture([100, 100, 100, 100], [30, 'call']).info;
    expect(preflopContext(cold).raiseTo).toBeGreaterThan(preflopContext(open).raiseTo);
    const short = decisionFixture([8, 12, 9, 10], [30, 'call']).info;
    const c = preflopContext(short);
    expect(c.raiseTo).toBeLessThanOrEqual(short.legal.maxTo);
    expect(c.raiseTo).toBeLessThanOrEqual(c.effectiveTo);
    cold.legal.canRaise = false;
    expect(new BaselineProvider(8).predict(cold).actions.every((a) => a.to === undefined)).toBe(true);
  });
  it('distinguishes a cold caller from a repeated raiser and removes visible blockers', () => {
    const info = decisionFixture([100, 100, 100, 100], [30, 'call', 150]).info;
    const ranges = inferRanges(info, 'commitment-aware');
    const ratio = (id: string) => {
      const r = ranges.find((r) => r.playerId === id)!;
      const avg = (pair: string) => r.holdings.filter((h) => h.cards.every((c) => c[0] === pair)).reduce((s, h) => s + h.weight, 0);
      return avg('A') / avg('7');
    };
    expect(ratio(info.actions[2].playerId)).toBeGreaterThan(ratio(info.actions[1].playerId));
    expect(ranges.flatMap((r) => r.holdings).every((h) => h.cards.every((c) => !info.hole.includes(c)))).toBe(true);
  });
  it('does not count an all-in call as another raise', () => {
    const info = decisionFixture([100, 100, 100, 100], [30, 'call']).info;
    info.actions[1].move = 'allin';
    expect(preflopContext(info).raiseCount).toBe(1);
    expect(preflopContext(info).callers).toBe(1);
  });
});

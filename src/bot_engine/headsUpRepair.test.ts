import { describe, it, expect } from 'vitest';
import { calibrationContexts } from './calibration';
import { legalActions, validateInformation } from './information';
import { inferRanges } from './ranges';
import { seededRng } from '../game/cards';
import { estimateMultiplayer, PlanningRound, continuationView } from './multiplayerPlanning';
import { responseProbabilities } from './responseModel';
import { responseProbabilitiesV2, responseFeaturesV2 } from './responseModelV2';
import { guardedResponse } from './guardedResponse';
import { specifiedWorlds } from './specifiedWorlds';
import { CalibratedProvider } from './calibratedProvider';
import { EverydayProvider } from './everydayProvider';

describe('Heads-up model repair', () => {
  it('can model opponents without replacing the bot’s own future policy', () => {
    const i = calibrationContexts().find((i) => i.street === 'flop' && i.legal.canCheck)!;
    const ranges = inferRanges(i, 'public-range-v2'),
      actions = legalActions(i);
    let opponents = 0;
    const opponent = (v: Parameters<typeof responseProbabilities>[0]) => {
      opponents++;
      expect(v.hole.some((c) => i.hole.includes(c))).toBe(false);
      expect('deck' in v || 'opponentCards' in v).toBe(false);
      return responseProbabilities(v);
    };
    let heroContinuations = 0;
    estimateMultiplayer(
      i,
      ranges,
      actions,
      seededRng(7),
      8,
      ({ playerId }) => {
        if (playerId === i.heroId) heroContinuations++;
      },
      { opponents: opponent },
    );
    expect(opponents).toBeGreaterThan(0);
    expect(heroContinuations).toBeGreaterThan(0);
    const before = estimateMultiplayer(i, ranges, actions, seededRng(7), 8, undefined, responseProbabilities);
    const explicit = estimateMultiplayer(i, ranges, actions, seededRng(7), 8, undefined, {
      opponents: responseProbabilities,
      hero: responseProbabilities,
    });
    expect(explicit).toEqual(before);
  });
  it('keeps legal masks and shared-royal calls across fitted and guarded policies', () => {
    const i = specifiedWorlds()[0].information,
      round = new PlanningRound(i);
    const v = continuationView(
      round,
      round.seats.findIndex((s) => s.playerId === i.heroId),
      i.hole,
    );
    for (const predictor of [responseProbabilities, responseProbabilitiesV2, guardedResponse]) {
      expect(predictor({ ...v, toCall: 0, canRaise: false })).toEqual([0, 1, 0]);
      expect(predictor({ ...v, board: ['Ts', 'Js', 'Qs', 'Ks', 'As'] })).toEqual([0, 1, 0]);
      expect(predictor({ ...v, canRaise: false })[2]).toBe(0);
    }
    const strong = responseFeaturesV2(v);
    const weak = responseFeaturesV2({ ...v, hole: ['7h', '6h'] });
    expect(strong).not.toEqual(weak);
  });
  it('has exact utilities in specified value, call and bluff worlds', () => {
    for (const w of specifiedWorlds()) {
      const i = w.information;
      validateInformation(i);
      const visible = [...i.hole, ...i.board, ...w.ranges[0].holdings[0].cards];
      expect(new Set(visible).size).toBe(visible.length);
      const actions = legalActions(i),
        r = estimateMultiplayer(i, w.ranges, actions, seededRng(11), 8, undefined, w.response);
      expect(r.standardErrors.every((v) => v < 1e-6)).toBe(true);
      const passive = actions.findIndex((a) => a.move === (i.legal.canCheck ? 'check' : 'call'));
      if (w.id === 'losing-call') expect(r.values[passive]).toBe(-i.legal.toCall);
      if (w.id === 'profitable-bluff-catch') expect(r.values[passive]).toBeGreaterThan(0);
      if (['nuts-value', 'thin-value', 'profitable-bluff'].includes(w.id)) expect(Math.max(...r.values)).toBeGreaterThan(r.values[passive]);
      if (w.id === 'bluff-into-caller') expect(r.values[passive]).toBe(Math.max(...r.values));
    }
  });
  it('bounds optimistic fitted calls by the reference model and retains profitable value', () => {
    const world = specifiedWorlds().find((w) => w.id === 'losing-call')!;
    const v7 = new EverydayProvider(32, 'baseline-7').predict(world.information);
    const p = new CalibratedProvider(32, 'robust').predict(world.information);
    const call = p.actions.findIndex((a) => a.move === 'call');
    expect(p.modelAgreement!.candidateValues[call]).toBeGreaterThan(p.modelAgreement!.referenceValues[call]);
    expect(p.values![call]).toBeLessThanOrEqual(v7.values![call]);
    expect(p.equity!).toBeLessThanOrEqual(v7.equity!);
    expect(p.values![call]).toBeLessThan(0);
    const nuts = specifiedWorlds()[0].information;
    const value = new CalibratedProvider(32, 'robust').predict(nuts);
    const check = value.actions.findIndex((a) => a.move === 'check');
    expect(Math.max(...value.values!)).toBeGreaterThan(value.values![check]);
    expect(new CalibratedProvider(32, 'robust').predict({ ...nuts, deck: ['As'], opponentCards: ['Ah', 'Ad'] } as typeof nuts)).toEqual(
      value,
    );
  });
});

import { hashString, seededRng } from '../game/cards';
import { EverydayProvider } from './everydayProvider';
import { legalActions, validateInformation, type InformationSet } from './information';
import { estimateMultiplayer } from './multiplayerPlanning';
import { responseProbabilities } from './responseModel';
import { inferRanges } from './ranges';
import { summarizeRange } from './rangeAnalysis';
import { normalize, type StrategyProvider, type StrategyPrediction } from './strategy';
import { calibratedRanges } from './responseRanges';
import { guardedResponse } from './guardedResponse';
import { responseProbabilitiesV2 } from './responseModelV2';
export type CalibrationMode = 'combined' | 'ranges' | 'responses' | 'opponents' | 'guarded' | 'nonlinear' | 'robust';
export class CalibratedProvider implements StrategyProvider {
  constructor(
    private samples = 96,
    private mode: CalibrationMode = 'combined',
  ) {}
  predict(i: InformationSet): StrategyPrediction {
    validateInformation(i);
    if (i.street === 'preflop') return new EverydayProvider(this.samples, 'baseline-7').predict(i);
    const physical = [...i.players].sort((a, b) => a.seat - b.seat),
      button = physical.findIndex((p) => p.id === i.buttonId);
    const ordered = { ...i, players: physical.map((_, n) => physical[(button + n + 1) % physical.length]) };
    const prior = inferRanges(ordered, 'public-range-v2');
    const fitted = this.mode === 'nonlinear' || this.mode === 'robust' ? responseProbabilitiesV2 : responseProbabilities;
    const posterior = this.mode === 'responses' ? prior : calibratedRanges(ordered, prior, fitted);
    const ranges =
      this.mode === 'guarded'
        ? posterior.map((r, k) => ({
            ...r,
            holdings: r.holdings.map((h, j) => ({
              cards: h.cards,
              weight: (h.weight + prior[k].holdings[j].weight) / 2,
            })),
          }))
        : posterior;
    const actions = legalActions(i, true, true),
      n = Math.max(2, Math.min(160, Math.ceil(this.samples / Math.sqrt(Math.max(1, (ranges.length + 1) / 2)))));
    const estimate = estimateMultiplayer(
      i,
      ranges,
      actions,
      seededRng(hashString(JSON.stringify([i.hole, i.board, i.actions, 'multi-street-2']))),
      n,
      undefined,
      this.mode === 'ranges'
        ? undefined
        : this.mode === 'opponents' || this.mode === 'guarded' || this.mode === 'nonlinear' || this.mode === 'robust'
          ? { opponents: this.mode === 'guarded' ? guardedResponse : fitted }
          : fitted,
    );
    const reference =
      this.mode === 'robust'
        ? estimateMultiplayer(i, prior, actions, seededRng(hashString(JSON.stringify([i.hole, i.board, i.actions, 'multi-street-2']))), n)
        : undefined;
    const agreement = reference
      ? {
          rule: 'lower-model-score' as const,
          referenceValues: [...reference.values],
          candidateValues: [...estimate.values],
          referenceEquity: reference.equity,
          candidateEquity: estimate.equity,
        }
      : undefined;
    if (reference) {
      estimate.values = estimate.values.map((v, k) => Math.min(v, reference.values[k]));
      estimate.standardErrors = estimate.standardErrors.map((v, k) => Math.max(v, reference.standardErrors[k]));
      estimate.equity = Math.min(estimate.equity, reference.equity);
      estimate.equityStandardError = Math.max(estimate.equityStandardError, reference.equityStandardError);
    }
    const best = Math.max(...estimate.values),
      temperature = Math.max(i.bigBlind * 0.5, i.players.reduce((s, p) => s + p.total, 0) * 0.08);
    return {
      actions,
      modelVersion: 'baseline-7',
      source: 'multi-street-lookahead',
      coverage: 'modelled',
      probabilities: normalize(estimate.values.map((v) => Math.exp(Math.max(-40, (v - best) / temperature)))),
      values: estimate.values,
      valueStandardErrors: estimate.standardErrors,
      equity: estimate.equity,
      equityStandardError: estimate.equityStandardError,
      planning: estimate.planning,
      ...(agreement ? { modelAgreement: agreement } : {}),
      rangeReads: ranges.map((r) => summarizeRange(i, r)),
      calibration: {
        revision: `${this.mode === 'robust' ? 'response-4' : this.mode === 'nonlinear' ? 'response-3' : this.mode === 'guarded' || this.mode === 'opponents' ? 'response-2' : 'response-1'}:${this.mode}`,
        samples: n,
      },
      warnings: [
        'Response probabilities fitted to synthetic production-engine decisions; public-action range update, bounded future policies, not human calibration or solver EVs.',
        ...(reference
          ? [
              'Conservative lower score/equity across frozen V7 and the fitted model; maximum reported sampling error. These are model-uncertainty decision scores, not calibrated EVs or confidence bounds.',
            ]
          : []),
      ],
    };
  }
}

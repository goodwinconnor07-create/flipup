import { hashString, seededRng } from '../game/cards';
import { EverydayProvider } from './everydayProvider';
import { legalActions, validateInformation, type InformationSet } from './information';
import { estimateMultiplayer } from './multiplayerPlanning';
import { responseProbabilities } from './responseModel';
import { inferRanges } from './ranges';
import { summarizeRange } from './rangeAnalysis';
import { normalize, type StrategyProvider, type StrategyPrediction } from './strategy';
import { calibratedRanges } from './responseRanges';
export class CalibratedProvider implements StrategyProvider {
  constructor(private samples = 96) {}
  predict(i: InformationSet): StrategyPrediction {
    validateInformation(i);
    if (i.street === 'preflop') return new EverydayProvider(this.samples, 'baseline-7').predict(i);
    const physical = [...i.players].sort((a, b) => a.seat - b.seat),
      button = physical.findIndex((p) => p.id === i.buttonId);
    const ordered = { ...i, players: physical.map((_, n) => physical[(button + n + 1) % physical.length]) };
    const ranges = calibratedRanges(ordered, inferRanges(ordered, 'public-range-v2'));
    const actions = legalActions(i, true, true),
      n = Math.max(2, Math.min(160, Math.ceil(this.samples / Math.sqrt(Math.max(1, (ranges.length + 1) / 2)))));
    const estimate = estimateMultiplayer(
      i,
      ranges,
      actions,
      seededRng(hashString(JSON.stringify([i.hole, i.board, i.actions, 'multi-street-2']))),
      n,
      undefined,
      responseProbabilities,
    );
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
      rangeReads: ranges.map((r) => summarizeRange(i, r)),
      calibration: { revision: 'response-1', samples: n },
      warnings: [
        'Response probabilities fitted to synthetic production-engine decisions; public-action range update, bounded future policies, not human calibration or solver EVs.',
      ],
    };
  }
}

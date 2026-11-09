import { legalActions, validateInformation, type InformationSet } from './information';
import { preflopLookup } from './preflop';
import { preflopContext } from './preflopContext';
import { BaselineProvider, type StrategyPrediction, type StrategyProvider } from './strategy';

/** Normal tables use authored preflop ranges, with existing chart anchors where supported.
 * Avoid expensive rollouts that the preflop reference would immediately replace. */
export class EverydayProvider implements StrategyProvider {
  private baseline: BaselineProvider;
  constructor(samples = 96) {
    this.baseline = new BaselineProvider(samples);
  }
  predict(i: InformationSet): StrategyPrediction {
    if (i.street !== 'preflop') return this.baseline.predict(i);
    validateInformation(i);
    const chart = preflopLookup(i);
    if (chart.matched) return this.baseline.predict(i);
    const actions = legalActions(i, true, true);
    return {
      actions,
      probabilities: actions.map(() => 1 / actions.length),
      values: null,
      modelVersion: 'baseline-5',
      coverage: 'modelled',
      source: 'everyday-preflop-ranges',
      preflop: chart,
      preflopContext: preflopContext(i),
      equity: null,
      equityStandardError: null,
      warnings: [
        'Everyday preflop policy uses authored, position/price/stack-aware hand-percentile ranges. No rollout EV or human-data calibration.',
      ],
    };
  }
}

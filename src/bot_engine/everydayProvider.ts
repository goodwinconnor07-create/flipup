import { legalActions, validateInformation, type InformationSet } from './information';
import { preflopLookup } from './preflop';
import { preflopContext } from './preflopContext';
import { BaselineProvider, type StrategyPrediction, type StrategyProvider } from './strategy';

/** Normal tables use authored preflop ranges, with existing chart anchors where supported.
 * Avoid expensive rollouts that the preflop reference would immediately replace. */
export class EverydayProvider implements StrategyProvider {
  private baseline: BaselineProvider;
  private revision: 'baseline-5' | 'baseline-6' | 'baseline-7';
  constructor(samples = 96, revision: 'baseline-5' | 'baseline-6' | 'baseline-7' = 'baseline-7') {
    this.baseline = new BaselineProvider(samples, revision);
    this.revision = revision;
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
      modelVersion: this.revision,
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

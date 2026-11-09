import charts from '../game/botCharts.json';
import { hashString, rankOf, seededRng } from '../game/cards';
import { inferRanges } from './ranges';
import { estimateActionValues } from './actionValues';
import { legalActions, validateInformation, type InformationSet } from './information';
import type { BotMove } from '../game/botPlay';
import { blueprintMix } from './blueprint';
import { preflopLookup, type PreflopLookup } from './preflop';
import { preflopContext } from './preflopContext';
import { decisionRisk } from './decisionRisk';

export const CURRENT_STRATEGY_VERSION = 'baseline-5';

export interface StrategyPrediction {
  actions: BotMove[];
  probabilities: number[];
  unmodifiedProbabilities?: number[];
  values: number[] | null;
  rolloutValues?: number[];
  source:
    | 'shipped-preflop-frequency'
    | 'range-equity-fallback'
    | 'coarse-blueprint-blend'
    | 'commitment-aware-preflop'
    | 'everyday-preflop-ranges';
  coverage: 'abstracted' | 'fallback' | 'modelled';
  modelVersion: 'baseline-1' | 'baseline-2' | 'baseline-3' | 'baseline-4' | 'baseline-5';
  preflop?: PreflopLookup;
  preflopContext?: ReturnType<typeof preflopContext>;
  blueprint?: { key: string; blend: number };
  valueStandardErrors?: (number | null)[];
  equity: number | null;
  equityStandardError: number | null;
  warnings: string[];
}
export interface StrategyProvider {
  predict(info: InformationSet): StrategyPrediction;
}
export function normalize(weights: number[]): number[] {
  if (!weights.length || weights.some((w) => !Number.isFinite(w) || w < 0)) throw new Error('Invalid policy');
  const scale = Math.max(...weights);
  if (!(scale > 0)) throw new Error('Empty policy');
  const sum = weights.reduce((a, b) => a + b / scale, 0);
  return weights.map((w) => w / scale / sum);
}
const digit = '0123456789abcdefghijklmnopqrstuvwxyz';
export class BaselineProvider implements StrategyProvider {
  constructor(
    private samples = 160,
    private revision: 'baseline-2' | 'baseline-3' | 'baseline-4' | 'baseline-5' = CURRENT_STRATEGY_VERSION,
  ) {
    if (!Number.isSafeInteger(samples) || samples < 1) throw new Error('Invalid sample count');
  }
  predict(i: InformationSet): StrategyPrediction {
    validateInformation(i);
    const contextual = this.revision === 'baseline-5' && i.street === 'preflop';
    const actions = legalActions(i, this.revision === 'baseline-4' || this.revision === 'baseline-5', contextual);
    const preflop =
      (this.revision === 'baseline-4' || this.revision === 'baseline-5') && i.street === 'preflop' ? preflopLookup(i) : undefined;
    const common = { actions, modelVersion: this.revision, ...(preflop ? { preflop } : {}) };
    if (preflop?.matched) {
      const weights = actions.map((a) =>
        a.to !== undefined
          ? a.to === preflop.raiseTo
            ? preflop.raise
            : 0
          : a.move === 'call'
            ? preflop.call
            : a.move === 'check'
              ? 1 - preflop.raise
              : Math.max(0, 1 - preflop.call - preflop.raise),
      );
      return {
        ...common,
        probabilities: normalize(weights),
        values: null,
        source: 'shipped-preflop-frequency',
        coverage: 'abstracted',
        equity: null,
        equityStandardError: null,
        warnings: [
          'Quantized frequencies, not EVs. Collapsed raise/jam mass uses the default solver raise size rounded to whole chips; no sizing mix is preserved. Equal shipped stacks only. Solver convergence not independently certified.',
        ],
      };
    }
    const players = [...i.players].sort((a, b) => a.seat - b.seat);
    const button = players.findIndex((p) => p.id === i.buttonId);
    const order = players.map((_, n) => players[(button + (players.length === 2 ? 0 : 3) + n) % players.length]);
    const hero = players.find((p) => p.id === i.heroId)!;
    const depth = (hero.stack + hero.total) / i.bigBlind;
    const key = `${players.length}p${depth}`;
    const bank = charts.charts as Record<string, { spots: Record<string, string> }>;
    const hole = [...i.hole].sort((a, b) => rankOf(b) - rankOf(a));
    const cls = hole[0][0] + hole[1][0] + (hole[0][0] === hole[1][0] ? '' : hole[0][1] === hole[1][1] ? 's' : 'o');
    const index = charts.classes.indexOf(cls);
    const encoded = bank[key]?.spots[`rfi.${order.findIndex((p) => p.id === i.heroId)}`];
    // No nearest-depth mapping, limper adjustments, or cold-three-bet interpolation.
    const opening =
      i.street === 'preflop' &&
      i.currentBet === i.bigBlind &&
      i.actions.every((a) => a.move === 'fold') &&
      players.every((p) => (p.stack + p.total) / i.bigBlind === depth);
    if ((this.revision === 'baseline-2' || this.revision === 'baseline-3') && opening && encoded && index >= 0 && i.legal.canRaise) {
      const call = digit.indexOf(encoded[index * 2]) / 35;
      const raise = digit.indexOf(encoded[index * 2 + 1]) / 35;
      if (call >= 0 && raise >= 0 && call + raise <= 1.03) {
        const target = Math.max(i.legal.minTo, Math.min(i.legal.maxTo, Math.round(i.bigBlind * (players.length === 2 ? 2.5 : 3))));
        const raises = actions.map((a, n) => ({ a, n })).filter(({ a }) => a.to !== undefined);
        const nearest = raises.reduce((best, x) => (Math.abs(x.a.to! - target) < Math.abs(best.a.to! - target) ? x : best)).n;
        const weights = actions.map((a, n) =>
          n === nearest
            ? raise
            : a.move === 'call'
              ? call
              : a.move === 'check'
                ? 1 - raise
                : a.move === 'fold'
                  ? Math.max(0, 1 - call - raise)
                  : 0,
        );
        return {
          ...common,
          probabilities: normalize(weights),
          values: null,
          source: 'shipped-preflop-frequency',
          coverage: 'abstracted',
          equity: null,
          equityStandardError: null,
          warnings: [
            'Quantized frequencies, not EVs; raise size mapped to legal candidate. Solver convergence not independently certified.',
          ],
        };
      }
    }
    const opponents = players.filter((p) => p.id !== i.heroId && !p.folded).length;
    // Analysis randomness is separate from dealing and policy sampling. Only visible cards seed it.
    const rng = seededRng(hashString(JSON.stringify([i.hole, i.board, opponents])));
    const estimate = estimateActionValues(
      i,
      inferRanges(i, this.revision === 'baseline-2' ? 'legacy' : contextual ? 'commitment-aware' : 'street-aware'),
      actions,
      rng,
      this.samples,
      contextual,
    );
    const equity = estimate.equity;
    const pot = players.reduce((sum, p) => sum + p.total, 0);
    const values = contextual ? decisionRisk(i, actions, estimate.values, estimate.standardErrors, equity) : estimate.values;
    const best = Math.max(...values);
    const temperature = Math.max(i.bigBlind * 0.5, pot * 0.08);
    const weights = values.map((v) => Math.exp(Math.max(-40, (v - best) / temperature)));
    const probabilities = normalize(weights);
    const blueprint = this.revision !== 'baseline-2' ? blueprintMix(i, actions, probabilities, values) : null;
    return {
      ...common,
      probabilities: normalize(blueprint?.probabilities ?? probabilities),
      values,
      ...(contextual ? { rolloutValues: estimate.values } : {}),
      source: contextual ? 'commitment-aware-preflop' : blueprint ? 'coarse-blueprint-blend' : 'range-equity-fallback',
      ...(contextual ? { preflopContext: preflopContext(i) } : {}),
      ...(blueprint ? { blueprint: { key: blueprint.key, blend: blueprint.blend } } : {}),
      coverage: contextual ? 'modelled' : 'fallback',
      equity,
      equityStandardError: estimate.equityStandardError,
      valueStandardErrors: estimate.standardErrors,
      warnings: [
        ...(contextual
          ? [
              'Uses actual unequal stacks, cold-call commitments and capped squeeze sizes; scores subtract an untrained risk reserve and sampling uncertainty. Not solved or calibrated future-street EVs.',
            ]
          : []),
        'Untrained ranges/responses; one-round rollout with exact pot eligibility and stack caps. Future betting, re-raises and position-dependent realization omitted; tie shares are fractional expectations. Not solver EVs.',
      ],
    };
  }
}

import { hashString, seededRng } from '../game/cards';
import { legalActions, validateInformation, type InformationSet } from './information';
import { EverydayProvider } from './everydayProvider';
import { inferRanges, normalizeRange, type OpponentRange } from './ranges';
import { publicResponseContexts } from './responseRanges';
import { priorResponse } from './guardedResponse';
import { opponentEvidence, opponentResponse, opponentSizing } from './opponentModel';
import { type BehaviorSnapshot } from './behaviorMemory';
import { estimateMultiplayer } from './multiplayerPlanning';
import { continuationView, PlanningRound } from './multiplayerPlanning';
import { summarizeRange } from './rangeAnalysis';
import { ownHandKind } from './handPlan';
import { normalize, type StrategyPrediction, type StrategyProvider } from './strategy';

/** Temper the actual V7 range likelihood, rather than mixing incompatible likelihood models. */
export function behavioralRanges(i: InformationSet, prior: OpponentRange[], s?: BehaviorSnapshot): OpponentRange[] {
  const records = publicResponseContexts(i);
  return prior.map((r) => {
    if (!Object.hasOwn(s?.opponents ?? {}, r.playerId)) return r;
    const updates = (records.get(r.playerId) ?? [])
      .map((row) => {
        const e = opponentEvidence(s, r.playerId, row.view);
        const population = row.view.toCall ? [0.3, 0.6, 0.1] : [0, 0.82, 0.18];
        const shift = row.label === 0 ? 0 : e.trust * Math.max(-1, Math.min(1, Math.log(population[row.label] / e.frequencies[row.label])));
        return { row, shift };
      })
      .filter((u) => u.shift !== 0);
    if (!updates.length) return r;
    return {
      ...r,
      holdings: normalizeRange(
        r.holdings.map((h) => {
          let weight = h.weight;
          for (const { row, shift } of updates) {
            const kind = ownHandKind(h.cards, row.view.board),
              strength = Math.max(kind.level / 11, kind.draw !== 'none' ? 0.46 : 0.04);
            const action = i.actions[row.actionIndex];
            const likelihood =
              row.label === 2
                ? 0.06 + 0.94 / (1 + Math.exp(-(strength - (row.view.toCall ? 0.61 : 0.42)) / 0.14))
                : action.move === 'check'
                  ? 0.95 - Math.min(0.45, strength * 0.45)
                  : 0.16 + strength * 0.72;
            weight *= Math.pow(likelihood, shift);
          }
          return { cards: h.cards, weight };
        }),
      ),
    };
  });
}
export class BehavioralProvider implements StrategyProvider {
  constructor(private samples = 96) {}
  predict(i: InformationSet, s?: BehaviorSnapshot): StrategyPrediction {
    validateInformation(i);
    if (s && s.hand !== i.hand) throw new Error('Mismatched public behavior snapshot');
    const active = i.players.filter((p) => p.id !== i.heroId && !p.folded);
    const history = active.some((p) =>
      Object.values(Object.hasOwn(s?.opponents ?? {}, p.id) ? s!.opponents[p.id] : {}).some((c) => c.counts.some((n) => n > 0)),
    );
    if (i.street === 'preflop' || !history) return new EverydayProvider(this.samples, 'baseline-7').predict(i);
    const physical = [...i.players].sort((a, b) => a.seat - b.seat),
      button = physical.findIndex((p) => p.id === i.buttonId);
    const ordered = { ...i, players: physical.map((_, n) => physical[(button + n + 1) % physical.length]) };
    const ranges = behavioralRanges(ordered, inferRanges(ordered, 'public-range-v2'), s),
      actions = legalActions(i, true, true);
    const n = Math.max(2, Math.min(160, Math.ceil(this.samples / Math.sqrt(Math.max(1, (ranges.length + 1) / 2)))));
    const estimate = estimateMultiplayer(
      i,
      ranges,
      actions,
      seededRng(hashString(JSON.stringify([i.hole, i.board, i.actions, 'multi-street-2']))),
      n,
      undefined,
      {
        opponents: priorResponse,
        forOpponent: (id) => (v) => opponentResponse(v, s, id),
        sizeForOpponent: (id, v, f) => opponentSizing(v, s, id, f),
      },
    );
    const round = new PlanningRound(i),
      best = Math.max(...estimate.values),
      temperature = Math.max(i.bigBlind * 0.5, i.players.reduce((a, p) => a + p.total, 0) * 0.08);
    return {
      actions,
      modelVersion: 'baseline-7',
      source: 'multi-street-lookahead',
      coverage: 'modelled',
      values: estimate.values,
      probabilities: normalize(estimate.values.map((v) => Math.exp(Math.max(-40, (v - best) / temperature)))),
      valueStandardErrors: estimate.standardErrors,
      equity: estimate.equity,
      equityStandardError: estimate.equityStandardError,
      planning: estimate.planning,
      rangeReads: ranges.map((r) => summarizeRange(i, r)),
      calibration: { revision: 'public-behavior-1', samples: n },
      opponentLearning: active.map((p) => ({
        playerId: p.id,
        ...opponentEvidence(
          s,
          p.id,
          continuationView(
            round,
            round.seats.findIndex((q) => q.playerId === p.id),
            [],
          ),
        ),
      })),
      warnings: [
        'Public behavior from completed hands conditions bounded response, range and sizing estimates; uncertainty is heuristic, not a human calibration or solver EV.',
      ],
    };
  }
}

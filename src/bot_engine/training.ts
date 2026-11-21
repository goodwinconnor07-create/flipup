import { evaluateLearning } from './learningBench';
import { LEARNING_CONFIG, type LearningConfig } from './learningConfig';
import { simulate } from './simulation';
import type { ScriptedOpponent } from './scriptedOpponents';
import { hashString } from '../game/cards';
import { CURRENT_STRATEGY_VERSION } from './strategy';

export interface TrainingState {
  protocol: 'river-learning-2';
  nextCycle: number;
  champion: LearningConfig;
  cycles: { cycle: number; config: LearningConfig; trainingGain: number; validationGain: number; accepted: boolean }[];
}
export function initialTrainingState(): TrainingState {
  return { protocol: 'river-learning-2', nextCycle: 0, champion: { ...LEARNING_CONFIG }, cycles: [] };
}
export function learningSeeds(partition: 'training' | 'validation' | 'test' | 'poker-test', cycle: number, count: number): number[] {
  return Array.from({ length: count }, (_, n) => hashString(`river-learning-2:${partition}:${cycle}:${n}`));
}
export function learningCandidates(): LearningConfig[] {
  return [0.92, 0.96, 0.99].flatMap((contextDecay) =>
    [8, 12].flatMap((minimumSamples) =>
      [0.35, 0.5].map((maximumBlend) => ({ ...LEARNING_CONFIG, contextDecay, minimumSamples, maximumBlend })),
    ),
  );
}
export function learningGate(report: ReturnType<typeof evaluateLearning>) {
  const lower = report.descriptiveSessionInterval?.[0];
  return lower !== undefined && lower > 0 && report.recovery && report.scenarios.every((s) => s.gain >= -0.05);
}
/** Training and validation use disjoint, cycle-specific seeds. Frozen test seeds are used only after all cycles. */
export function trainingCycle(state: TrainingState) {
  if (state.protocol !== 'river-learning-2' || !Number.isSafeInteger(state.nextCycle) || state.nextCycle < 0)
    throw new Error('Unsupported training checkpoint');
  const cycle = state.nextCycle;
  const trainingSeeds = learningSeeds('training', cycle, 4);
  const validationSeeds = learningSeeds('validation', cycle, 6);
  const ranking = learningCandidates()
    .map((config) => ({ config, report: evaluateLearning(config, trainingSeeds) }))
    .sort((a, b) => b.report.meanGain - a.report.meanGain);
  const viable = ranking.filter((r) => learningGate(r.report));
  const chosen = viable[0] ?? { config: state.champion, report: evaluateLearning(state.champion, trainingSeeds) };
  const validation = evaluateLearning(chosen.config, validationSeeds);
  const incumbent = evaluateLearning(state.champion, validationSeeds);
  const accepted = viable.length > 0 && learningGate(validation) && validation.meanGain >= incumbent.meanGain;
  const record = { cycle, config: chosen.config, trainingGain: chosen.report.meanGain, validationGain: validation.meanGain, accepted };
  const next: TrainingState = {
    protocol: state.protocol,
    nextCycle: cycle + 1,
    champion: accepted ? chosen.config : state.champion,
    cycles: [...state.cycles, record],
  };
  return {
    next,
    record,
    trainingSeeds,
    validation,
    ranking: ranking.map((r) => ({ config: r.config, trainingGain: r.report.meanGain, passed: learningGate(r.report) })),
  };
}

/** Actual heads-up hands, isolated from the cheap known-payoff learning subgame. */
export function fullPokerLearningCheck(config: LearningConfig, pairs = 40, seed = 70001) {
  const opponents: ScriptedOpponent[] = ['river-overfolder', 'calling-station', 'changing', 'competent'];
  const matchups = opponents.map((opponent) => {
    const run = (mode: 'contextual' | 'pooled') =>
      [false, true].map((reverseSeats) =>
        simulate(pairs, seed, 2, {
          agents: ['bot', opponent],
          pairedDecks: true,
          reverseSeats,
          learningMode: mode,
          learningConfig: config,
        }),
      );
    const candidate = run('contextual'),
      incumbent = run('pooled');
    if (candidate.some((leg, n) => leg.dealChecksums.some((d, k) => d !== incumbent[n].dealChecksums[k])))
      throw new Error('Training comparison deal mismatch');
    const differences = candidate[0].handReturnsBb.map(
      (value, n) => (value + candidate[1].handReturnsBb[n] - incumbent[0].handReturnsBb[n] - incumbent[1].handReturnsBb[n]) / 2,
    );
    const mean = differences.reduce((a, b) => a + b, 0) / pairs;
    const variance = pairs > 1 ? differences.reduce((sum, d) => sum + (d - mean) ** 2, 0) / (pairs - 1) : null;
    const half = variance === null ? null : 196 * Math.sqrt(variance / pairs);
    return {
      opponent,
      hands: pairs * 4,
      dealPairs: pairs,
      deltaBbPer100: mean * 100,
      descriptive95Interval: half === null ? null : [mean * 100 - half, mean * 100 + half],
      candidateP95Ms: candidate.map((l) => l.latencyMs.p95),
      candidateContextCounts: candidate.map((l) => Object.keys(l.memories[0].contexts?.BOT_002 ?? {}).length),
    };
  });
  return {
    seed,
    baselineModel: CURRENT_STRATEGY_VERSION,
    matchups,
    hands: opponents.length * pairs * 4,
    promotionToProduction: false,
    limitation:
      'Small full-game smoke comparison; serial adaptation makes pair-based intervals descriptive. A synthetic-learning gain alone never authorizes automatic production promotion.',
  };
}

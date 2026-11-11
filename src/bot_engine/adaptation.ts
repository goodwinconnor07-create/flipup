import type { BotProfile } from './identity';
import type { InformationSet } from './information';
import { LEARNING_CONFIG, type LearningConfig } from './learningConfig';
import { betSizeBucket, contextKey, type BotMemory } from './memory';
import type { StrategyPrediction } from './strategy';

export interface ExploitEvidence {
  actionIndex: number;
  context: string;
  samples: number;
  posteriorMean: number;
  conservativeFold: number;
  breakEvenFold: number;
  conservativeValue: number;
  confidence: number;
}
export function evaluateAdaptation(
  i: InformationSet,
  prediction: StrategyPrediction,
  memory: BotMemory,
  profile: BotProfile,
  config: LearningConfig = LEARNING_CONFIG,
) {
  const evidence: ExploitEvidence[] = [];
  const logWeights = prediction.actions.map(() => 0);
  const opponents = i.players.filter((p) => p.id !== i.heroId && !p.folded);
  // Start with a narrow, testable exploit: weak river hands against a matched heads-up fold read.
  if (
    i.street !== 'river' ||
    opponents.length !== 1 ||
    opponents[0].allIn ||
    opponents[0].stack <= 0 ||
    prediction.equity === null ||
    prediction.equity > 0.35
  )
    return { evidence, logWeights, blend: 0, target: prediction.actions.map(() => 0), adjustedValues: prediction.values };
  const hero = i.players.find((p) => p.id === i.heroId)!,
    opponent = opponents[0];
  const pot = i.players.reduce((sum, p) => sum + p.total, 0);
  const target = prediction.actions.map(() => 0);
  const adjustedValues = prediction.values ? [...prediction.values] : null;
  prediction.actions.forEach((action, n) => {
    if (action.to === undefined) return;
    const cost = action.to - hero.bet;
    // Avoid extrapolating a broad size bucket to extreme overbets or uncallable investments.
    if (cost <= 0 || cost > pot * 1.25 || cost > opponent.stack + Math.max(0, opponent.bet - hero.bet)) return;
    const call = Math.min(opponent.stack, Math.max(0, action.to - opponent.bet));
    const key = contextKey({ street: i.street, size: betSizeBucket(call, pot + cost), headsUp: true, raised: i.currentBet > 0 });
    const belief = Object.hasOwn(memory.contexts ?? {}, opponent.id) ? memory.contexts![opponent.id][key] : undefined;
    if (!belief || belief.samples < config.minimumSamples) return;
    const total = belief.alpha + belief.beta,
      mean = belief.alpha / total;
    const variance = (belief.alpha * belief.beta) / (total * total * (total + 1));
    const conservative = Math.max(0, mean - config.confidenceZ * Math.sqrt(variance));
    const breakEven = cost / (pot + cost);
    // Worst-case called value: assume a bluff always loses when called.
    const value = conservative * pot - (1 - conservative) * cost;
    const confidence = belief.samples / (belief.samples + config.confidenceSamples);
    if (mean + config.confidenceZ * Math.sqrt(variance) < breakEven) logWeights[n] = -0.8 * confidence * profile.traits.adaptation;
    evidence.push({
      actionIndex: n,
      context: key,
      samples: belief.samples,
      posteriorMean: mean,
      conservativeFold: conservative,
      breakEvenFold: breakEven,
      conservativeValue: value,
      confidence,
    });
    if (conservative <= breakEven + config.profitMargin || value <= 0) return;
    target[n] = value * confidence;
    if (adjustedValues) adjustedValues[n] = Math.max(adjustedValues[n], value);
  });
  const sum = target.reduce((a, b) => a + b, 0);
  const confidence = Math.max(0, ...evidence.filter((e) => target[e.actionIndex] > 0).map((e) => e.confidence));
  return {
    evidence,
    logWeights,
    target: sum ? target.map((p) => p / sum) : target,
    blend: sum ? config.maximumBlend * profile.traits.adaptation * confidence : 0,
    adjustedValues,
  };
}

import { hashString, seededRng } from '../game/cards';
import type { BotMove } from '../game/botPlay';
import { validateProfile, type BotProfile } from './identity';
import { copyInformation, legalActions, type InformationSet } from './information';
import { foldEstimate, type BotMemory } from './memory';
import { BaselineProvider, normalize, type StrategyProvider, type StrategyPrediction } from './strategy';
import { features } from './features';
import { evaluateAdaptation } from './adaptation';
import { LEARNING_CONFIG, validateLearningConfig, type LearningConfig } from './learningConfig';

export interface DecisionTrace {
  version: 1;
  decisionId: string;
  information: InformationSet;
  features: ReturnType<typeof features>;
  profile: BotProfile;
  memory: BotMemory;
  prediction: StrategyPrediction;
  finalDistribution: number[];
  adjustment: { identity: number[]; exploitation: number[] };
  identityPolicyVersion: 'identity-2';
  deviation: { estimatedValueLoss: number | null; budget: number; blend: number };
  samplingSeed: number;
  action: BotMove;
  latencyMs: number;
  adaptation?: {
    mode: 'contextual' | 'pooled' | 'off';
    config: LearningConfig;
    blend: number;
    evidence: ReturnType<typeof evaluateAdaptation>['evidence'];
  };
}
/** Backend service contract. Production must authorize the actor before constructing info. */
export class BotService {
  constructor(
    private provider: StrategyProvider = new BaselineProvider(),
    private learningMode: 'contextual' | 'pooled' | 'off' = 'contextual',
    private learningConfig: LearningConfig = LEARNING_CONFIG,
  ) {
    validateLearningConfig(learningConfig);
  }
  decide(info: InformationSet, profile: BotProfile, memory: BotMemory, samplingSeed: number): DecisionTrace {
    const start = performance.now();
    info = copyInformation(info);
    validateProfile(profile);
    if (
      profile.botId !== info.heroId ||
      memory.botId !== profile.botId ||
      memory.tableId !== info.tableId ||
      !Number.isSafeInteger(samplingSeed)
    )
      throw new Error('Identity mismatch');
    const prediction = structuredClone(this.provider.predict(info));
    const legal = new Set(legalActions(info, true).map((a) => JSON.stringify(a)));
    if (
      !prediction.actions.length ||
      prediction.actions.length !== prediction.probabilities.length ||
      prediction.actions.some((a) => !legal.has(JSON.stringify(a))) ||
      new Set(prediction.actions.map((a) => JSON.stringify(a))).size !== prediction.actions.length
    )
      throw new Error('Provider returned illegal action space');
    prediction.probabilities = normalize(prediction.probabilities);
    const beliefs = info.players
      .filter((p) => p.id !== info.heroId && !p.folded)
      .map((p) => foldEstimate(Object.hasOwn(memory.opponents, p.id) ? memory.opponents[p.id] : undefined));
    // Conservative: evidence-based bluff expansion only heads up; never aggregate pooled reads.
    const read = beliefs.length === 1 ? beliefs[0] : { mean: 0.5, confidence: 0 };
    const stateFeatures = features(info);
    const identity = prediction.actions.map((a) =>
      a.to !== undefined
        ? Math.max(
            -0.8,
            Math.min(
              0.8,
              (profile.traits.aggression - 0.5) * 2.4 - (info.street === 'river' ? (profile.traits.riverCaution - 0.5) * 1.2 : 0),
            ),
          )
        : a.move === 'call'
          ? (profile.traits.curiosity - 0.5) * 2
          : 0,
    );
    const adaptation = evaluateAdaptation(info, prediction, memory, profile, this.learningConfig);
    const exploitation =
      this.learningMode === 'contextual'
        ? adaptation.logWeights
        : prediction.actions.map((a) =>
            this.learningMode === 'pooled' && a.to !== undefined && (prediction.equity ?? 0.5) < 0.5
              ? Math.max(-0.25, Math.min(0.25, (read.mean - 0.5) * read.confidence * profile.traits.adaptation))
              : 0,
          );
    let finalDistribution = normalize(prediction.probabilities.map((p, n) => p * Math.exp(identity[n] + exploitation[n])));
    if (this.learningMode === 'contextual' && adaptation.blend > 0)
      finalDistribution = normalize(finalDistribution.map((p, n) => (1 - adaptation.blend) * p + adaptation.blend * adaptation.target[n]));
    // Observable preferences may move close decisions, but have a bounded estimated chip cost.
    // These are approximate provider values, so this is not a true regret guarantee.
    const budget = Math.max(info.bigBlind * 0.1, stateFeatures.eligiblePotBb * info.bigBlind * 0.02);
    let blend = 1,
      estimatedValueLoss: number | null = null;
    const guardValues = this.learningMode === 'contextual' ? adaptation.adjustedValues : prediction.values;
    if (guardValues) {
      if (guardValues.length !== prediction.actions.length || guardValues.some((v) => !Number.isFinite(v)))
        throw new Error('Invalid provider values');
      const baselineValue = guardValues.reduce((sum, value, n) => sum + value * prediction.probabilities[n], 0);
      const adjustedValue = guardValues.reduce((sum, value, n) => sum + value * finalDistribution[n], 0);
      const loss = Math.max(0, baselineValue - adjustedValue);
      blend = loss > budget ? budget / loss : 1;
      finalDistribution = normalize(finalDistribution.map((p, n) => blend * p + (1 - blend) * prediction.probabilities[n]));
      estimatedValueLoss = loss * blend;
    }
    const rng = seededRng(samplingSeed);
    let draw = rng(),
      selected = finalDistribution.length - 1;
    for (let n = 0; n < finalDistribution.length; n++) {
      draw -= finalDistribution[n];
      if (draw < 0) {
        selected = n;
        break;
      }
    }
    return {
      version: 1,
      decisionId: `${info.tableId}:${info.hand}:${info.sequence}:${profile.botId}`,
      information: structuredClone(info),
      features: stateFeatures,
      profile: structuredClone(profile),
      memory: structuredClone(memory),
      prediction,
      finalDistribution,
      adjustment: { identity, exploitation },
      identityPolicyVersion: 'identity-2',
      deviation: { estimatedValueLoss, budget, blend },
      samplingSeed,
      action: { ...prediction.actions[selected] },
      latencyMs: performance.now() - start,
      adaptation: {
        mode: this.learningMode,
        config: { ...this.learningConfig },
        blend: this.learningMode === 'contextual' ? adaptation.blend : 0,
        evidence: this.learningMode === 'contextual' ? adaptation.evidence : [],
      },
    };
  }
  /** Stable per-decision randomness; a retry cannot resample until it gets a preferred move. */
  seedFor(info: InformationSet, profile: BotProfile): number {
    return hashString(JSON.stringify([profile.seed, info.tableId, info.hand, info.sequence, profile.botId]));
  }
}

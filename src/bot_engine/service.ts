import { hashString, seededRng } from '../game/cards';
import type { BotMove } from '../game/botPlay';
import { validateProfile, type BotProfile } from './identity';
import { copyInformation, legalActions, type InformationSet } from './information';
import { foldEstimate, type BotMemory } from './memory';
import { BaselineProvider, normalize, type StrategyProvider, type StrategyPrediction } from './strategy';
import { features } from './features';
import { evaluateAdaptation } from './adaptation';
import { LEARNING_CONFIG, validateLearningConfig, type LearningConfig } from './learningConfig';
import { personalitySupport, personalityWeights, plausiblePersonalityPolicy } from './personalities';
import { inferRanges } from './ranges';
import { estimateActionValues } from './actionValues';
import { decisionRisk } from './decisionRisk';
import { everydayReference, everydayWeights, everydaySupport } from './everyday';
import { applyHabits } from './habits';
import { applyPotOdds, type PotOddsResult } from './potOdds';
import { handPlanWeights } from './handPlan';
import { behaviorSnapshot } from './behaviorMemory';
import { decisionPhilosophy, describeChoice, applySizingPreferences, sharedUnbeatableBoard } from './philosophy';

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
  identityPolicyVersion: 'identity-2' | 'personality-1' | 'everyday-1';
  deviation: { estimatedValueLoss: number | null; budget: number; blend: number };
  samplingSeed: number;
  action: BotMove;
  latencyMs: number;
  handPlan?: NonNullable<ReturnType<typeof handPlanWeights>>['plan'];
  coherenceWeights?: number[];
  adaptation?: {
    mode: 'contextual' | 'pooled' | 'off';
    config: LearningConfig;
    blend: number;
    evidence: ReturnType<typeof evaluateAdaptation>['evidence'];
  };
  philosophy: ReturnType<typeof decisionPhilosophy>;
  rationale: ReturnType<typeof describeChoice>;
  experienceVersion?: 'human-table-1';
  /** An everyday habit that moved the final distribution (habits.ts), for diagnosis. */
  habit?: string;
  /** The pot-odds check (potOdds.ts): the price, the hand's equity and what it keeps of it, for diagnosis. */
  potOdds?: NonNullable<PotOddsResult['check']> & { note: string | null };
}
/** Backend service contract. Production must authorize the actor before constructing info. */
export class BotService {
  constructor(
    private provider: StrategyProvider = new BaselineProvider(),
    private learningMode: 'contextual' | 'pooled' | 'off' = 'contextual',
    private learningConfig: LearningConfig = LEARNING_CONFIG,
    private options: { experience?: 'human-table-1' } = {},
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
    const prediction = structuredClone(
      this.provider.predict(
        info,
        this.learningMode === 'off'
          ? undefined
          : behaviorSnapshot(
              memory,
              info.hand,
              info.players.filter((p) => p.id !== info.heroId).map((p) => p.id),
            ),
      ),
    );
    const legal = new Set(legalActions(info, true, true).map((a) => JSON.stringify(a)));
    if (
      !prediction.actions.length ||
      prediction.actions.length !== prediction.probabilities.length ||
      prediction.actions.some((a) => !legal.has(JSON.stringify(a))) ||
      new Set(prediction.actions.map((a) => JSON.stringify(a))).size !== prediction.actions.length
    )
      throw new Error('Provider returned illegal action space');
    prediction.probabilities = normalize(prediction.probabilities);
    const liveExperience = this.options.experience === 'human-table-1' && prediction.modelVersion === 'baseline-7';
    if (profile.personality || profile.everyday) prediction.unmodifiedProbabilities = [...prediction.probabilities];
    if ((profile.personality || (profile.everyday && info.street !== 'preflop')) && !prediction.values) {
      const estimate = estimateActionValues(
        info,
        inferRanges(info, 'commitment-aware'),
        prediction.actions,
        seededRng(hashString(JSON.stringify([info.hole, info.board, 'personality-guard']))),
        96,
        true,
      );
      prediction.values = estimate.values;
      prediction.equity = estimate.equity;
      prediction.valueStandardErrors = estimate.standardErrors;
      prediction.warnings.push('Personality guard values are approximate one-round rollouts, not chart EVs.');
    }
    if ((profile.personality || profile.everyday) && prediction.values && !prediction.rolloutValues) {
      prediction.rolloutValues = [...prediction.values];
      prediction.values = decisionRisk(
        info,
        prediction.actions,
        prediction.values,
        prediction.valueStandardErrors ?? prediction.actions.map(() => null),
        prediction.equity ?? 0.5,
      );
      if (prediction.source !== 'shipped-preflop-frequency') {
        const best = Math.max(...prediction.values),
          temperature = Math.max(info.bigBlind * 0.5, features(info).potBb * info.bigBlind * 0.08);
        prediction.probabilities = normalize(prediction.values.map((v) => Math.exp(Math.max(-40, (v - best) / temperature))));
      }
      prediction.warnings.push(
        'Personality policy reserves for large commitments and model uncertainty. Values are heuristic decision scores.',
      );
    }
    if (profile.personality) {
      prediction.probabilities = plausiblePersonalityPolicy(info, prediction, prediction.probabilities, profile);
      prediction.warnings.push(
        'Named-profile reference includes sizing and weak-hand betting priors; deviation budget is relative to that reference.',
      );
    }
    if (profile.everyday) {
      prediction.probabilities = everydayReference(info, prediction, profile);
      prediction.warnings.push('Everyday reference uses authored ranges and restrained tendencies, not human-data calibration.');
    }
    if (liveExperience && sharedUnbeatableBoard(info.board)) {
      prediction.probabilities = normalize(prediction.actions.map((a) => Number(a.move === 'check' || a.move === 'call')));
      prediction.warnings.push('The public board locks a shared best hand; the policy stays in and avoids pointless extra betting.');
    }
    const beliefs = info.players
      .filter((p) => p.id !== info.heroId && !p.folded)
      .map((p) => foldEstimate(Object.hasOwn(memory.opponents, p.id) ? memory.opponents[p.id] : undefined));
    // Conservative: evidence-based bluff expansion only heads up; never aggregate pooled reads.
    const read = beliefs.length === 1 ? beliefs[0] : { mean: 0.5, confidence: 0 };
    const stateFeatures = features(info);
    const identity = profile.everyday
      ? everydayWeights(info, prediction, profile)
      : profile.personality
        ? personalityWeights(info, prediction, profile)
        : prediction.actions.map((a) =>
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
    const guardValues = this.learningMode === 'contextual' ? adaptation.adjustedValues : prediction.values;
    const philosophy = decisionPhilosophy(info, { ...prediction, values: guardValues }, profile, memory, this.learningMode !== 'off');
    const exploitation =
      this.learningMode === 'contextual'
        ? adaptation.logWeights
        : prediction.actions.map((a) =>
            this.learningMode === 'pooled' && a.to !== undefined && (prediction.equity ?? 0.5) < 0.5
              ? Math.max(-0.25, Math.min(0.25, (read.mean - 0.5) * read.confidence * profile.traits.adaptation))
              : 0,
          );
    const support = profile.everyday
      ? everydaySupport(info, prediction, profile)
      : profile.personality
        ? personalitySupport(info, prediction)
        : prediction.probabilities;
    const coherence = prediction.modelVersion === 'baseline-7' ? handPlanWeights(info, prediction, profile) : null;
    let finalDistribution = normalize(
      support.map(
        (p, n) =>
          p *
          Math.exp(
            identity[n] + exploitation[n] + (coherence?.logWeights[n] ?? 0) + (liveExperience ? philosophy.actions[n].preference : 0),
          ),
      ),
    );
    if (this.learningMode === 'contextual' && adaptation.blend > 0)
      finalDistribution = normalize(finalDistribution.map((p, n) => (1 - adaptation.blend) * p + adaptation.blend * adaptation.target[n]));
    if (profile.personality) finalDistribution = plausiblePersonalityPolicy(info, prediction, finalDistribution, profile);
    if (profile.everyday && info.street !== 'preflop')
      finalDistribution = everydayReference(info, { ...prediction, probabilities: finalDistribution }, profile);
    if (liveExperience) finalDistribution = applySizingPreferences(finalDistribution, philosophy);
    // Observable preferences may move close decisions, but have a bounded estimated chip cost.
    // These are approximate provider values, so this is not a true regret guarantee.
    const budget = profile.everyday
      ? Math.min(
          info.bigBlind,
          Math.max(
            info.bigBlind * (profile.everyday.difficulty === 'challenge' ? 0.12 : 0.25),
            stateFeatures.eligiblePotBb * info.bigBlind * 0.025,
          ),
        )
      : profile.personality
        ? Math.min(info.bigBlind * 2, Math.max(info.bigBlind * 0.35, stateFeatures.eligiblePotBb * info.bigBlind * 0.06))
        : Math.max(info.bigBlind * 0.1, stateFeatures.eligiblePotBb * info.bigBlind * 0.02);
    let blend = 1,
      estimatedValueLoss: number | null = null;
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
    if (liveExperience && guardValues) {
      const supported = finalDistribution.map((p, k) => (philosophy.actions[k].plausible ? p : 0));
      if (supported.some((p) => p > 0)) finalDistribution = normalize(supported);
      else throw new Error('No philosophy-supported decision');
      const baselineValue = guardValues.reduce((s, v, k) => s + v * prediction.probabilities[k], 0);
      estimatedValueLoss = Math.max(0, baselineValue - guardValues.reduce((s, v, k) => s + v * finalDistribution[k], 0));
      if (estimatedValueLoss > budget + 1e-7) throw new Error('Philosophy support exceeded decision budget');
    }
    // Everyday habits (bets when checked to, pairs that call a small bet): see habits.ts. Challenge gets half of it.
    let habit: string | null = null;
    if (profile.everyday && info.street !== 'preflop') {
      const result = applyHabits(info, prediction.actions, finalDistribution, {
        strength: profile.everyday.difficulty === 'challenge' ? 0.5 : 1,
        inPosition: stateFeatures.inPosition,
        lift: profile.everyday.lift ?? 0,
        foldRead: read,
        values: guardValues,
      });
      finalDistribution = result.distribution;
      habit = result.note;
    }
    // Last word on a fold: a hand that clears the price with room to spare calls (see potOdds.ts).
    let potOdds: DecisionTrace['potOdds'];
    if (profile.everyday && info.street !== 'preflop') {
      const result = applyPotOdds(info, prediction.actions, finalDistribution);
      finalDistribution = result.distribution;
      if (result.check) potOdds = { ...result.check, note: result.note };
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
      identityPolicyVersion: profile.everyday ? 'everyday-1' : profile.personality ? 'personality-1' : 'identity-2',
      deviation: { estimatedValueLoss, budget, blend },
      samplingSeed,
      action: { ...prediction.actions[selected] },
      philosophy,
      rationale: describeChoice(
        philosophy,
        selected,
        philosophy.actions[selected].plausible && finalDistribution.filter((p) => p > 1e-9).length > 1,
        finalDistribution,
      ),
      ...(liveExperience ? { experienceVersion: 'human-table-1' as const } : {}),
      ...(habit ? { habit } : {}),
      ...(potOdds ? { potOdds } : {}),
      latencyMs: performance.now() - start,
      ...(coherence ? { handPlan: coherence.plan, coherenceWeights: coherence.logWeights } : {}),
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

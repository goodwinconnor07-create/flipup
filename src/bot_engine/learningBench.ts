import { seededRng } from '../game/cards';
import { BOT_001 } from './identity';
import type { InformationSet } from './information';
import { LEARNING_CONFIG, type LearningConfig } from './learningConfig';
import { emptyMemory, observe, contextKey } from './memory';
import { BotService } from './service';
import type { StrategyPrediction } from './strategy';

export const LEARNING_SCENARIOS = ['overfolder', 'station', 'balanced', 'switching', 'conflicting-context'] as const;
export type LearningScenario = (typeof LEARNING_SCENARIOS)[number];

/** Forced-loss river bluff subgame: exact fold/call payoffs, not full Hold'em strength evaluation. */
export function riverLearningFixture(): InformationSet {
  return {
    version: 1,
    variant: 'holdem',
    tableId: 'learning-bench',
    hand: 1,
    sequence: 0,
    heroId: 'BOT_001',
    buttonId: 'BOT_001',
    street: 'river',
    bigBlind: 10,
    smallBlind: 5,
    currentBet: 0,
    hole: ['2s', '3h'],
    board: ['As', 'Kd', 'Qc', 'Jh', '9d'],
    players: [
      { id: 'BOT_001', seat: 0, stack: 1000, bet: 0, total: 50, folded: false, allIn: false },
      { id: 'opponent', seat: 1, stack: 1000, bet: 0, total: 50, folded: false, allIn: false },
    ],
    actions: [],
    legal: {
      toCall: 0,
      canCheck: true,
      callIsAllIn: false,
      canRaise: true,
      minTo: 10,
      maxTo: 1000,
      word: 'Bet',
      canFold: true,
      canHit: false,
    },
  };
}
export function learningPrediction(): StrategyPrediction {
  return {
    actions: [{ move: 'check' }, { move: 'bet', to: 75 }],
    probabilities: [0.98, 0.02],
    values: [0, -75],
    source: 'range-equity-fallback',
    coverage: 'fallback',
    modelVersion: 'baseline-3',
    equity: 0,
    equityStandardError: 0,
    warnings: [
      'Synthetic forced-loss bluff subgame. Public probes supply observations independently of the chosen policy. Not a full-poker benchmark.',
    ],
  };
}

export function learningSession(
  scenario: LearningScenario,
  seed: number,
  config: LearningConfig = LEARNING_CONFIG,
  mode: 'contextual' | 'pooled' | 'off' = 'contextual',
  phaseLength = 120,
) {
  const info = riverLearningFixture(),
    memory = emptyMemory(info.heroId, info.tableId);
  const provider = { predict: () => learningPrediction() };
  const service = new BotService(provider, mode, config),
    rng = seededRng(seed);
  const regimes = scenario === 'switching' ? [0.9, 0.1, 0.9] : [scenario === 'overfolder' ? 0.9 : scenario === 'balanced' ? 75 / 175 : 0.1];
  let sequence = 0;
  const phases = regimes.map((foldProbability, phase) => {
    const probabilities: number[] = [],
      expectedValues: number[] = [],
      blends: number[] = [];
    for (let n = 0; n < phaseLength; n++) {
      info.hand++;
      const trace = service.decide(info, BOT_001, memory, seed + info.hand);
      const bluff = trace.finalDistribution[1];
      probabilities.push(bluff);
      expectedValues.push(bluff * (foldProbability * 100 - (1 - foldProbability) * 75));
      blends.push(trace.adaptation?.blend ?? 0);
      // A public observed response in the matching context; no hidden cards are observed.
      observe(
        memory,
        {
          observerId: info.heroId,
          targetId: 'opponent',
          tableId: info.tableId,
          sequence: ++sequence,
          foldedToBet: rng() < foldProbability,
          context: { street: 'river', size: 'medium', headsUp: true },
        },
        config,
      );
      if (scenario === 'conflicting-context')
        for (let extra = 0; extra < 3; extra++)
          observe(
            memory,
            {
              observerId: info.heroId,
              targetId: 'opponent',
              tableId: info.tableId,
              sequence: ++sequence,
              foldedToBet: rng() < 0.95,
              context: { street: 'preflop', size: 'small', headsUp: true },
            },
            config,
          );
    }
    const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
    const key = contextKey({ street: 'river', size: 'medium', headsUp: true });
    const posterior = memory.contexts?.opponent?.[key];
    return {
      phase,
      foldProbability,
      observations: phaseLength,
      meanBluff: mean(probabilities),
      tailBluff: mean(probabilities.slice(-40)),
      expectedChipsPerOpportunity: mean(expectedValues),
      activeExploitShare: blends.filter((b) => b > 0).length / phaseLength,
      correctionOpportunities:
        mode === 'contextual' && phase > 0 && regimes[phase - 1] > 0.8 && foldProbability < 0.2
          ? blends.findIndex((b) => b === 0) < 0
            ? phaseLength + 1
            : blends.findIndex((b) => b === 0)
          : null,
      posteriorFold: posterior ? posterior.alpha / (posterior.alpha + posterior.beta) : null,
    };
  });
  return {
    scenario,
    seed,
    mode,
    phases,
    expectedChipsPerOpportunity: phases.reduce((sum, p) => sum + p.expectedChipsPerOpportunity, 0) / phases.length,
  };
}

export function evaluateLearning(config: LearningConfig, seeds: readonly number[], phaseLength = 120) {
  const sessions = seeds.map((seed) => {
    const scenarios = LEARNING_SCENARIOS.map((scenario) => {
      const candidate = learningSession(scenario, seed, config, 'contextual', phaseLength);
      const incumbent = learningSession(scenario, seed, config, 'pooled', phaseLength);
      return { scenario, candidate, incumbent, gain: candidate.expectedChipsPerOpportunity - incumbent.expectedChipsPerOpportunity };
    });
    return { seed, scenarios, gain: scenarios.reduce((sum, s) => sum + s.gain, 0) / scenarios.length };
  });
  const gains = sessions.map((s) => s.gain),
    mean = gains.reduce((a, b) => a + b, 0) / gains.length;
  const variance = gains.length > 1 ? gains.reduce((sum, g) => sum + (g - mean) ** 2, 0) / (gains.length - 1) : null;
  // Conservative small-sample multiplier; seeds/sessions, not individual public probes, are the unit.
  const half = variance === null ? null : 3.2 * Math.sqrt(variance / gains.length);
  const scenarios = LEARNING_SCENARIOS.map((scenario) => {
    const rows = sessions.map((s) => s.scenarios.find((row) => row.scenario === scenario)!);
    return {
      scenario,
      gain: rows.reduce((sum, r) => sum + r.gain, 0) / rows.length,
      meanCandidateChips: rows.reduce((sum, r) => sum + r.candidate.expectedChipsPerOpportunity, 0) / rows.length,
    };
  });
  const recovery = sessions.every((s) => {
    const phases = s.scenarios.find((r) => r.scenario === 'switching')!.candidate.phases;
    return (
      phases[1].tailBluff < phases[0].tailBluff &&
      phases[2].tailBluff > phases[1].tailBluff &&
      (phases[1].correctionOpportunities ?? Infinity) <= 32
    );
  });
  return {
    seeds: [...seeds],
    observationsPerPhase: phaseLength,
    meanGain: mean,
    descriptiveSessionInterval: half === null ? null : [mean - half, mean + half],
    scenarios,
    recovery,
    sessions,
    limitation:
      'Known-payoff synthetic river subgame with exogenous public probes. This tests learning and response reversal, not full Hold’em profitability or calibrated confidence.',
  };
}

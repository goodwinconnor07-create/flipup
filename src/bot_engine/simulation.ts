import { hashString, seededRng } from '../game/cards';
import { createTable, DEFAULT_SETTINGS } from '../game/reducer';
import { dealNextStreet, makeMove, runoutStep, showdown, startHand } from '../game/holdem';
import { informationFor } from './information';
import { BotFactory } from './identity';
import { emptyMemory, observe } from './memory';
import { BotService, type DecisionTrace } from './service';
import { BaselineProvider, type StrategyPrediction } from './strategy';
import { scriptedMove, type AgentKind, SCRIPTED_OPPONENTS } from './scriptedOpponents';
import { LEARNING_CONFIG, type LearningConfig } from './learningConfig';
import { publicResponses } from './observations';
import { withPersonality, type PersonalityId } from './personalities';
import { preflopContext } from './preflopContext';
import { handBucket } from '../game/handBucket';
import { everydayProfile, EVERYDAY_FOCUSES, type BotDifficulty, type EverydayFocus } from './everyday';
import { CalibratedProvider, type CalibrationMode } from './calibratedProvider';
import type { BotMove } from '../game/botPlay';
import type { InformationSet } from './information';
import { EverydayProvider } from './everydayProvider';

export interface SimulationOptions {
  agents?: AgentKind[];
  reverseSeats?: boolean;
  pairedDecks?: boolean;
  learningMode?: 'contextual' | 'pooled' | 'off';
  learningConfig?: LearningConfig;
  personality?: PersonalityId;
  startingStacksBb?: number[];
  carryStacks?: boolean;
  revision?: 'baseline-4' | 'baseline-5' | 'baseline-6' | 'baseline-7';
  /** Offline candidate; the production default remains V7. */
  calibrated?: boolean | CalibrationMode;
  /** Observers receive independent copies of only this actor's whitelisted information. */
  onAction?: (info: InformationSet, action: BotMove) => void;
  onDecision?: (trace: DecisionTrace) => void;
  everyday?: BotDifficulty;
  everydayFocus?: EverydayFocus;
}

/** Uses production rules; independently seeded policy and dealing streams. No illegal-action fallback. */
export function simulate(hands = 20, seed = 7, seats = 2, config: SimulationOptions = {}) {
  if (!Number.isSafeInteger(hands) || hands < 1) throw new Error('Invalid hand count');
  if (!Number.isSafeInteger(seats) || seats < 2 || seats > 9) throw new Error('Invalid seat count');
  const agents = config.agents ?? Array<AgentKind>(seats).fill('bot');
  const starting = (config.startingStacksBb ?? Array<number>(seats).fill(100)).map((v) => v * 10);
  if (starting.length !== seats || starting.some((v) => !Number.isSafeInteger(v) || v < 10 || v > 1e8))
    throw new Error('Invalid starting stacks');
  if (agents.length !== seats || agents.some((a) => !['bot', 'baseline', 'previous', 'incumbent', ...SCRIPTED_OPPONENTS].includes(a)))
    throw new Error('Invalid agents');
  const dealing = seededRng(seed);
  const ctx = { now: 0, deviceId: 'simulation', rng: dealing };
  const game = createTable({
    hostDeviceId: ctx.deviceId,
    name: 'Research',
    emoji: '🃏',
    settings: { ...DEFAULT_SETTINGS, startingStack: 1000, smallBlind: 5, bigBlind: 10, rebuys: true },
    bots: seats - 1,
    code: null,
    now: 0,
    rng: seededRng(seed + 1),
  });
  game.id = `simulation-${seed}`;
  // Keep both as human seats so the engine does not automatically run its legacy bots.
  game.players.forEach((p, n) => {
    p.id = `BOT_${String(n + 1).padStart(3, '0')}`;
    p.bot = false;
    p.deviceId = `simulation-${n}`;
    if (config.reverseSeats) p.seat = seats - 1 - n;
  });
  const factory = new BotFactory();
  const profiles = game.players.map((p, n) => {
    const profile = factory.generate(p.id, 1001 + n);
    if (config.everyday)
      return everydayProfile(
        profile,
        `Everyday ${n}`,
        config.everyday,
        n === 0 ? (config.everydayFocus ?? 'balanced') : EVERYDAY_FOCUSES[n % 4],
      );
    return n === 0 && config.personality ? withPersonality(profile, config.personality) : profile;
  });
  const memories = profiles.map((p) => emptyMemory(p.botId, game.id));
  const service = new BotService(
    config.calibrated
      ? new CalibratedProvider(config.everyday === 'challenge' ? 160 : 96, config.calibrated === true ? 'combined' : config.calibrated)
      : config.everyday
        ? new EverydayProvider(
            config.everyday === 'casual' ? 96 : 160,
            config.revision === 'baseline-5' ? 'baseline-5' : config.revision === 'baseline-6' ? 'baseline-6' : 'baseline-7',
          )
        : new BaselineProvider(160, config.revision),
    config.learningMode ?? 'contextual',
    config.learningConfig ?? LEARNING_CONFIG,
  );
  const previous = new BotService(new BaselineProvider(160, 'baseline-2'), 'pooled');
  const incumbent = new BotService(
    new BaselineProvider(160, 'baseline-3'),
    config.learningMode ?? 'contextual',
    config.learningConfig ?? LEARNING_CONFIG,
  );
  const baseline = new BaselineProvider();
  const latencies: number[] = [];
  const returns: number[] = [];
  const dealChecksums: number[] = [];
  const actionCounts = { fold: 0, check: 0, call: 0, bet: 0, raise: 0, allin: 0 };
  const preflopCoverage = {
    decisions: 0,
    chartDecisions: 0,
    modelledDecisions: 0,
    unequalStackDecisions: 0,
    coldCallDecisions: 0,
    spots: {} as Record<string, number>,
    fallbackReasons: {} as Record<string, number>,
  };
  const recordCoverage = (prediction: StrategyPrediction) => {
    preflopCoverage.decisions++;
    if (prediction.source === 'shipped-preflop-frequency') {
      preflopCoverage.chartDecisions++;
      const key = prediction.preflop?.matched ? `${prediction.preflop.bank}:${prediction.preflop.spot}` : 'legacy-rfi';
      preflopCoverage.spots[key] = (preflopCoverage.spots[key] ?? 0) + 1;
    } else {
      if (prediction.coverage === 'modelled') preflopCoverage.modelledDecisions++;
      if (prediction.preflopContext?.unequalStacks) preflopCoverage.unequalStackDecisions++;
      if (prediction.preflopContext?.coldCall) preflopCoverage.coldCallDecisions++;
      const reason = prediction.preflop?.matched === false ? prediction.preflop.reason : 'legacy-fallback';
      preflopCoverage.fallbackReasons[reason] = (preflopCoverage.fallbackReasons[reason] ?? 0) + 1;
    }
  };
  const postflopCoverage = {
    decisions: 0,
    plannedDecisions: 0,
    rangeAnalysedDecisions: 0,
    flopPlans: 0,
    turnPlans: 0,
    multiwayPlans: 0,
    allInOpponentModels: 0,
    riverModels: 0,
    fallbackReasons: {} as Record<string, number>,
  };
  const recordPostflop = (prediction: StrategyPrediction, street: string) => {
    postflopCoverage.decisions++;
    if (prediction.rangeReads?.length) postflopCoverage.rangeAnalysedDecisions++;
    if (prediction.planning) {
      postflopCoverage.plannedDecisions++;
      if (street === 'flop') postflopCoverage.flopPlans++;
      if (street === 'turn') postflopCoverage.turnPlans++;
      if (street === 'river') postflopCoverage.riverModels++;
      if (prediction.planning.version === 'multi-street-2') {
        if (prediction.planning.opponents > 1) postflopCoverage.multiwayPlans++;
        if (prediction.planning.opponents > prediction.planning.activeOpponents) postflopCoverage.allInOpponentModels++;
      }
    } else {
      const reason = prediction.planningFallback ?? 'historical-model';
      postflopCoverage.fallbackReasons[reason] = (postflopCoverage.fallbackReasons[reason] ?? 0) + 1;
    }
  };
  const behavior = {
    hands: 0,
    vpipHands: 0,
    pfrHands: 0,
    threeBetOpportunities: 0,
    threeBets: 0,
    postflopDecisions: 0,
    postflopAggressions: 0,
    foldOpportunities: 0,
    folds: 0,
    drawCallOpportunities: 0,
    drawCalls: 0,
    riverCallOpportunities: 0,
    riverCalls: 0,
    weakBetOpportunities: 0,
    weakBets: 0,
    betSizeSum: 0,
    betSizes: 0,
  };
  const tableExperience = { hands: 0, flops: 0, walks: 0, raisedPots: 0, preflopAllIns: 0 };
  let decisions = 0,
    eventSequence = 0;
  for (let handNo = 0; handNo < hands; handNo++) {
    // Independent cash hands at the same stack, retaining identity and memory.
    game.players.forEach((p, k) => {
      if (!config.carryStacks || handNo === 0 || p.stack === 0) p.stack = starting[k];
    });
    const heroStart = game.players[0].stack,
      bankroll = game.players.reduce((s, p) => s + p.stack, 0);
    let vpip = false,
      pfr = false;
    game.status = 'playing';
    if (config.pairedDecks) ctx.rng = seededRng(hashString(`${seed}:${handNo}:deck`));
    startHand(game, ctx);
    // Evaluator-only digest lets paired experiments verify identical physical seat deals.
    // It is never sent to an agent or included in a decision trace.
    dealChecksums.push(hashString(JSON.stringify([game.buttonSeat, game.hand!.seats.map((s) => s.cards), game.hand!.deck])));
    if (config.pairedDecks) ctx.rng = seededRng(hashString(`${seed}:${handNo}:table-effects`));
    let steps = 0;
    while (!game.hand?.result && steps++ < 200) {
      const h = game.hand!;
      ctx.now += 10000;
      if (h.runout) {
        runoutStep(game, ctx);
        continue;
      }
      if (h.showdownAt) {
        showdown(game, ctx);
        continue;
      }
      if (!h.toAct) {
        dealNextStreet(game, ctx);
        continue;
      }
      const at = profiles.findIndex((p) => p.botId === h.toAct);
      const info = informationFor(game, h.toAct);
      const started = performance.now();
      const agent = agents[at];
      let capturedTrace: DecisionTrace | undefined;
      const sampling = seededRng(service.seedFor(info, profiles[at]));
      const action =
        agent === 'bot' || agent === 'previous' || agent === 'incumbent'
          ? (() => {
              const trace = (agent === 'previous' ? previous : agent === 'incumbent' ? incumbent : service).decide(
                info,
                profiles[at],
                memories[at],
                service.seedFor(info, profiles[at]),
              );
              if (at === 0 && info.street === 'preflop') recordCoverage(trace.prediction);
              if (at === 0 && info.street !== 'preflop') recordPostflop(trace.prediction, info.street);
              if (at === 0 && config.onDecision) capturedTrace = trace;
              return trace.action;
            })()
          : agent === 'baseline'
            ? (() => {
                const prediction = baseline.predict(info);
                if (at === 0 && info.street === 'preflop') recordCoverage(prediction);
                if (at === 0 && info.street !== 'preflop') recordPostflop(prediction, info.street);
                let draw = sampling();
                return prediction.actions[
                  prediction.probabilities.findIndex((p, n) => {
                    draw -= p;
                    return draw < 0 || n === prediction.actions.length - 1;
                  })
                ];
              })()
            : scriptedMove(info, agent, sampling, handNo >= hands / 2);
      if (at === 0) {
        actionCounts[action.move]++;
        const aggressive = action.to !== undefined;
        if (info.street === 'preflop') {
          if (action.move === 'call' || aggressive) vpip = true;
          if (aggressive) pfr = true;
          const context = preflopContext(info);
          if (context.raiseCount === 1 && context.lastRaiser !== info.heroId && info.legal.canRaise) {
            behavior.threeBetOpportunities++;
            if (aggressive) behavior.threeBets++;
          }
        } else {
          behavior.postflopDecisions++;
          if (aggressive) behavior.postflopAggressions++;
          const bucket = handBucket(info.hole, info.board);
          if (info.legal.canRaise && (bucket === 'air' || bucket === 'weak')) {
            behavior.weakBetOpportunities++;
            if (aggressive) behavior.weakBets++;
          }
          if (!info.legal.canCheck && bucket === 'draw') {
            behavior.drawCallOpportunities++;
            if (action.move === 'call') behavior.drawCalls++;
          }
          if (!info.legal.canCheck && info.street === 'river') {
            behavior.riverCallOpportunities++;
            if (action.move === 'call') behavior.riverCalls++;
          }
          if (aggressive) {
            const hero = info.players.find((p) => p.id === info.heroId)!;
            behavior.betSizeSum +=
              (action.to! - hero.bet - info.legal.toCall) /
              Math.max(info.bigBlind, info.players.reduce((s, p) => s + p.total, 0) + info.legal.toCall);
            behavior.betSizes++;
          }
        }
        if (!info.legal.canCheck) {
          behavior.foldOpportunities++;
          if (action.move === 'fold') behavior.folds++;
        }
      }
      const elapsed = performance.now() - started;
      if (capturedTrace && config.onDecision) config.onDecision(structuredClone(capturedTrace));
      if (config.onAction) config.onAction(structuredClone(info), { ...action });
      const error = makeMove(game, action.move, action.to, ctx);
      if (error) throw new Error(`Illegal bot action: ${error}`);
      if (!info.legal.canCheck) {
        const context = publicResponses({
          actions: h.actions ?? [],
          playerIds: h.seats.map((s) => s.playerId),
          sbId: h.sbId,
          bbId: h.bbId,
          smallBlind: game.settings.smallBlind,
          bigBlind: game.settings.bigBlind,
          startStacks: h.startStacks,
        }).at(-1)!.context;
        for (const memory of memories)
          if (memory.botId !== info.heroId)
            observe(
              memory,
              {
                observerId: memory.botId,
                targetId: info.heroId,
                tableId: game.id,
                sequence: ++eventSequence,
                foldedToBet: action.move === 'fold',
                context,
              },
              config.learningConfig ?? LEARNING_CONFIG,
            );
      }
      if (agent === 'bot' || agent === 'baseline' || agent === 'previous' || agent === 'incumbent') latencies.push(elapsed);
      decisions++;
    }
    if (!game.hand?.result) throw new Error('Hand did not finish');
    const preflop = (game.hand.actions ?? []).filter((a) => a.street === 'preflop');
    const raised = preflop.some((a) => a.move === 'raise' || a.move === 'bet' || (a.move === 'allin' && a.to > game.settings.bigBlind));
    tableExperience.hands++;
    if (game.hand.board.length) tableExperience.flops++;
    if (raised) tableExperience.raisedPots++;
    if (!raised && !game.hand.board.length) tableExperience.walks++;
    if (preflop.some((a) => a.move === 'allin')) tableExperience.preflopAllIns++;
    if (game.players.reduce((sum, p) => sum + p.stack, 0) !== bankroll) throw new Error('Chip conservation failed');
    behavior.hands++;
    if (vpip) behavior.vpipHands++;
    if (pfr) behavior.pfrHands++;
    returns.push((game.players[0].stack - heroStart) / 10);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / hands;
  const variance = hands > 1 ? returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (hands - 1) : 0;
  latencies.sort((a, b) => a - b);
  return {
    hands,
    decisions,
    seed,
    seats,
    agents,
    actionCounts,
    preflopCoverage,
    postflopCoverage,
    behavior,
    tableExperience,
    handReturnsBb: returns,
    dealChecksums,
    bbPer100: mean * 100,
    approximate95CI: hands > 1 ? [mean * 100 - 196 * Math.sqrt(variance / hands), mean * 100 + 196 * Math.sqrt(variance / hands)] : null,
    latencyMs: {
      p50: latencies[Math.floor(latencies.length * 0.5)],
      p95: latencies[Math.floor(latencies.length * 0.95)],
      max: latencies.at(-1),
    },
    memories,
    warnings: [
      'Normal CI is descriptive and unreliable for small samples. Opponents are uncalibrated; this is not evidence of human realism.',
    ],
  };
}

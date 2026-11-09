import { hashString, seededRng } from '../game/cards';
import { createTable, DEFAULT_SETTINGS } from '../game/reducer';
import { dealNextStreet, makeMove, runoutStep, showdown, startHand } from '../game/holdem';
import { informationFor } from './information';
import { BotFactory } from './identity';
import { emptyMemory, observe } from './memory';
import { BotService } from './service';
import { BaselineProvider, type StrategyPrediction } from './strategy';
import { scriptedMove, type AgentKind, SCRIPTED_OPPONENTS } from './scriptedOpponents';
import { LEARNING_CONFIG, type LearningConfig } from './learningConfig';
import { publicResponses } from './observations';

export interface SimulationOptions {
  agents?: AgentKind[];
  reverseSeats?: boolean;
  pairedDecks?: boolean;
  learningMode?: 'contextual' | 'pooled' | 'off';
  learningConfig?: LearningConfig;
}

/** Uses production rules; independently seeded policy and dealing streams. No illegal-action fallback. */
export function simulate(hands = 20, seed = 7, seats = 2, config: SimulationOptions = {}) {
  if (!Number.isSafeInteger(hands) || hands < 1) throw new Error('Invalid hand count');
  if (!Number.isSafeInteger(seats) || seats < 2 || seats > 9) throw new Error('Invalid seat count');
  const agents = config.agents ?? Array<AgentKind>(seats).fill('bot');
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
  const profiles = game.players.map((p, n) => factory.generate(p.id, 1001 + n));
  const memories = profiles.map((p) => emptyMemory(p.botId, game.id));
  const service = new BotService(new BaselineProvider(), config.learningMode ?? 'contextual', config.learningConfig ?? LEARNING_CONFIG);
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
      const reason = prediction.preflop?.matched === false ? prediction.preflop.reason : 'legacy-fallback';
      preflopCoverage.fallbackReasons[reason] = (preflopCoverage.fallbackReasons[reason] ?? 0) + 1;
    }
  };
  let decisions = 0,
    eventSequence = 0;
  for (let handNo = 0; handNo < hands; handNo++) {
    // Independent cash hands at the same stack, retaining identity and memory.
    game.players.forEach((p) => {
      p.stack = 1000;
    });
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
              return trace.action;
            })()
          : agent === 'baseline'
            ? (() => {
                const prediction = baseline.predict(info);
                if (at === 0 && info.street === 'preflop') recordCoverage(prediction);
                let draw = sampling();
                return prediction.actions[
                  prediction.probabilities.findIndex((p, n) => {
                    draw -= p;
                    return draw < 0 || n === prediction.actions.length - 1;
                  })
                ];
              })()
            : scriptedMove(info, agent, sampling, handNo >= hands / 2);
      if (at === 0) actionCounts[action.move]++;
      const elapsed = performance.now() - started;
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
    if (game.players.reduce((sum, p) => sum + p.stack, 0) !== seats * 1000) throw new Error('Chip conservation failed');
    returns.push((game.players[0].stack - 1000) / 10);
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

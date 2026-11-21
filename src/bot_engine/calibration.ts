import { hashString, seededRng } from '../game/cards';
import { createTable, DEFAULT_SETTINGS } from '../game/reducer';
import { dealNextStreet, makeMove, startHand } from '../game/holdem';
import { informationFor, type InformationSet } from './information';
import { BotFactory, type BotProfile } from './identity';
import { emptyMemory, observe, betSizeBucket, contextKey, type ObservationContext } from './memory';
import { BaselineProvider } from './strategy';
import { BotService } from './service';

/** Production-engine states, saved only after projection through the legal information boundary. */
export function calibrationContexts(): InformationSet[] {
  const contexts: InformationSet[] = [];
  for (const seed of [3, 13, 23, 33]) {
    const rng = seededRng(seed),
      ctx = { now: 0, deviceId: 'calibration', rng };
    const game = createTable({
      hostDeviceId: ctx.deviceId,
      name: 'Calibration',
      emoji: '🃏',
      settings: DEFAULT_SETTINGS,
      bots: 1,
      code: null,
      now: 0,
      rng,
    });
    game.id = `calibration-${seed}`;
    game.players.forEach((p, n) => {
      p.id = `seat-${n}`;
      p.bot = false;
    });
    startHand(game, ctx);
    for (let step = 0; !game.hand!.result && step < 32; step++) {
      ctx.now += 10000;
      if (!game.hand!.toAct) {
        dealNextStreet(game, ctx);
        continue;
      }
      const info = informationFor(game, game.hand!.toAct!);
      contexts.push(info);
      // A small deterministic betting line provides both facing-bet and checked-to contexts.
      const raise =
        info.legal.canRaise &&
        game.hand!.actions!.filter((a) => a.street === info.street && (a.move === 'bet' || a.move === 'raise')).length === 0;
      const error = makeMove(
        game,
        raise ? (info.currentBet ? 'raise' : 'bet') : info.legal.canCheck ? 'check' : 'call',
        raise ? info.legal.minTo : undefined,
        ctx,
      );
      if (error) throw new Error(`Invalid calibration line: ${error}`);
    }
    if (!game.hand!.result) throw new Error('Calibration hand did not finish');
  }
  return contexts;
}

export function policyDistance(a: number[][], b: number[][]): number {
  if (a.length !== b.length || !a.length || a.some((p, n) => p.length !== b[n].length))
    throw new Error('Incompatible calibration signatures');
  return a.reduce((sum, p, n) => sum + p.reduce((s, value, k) => s + Math.abs(value - b[n][k]), 0) / 2, 0) / a.length;
}

/** Synthetic policy-battery calibration. It does not certify skill or human representativeness. */
export function calibratePopulation(count = 20, seed = 1001, minimumDistance = 0.005, maxAttempts = count * 100) {
  if (
    !Number.isSafeInteger(count) ||
    count < 1 ||
    count > 100 ||
    !Number.isSafeInteger(maxAttempts) ||
    maxAttempts < count ||
    !Number.isFinite(minimumDistance) ||
    minimumDistance < 0 ||
    minimumDistance > 1
  )
    throw new Error('Invalid calibration settings');
  const contexts = calibrationContexts();
  const provider = new BaselineProvider();
  const predictions = contexts.map((i) => provider.predict(i));
  const factory = new BotFactory();
  const accepted: {
    profile: BotProfile;
    signature: number[][];
    sampledActionFrequencies: Record<string, number>;
    nearestPolicyDistance: number | null;
  }[] = [];
  let attempts = 0;
  for (; attempts < maxAttempts && accepted.length < count; attempts++) {
    const profile = factory.generate(`BOT_${String(accepted.length + 1).padStart(3, '0')}`, seed + attempts);
    const signature: number[][] = [];
    const counts: Record<string, number> = { fold: 0, check: 0, call: 0, bet: 0, raise: 0 };
    contexts.forEach((context, n) => {
      const original = context.heroId;
      const info = {
        ...context,
        heroId: profile.botId,
        players: context.players.map((p) => ({ ...p, id: p.id === original ? profile.botId : p.id })),
        actions: context.actions.map((a) => ({ ...a, playerId: a.playerId === original ? profile.botId : a.playerId })),
        buttonId: context.buttonId === original ? profile.botId : context.buttonId,
      };
      const memory = emptyMemory(profile.botId, info.tableId);
      // Half the battery tests a controlled, high-confidence overfold read. No other bot state is used.
      const opponent = info.players.find((p) => p.id !== profile.botId)!;
      const hero = info.players.find((p) => p.id === profile.botId)!;
      const pot = info.players.reduce((sum, p) => sum + p.total, 0);
      const contexts = new Map<string, ObservationContext>();
      for (const action of predictions[n].actions)
        if (action.to !== undefined) {
          const context: ObservationContext = {
            street: info.street,
            size: betSizeBucket(Math.min(opponent.stack, Math.max(0, action.to - opponent.bet)), pot + action.to - hero.bet),
            headsUp: true,
            raised: info.currentBet > 0,
          };
          contexts.set(contextKey(context), context);
        }
      let sequence = 0;
      if (n % 2)
        for (const context of contexts.values())
          for (let seq = 0; seq < 80; seq++)
            observe(memory, {
              observerId: profile.botId,
              targetId: info.players.find((p) => p.id !== profile.botId)!.id,
              tableId: info.tableId,
              sequence: ++sequence,
              foldedToBet: true,
              context,
            });
      const policy = new BotService({ predict: () => structuredClone(predictions[n]) }).decide(info, profile, memory, 0).finalDistribution;
      signature.push(policy);
      const sampling = seededRng(hashString(`${profile.seed}:${n}:calibration`));
      for (let draw = 0; draw < 200; draw++) {
        let value = sampling(),
          selected = policy.length - 1;
        for (let action = 0; action < policy.length; action++) {
          value -= policy[action];
          if (value < 0) {
            selected = action;
            break;
          }
        }
        counts[predictions[n].actions[selected].move]++;
      }
    });
    const nearest = accepted.length ? Math.min(...accepted.map((p) => policyDistance(signature, p.signature))) : null;
    if (nearest !== null && nearest < minimumDistance) continue;
    accepted.push({
      profile,
      signature,
      nearestPolicyDistance: nearest,
      sampledActionFrequencies: Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, value / (contexts.length * 200)])),
    });
  }
  return {
    protocolVersion: 2,
    learningVersion: 'contextual-1',
    policyVersion: predictions[0].modelVersion,
    scope: 'synthetic-battery-only',
    status: accepted.length === count ? 'accepted' : 'insufficient-diversity',
    requested: count,
    attempts,
    contextCount: contexts.length,
    samplesPerContext: 200,
    minimumDistance,
    profiles: accepted.map(({ signature: _signature, ...profile }) => profile),
    warnings: [
      'Distance is mean total variation over conditional action distributions, not numeric trait distance or sampling noise.',
      'Synthetic contexts and an engineering diversity threshold do not certify human realism, skill targets or long-session behavioural diversity.',
    ],
  };
}

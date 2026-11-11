import type { Game } from '../game/types';
import { informationFor } from './information';
import { BotFactory, type BotProfile } from './identity';
import { withPersonality } from './personalities';
import { emptyMemory, observe, type BotMemory } from './memory';
import { BotService } from './service';
import type { BotThought } from '../game/botPlay';
import type { DecisionTrace } from './service';
import { publicResponses } from './observations';
import { learnPublicBehavior } from './publicBehavior';
import { learnPublicSession } from './sessionFeel';
import { LEARNING_CONFIG } from './learningConfig';
import { everydayThinkMs } from './everyday';
import { rememberHandStory } from './handStory';
import { tableInstanceSeed } from './tableCast';

export interface LiveBotState {
  playerId: string;
  memory: BotMemory;
  observedHand: number;
  observedActions: number;
  eventSequence: number;
  profile?: BotProfile;
  instanceBase?: BotProfile;
  lastDecision?: { hand: number; sequence: number; model: string; source: string };
  /** Private bounded replay history; the whole LiveBotState is stripped from client/bot views. */
  traces?: DecisionTrace[];
}
const service = new BotService(undefined, 'contextual', LEARNING_CONFIG, { experience: 'human-table-1' });

/** Trusted adapter. The policy receives a physically separate information set, never Game. */
export function updateHumanPokerMemory(game: Game): LiveBotState | null {
  const player = game.players.find((p) => p.bot && p.botKind === 'human-poker');
  if (!player) return null;
  if (!game.humanPoker || game.humanPoker.playerId !== player.id || game.humanPoker.memory.tableId !== game.id) {
    game.humanPoker = {
      playerId: player.id,
      memory: emptyMemory(player.id, game.id),
      observedHand: -1,
      observedActions: 0,
      eventSequence: 0,
    };
  }
  const state = game.humanPoker,
    h = game.hand;
  // Created once per table; variants know only their own independently generated profile.
  state.instanceBase ??= new BotFactory().generate(player.id, tableInstanceSeed(game.id, player.id));
  if (!h) return state;
  if (state.observedHand !== h.number) {
    state.observedHand = h.number;
    state.observedActions = 0;
    state.profile =
      game.settings.botPersonality && game.settings.botPersonality !== 'original'
        ? withPersonality(state.instanceBase, game.settings.botPersonality)
        : structuredClone(state.instanceBase);
  }
  // Replay public commitments to count actual faced-bet opportunities, not checks or blind posts.
  const responses = publicResponses({
    actions: (h.actions ?? []).map((a) => ({ playerId: a.playerId, street: a.street, move: a.move, to: a.to, outOfTurn: a.outOfTurn })),
    playerIds: h.seats.map((s) => s.playerId),
    sbId: h.sbId,
    bbId: h.bbId,
    smallBlind: game.settings.smallBlind,
    bigBlind: game.settings.bigBlind,
    startStacks: h.startStacks,
  });
  responses.forEach((a) => {
    if (a.actionIndex >= state.observedActions && a.targetId !== player.id) {
      observe(state.memory, {
        observerId: player.id,
        targetId: a.targetId,
        tableId: game.id,
        sequence: ++state.eventSequence,
        foldedToBet: a.foldedToBet,
        context: a.context,
      });
    }
  });
  if ((h.actions?.length ?? 0) > state.observedActions) learnPublicBehavior(game, [state.memory]);
  state.observedActions = h.actions?.length ?? 0;
  learnPublicSession(game, [state.memory]);
  return state;
}

export function humanPokerThought(game: Game, playerId: string): BotThought | null {
  const p = game.players.find((p) => p.id === playerId);
  if (p?.botKind !== 'human-poker' || (game.hand?.variant ?? game.settings.variant ?? 'holdem') !== 'holdem') return null;
  const state = updateHumanPokerMemory(game)!;
  const info = informationFor(game, playerId);
  // Persistent private instance; no other identity or table roster enters the policy.
  const profile = { ...(state.profile ?? state.instanceBase!), botId: playerId };
  const seed = service.seedFor(info, profile);
  const trace = service.decide(info, profile, state.memory, seed);
  rememberHandStory(state.memory, trace);
  state.lastDecision = { hand: info.hand, sequence: info.sequence, model: trace.prediction.modelVersion, source: trace.prediction.source };
  state.traces = [...(state.traces ?? []), trace].slice(-8);
  return { move: trace.action, thinkMs: everydayThinkMs(info, profile, seed, trace.philosophy.session) };
}

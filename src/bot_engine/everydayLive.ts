import type { Game, Player } from '../game/types';
import type { BotThought } from '../game/botPlay';
import { BotFactory, type BotProfile } from './identity';
import { hashString } from '../game/cards';
import { emptyMemory, observe, type BotMemory } from './memory';
import { publicResponses } from './observations';
import { informationFor } from './information';
import { BotService, type DecisionTrace } from './service';
import { EverydayProvider } from './everydayProvider';
import { everydayProfile, everydayThinkMs, type BotDifficulty } from './everyday';
import { usesEverydayBots } from '../game/botTableMode';
import { learnPublicBehavior } from './publicBehavior';
export { usesEverydayBots } from '../game/botTableMode';

export interface EverydayBotState {
  tableId: string;
  observedHand: number;
  observedActions: number;
  eventSequence: number;
  difficulty: BotDifficulty;
  players: Record<string, { profile: BotProfile; memory: BotMemory }>;
  traces: DecisionTrace[];
}
const eligible = (p: Player) => p.bot && !p.legend && !p.twin && p.botKind !== 'human-poker';
const factory = new BotFactory();
const casual = new BotService(new EverydayProvider(96));
const challenge = new BotService(new EverydayProvider(160));

/** All observers learn independently from public actions. No shared beliefs or holes. */
export function updateEverydayMemory(game: Game): EverydayBotState | null {
  if (!usesEverydayBots(game)) return null;
  if (!game.botTable || game.botTable.tableId !== game.id)
    game.botTable = {
      tableId: game.id,
      observedHand: -1,
      observedActions: 0,
      eventSequence: 0,
      difficulty: game.settings.botDifficulty ?? 'casual',
      players: {},
      traces: [],
    };
  const state = game.botTable,
    h = game.hand;
  if (!h) return state;
  if (state.observedHand !== h.number) {
    state.observedHand = h.number;
    state.observedActions = 0;
    state.difficulty = game.settings.botDifficulty ?? 'casual';
    for (const p of game.players.filter(eligible)) {
      const old = Object.hasOwn(state.players, p.id) ? state.players[p.id] : undefined;
      const profile = everydayProfile(factory.generate(p.id, hashString(p.name)), p.name, state.difficulty);
      state.players[p.id] = { profile, memory: old?.memory ?? emptyMemory(p.id, game.id) };
    }
    for (const id of Object.keys(state.players)) if (!game.players.some((p) => p.id === id && eligible(p))) delete state.players[id];
  }
  const events = publicResponses({
    actions: h.actions ?? [],
    playerIds: h.seats.map((s) => s.playerId),
    sbId: h.sbId,
    bbId: h.bbId,
    smallBlind: game.settings.smallBlind,
    bigBlind: game.settings.bigBlind,
    startStacks: h.startStacks,
  });
  for (const event of events)
    if (event.actionIndex >= state.observedActions) {
      const sequence = ++state.eventSequence;
      for (const { memory } of Object.values(state.players))
        if (memory.botId !== event.targetId)
          observe(memory, {
            observerId: memory.botId,
            targetId: event.targetId,
            tableId: game.id,
            sequence,
            foldedToBet: event.foldedToBet,
            context: event.context,
          });
    }
  if ((h.actions?.length ?? 0) > state.observedActions)
    learnPublicBehavior(
      game,
      Object.values(state.players).map((p) => p.memory),
    );
  state.observedActions = h.actions?.length ?? 0;
  return state;
}

export function everydayThought(game: Game, playerId: string): BotThought | null {
  const p = game.players.find((p) => p.id === playerId);
  if (!p || !eligible(p) || !usesEverydayBots(game)) return null;
  const state = updateEverydayMemory(game)!;
  const identity = state.players[playerId];
  // A newly seated player normally waits until next hand; this also supports old persisted games.
  if (!identity) return null;
  const info = informationFor(game, playerId),
    service = state.difficulty === 'challenge' ? challenge : casual;
  const seed = service.seedFor(info, identity.profile);
  const trace = service.decide(info, identity.profile, identity.memory, seed);
  state.traces = [...state.traces, trace].slice(-4);
  return { move: trace.action, thinkMs: everydayThinkMs(info, identity.profile, seed) };
}

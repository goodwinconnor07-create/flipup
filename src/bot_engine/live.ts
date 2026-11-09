import type { Game } from '../game/types';
import { informationFor } from './information';
import { BOT_001 } from './identity';
import { emptyMemory, observe, type BotMemory } from './memory';
import { BotService } from './service';
import type { BotThought } from '../game/botPlay';

export interface LiveBotState {
  playerId: string;
  memory: BotMemory;
  observedHand: number;
  observedActions: number;
  eventSequence: number;
  lastDecision?: { hand: number; sequence: number; model: string; source: string };
}
const service = new BotService();

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
  if (!h) return state;
  if (state.observedHand !== h.number) {
    state.observedHand = h.number;
    state.observedActions = 0;
  }
  // Replay public commitments to count actual faced-bet opportunities, not checks or blind posts.
  let street = 'preflop',
    top = game.settings.bigBlind;
  const bets = new Map(
    h.seats.map((s) => [s.playerId, s.playerId === h.sbId ? game.settings.smallBlind : s.playerId === h.bbId ? game.settings.bigBlind : 0]),
  );
  (h.actions ?? []).forEach((a, index) => {
    if (a.street !== street) {
      street = a.street;
      top = 0;
      bets.forEach((_, id) => bets.set(id, 0));
    }
    if (index >= state.observedActions && a.playerId !== player.id && !a.outOfTurn && top > (bets.get(a.playerId) ?? 0)) {
      observe(state.memory, {
        observerId: player.id,
        targetId: a.playerId,
        tableId: game.id,
        sequence: ++state.eventSequence,
        foldedToBet: a.move === 'fold',
      });
    }
    if (a.move !== 'fold' && a.move !== 'check') {
      bets.set(a.playerId, a.to);
      top = Math.max(top, a.to);
    }
  });
  state.observedActions = h.actions?.length ?? 0;
  return state;
}

export function humanPokerThought(game: Game, playerId: string): BotThought | null {
  const p = game.players.find((p) => p.id === playerId);
  if (p?.botKind !== 'human-poker' || (game.hand?.variant ?? game.settings.variant ?? 'holdem') !== 'holdem') return null;
  const state = updateHumanPokerMemory(game)!;
  const info = informationFor(game, playerId);
  // Persistent BOT_001 parameters; table seat IDs remain distinct from identity names.
  const profile = { ...BOT_001, botId: playerId };
  const trace = service.decide(info, profile, state.memory, service.seedFor(info, profile));
  state.lastDecision = { hand: info.hand, sequence: info.sequence, model: trace.prediction.modelVersion, source: trace.prediction.source };
  return { move: trace.action, thinkMs: 1200 };
}

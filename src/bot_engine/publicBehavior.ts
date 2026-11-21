import { publicResponseContexts, type PublicContextInput } from './responseRanges';
import type { BehaviorEvent } from './behaviorMemory';
import { betSizeBucket } from './memory';
import type { ResponseView } from './responseModel';
import { observeBehavior } from './behaviorMemory';
import type { BotMemory } from './memory';
import type { Game } from '../game/types';
export function behaviorKey(v: Pick<ResponseView, 'board' | 'live' | 'toCall' | 'eligiblePot'>): string {
  const street = v.board.length === 5 ? 'river' : v.board.length === 4 ? 'turn' : 'flop';
  return `${street}|${v.live === 2 ? 'HU' : 'MW'}|${v.toCall ? `facing|${betSizeBucket(v.toCall, v.eligiblePot)}` : 'open|none'}`;
}
/** Trusted adapter projects only public hand fields before updating independent observers. */
export function learnPublicBehavior(game: Game, memories: BotMemory[]): void {
  const h = game.hand;
  if (!h || (!h.startStacks && h.result)) return;
  const input: PublicContextInput = {
    buttonId: h.buttonId,
    smallBlind: game.settings.smallBlind,
    bigBlind: game.settings.bigBlind,
    board: [...h.board],
    players: h.seats.map((s) => ({
      id: s.playerId,
      seat: game.players.find((p) => p.id === s.playerId)!.seat,
      stack: game.players.find((p) => p.id === s.playerId)!.stack,
      bet: s.bet,
      total: s.total,
      folded: s.folded,
      allIn: s.allIn,
    })),
    actions: (h.actions ?? []).map((a) => ({
      playerId: a.playerId,
      street: a.street,
      move: a.move,
      to: a.to,
      ...(a.outOfTurn ? { outOfTurn: true } : {}),
    })),
  };
  for (const e of publicBehaviorEvents(input, h.number, h.startStacks))
    for (const m of memories) if (m.botId !== e.targetId) observeBehavior(m, { ...e, observerId: m.botId, tableId: game.id });
}
/** Public input projection; no actor cards, deck, hidden profile or other observer state. */
export function publicBehaviorEvents(
  i: PublicContextInput,
  hand: number,
  startStacks?: Record<string, number>,
): Omit<BehaviorEvent, 'observerId' | 'tableId'>[] {
  return [...publicResponseContexts(i, startStacks)]
    .flatMap(([targetId, rows]) =>
      rows.map((r) => ({
        targetId,
        hand,
        actionIndex: r.actionIndex,
        context: behaviorKey(r.view),
        label: r.label as 0 | 1 | 2,
        ...(r.sizing === undefined ? {} : { sizing: r.sizing }),
      })),
    )
    .sort((a, b) => a.actionIndex - b.actionIndex);
}

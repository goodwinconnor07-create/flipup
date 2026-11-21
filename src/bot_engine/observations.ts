import type { HandAction } from '../game/types';
import { betSizeBucket, type ObservationContext } from './memory';

export interface PublicResponse {
  actionIndex: number;
  targetId: string;
  foldedToBet: boolean;
  context: ObservationContext;
}
/** No private-card/deck fields can enter this public-event processor. */
export function publicResponses(input: {
  actions: HandAction[];
  playerIds: string[];
  sbId: string | null;
  bbId: string;
  smallBlind: number;
  bigBlind: number;
  startStacks?: Record<string, number>;
}): PublicResponse[] {
  const commitments = new Map(
    input.playerIds.map((id) => [
      id,
      Math.min(input.startStacks?.[id] ?? Infinity, id === input.sbId ? input.smallBlind : id === input.bbId ? input.bigBlind : 0),
    ]),
  );
  const invested = new Map(commitments),
    live = new Set(input.playerIds);
  let street = 'preflop',
    top = input.bigBlind,
    pot = [...commitments.values()].reduce((a, b) => a + b, 0),
    aggression = 0;
  const events: PublicResponse[] = [];
  input.actions.forEach((a, actionIndex) => {
    if (street !== a.street) {
      street = a.street;
      top = 0;
      aggression = 0;
      commitments.forEach((_, id) => commitments.set(id, 0));
    }
    const before = commitments.get(a.playerId) ?? 0;
    const owed = Math.max(0, top - before);
    const stack = input.startStacks?.[a.playerId];
    const call = stack === undefined ? owed : Math.min(owed, Math.max(0, stack - (invested.get(a.playerId) ?? 0)));
    if (call > 0 && !a.outOfTurn)
      events.push({
        actionIndex,
        targetId: a.playerId,
        foldedToBet: a.move === 'fold',
        context: {
          street: a.street,
          size: betSizeBucket(call, pot),
          headsUp: live.size === 2,
          ...(aggression > 1 ? { raised: true } : {}),
        },
      });
    if (a.move === 'fold') live.delete(a.playerId);
    else if (a.move !== 'check') {
      if (['bet', 'raise', 'allin'].includes(a.move) && a.to > top) aggression++;
      const added = Math.max(0, a.to - before);
      pot += added;
      commitments.set(a.playerId, a.to);
      invested.set(a.playerId, (invested.get(a.playerId) ?? 0) + added);
      top = Math.max(top, a.to);
    }
  });
  return events;
}

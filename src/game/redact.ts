// What each phone is allowed to see. The deck never leaves the server, and other players'
// hole cards stay hidden until they're turned face up.

import type { Game, HandLog } from './types';

const mineFor = (game: Game, deviceId: string) => new Set(game.players.filter((p) => p.deviceId === deviceId).map((p) => p.id));

/** The table as one phone may see it. The hand log is left out (it's sent on request, see redactLogs). */
export function redactForDevice(game: Game, deviceId: string): Game {
  const hand = game.hand;
  const mine = mineFor(game, deviceId);
  return {
    ...game,
    logs: [],
    hand: hand && {
      ...hand,
      deck: [],
      seats: hand.seats.map((s) => (mine.has(s.playerId) || s.shown ? s : { ...s, cards: [] })),
    },
  };
}

/** The hand log as one phone may see it: its own hole cards and any that were shown. */
export function redactLogs(game: Game, deviceId: string): HandLog[] {
  const mine = mineFor(game, deviceId);
  const visible = (holes: Record<string, string[]>, shown: string[]) =>
    Object.fromEntries(Object.entries(holes).filter(([id]) => mine.has(id) || shown.includes(id)));
  return (game.logs ?? []).map((l) => ({
    ...l,
    holes: visible(l.holes, l.shown),
    record: l.record && { ...l.record, holes: visible(l.record.holes, l.shown) },
  }));
}

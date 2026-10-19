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
  return (game.logs ?? []).map((l) => ({
    ...l,
    holes: Object.fromEntries(Object.entries(l.holes).filter(([id]) => mine.has(id) || l.shown.includes(id))),
  }));
}

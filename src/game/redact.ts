// What each phone is allowed to see. The deck never leaves the server, and other players'
// hole cards stay hidden until they're turned face up.

import type { Game } from './types';

export function redactForDevice(game: Game, deviceId: string): Game {
  const hand = game.hand;
  if (!hand) return game;
  const mine = new Set(game.players.filter((p) => p.deviceId === deviceId).map((p) => p.id));
  return {
    ...game,
    hand: {
      ...hand,
      deck: [],
      seats: hand.seats.map((s) => (mine.has(s.playerId) || s.shown ? s : { ...s, cards: [] })),
    },
  };
}

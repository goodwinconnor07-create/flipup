import type { Game } from './types';

/** Standard tables share the new engine; special game modes retain their own brains. */
export function usesEverydayBots(game: Game): boolean {
  return (
    (game.settings.variant ?? 'holdem') === 'holdem' &&
    (!game.hand?.variant || game.hand.variant === 'holdem') &&
    !game.party &&
    !game.legacyBotSimulation &&
    !game.card &&
    !game.players.some((p) => p.labStyle)
  );
}

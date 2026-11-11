import type { Game } from './types';

/** Standard tables share the new engine; special game modes retain their own brains. */
export function usesEverydayBots(game: Game): boolean {
  return (
    (game.settings.variant ?? 'holdem') === 'holdem' &&
    (!game.hand?.variant || game.hand.variant === 'holdem') &&
    !game.campaign &&
    !game.party &&
    !game.challenge &&
    !game.legendGame &&
    !game.bankroll &&
    !game.legacyBotSimulation &&
    !game.card &&
    // An ULTRA table (Premium) plays its own sharpened brain (`ultraStyle()` through botPlay.ts).
    !game.ultra &&
    !game.players.some((p) => p.twin || p.legend)
  );
}

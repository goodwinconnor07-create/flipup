// What FlipUp Premium covers, as pure rules the phone and the server both read. The server enforces them
// (worker/index.ts, worker/room.ts); the phone uses them to show a crown and to ask for Premium before it tries.

import { BUBBLE_STYLES } from './bubbles';
import { CARD_PACKS } from './cardPacks';
import type { Action } from './types';
import { isPremiumVariant, type Variant } from './variants';

/** A chat bubble that only Premium may wear. The free ones, and the plain default, are open to everyone. */
export const premiumBubble = (id: string | undefined): boolean => id !== undefined && BUBBLE_STYLES.some((b) => b.id === id && !b.free);

/** A card pack that only Premium may use. A campaign trophy back is won, not bought, so it isn't one. */
export const premiumPack = (id: string | undefined): boolean => id !== undefined && CARD_PACKS.some((p) => p.id === id && !p.venue);

/** Hosting a table or a party with any of these games needs Premium. Joining one never does. */
export const gamesNeedPremium = (games: readonly Variant[]): boolean => games.some(isPremiumVariant);

/**
 * Whether this action is the host opening a Premium game: changing a table's mode to one, or playing again in one.
 * The table room refuses it from a phone that hasn't shown it owns Premium, the same rule as opening a table.
 */
export function actionNeedsPremium(action: Action): boolean {
  if (action.type === 'settings') return gamesNeedPremium(action.settings.variant ? [action.settings.variant] : []);
  if (action.type === 'playAgain') return gamesNeedPremium(action.variant ? [action.variant] : []);
  return false;
}

/** A `setLook` with its Premium parts taken out, for a phone that hasn't shown it owns Premium. Anything else passes through. */
export function withoutPremiumLook(action: Action): Action {
  if (action.type !== 'setLook') return action;
  const { bubble, cardPack, ...rest } = action;
  return {
    ...rest,
    ...(bubble !== undefined && !premiumBubble(bubble) ? { bubble } : {}),
    ...(cardPack !== undefined && !premiumPack(cardPack) ? { cardPack } : {}),
  };
}

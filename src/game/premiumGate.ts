// What FlipUp Premium covers, as pure rules the phone and the server both read. The server enforces them
// (worker/index.ts, worker/room.ts); the phone uses them to show a crown and to ask for Premium before it tries.

import { BUBBLE_STYLES } from './bubbles';
import { BOTS } from './botStyles';
import { CARD_PACKS } from './cardPacks';
import type { Action } from './types';
import { isPremiumVariant, VARIANTS, type Variant } from './variants';

/** A chat bubble that only Premium may wear. The free ones, and the plain default, are open to everyone. */
export const premiumBubble = (id: string | undefined): boolean => id !== undefined && BUBBLE_STYLES.some((b) => b.id === id && !b.free);

/** A card pack that only Premium may use. A campaign trophy back is won, not bought, so it isn't one. */
export const premiumPack = (id: string | undefined): boolean => id !== undefined && CARD_PACKS.some((p) => p.id === id && !p.venue);

const WEEK = 7 * 24 * 60 * 60 * 1000;
/** Monday 5 January 2026, 00:00 UTC: weeks are counted from here, the same on every phone and on the server. */
const FIRST_MONDAY = Date.UTC(2026, 0, 5);

/**
 * Free this week: one Premium mini game anyone may host, a different one each week (Monday to Sunday, UTC), in
 * the order of `VARIANTS`. Playing one sells the others better than any picture.
 */
export function freeThisWeek(now: number = Date.now()): Variant {
  const paid = VARIANTS.map((v) => v.id).filter(isPremiumVariant);
  const week = Math.floor((now - FIRST_MONDAY) / WEEK);
  return paid[((week % paid.length) + paid.length) % paid.length];
}

/** When this week's free game changes over to the next (the coming Monday, 00:00 UTC). */
export function freeWeekEnds(now: number = Date.now()): number {
  return FIRST_MONDAY + (Math.floor((now - FIRST_MONDAY) / WEEK) + 1) * WEEK;
}

/** Hosting this game needs Premium right now: a Premium game that isn't this week's free one. */
export const variantNeedsPremium = (v: Variant, now: number = Date.now()): boolean => isPremiumVariant(v) && v !== freeThisWeek(now);

/** Hosting a table or a party with any of these games needs Premium. Joining one never does. */
export const gamesNeedPremium = (games: readonly Variant[], now: number = Date.now()): boolean => games.some((v) => variantNeedsPremium(v, now));

/**
 * The bots a free host can seat: the ten original ones, one of each playing style. Premium opens the whole roster.
 * Sitting at someone else's table never needs this; only the host picks the bots.
 */
export const FREE_BOT_NAMES: readonly string[] = ['Luna', 'Eli', 'Remi', 'Emma', 'Anna', 'Max', 'Zoe', 'Theo', 'Ivy', 'Kai'];
export const isFreeBot = (name: string): boolean => FREE_BOT_NAMES.includes(name);
/** Seating any bot outside the free ten needs Premium. Names that aren't in the roster count as Premium. */
export const botsNeedPremium = (names: readonly string[]): boolean => names.some((n) => !isFreeBot(n));
/** The roster a host may pick from. */
export const botsFor = (premium: boolean): typeof BOTS => (premium ? BOTS : BOTS.filter((b) => isFreeBot(b.name)));

/**
 * Range training: without Premium you get the daily quiz, the same five hands for everyone each day. Every other set
 * (a plain set of five, practice on chosen spots or your misses) is Premium.
 */
export const rangeSetNeedsPremium = (daily: boolean): boolean => !daily;

/**
 * Whether this action is the host opening a Premium game: changing a table's mode to one, or playing again in one.
 * The table room refuses it from a phone that hasn't shown it owns Premium, the same rule as opening a table.
 */
export function actionNeedsPremium(action: Action, now: number = Date.now()): boolean {
  if (action.type === 'settings') return gamesNeedPremium(action.settings.variant ? [action.settings.variant] : [], now);
  if (action.type === 'playAgain') return gamesNeedPremium(action.variant ? [action.variant] : [], now);
  return false;
}

/** A `setLook` with its Premium parts (bubble, card pack, gold name) taken out, for a phone that hasn't shown it owns Premium. Anything else passes through. */
export function withoutPremiumLook(action: Action): Action {
  if (action.type !== 'setLook') return action;
  const { bubble, cardPack, gold: _gold, ...rest } = action;
  return {
    ...rest,
    ...(bubble !== undefined && !premiumBubble(bubble) ? { bubble } : {}),
    ...(cardPack !== undefined && !premiumPack(cardPack) ? { cardPack } : {}),
  };
}

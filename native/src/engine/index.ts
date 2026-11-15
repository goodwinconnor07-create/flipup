// The app's door to the shared poker engine. Screens import from here, never from ../src/game directly,
// so there's one place to see what the app uses. The engine is pure TypeScript with no DOM or Node APIs.
// `VARIANTS` below takes the place of the engine's on purpose: a module's own export wins over `export *` (the
// language's rule, and Babel's), which the import/export lint rule reads as a clash.
/* eslint-disable import/export */
import { isVariant as isAnyVariant, VARIANTS as ALL_VARIANTS, type Variant, type VariantInfo } from '@game/index';

export * from '@game/index';

/**
 * Games this version of the app doesn't offer to host yet (the owner's call for version 1.0, 15 Nov 2026): the eight
 * newest, which still need their How to Play pictures and a longer run on TestFlight. Their rules, tables and bots are
 * all here, so a table of one hosted elsewhere (the website) can still be joined and played; the app just doesn't list
 * them, so nobody here can start one. Take a game out of this set to offer it again.
 */
export const HELD_BACK: ReadonlySet<Variant> = new Set<Variant>(['missions', 'slide', 'headband', 'belt', 'onion', 'chain', 'elevator', 'plo']);

/**
 * The games this app lists and lets you host, in the engine's order (Texas Hold'em first). This takes the place of the
 * engine's own `VARIANTS` for everything in the app; `isVariant()` still knows every game, for tables joined from elsewhere.
 */
export const VARIANTS: VariantInfo[] = ALL_VARIANTS.filter((v) => !HELD_BACK.has(v.id));

/** A game this app offers to host: a real game that isn't held back. Anything read from storage or a link goes through it. */
export const isOffered = (v: unknown): v is Variant => isAnyVariant(v) && !HELD_BACK.has(v);

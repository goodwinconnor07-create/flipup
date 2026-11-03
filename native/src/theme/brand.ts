// FlipUp's palette in the app: black, white and Apple's greys, plus two colours. Violet is the brand and every
// action (buttons, links, selected things, the big cards); gold is for wins, Premium, streaks and highlights. Red
// is kept for Fold and for actions that delete or leave, never as decoration. Game pictures keep their own colours
// (src/design/gameArt.ts) so games stay easy to tell apart.
//
// The shared web tokens (src/design/tokens.ts) are unchanged: this file maps the app's uses of them onto the two
// colours, so `party.*`, `gradients.*` and `useColors()` in the app all land on violet or gold.
import { party as tokenParty } from '@design/tokens';

export const brand = {
  /** The brand and action colour. */
  violet: '#6e4bff',
  /** Violet on a dark page, a touch lighter so it holds its contrast. */
  violetDark: '#8b6dff',
  /** The low end of violet gradients. */
  violetDeep: '#3c1fc2',
  /** The night end, for big cards. */
  violetNight: '#160b45',
  gold: '#f5b700',
  goldDeep: '#d48a00',
  /** Ink on gold. */
  goldInk: '#3b2600',
} as const;

/** The party colours the app's components ask for, each one now violet or gold. */
export const party = {
  ...tokenParty,
  pink: brand.violet,
  blue: brand.violet,
  green: brand.violet,
  orange: brand.gold,
  yellow: brand.gold,
  blueLo: brand.violetDeep,
  greenLo: brand.violetDeep,
} as const;

/** The big tap targets' gradients: violet for everything you tap to play, gold for Premium. */
export const gradients = {
  blue: ['#7d5cff', brand.violetDeep],
  green: ['#7d5cff', brand.violetDeep],
  pink: ['#7d5cff', brand.violetDeep],
  gold: ['#ffcf3f', brand.goldDeep],
} as const satisfies Record<string, readonly [string, string]>;

/** The colour pairs behind the big cards (top-left to bottom-right): the brand violet, and night for stats. */
export const cardColors = {
  violet: ['#8263ff', '#4a26d9', '#2a1290'],
  night: ['#2b1a80', '#170c4a', '#0b0626'],
  gold: ['#ffd65a', '#f5b700', '#c77d00'],
} as const satisfies Record<string, readonly [string, string, string]>;

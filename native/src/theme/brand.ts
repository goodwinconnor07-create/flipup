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
  /** Raise at the table, and only there (the owner's call): the one green in the app. */
  raise: '#22b35e',
  raiseDeep: '#14843f',
  /** The solid light button on the dark grain pages (Open table), and its chunky edge: a pale violet. */
  paper: '#ffffff',
  paperEdge: '#bfb2ff',
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
  blue: ['#8468ee', '#4a32b4'],
  green: ['#8468ee', '#4a32b4'],
  pink: ['#8468ee', '#4a32b4'],
  gold: ['#f8d062', '#d49a1a'],
} as const satisfies Record<string, readonly [string, string]>;

/** The colour pairs behind the big cards (top-left to bottom-right): the brand violet, and night for stats. */
export const cardColors = {
  violet: ['#8468ee', '#5a40cc', '#3a2796'],
  night: ['#2d2078', '#1b1250', '#0e0a2c'],
  gold: ['#fbd872', '#eebb2a', '#c98a14'],
} as const satisfies Record<string, readonly [string, string, string]>;

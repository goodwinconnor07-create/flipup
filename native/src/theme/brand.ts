// FlipUp's palette in the app: black, white and Apple's greys, plus two colours. Deep blue is the brand and every
// action (buttons, links, selected things, the big cards); gold is for wins, Premium and highlights. Red
// is kept for Fold and for actions that delete or leave, never as decoration. Game pictures keep their own colours
// (src/design/gameArt.ts) so games stay easy to tell apart.
//
// The shared web tokens (src/design/tokens.ts) are unchanged: this file maps the app's uses of them onto the two
// colours, so `party.*`, `gradients.*` and `useColors()` in the app all land on blue or gold. (The keys still say
// "violet": the owner swapped the purple for a darker blue in November 2026, and the names were kept.)
import { party as tokenParty } from '@design/tokens';

export const brand = {
  /** The brand and action colour. */
  violet: '#2557d6',
  /** Violet on a dark page, a touch lighter so it holds its contrast. */
  violetDark: '#5b8bff',
  /** The low end of violet gradients. */
  violetDeep: '#163a9e',
  /** The night end, for big cards. */
  violetNight: '#081433',
  gold: '#f5b700',
  goldDeep: '#d48a00',
  /** Ink on gold. */
  goldInk: '#3b2600',
  /** Raise at the table, and only there (the owner's call): the one green in the app. */
  raise: '#22b35e',
  raiseDeep: '#14843f',
  /** The solid light button on the dark grain pages (Open table), and its chunky edge: a pale blue. */
  paper: '#ffffff',
  paperEdge: '#b3c6f2',
} as const;

/** The party colours the app's components ask for, each one now blue or gold. */
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

/** The big tap targets' gradients: blue for everything you tap to play, gold for Premium. */
export const gradients = {
  blue: ['#3a6ae6', '#1a3fa8'],
  green: ['#3a6ae6', '#1a3fa8'],
  pink: ['#3a6ae6', '#1a3fa8'],
  gold: ['#f8d062', '#d49a1a'],
} as const satisfies Record<string, readonly [string, string]>;

/** The colour pairs behind the big cards (top-left to bottom-right): the brand blue, and night for stats. */
export const cardColors = {
  violet: ['#3a6ae6', '#2149bf', '#152f86'],
  night: ['#16285c', '#0e1b42', '#070e26'],
  gold: ['#fbd872', '#eebb2a', '#c98a14'],
} as const satisfies Record<string, readonly [string, string, string]>;

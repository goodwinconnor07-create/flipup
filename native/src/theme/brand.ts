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

/** The loud buttons' colours (a lighter detail, then the flat fill): blue for everything you tap to play, gold for Premium. */
export const gradients = {
  blue: ['#4a7af0', '#2557d6'],
  green: ['#4a7af0', '#2557d6'],
  pink: ['#4a7af0', '#2557d6'],
  gold: ['#fbd872', '#f5b700'],
} as const satisfies Record<string, readonly [string, string]>;

/** The big cards' colours, each as lighter detail, the flat fill, and the darker band: the brand blue, night for stats, gold. */
export const cardColors = {
  violet: ['#4a7af0', '#2557d6', '#1a3fa8'],
  night: ['#2a3f80', '#16285c', '#0d1a40'],
  gold: ['#fbd872', '#f5b700', '#c98a14'],
} as const satisfies Record<string, readonly [string, string, string]>;

// The ten ways a bot can play, and the forty bots that play them. A bot's style never leaves the
// server (or the bots-only phone): players work out who's who by playing against them.

export type StyleId =
  | 'pro'
  | 'shark'
  | 'tag'
  | 'lag'
  | 'maniac'
  | 'rock'
  | 'station'
  | 'gambler'
  | 'trapper'
  | 'nervous';

export interface Style {
  id: StyleId;
  /** What the style is, for people reading the code. Never shown in the app. */
  about: string;
  pre: {
    /** 0 to 1: only plays hands stronger than this share of all starting hands (0 plays GTO's whole range). */
    tight: number;
    /** 0 to 1: plays hands GTO folds. */
    loose: number;
    /** -1 to 1: turns calls into raises (or raises into calls when negative). */
    aggro: number;
    /** 0 to 1: limps instead of raising or folding when nobody has raised. */
    limp: number;
  };
  post: {
    /** -1 to 1: bets value hands more (or less) often than GTO. */
    value: number;
    /** Multiplies how often it bets with nothing. */
    bluff: number;
    /** 0 to 1: calls when GTO folds. Negative folds more. */
    sticky: number;
    /** Multiplies how often it raises a bet. */
    raise: number;
    /** -1 (always small) to 1 (always big). */
    size: number;
    /** 0 to 1: chance a big bet becomes an overbet on the turn or river. */
    overbet: number;
    /** 0 to 1: checks its best hands to raise later. */
    trap: number;
    /** 0 to 1: calls with draws whatever the price. */
    chase: number;
    /** 0 to 1: gives up against big bets. */
    scared: number;
  };
  /** 0 to 1: how much it changes its play after watching yours. */
  adapt: number;
  talk: { tone: 'trash' | 'friendly'; chatty: number };
}

const base = { tight: 0, loose: 0, aggro: 0, limp: 0 };
const post = { value: 0, bluff: 1, sticky: 0, raise: 1, size: 0, overbet: 0, trap: 0, chase: 0, scared: 0 };

export const STYLES: Record<StyleId, Style> = {
  pro: {
    id: 'pro',
    about: 'Plays close to the GTO charts and adjusts to what it sees.',
    pre: { ...base },
    post: { ...post, overbet: 0.1, trap: 0.1 },
    adapt: 0.4,
    talk: { tone: 'friendly', chatty: 0.35 },
  },
  shark: {
    id: 'shark',
    about: 'GTO with a sharper edge: a little more aggressive, and the quickest to exploit you.',
    pre: { ...base, aggro: 0.15 },
    post: { ...post, value: 0.15, bluff: 1.15, raise: 1.2, overbet: 0.2, trap: 0.15 },
    adapt: 0.65,
    talk: { tone: 'trash', chatty: 0.6 },
  },
  tag: {
    id: 'tag',
    about: 'Tight and aggressive: few hands, played hard.',
    pre: { ...base, tight: 0.72, aggro: 0.25 },
    post: { ...post, value: 0.25, bluff: 0.9, sticky: -0.1, raise: 1.2, size: 0.2 },
    adapt: 0.3,
    talk: { tone: 'friendly', chatty: 0.35 },
  },
  lag: {
    id: 'lag',
    about: 'Loose and aggressive: lots of hands, lots of pressure.',
    pre: { ...base, loose: 0.3, aggro: 0.35 },
    post: { ...post, value: 0.2, bluff: 1.25, raise: 1.2, size: 0.3, overbet: 0.15 },
    adapt: 0.3,
    talk: { tone: 'trash', chatty: 0.55 },
  },
  maniac: {
    id: 'maniac',
    about: 'Raises everything and bluffs constantly. Hard to read, easy to trap.',
    pre: { ...base, loose: 0.8, aggro: 0.75 },
    post: { ...post, value: 0.35, bluff: 2.4, sticky: 0.25, raise: 2.2, size: 0.6, overbet: 0.35, chase: 0.3 },
    adapt: 0.2,
    talk: { tone: 'trash', chatty: 0.8 },
  },
  rock: {
    id: 'rock',
    about: 'Only plays great hands. When it bets, believe it.',
    pre: { ...base, tight: 0.87, aggro: -0.1 },
    post: { ...post, value: 0.1, bluff: 0.25, sticky: -0.3, raise: 0.8, size: -0.1, scared: 0.3 },
    adapt: 0.2,
    talk: { tone: 'friendly', chatty: 0.2 },
  },
  station: {
    id: 'station',
    about: 'Calls far too much and rarely raises. Bluffing it is a bad idea.',
    pre: { ...base, loose: 0.45, aggro: -0.6 },
    post: { ...post, value: -0.25, bluff: 0.35, sticky: 0.7, raise: 0.35, size: -0.3, chase: 0.6 },
    adapt: 0.2,
    talk: { tone: 'friendly', chatty: 0.45 },
  },
  gambler: {
    id: 'gambler',
    about: 'Limps, chases every draw and loves a big pot.',
    pre: { ...base, loose: 0.5, limp: 0.6, aggro: 0.05 },
    post: { ...post, bluff: 1.25, sticky: 0.35, raise: 1.1, size: 0.25, overbet: 0.15, chase: 0.8 },
    adapt: 0.2,
    talk: { tone: 'friendly', chatty: 0.65 },
  },
  trapper: {
    id: 'trapper',
    about: 'Slow-plays its monsters and check-raises. Quiet until it pounces.',
    pre: { ...base, tight: 0.66, aggro: -0.25 },
    post: { ...post, value: -0.2, bluff: 0.8, raise: 1.6, size: 0.1, overbet: 0.15, trap: 0.6 },
    adapt: 0.3,
    talk: { tone: 'trash', chatty: 0.45 },
  },
  nervous: {
    id: 'nervous',
    about: 'Plays fair hands but folds to pressure, and bets small when it does bet.',
    pre: { ...base, tight: 0.68, aggro: -0.2 },
    post: { ...post, value: -0.1, bluff: 0.6, sticky: -0.25, raise: 0.6, size: -0.6, scared: 0.65 },
    adapt: 0.25,
    talk: { tone: 'friendly', chatty: 0.4 },
  },
};

/** Forty bots, four of each style. */
export const BOTS: { name: string; emoji: string; style: StyleId }[] = [
  { name: 'Luna', emoji: '🐸', style: 'gambler' },
  { name: 'Eli', emoji: '🤩', style: 'lag' },
  { name: 'Remi', emoji: '🧌', style: 'rock' },
  { name: 'Emma', emoji: '🦊', style: 'shark' },
  { name: 'Anna', emoji: '🐼', style: 'station' },
  { name: 'Max', emoji: '🤠', style: 'maniac' },
  { name: 'Zoe', emoji: '🐙', style: 'trapper' },
  { name: 'Theo', emoji: '🦁', style: 'tag' },
  { name: 'Ivy', emoji: '🦄', style: 'nervous' },
  { name: 'Kai', emoji: '🐯', style: 'pro' },
  { name: 'Milo', emoji: '🐶', style: 'station' },
  { name: 'Nora', emoji: '🦉', style: 'pro' },
  { name: 'Otis', emoji: '🐻', style: 'rock' },
  { name: 'Pia', emoji: '🐧', style: 'nervous' },
  { name: 'Rex', emoji: '🦖', style: 'maniac' },
  { name: 'Sage', emoji: '🌵', style: 'trapper' },
  { name: 'Tess', emoji: '🐝', style: 'tag' },
  { name: 'Uma', emoji: '🐳', style: 'shark' },
  { name: 'Vic', emoji: '😎', style: 'lag' },
  { name: 'Wren', emoji: '🐦', style: 'gambler' },
  { name: 'Yuki', emoji: '🦋', style: 'pro' },
  { name: 'Ziggy', emoji: '🦓', style: 'maniac' },
  { name: 'Bea', emoji: '🐞', style: 'station' },
  { name: 'Cole', emoji: '🐺', style: 'shark' },
  { name: 'Dot', emoji: '🐹', style: 'nervous' },
  { name: 'Finn', emoji: '🐬', style: 'tag' },
  { name: 'Gus', emoji: '🐢', style: 'rock' },
  { name: 'Hana', emoji: '🌸', style: 'gambler' },
  { name: 'Iggy', emoji: '🦎', style: 'trapper' },
  { name: 'Jax', emoji: '🔥', style: 'lag' },
  { name: 'Kiki', emoji: '🐱', style: 'station' },
  { name: 'Leo', emoji: '🦒', style: 'pro' },
  { name: 'Mags', emoji: '🐊', style: 'trapper' },
  { name: 'Ned', emoji: '🐭', style: 'nervous' },
  { name: 'Ora', emoji: '🦚', style: 'shark' },
  { name: 'Pip', emoji: '🐥', style: 'gambler' },
  { name: 'Quinn', emoji: '🦅', style: 'tag' },
  { name: 'Rosa', emoji: '🌹', style: 'lag' },
  { name: 'Stan', emoji: '🗿', style: 'rock' },
  { name: 'Tex', emoji: '🌪️', style: 'maniac' },
];

export const styleOf = (id: string | undefined): Style => STYLES[(id as StyleId) ?? 'pro'] ?? STYLES.pro;

// How each mini game looks and sounds. The table, the cards, the background and the game's card on Home all
// read from here, so a game feels like its own place. Texas Hold'em has no theme: it uses the felt and rail
// the player picked in Settings.

import type { Variant } from '../game';
import type { SoundName } from './sound';

/** Moving pictures behind and over the table (see styles/themes.css). */
export type Ambient = 'sparkle' | 'confetti' | 'fog' | 'water' | 'pips' | 'flow' | 'spotlight';

export interface GameTheme {
  id: Variant;
  /** A line that sets the mood. Shown on the game's card and under its name at the table. */
  mood: string;
  felt: string;
  /** The rail round the felt, light to dark. */
  rail: [string, string];
  /** The page behind the table, top to bottom. */
  bg: [string, string];
  /** Back of the cards. */
  back: [string, string];
  /** Buttons, the pot and highlights. */
  accent: string;
  /** Home card: the gradient and the emoji that float on it. */
  card: [string, string];
  props: [string, string, string];
  ambient: Ambient;
  /** Table sounds are pitched by this (1 is normal). */
  pitch: number;
  /** The game's own sting for its big moment (see `playSound`). */
  sting: SoundName | null;
  /** What the pot chip looks like. */
  chip: string;
  /** Dark page, so the table's text and header go light. Every themed game is dark. */
  dark: true;
}

export const THEMES: Partial<Record<Variant, GameTheme>> = {
  pineapple: {
    id: 'pineapple',
    mood: 'Sunny, juicy and a bit silly.',
    felt: '#0f8a6a',
    rail: ['#f6c945', '#b8791b'],
    bg: ['#0c3b36', '#07201d'],
    back: ['#f2b01e', '#c46b0d'],
    accent: '#ffcf3d',
    card: ['#f9b233', '#e8641b'],
    props: ['🍍', '🌴', '☀️'],
    ambient: 'sparkle',
    pitch: 1.12,
    sting: null,
    chip: '#f2b01e',
    dark: true,
  },
  deuces: {
    id: 'deuces',
    mood: 'Wild cards, loud colours.',
    felt: '#6b2fb3',
    rail: ['#ff5fa8', '#3ad7ff'],
    bg: ['#2a0f4d', '#12062a'],
    back: ['#ff4fa0', '#7a2cff'],
    accent: '#ffe14d',
    card: ['#ff4fa0', '#7a2cff'],
    props: ['🃏', '✨', '🎉'],
    ambient: 'confetti',
    pitch: 1.2,
    sting: 'pop',
    chip: '#ff4fa0',
    dark: true,
  },
  ghost: {
    id: 'ghost',
    mood: 'Cold air. Something is watching the pot.',
    felt: '#12332c',
    rail: ['#4b5563', '#0b0e14'],
    bg: ['#0a1412', '#030706'],
    back: ['#2b3a45', '#0b1116'],
    accent: '#7dffc4',
    card: ['#1b2a3a', '#050a10'],
    props: ['👻', '🦇', '🕯️'],
    ambient: 'fog',
    pitch: 0.82,
    sting: 'spook',
    chip: '#7dffc4',
    dark: true,
  },
  pittsburgh: {
    id: 'pittsburgh',
    mood: 'Steel, rivers and a bridge in the dark.',
    felt: '#2a3f55',
    rail: ['#f6c945', '#1c1c1c'],
    bg: ['#141c26', '#090d12'],
    back: ['#1f1f1f', '#050505'],
    accent: '#f6c945',
    card: ['#32465c', '#0e151d'],
    props: ['🌉', '🏭', '🌊'],
    ambient: 'water',
    pitch: 0.94,
    sting: null,
    chip: '#f6c945',
    dark: true,
  },
  dice: {
    id: 'dice',
    mood: 'Craps table energy. Everything is one roll from changing.',
    felt: '#8b1d2c',
    rail: ['#f5ecd8', '#a8946a'],
    bg: ['#2d0b10', '#12040a'],
    back: ['#b3263a', '#5a0f1b'],
    accent: '#ffffff',
    card: ['#c0283f', '#4a0a16'],
    props: ['🎲', '🎰', '💥'],
    ambient: 'pips',
    pitch: 1,
    sting: 'dice',
    chip: '#f5ecd8',
    dark: true,
  },
  redriver: {
    id: 'redriver',
    mood: 'The river runs red. Keep going until it stops.',
    felt: '#7c1414',
    rail: ['#2a2a30', '#050507'],
    bg: ['#260808', '#0d0303'],
    back: ['#d92b2b', '#240606'],
    accent: '#ff6b5e',
    card: ['#d92b2b', '#2a0606'],
    props: ['🟥', '🌊', '🩸'],
    ambient: 'flow',
    pitch: 0.9,
    sting: 'splash',
    chip: '#ff6b5e',
    dark: true,
  },
  imposter: {
    id: 'imposter',
    mood: 'Trust nobody. Watch the bets.',
    felt: '#262a33',
    rail: ['#c9a24b', '#4d3a12'],
    bg: ['#15171c', '#050608'],
    back: ['#2b2f3a', '#0a0b0f'],
    accent: '#ff4d57',
    card: ['#2f3441', '#0a0b10'],
    props: ['🕵️', '❓', '🔦'],
    ambient: 'spotlight',
    pitch: 0.88,
    sting: 'sting',
    chip: '#c9a24b',
    dark: true,
  },
};

export const themeFor = (v: Variant | undefined): GameTheme | null => (v && THEMES[v]) || null;

/** Text on the accent colour: dark on a light accent, white on a dark one. */
function onColour(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? '#10131a' : '#ffffff';
}

/** The theme as CSS variables, set on the table screen (see styles/themes.css). */
export function themeVars(t: GameTheme): Record<string, string> {
  return {
    '--t-felt': t.felt,
    '--t-rail-a': t.rail[0],
    '--t-rail-b': t.rail[1],
    '--t-bg-a': t.bg[0],
    '--t-bg-b': t.bg[1],
    '--t-back-a': t.back[0],
    '--t-back-b': t.back[1],
    '--t-accent': t.accent,
    '--t-on-accent': onColour(t.accent),
    '--t-chip': t.chip,
  };
}

/** The picture on a game's card on Home: its gradient and the three emoji that float on it. Hold'em has no table theme, but it has a card. */
export function cardArt(v: Variant): { card: [string, string]; props: [string, string, string]; mood: string } {
  const t = THEMES[v];
  if (t) return { card: t.card, props: t.props, mood: t.mood };
  return { card: ['#1f8a57', '#0a3b25'], props: ['♠️', '🃏', '♥️'], mood: 'The classic. Your felt, your rules.' };
}

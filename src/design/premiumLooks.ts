// FlipUp Premium's looks, as colours the iPhone app can paint: each card pack's back and each chat bubble colour.
// The web draws them in premium.css (`.pack-<id>`, `.fx-<id>`) with patterns and moving shines; the app keeps the
// same colours with a simpler finish. premiumLooks.test.ts checks every colour against the global.css tokens.

export interface CardBackLook {
  /** The base, top-left to bottom-right (160deg). */
  base: readonly string[];
  /** The fine pattern laid over it. */
  ink: string;
  /** The glow round the card. */
  glow: string;
}

/** The plain back everyone has, and each pack in CARD_PACKS (the venue trophies too). */
export const CARD_BACKS: Record<string, CardBackLook> = {
  plain: { base: ['#1f2937', '#0b0b12'], ink: 'rgba(255, 255, 255, 0.12)', glow: 'transparent' },
  gold: { base: ['#fff3b0', '#ffd24a', '#f59e0b', '#a85a00'], ink: 'rgba(120, 70, 0, 0.32)', glow: 'rgba(255, 196, 61, 0.55)' },
  neon: { base: ['#1a0b3b', '#0a0b1f'], ink: 'rgba(61, 245, 255, 0.4)', glow: 'rgba(61, 245, 255, 0.55)' },
  aurora: { base: ['#00cfa8', '#6b5bff', '#ff5cc8'], ink: 'rgba(255, 255, 255, 0.4)', glow: 'rgba(0, 207, 168, 0.5)' },
  holo: { base: ['#ff3b30', '#ff9f0a', '#ffd60a', '#30d158', '#0a84ff', '#bf5af2'], ink: 'rgba(255, 255, 255, 0.28)', glow: 'rgba(255, 255, 255, 0.45)' },
  ruby: { base: ['#8c0f26', '#3d0410'], ink: 'rgba(255, 120, 60, 0.28)', glow: 'rgba(255, 138, 31, 0.5)' },
  emerald: { base: ['#0f9d64', '#064a32'], ink: 'rgba(255, 255, 255, 0.18)', glow: 'rgba(40, 220, 140, 0.5)' },
  sapphire: { base: ['#2a5bd7', '#0b1f5c'], ink: 'rgba(255, 255, 255, 0.14)', glow: 'rgba(60, 120, 255, 0.5)' },
  obsidian: { base: ['#2a2238', '#07060b'], ink: 'rgba(190, 140, 255, 0.25)', glow: 'rgba(150, 90, 255, 0.45)' },
  sakura: { base: ['#ffb3d0', '#e0679a'], ink: 'rgba(255, 255, 255, 0.55)', glow: 'rgba(255, 150, 200, 0.5)' },
  galaxy: { base: ['#3b1f8a', '#0c0628'], ink: 'rgba(255, 90, 200, 0.45)', glow: 'rgba(140, 80, 255, 0.55)' },
  circuit: { base: ['#0f3326', '#06140f'], ink: 'rgba(60, 255, 150, 0.35)', glow: 'rgba(40, 255, 140, 0.45)' },
  'v-garage': { base: ['#ffb340', '#e0701a'], ink: 'rgba(255, 255, 255, 0.16)', glow: 'rgba(255, 255, 255, 0.3)' },
  'v-backroom': { base: ['#2bb673', '#0f6b4a'], ink: 'rgba(255, 255, 255, 0.16)', glow: 'rgba(255, 255, 255, 0.3)' },
  'v-riverboat': { base: ['#3aa0ff', '#1c4fb8'], ink: 'rgba(255, 255, 255, 0.16)', glow: 'rgba(255, 255, 255, 0.3)' },
  'v-casino': { base: ['#ff5f6d', '#b0124a'], ink: 'rgba(255, 255, 255, 0.16)', glow: 'rgba(255, 255, 255, 0.3)' },
  'v-strip': { base: ['#c04bff', '#5b21b6'], ink: 'rgba(255, 255, 255, 0.16)', glow: 'rgba(255, 255, 255, 0.3)' },
  'v-monaco': { base: ['#ff9f0a', '#c2410c'], ink: 'rgba(255, 255, 255, 0.16)', glow: 'rgba(255, 255, 255, 0.3)' },
  'v-penthouse': { base: ['#3f4a5c', '#0b0f19'], ink: 'rgba(255, 255, 255, 0.16)', glow: 'rgba(255, 255, 255, 0.3)' },
  'v-yacht': { base: ['#ffd60a', '#0a84ff'], ink: 'rgba(255, 255, 255, 0.16)', glow: 'rgba(255, 255, 255, 0.3)' },
};

export const cardBack = (pack: string | undefined): CardBackLook => (pack && CARD_BACKS[pack]) || CARD_BACKS.plain;

export interface BubbleLook {
  /** The fill, at 135deg (Fire runs bottom to top). */
  fill: readonly string[];
  /** The text colour. */
  ink: string;
  /** Neon's outline. */
  edge?: string;
  /** A soft glow round it. */
  glow?: string;
  angle?: number;
}

const DARK_INK = '#3d2200';

/** Each colour in BUBBLE_STYLES. */
export const BUBBLE_LOOKS: Record<string, BubbleLook> = {
  green: { fill: ['#34c759', '#1f9d43'], ink: '#ffffff' },
  sunset: { fill: ['#ff3d8b', '#ff9f43'], ink: '#ffffff', glow: 'rgba(255, 61, 139, 0.45)' },
  gold: { fill: ['#f2a900', '#ffe27a', '#f2a900'], ink: DARK_INK },
  aurora: { fill: ['#00cfa8', '#6b5bff', '#ff5cc8'], ink: '#ffffff' },
  neon: { fill: ['#0a0b1f', '#0a0b1f'], ink: '#3df5ff', edge: '#3df5ff', glow: 'rgba(61, 245, 255, 0.55)' },
  rainbow: { fill: ['#ff3b30', '#ff9f0a', '#ffd60a', '#30d158', '#0a84ff', '#bf5af2'], ink: '#ffffff' },
  ocean: { fill: ['#0a84ff', '#00c7be', '#0a84ff'], ink: '#ffffff' },
  candy: { fill: ['#ffb3de', '#d7b8ff'], ink: DARK_INK },
  fire: { fill: ['#ff2d00', '#ff7a00', '#ffd60a'], ink: '#ffffff', angle: 0 },
  galaxy: { fill: ['#5b2bd6', '#160a40'], ink: '#ffffff' },
  frost: { fill: ['#f2fbff', '#a9dcff'], ink: DARK_INK },
  toxic: { fill: ['#b6ff3b', '#39d353'], ink: DARK_INK },
};

export const bubbleLook = (fx: string | undefined): BubbleLook | undefined => (fx ? BUBBLE_LOOKS[fx] : undefined);

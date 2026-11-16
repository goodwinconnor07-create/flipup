// FlipUp's design tokens: the one source for colour, type, spacing, radius, shadow and motion, shared by the
// web app (src/styles/global.css) and the iPhone app (native/src/theme). Pure data: no DOM, no React Native.
//
// The web's CSS custom properties still hold their own copies; `tokens.test.ts` checks every value here against
// global.css so the two never drift. Change a value here and in global.css together.

/** One palette per appearance. Apple's system colours, with FlipUp's party colours on top. */
export const palette = {
  light: {
    /** The page. */
    background: '#ffffff',
    /** Grouped cells and flat cards (iOS secondarySystemBackground). */
    cell: '#f2f2f7',
    /** A cell while it's pressed, and the third level of fill. */
    cellPressed: '#e5e5ea',
    separator: '#e5e5ea',
    label: '#000000',
    secondaryLabel: '#3c3c43',
    tertiaryLabel: '#6c6c70',
    quaternaryLabel: '#aeaeb2',
    /** System blue: links, the chosen tab, primary buttons. */
    accent: '#007aff',
    /** Text on a saturated fill. White in both appearances. */
    onColor: '#ffffff',
    green: '#15803d',
    red: '#ff3b30',
    gold: '#ff9f0a',
    pink: '#ff2d55',
    violet: '#af52de',
    indigo: '#5856d6',
    slate: '#64748b',
    switchOn: '#34c759',
    /** The chosen segment in a segmented control: raised white, or lifted grey in dark mode. */
    segmentOn: '#ffffff',
    /** The dim behind a sheet or an alert. */
    scrim: 'rgba(255, 255, 255, 0.86)',
    /** The table: speech bubbles (grey for check and fold and talk, blue to top for chips going in). */
    bubbleGrey: '#e9e9eb',
    bubbleBlue: '#0a7aff',
    bubbleBlueHi: '#3b9bff',
    /** The Fold button, and the bet tags under the seats. */
    redBg: '#ffecf0',
    redInk: '#b91c1c',
    goldBg: '#fff6df',
    goldInk: '#b45309',
    /** The odds tag during a run-out. */
    contrast: '#0b0b12',
    onContrast: '#ffffff',
    /** The win banner on the felt. */
    surface: '#ffffff',
    /** The table code chip. */
    blueBg: '#e5f0ff',
    blueInk: '#0062d6',
    /** The plain card back, top-left to bottom-right. */
    cardBack1: '#1f2937',
    cardBack2: '#0b0b12',
  },
  dark: {
    background: '#000000',
    cell: '#1c1c1e',
    cellPressed: '#2c2c2e',
    separator: '#38383a',
    label: '#ffffff',
    secondaryLabel: '#ebebf5',
    tertiaryLabel: '#98989f',
    quaternaryLabel: '#636366',
    accent: '#0a84ff',
    onColor: '#ffffff',
    green: '#30d158',
    red: '#ff453a',
    gold: '#ff9f0a',
    pink: '#ff375f',
    violet: '#bf5af2',
    indigo: '#5e5ce6',
    slate: '#64748b',
    switchOn: '#30d158',
    segmentOn: '#636366',
    scrim: 'rgba(0, 0, 0, 0.86)',
    bubbleGrey: '#262628',
    bubbleBlue: '#0a7aff',
    bubbleBlueHi: '#3b9bff',
    redBg: 'rgba(255, 69, 58, 0.16)',
    redInk: '#ff6961',
    goldBg: 'rgba(255, 159, 10, 0.15)',
    goldInk: '#ffd60a',
    contrast: '#f4f4f8',
    onContrast: '#0b0b12',
    surface: '#1c1c1e',
    blueBg: 'rgba(10, 132, 255, 0.18)',
    blueInk: '#409cff',
    cardBack1: '#3b4256',
    cardBack2: '#161821',
  },
} as const;

export type Appearance = keyof typeof palette;
export type PaletteColor = keyof (typeof palette)['light'];

/** Loud colours for what you tap to play. The same in both appearances. */
export const party = {
  pink: '#ff3d8b',
  orange: '#ff8a1f',
  yellow: '#ffd60a',
  blue: '#2f7bff',
  green: '#19c26b',
  /** The darker bottom edge under a chunky party button. */
  edge: 'rgba(0, 0, 0, 0.24)',
  /** The low end of each gradient (the system colours' -lo shades). */
  blueLo: '#0062d6',
  greenLo: '#15803d',
} as const;

/** The gradients on the big play tiles: top colour to bottom colour. */
export const gradients = {
  blue: [party.blue, party.blueLo],
  green: [party.green, party.greenLo],
  pink: [party.pink, '#c4123a'],
  gold: ['#ffd24a', '#f59e0b'],
} as const satisfies Record<string, readonly [string, string]>;

/** Confetti: the party mix, gold for Premium, and greens and gold for a win. */
export const confettiColors = {
  party: ['#f97316', '#ec4899', '#ef4444', '#22c55e', '#facc15', '#3b82f6'],
  gold: ['#fff3b0', '#ffd24a', '#f59e0b', '#ffffff', '#ff8a1f', '#ff3d8b'],
  win: ['#16a34a', '#22c55e', '#facc15', '#fde68a', '#3b82f6'],
};

/**
 * Each mini game's own table: the felt, and the rail's gradient (top colour to bottom). Texas Hold'em keeps the
 * player's felt and rail, so it isn't here. The web's `--theme-<game>-*` tokens in global.css.
 */
export const tableThemes = {
  ghost: { felt: '#2e2650', rail: ['#5b4d8a', '#120d22'] },
  imposter: { felt: '#5b1e22', rail: ['#c9a46a', '#4a3518'] },
  pineapple: { felt: '#0e8577', rail: ['#ffd34d', '#a8740c'] },
  deuces: { felt: '#6b2bd6', rail: ['#ff5fae', '#6e1650'] },
  pittsburgh: { felt: '#1d1d20', rail: ['#ffbf2e', '#6b4c00'] },
  dice: { felt: '#a8182f', rail: ['#efe7d4', '#8f8469'] },
  redriver: { felt: '#7c1414', rail: ['#3a3a44', '#0d0d12'] },
  crucifix: { felt: '#2a1f3d', rail: ['#d7d4de', '#4b4757'] },
  circle: { felt: '#0f3a57', rail: ['#d9ab52', '#5c3f0b'] },
  memory: { felt: '#2b1f5c', rail: ['#b9a7ff', '#3b2a86'] },
  beanstalk: { felt: '#1f5f2e', rail: ['#9c6b3c', '#3d2410'] },
  bjholdem: { felt: '#0d5a3a', rail: ['#2b2b31', '#0a0a0d'] },
  power: { felt: '#101a3a', rail: ['#3ee0ff', '#0b4d6b'] },
  missions: { felt: '#123a2e', rail: ['#d4a94e', '#5a4214'] },
  slide: { felt: '#13414a', rail: ['#9be15d', '#3c6e1b'] },
  headband: { felt: '#2c1640', rail: ['#ff4fd8', '#5c0f52'] },
  belt: { felt: '#2b2f36', rail: ['#f5c518', '#3a3200'] },
  onion: { felt: '#4a2a1c', rail: ['#d98c4a', '#5a3115'] },
  chain: { felt: '#3a1f1a', rail: ['#c9ccd6', '#3c3c46'] },
  elevator: { felt: '#1e2a3a', rail: ['#d9b26f', '#6a4d1f'] },
  plo: { felt: '#3a1020', rail: ['#e8c37a', '#5c3d10'] },
} as const satisfies Record<string, { felt: string; rail: readonly [string, string] }>;

/**
 * The type ramp: Apple's text styles at the default Dynamic Type size, with FlipUp's weights (heavy large titles
 * and main tap targets, bold card headers, regular body). `leading` is the line height.
 * The phone scales every size with the person's text size setting; `maxScale` caps how far, so a 34pt title
 * doesn't outgrow the screen at the largest accessibility sizes.
 */
export const type = {
  largeTitle: { size: 34, leading: 41, weight: '800', maxScale: 1.5 },
  title1: { size: 28, leading: 34, weight: '700', maxScale: 1.6 },
  title2: { size: 22, leading: 28, weight: '700', maxScale: 1.7 },
  title3: { size: 20, leading: 25, weight: '600', maxScale: 1.8 },
  headline: { size: 17, leading: 22, weight: '600', maxScale: 2 },
  body: { size: 17, leading: 22, weight: '400', maxScale: 2 },
  callout: { size: 16, leading: 21, weight: '400', maxScale: 2 },
  subhead: { size: 15, leading: 20, weight: '400', maxScale: 2 },
  footnote: { size: 13, leading: 18, weight: '400', maxScale: 2 },
  caption1: { size: 12, leading: 16, weight: '400', maxScale: 2 },
  caption2: { size: 11, leading: 13, weight: '400', maxScale: 2 },
} as const satisfies Record<string, { size: number; leading: number; weight: '400' | '600' | '700' | '800'; maxScale: number }>;

export type TypeStyle = keyof typeof type;

/** Spacing on a 4-point grid. Screen edges use `md` (16). */
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Corner radii. Every non-capsule corner on iOS also gets borderCurve: 'continuous'. */
export const radius = {
  xs: 4,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  full: 999,
} as const;

/** Three soft levels, as CSS box-shadow strings (React Native's boxShadow takes the same syntax). */
export const shadows = {
  light: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.08)',
    soft: '0 4px 16px -8px rgba(0, 0, 0, 0.18)',
    raised: '0 6px 20px -10px rgba(0, 0, 0, 0.28)',
  },
  dark: {
    sm: '0 2px 8px -4px rgba(0, 0, 0, 0.6)',
    soft: '0 8px 24px -16px rgba(0, 0, 0, 0.7)',
    raised: '0 12px 28px -14px rgba(0, 0, 0, 0.8)',
  },
} as const;

/**
 * Motion. Press: the button dips to `pressScale` and dims to `pressOpacity` in `pressIn` ms, then springs back
 * with `pressSpring`. Screens and sheets use the platform's own transitions; their target time is `screen`.
 */
export const motion = {
  pressIn: 80,
  pressOut: 220,
  pressScale: 0.97,
  pressOpacity: 0.85,
  pressSpring: { mass: 1, stiffness: 450, damping: 30 },
  fast: 150,
  base: 250,
  screen: 350,
  sheetOut: 160,
  /** Exits run 20% shorter than the entrance they undo (250 in, 200 out). See docs/MOTION.md, "The 20 rules". */
  exit: 200,
  /** Gap between rows or details that settle one after another. */
  stagger: 30,
  /** A popover, menu or chip starts here, never from 0, so it grows out of something that's already there. */
  popFrom: 0.95,
  /** How far a moving knob stretches along its travel (its other side shrinks so its area stays the same). */
  stretch: 0.12,
  /** How far an object that moves across the screen bows out of a straight line, in points. */
  arc: 32,
  /** Menus and dropdowns open in this range of milliseconds. */
  dropdown: { min: 150, max: 250 },
} as const;

/** Tap targets are never smaller than this (Apple's minimum). */
export const minTap = 44;

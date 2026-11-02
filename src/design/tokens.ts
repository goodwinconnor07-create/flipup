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
} as const;

/** Tap targets are never smaller than this (Apple's minimum). */
export const minTap = 44;

// The app icon, as the launch cover draws it. Every number copies scripts/makeAppIcon.mjs (the 1024 square the
// icon is drawn on), so the cover shows exactly the icon on the Home Screen. tests/launch-mark.test.ts checks them
// against the layer in assets/expo.icon and against the script's colours.

/** The icon's canvas. */
export const ICON_SIZE = 1024;
/** The spade with the up chevron cut through it (even-odd), centred on 0,0: `assets/expo.icon/Assets/spade.svg`. */
export const MARK =
  'M0 -60 C6 -46 22 -34 38 -20 C52 -8 58 4 58 18 C58 37 44 49 27 49 C15 49 7 44 3.5 37 C5 48 12 57 25 62 C26 63 25.5 65 24 65 L-24 65 C-25.5 65 -26 63 -25 62 C-12 57 -5 48 -3.5 37 C-7 44 -15 49 -27 49 C-44 49 -58 37 -58 18 C-58 4 -52 -8 -38 -20 C-22 -34 -6 -46 0 -60 Z M-27.30 14.70 L-5.30 -7.30 A7.5 7.5 0 0 1 5.30 -7.30 L27.30 14.70 A7.5 7.5 0 0 1 16.70 25.30 L0 8.61 L-16.70 25.30 A7.5 7.5 0 0 1 -27.30 14.70 Z';
/** Where the spade sits on the canvas. */
export const PLACE = 'translate(512 500) scale(5.15)';
export const ICON_COLORS = {
  violetTop: '#4a7bf0',
  violetBottom: '#152f86',
  spadeTop: '#ffffff',
  spadeBottom: '#e3ecff',
  shadow: '#0b1a5c',
} as const;
/** iOS's icon corner, as a fraction of the side. */
export const ICON_RADIUS = 0.2237;

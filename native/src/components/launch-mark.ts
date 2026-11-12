// The app icon's art, the one copy: scripts/makeAppIcon.mjs imports it (run with tsx) to write the icon, and the
// launch cover draws it, so the cover always shows exactly the icon on the Home Screen. tests/launch-mark.test.ts
// checks the written icon against it.
//
// The icon is drawn like the game pictures (src/design/gameArt.ts, "stickers"): a flat blue field with a lighter
// spot, and one white playing card, tilted, with the same dark outline and hard shadow, the FlipUp spade and up
// chevron where the ace's suit would be. No strokes, masks or filters, so Icon Composer's SVG reader can take it: the
// outline is a dark card a little bigger behind the white one.

/** The icon's canvas. */
export const ICON_SIZE = 1024;
/** iOS's icon corner, as a fraction of the side. */
export const ICON_RADIUS = 0.2237;

/** The spade with the up chevron cut through it (even-odd), centred on 0,0, about 116 wide and 125 tall. */
export const MARK =
  'M0 -60 C6 -46 22 -34 38 -20 C52 -8 58 4 58 18 C58 37 44 49 27 49 C15 49 7 44 3.5 37 C5 48 12 57 25 62 C26 63 25.5 65 24 65 L-24 65 C-25.5 65 -26 63 -25 62 C-12 57 -5 48 -3.5 37 C-7 44 -15 49 -27 49 C-44 49 -58 37 -58 18 C-58 4 -52 -8 -38 -20 C-22 -34 -6 -46 0 -60 Z M-27.30 14.70 L-5.30 -7.30 A7.5 7.5 0 0 1 5.30 -7.30 L27.30 14.70 A7.5 7.5 0 0 1 16.70 25.30 L0 8.61 L-16.70 25.30 A7.5 7.5 0 0 1 -27.30 14.70 Z';

export const ICON_COLORS = {
  /** The field: the deck's back blue, flat like a game picture's. */
  field: '#2b5fe3',
  /** The field at night (the icon's dark look). */
  fieldDark: '#14245a',
  /** The game pictures' outline and hard shadow (`INK` in gameArt.ts). */
  ink: '#14141c',
  card: '#ffffff',
  /** The spade: the deck's diamond blue (`SUIT_COLOUR['♦']` in gameArt.ts). */
  mark: '#2563eb',
} as const;

// The game pictures are drawn on a 100 square: this is the same picture at 1024.
const K = ICON_SIZE / 100;
const n = (v: number) => Math.round(v * 100) / 100;
const rr = (x: number, y: number, w: number, h: number, r: number) =>
  `M${n(x + r)} ${n(y)}h${n(w - 2 * r)}a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(r)}v${n(h - 2 * r)}a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(r)}h${n(-(w - 2 * r))}a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(-r)}v${n(-(h - 2 * r))}a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(-r)}z`;
const circle = (cx: number, cy: number, r: number) => `M${n(cx - r)} ${n(cy)}a${n(r)} ${n(r)} 0 1 0 ${n(r * 2)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-r * 2)} 0z`;

/** The card's size against a game card (1.22, as big as Crazy Deuces' two), its tilt and where it sits. */
const SCALE = 1.22;
const CARD = `translate(${n(50 * K)} ${n(49 * K)}) rotate(-8) scale(${n(SCALE * K)})`;
/** Half the outline (3 on the 100 square, like every game picture), in the card's own units. */
const HALF = 3 / SCALE / 2;
/** The hard shadow drops 3.4 on the 100 square, as under every game card. */
const DROP = 3.4 / SCALE;
const outline = rr(-21 - HALF, -30 - HALF, 42 + 2 * HALF, 60 + 2 * HALF, 6.5 + HALF);

export interface IconPath {
  d: string;
  fill: string;
  opacity?: number;
  t?: string;
  evenOdd?: boolean;
}

/** Everything over the field, back to front, on the 1024 canvas. */
export const ICON_ART: IconPath[] = [
  // The lighter spot behind the subject (white, so it works on the night field too).
  { d: circle(512, 512, 41 * K), fill: '#ffffff', opacity: 0.15 },
  { d: outline, fill: ICON_COLORS.ink, opacity: 0.24, t: `${CARD} translate(0 ${n(DROP)})` },
  { d: outline, fill: ICON_COLORS.ink, t: CARD },
  { d: rr(-21 + HALF, -30 + HALF, 42 - 2 * HALF, 60 - 2 * HALF, 6.5 - HALF), fill: ICON_COLORS.card, t: CARD },
  { d: MARK, fill: ICON_COLORS.mark, t: `${CARD} scale(0.24)`, evenOdd: true },
];

/** The art as SVG elements, for the icon script and its layer file. */
export const iconArtSvg = (): string =>
  ICON_ART.map(
    (p) => `<path d="${p.d}" fill="${p.fill}"${p.opacity !== undefined ? ` fill-opacity="${p.opacity}"` : ''}${p.evenOdd ? ' fill-rule="evenodd"' : ''}${p.t ? ` transform="${p.t}"` : ''}/>`,
  ).join('');

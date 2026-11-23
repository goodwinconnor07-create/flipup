/**
 * Which colour the status bar's time, signal and battery are drawn in, from the page on screen.
 *
 * The app sets it from one place (`StatusBarFollower` in the root layout) rather than per screen. Per-screen styles
 * went through the native tab bar, which passed on the wrong screen's choice: white text on the light Profile page,
 * black on the dark Train page, and a fade between them on every move.
 *
 * - `light` (white text) on the pages that are always dark, in either mode.
 * - The phone's own look everywhere else (dark text in light mode).
 * - `null` for a sheet: it keeps whatever the page under it had, so opening one never flips the bar.
 */
export type BarStyle = 'light' | 'dark';

/** Pages drawn dark in light mode too (Home, Train, the lobbies and the other moving-light pages). */
const ALWAYS_DARK = [
  '/',
  '/train',
  '/party-room',
  '/play-friends',
  '/party-playlist',
  '/play-bots',
  '/bot-lab',
  '/bot-lab-edit',
  '/premium',
  '/replay',
  '/range-session',
  '/welcome',
  '/share',
  '/replays',
];

/** Routes that open as sheets over another page (the same list as `SHEETS` in `app/_layout.tsx`). */
const SHEETS = [
  '/game',
  '/lobby-game',
  '/premium-perk',
  '/share-card',
  '/table-menu',
  '/table-standings',
  '/table-theme',
  '/table-settings',
  '/range-breakdown',
  '/range-how',
  '/hand-rankings',
  '/table-log',
  '/card-packs',
  '/blocked',
  '/emoji',
  '/join',
  '/party-sheet',
];

/** `/replay` matches `/replay/abc` but not `/replays`. */
const matches = (path: string, route: string) => path === route || (route !== '/' && path.startsWith(`${route}/`));

export function barStyleFor(pathname: string, dark: boolean): BarStyle | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (SHEETS.some((r) => matches(path, r))) return null;
  if (ALWAYS_DARK.some((r) => matches(path, r))) return 'light';
  return dark ? 'light' : 'dark';
}

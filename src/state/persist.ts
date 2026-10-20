// Everything the app keeps on the phone between visits.

import { DEFAULT_EMOJI, DEFAULT_SETTINGS, isCode, isDeviceId, isEmoji, newId, validSettings, type Game, type Settings } from '../game';

const KEYS = {
  device: 'flipup.device',
  profile: 'flipup.profile',
  session: 'flipup.session',
  settings: 'flipup.settings',
} as const;

export interface Profile {
  name: string;
  emoji: string;
}

export interface Session {
  /** local = bots only, on this phone. online = the server holds the table. */
  mode: 'local' | 'online';
  code: string | null;
  /** Local: the whole table. Online: the last state the server sent (null until it arrives). */
  game: Game | null;
  /** Online: take a seat as soon as the table loads. */
  joining?: boolean;
  /** Local: a bot challenge in progress (see challenges.ts). */
  challenge?: import('./challenges').Running;
}

export function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Saves a value (null removes it). Returns false if the phone wouldn't keep it (storage full or blocked); the app still works for this visit. */
export function write(key: string, value: unknown): boolean {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** A random id for this phone, created on first use. Tables use it to know who's who. */
export function loadDeviceId(): string {
  const saved = read<string>(KEYS.device);
  if (isDeviceId(saved)) return saved;
  const id = `d${newId(20)}`;
  write(KEYS.device, id);
  return id;
}

export function loadProfile(): Profile {
  const p = read<Profile>(KEYS.profile);
  return {
    name: typeof p?.name === 'string' ? p.name : '',
    emoji: isEmoji(p?.emoji) ? p.emoji : DEFAULT_EMOJI,
  };
}

export function saveProfile(profile: Profile): void {
  write(KEYS.profile, profile);
}

/** Saved settings laid over the defaults. Anything that isn't a valid table (edited or damaged storage) gives the defaults. */
function cleanSettings(raw: unknown): Settings {
  const s = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Partial<Settings>) : {};
  const merged: Settings = {
    startingStack: s.startingStack ?? DEFAULT_SETTINGS.startingStack,
    smallBlind: s.smallBlind ?? DEFAULT_SETTINGS.smallBlind,
    bigBlind: s.bigBlind ?? DEFAULT_SETTINGS.bigBlind,
    rebuys: s.rebuys ?? DEFAULT_SETTINGS.rebuys,
    turnSeconds: s.turnSeconds ?? DEFAULT_SETTINGS.turnSeconds,
  };
  if (s.blindMinutes !== undefined) merged.blindMinutes = s.blindMinutes;
  if (s.blindCap !== undefined) merged.blindCap = s.blindCap;
  return validSettings(merged) ? merged : { ...DEFAULT_SETTINGS };
}

/** The table settings this phone used last, so the next table starts the same way. */
export function loadSettings(): Settings {
  return cleanSettings(read<unknown>(KEYS.settings));
}

export function saveSettings(settings: Settings): void {
  write(KEYS.settings, settings);
}

const isObject = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** Enough of a table to draw it. A saved game that fails this would crash the app on every start, so it's dropped. */
function looksLikeGame(g: unknown): g is Game {
  if (!isObject(g) || typeof g.id !== 'string' || !isObject(g.settings) || !Array.isArray(g.players) || !Array.isArray(g.logs)) return false;
  if (!g.players.every((p) => isObject(p) && typeof p.id === 'string' && typeof p.name === 'string' && isNum(p.stack) && isNum(p.seat))) return false;
  const h = g.hand;
  if (h === null || h === undefined) return true;
  return isObject(h) && Array.isArray(h.seats) && Array.isArray(h.board);
}

function looksLikeRunning(c: unknown): c is NonNullable<Session['challenge']> {
  if (!isObject(c) || typeof c.bot !== 'string' || !isObject(c.progress)) return false;
  const p = c.progress;
  if (!isNum(p.hands) || !isNum(p.pots) || !isNum(p.bluffs) || !isNum(p.start) || !isNum(p.last) || typeof p.bigPot !== 'boolean') return false;
  return c.over === undefined || (isObject(c.over) && typeof c.over.won === 'boolean' && isNum(c.over.stars));
}

export function loadSession(): Session | null {
  const s = read<Session>(KEYS.session);
  if (!isObject(s) || (s.mode !== 'local' && s.mode !== 'online')) return null;
  if (s.game != null && !looksLikeGame(s.game)) return null;
  if (s.mode === 'local' && !s.game) return null;
  if (s.mode === 'online' && !isCode(s.code)) return null;
  return {
    mode: s.mode,
    code: typeof s.code === 'string' ? s.code : null,
    game: s.game ?? null,
    joining: s.joining === true ? true : undefined,
    // A challenge only rides on a bots-only table, and only if its numbers are intact.
    challenge: s.mode === 'local' && looksLikeRunning(s.challenge) ? s.challenge : undefined,
  };
}

export function saveSession(session: Session | null): void {
  // If the new copy won't fit, don't leave an older one behind: reopening the app would resume a table that has moved on.
  if (!write(KEYS.session, session)) write(KEYS.session, null);
}

// ── Table look, sound, and the Home screen's memory ─────────────────────────

export type Rail = 'dark' | 'wood' | 'light';

export interface TableLook {
  /** Felt colour, "#rrggbb". */
  felt: string;
  rail: Rail;
}

export const FELTS: { name: string; felt: string }[] = [
  { name: 'Classic', felt: '#1f7a4d' },
  { name: 'Teal', felt: '#0f766e' },
  { name: 'Midnight', felt: '#1d3a8a' },
  { name: 'Violet', felt: '#5b3aa6' },
  { name: 'Burgundy', felt: '#8b1e3f' },
  { name: 'Sunset', felt: '#c2410c' },
  { name: 'Slate', felt: '#3b4252' },
  { name: 'Rose', felt: '#be4f7a' },
];
export const RAILS: { id: Rail; name: string }[] = [
  { id: 'dark', name: 'Dark' },
  { id: 'wood', name: 'Wood' },
  { id: 'light', name: 'Light' },
];

const DEFAULT_LOOK: TableLook = { felt: FELTS[0].felt, rail: 'dark' };

export function loadTableLook(): TableLook {
  const l = read<TableLook>('flipup.table');
  return {
    felt: typeof l?.felt === 'string' && /^#[0-9a-f]{6}$/i.test(l.felt) ? l.felt : DEFAULT_LOOK.felt,
    rail: l?.rail === 'wood' || l?.rail === 'light' || l?.rail === 'dark' ? l.rail : DEFAULT_LOOK.rail,
  };
}

export function saveTableLook(look: TableLook): void {
  write('flipup.table', look);
}

/** Liquid Glass is on unless the player turned it off. */
export function loadGlass(): boolean {
  return read<boolean>('flipup.glass') !== false;
}

export function saveGlass(glass: boolean): void {
  write('flipup.glass', glass);
}

export function loadDark(): boolean {
  return read<boolean>('flipup.dark') === true;
}

export function saveDark(dark: boolean): void {
  write('flipup.dark', dark);
}

/** True if the player turned Animations off. Animations are on until they do. */
export function loadCalm(): boolean {
  return read<boolean>('flipup.calm') === true;
}

export function saveCalm(calm: boolean): void {
  write('flipup.calm', calm);
}

export function loadMuted(): boolean {
  return read<boolean>('flipup.muted') === true;
}

export function saveMuted(muted: boolean): void {
  write('flipup.muted', muted);
}

/** Chips up or down over every table this phone has finished, for the Home screen. */
export interface Stats {
  net: number;
  tables: number;
  hands: number;
  /** Tables already counted, so leaving twice can't count one twice. */
  counted: string[];
  /** One line per finished table, newest last, for the Insights chart. */
  games: GameResult[];
}

export interface GameResult {
  at: number;
  net: number;
  hands: number;
  players: number;
}

export function loadStats(): Stats {
  const s = read<Stats>('flipup.stats');
  const num = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? n : 0);
  return {
    net: num(s?.net),
    tables: Math.max(0, num(s?.tables)),
    hands: Math.max(0, num(s?.hands)),
    counted: Array.isArray(s?.counted) ? s.counted.filter((x) => typeof x === 'string').slice(-30) : [],
    games: Array.isArray(s?.games)
      ? s.games
          .filter((g) => g && [g.at, g.net, g.hands, g.players].every((n) => typeof n === 'number' && Number.isFinite(n)))
          .map((g) => ({ at: g.at, net: g.net, hands: g.hands, players: g.players }))
          .slice(-40)
      : [],
  };
}

export function saveStats(stats: Stats): void {
  write('flipup.stats', { ...stats, counted: stats.counted.slice(-30), games: stats.games.slice(-40) });
}

/** The last online table this phone sat at, so Home can offer to rejoin it. */
export interface LastTable {
  code: string;
  at: number;
}

export function loadLastTable(): LastTable | null {
  const t = read<LastTable>('flipup.last');
  return isObject(t) && typeof t.code === 'string' && /^[A-Z]{5}$/.test(t.code) && isNum(t.at) ? { code: t.code, at: t.at } : null;
}

export function saveLastTable(table: LastTable | null): void {
  write('flipup.last', table);
}

/** The last game against bots: who sat down and on what terms, for Home's "Play again". */
export interface LastBots {
  bots: string[];
  settings: Settings;
  at: number;
}

export function loadLastBots(): LastBots | null {
  const t = read<LastBots>('flipup.lastbots');
  const ok = isObject(t) && Array.isArray(t.bots) && t.bots.length > 0 && t.bots.length <= 8 && t.bots.every((b) => typeof b === 'string') && isNum(t.at);
  return ok ? { bots: t.bots, at: t.at, settings: cleanSettings(t.settings) } : null;
}

export function saveLastBots(last: LastBots): void {
  write('flipup.lastbots', last);
}

// ── Daily streak ────────────────────────────────────────────────────────────

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function loadDays(): string[] {
  const d = read<string[]>('flipup.days');
  return Array.isArray(d) ? d.filter((x) => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x)).slice(-120) : [];
}

/** Marks today as a day this phone played a hand. */
export function markPlayedToday(): void {
  const today = dayKey(new Date());
  const days = loadDays();
  if (days.includes(today)) return;
  write('flipup.days', [...days, today].slice(-120));
}

/** Days in a row with a hand played, counting back from today (or from yesterday, so the streak survives until tonight). */
export function loadStreak(): { days: number; today: boolean } {
  const have = new Set(loadDays());
  const d = new Date();
  // Step back from midday, so a daylight-saving jump around midnight can't skip or repeat a date.
  d.setHours(12, 0, 0, 0);
  const today = have.has(dayKey(d));
  if (!today) d.setDate(d.getDate() - 1);
  let days = 0;
  while (have.has(dayKey(d))) {
    days++;
    d.setDate(d.getDate() - 1);
  }
  return { days, today };
}

// ── GTO Coach ───────────────────────────────────────────────────────────────

/** The coach introduces themself once; after that they get straight to it. */
export function loadCoachMet(): boolean {
  return read<boolean>('flipup.coach') === true;
}

export function saveCoachMet(): void {
  write('flipup.coach', true);
}

// Everything the app keeps on the phone between visits.

import { cleanName, DEFAULT_EMOJI, DEFAULT_SETTINGS, isDeviceId, isEmoji, newId, type Game, type Settings } from '../game';

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

export function write(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is full or blocked (some private modes). The app still works for this visit.
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
    // A name saved before the limit was 10 characters is cut to fit.
    name: typeof p?.name === 'string' ? cleanName(p.name) : '',
    emoji: isEmoji(p?.emoji) ? p.emoji : DEFAULT_EMOJI,
  };
}

export function saveProfile(profile: Profile): void {
  write(KEYS.profile, profile);
}

/** The table settings this phone used last, so the next table starts the same way. */
export function loadSettings(): Settings {
  const s = read<Partial<Settings>>(KEYS.settings);
  return { ...DEFAULT_SETTINGS, ...(s && typeof s === 'object' ? s : {}) };
}

export function saveSettings(settings: Settings): void {
  write(KEYS.settings, settings);
}

export function loadSession(): Session | null {
  const s = read<Session>(KEYS.session);
  if (!s || (s.mode !== 'local' && s.mode !== 'online')) return null;
  if (s.mode === 'local' && !s.game) return null;
  if (s.mode === 'online' && !s.code) return null;
  return { mode: s.mode, code: s.code ?? null, game: s.game ?? null, joining: s.joining, challenge: s.challenge };
}

export function saveSession(session: Session | null): void {
  write(KEYS.session, session);
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
    tables: num(s?.tables),
    hands: num(s?.hands),
    counted: Array.isArray(s?.counted) ? s.counted.filter((x) => typeof x === 'string') : [],
    games: Array.isArray(s?.games)
      ? s.games
          .filter((g) => g && [g.at, g.net, g.hands, g.players].every((n) => typeof n === 'number' && Number.isFinite(n)))
          .map((g) => ({ at: g.at, net: g.net, hands: g.hands, players: g.players }))
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
  /** Everyone's emoji at the table, for the Home card. */
  faces?: string[];
}

export function loadLastTable(): LastTable | null {
  const t = read<LastTable>('flipup.last');
  return t && typeof t.code === 'string' && /^[A-Z]{5}$/.test(t.code) && typeof t.at === 'number' ? { ...t, faces: Array.isArray(t.faces) ? t.faces.filter((f) => typeof f === 'string') : [] } : null;
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
  const ok = t && Array.isArray(t.bots) && t.bots.length > 0 && t.bots.every((b) => typeof b === 'string') && typeof t.at === 'number' && t.settings;
  return ok ? { ...t, settings: { ...DEFAULT_SETTINGS, ...t.settings } } : null;
}

export function saveLastBots(last: LastBots): void {
  write('flipup.lastbots', last);
}

// ── Daily streak ────────────────────────────────────────────────────────────

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function loadDays(): string[] {
  const d = read<string[]>('flipup.days');
  return Array.isArray(d) ? d.filter((x) => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x)) : [];
}

/** Marks today as a day this phone played a hand. */
export function markPlayedToday(): void {
  const today = dayKey(new Date());
  const days = loadDays();
  if (days.includes(today)) return;
  write('flipup.days', [...days, today].slice(-730));
}

/** Days in a row with a hand played, counting back from today (or from yesterday, so the streak survives until tonight). */
export function loadStreak(): { days: number; today: boolean } {
  const have = new Set(loadDays());
  const d = new Date();
  const today = have.has(dayKey(d));
  if (!today) d.setDate(d.getDate() - 1);
  let days = 0;
  while (have.has(dayKey(d))) {
    days++;
    d.setDate(d.getDate() - 1);
  }
  return { days, today };
}

export interface StreakInfo {
  days: number;
  today: boolean;
  /** The first day of the current streak, as a local date at midnight. */
  start: Date | null;
  best: number;
  total: number;
  /** The last seven days, oldest first. */
  week: { label: string; played: boolean; today: boolean }[];
}

/** Everything the streak sheet shows. */
export function loadStreakInfo(): StreakInfo {
  const all = loadDays();
  const have = new Set(all);
  const { days, today } = loadStreak();
  let start: Date | null = null;
  if (days > 0) {
    start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (today ? 0 : 1) - (days - 1));
  }
  // Longest run of consecutive days.
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of [...all].sort()) {
    const [y, m, d] = key.split('-').map(Number);
    const at = new Date(y, m - 1, d);
    const next = prev ? new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1) : null;
    run = next && dayKey(next) === key ? run + 1 : 1;
    best = Math.max(best, run);
    prev = at;
  }
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { label: d.toLocaleDateString(undefined, { weekday: 'narrow' }), played: have.has(dayKey(d)), today: i === 6 };
  });
  return { days, today, start, best: Math.max(best, days), total: all.length, week };
}

// ── GTO Coach ───────────────────────────────────────────────────────────────

/** The coach introduces themself once; after that they get straight to it. */
export function loadCoachMet(): boolean {
  return read<boolean>('flipup.coach') === true;
}

export function saveCoachMet(): void {
  write('flipup.coach', true);
}

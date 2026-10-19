// Everything the app keeps on the phone between visits.

import { DEFAULT_EMOJI, DEFAULT_SETTINGS, isDeviceId, isEmoji, newId, type Game, type Settings } from '../game';

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
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
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
    name: typeof p?.name === 'string' ? p.name : '',
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
  return { mode: s.mode, code: s.code ?? null, game: s.game ?? null, joining: s.joining };
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
}

export function loadStats(): Stats {
  const s = read<Stats>('flipup.stats');
  const num = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? n : 0);
  return {
    net: num(s?.net),
    tables: num(s?.tables),
    hands: num(s?.hands),
    counted: Array.isArray(s?.counted) ? s.counted.filter((x) => typeof x === 'string') : [],
  };
}

export function saveStats(stats: Stats): void {
  write('flipup.stats', { ...stats, counted: stats.counted.slice(-30) });
}

/** The last online table this phone sat at, so Home can offer to rejoin it. */
export interface LastTable {
  code: string;
  at: number;
}

export function loadLastTable(): LastTable | null {
  const t = read<LastTable>('flipup.last');
  return t && typeof t.code === 'string' && /^[A-Z]{5}$/.test(t.code) && typeof t.at === 'number' ? t : null;
}

export function saveLastTable(table: LastTable | null): void {
  write('flipup.last', table);
}

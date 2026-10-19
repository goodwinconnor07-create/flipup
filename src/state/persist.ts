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

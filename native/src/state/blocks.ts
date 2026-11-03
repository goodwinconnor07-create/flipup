// Blocking a player (App Store guideline 1.2), kept on this phone only (`flipup.blocked`). A blocked player's name
// and emoji are hidden on your screen and their quick messages are muted, and you aren't seated at a table they
// host. A table seat is known by its phone's id; a party leaderboard row by its member id.
import type { Game, Player } from '@/engine';

import { read, save, useStored } from './storage';

export interface Blocked {
  key: string;
  /** What they were showing when you blocked them, for the list in Settings. */
  name: string;
  emoji: string;
  at: number;
}

const KEY = 'flipup.blocked';

/** The key a table seat is blocked by. */
export const seatKey = (p: Pick<Player, 'deviceId'>): string | null => (p.deviceId ? `d:${p.deviceId}` : null);
/** The key a party member is blocked by. */
export const memberKey = (id: string): string => `m:${id}`;

const list = (): Blocked[] => {
  const v = read<Blocked[]>(KEY, []);
  return Array.isArray(v) ? v : [];
};

export const useBlocked = (): Blocked[] => {
  const v = useStored<Blocked[]>(KEY, []);
  return Array.isArray(v) ? v : [];
};

export const isBlocked = (key: string | null): boolean => !!key && list().some((b) => b.key === key);

export function block(key: string, name: string, emoji: string): void {
  if (isBlocked(key)) return;
  save(KEY, [...list(), { key, name, emoji, at: Date.now() }]);
}

export function unblock(key: string): void {
  save(KEY, list().filter((b) => b.key !== key));
}

/** What a blocked player shows as. */
export const BLOCKED_NAME = 'Blocked';
export const BLOCKED_EMOJI = '👤';

/** The table as this screen shows it: blocked players' names, emoji and bubble looks hidden, their quick messages dropped. */
export function maskBlocked(game: Game): Game {
  const keys = new Set(list().map((b) => b.key));
  if (!keys.size) return game;
  const hidden = new Set(game.players.filter((p) => { const k = seatKey(p); return !!k && keys.has(k); }).map((p) => p.id));
  if (!hidden.size) return game;
  return {
    ...game,
    players: game.players.map((p) => (hidden.has(p.id) ? { ...p, name: BLOCKED_NAME, emoji: BLOCKED_EMOJI, bubble: undefined, cardPack: undefined } : p)),
    reactions: game.reactions && Object.fromEntries(Object.entries(game.reactions).filter(([id]) => !hidden.has(id))),
  };
}

export { KEY as BLOCKED_KEY };

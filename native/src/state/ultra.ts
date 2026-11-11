// ULTRA bots (FlipUp Premium, bots-only tables) remember you between games. After every hand at an ULTRA table this
// phone keeps what the bots have seen you do (your `PlayerRead`: how often you play, raise, fold to bets on each
// street, to c-bets and 3-bets, check-raise, what your bet sizes meant at showdown), and the next ULTRA table starts
// with it (`createTable({ memory })`), so they pick up where they left off. It never leaves the phone.
import { type Game, type PlayerRead } from '@/engine';

import { read, save, useStored } from './storage';

const KEY = 'flipup.ultramemory';
/** Older evidence fades: past this many hands the counts are scaled down, so a player who changes is noticed. */
export const MEMORY_HANDS = 300;

const isRead = (v: unknown): v is PlayerRead => !!v && typeof v === 'object' && typeof (v as PlayerRead).hands === 'number';

export const ultraMemory = (): PlayerRead | undefined => {
  const v = read<unknown>(KEY, null);
  return isRead(v) ? v : undefined;
};

/** How many of your hands the ULTRA bots remember. */
export const useUltraHands = (): number => {
  const v = useStored<unknown>(KEY, null);
  return isRead(v) ? v.hands : 0;
};

export const forgetUltraMemory = (): void => save(KEY, null);

/** Scales every count down so the read holds at most `MEMORY_HANDS` hands of evidence (the recent part is kept). */
export function capped(r: PlayerRead): PlayerRead {
  if (r.hands <= MEMORY_HANDS) return r;
  const k = MEMORY_HANDS / r.hands;
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(r)) out[key] = typeof v === 'number' ? Math.round(v * k * 100) / 100 : v;
  return out as unknown as PlayerRead;
}

let lastSaved = '';
/** After a hand at an ULTRA table: keep what its bots have learned about you. */
export function saveUltraMemory(game: Game, myDeviceId: string): void {
  const mine = game.players.find((p) => p.deviceId === myDeviceId);
  const r = mine && game.reads?.[mine.id];
  if (!r) return;
  const key = `${game.id}/${r.hands}`;
  if (key === lastSaved) return;
  lastSaved = key;
  save(KEY, capped(structuredClone(r)));
}

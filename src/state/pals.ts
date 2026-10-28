// Friends you play parties with. Each phone claims a five letter friend code (a name and a picture on
// the server, no account); you add a friend by typing their code, or with one tap from a party you're in.
// The list lives on this phone. (Friends' AI twins are separate: see friends.ts.)

import { fetchFriendCard, createFriendCard, updateFriendCard } from './api';
import { loadDeviceId, loadProfile, read, write } from './persist';

const KEY = 'flipup.pals';
const MINE = 'flipup.palcode';
const CHANGED = 'flipup:pals';

export interface Pal {
  code: string;
  name: string;
  emoji: string;
  addedAt: number;
}

export function loadPals(): Pal[] {
  const all = read<Pal[]>(KEY);
  return Array.isArray(all) ? all.filter((p) => p && typeof p.code === 'string' && typeof p.name === 'string' && typeof p.emoji === 'string') : [];
}

function savePals(pals: Pal[]): void {
  write(KEY, pals.slice(-100));
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGED));
}

/** Fires when the list changes, so an open screen reads it again. */
export const PALS_CHANGED = CHANGED;

export const isPal = (code: string): boolean => loadPals().some((p) => p.code === code);

/** This phone's friend code, once it has one. */
export const myPalCode = (): string | undefined => read<string>(MINE) ?? undefined;

/** Makes sure this phone has a friend code (and that the server has its latest name and picture). */
export async function ensureMyCode(): Promise<string> {
  const { name, emoji } = loadProfile();
  const body = { deviceId: loadDeviceId(), name, emoji };
  const have = myPalCode();
  if (have && (await updateFriendCard(have, body))) return have;
  const code = await createFriendCard(body);
  write(MINE, code);
  return code;
}

/** Adds a friend by code. Throws with a plain sentence when the code isn't right. */
export async function addPal(code: string): Promise<Pal> {
  if (code === myPalCode()) throw new Error("That's your own code.");
  const card = await fetchFriendCard(code);
  if (!card) throw new Error('No friend with that code. Check it with them.');
  const pal: Pal = { code, name: card.name, emoji: card.emoji, addedAt: loadPals().find((p) => p.code === code)?.addedAt ?? Date.now() };
  savePals([...loadPals().filter((p) => p.code !== code), pal]);
  return pal;
}

export function removePal(code: string): Pal | null {
  const pal = loadPals().find((p) => p.code === code) ?? null;
  savePals(loadPals().filter((p) => p.code !== code));
  return pal;
}

export function restorePal(pal: Pal): void {
  savePals([...loadPals().filter((p) => p.code !== pal.code), pal]);
}

/** Looks everyone up again for their latest name and picture. Never throws. */
export async function refreshPals(): Promise<void> {
  for (const pal of loadPals()) {
    try {
      const card = await fetchFriendCard(pal.code);
      if (card && (card.name !== pal.name || card.emoji !== pal.emoji)) savePals(loadPals().map((p) => (p.code === pal.code ? { ...p, name: card.name, emoji: card.emoji } : p)));
    } catch {
      return;
    }
  }
}

// Friends you play parties with, as on the web (src/state/pals.ts). Each phone claims a five-letter friend code (a
// name and a picture on the server, no account); you add a friend by typing their code, or with one tap from a
// party leaderboard. The list lives on this phone under the web's keys. Campaign isn't in the app, so its cards
// never carry one.
import type { FriendCardInfo } from '@/engine';

import { createFriendCard, fetchFriendCard, updateFriendCard } from './api';
import { deviceId } from './device';
import { read, save, useStored } from './storage';

const KEY = 'flipup.pals';
const MINE = 'flipup.palcode';

export interface Pal {
  code: string;
  name: string;
  emoji: string;
  addedAt: number;
}

const clean = (all: unknown): Pal[] =>
  Array.isArray(all) ? (all as Pal[]).filter((p) => p && typeof p.code === 'string' && typeof p.name === 'string' && typeof p.emoji === 'string') : [];

const EMPTY: Pal[] = [];
export const loadPals = (): Pal[] => clean(read<unknown>(KEY, EMPTY));
const savePals = (pals: Pal[]): void => save(KEY, pals.slice(-100));

/** Your friends, oldest first. Redraws when the list changes. */
export function usePals(): Pal[] {
  return clean(useStored<unknown>(KEY, EMPTY));
}

export const isPal = (code: string): boolean => loadPals().some((p) => p.code === code);

/** This phone's friend code, once it has one. */
export const myPalCode = (): string | undefined => read<string | null>(MINE, null) ?? undefined;
export const useMyPalCode = (): string | null => useStored<string | null>(MINE, null);

const profile = () => read<{ name?: string; emoji?: string } | null>('flipup.profile', null) ?? {};

/** Makes sure this phone has a friend code (and that the server has its latest name and picture). */
export async function ensureMyCode(): Promise<string> {
  const { name = '', emoji = '' } = profile();
  const body = { deviceId: deviceId(), name, emoji };
  const have = myPalCode();
  if (have && (await updateFriendCard(have, body))) return have;
  const code = await createFriendCard(body);
  save(MINE, code);
  return code;
}

const asPal = (card: FriendCardInfo, code: string): Pal => ({ code, name: card.name, emoji: card.emoji, addedAt: loadPals().find((p) => p.code === code)?.addedAt ?? Date.now() });

/** Adds a friend by code. Throws with a plain sentence when the code isn't right. */
export async function addPal(code: string): Promise<Pal> {
  if (code === myPalCode()) throw new Error("That's your own code.");
  const card = await fetchFriendCard(code);
  if (!card) throw new Error('No friend with that code. Check it with them.');
  const pal = asPal(card, code);
  savePals([...loadPals().filter((p) => p.code !== code), pal]);
  return pal;
}

export function removePal(code: string): void {
  savePals(loadPals().filter((p) => p.code !== code));
}

/** Looks everyone up again for their latest name and picture. Never throws. */
export async function refreshPals(): Promise<void> {
  for (const pal of loadPals()) {
    try {
      const card = await fetchFriendCard(pal.code);
      if (!card || (card.name === pal.name && card.emoji === pal.emoji)) continue;
      savePals(loadPals().map((p) => (p.code === pal.code ? { ...p, name: card.name, emoji: card.emoji } : p)));
    } catch {
      return;
    }
  }
}

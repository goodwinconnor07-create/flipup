import { cleanName, DEFAULT_EMOJI, isEmoji, isPackId, packById } from '@/engine';

import { read as readStored, save, useStored } from './storage';
import { hasPremium } from './premium';

export interface Profile {
  name: string;
  emoji: string;
  /** Card back (`CARD_PACKS`, never a campaign trophy here); missing is the plain back. Premium. */
  cardPack?: string;
}

const KEY = 'flipup.profile';
const EMPTY: Profile = { name: '', emoji: DEFAULT_EMOJI };

function clean(p: Partial<Profile> | null | undefined): Profile {
  return {
    name: typeof p?.name === 'string' ? p.name : '',
    emoji: isEmoji(p?.emoji) ? p.emoji : DEFAULT_EMOJI,
    ...(isPackId(p?.cardPack) && !packById(p.cardPack)?.venue ? { cardPack: p.cardPack } : {}),
  };
}

/** Your name and picture. No name yet means you haven't set up a profile. */
export function useProfile(): Profile {
  return clean(useStored<Profile>(KEY, EMPTY));
}

export function readProfile(): Profile {
  return clean(readStored<Profile>(KEY, EMPTY));
}

/** Saves part of your profile; the rest stays as it was. */
export function saveProfile(patch: Partial<Profile>): void {
  const next = { ...readProfile(), ...patch };
  if (next.name) next.name = cleanName(next.name);
  if (!next.cardPack) delete next.cardPack;
  save(KEY, next);
}

<<<<<<< HEAD
/** The card back and gold name this phone shows at a table: only with Premium. (Bubbles are coloured by the move, for everyone.) */
export function wornLook(p: Profile = readProfile(), premium = hasPremium()): { cardPack?: string; gold?: boolean } {
=======
/** The card back this phone shows at a table: only with Premium. (Bubbles are coloured by the move, for everyone.) */
export function wornLook(p: Profile = readProfile(), premium = hasPremium()): { cardPack?: string } {
>>>>>>> origin/main
  return {
    ...(p.cardPack && premium ? { cardPack: p.cardPack } : {}),
    ...(premium && goldNameOn() ? { gold: true } : {}),
  };
}

/** Gold name (Premium): your name shows in gold at online tables. On for Premium until turned off in Settings. */
const GOLD = 'flipup.goldname';
export const useGoldName = (): boolean => useStored<boolean>(GOLD, true) !== false;
export const goldNameOn = (): boolean => readStored<boolean>(GOLD, true) !== false;
export const setGoldName = (on: boolean): void => save(GOLD, on);

import { bubbleById, cleanName, DEFAULT_EMOJI, isBubbleId, isEmoji, isPackId, packById } from '@/engine';

import { read as readStored, save, useStored } from './storage';
import { hasPremium } from './premium';

export interface Profile {
  name: string;
  emoji: string;
  /** Chat bubble effect (`BUBBLE_STYLES`); missing is the plain blue and grey. Green is free, the rest Premium. */
  bubble?: string;
  /** Card back (`CARD_PACKS`, never a campaign trophy here); missing is the plain back. Premium. */
  cardPack?: string;
}

const KEY = 'flipup.profile';
const EMPTY: Profile = { name: '', emoji: DEFAULT_EMOJI };

function clean(p: Partial<Profile> | null | undefined): Profile {
  return {
    name: typeof p?.name === 'string' ? p.name : '',
    emoji: isEmoji(p?.emoji) ? p.emoji : DEFAULT_EMOJI,
    ...(isBubbleId(p?.bubble) ? { bubble: p.bubble } : {}),
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
  if (!next.bubble) delete next.bubble;
  if (!next.cardPack) delete next.cardPack;
  save(KEY, next);
}

/** The bubble effect and card back this phone shows at a table: only what it may use (Premium, or the free Green). */
export function wornLook(p: Profile = readProfile(), premium = hasPremium()): { bubble?: string; cardPack?: string } {
  return {
    ...(p.bubble && (premium || bubbleById(p.bubble)?.free) ? { bubble: p.bubble } : {}),
    ...(p.cardPack && premium ? { cardPack: p.cardPack } : {}),
  };
}

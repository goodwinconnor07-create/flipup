import { cleanName, DEFAULT_EMOJI, isEmoji } from '@/engine';

import { save, useStored } from './storage';

export interface Profile {
  name: string;
  emoji: string;
}

const KEY = 'flipup.profile';
const EMPTY: Profile = { name: '', emoji: DEFAULT_EMOJI };

/** Your name and picture. No name yet means you haven't set up a profile. */
export function useProfile(): Profile {
  const p = useStored<Profile>(KEY, EMPTY);
  return { name: typeof p.name === 'string' ? p.name : '', emoji: isEmoji(p.emoji) ? p.emoji : DEFAULT_EMOJI };
}

export function saveProfile(p: Profile): void {
  save(KEY, { name: cleanName(p.name), emoji: p.emoji });
}

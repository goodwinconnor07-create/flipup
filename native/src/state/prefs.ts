// The table settings each phone keeps for itself, under the web app's keys.
import { cleanLook, type TableLook } from '@design/tableLooks';

import { save, useStored } from './storage';

/**
 * How much the bots say at the table: Off, Some (about two lines in five, and always anything said to you) or
 * Chatty (everything). Older phones stored a switch under the same key: on reads as Chatty, off as Off.
 */
export type TalkLevel = 'off' | 'some' | 'chatty';
const talkLevel = (v: unknown): TalkLevel => (v === false || v === 'off' ? 'off' : v === 'some' ? 'some' : 'chatty');
export const useTalkLevel = (): TalkLevel => talkLevel(useStored<unknown>('flipup.talk', 'chatty'));
export const setTalkLevel = (level: TalkLevel): void => save('flipup.talk', level);
/** Whether a bot's line is shown at this level. `n` is the line's count for that seat, so the pick is steady. */
export function talkPasses(level: TalkLevel, who: string, n: number, toYou: boolean): boolean {
  if (level === 'off') return false;
  if (level === 'chatty' || toYou) return true;
  let h = n;
  for (const c of who) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 5 < 2;
}

/** Table sounds. On until muted. */
export const useMuted = (): boolean => useStored<boolean>('flipup.muted', false) === true;
export const setMuted = (muted: boolean): void => save('flipup.muted', muted);

/** Read without a hook, for the sound player. */
export function isMuted(): boolean {
  try {
    return JSON.parse(localStorage.getItem('flipup.muted') ?? 'false') === true;
  } catch {
    return false;
  }
}

/** Read without a hook, under one of the web's keys. */
function peek<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** The player's own Hold'em table: felt and rail (Table theme). */
export const useTableLook = (): TableLook => cleanLook(useStored<Partial<TableLook> | null>('flipup.table', null));
export const setTableLook = (patch: Partial<TableLook>): void => save('flipup.table', { ...cleanLook(peek('flipup.table', null)), ...patch });

/** Appearance: follow the phone, or always light, or always dark. */
export type AppearancePref = 'auto' | 'light' | 'dark';
const cleanAppearance = (v: unknown): AppearancePref => (v === 'light' || v === 'dark' ? v : 'auto');
export const useAppearance = (): AppearancePref => cleanAppearance(useStored<string>('flipup.appearance', 'auto'));
export const loadAppearance = (): AppearancePref => cleanAppearance(peek('flipup.appearance', 'auto'));
export const setAppearance = (a: AppearancePref): void => save('flipup.appearance', a);

/** Animations: off ("calm") stills everything that moves, like Reduce Motion. */
export const useCalm = (): boolean => useStored<boolean>('flipup.calm', false) === true;
export const setCalm = (calm: boolean): void => save('flipup.calm', calm);

/** Fast bot games: a bots-only table dealt from now on runs its clock at twice the speed. */
export const useFast = (): boolean => useStored<boolean>('flipup.fast', false) === true;
export const isFast = (): boolean => peek<boolean>('flipup.fast', false) === true;
export const setFast = (on: boolean): void => save('flipup.fast', on);

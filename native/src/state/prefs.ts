// The table settings each phone keeps for itself, under the web app's keys.
import { save, useStored } from './storage';

/** The bots' table talk. On until the player turns it off. */
export const useTalkOn = (): boolean => useStored<boolean>('flipup.talk', true) !== false;
export const setTalkOn = (on: boolean): void => save('flipup.talk', on);

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

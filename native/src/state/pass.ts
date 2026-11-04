// The Premium pass: a short-lived token the server gave this phone after it checked Apple's signed purchase. Tables
// and the host calls show it, so the server knows this phone really has Premium (see worker/premium.ts).
import { read, save, useStored } from './storage';

const KEY = 'flipup.pass';

interface Pass {
  token: string;
  expiresAt: number;
}

/** The pass, if there is one that hasn't run out. */
export function currentPass(): string | null {
  const p = read<Pass | null>(KEY, null);
  return p && typeof p.token === 'string' && p.expiresAt > Date.now() ? p.token : null;
}

/** Whether the pass will still be good in `ms` milliseconds. */
export function passLasts(ms: number): boolean {
  const p = read<Pass | null>(KEY, null);
  return !!p && p.expiresAt - Date.now() > ms;
}

export const savePass = (p: Pass): void => save(KEY, p);
export const clearPass = (): void => save(KEY, null);

/** Whether this phone holds a pass right now, for screens that show it. */
export function usePassReady(): boolean {
  const p = useStored<Pass | null>(KEY, null);
  return !!p && p.expiresAt > Date.now();
}

// Asking for a name right where it's needed. A friend who just installed FlipUp has no name yet; sending them off to
// Profile in the middle of joining loses them. `askForName()` opens a small sheet (`app/your-name.tsx`) on top of
// whatever they're doing, and answers true once a name is saved (at once when there already is one).
import { router } from 'expo-router';

import { readProfile } from './profile';

let waiting: ((ok: boolean) => void) | null = null;

/** Resolves true when the player has a name (now or after the sheet), false when they closed the sheet without one. */
export function askForName(): Promise<boolean> {
  if (readProfile().name.trim()) return Promise.resolve(true);
  waiting?.(false);
  return new Promise((resolve) => {
    waiting = resolve;
    router.push('/your-name');
  });
}

/** The sheet reports back: a name was saved, or it was closed without one. */
export function finishAskName(ok: boolean): void {
  waiting?.(ok);
  waiting = null;
}

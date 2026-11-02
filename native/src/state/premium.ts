import { save, useStored } from './storage';

const KEY = 'flipup.premium';

/**
 * Whether this phone has FlipUp Premium. Phase 5 step 6 sets it from a StoreKit purchase or restore
 * (APP_INFO.premiumProductId); until then nothing sets it.
 */
export function usePremium(): boolean {
  return useStored<boolean>(KEY, false) === true;
}

export function setPremium(on: boolean): void {
  save(KEY, on ? true : null);
}

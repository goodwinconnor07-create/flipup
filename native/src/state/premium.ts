import { read, save, useStored } from './storage';

const KEY = 'flipup.premium';

/**
 * Whether this phone has FlipUp Premium. Set only from a StoreKit purchase or restore of
 * `APP_INFO.premiumProductId` (`state/purchase.ts`); Delete my data turns it off (`flipup.premiumreset`) until Restore, since Apple keeps the record.
 */
export function usePremium(): boolean {
  return useStored<boolean>(KEY, false) === true;
}

export function hasPremium(): boolean {
  return read<boolean>(KEY, false) === true;
}

/** Whether this phone has Premium, read outside a component (what the purchase code keeps in step with Apple). */
export const premiumStored = (): boolean => read<boolean>(KEY, false) === true;

export function setPremium(on: boolean): void {
  save(KEY, on ? true : null);
}

const RESET = 'flipup.premiumreset';

/** Set by Delete my data: Premium stays off on this phone until Restore Purchases or a new purchase, even if Apple still has the subscription. */
export const premiumDeclined = (): boolean => read<boolean>(RESET, false) === true;
export function setPremiumDeclined(on: boolean): void {
  save(RESET, on ? true : null);
}

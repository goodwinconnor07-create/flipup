import { read, save, useStored } from './storage';

const KEY = 'flipup.premium';

/**
 * Whether this phone has FlipUp Premium. Set only from a StoreKit purchase or restore of
 * `APP_INFO.premiumProductId` (`state/purchase.ts`); Delete my data keeps it, since Apple keeps the record.
 */
export function usePremium(): boolean {
  return useStored<boolean>(KEY, false) === true;
}

export function hasPremium(): boolean {
  return read<boolean>(KEY, false) === true;
}

export function setPremium(on: boolean): void {
  save(KEY, on ? true : null);
}

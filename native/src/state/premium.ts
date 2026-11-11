import { read, save, useStored } from './storage';

const KEY = 'flipup.premium';

/**
 * Whether this phone has FlipUp Premium. Set only from a StoreKit purchase or restore of
 * `APP_INFO.premiumProductId` (`state/purchase.ts`); Delete my data keeps it, since Apple keeps the record.
 */
export function usePremium(): boolean {
  const on = useStored<boolean>(KEY, false) === true;
  const preview = useStored<boolean>(PREVIEW, false) === true;
  return on && !preview;
}

export function hasPremium(): boolean {
  return read<boolean>(KEY, false) === true && !read<boolean>(PREVIEW, false);
}

/** Whether Premium is really on for this phone, ignoring the testing switch (what the purchase code keeps in step with Apple). */
export const premiumStored = (): boolean => read<boolean>(KEY, false) === true;

/** The owner's testing switch (Settings > "View as a free player", TestFlight builds only): acts as if Premium were off on this phone. */
const PREVIEW = 'flipup.previewfree';
export const usePreviewFree = (): boolean => useStored<boolean>(PREVIEW, false) === true;
export const setPreviewFree = (on: boolean): void => save(PREVIEW, on ? true : null);

export function setPremium(on: boolean): void {
  save(KEY, on ? true : null);
}

import { APP_INFO } from '../../appInfo';
import { read, save, useStored } from './storage';

const KEY = 'flipup.premium';

/**
 * Whether this phone has FlipUp Premium. Set only from a StoreKit purchase or restore of
 * `APP_INFO.premiumProductId` (`state/purchase.ts`); Delete my data keeps it, since Apple keeps the record.
 */
export function usePremium(): boolean {
  const on = useStored<boolean>(KEY, false) === true;
  const preview = useStored<boolean>(PREVIEW, false) === true;
  return on && !(TESTING && preview);
}

export function hasPremium(): boolean {
  return read<boolean>(KEY, false) === true && !(TESTING && read<boolean>(PREVIEW, false));
}

/** Whether Premium is really on for this phone, ignoring the testing switch (what the purchase code keeps in step with Apple). */
export const premiumStored = (): boolean => read<boolean>(KEY, false) === true;

/**
 * The owner's testing switch (Settings > "View as a free player", builds with `APP_INFO.testingTools` only): acts as
 * if Premium were off on this phone. A build without the testing tools ignores a switch left on by an earlier build,
 * so nobody is left without Premium and no switch to turn it back.
 */
const PREVIEW = 'flipup.previewfree';
const TESTING: boolean = APP_INFO.testingTools;
export const usePreviewFree = (): boolean => useStored<boolean>(PREVIEW, false) === true;
export const setPreviewFree = (on: boolean): void => save(PREVIEW, on ? true : null);

export function setPremium(on: boolean): void {
  save(KEY, on ? true : null);
}

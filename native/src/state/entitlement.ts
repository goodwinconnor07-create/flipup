// Gets the Premium pass from the server. Apple's signed transaction is the proof; the server checks Apple's
// signature, so a modified app can't make up a purchase. Having Premium on this phone never depends on this:
// the pass only matters for what other people see (looks) and for hosting Premium games online.
import { premiumVerify } from './api';
import { clearPass, passLasts, savePass } from './pass';

let inFlight: Promise<boolean> | null = null;
let identityVersion = 0;

/**
 * Makes sure this phone holds a pass with at least a day left. `signedTransaction` is the purchase's JWS from
 * StoreKit. Resolves true when there's a good pass afterwards. Never throws: offline just means try again later.
 */
export function ensurePass(signedTransaction: string | null | undefined): Promise<boolean> {
  if (passLasts(24 * 60 * 60 * 1000)) return Promise.resolve(true);
  // No purchase in hand: wait for one that's already being checked, if any.
  if (!signedTransaction) return inFlight ?? Promise.resolve(false);
  const version = identityVersion;
  inFlight ??= premiumVerify(signedTransaction)
    .then((p) => {
      if (!p || version !== identityVersion) return false;
      savePass(p);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      if (version === identityVersion) inFlight = null;
    });
  return inFlight;
}

export { clearPass };

/** Prevent verification for a deleted identity from writing its old pass back to storage. */
export function resetEntitlement(): void {
  identityVersion++;
  inFlight = null;
  clearPass();
}

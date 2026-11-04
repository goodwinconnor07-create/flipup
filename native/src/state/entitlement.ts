// Tells the server this phone owns Premium. Apple's signed transaction is the proof; the server checks Apple's
// signature, so a modified app can't make up a purchase, and remembers the phone from then on (until Apple refunds
// it). Having Premium on this phone never depends on this: it only matters for what other people see (looks) and for
// hosting Premium games online.
import { premiumVerify } from './api';

let inFlight: Promise<boolean> | null = null;
let identityVersion = 0;

/**
 * Shows the server this purchase's signed transaction (the JWS from StoreKit). Resolves true when the server has tied
 * this phone to it. Pass null to wait for a check that's already running. Never throws: offline just means try again.
 */
export function bindPurchase(signedTransaction: string | null | undefined): Promise<boolean> {
  if (!signedTransaction) return inFlight ?? Promise.resolve(false);
  const version = identityVersion;
  inFlight ??= premiumVerify(signedTransaction)
    .then((ok) => ok && version === identityVersion)
    .catch(() => false)
    .finally(() => {
      if (version === identityVersion) inFlight = null;
    });
  return inFlight;
}

/** Ignore verification results from the identity that was deleted. */
export function resetEntitlement(): void {
  identityVersion++;
  inFlight = null;
}

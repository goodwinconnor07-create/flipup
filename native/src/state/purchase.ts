// FlipUp Premium through StoreKit 2 (expo-iap): the one non-consumable `APP_INFO.premiumProductId`
// (docs/APP_STORE.md, 3.1.1). The price always comes from the App Store. A purchase or a restore of it is the only
// thing that sets `flipup.premium`. The web build uses purchase.web.ts, which sells nothing.
import {
  endConnection,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  isUserCancelledError,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  restorePurchases,
  type Purchase,
} from 'expo-iap';
import { useSyncExternalStore } from 'react';

import { APP_INFO } from '../../appInfo';
import { ensurePass } from './entitlement';
import { hasPremium, setPremium } from './premium';

const SKU = APP_INFO.premiumProductId;

export interface StoreState {
  /** The App Store's own price string ("$8.99", "8,99 €"), or null until it has answered. */
  price: string | null;
  /** A purchase or restore is under way. */
  busy: boolean;
  /** Why the store couldn't be reached, if it couldn't. */
  error: string | null;
  /** Ask to Buy: a parent has to approve the purchase. Premium turns on by itself once they do. */
  pending: boolean;
}

let state: StoreState = { price: null, busy: false, error: null, pending: false };
const listeners = new Set<() => void>();
let ready: Promise<boolean> | null = null;
let waiting: { done: (ok: boolean) => void } | null = null;

function publish(patch: Partial<StoreState>): void {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
}

export function useStore(): StoreState {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => state,
  );
}

const ours = (p: Purchase) => p.productId === SKU && p.purchaseState !== 'pending';

async function grant(p: Purchase): Promise<void> {
  setPremium(true);
  // Show the server Apple's signed transaction so it can give this phone a pass (see state/entitlement.ts). Premium
  // works on this phone either way; the pass is for what other people see and for hosting online.
  void ensurePass(p.purchaseToken);
  try {
    await finishTransaction({ purchase: p, isConsumable: false });
  } catch {
    // Finishing again later is harmless; StoreKit hands it back until then.
  }
}

/**
 * Connects to the App Store once, when the app starts: listens for purchases (including ones that finish later,
 * like Ask to Buy), loads the price, and quietly turns Premium on if this Apple account already owns it.
 */
export function startStore(): Promise<boolean> {
  if (ready) return ready;
  purchaseUpdatedListener((p) => {
    if (p.productId === SKU && p.purchaseState === 'pending') {
      publish({ busy: false, pending: true });
      waiting?.done(false);
      waiting = null;
      return;
    }
    if (!ours(p)) return;
    void grant(p).then(() => {
      publish({ busy: false, pending: false });
      waiting?.done(true);
      waiting = null;
    });
  });
  purchaseErrorListener((e) => {
    publish({ busy: false });
    waiting?.done(false);
    waiting = null;
    if (!isUserCancelledError(e)) publish({ error: e.message || "The App Store couldn't finish the purchase." });
  });
  ready = (async () => {
    try {
      await initConnection();
      const [, owned] = await Promise.all([loadPrice(), checkOwned()]);
      // The App Store answered and this Apple Account owns nothing: the purchase was refunded. Only when it answered.
      if (!owned && hasPremium()) setPremium(false);
      return true;
    } catch {
      publish({ error: "Couldn't reach the App Store." });
      ready = null;
      return false;
    }
  })();
  return ready;
}

async function loadPrice(): Promise<void> {
  const products = await fetchProducts({ skus: [SKU], type: 'in-app' });
  const p = products?.find((x) => x.id === SKU);
  publish({ price: p?.displayPrice ?? null, error: p ? null : 'Premium isn’t on sale right now.' });
}

/** True when this Apple account owns Premium. Turns it on here if so. */
async function checkOwned(): Promise<boolean> {
  const owned = (await getAvailablePurchases()).filter(ours);
  for (const p of owned) await grant(p);
  return owned.length > 0;
}

/** Opens Apple's purchase sheet. Resolves true once Premium is bought, false if cancelled or refused. */
export async function buyPremium(): Promise<boolean> {
  if (state.busy) return false;
  publish({ busy: true, error: null });
  if (!(await startStore())) {
    publish({ busy: false });
    return false;
  }
  return new Promise<boolean>((done) => {
    waiting = { done };
    requestPurchase({ type: 'in-app', request: { apple: { sku: SKU } } }).catch((e: unknown) => {
      publish({ busy: false, error: e instanceof Error ? e.message : "The App Store couldn't start the purchase." });
      waiting = null;
      done(false);
    });
  });
}

/** Restore Purchases: asks the App Store for this Apple account's purchases. Resolves true if Premium is among them. */
export async function restorePremium(): Promise<boolean> {
  if (state.busy) return false;
  publish({ busy: true, error: null });
  try {
    if (!(await startStore())) return false;
    await restorePurchases();
    return await checkOwned();
  } catch (e) {
    publish({ error: e instanceof Error ? e.message : "Couldn't reach the App Store." });
    return false;
  } finally {
    publish({ busy: false });
  }
}

export function stopStore(): void {
  void endConnection();
  ready = null;
}

/** Whether this build can sell Premium at all. */
export const ON_SALE = true;

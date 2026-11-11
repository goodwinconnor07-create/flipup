// FlipUp Premium through StoreKit 2 (expo-iap), docs/APP_STORE.md 3.1.1. Premium is sold as two auto-renewing
// subscriptions in one group (`APP_INFO.premiumMonthlyId`, `premiumYearlyId`), each with a $1 for 14 days introductory
// offer. The old one-time purchase (`premiumProductId`) is no longer sold, but owning it still means Premium for good.
// Prices always come from the App Store. A live subscription or the old purchase is the only thing that sets
// `flipup.premium`. The web build uses purchase.web.ts, which sells nothing.
import {
  deepLinkToSubscriptions,
  endConnection,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  isEligibleForIntroOfferIOS,
  isUserCancelledError,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  restorePurchases,
  type Purchase,
} from 'expo-iap';
import { useSyncExternalStore } from 'react';

import { APP_INFO } from '../../appInfo';
import { bindPurchase } from './entitlement';
import { premiumStored, setPremium } from './premium';

export type Plan = 'monthly' | 'yearly';
const SKU: Record<Plan, string> = { monthly: APP_INFO.premiumMonthlyId, yearly: APP_INFO.premiumYearlyId };
const LIFETIME = APP_INFO.premiumProductId;
const OURS = new Set<string>([SKU.monthly, SKU.yearly, LIFETIME]);

export interface PlanPrice {
  /** The App Store's own price string ("$7.00", "7,00 €"). */
  price: string;
  /** The price as a number, for working out the yearly saving. */
  amount: number | null;
  /** The introductory offer in the App Store's words ("$1.00"), if this Apple Account can still take it. */
  intro: string | null;
  /** How long the introductory offer lasts, in days. */
  introDays: number | null;
  /** The introductory offer is a free trial (nothing is charged until it ends). */
  introFree: boolean;
}

export interface StoreState {
  /** Each plan's price, or null until the App Store has answered. */
  plans: Record<Plan, PlanPrice | null>;
  /** What this Apple Account has: a plan, the old lifetime purchase, or nothing. */
  owned: Plan | 'lifetime' | null;
  /** A purchase or restore is under way. */
  busy: boolean;
  /** Why the store couldn't be reached, if it couldn't. */
  error: string | null;
  /** Ask to Buy: a parent has to approve the purchase. Premium turns on by itself once they do. */
  pending: boolean;
  /** The live subscription's current period: when it ends, and whether it renews then (null when StoreKit didn't say). */
  period: { ends: number; renews: boolean | null } | null;
}

let state: StoreState = { plans: { monthly: null, yearly: null }, owned: null, busy: false, error: null, pending: false, period: null };
const listeners = new Set<() => void>();
let ready: Promise<boolean> | null = null;
let subscriptions: { remove(): void }[] = [];
const granting = new Map<string, Promise<void>>();
const finished = new Set<string>();
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

const live = (p: Purchase) => OURS.has(p.productId) && p.purchaseState === 'purchased' && !expired(p);
function expired(p: Purchase): boolean {
  const at = (p as { expirationDateIOS?: number | null }).expirationDateIOS;
  return typeof at === 'number' && at > 0 && at < Date.now();
}
/** A subscription's period from StoreKit: the renewal date if it gave one, else the expiry. Null for the old lifetime purchase. */
function periodOf(p: Purchase): StoreState['period'] {
  const q = p as { expirationDateIOS?: number | null; renewalInfoIOS?: { renewalDate?: number | null; willAutoRenew?: boolean } | null };
  const ends = q.renewalInfoIOS?.renewalDate ?? q.expirationDateIOS;
  if (typeof ends !== 'number' || ends <= 0) return null;
  return { ends, renews: typeof q.renewalInfoIOS?.willAutoRenew === 'boolean' ? q.renewalInfoIOS.willAutoRenew : null };
}

const planOf = (productId: string): Plan | 'lifetime' | null =>
  productId === SKU.monthly ? 'monthly' : productId === SKU.yearly ? 'yearly' : productId === LIFETIME ? 'lifetime' : null;

function grant(p: Purchase): Promise<void> {
  const key = p.transactionId || p.id;
  const existing = granting.get(key);
  if (existing) return existing;
  if (!premiumStored()) setPremium(true);
  const plan = planOf(p.productId);
  if (plan && state.owned !== 'lifetime') publish({ owned: plan, ...(plan !== 'lifetime' && periodOf(p) ? { period: periodOf(p) } : {}) });
  // Every renewal is a new signed transaction with a later expiry: the server keeps the latest.
  void bindPurchase(p.purchaseToken);
  const task = (async () => {
    if (finished.has(key)) return;
    try {
      await finishTransaction({ purchase: p, isConsumable: false });
      finished.add(key);
    } catch {
      // Leave it retryable: StoreKit hands unfinished transactions back.
    }
  })().finally(() => granting.delete(key));
  granting.set(key, task);
  return task;
}

/**
 * Connects to the App Store once, when the app starts: listens for purchases (including ones that finish later, like
 * Ask to Buy and renewals), loads the prices, and turns Premium on or off by what this Apple Account has right now.
 */
export function startStore(): Promise<boolean> {
  if (ready) return ready;
  if (!subscriptions.length)
    subscriptions = [
      purchaseUpdatedListener((p) => {
        if (OURS.has(p.productId) && p.purchaseState === 'pending') {
          publish({ busy: false, pending: true });
          waiting?.done(false);
          waiting = null;
          return;
        }
        if (!live(p)) return;
        void grant(p).then(() => {
          publish({ busy: false, pending: false });
          waiting?.done(true);
          waiting = null;
        });
      }),
      purchaseErrorListener((e) => {
        publish({ busy: false });
        waiting?.done(false);
        waiting = null;
        if (!isUserCancelledError(e)) publish({ error: e.message || "The App Store couldn't finish the purchase." });
      }),
    ];
  ready = (async () => {
    try {
      await initConnection();
      const [, owned] = await Promise.all([loadPrices(), checkOwned()]);
      // The App Store answered and this Apple Account has nothing live: the subscription ended or was refunded.
      if (!owned && premiumStored()) setPremium(false);
      return true;
    } catch {
      publish({ error: "Couldn't reach the App Store." });
      ready = null;
      return false;
    }
  })();
  return ready;
}

const DAYS: Record<string, number> = { day: 1, week: 7, month: 30, year: 365 };

/**
 * How many days the introductory offer runs, from StoreKit's own description of the product. StoreKit gives an offer
 * as a period ("P2W") times a count, and the flat fields don't always carry the period's own number (a two-week
 * offer paid up front is one period of two weeks), so the product's JSON is read first and the flat fields are the
 * fallback. Null when it can't be told.
 */
export function introDaysOf(json: string | null | undefined, periods: number, unit: string): number | null {
  try {
    const offers = (JSON.parse(json ?? 'null') as { attributes?: { offers?: { discounts?: { type?: string; numOfPeriods?: number; recurringSubscriptionPeriod?: string }[] }[] } } | null)?.attributes?.offers ?? [];
    for (const o of offers)
      for (const d of o.discounts ?? []) {
        const m = d.type === 'IntroOffer' ? /^P(\d+)([DWMY])$/.exec(d.recurringSubscriptionPeriod ?? '') : null;
        if (m) return Number(m[1]) * { D: 1, W: 7, M: 30, Y: 365 }[m[2] as 'D' | 'W' | 'M' | 'Y'] * (d.numOfPeriods || 1);
      }
  } catch {
    // Not JSON: use the flat fields.
  }
  return DAYS[unit] ? periods * DAYS[unit] : null;
}

async function loadPrices(): Promise<void> {
  const products = (await fetchProducts({ skus: [SKU.monthly, SKU.yearly], type: 'subs' })) ?? [];
  const plans: Record<Plan, PlanPrice | null> = { monthly: null, yearly: null };
  for (const plan of ['monthly', 'yearly'] as Plan[]) {
    const p = products.find((x) => x.id === SKU[plan]) as
      | (typeof products)[number] & {
          introductoryPriceIOS?: string | null;
          introductoryPriceNumberOfPeriodsIOS?: string | null;
          introductoryPriceSubscriptionPeriodIOS?: string | null;
          introductoryPricePaymentModeIOS?: string | null;
          jsonRepresentationIOS?: string | null;
          subscriptionGroupIdIOS?: string | null;
        }
      | undefined;
    if (!p) continue;
    let eligible = true;
    try {
      if (p.subscriptionGroupIdIOS) eligible = await isEligibleForIntroOfferIOS(p.subscriptionGroupIdIOS);
    } catch {
      // Not knowing is fine: Apple only charges the offer price to someone who can still have it.
    }
    const periods = Number(p.introductoryPriceNumberOfPeriodsIOS ?? 1) || 1;
    const unit = String(p.introductoryPriceSubscriptionPeriodIOS ?? '').toLowerCase();
    plans[plan] = {
      price: p.displayPrice,
      amount: typeof p.price === 'number' ? p.price : null,
      intro: eligible && p.introductoryPriceIOS ? p.introductoryPriceIOS : null,
      introDays: eligible && p.introductoryPriceIOS ? introDaysOf(p.jsonRepresentationIOS, periods, unit) : null,
      introFree: p.introductoryPricePaymentModeIOS === 'free-trial',
    };
  }
  publish({ plans, error: plans.monthly || plans.yearly ? null : 'Premium isn’t on sale right now.' });
}

/** True when this Apple Account has Premium now (a live subscription or the old lifetime purchase). Turns it on if so. */
async function checkOwned(): Promise<boolean> {
  const owned = (await getAvailablePurchases()).filter(live);
  const best = owned.find((p) => p.productId === LIFETIME) ?? owned.find((p) => p.productId === SKU.yearly) ?? owned[0];
  publish({ owned: best ? planOf(best.productId) : null, period: best && planOf(best.productId) !== 'lifetime' ? periodOf(best) : null });
  for (const p of owned) await grant(p);
  return owned.length > 0;
}

/** Opens Apple's purchase sheet for a plan. Resolves true once Premium is on, false if cancelled or refused. */
export async function buyPremium(plan: Plan = 'yearly'): Promise<boolean> {
  if (state.busy) return false;
  publish({ busy: true, error: null });
  if (!(await startStore())) {
    publish({ busy: false });
    return false;
  }
  return new Promise<boolean>((done) => {
    waiting = { done };
    requestPurchase({ type: 'subs', request: { apple: { sku: SKU[plan] } } }).catch((e: unknown) => {
      publish({ busy: false, error: e instanceof Error ? e.message : "The App Store couldn't start the purchase." });
      waiting = null;
      done(false);
    });
  });
}

/** The store's last error, read after a restore (a component's own copy of the state is from before it ran). */
export const storeError = (): string | null => state.error;

/** Restore Purchases: asks the App Store for this Apple Account's purchases. Resolves true if Premium is among them. */
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

/** Apple's own page for changing or cancelling the subscription. */
export function manageSubscription(): Promise<void> {
  return deepLinkToSubscriptions({}).catch(() => undefined);
}

/** How much a year saves against twelve months, as a whole percentage, from the App Store's prices. */
export function yearlySaving(plans: StoreState['plans']): number | null {
  const m = plans.monthly?.amount;
  const y = plans.yearly?.amount;
  if (!m || !y) return null;
  const pct = Math.round((1 - y / (m * 12)) * 100);
  return pct > 0 ? pct : null;
}

export function stopStore(): void {
  subscriptions.forEach((s) => s.remove());
  subscriptions = [];
  waiting?.done(false);
  waiting = null;
  publish({ busy: false });
  void endConnection();
  ready = null;
}

/** Whether this build can sell Premium at all. */
export const ON_SALE = true;

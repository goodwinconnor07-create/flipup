import { beforeEach, expect, it, vi } from 'vitest';
import type { Purchase } from 'expo-iap';

const store = vi.hoisted(() => ({
  updates: new Set<(p: Purchase) => void>(),
  errors: new Set<() => void>(),
  init: vi.fn(),
  finish: vi.fn(),
  owned: vi.fn(),
  premium: false,
  declined: false,
  grant: vi.fn(),
  pass: vi.fn(),
  end: vi.fn(),
  request: vi.fn(),
  eligible: true,
}));
vi.mock('expo-iap', () => ({
  initConnection: store.init,
  endConnection: store.end,
  finishTransaction: store.finish,
  getAvailablePurchases: store.owned,
  getStorefront: async () => 'AUS',
  fetchProducts: async () => [
    { id: 'flipup.premium.monthly', displayPrice: '$7.00', price: 7, introductoryPriceIOS: '$1.00', introductoryPriceNumberOfPeriodsIOS: '2', introductoryPriceSubscriptionPeriodIOS: 'week', subscriptionGroupIdIOS: 'g' },
    { id: 'flipup.premium.yearly', displayPrice: '$50.00', price: 50, introductoryPriceIOS: '$1.00', introductoryPriceNumberOfPeriodsIOS: '2', introductoryPriceSubscriptionPeriodIOS: 'week', subscriptionGroupIdIOS: 'g' },
  ],
  isEligibleForIntroOfferIOS: async () => store.eligible,
  deepLinkToSubscriptions: vi.fn(async () => undefined),
  purchaseUpdatedListener: (fn: (p: Purchase) => void) => {
    store.updates.add(fn);
    return { remove: () => store.updates.delete(fn) };
  },
  purchaseErrorListener: (fn: () => void) => {
    store.errors.add(fn);
    return { remove: () => store.errors.delete(fn) };
  },
  requestPurchase: store.request,
  restorePurchases: vi.fn(),
  isUserCancelledError: () => false,
}));
vi.mock('../src/state/premium', () => ({
  hasPremium: () => store.premium,
  premiumStored: () => store.premium,
  premiumDeclined: () => store.declined,
  setPremiumDeclined: (on: boolean) => {
    store.declined = on;
  },
  setPremium: (on: boolean) => {
    store.premium = on;
    store.grant(on);
  },
}));
vi.mock('../src/state/entitlement', () => ({ bindPurchase: store.pass }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  store.updates.clear();
  store.errors.clear();
  store.premium = false;
  store.declined = false;
  store.init.mockResolvedValue(true);
  store.finish.mockResolvedValue(undefined);
  store.owned.mockResolvedValue([]);
  store.request.mockResolvedValue(undefined);
  store.eligible = true;
});
const purchase = (state: Purchase['purchaseState'], id = 'tx1') =>
  ({ id, transactionId: id, productId: 'flipup.premium.unlock', purchaseState: state }) as Purchase;
const emit = async (p: Purchase) => {
  store.updates.forEach((fn) => fn(p));
  await vi.waitFor(() => expect(store.finish).toHaveBeenCalledTimes(1));
};

it.each(['unknown', 'pending'] as const)('never grants or finishes a %s transaction', async (state) => {
  const { startStore } = await import('../src/state/purchase');
  await startStore();
  store.updates.forEach((fn) => fn(purchase(state)));
  await Promise.resolve();
  expect(store.grant).not.toHaveBeenCalled();
  expect(store.finish).not.toHaveBeenCalled();
});

it('keeps one listener pair through repeated offline startup, and disposes it on stop', async () => {
  const { startStore, stopStore } = await import('../src/state/purchase');
  store.init.mockRejectedValue(new Error('offline'));
  for (let i = 0; i < 10; i++) expect(await startStore()).toBe(false);
  store.init.mockResolvedValue(true);
  expect(await startStore()).toBe(true);
  expect(store.updates.size).toBe(1);
  expect(store.errors.size).toBe(1);
  await emit(purchase('purchased'));
  expect(store.grant).toHaveBeenCalledTimes(1);
  stopStore();
  expect(store.updates.size).toBe(0);
  expect(store.errors.size).toBe(0);
  await startStore();
  expect(store.updates.size).toBe(1);
  expect(store.errors.size).toBe(1);
});

it('coalesces concurrent duplicates and ignores already-finished redeliveries', async () => {
  const { startStore } = await import('../src/state/purchase');
  await startStore();
  let finish!: () => void;
  store.finish.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  store.updates.forEach((fn) => {
    fn(purchase('purchased'));
    fn(purchase('purchased'));
  });
  expect(store.finish).toHaveBeenCalledTimes(1);
  finish();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await emit(purchase('purchased'));
  expect(store.grant).toHaveBeenCalledTimes(1);
});

it('retries an unfinished transaction after a failed finish', async () => {
  const { startStore } = await import('../src/state/purchase');
  await startStore();
  store.finish.mockRejectedValueOnce(new Error('offline'));
  await emit(purchase('purchased'));
  await new Promise((resolve) => setTimeout(resolve, 0));
  store.updates.forEach((fn) => fn(purchase('purchased')));
  await vi.waitFor(() => expect(store.finish).toHaveBeenCalledTimes(2));
});

it('ignores another product and grants a pending transaction only after approval', async () => {
  const { startStore } = await import('../src/state/purchase');
  await startStore();
  store.updates.forEach((fn) => {
    fn({ ...purchase('purchased'), productId: 'another.sku' });
    fn(purchase('pending'));
  });
  expect(store.grant).not.toHaveBeenCalled();
  await emit(purchase('purchased'));
  expect(store.grant).toHaveBeenCalledTimes(1);
});

const sub = (productId: string, expirationDateIOS: number, id = 'sub1') => ({ ...purchase('purchased', id), productId, expirationDateIOS }) as unknown as Purchase;

it('buys the chosen plan as a subscription and works out the yearly saving', async () => {
  const { startStore, buyPremium, yearlySaving } = await import('../src/state/purchase');
  await startStore();
  void buyPremium('yearly');
  await vi.waitFor(() => expect(store.request).toHaveBeenCalledWith({ type: 'subs', request: { apple: { sku: 'flipup.premium.yearly' } } }));
  expect(yearlySaving({ monthly: { price: '$7.00', amount: 7, intro: null, introDays: null, introLength: null, introFree: false }, yearly: { price: '$50.00', amount: 50, intro: null, introDays: null, introLength: null, introFree: false } })).toBe(40);
  expect(yearlySaving({ monthly: null, yearly: null })).toBeNull();
});

it('works out what a yearly plan comes to each month, in the store\'s own format', async () => {
  const { perMonth } = await import('../src/state/purchase');
  const plan = (price: string, amount: number | null) => ({ price, amount, intro: null, introDays: null, introLength: null, introFree: false });
  expect(perMonth(plan('$50.00', 50))).toBe('$4.16');
  expect(perMonth(plan('A$79.99', 79.99))).toBe('A$6.66');
  expect(perMonth(plan('49,99 €', 49.99))).toBe('4,16 €');
  expect(perMonth(plan('¥6,800', 6800))).toBe('¥566');
  expect(perMonth(plan('$50.00', null))).toBeNull();
  expect(perMonth(null)).toBeNull();
});

it("finishes a buy by itself when the account already owns Premium and StoreKit sends no purchase signal", async () => {
  vi.useFakeTimers();
  try {
    const { startStore, buyPremium } = await import('../src/state/purchase');
    await startStore();
    // The account owns the yearly plan from before (a data reset, or another phone), but only once Apple's sheet is done.
    store.owned.mockResolvedValue([{ id: 'tx9', transactionId: 'tx9', productId: 'flipup.premium.yearly', purchaseState: 'purchased' } as Purchase]);
    const bought = buyPremium('yearly');
    // The sheet closes (requestPurchase answers) and no listener ever fires.
    await vi.advanceTimersByTimeAsync(2_600);
    expect(await bought).toBe(true);
    expect(store.premium).toBe(true);
  } finally {
    vi.useRealTimers();
  }
});

it('keeps waiting for the purchase signal when the account owns nothing', async () => {
  vi.useFakeTimers();
  try {
    const { startStore, buyPremium } = await import('../src/state/purchase');
    await startStore();
    let settled = false;
    void buyPremium('yearly').then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(30_000);
    expect(settled).toBe(false);
    expect(store.premium).toBe(false);
  } finally {
    vi.useRealTimers();
  }
});

it('grants a live subscription and the old lifetime purchase, never an expired one', async () => {
  const { startStore } = await import('../src/state/purchase');
  await startStore();
  store.updates.forEach((fn) => fn(sub('flipup.premium.monthly', Date.now() - 1000, 'old')));
  await Promise.resolve();
  expect(store.grant).not.toHaveBeenCalled();
  await emit(sub('flipup.premium.monthly', Date.now() + 86_400_000));
  expect(store.grant).toHaveBeenCalledTimes(1);
});

it('turns Premium off at launch when the subscription has ended', async () => {
  store.premium = true;
  store.owned.mockResolvedValue([sub('flipup.premium.yearly', Date.now() - 1000)]);
  const { startStore } = await import('../src/state/purchase');
  await startStore();
  expect(store.premium).toBe(false);
});

it("reads an introductory offer's length from StoreKit's own description of it", async () => {
  const { introDaysOf } = await import('../src/state/purchase');
  const product = (period: string, numOfPeriods: number, type = 'IntroOffer') => JSON.stringify({ attributes: { offers: [{ discounts: [{ type, numOfPeriods, recurringSubscriptionPeriod: period, modeType: 'PayUpFront' }] }] } });
  // Two weeks paid up front is one period of two weeks: the flat fields alone would say seven days.
  expect(introDaysOf(product('P2W', 1), 1, 'week')).toBe(14);
  expect(introDaysOf(product('P1W', 2), 2, 'week')).toBe(14);
  expect(introDaysOf(product('P1M', 1), 1, 'month')).toBe(30);
  // No offer in the JSON, or no JSON at all: the flat fields, and null when they say nothing.
  expect(introDaysOf(product('P1Y', 1, 'Promotional'), 2, 'week')).toBe(14);
  expect(introDaysOf('not json', 3, 'day')).toBe(3);
  expect(introDaysOf(null, 1, '')).toBeNull();
});

it("words an introductory offer's length in the App Store's own units", async () => {
  const { introLengthOf } = await import('../src/state/purchase');
  const product = (period: string, numOfPeriods: number, type = 'IntroOffer') => JSON.stringify({ attributes: { offers: [{ discounts: [{ type, numOfPeriods, recurringSubscriptionPeriod: period, modeType: 'PayUpFront' }] }] } });
  // App Store Connect's shortest paid-up-front offer is a month; a month is never "30 days".
  expect(introLengthOf(product('P1M', 1), 1, 'month')).toBe('1 month');
  expect(introLengthOf(product('P2W', 1), 1, 'week')).toBe('2 weeks');
  expect(introLengthOf(product('P1W', 1), 1, 'week')).toBe('1 week');
  expect(introLengthOf(product('P14D', 1), 1, 'day')).toBe('2 weeks');
  expect(introLengthOf(product('P3D', 1), 1, 'day')).toBe('3 days');
  expect(introLengthOf(product('P1M', 3), 3, 'month')).toBe('3 months');
  // No offer in the JSON, or no JSON at all: the flat fields, and null when they say nothing.
  expect(introLengthOf(product('P1Y', 1, 'Promotional'), 1, 'year')).toBe('1 year');
  expect(introLengthOf('not json', 3, 'day')).toBe('3 days');
  expect(introLengthOf(null, 1, '')).toBeNull();
});


it('after Delete my data nothing turns Premium back on until Restore', async () => {
  store.owned.mockResolvedValue([{ ...purchase('purchased', 'sub9'), productId: 'flipup.premium.yearly' } as Purchase]);
  const { startStore, forgetPremium, restorePremium } = await import('../src/state/purchase');
  forgetPremium();
  await startStore();
  expect(store.premium).toBe(false);
  expect(await restorePremium()).toBe(true);
  expect(store.premium).toBe(true);
});

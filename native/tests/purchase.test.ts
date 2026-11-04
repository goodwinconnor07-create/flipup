import { beforeEach, expect, it, vi } from 'vitest';
import type { Purchase } from 'expo-iap';

const store = vi.hoisted(() => ({
  updates: new Set<(p: Purchase) => void>(),
  errors: new Set<() => void>(),
  init: vi.fn(),
  finish: vi.fn(),
  owned: vi.fn(),
  premium: false,
  grant: vi.fn(),
  pass: vi.fn(),
  end: vi.fn(),
}));
vi.mock('expo-iap', () => ({
  initConnection: store.init,
  endConnection: store.end,
  finishTransaction: store.finish,
  getAvailablePurchases: store.owned,
  fetchProducts: async () => [{ id: 'flipup.premium.unlock', displayPrice: '$1' }],
  purchaseUpdatedListener: (fn: (p: Purchase) => void) => {
    store.updates.add(fn);
    return { remove: () => store.updates.delete(fn) };
  },
  purchaseErrorListener: (fn: () => void) => {
    store.errors.add(fn);
    return { remove: () => store.errors.delete(fn) };
  },
  requestPurchase: vi.fn(),
  restorePurchases: vi.fn(),
  isUserCancelledError: () => false,
}));
vi.mock('../src/state/premium', () => ({
  hasPremium: () => store.premium,
  setPremium: (on: boolean) => {
    store.premium = on;
    store.grant(on);
  },
}));
vi.mock('../src/state/entitlement', () => ({ ensurePass: store.pass }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  store.updates.clear();
  store.errors.clear();
  store.premium = false;
  store.init.mockResolvedValue(true);
  store.finish.mockResolvedValue(undefined);
  store.owned.mockResolvedValue([]);
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

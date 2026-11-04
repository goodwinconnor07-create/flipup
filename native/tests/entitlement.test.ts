import { expect, it, vi } from 'vitest';
const service = vi.hoisted(() => ({ verify: vi.fn() }));
vi.mock('../src/state/api', () => ({ premiumVerify: service.verify }));
it('ignores verification for a deleted identity without clearing the new verification', async () => {
  const { bindPurchase, resetEntitlement } = await import('../src/state/entitlement');
  let old!: (ok: boolean) => void;
  let fresh!: (ok: boolean) => void;
  service.verify.mockImplementationOnce(() => new Promise((resolve) => { old = resolve; }))
    .mockImplementationOnce(() => new Promise((resolve) => { fresh = resolve; }));
  const first = bindPurchase('old-device-receipt');
  resetEntitlement();
  const second = bindPurchase('new-device-receipt');
  old(true);
  expect(await first).toBe(false);
  expect(bindPurchase(null)).toBe(second);
  fresh(true);
  expect(await second).toBe(true);
});

import { expect, it, vi } from 'vitest';

const service = vi.hoisted(() => ({ verify: vi.fn(), save: vi.fn(), clear: vi.fn() }));
vi.mock('../src/state/api', () => ({ premiumVerify: service.verify }));
vi.mock('../src/state/pass', () => ({ passLasts: () => false, savePass: service.save, clearPass: service.clear }));

it('does not restore an old device pass after data deletion, or discard a new verification', async () => {
  const { ensurePass, resetEntitlement } = await import('../src/state/entitlement');
  let old!: (p: { token: string; expiresAt: number }) => void;
  let fresh!: (p: { token: string; expiresAt: number }) => void;
  service.verify.mockImplementationOnce(() => new Promise((resolve) => { old = resolve; }))
    .mockImplementationOnce(() => new Promise((resolve) => { fresh = resolve; }));
  const first = ensurePass('old-device-receipt');
  resetEntitlement();
  const second = ensurePass('new-device-receipt');
  old({ token: 'old-device-pass', expiresAt: 100 });
  expect(await first).toBe(false); expect(service.save).not.toHaveBeenCalled();
  expect(ensurePass(null)).toBe(second);
  fresh({ token: 'new-device-pass', expiresAt: 200 });
  expect(await second).toBe(true); expect(service.save).toHaveBeenCalledWith({ token: 'new-device-pass', expiresAt: 200 });
});

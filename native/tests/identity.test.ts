import { afterEach, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../../src/game';

vi.mock('expo-sqlite/localStorage/install', () => ({}));
vi.mock('react-native', () => ({ AppState: { addEventListener: () => ({ remove() {} }) } }));
vi.mock('../src/state/purchase', () => ({ restorePremium: async () => false }));
vi.mock('../src/state/api', () => ({
  deleteFriendCard: vi.fn(),
  premiumForget: vi.fn().mockResolvedValue(undefined),
  createOnlineTable: vi.fn(),
  PremiumRequiredError: class extends Error {},
}));
vi.mock('../src/state/pals', () => ({ myPalCode: () => null }));
vi.mock('../src/state/party', () => ({ leaveParty: vi.fn(), loadPartyRef: () => null }));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('rotates the table identity immediately after deletion and keeps Premium', async () => {
  vi.resetModules();
  vi.useFakeTimers();
  const entries = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => entries.get(k) ?? null,
    setItem: (k: string, v: string) => entries.set(k, v),
    removeItem: (k: string) => entries.delete(k),
    key: (i: number) => [...entries.keys()][i],
    get length() {
      return entries.size;
    },
  });
  entries.set('flipup.premium', 'true');
  entries.set('flipup.profile', JSON.stringify({ name: 'Old', emoji: '😎' }));
  const session = await import('../src/state/session');
  const old = session.me;
  session.openLocalTable(DEFAULT_SETTINGS, 3, 'Old', '😎');
  const { deleteMyData } = await import('../src/state/account');
  await deleteMyData();
  const { deviceId } = await import('../src/state/device');
  expect(session.me).not.toBe(old);
  expect(session.me).toBe(deviceId());
  expect(entries.get('flipup.premium')).toBe('true');
  expect(entries.has('flipup.profile')).toBe(false);
  session.openLocalTable(DEFAULT_SETTINGS, 3, 'New', '😎');
  await vi.advanceTimersByTimeAsync(700);
  const saved = JSON.parse(entries.get('flipup.session')!);
  expect(saved.game.hostDeviceId).toBe(deviceId());
  expect(saved.game.players.find((p: { name: string }) => p.name === 'New').deviceId).toBe(deviceId());
  session.leaveTable();
});

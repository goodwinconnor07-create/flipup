import { afterEach, beforeEach, expect, it, vi } from 'vitest';

// Hotel and airport Wi-Fi answer every request with a 200 web page. The app must say something a person can read,
// never "JSON Parse error: Unexpected character: <".
vi.mock('expo-sqlite/localStorage/install', () => ({}));

const page = () => new Response('<html><body>Log in to the Wi-Fi</body></html>', { status: 200, headers: { 'content-type': 'text/html' } });

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('localStorage', { getItem: () => JSON.stringify('d0123456789abcdefghij'), setItem: () => {}, removeItem: () => {}, length: 0, key: () => null });
  vi.stubGlobal('fetch', vi.fn(async () => page()));
});
afterEach(() => vi.unstubAllGlobals());

it('turns a web page where JSON should be into a plain sentence (table info)', async () => {
  const { fetchTableInfo } = await import('../src/state/api');
  const err = await fetchTableInfo('ACES42').then(
    () => null,
    (e: Error) => e,
  );
  expect(err).toBeInstanceOf(Error);
  expect(err!.message).not.toMatch(/JSON|Unexpected|token|parse/i);
  expect(err!.message).toMatch(/connection|try again/i);
});

it('does the same when opening a table', async () => {
  const { createOnlineTable } = await import('../src/state/api');
  const err = await createOnlineTable({ deviceId: 'd0123456789abcdefghij', name: 'A', emoji: '🙂', bots: 1, settings: {} } as never).then(
    () => null,
    (e: Error) => e,
  );
  expect(err!.message).not.toMatch(/JSON|Unexpected|token|parse/i);
});

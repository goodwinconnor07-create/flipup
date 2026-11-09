import { afterEach, beforeEach, expect, it, vi } from 'vitest';

vi.mock('expo-sqlite/localStorage/install', () => ({}));
vi.mock('react-native', () => ({ AppState: { addEventListener: () => ({ remove() {} }) } }));

class FakeSocket {
  static all: FakeSocket[] = [];
  static OPEN = 1;
  static CONNECTING = 0;
  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: ((e: { code: number }) => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  constructor(readonly url: string) {
    FakeSocket.all.push(this);
  }
  send() {}
  close() {}
}

beforeEach(() => {
  vi.useFakeTimers();
  FakeSocket.all = [];
  vi.stubGlobal('WebSocket', FakeSocket);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const handlers = () => ({ onMessage: vi.fn(), onStatus: vi.fn(), onOpen: vi.fn(), onGone: vi.fn() });

it('Try again opens a new socket at once after a drop, without waiting out the back-off', async () => {
  const { Connection } = await import('../src/state/connection');
  const h = handlers();
  const c = new Connection('ACES42', 'd0123456789abcdefghij', h);
  expect(FakeSocket.all).toHaveLength(1);
  FakeSocket.all[0].readyState = 3;
  FakeSocket.all[0].onclose?.({ code: 1006 });
  expect(h.onStatus).toHaveBeenLastCalledWith('offline');
  expect(FakeSocket.all).toHaveLength(1); // waiting for the automatic retry
  c.retryNow();
  expect(FakeSocket.all).toHaveLength(2);
  c.close();
});

it('does nothing while a socket is already open or connecting, and after close', async () => {
  const { Connection } = await import('../src/state/connection');
  const c = new Connection('ACES42', 'd0123456789abcdefghij', handlers());
  c.retryNow(); // still connecting
  expect(FakeSocket.all).toHaveLength(1);
  c.close();
  c.retryNow();
  expect(FakeSocket.all).toHaveLength(1);
});

import { describe, expect, it } from 'vitest';
import { isDeviceId, publicId } from './ids';
import { applyAction, createTable, DEFAULT_SETTINGS } from './reducer';
import { redactForDevice } from './redact';

const HOST = 'host-device-0001';
const GUEST = 'guest-device-0002';

function table() {
  const game = createTable({ hostDeviceId: HOST, name: 'Host', emoji: '😀', settings: DEFAULT_SETTINGS, bots: 1, code: 'BCDFG', now: 0 });
  const r = applyAction(game, { type: 'join', name: 'Guest', emoji: '😎' }, { deviceId: GUEST, now: 1, rng: Math.random });
  if (!r.ok) throw new Error(r.error);
  return r.game;
}

describe('device ids stay secret', () => {
  it("never shows a phone another phone's device id, only a stable public id", () => {
    const seen = redactForDevice(table(), GUEST);
    const text = JSON.stringify(seen);
    expect(text).not.toContain(HOST);
    expect(seen.hostDeviceId).toBe(publicId(HOST));
    expect(seen.players.find((p) => p.name === 'Host')?.deviceId).toBe(publicId(HOST));
    // Your own stays as it is, so the phone still knows which seat is yours.
    expect(seen.players.find((p) => p.name === 'Guest')?.deviceId).toBe(GUEST);
  });

  it('gives a public id that is the same every time and can never pass as a device id', () => {
    expect(publicId(HOST)).toBe(publicId(HOST));
    expect(publicId(HOST)).not.toBe(publicId(GUEST));
    expect(isDeviceId(publicId(HOST))).toBe(false);
  });
});

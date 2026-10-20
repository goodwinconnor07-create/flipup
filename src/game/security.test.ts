import { describe, expect, it } from 'vitest';
import { applyAction, createTable, DEFAULT_SETTINGS, isDeviceId, parseAction, redactForDevice, stripInvisible } from './index';

const HOST = 'host-device-0001';
const GUEST = 'guest-device-0002';

function twoPhones() {
  let game = createTable({ hostDeviceId: HOST, name: 'Host', emoji: '😎', settings: DEFAULT_SETTINGS, bots: 1, code: 'BCDFG', now: 0 });
  const r = applyAction(game, { type: 'join', name: 'Guest', emoji: '🐸' }, { deviceId: GUEST, now: 1, rng: Math.random });
  if (!r.ok) throw new Error(r.error);
  game = r.game;
  return game;
}

describe('device ids stay private', () => {
  it('shows a phone its own id and nobody else its id', () => {
    const game = twoPhones();
    const guest = game.players.find((p) => p.deviceId === GUEST)!;
    const host = game.players.find((p) => p.deviceId === HOST)!;
    const view = redactForDevice(game, GUEST);
    expect(view.players.find((p) => p.id === guest.id)!.deviceId).toBe(GUEST);
    expect(JSON.stringify(view)).not.toContain(HOST);
    // The guest can still tell who the host is, but the stand-in is no good as a device id.
    const hostView = view.players.find((p) => p.id === host.id)!;
    expect(view.hostDeviceId).toBe(hostView.deviceId);
    expect(isDeviceId(hostView.deviceId)).toBe(false);
    expect(view.players.find((p) => p.bot)!.deviceId).toBeNull();
  });

  it('keeps the host powers with the host phone and gives a stranger nothing usable', () => {
    const game = twoPhones();
    expect(redactForDevice(game, HOST).hostDeviceId).toBe(HOST);
    const stranger = redactForDevice(game, 'stranger-device-3');
    expect(JSON.stringify(stranger)).not.toContain(HOST);
    expect(JSON.stringify(stranger)).not.toContain(GUEST);
    // Replaying what a stranger saw as a device id gets no seat and no host powers.
    const replay = { deviceId: stranger.hostDeviceId, now: 2, rng: Math.random };
    expect(applyAction(game, { type: 'start' }, replay)).toEqual({ ok: false, error: 'Only the host can start.' });
  });
});

describe('hostile input', () => {
  it('refuses odd bet amounts and counters', () => {
    const base = { type: 'act', hand: 1, seq: 0, move: 'raise' };
    for (const to of [NaN, Infinity, -Infinity, 1.5, 1e12, '40', null, [], {}]) expect(parseAction({ ...base, to }), String(to)).toBeNull();
    for (const hand of [NaN, 0.5, Infinity, '1']) expect(parseAction({ ...base, hand, to: 40 })).toBeNull();
    expect(parseAction({ ...base, move: '__proto__' })).toBeNull();
    expect(parseAction({ ...base, move: 'toString' })).toBeNull();
  });

  it('refuses things only the server may send', () => {
    for (const type of ['tick', '__proto__', 'constructor', 'toString', undefined, 7]) expect(parseAction({ type })).toBeNull();
    expect(parseAction(JSON.parse('{"type":"react","id":"b:trash:allin:0"}'))).toBeNull();
    expect(parseAction(JSON.parse('{"type":"react","id":"constructor"}'))).toBeNull();
    expect(parseAction(JSON.parse('{"type":"remove","playerId":"__proto__"}'))).toBeNull();
    expect(parseAction([])).toBeNull();
    expect(parseAction('act')).toBeNull();
  });

  it('only passes known setting keys', () => {
    const parsed = parseAction(JSON.parse('{"type":"settings","settings":{"__proto__":{"x":1},"constructor":1,"bigBlind":20}}'));
    expect(parsed).toEqual({ type: 'settings', settings: { bigBlind: 20 } });
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });

  it('strips invisible and direction-flipping characters from names', () => {
    expect(stripInvisible('Ann‮evil​')).toBe('Annevil');
    expect(stripInvisible('​‎')).toBe('');
    // Emoji joiners and plain spaces are kept.
    expect(stripInvisible('Dev 🧑‍💻')).toBe('Dev 🧑‍💻');
    const join = parseAction({ type: 'join', name: 'Bob‮', emoji: '🐸' });
    expect(join).toEqual({ type: 'join', name: 'Bob', emoji: '🐸' });
  });
});

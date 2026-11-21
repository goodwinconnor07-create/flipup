import { generateKeyPairSync, verify } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { apnsBody, canPush, isPushToken, providerToken, sendLive, type LiveReg } from './live';
import type { LiveState } from '../src/game';

// A throwaway key made for the test, never a real one.
const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const env = {
  APNS_KEY: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  APNS_KEY_ID: 'ABC123DEFG',
  APPLE_TEAM_ID: '9FAJRHL979',
  APPLE_BUNDLE_ID: 'com.goodwin.flipup',
};

const state: LiveState = {
  phase: 'turn', hand: 14, cards: ['As', 'Kh'], board: ['9c', '9d', 'Ks'], handName: 'Two pair, kings and nines', pot: 22, toCall: 4,
  canCheck: false, turnStart: 1000, turnEnd: 1030, line: 'Your turn · 4 bb to call', net: 0, stack: 80, place: 0, of: 0, round: '', seq: 7, act: 'k',
};
const reg: LiveReg = { token: 'ab'.repeat(32), act: 'k', sandbox: false, last: null };

afterEach(() => vi.unstubAllGlobals());

describe('APNs provider token', () => {
  it('is an ES256 JWT Apple can check with the key', async () => {
    const jwt = await providerToken(env, 5_000_000);
    const [head, claims, sig] = jwt.split('.');
    expect(JSON.parse(Buffer.from(head, 'base64url').toString())).toEqual({ alg: 'ES256', kid: 'ABC123DEFG' });
    expect(JSON.parse(Buffer.from(claims, 'base64url').toString())).toEqual({ iss: '9FAJRHL979', iat: 5000 });
    const ok = verify('sha256', Buffer.from(`${head}.${claims}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(sig, 'base64url'));
    expect(ok).toBe(true);
    // Reused inside 40 minutes, renewed after.
    expect(await providerToken(env, 5_000_000 + 39 * 60_000)).toBe(jwt);
    expect(await providerToken(env, 5_000_000 + 41 * 60_000)).not.toBe(jwt);
  });
});

describe('the push', () => {
  it('carries the state, the alert and the dates Apple reads', () => {
    const body = JSON.parse(apnsBody({ event: 'update', state, priority: 10, alert: { title: 'Your turn', body: '4 bb to call' }, staleAt: 99 }, 7_000));
    expect(body.aps).toEqual({ timestamp: 7, event: 'update', 'content-state': state, alert: { title: 'Your turn', body: '4 bb to call', sound: 'default' }, 'stale-date': 99 });
    expect(JSON.parse(apnsBody({ event: 'end', state, priority: 10, dismissAt: 50 })).aps['dismissal-date']).toBe(50);
  });

  it('goes to the Live Activity topic with the right headers', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await sendLive(env, reg, { event: 'update', state, priority: 5 })).toBe('sent');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://api.push.apple.com/3/device/${reg.token}`);
    expect(init.headers).toMatchObject({ 'apns-push-type': 'liveactivity', 'apns-topic': 'com.goodwin.flipup.push-type.liveactivity', 'apns-priority': '5' });
    await sendLive(env, { ...reg, sandbox: true }, { event: 'update', state, priority: 5 });
    expect((fetchMock.mock.calls[1] as unknown as [string])[0]).toMatch(/^https:\/\/api\.sandbox\.push\.apple\.com\//);
  });

  it('says when a token is dead, and does nothing without the key', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"reason":"Unregistered"}', { status: 410 })));
    expect(await sendLive(env, reg, { event: 'update', state, priority: 5 })).toBe('gone');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"reason":"BadDeviceToken"}', { status: 400 })));
    expect(await sendLive(env, reg, { event: 'update', state, priority: 5 })).toBe('gone');
    expect(canPush({})).toBe(false);
    expect(await sendLive({}, reg, { event: 'update', state, priority: 5 })).toBe('failed');
  });

  it('only takes hex push tokens', () => {
    expect(isPushToken(reg.token)).toBe(true);
    expect(isPushToken('xyz')).toBe(false);
    expect(isPushToken('AB'.repeat(32))).toBe(false);
  });
});

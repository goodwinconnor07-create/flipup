import { expect, test } from '@playwright/test';

const profile = (hands: number) => ({ v: 1, hands, spots: { 'flop|ip|4|none|2|a': [0, 1, 0, 0, 5, 0, 0] }, stats: { vpip: 30, pfr: 20 }, seen: ['x#1'] });
const device = 'd' + 'a'.repeat(19);

test('a twin can be shared, fetched by code, refreshed and stopped, and only its owner can change it', async ({ request }) => {
  const made = await request.post('/api/twins', { data: { deviceId: device, name: 'Dana', emoji: '🦊', profile: profile(80) } });
  expect(made.status()).toBe(201);
  const { code, secret } = await made.json();
  expect(code).toMatch(/^[BCDFGHJKLMNPQRSTVWXZ]{5}$/);
  expect(secret.length).toBeGreaterThanOrEqual(8);

  // Anyone with the code sees the name, picture and counters, never the secret or the device.
  const seen = await request.get(`/api/twins/${code.toLowerCase()}`);
  expect(seen.status()).toBe(200);
  const twin = await seen.json();
  expect(twin).toMatchObject({ code, name: 'Dana', emoji: '🦊' });
  expect(twin.profile.hands).toBe(80);
  expect(twin.profile.seen).toEqual([]);
  expect(JSON.stringify(twin)).not.toContain(secret);
  expect(JSON.stringify(twin)).not.toContain(device);

  // Someone else can't change or stop it.
  const wrong = { secret: 'not-the-secret', name: 'Eve', emoji: '😈', profile: profile(5) };
  expect((await request.put(`/api/twins/${code}`, { data: wrong })).status()).toBe(403);
  expect((await request.delete(`/api/twins/${code}`, { data: { secret: 'not-the-secret' } })).status()).toBe(403);
  expect((await (await request.get(`/api/twins/${code}`)).json()).name).toBe('Dana');

  // The owner refreshes it, then stops sharing.
  const fresh = await request.put(`/api/twins/${code}`, { data: { secret, name: 'Dana', emoji: '🦊', profile: profile(120) } });
  expect(fresh.status()).toBe(200);
  expect((await (await request.get(`/api/twins/${code}`)).json()).profile.hands).toBe(120);
  expect((await request.delete(`/api/twins/${code}`, { data: { secret } })).status()).toBe(200);
  expect((await request.get(`/api/twins/${code}`)).status()).toBe(404);
});

test('a share needs a name, a picture, a device and something learned', async ({ request }) => {
  const post = (data: object) => request.post('/api/twins', { data });
  expect((await post({ name: 'Dana', emoji: '🦊', profile: profile(80) })).status()).toBe(400);
  expect((await post({ deviceId: device, name: '', emoji: '🦊', profile: profile(80) })).status()).toBe(400);
  expect((await post({ deviceId: device, name: 'Dana', emoji: 'x', profile: profile(80) })).status()).toBe(400);
  expect((await post({ deviceId: device, name: 'Dana', emoji: '🦊', profile: profile(0) })).status()).toBe(400);
  expect((await request.get('/api/twins/ABC')).status()).toBe(400);
  expect((await request.get('/api/twins/BCDFG')).status()).toBe(404);
});

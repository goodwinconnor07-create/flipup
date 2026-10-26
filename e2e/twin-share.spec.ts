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

/** Joins a table over its socket as `deviceId` and returns the players as the server then sends them. */
async function joinAs(port: string, code: string, deviceId: string, name: string, twinCode?: string) {
  const ws = new WebSocket(`ws://localhost:${port}/api/tables/${code}/ws?device=${deviceId}`);
  const players = await new Promise<{ name: string; twinCode?: string }[]>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('No table state came back.')), 8000);
    ws.onopen = () => ws.send(JSON.stringify({ t: 'act', id: 'j1', a: { type: 'join', name, emoji: '🦊', ...(twinCode ? { twinCode } : {}) } }));
    ws.onmessage = (e) => {
      const msg = JSON.parse(String(e.data));
      const me = msg.t === 'state' && msg.ack === 'j1' ? msg.game.players.find((p: { name: string }) => p.name === name) : null;
      if (me) {
        clearTimeout(timer);
        resolve(msg.game.players);
      }
    };
    ws.onerror = () => reject(new Error('Socket error'));
  });
  ws.close();
  return players.find((p) => p.name === name)!;
}

/** The players as the server first sends them to a phone that connects. */
async function peek(port: string, code: string, deviceId: string) {
  const ws = new WebSocket(`ws://localhost:${port}/api/tables/${code}/ws?device=${deviceId}`);
  const players = await new Promise<{ name: string; twinCode?: string }[]>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('No table state came back.')), 8000);
    ws.onmessage = (e) => {
      const msg = JSON.parse(String(e.data));
      if (msg.t === 'state') {
        clearTimeout(timer);
        resolve(msg.game.players);
      }
    };
    ws.onerror = () => reject(new Error('Socket error'));
  });
  ws.close();
  return players;
}

test("a table shows a twin code only for the phone that shares it", async ({ request, baseURL }) => {
  const port = new URL(baseURL!).port;
  const owner = 'd' + 'b'.repeat(19);
  const stranger = 'd' + 'c'.repeat(19);
  const host = 'd' + 'e'.repeat(19);
  const share = await (await request.post('/api/twins', { data: { deviceId: owner, name: 'Dana', emoji: '🦊', profile: profile(80) } })).json();
  const table = await request.post('/api/tables', { data: { deviceId: host, name: 'Host', emoji: '😎', settings: {}, bots: 0, twinCode: share.code } });
  const { code } = await table.json();

  // The host claimed a code it doesn't own: it's left off. The owner opening a table keeps it.
  expect((await peek(port, code, host))[0].twinCode).toBeUndefined();
  const mine = await (await request.post('/api/tables', { data: { deviceId: owner, name: 'Dana', emoji: '🦊', settings: {}, bots: 0, twinCode: share.code } })).json();
  expect((await peek(port, mine.code, owner))[0].twinCode).toBe(share.code);

  expect((await joinAs(port, code, owner, 'Dana', share.code)).twinCode).toBe(share.code);
  expect((await joinAs(port, code, stranger, 'Eve', share.code)).twinCode).toBeUndefined();
  expect((await joinAs(port, code, 'd' + 'f'.repeat(19), 'Sam')).twinCode).toBeUndefined();
});

test('Settings: sharing your twin is off until you turn it on, gives a code, and turning it off deletes it', async ({ page, request }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('seeded')) return;
    localStorage.setItem('seeded', '1');
    localStorage.setItem('flipup.profile', JSON.stringify({ name: 'Kavisha', emoji: '🦊' }));
    localStorage.setItem('flipup.twin', JSON.stringify({ v: 1, hands: 60, spots: {}, stats: { vpip: 20 }, seen: [] }));
  });
  await page.goto('/');
  await page.getByRole('button', { name: /^Your profile and settings/ }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  const sw = page.getByRole('switch', { name: 'Let friends play my twin' });
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  expect(await page.evaluate(() => localStorage.getItem('flipup.share'))).toBeNull();

  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  const row = page.getByRole('button', { name: /^Your twin code · [A-Z]{5}$/ });
  await expect(row).toBeVisible();
  const code = ((await row.textContent()) ?? '').slice(-5);
  const shared = await (await request.get(`/api/twins/${code}`)).json();
  expect(shared).toMatchObject({ name: 'Kavisha', emoji: '🦊' });
  expect(shared.profile.hands).toBe(60);

  await row.click();
  await expect(page.getByRole('heading', { name: 'Your twin code' })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();

  // Off again: the copy on the server goes.
  await page.getByRole('button', { name: /^Your profile and settings/ }).isVisible();
  await page.getByRole('switch', { name: 'Let friends play my twin' }).click();
  await expect(page.getByRole('switch', { name: 'Let friends play my twin' })).toHaveAttribute('aria-checked', 'false');
  expect((await request.get(`/api/twins/${code}`)).status()).toBe(404);
  expect(await page.evaluate(() => localStorage.getItem('flipup.share'))).toBeNull();
});

test('a keyed request that is sent again gets the same table or share back, not a second one', async ({ request }) => {
  const key = `k-${Date.now()}-${Math.random().toString(36).slice(2)}-abcdef`;
  const table = { deviceId: device, name: 'Dana', emoji: '🦊', settings: {}, bots: 1 };

  // A table: the retry (say the first answer was lost) lands on the same one, and says so.
  const first = await request.post('/api/tables', { data: table, headers: { 'Idempotency-Key': key } });
  expect(first.status()).toBe(201);
  const { code } = await first.json();
  const again = await request.post('/api/tables', { data: table, headers: { 'Idempotency-Key': key } });
  expect(again.status()).toBe(200);
  expect(again.headers()['idempotent-replayed']).toBe('true');
  expect((await again.json()).code).toBe(code);
  expect((await (await request.get(`/api/tables/${code}`)).json()).players).toHaveLength(2);

  // A new key, or another phone using the same key, is a new table.
  const fresh = await request.post('/api/tables', { data: table, headers: { 'Idempotency-Key': `${key}-new` } });
  expect((await fresh.json()).code).not.toBe(code);
  const other = await request.post('/api/tables', { data: { ...table, deviceId: 'd' + 'b'.repeat(19) }, headers: { 'Idempotency-Key': key } });
  expect(other.status()).toBe(201);
  expect((await other.json()).code).not.toBe(code);

  // A key that isn't one is refused. No key still works, as before.
  expect((await request.post('/api/tables', { data: table, headers: { 'Idempotency-Key': 'short' } })).status()).toBe(400);
  expect((await request.post('/api/tables', { data: table })).status()).toBe(201);

  // A twin share: the retry gets the same code, and a new secret that works while the first one doesn't.
  const share = { deviceId: device, name: 'Dana', emoji: '🦊', profile: profile(80) };
  const made = await request.post('/api/twins', { data: share, headers: { 'Idempotency-Key': key } });
  expect(made.status()).toBe(201);
  const one = await made.json();
  const retry = await request.post('/api/twins', { data: share, headers: { 'Idempotency-Key': key } });
  expect(retry.status()).toBe(200);
  const two = await retry.json();
  expect(two.code).toBe(one.code);
  expect(two.secret).not.toBe(one.secret);
  const update = (secret: string) => request.put(`/api/twins/${one.code}`, { data: { secret, name: 'Dana', emoji: '🦊', profile: profile(90) } });
  expect((await update(one.secret)).status()).toBe(403);
  expect((await update(two.secret)).status()).toBe(200);
  expect((await request.delete(`/api/twins/${one.code}`, { data: { secret: two.secret } })).status()).toBe(200);
});

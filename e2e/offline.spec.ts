import { expect, test } from '@playwright/test';
import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { setName } from './helpers';

// The service worker only runs in the built app, so this builds it and serves it with `vite preview`.
const PORT = 5175;
let server: ChildProcess | undefined;

test.use({ baseURL: `http://localhost:${PORT}` });

test.beforeAll(async () => {
  test.setTimeout(240_000);
  execSync('npm run build', { stdio: 'ignore' });
  server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`http://localhost:${PORT}/api/health`)).ok) return;
    } catch {
      // Not up yet.
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('preview server did not start');
});

test.afterAll(() => {
  server?.kill();
});

test('after one visit the app opens with no connection, and a game against the bots plays', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Play with Bots' })).toBeVisible();
  // The worker takes over and stores the app.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(async () => page.evaluate(async () => (await caches.keys()).length), { timeout: 20_000 })
    .toBeGreaterThanOrEqual(2);
  await expect
    .poll(async () => page.evaluate(async () => (await (await caches.open((await caches.keys()).find((k) => k.includes('files'))!)).keys()).length))
    .toBeGreaterThanOrEqual(2);

  // After a reload the worker is in charge of the page.
  await page.reload();
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  // No connection at all: a reload still opens the app.
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Play with Bots' })).toBeVisible();

  // And a game against the bots works.
  await page.getByRole('button', { name: 'Play with Bots' }).click();
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  await expect(page.getByText('Your turn')).toBeVisible({ timeout: 20_000 });
  await context.setOffline(false);
});

test('the worker never answers /api calls or hands back a page for a missing script', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  // /api goes straight to the network.
  const health = await page.evaluate(async () => (await fetch('/api/health')).status);
  expect(health).toBe(200);
  // A script that doesn't exist is the app's single-page fallback (HTML): it must not be stored as a script.
  await page.evaluate(() => fetch('/assets/does-not-exist-0000.js').then((r) => r.text()));
  const stored = await page.evaluate(async () => {
    const name = (await caches.keys()).find((k) => k.includes('files'))!;
    return (await (await caches.open(name)).keys()).map((r) => new URL(r.url).pathname);
  });
  expect(stored.some((p) => p.includes('does-not-exist'))).toBe(false);
});

test('without the worker an offline reload fails (so the test above proves something)', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
    for (const k of await caches.keys()) await caches.delete(k);
  });
  await context.setOffline(true);
  await expect(page.reload()).rejects.toThrow();
  await context.setOffline(false);
});

// The dev server loads each stylesheet on its own, so a broken one (an unclosed brace swallows every file after it)
// only shows up in the built app, where they're joined into one.
test('the built app keeps every stylesheet: Home is laid out, not plain text', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /^Ghost Hold'em\./ })).toBeAttached();
  const look = await page.evaluate(() => {
    const display = (sel: string) => getComputedStyle(document.querySelector(sel)!).display;
    return { card: display('.game-card'), modes: display('.start-row'), tabs: display('.home-tabs') };
  });
  expect(look).toEqual({ card: 'flex', modes: 'grid', tabs: 'flex' });
});

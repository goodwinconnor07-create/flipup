import { expect, test } from '@playwright/test';
test('an existing local table does not take over a fresh launch', async ({ page }) => {
  await page.goto('/');
  const entry = await page.evaluate(async () => {
    // Build a real resumable session using the same pure engine as the app.
    const gamePath = '/src/game/index.ts';
    const game = await import(/* @vite-ignore */ gamePath);
    const persistPath = '/src/state/persist.ts';
    const persist = await import(/* @vite-ignore */ persistPath);
    const deviceId = persist.loadDeviceId();
    const table = game.createTable({ hostDeviceId: deviceId, name: 'Tester', emoji: '🦊', settings: game.DEFAULT_SETTINGS, bots: 1, code: null, now: Date.now() });
    persist.saveSession({ mode: 'local', code: null, game: table });
    return !!persist.loadSession()?.game;
  });
  expect(entry).toBe(true);
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Play' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Scroll', exact: true })).not.toBeVisible();
  await expect(page.locator('.table-screen')).not.toBeVisible();
});

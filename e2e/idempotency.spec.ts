import { expect, test, type Page } from '@playwright/test';
import { setName, watchErrors } from './helpers';

/** Gets to the "Open the table" screen, with the first two tries at opening a table getting no answer. Returns the keys sent. */
async function toSetup(page: Page) {
  const keys: (string | undefined)[] = [];
  await page.route('**/api/tables', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    keys.push(route.request().headers()['idempotency-key']);
    // The app tries twice on its own before it gives up, so two aborts is one failed tap.
    if (keys.length <= 2) return route.abort('failed');
    // Later tries are answered here, so this test doesn't open real tables (the server limits how many one phone can).
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ code: 'BCDFG' }) });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with Friends' }).click();
  await setName(page, 'Kavi', '🤠');
  await page.getByRole('button', { name: 'Next' }).click();
  const open = page.getByRole('button', { name: 'Open the table' });
  await open.click();
  await expect(page.locator('.toast.error')).toBeVisible({ timeout: 15_000 });
  await expect(open).toBeEnabled();
  return { keys, open };
}

test('a table that got no answer is asked for again with the same key', async ({ page }) => {
  watchErrors(page);
  const { keys, open } = await toSetup(page);
  expect(keys).toHaveLength(2);
  expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/);
  expect(keys[1]).toBe(keys[0]);

  // Tapping again is the same request, so the same key, and this time it gets through.
  await open.click();
  await expect.poll(() => keys.length).toBe(3);
  expect(keys[2]).toBe(keys[0]);
});

test('a different request gets a different key', async ({ page }) => {
  watchErrors(page);
  const { keys, open } = await toSetup(page);
  await page.getByRole('radio', { name: '500', exact: true }).click();
  await open.click();
  await expect.poll(() => keys.length).toBe(3);
  expect(keys[2]).not.toBe(keys[0]);
});

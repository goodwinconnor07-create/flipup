import { expect, test, type Page } from '@playwright/test';
import { watchErrors } from './helpers';

async function openSettings(page: Page, answer: (route: import('@playwright/test').Route) => Promise<void>) {
  await page.addInitScript(() => {
    localStorage.setItem('flipup.profile', JSON.stringify({ name: 'Kavi', emoji: '🦊' }));
    localStorage.setItem('flipup.twin', JSON.stringify({ v: 1, hands: 80, spots: {}, stats: { vpip: 20 }, seen: [] }));
  });
  await page.route('**/api/twins', answer);
  await page.goto('/');
  await page.getByRole('button', { name: /Your profile and settings/ }).click();
  await page.getByRole('button', { name: /Settings/ }).first().click();
  return page.getByRole('switch', { name: /Let friends play my twin/ });
}

test('the share switch flips at once and stays on when the server agrees', async ({ page }) => {
  watchErrors(page);
  const sw = await openSettings(page, async (route) => {
    await new Promise((r) => setTimeout(r, 800));
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ code: 'BCDFG', secret: 'abcdefghij' }) });
  });
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('.toast', { hasText: 'can now play your twin' })).toBeVisible();
  await expect(sw).toHaveAttribute('aria-checked', 'true');
});

test('the share switch goes back, with the error, when the server says no', async ({ page }) => {
  watchErrors(page);
  const sw = await openSettings(page, async (route) => {
    await new Promise((r) => setTimeout(r, 800));
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Server said no.' }) });
  });
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('.toast.error', { hasText: 'Server said no.' })).toBeVisible();
  await expect(sw).toHaveAttribute('aria-checked', 'false');
});

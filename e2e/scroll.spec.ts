import { expect, test } from '@playwright/test';
import { shot, watchErrors } from './helpers';

test('fresh Scroll scenarios give honest feedback and survive saving/reload', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('tab', { name: 'Learn' }).click();
  await page.getByRole('button', { name: 'Play a solved scenario' }).click();
  const options = page.getByRole('group', { name: 'Your move' });
  await expect(options).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(/Your stack/)).toBeVisible();
  await expect(page.getByLabel(/Bet \(%|Raise above/)).toBeVisible();
  await shot(page, 'fresh-scroll-question');
  await options.locator('button').first().click();
  await expect(page.getByRole('button', { name: 'Next scenario' })).toBeVisible();
  await expect(options.getByText(/Solved frequency/).first()).toBeVisible();
  await expect(page.getByText(/The solved mix/)).toBeVisible();
  await shot(page, 'fresh-scroll-feedback');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByLabel('Save name').fill('A tricky decision');
  await page.locator('form').getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeVisible();
  await page.reload();
  // A restart always opens Home, even with persistent state.
  await expect(page.getByRole('tab', { name: 'Play' })).toBeVisible();
  await page.getByRole('tab', { name: 'Review' }).click();
  await page.getByRole('button', { name: /Study bank/ }).click();
  await expect(page.getByText('A tricky decision', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Play again' }).first().click();
  await expect(options).toBeVisible();
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeVisible();
});

test('a saved bot session stays on Home after a fresh launch', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('flipup.session', JSON.stringify({ mode: 'local', game: null })));
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Play' })).toBeVisible();
});

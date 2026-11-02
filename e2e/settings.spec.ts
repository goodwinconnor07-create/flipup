import { expect, test } from '@playwright/test';
import { setName, shot, watchErrors } from './helpers';

test('Settings from Home: dark mode changes the whole app and sticks, and switches flip and stay', async ({ page }) => {
  watchErrors(page);
  await page.addInitScript(() => {
    if (!localStorage.getItem('flipup.profile')) localStorage.setItem('flipup.profile', JSON.stringify({ name: 'Sam', emoji: '🦊' }));
  });
  await page.goto('/');
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(await bg()).toBe('rgb(255, 255, 255)');
  await page.getByRole('button', { name: /Your profile and settings/ }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await shot(page, 'settings-01');

  await expect(page.getByRole('radio', { name: 'Auto' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await bg()).toBe('rgb(0, 0, 0)');
  expect(await page.evaluate(() => getComputedStyle(document.body).color)).toBe('rgb(255, 255, 255)');

  const sound = page.getByRole('switch', { name: 'Sound' });
  await expect(sound).toHaveAttribute('aria-checked', 'true');
  await sound.click();
  await expect(sound).toHaveAttribute('aria-checked', 'false');
  await shot(page, 'settings-02-dark');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: /Your profile and settings/ }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('switch', { name: 'Sound' })).toHaveAttribute('aria-checked', 'false');
});

test('the table menu has the same Settings: appearance, sound and the table look', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with Bots' }).click();
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  await page.getByText('Your turn').waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByRole('radio', { name: 'Dark' })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Sound' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Table theme' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Card packs', exact: true })).toBeVisible();
  // No AI Legends at launch.
  await expect(page.getByRole('button', { name: 'Add an AI Legend' })).toHaveCount(0);
  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await shot(page, 'settings-03-table-menu');
});

test('Home has two tabs, Play and Party: no Campaign at launch', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await expect(page.locator('.home-tabs [role="tab"]')).toHaveText(['Play', 'Party']);
});

import { expect, test } from '@playwright/test';
import { setName, shot, watchErrors } from './helpers';

test('pick your own bots from the full roster, grouped by playstyle', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with Bots' }).click();
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();

  // Random is the default, and it's the recommended one.
  await expect(page.getByRole('radio', { name: 'Random table (recommended)' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('radio', { name: 'Pick your bots' }).click();
  await expect(page.getByRole('button', { name: 'Pick your bots first' })).toBeDisabled();
  await page.getByRole('button', { name: /Choose your bots/ }).click();

  // A big roster, in groups.
  await expect(page.getByRole('heading', { name: 'Solid regulars' })).toBeVisible();
  expect(await page.locator('.picker-bot').count()).toBeGreaterThan(300);
  await shot(page, '40-picker');

  // Find a name, pick two, jump to another playstyle and pick a third.
  await page.getByRole('searchbox', { name: 'Find a bot by name' }).fill('Mick');
  const mick = page.locator('.picker-bot').first();
  const mickName = (await mick.locator('.picker-name').textContent())!;
  await mick.click();
  await expect(mick).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('searchbox', { name: 'Find a bot by name' }).fill('');
  await page.getByRole('button', { name: 'Rocks' }).click();
  const rock = page.locator('.picker-group', { hasText: 'Only plays great hands' }).locator('.picker-bot').nth(1);
  const rockName = (await rock.locator('.picker-name').textContent())!;
  await rock.click();
  await expect(page.getByText('2 of 8 picked')).toBeVisible();
  await shot(page, '41-picker-picked');

  // A table holds eight bots, no more.
  const more = page.locator('.picker-bot:not(.picker-legend):not([aria-pressed="true"])');
  for (let i = 0; i < 6; i++) await more.nth(i + 5).click();
  await expect(page.getByText('8 of 8 picked')).toBeVisible();
  await more.nth(40).click();
  await expect(page.locator('.toast.error')).toContainText('full table');
  await expect(page.getByText('8 of 8 picked')).toBeVisible();

  // Take a few off, save, and the setup shows who's coming.
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(page.getByText('0 of 8 picked')).toBeVisible();
  await page.getByRole('searchbox', { name: 'Find a bot by name' }).fill(mickName);
  await page.locator('.picker-bot').first().click();
  await page.getByRole('searchbox', { name: 'Find a bot by name' }).fill(rockName);
  await page.locator('.picker-bot').first().click();
  await page.getByRole('button', { name: 'Save 2 bots' }).click();
  await expect(page.getByText('2 bots picked')).toBeVisible();
  await shot(page, '42-setup-picked');

  // They're the ones at the table.
  await page.getByRole('button', { name: 'Sit down' }).click();
  await expect(page.locator('.roster-item:not(.add-bot)')).toHaveCount(3);
  await expect(page.locator('.roster').getByText(mickName, { exact: true })).toBeVisible();
  await expect(page.locator('.roster').getByText(rockName, { exact: true })).toBeVisible();
});

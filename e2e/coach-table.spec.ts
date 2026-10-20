import { expect, test } from '@playwright/test';
import { setName, shot, watchErrors } from './helpers';

test('after a hand against bots the table offers a replay, with the coach', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play the bots' }).click();
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'One more bot' }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  // Fold as soon as it's our turn so the hand ends quickly.
  await page.getByRole('button', { name: 'Fold' }).click({ timeout: 60_000 });
  await page.getByRole('button', { name: 'Replay this hand' }).click({ timeout: 60_000 });
  await expect(page.getByText('GTO Coach').first()).toBeVisible();
  await expect(page.getByText('Replay · ', { exact: false })).toBeVisible();
  await expect(page.locator('.rp-seat.hero')).toBeVisible();
  // No buttons that act in the game: a replay is something you watch.
  await expect(page.getByRole('button', { name: 'Call', exact: true })).toHaveCount(0);
  await shot(page, 'replay-from-table');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Next hand' })).toBeVisible();
});

test('the review list shows a replay button and a coach', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('tab', { name: 'Train' }).click();
  await expect(page.getByText('GTO Coach')).toBeVisible();
  await page.getByRole('button', { name: /Review hands/ }).click();
  await expect(page.getByText('No hands yet')).toBeVisible();
  await shot(page, 'train-empty');
});

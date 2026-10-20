import { expect, test } from '@playwright/test';
import { setName, shot, watchErrors } from './helpers';

test('replay is switched off for now: no replay button after a hand', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play the bots' }).click();
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'One more bot' }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  // Fold as soon as it's our turn so the hand ends quickly.
  await page.getByRole('button', { name: 'Fold', exact: true }).click({ timeout: 60_000 });
  await expect(page.getByRole('button', { name: /Next hand|Rebuy/ }).first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole('button', { name: 'Replay this hand' })).toHaveCount(0);
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

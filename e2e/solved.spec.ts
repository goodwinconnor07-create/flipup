import { expect, test } from '@playwright/test';
import { shot, watchErrors } from './helpers';

test('play a solved hand, graded move by move', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('tab', { name: 'Scroll' }).click();
  await page.getByRole('button', { name: /Solved hands/ }).click();

  const options = page.getByRole('group', { name: 'Your move' });
  let answered = 0;
  for (let i = 0; i < 60; i++) {
    if (await page.getByRole('button', { name: 'Next hand' }).isVisible()) break;
    if ((await options.isVisible()) && (await options.locator('button:not([disabled])').count()) > 0) {
      if (answered === 0) await shot(page, 'solved-01-ask');
      await options.locator('button').first().click();
      // The grade comes straight away, with GTO's share on every option.
      await expect(page.locator('.coach-bubble').filter({ hasText: /Good|Close call|Costly/ }).first()).toBeVisible();
      await expect(options.getByText(/GTO \d+%/).first()).toBeVisible();
      if (answered === 0) await shot(page, 'solved-02-graded');
      answered++;
      await page.getByRole('button', { name: 'Carry on' }).click();
    }
    await page.waitForTimeout(500);
  }
  expect(answered).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: 'Next hand' })).toBeVisible();
  await shot(page, 'solved-03-result');
  await expect(page.getByText(/\d+ played/)).toBeVisible();
});

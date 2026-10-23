import { expect, test } from '@playwright/test';
import { shot, watchErrors } from './helpers';

test('scroll plays a whole solved hand and grades every move with a reason', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('tab', { name: 'Scroll' }).click();
  await shot(page, 'scroll-01-tab');
  await page.getByRole('button', { name: 'Start scrolling' }).click();

  const options = page.getByRole('group', { name: 'Your move' });
  const streets = new Set<string>();
  let answered = 0;
  for (let i = 0; i < 90; i++) {
    if (await page.getByRole('button', { name: 'Next hand' }).isVisible()) break;
    if ((await options.isVisible()) && (await options.locator('button:not([disabled])').count()) > 0) {
      streets.add(((await page.locator('.rp-badge').textContent()) ?? '').trim().toLowerCase());
      if (answered === 0) await shot(page, 'scroll-02-ask');
      await options.locator('button').first().click();
      // The grade comes straight away, with GTO's share on every option and at least a verdict and a reason.
      await expect(page.locator('.coach-bubble').filter({ hasText: /^(Good|Close call|Costly)$/ }).first()).toBeVisible();
      await expect(options.getByText(/GTO (\d+%|never)/).first()).toBeVisible();
      expect(await page.locator('.coach-bubble').count()).toBeGreaterThanOrEqual(4);
      if (answered === 0) await shot(page, 'scroll-03-graded');
      answered++;
      await page.getByRole('button', { name: 'Carry on' }).click();
    }
    await page.waitForTimeout(400);
  }
  expect(answered).toBeGreaterThan(1);
  expect(streets.has('preflop')).toBe(true);
  await expect(page.getByRole('button', { name: 'Next hand' })).toBeVisible();
  await shot(page, 'scroll-04-result');

  // The next hand deals straight away, and the tab counts what you've played.
  await page.getByRole('button', { name: 'Next hand' }).click();
  await expect(options.or(page.locator('.rp-felt'))).toBeVisible();
  await page.goBack();
  await page.getByRole('tab', { name: 'Scroll' }).click();
  await expect(page.getByText(/1 hands? played/)).toBeVisible();
});

import { expect, test, type Page } from '@playwright/test';
import { watchErrors } from './helpers';

/** Counts the view transitions the page starts. */
async function countTransitions(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __vt: number };
    w.__vt = 0;
    const start = document.startViewTransition?.bind(document);
    if (start) document.startViewTransition = ((update: () => void) => ((w.__vt += 1), start(update))) as typeof document.startViewTransition;
  });
}
const started = (page: Page) => page.evaluate(() => (window as unknown as { __vt: number }).__vt);

test('changing screen is immediate: no whole-page crossfade to flash', async ({ page }) => {
  watchErrors(page);
  await countTransitions(page);
  await page.goto('/');
  await page.getByRole('button', { name: /Set up your profile|Your profile and settings/ }).click();
  await expect(page.getByRole('textbox', { name: 'Your name' })).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).first().click();
  await expect(page.getByText('Deal yourself in.')).toBeVisible();
  expect(await started(page)).toBe(0);
});

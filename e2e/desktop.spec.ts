import { expect, test } from '@playwright/test';
import { setName, shot, watchErrors } from './helpers';

// A computer: a wide window, a mouse, no touch.
test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });

async function sitDown(page: import('@playwright/test').Page, extraBots: number) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play the bots' }).click();
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  for (let i = 0; i < extraBots; i++) await page.getByRole('button', { name: 'One more bot' }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
}

test('the table uses the wide screen: everyone seated round it, a side panel, nothing off the page', async ({ page }) => {
  watchErrors(page);
  await sitDown(page, 4); // 8 others
  await expect(page.getByText('Your turn')).toBeVisible({ timeout: 20_000 });

  // Everyone is seated (nobody slides away on a computer) and there's a standings and log panel.
  await expect(page.locator('.pod')).toHaveCount(8);
  await expect(page.locator('.pod.away')).toHaveCount(0);
  await expect(page.locator('.desk-side')).toBeVisible();
  await expect(page.getByText('Hand #1')).toBeVisible();

  // The page fits the window: no scrolling, and the bottom row (your cards, buttons, chips) is on screen.
  const fits = await page.evaluate(() => ({
    scrollsDown: document.documentElement.scrollHeight > innerHeight + 1,
    scrollsAcross: document.documentElement.scrollWidth > innerWidth + 1,
  }));
  expect(fits).toEqual({ scrollsDown: false, scrollsAcross: false });
  await expect(page.locator('.my-cards .pcard').first()).toBeInViewport({ ratio: 1 });
  await expect(page.locator('.my-box')).toBeInViewport({ ratio: 1 });
  await expect(page.locator('.action-buttons .btn-fold')).toBeInViewport({ ratio: 1 });

  // No seat sits on top of another.
  const boxes = await page
    .locator('.pod')
    .evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => ({ l: r.left, r: r.right, t: r.top, b: r.bottom })));
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const overlap = a.l < b.r - 2 && b.l < a.r - 2 && a.t < b.b - 2 && b.t < a.b - 2;
      expect(overlap, `seats ${i} and ${j} overlap`).toBe(false);
    }
  await shot(page, '20-desktop-table');

  // The bet sizer opens as a centred panel with every option in view.
  await page.locator('.action-buttons .btn-blue').click();
  const panel = page.locator('.raise-panel');
  await expect(panel).toBeVisible();
  for (const el of [
    panel.getByRole('button', { name: 'Min' }),
    panel.locator('.preset[aria-label="All in"]'),
    panel.locator('.btn-blue'),
    panel.getByRole('button', { name: 'Back' }),
  ])
    await expect(el).toBeInViewport({ ratio: 1 });
  await shot(page, '21-desktop-raise');
  await panel.getByRole('button', { name: 'Back' }).click();
});

test('the side panel log fills in as hands finish, and Home uses two columns', async ({ page }) => {
  watchErrors(page);
  await sitDown(page, 0);
  // Fold every hand we can; the log keeps the finished ones.
  for (let i = 0; i < 80; i++) {
    if (await page.getByText('Hand #2').isVisible()) break;
    if (await page.getByText('Your turn').isVisible()) await page.locator('.action-buttons .btn-fold').click();
    await page.waitForTimeout(400);
  }
  await expect(page.locator('.desk-log').getByText('Hand #1', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Home' }).click();
  const home = await page.locator('.screen.home').evaluate((el) => getComputedStyle(el).display);
  expect(home).toBe('grid');
  await shot(page, '22-desktop-home');
});

test.describe('a phone is left as it was', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  test('no side panel, and the row of four slides', async ({ page }) => {
    await sitDown(page, 3);
    await expect(page.locator('.pod')).toHaveCount(7);
    await expect(page.locator('.desk-side')).toHaveCount(0);
    await expect(page.locator('.desk-body')).toHaveCount(0);
    expect(await page.locator('.pod:not(.away)').count()).toBeLessThanOrEqual(4);
  });
});

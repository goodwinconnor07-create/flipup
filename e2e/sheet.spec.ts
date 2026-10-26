import { expect, test, type Page } from '@playwright/test';
import { watchErrors } from './helpers';

const offset = (page: Page) =>
  page.evaluate(() => {
    const t = document.querySelector<HTMLElement>('.sheet')?.style.transform;
    return t ? parseFloat(t.replace('translateY(', '')) : 0;
  });

async function openJoin(page: Page) {
  await page.getByRole('button', { name: 'Join with a code' }).click();
  await page.locator('.sheet').waitFor();
  await expect.poll(() => offset(page)).toBe(0);
  const grip = (await page.locator('.sheet-grip-zone').boundingBox())!;
  return { x: grip.x + grip.width / 2, y: grip.y + 10 };
}

test('a sheet follows the finger, springs back when let go slowly, and closes on a quick flick', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  const { x, y } = await openJoin(page);

  // Slow pull and let go: it follows, then settles back at rest. The sheet stays open.
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 5; i++) {
    await page.mouse.move(x, y + i * 10);
    await page.waitForTimeout(80);
  }
  expect(await offset(page)).toBeCloseTo(50, 0);
  await page.mouse.up();
  await expect.poll(() => offset(page)).toBe(0);
  await expect(page.locator('.sheet')).toHaveCount(1);

  // A short but quick flick down closes it, well under the 90px a slow pull needs.
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 15);
  await page.waitForTimeout(10);
  await page.mouse.move(x, y + 45);
  await page.waitForTimeout(10);
  await page.mouse.up();
  await expect(page.locator('.sheet')).toHaveCount(0);
});

test('grabbing a sheet while it springs back picks it up where it is', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  const { x, y } = await openJoin(page);
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) {
    await page.mouse.move(x, y + i * 10);
    await page.waitForTimeout(80);
  }
  // Let go, and take hold again straight away, while it's still on its way back.
  await page.mouse.up();
  await page.mouse.move(x, y + 60);
  await page.mouse.down();
  // Taking hold stops the spring where it is: not back at rest, not back at 60, and it stays put under a still finger.
  const held = await offset(page);
  expect(held).toBeGreaterThan(15);
  expect(held).toBeLessThan(60);
  await page.waitForTimeout(300);
  expect(await offset(page)).toBe(held);
  await page.mouse.up();
});

test('a sheet also closes with its button and the Escape key', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await openJoin(page);
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.locator('.sheet')).toHaveCount(0);
  await openJoin(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('.sheet')).toHaveCount(0);
});

test('with Reduce Motion a sheet appears in place, with no spring', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto('/');
  await page.getByRole('button', { name: 'Join with a code' }).click();
  await page.locator('.sheet').waitFor();
  expect(await offset(page)).toBe(0);
  await context.close();
});

import { expect, test } from '@playwright/test';
import { watchErrors } from './helpers';

test('a drag across a button does not press it, a tap does', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  const tile = page.getByRole('button', { name: /^Play with Bots/i });
  const box = (await tile.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  // Down, drag 30px, up on the same button: that's a scroll or a swipe, not a press.
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 30, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  await expect(page.getByText('Deal yourself in.')).toBeVisible();

  // A plain tap still works.
  await tile.click();
  await expect(page.getByRole('textbox', { name: 'Your name' })).toBeVisible();
});

import { expect, test } from '@playwright/test';
import { watchErrors } from './helpers';

const twin = (hands: number) => ({ v: 1, hands, spots: {}, stats: { vpip: 20 }, seen: [] });

test("a friend's twin shows from the saved copy at once, then updates behind it, and again when you come back", async ({ page }) => {
  watchErrors(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('seeded')) return;
    localStorage.setItem('seeded', '1');
    localStorage.setItem('flipup.profile', JSON.stringify({ name: 'Kavi', emoji: '🦊' }));
    // A copy from long ago: 60 hands, saved two hours ago.
    const friend = { code: 'BCDFG', name: 'Dana', emoji: '🐼', shared: { profile: { v: 1, hands: 60, spots: {}, stats: { vpip: 20 }, seen: [] }, at: Date.now() - 2 * 3600_000, updatedAt: 1 }, seen: { v: 1, hands: 0, spots: {}, stats: {}, seen: [] }, addedAt: 1, plays: 0 };
    localStorage.setItem('flipup.friends', JSON.stringify([friend]));
  });
  let latest = 90;
  let asked = 0;
  await page.route('**/api/twins/BCDFG', async (route) => {
    asked += 1;
    await new Promise((r) => setTimeout(r, 400));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 'BCDFG', name: 'Dana', emoji: '🐼', updatedAt: asked, profile: twin(latest) }) });
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Friends' twins/ }).click();

  // The saved copy is on screen straight away (60 hands), before the answer arrives…
  await expect(page.getByText('Their twin · 60 hands')).toBeVisible();
  // …and the fresh one replaces it.
  await expect(page.getByText('Their twin · 90 hands')).toBeVisible();
  expect(asked).toBe(1);

  // Scouting that friend fetches the latest again behind what's saved, and once more each time you come back
  // to the window or the connection returns (but not twice in a burst).
  await page.getByRole('button', { name: /Dana/ }).first().click();
  await expect.poll(() => asked).toBe(2);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.waitForTimeout(600);
  expect(asked).toBe(2);
  await page.waitForTimeout(5000);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect.poll(() => asked).toBe(3);
});

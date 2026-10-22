import { expect, test, type Page } from '@playwright/test';
import { shot, watchErrors } from './helpers';

/** Plays whatever is asked of us until the result panel shows: check when free, otherwise call. */
async function playOut(page: Page): Promise<void> {
  for (let i = 0; i < 90; i++) {
    if (await page.locator('.scroll-result').isVisible()) return;
    if (await page.getByText('Your turn').isVisible()) {
      const check = page.getByRole('button', { name: 'Check', exact: true });
      if (await check.isVisible()) await check.click();
      else await page.locator('.action-buttons .btn-green').click();
    }
    await page.waitForTimeout(400);
  }
  throw new Error('The card never finished.');
}

test('scroll through poker cards', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('tab', { name: 'Scroll' }).click();
  await shot(page, 'scroll-01-tab');
  await page.getByRole('button', { name: 'Start scrolling' }).click();

  // The card is announced first, with its goal, and the cards stay hidden until Start.
  const intro = page.locator('.scroll-intro');
  await expect(intro).toBeVisible();
  await expect(intro.locator('.intro-title')).toBeVisible();
  await expect(intro.getByText('Goal')).toBeVisible();
  await shot(page, 'scroll-02-intro');

  // You can't swipe past a card you haven't played.
  const before = await page.locator('.scroll-page').count();
  await page.mouse.move(195, 500);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(500);
  await expect(intro).toBeVisible();
  expect(await page.locator('.scroll-page').count()).toBe(before);

  await intro.getByRole('button', { name: 'Start' }).click();
  await expect(intro).toBeHidden();
  await expect(page.locator('.my-cards .pcard:not(.pcard-slot)')).toHaveCount(2);
  await shot(page, 'scroll-03-playing');

  await playOut(page);
  const result = page.locator('.scroll-result');
  await expect(result.locator('.result-text b')).toHaveText(/Passed|Missed it/);
  await expect(result.locator('.stars')).toBeVisible();
  await shot(page, 'scroll-04-result');

  // On to the next card: its intro is up, with a different title or deal.
  await result.getByRole('button', { name: 'Next card' }).click();
  await expect(page.locator('.scroll-intro').first()).toBeVisible();
  await expect(page.locator('.scroll-page.live .scroll-result')).toHaveCount(0);
  await expect(page.locator('.scroll-page.past')).toHaveCount(1);
  await shot(page, 'scroll-05-next');

  // Closing keeps your place; the level and combo show on the tab.
  await page.getByRole('button', { name: 'Close Scroll' }).click();
  await expect(page.getByRole('tab', { name: 'Scroll' })).toBeVisible();
});

/** Starts the feed on one particular card (the feed picks at random otherwise). */
async function openOn(page: Page, id: string, seed: number): Promise<void> {
  await page.addInitScript(
    ([card, n]) => {
      try {
        if (!localStorage.getItem('flipup.scroll'))
          localStorage.setItem('flipup.scroll', JSON.stringify({ current: { id: card, seed: n }, seed: n }));
      } catch {
        // Storage blocked: the feed just picks a card.
      }
    },
    [id, seed] as const,
  );
  await page.goto('/');
  await page.getByRole('tab', { name: 'Scroll' }).click();
  await page.getByRole('button', { name: 'Start scrolling' }).click();
}

/** Drags with the pointer from one height to another, in the middle of the screen. */
async function drag(page: Page, from: number, to: number): Promise<void> {
  await page.mouse.move(195, from);
  await page.mouse.down();
  await page.mouse.move(195, to, { steps: 8 });
  await page.mouse.up();
}

test('a quick spot ends at your move and lands in Scroll hands', async ({ page }) => {
  watchErrors(page);
  await openOn(page, 'call-shove-12', 5);
  await page.locator('.scroll-intro').getByRole('button', { name: 'Start' }).click();
  await expect(page.getByText('Your turn')).toBeVisible();
  await page.getByRole('button', { name: 'Fold' }).click();
  const result = page.locator('.scroll-result');
  await expect(result.locator('.result-text b')).toHaveText(/Passed|Missed it/);
  await shot(page, 'scroll-06-quick');

  // It's kept in Train, under Scroll hands, and a quick spot has no whole hand to send for the numbers.
  await page.getByRole('button', { name: 'Close Scroll' }).click();
  await page.getByRole('tab', { name: 'Train' }).click();
  await page.getByRole('button', { name: /Scroll hands/ }).click();
  await expect(page.locator('.t-row')).toHaveCount(1);
  await page.locator('.t-row').click();
  await expect(page.getByText('graded on your phone only')).toBeVisible();
  await expect(page.getByRole('button', { name: /Run the numbers/ })).toHaveCount(0);
  await shot(page, 'scroll-07-hands');
});

test('swipe on when a card is done, look back before the next one starts, and keep your place on reload', async ({ page }) => {
  watchErrors(page);
  await openOn(page, 'open-btn-100', 3);
  const intro = page.locator('.scroll-page.live .scroll-intro');
  await expect(intro).toBeVisible();
  // Before Start there is nothing behind you to look at, and swiping up goes nowhere.
  await drag(page, 500, 150);
  await expect(intro).toBeVisible();
  await intro.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByText('Your turn')).toBeVisible();
  // Mid-hand the page is locked: a swipe leaves the table alone.
  await drag(page, 300, 100);
  await expect(page.getByText('Your turn')).toBeVisible();
  await page.getByRole('button', { name: 'Fold' }).click();
  await expect(page.locator('.scroll-result')).toBeVisible();

  // Swiping up from the table moves to the next card.
  await drag(page, 250, 60);
  await expect(page.locator('.scroll-page.live .scroll-intro')).toBeVisible();
  await expect(page.locator('.scroll-page.live .scroll-result')).toHaveCount(0);

  // Before Start you can swipe down to see how the last card went.
  await drag(page, 200, 420);
  await expect.poll(async () => (await page.locator('.scroll-page.past .scroll-result').boundingBox())?.y ?? 9999).toBeLessThan(400);
  await shot(page, 'scroll-08-past');
  await drag(page, 420, 150);
  await expect(page.locator('.scroll-page.live .scroll-intro')).toBeVisible();

  // Start it, reload mid-card and the table is still there.
  await page.locator('.scroll-page.live .scroll-intro').getByRole('button', { name: 'Start' }).click();
  await expect(page.locator('.my-cards .pcard:not(.pcard-slot)')).toHaveCount(2);
  await page.reload();
  await expect(page.locator('.scroll-screen')).toBeVisible();
  await expect(page.locator('.my-cards .pcard:not(.pcard-slot)')).toHaveCount(2);
});

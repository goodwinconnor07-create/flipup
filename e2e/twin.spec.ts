import { expect, test } from '@playwright/test';
import { checkOrCall, myTurn, shot, watchErrors } from './helpers';

/** A phone with a name and picture, and (optionally) a twin that has learned from some hands. */
async function seed(page: import('@playwright/test').Page, hands: number) {
  await page.addInitScript((n) => {
    if (localStorage.getItem('seeded')) return;
    localStorage.setItem('seeded', '1');
    localStorage.setItem('flipup.profile', JSON.stringify({ name: 'Kavisha', emoji: '🦊' }));
    if (n > 0) localStorage.setItem('flipup.twin', JSON.stringify({ v: 1, hands: n, spots: {}, stats: {}, seen: [] }));
  }, hands);
}

test('Play shows the AI twins, and your twin asks for more hands first', async ({ page }) => {
  watchErrors(page);
  await seed(page, 12);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'AI twins' })).toBeVisible();
  await shot(page, 'twin-01-play');
  const you = page.getByRole('button', { name: /^Your twin\./ });
  await expect(you).toContainText('Play 38 more hands to meet it');
  await you.click();
  await expect(page.getByText('Your twin is a copy of you')).toBeVisible();
  await expect(page.getByText("You're at 12.")).toBeVisible();
  await shot(page, 'twin-02-sheet');
  await page.getByRole('button', { name: 'Not now' }).click();

  // Friends' twins aren't built yet: the tile says so.
  await page.getByRole('button', { name: /^Friends' twins/ }).click();
  await expect(page.getByText("Friends' twins are on the way.")).toBeVisible();
});

test('once it knows you, play your twin heads-up and keep teaching it', async ({ page }) => {
  watchErrors(page);
  await seed(page, 60);
  await page.goto('/');
  const you = page.getByRole('button', { name: /^Your twin\./ });
  await expect(you).toContainText('Still learning you');
  await shot(page, 'twin-03-ready');
  await you.click();

  // Heads-up against a copy of you, wearing your face and an AI badge.
  await expect(page.locator('.pod')).toHaveCount(1);
  await expect(page.locator('.pod .ai-chip')).toHaveText('AI');
  await expect(page.locator('.pod-name')).toHaveText('Kavisha AI');
  await expect(page.locator('.my-cards .pcard:not(.pcard-slot)')).toHaveCount(2, { timeout: 15_000 });
  await shot(page, 'twin-04-table');

  // Play one hand through; the twin learns from it.
  const next = page.getByRole('button', { name: /^(Next hand|Rebuy)/ });
  for (let i = 0; i < 80; i++) {
    if (await next.isVisible()) break;
    if (await myTurn(page)) await checkOrCall(page);
    await page.waitForTimeout(500);
  }
  await expect(next).toBeVisible();
  const hands = await page.evaluate(() => JSON.parse(localStorage.getItem('flipup.twin') ?? '{}').hands);
  expect(hands).toBe(61);
});

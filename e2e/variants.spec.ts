import { expect, test, type Page } from '@playwright/test';
import { checkOrCall, myTurn, setName, shot, watchErrors } from './helpers';

/** A bots-only table playing the chosen game. */
async function sitDown(page: Page, game: string) {
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with Bots' }).click();
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: /Texas Hold'em/ }).click();
  await expect(page.getByRole('dialog', { name: 'Choose a game' })).toBeVisible();
  await shot(page, `variant-picker`);
  await page.getByRole('button', { name: new RegExp(game) }).click();
  await expect(page.getByRole('button', { name: new RegExp(game) })).toBeVisible();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  await expect(page.getByRole('button', { name: new RegExp(`${game}: how it plays`) })).toBeVisible();
}

test('Crazy Pineapple: three cards, throw one away after the flop', async ({ page }) => {
  await sitDown(page, 'Crazy Pineapple');
  await expect(page.locator('.my-cards .pcard:not(.pcard-slot)')).toHaveCount(3, { timeout: 30_000 });
  // Call along until the flop betting is done and it's time to throw a card away.
  const deadline = Date.now() + 90_000;
  let tossed = false;
  while (Date.now() < deadline && !tossed) {
    const toss = page.getByText('Tap the card to throw away');
    if (await toss.isVisible()) {
      await shot(page, 'variant-pineapple-discard');
      await page.locator('.discard-card').first().click();
      tossed = true;
      break;
    }
    if (await myTurn(page)) await checkOrCall(page);
    await page.waitForTimeout(300);
  }
  expect(tossed).toBe(true);
  await expect(page.locator('.my-cards .pcard:not(.pcard-slot)')).toHaveCount(2);
});

test('Pittsburgh: seven places on the board for three rivers', async ({ page }) => {
  await sitDown(page, 'Pittsburgh');
  await expect(page.locator('.board .pcard')).toHaveCount(7);
  await page.getByRole('button', { name: /Pittsburgh: how it plays/ }).click();
  await expect(page.getByText('Three river cards are dealt instead of one.')).toBeVisible();
  await shot(page, 'variant-pittsburgh-rules');
});

test("Ghost Hold'em: the ghost sits at the table", async ({ page }) => {
  await sitDown(page, "Ghost Hold'em");
  await expect(page.getByLabel('The ghost')).toBeVisible();
  await expect(page.locator('.ghost .pcard-back')).toHaveCount(2, { timeout: 30_000 });
  await shot(page, 'variant-ghost');
});

test('Crazy Deuces: the table says deuces are wild', async ({ page }) => {
  await sitDown(page, 'Crazy Deuces');
  await page.getByRole('button', { name: /Crazy Deuces: how it plays/ }).click();
  await expect(page.getByText(/Every 2, in your hand or on the board, is wild/)).toBeVisible();
});

test('Pittsburgh: the board fits on a phone once the rivers are out', async ({ page }) => {
  await sitDown(page, 'Pittsburgh');
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if ((await page.locator('.board .pcard:not(.pcard-slot)').count()) === 7) break;
    if (await myTurn(page)) await checkOrCall(page);
    await page.waitForTimeout(300);
  }
  const board = page.locator('.board');
  const box = (await board.boundingBox())!;
  const felt = (await page.locator('.table-felt').boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(felt.x);
  expect(box.x + box.width).toBeLessThanOrEqual(felt.x + felt.width);
  await shot(page, 'variant-pittsburgh-board');
});

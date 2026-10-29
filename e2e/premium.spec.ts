import { expect, test, type Page } from '@playwright/test';
import { shot, watchErrors } from './helpers';

async function homeAsSam(page: Page, extra: Record<string, unknown> = {}): Promise<void> {
  await page.addInitScript((more) => {
    localStorage.setItem('flipup.profile', JSON.stringify({ name: 'Sam', emoji: '🦊' }));
    for (const [k, v] of Object.entries(more)) localStorage.setItem(k, JSON.stringify(v));
  }, extra);
  await page.goto('/');
  await page.getByRole('button', { name: /Your profile and settings/ }).click();
}

const offer = (page: Page) => page.getByRole('dialog', { name: 'FlipUp Premium' });

async function buy(page: Page): Promise<void> {
  await offer(page)
    .getByRole('button', { name: /Get FlipUp Premium/ })
    .click();
  await expect(offer(page).getByText("It's yours!")).toBeVisible();
}

test('Profile has a gold Premium card under Settings, and the offer shows $9 once', async ({ page }) => {
  watchErrors(page);
  await homeAsSam(page);
  const card = page.locator('.prem-card');
  await expect(card).toBeVisible();
  await expect(card).toContainText('FlipUp Premium');
  // It sits under the Settings row.
  const settings = await page.getByRole('button', { name: 'Settings' }).boundingBox();
  const cardBox = await card.boundingBox();
  expect(cardBox!.y).toBeGreaterThan(settings!.y);
  await shot(page, 'prem-01-profile');

  await card.click();
  await expect(offer(page)).toBeVisible();
  await expect(offer(page)).toContainText('$9');
  await expect(offer(page)).toContainText('Not a subscription');
  await page.waitForTimeout(1800);
  await shot(page, 'prem-02-offer');
  await offer(page).locator('.prem-checks').scrollIntoViewIfNeeded();
  await shot(page, 'prem-03-offer-bottom');

  await buy(page);
  await shot(page, 'prem-04-bought');
  await offer(page).getByRole('button', { name: 'Done' }).click();
  await expect(card).toContainText('Unlocked');
  await page.reload();
  await page.getByRole('button', { name: /Your profile and settings/ }).click();
  await expect(page.locator('.prem-card')).toContainText('Unlocked');
});

test('typing any emoji is Premium: the locked row opens the offer, and after buying it works', async ({ page }) => {
  watchErrors(page);
  await homeAsSam(page);
  await page.getByRole('button', { name: 'Change your emoji' }).click();
  // The grid is free; the typing box is locked.
  await page.getByRole('radio', { name: '🐸' }).click();
  await expect(page.getByRole('textbox', { name: 'Type any emoji' })).toHaveCount(0);
  await shot(page, 'prem-05-emoji-locked');
  await page.getByRole('button', { name: /Type any emoji/ }).click();
  await expect(offer(page)).toContainText('any emoji');
  await shot(page, 'prem-06-offer-emoji');
  await buy(page);
  await offer(page).getByRole('button', { name: 'Carry on' }).click();
  const box = page.getByRole('textbox', { name: 'Type any emoji' });
  await box.fill('🦄');
  await expect(page.locator('.look-preview .avatar')).toHaveText('🦄');
});

test('bubble colours: pick one without Premium and the offer opens; after buying it is picked', async ({ page }) => {
  watchErrors(page);
  await homeAsSam(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: /Chat bubbles/ }).click();
  await shot(page, 'prem-07-bubbles-locked');
  await page.getByRole('radio', { name: /Rainbow/ }).click();
  await expect(offer(page)).toContainText('Colour your bubbles');
  await buy(page);
  await offer(page).getByRole('button', { name: 'Carry on' }).click();
  // Back on the bubble sheet with Rainbow chosen.
  await expect(page.getByRole('radio', { name: /Rainbow/ })).toHaveAttribute('aria-checked', 'true');
  await shot(page, 'prem-08-bubbles-picked');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('flipup.profile')!));
  expect(saved.bubble).toBe('rainbow');
});

test('a Premium player seats AI Legends from the bot picker and they sit down at the table', async ({ page }) => {
  watchErrors(page);
  await page.addInitScript(() => {
    localStorage.setItem('flipup.profile', JSON.stringify({ name: 'Sam', emoji: '🦊' }));
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with Bots' }).click();
  await page.getByRole('radio', { name: 'Pick your bots' }).click();
  await page.getByRole('button', { name: /Choose your bots/ }).click();
  await shot(page, 'prem-09-picker-legends');
  // Tapping a legend without Premium opens the offer.
  await page.locator('.picker-legend', { hasText: 'Ivey' }).click();
  await expect(offer(page)).toContainText('AI Legends');
  await shot(page, 'prem-10-offer-legends');
  await buy(page);
  await offer(page).getByRole('button', { name: 'Carry on' }).click();
  // After buying, the legend is already picked.
  await expect(page.getByText('1 of 8 picked')).toBeVisible();
  await page.locator('.picker-legend', { hasText: 'Brunson' }).click();
  await page.getByRole('button', { name: /^Save 2 bots/ }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  const roster = page.locator('.roster');
  await expect(roster.getByText('Ivey', { exact: true })).toBeVisible();
  await expect(roster.getByText('Brunson', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  await expect(page.locator('.legend-chip').first()).toBeVisible({ timeout: 20_000 });
  await shot(page, 'prem-11-legend-at-table');
});

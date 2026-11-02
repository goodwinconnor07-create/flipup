import { expect, test, type Page } from '@playwright/test';
import { shot, watchErrors } from './helpers';

// The web has no payment provider yet, so the offer shows what Premium is and says it's coming soon. A phone that
// already has Premium (flipup.premium) keeps every unlock.

async function homeAsSam(page: Page, extra: Record<string, unknown> = {}): Promise<void> {
  // Only on the first load, so a later page.goto keeps what the test picked.
  await page.addInitScript((more) => {
    if (localStorage.getItem('flipup.profile')) return;
    localStorage.setItem('flipup.profile', JSON.stringify({ name: 'Sam', emoji: '🦊' }));
    for (const [k, v] of Object.entries(more)) localStorage.setItem(k, JSON.stringify(v));
  }, extra);
  await page.goto('/');
  await page.getByRole('button', { name: /Your profile and settings/ }).click();
}

const offer = (page: Page) => page.getByRole('dialog', { name: 'FlipUp Premium' });

test('the Premium card opens the offer: $9 once, and not on sale on the web yet', async ({ page }) => {
  watchErrors(page);
  await homeAsSam(page);
  const card = page.locator('.prem-card');
  await expect(card).toContainText('Card packs and bubble colours');
  await card.click();
  await expect(offer(page)).toContainText('$9');
  await expect(offer(page)).toContainText('Not a subscription');
  // Only what launches: no legends, no "any emoji".
  await expect(offer(page)).not.toContainText('AI Legends');
  await expect(offer(page)).not.toContainText('any emoji');
  const buy = offer(page).getByRole('button', { name: 'Coming soon on the web' });
  await expect(buy).toBeDisabled();
  await expect(offer(page).getByRole('button', { name: /Restore/ })).toHaveCount(0);
  await shot(page, 'prem-01-offer');
  await offer(page).getByRole('button', { name: 'Close' }).click();
  await expect(offer(page)).toHaveCount(0);
});

test('any emoji is free: the typing box works without Premium', async ({ page }) => {
  watchErrors(page);
  await homeAsSam(page);
  await page.getByRole('button', { name: 'Change your emoji' }).click();
  await page.getByRole('radio', { name: '🐸' }).click();
  await page.getByRole('textbox', { name: 'Type any emoji' }).fill('🦄');
  await expect(page.locator('.look-preview .avatar')).toHaveText('🦄');
  await expect(offer(page)).toHaveCount(0);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('flipup.profile')!));
  expect(saved.emoji).toBe('🦄');
});

test('without Premium, a bubble colour or a card pack opens the offer and nothing changes', async ({ page }) => {
  watchErrors(page);
  await homeAsSam(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: /Chat bubbles/ }).click();
  await page.getByRole('radio', { name: /Rainbow/ }).click();
  await expect(offer(page)).toContainText('Colour your bubbles');
  await offer(page).getByRole('button', { name: 'Close' }).click();

  await page.goto('/');
  await page.getByRole('button', { name: /Your profile and settings/ }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Card packs', exact: true }).click();
  // The campaign's trophy backs aren't in the launch build.
  await expect(page.getByText('Campaign trophies')).toHaveCount(0);
  await page.getByRole('radio', { name: /Holo/ }).click();
  await expect(offer(page)).toContainText('card back that shines');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('flipup.profile')!));
  expect(saved.bubble).toBeUndefined();
  expect(saved.cardPack).toBeUndefined();
});

test('a phone that already has Premium picks a bubble and a card pack, and the pack shows on its cards', async ({ page }) => {
  watchErrors(page);
  await homeAsSam(page, { 'flipup.premium': true });
  await expect(page.locator('.prem-card')).toContainText('Unlocked');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: /Chat bubbles/ }).click();
  await page.getByRole('radio', { name: /Rainbow/ }).click();
  await expect(page.getByRole('radio', { name: /Rainbow/ })).toHaveAttribute('aria-checked', 'true');
  await expect(offer(page)).toHaveCount(0);

  await page.goto('/');
  await page.getByRole('button', { name: /Your profile and settings/ }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Card packs', exact: true }).click();
  await page.getByRole('radio', { name: /Gold Rush/ }).click();
  await expect(page.locator('.pack-preview .pack-gold')).toHaveCount(2);

  await page.goto('/');
  await page.getByRole('button', { name: 'Play with Bots' }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  await expect(page.locator('.my-cards .pcard.flip-in.pack-gold').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.pod .pcard-back').first()).toBeVisible();
  await shot(page, 'prem-02-pack-at-table');
});

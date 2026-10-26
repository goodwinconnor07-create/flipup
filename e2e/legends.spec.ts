import { expect, test } from '@playwright/test';
import { shot, watchErrors } from './helpers';

test('Play lists the legends; a profile says how they play, and you can sit down against one', async ({ page }) => {
  watchErrors(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('seeded')) return;
    localStorage.setItem('seeded', '1');
    localStorage.setItem('flipup.profile', JSON.stringify({ name: 'Kavisha', emoji: '🦊' }));
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Legends' })).toBeVisible();
  for (const name of ['Phil Ivey', 'Tom Dwan']) await expect(page.getByRole('button', { name: new RegExp(`^${name}\\.`) })).toBeAttached();
  // Easiest first.
  const cards = page.locator('.legends .quick-card b');
  await expect(cards).toHaveText(['Brunson', 'Hellmuth', 'Negreanu', 'Ivey', 'Dwan', 'Rampage']);
  await page.locator('.legends .quick-row').scrollIntoViewIfNeeded();
  await shot(page, 'legends-01-shelf');

  await page.getByRole('button', { name: /^Phil Hellmuth\./ }).click();
  await expect(page.getByText('Folds most hands before the flop')).toBeVisible();
  await expect(page.getByText('Tilts after a bad beat, and plays worse')).toBeVisible();
  await expect(page.getByText(/Not their real hands, and not endorsed/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'How to beat them' })).toBeVisible();
  await expect(page.getByText('They only play 17% of their hands.')).toBeVisible();
  await shot(page, 'legends-02-profile');

  await page.getByRole('button', { name: 'Play Hellmuth' }).click();
  await expect(page.locator('.pod-name')).toHaveText('Hellmuth');
  await expect(page.locator('.pod .legend-chip')).toHaveText('★');
  await expect(page.locator('.pod .ai-chip:not(.legend-chip)')).toHaveCount(0);
  await expect(page.locator('.my-cards .pcard:not(.pcard-slot)')).toHaveCount(2, { timeout: 15_000 });
  await shot(page, 'legends-03-table');
});

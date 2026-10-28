import { expect, test } from '@playwright/test';
import { shot, watchErrors } from './helpers';

// Legends are hidden for launch (LEGENDS_ON in src/game/legends.ts). Turn them back on and remove this skip.
test.skip('Play lists the legends; a profile says how they play, and you can sit down against one', async ({ page }) => {
  watchErrors(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('seeded')) return;
    localStorage.setItem('seeded', '1');
    localStorage.setItem('flipup.profile', JSON.stringify({ name: 'Kavisha', emoji: '🦊' }));
    // Brunson already beaten, so Hellmuth is open and Negreanu is still locked.
    localStorage.setItem('flipup.progress', JSON.stringify({ beaten: { brunson: { wins: 1, first: 1 } } }));
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'AI Legends' })).toBeVisible();
  for (const name of ['Phil Ivey', 'Tom Dwan']) await expect(page.getByRole('button', { name: new RegExp(`^${name}\\.`) })).toBeAttached();
  // Easiest first.
  const cards = page.locator('.legends .quick-card b');
  await expect(cards).toHaveText(['Brunson', 'Hellmuth', 'Negreanu', 'Ivey', 'Dwan', 'Rampage']);
  await page.locator('.legends .quick-row').scrollIntoViewIfNeeded();
  await shot(page, 'legends-01-shelf');

  await expect(page.locator('.legends .quick-card.locked')).toHaveCount(4);
  await expect(page.getByRole('button', { name: /^Daniel Negreanu\./ })).toContainText('Locked');
  // The daily goals card is paused for now.
  await expect(page.getByRole('heading', { name: 'Today' })).toHaveCount(0);

  await page.getByRole('button', { name: /^Phil Hellmuth\./ }).click();
  await expect(page.getByText('Folds most hands before the flop')).toBeVisible();
  await expect(page.getByText('Tilts after a bad beat, and plays worse')).toBeVisible();
  await expect(page.getByText(/Not their real hands, and not endorsed/)).toBeVisible();
  await shot(page, 'legends-02-profile');

  await page.getByRole('button', { name: 'Play Hellmuth' }).click();
  await expect(page.locator('.pod-name')).toHaveText('Hellmuth');
  await expect(page.locator('.pod .legend-chip')).toHaveText('★');
  await expect(page.locator('.pod .ai-chip:not(.legend-chip)')).toHaveCount(0);
  await expect(page.locator('.my-cards .pcard:not(.pcard-slot)')).toHaveCount(2, { timeout: 15_000 });
  await shot(page, 'legends-03-table');
});

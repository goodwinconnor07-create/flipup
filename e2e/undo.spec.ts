import { expect, test } from '@playwright/test';
import { watchErrors } from './helpers';

const hand = (id: string, name: string) => ({ id, at: 1, title: name, cards: ['As', 'Kd'], picks: [0], grades: ['green'], name, saved: Date.now() });

test('deleting a saved hand is instant, and the toast brings it back', async ({ page }) => {
  watchErrors(page);
  await page.addInitScript((bank) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('flipup.quizbank', JSON.stringify(bank));
      sessionStorage.setItem('seeded', '1');
    }
  }, [hand('h1', 'Big river fold'), hand('h2', 'Second')]);
  await page.goto('/');
  await page.getByRole('button', { name: /Study bank/ }).first().click();
  const deletes = page.getByRole('button', { name: 'Delete' });
  await expect(deletes).toHaveCount(2);

  // No confirm sheet: it's gone at once, with an Undo toast (role=status) for a few seconds.
  await deletes.first().click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(deletes).toHaveCount(1);
  await expect(page.getByRole('status').filter({ hasText: 'Deleted "Big river fold"' })).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(deletes).toHaveCount(2);
  await expect(page.locator('.toast')).toHaveCount(0);
});

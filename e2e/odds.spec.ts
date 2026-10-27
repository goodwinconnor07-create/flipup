import { expect, test } from '@playwright/test';
import { shot, watchErrors } from './helpers';

test('odds and outs: read a formula, answer a round, see the working and the score', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('tab', { name: 'Learn' }).click();
  await page.getByRole('button', { name: /Odds and outs/ }).click();
  await expect(page.getByRole('button', { name: /Mixed quiz/ })).toBeVisible();
  await shot(page, 'odds-topics');

  await page.getByRole('button', { name: /Counting outs/ }).click();
  await expect(page.getByText('Formula')).toBeVisible();
  await shot(page, 'odds-lesson');
  await page.getByRole('button', { name: /Start the quiz/ }).click();

  for (let i = 0; i < 10; i++) {
    await expect(page.getByText(`${i + 1} of 10`)).toBeVisible();
    await page.locator('.odds-choices .answer-btn').first().click();
    await expect(page.locator('.odds-choices .answer-btn.green')).toHaveCount(1);
    if (i === 0) await shot(page, 'odds-answer');
    await page.getByRole('button', { name: i < 9 ? 'Next question' : 'See your score' }).click();
  }
  await expect(page.locator('.odds-score')).toHaveText(/\/10/);
  await shot(page, 'odds-score');
  await page.getByRole('button', { name: 'All topics' }).click();
  await expect(page.getByText(/right/).first()).toBeVisible();

  // Every question is set in a hand, even the pure maths ones.
  await page.getByRole('button', { name: /Pot odds/ }).click();
  await page.getByRole('button', { name: /Start the quiz/ }).click();
  await expect(page.locator('.odds-table .pcard')).toHaveCount(7);
  await expect(page.getByText('River', { exact: true })).toBeVisible();
  await shot(page, 'odds-potodds');
});

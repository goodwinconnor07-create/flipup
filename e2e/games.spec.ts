import { expect, test } from '@playwright/test';
import { setName, shot, watchErrors } from './helpers';

test('Home shows every game, and a card opens its rules with friends or bots', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  for (const name of ["Texas Hold'em", 'Crazy Pineapple', 'Crazy Deuces', "Ghost Hold'em", 'Pittsburgh', 'Die on the River', 'Red River', 'Imposter']) {
    await expect(page.getByRole('button', { name: new RegExp(`^${name}\\.`) })).toBeAttached();
  }
  await page.locator('.game-shelf').scrollIntoViewIfNeeded();
  await shot(page, 'games-01-shelf');

  await page.getByRole('button', { name: /^Ghost Hold'em\./ }).click();
  await expect(page.getByRole('heading', { name: "Ghost Hold'em" })).toBeVisible();
  await expect(page.getByText('A ghost is dealt two cards too.')).toBeVisible();
  await shot(page, 'games-02-start-sheet');
  await page.getByRole('button', { name: 'Play with bots', exact: true }).click();

  // No name yet: ask for one, and the game is still the one that was picked.
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('button', { name: /Ghost Hold'em/ })).toBeVisible();
});

test('a themed table gets its own look, and Texas Hold\'em keeps the player\'s felt', async ({ page }) => {
  watchErrors(page);
  await page.addInitScript(() => localStorage.setItem('flipup.profile', JSON.stringify({ name: 'Sam', emoji: '🦊' })));
  for (const [game, theme, ambient] of [
    ["Ghost Hold'em", 'ghost', 'fog'],
    ['Imposter', 'imposter', 'spotlight'],
    ['Red River', 'redriver', 'flow'],
  ]) {
    await page.goto('/');
    await page.getByRole('button', { name: new RegExp(`^${game}\\.`) }).click();
    await page.getByRole('button', { name: 'Play with bots', exact: true }).click();
    await page.getByRole('button', { name: 'Sit down' }).click();
    await page.getByRole('button', { name: 'Deal', exact: true }).click();
    await expect(page.locator(`.table-screen.themed.theme-${theme}`)).toBeVisible();
    await expect(page.locator(`.ambient-${ambient}`)).toBeAttached();
    await expect(page.locator('.table-felt')).toBeVisible();
    await page.waitForTimeout(400);
    await shot(page, `games-theme-${theme}`);
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByRole('button', { name: 'Home' }).click();
  }

  await page.goto('/');
  await page.getByRole('button', { name: /^Texas Hold'em\./ }).click();
  await page.getByRole('button', { name: 'Play with bots', exact: true }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  await expect(page.locator('.table-screen')).toBeVisible();
  await expect(page.locator('.table-screen.themed')).toHaveCount(0);
});

import { expect, test, type Page } from '@playwright/test';
import { setName, shot, watchErrors } from './helpers';

async function toPartyTab(page: Page) {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Party' }).click();
}

test('party: host picks games, a friend joins, the table opens for both, and the board moves after a game', async ({ browser }) => {
  const host = await (await browser.newContext()).newPage();
  const friend = await (await browser.newContext()).newPage();
  watchErrors(host);
  watchErrors(friend);

  // The Party tab has replaced History: Play, Learn, Party.
  await toPartyTab(host);
  await expect(host.getByRole('tab', { name: 'Review' })).toHaveCount(0);
  await shot(host, 'party-0-tab');

  // Hosting needs a name; the profile screen comes first.
  await host.getByRole('button', { name: /Host a party/ }).click();
  await setName(host, 'Kavi', '🤠');
  await host.getByRole('button', { name: 'Save' }).click();
  await host.getByRole('tab', { name: 'Party' }).click();
  await host.getByRole('button', { name: /Host a party/ }).click();

  // Six games by default; drop to the minimum of four and it can't go lower.
  await expect(host.locator('.playlist-row')).toHaveCount(6);
  await host.getByRole('button', { name: /^Remove / }).first().click();
  await host.getByRole('button', { name: /^Remove / }).first().click();
  await expect(host.locator('.playlist-row')).toHaveCount(4);
  await expect(host.getByRole('button', { name: /^Remove / }).first()).toBeDisabled();
  await shot(host, 'party-1-setup');
  await host.getByRole('button', { name: 'Open the party' }).click();

  const tiles = host.locator('.code-tiles[aria-label^="Party code"]');
  await expect(tiles).toBeVisible();
  const code = ((await tiles.getAttribute('aria-label')) ?? '').replace('Party code', '').replace(/\s/g, '');
  expect(code).toMatch(/^[A-Z]{5}$/);

  // A friend joins by typing the code.
  await toPartyTab(friend);
  await friend.getByRole('button', { name: /Join a party/ }).click();
  // No name yet: the profile screen asks first.
  await setName(friend, 'Remi', '🐸');
  await friend.getByRole('button', { name: 'Save' }).click();
  await friend.getByRole('tab', { name: 'Party' }).click();
  await friend.getByRole('button', { name: /Join a party/ }).click();
  await friend.getByLabel('Party code').fill(code);
  await expect(friend.getByText("You're in!")).toBeVisible({ timeout: 10_000 });
  await expect(host.locator('.board-row', { hasText: 'Remi' })).toBeVisible({ timeout: 10_000 });
  await shot(friend, 'party-2-lobby');

  // Only the host can start. Everyone lands on the table for game 1.
  await expect(friend.getByRole('button', { name: 'Start the party' })).toHaveCount(0);
  await host.getByRole('button', { name: 'Start the party' }).click();
  for (const page of [host, friend]) {
    await expect(page.locator('.party-pill')).toContainText('1/4', { timeout: 15_000 });
    await expect(page.locator('.my-cards .pcard:not(.pcard-slot)').first()).toBeVisible({ timeout: 20_000 });
  }
  await shot(host, 'party-3-table');

  // The host ends the game early: both phones see the leaderboard with points for game 1.
  await host.getByRole('button', { name: 'Menu' }).click();
  await host.getByRole('button', { name: 'End the game' }).click();
  await host.getByRole('button', { name: 'End game', exact: true }).click();
  for (const page of [host, friend]) {
    await expect(page.getByText('Game 1 is done')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('.board-row')).toHaveCount(2);
  }
  await shot(friend, 'party-4-between');
  // Everyone's points add up to the places paid: 10 + 7.
  const totals = await host.locator('.board-pts b').allTextContents();
  expect(totals.map(Number).sort((a, b) => b - a)).toEqual([10, 7]);

  // The host skips the break and game 2 starts on both phones.
  await host.getByRole('button', { name: 'Start next game now' }).click();
  for (const page of [host, friend]) await expect(page.locator('.party-pill')).toContainText('2/4', { timeout: 20_000 });
});

test('friends: get a friend code, add a friend by it', async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  watchErrors(a);
  watchErrors(b);

  await toPartyTab(a);
  await a.getByRole('button', { name: 'Get my code' }).click();
  await setName(a, 'Ana', '🦊');
  await a.getByRole('button', { name: 'Save' }).click();
  await a.getByRole('tab', { name: 'Party' }).click();
  await a.getByRole('button', { name: 'Get my code' }).click();
  const value = a.locator('.friend-code-value');
  await expect(value).toHaveText(/^[A-Z]{5}$/, { timeout: 10_000 });
  const code = (await value.textContent())!;

  await toPartyTab(b);
  await b.getByRole('button', { name: 'Add a friend' }).click();
  await b.getByLabel('Friend code').fill(code);
  await expect(b.locator('.friend-row', { hasText: 'Ana' })).toBeVisible({ timeout: 10_000 });
  await shot(b, 'party-5-friends');

  // It survives a reload, and can be removed.
  await toPartyTab(b);
  await expect(b.locator('.friend-row', { hasText: 'Ana' })).toBeVisible();
  await b.getByRole('button', { name: 'Remove Ana' }).click();
  await expect(b.locator('.friend-row')).toHaveCount(0);
});

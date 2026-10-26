import { expect, test, type Page } from '@playwright/test';
import { myTurn, setName, shot, tableCode, watchErrors } from './helpers';

/** Whichever phone's turn it is goes all in, and the other calls. */
async function allInAndCall(host: Page, friend: Page) {
  for (let i = 0; i < 40; i++) {
    for (const page of [host, friend]) {
      if (!(await myTurn(page))) continue;
      const allin = page.locator('.action-buttons .btn-blue');
      if (await allin.isVisible()) {
        await allin.click();
        await page.locator('.raise-panel .preset[aria-label="All in"]').click();
        await page.locator('.raise-panel .btn-blue').click();
      } else {
        await page.locator('.action-buttons .btn-green').click();
      }
    }
    if (await host.locator('.odds-box').isVisible()) return;
    await host.waitForTimeout(300);
  }
}

test('two phones: join with a code, play a hand, see odds only once both hands are face up', async ({ browser }) => {
  const hostCtx = await browser.newContext();
  const friendCtx = await browser.newContext();
  const host = await hostCtx.newPage();
  const friend = await friendCtx.newPage();
  watchErrors(host);
  watchErrors(friend);

  await host.goto('/');
  await host.getByRole('button', { name: 'Play with Friends' }).click();
  await setName(host, 'Kavi', '🤠');
  await host.getByRole('button', { name: 'Next' }).click();
  await host.getByRole('button', { name: 'Open the table' }).click();
  const code = await tableCode(host);
  expect(code).toMatch(/^[A-Z]{5}$/);
  await shot(host, '10-host-lobby');

  // The friend follows the join link.
  await friend.goto(`/${code}`);
  await expect(friend.getByText("Kavi's table")).toBeVisible();
  await friend.getByRole('button', { name: 'Take a seat' }).click();
  await setName(friend, 'Remi', '🐸');
  await friend.getByRole('button', { name: 'Take a seat' }).click();
  await expect(friend.getByText("You're in!")).toBeVisible();
  await expect(host.locator('.roster-item', { hasText: 'Remi' })).toBeVisible();
  await shot(friend, '11-friend-lobby');

  await host.getByRole('button', { name: 'Deal', exact: true }).click();
  await expect(host.locator('.my-cards .pcard:not(.pcard-slot)')).toHaveCount(2);
  await expect(friend.locator('.my-cards .pcard:not(.pcard-slot)')).toHaveCount(2);
  // Each phone sees the other's cards face down, and no odds.
  await expect(host.locator('.pod .pcard-back')).toHaveCount(2);
  await expect(friend.locator('.pod .pcard-back')).toHaveCount(2);
  await expect(host.locator('.odds-box')).toHaveCount(0);
  await shot(host, '12-host-hand');

  await allInAndCall(host, friend);
  // All in and called: both hands turn face up and both phones show the odds.
  await expect(host.locator('.odds-box')).toBeVisible();
  await expect(friend.locator('.odds-box')).toBeVisible();
  await expect(host.locator('.pod .pcard-back')).toHaveCount(0);
  await shot(host, '13-host-runout');
  await shot(friend, '14-friend-runout');

  // The board runs out and someone wins (or they split).
  await expect(host.locator('.win-banner').first()).toBeVisible({ timeout: 20_000 });
  await expect(host.locator('.board .pcard:not(.pcard-slot)')).toHaveCount(5);
  await shot(host, '15-host-result');

  await hostCtx.close();
  await friendCtx.close();
});

test('a friend whose phone drops is marked offline for everyone else', async ({ browser }) => {
  const hostCtx = await browser.newContext();
  const friendCtx = await browser.newContext();
  const host = await hostCtx.newPage();
  const friend = await friendCtx.newPage();
  watchErrors(host);
  await host.goto('/');
  await host.getByRole('button', { name: 'Play with Friends' }).click();
  await setName(host, 'Kavi');
  await host.getByRole('button', { name: 'Next' }).click();
  await host.getByRole('button', { name: 'Open the table' }).click();
  const code = await tableCode(host);
  await friend.goto(`/${code}`);
  await friend.getByRole('button', { name: 'Take a seat' }).click();
  await setName(friend, 'Oliver');
  await friend.getByRole('button', { name: 'Take a seat' }).click();
  await expect(host.locator('.roster-item', { hasText: 'Oliver' })).toBeVisible();
  await host.getByRole('button', { name: 'Deal', exact: true }).click();
  await expect(host.locator('.pod', { hasText: 'Oliver' })).toBeVisible({ timeout: 15_000 });
  await expect(host.locator('.pod.offline')).toHaveCount(0);
  // The friend's phone goes away.
  await friend.close();
  await expect(host.locator('.pod.offline', { hasText: 'Oliver' })).toBeVisible({ timeout: 15_000 });
  await expect(host.locator('.pod.offline .pod-tag.offline')).toHaveText('Offline');
  await shot(host, '18-offline');
  await hostCtx.close();
  await friendCtx.close();
});

test('a wrong code says so', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Join with a code' }).click();
  const dialog = page.getByRole('dialog', { name: 'Join a table' });
  for (const letter of 'BCDFG') await dialog.getByRole('button', { name: letter, exact: true }).click();
  await expect(page.getByText("There's no table with that code")).toBeVisible();
});

test('bots at an online table play on the server', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with Friends' }).click();
  await setName(page, 'Kavi');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'One more bot' }).click();
  await page.getByRole('button', { name: 'One more bot' }).click();
  await page.getByRole('button', { name: 'Open the table' }).click();
  await tableCode(page);
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  // Nobody else has joined: confirm dealing anyway.
  await page.getByRole('dialog', { name: 'Deal without friends?' }).getByRole('button', { name: 'Deal' }).click();

  // Play along: the bots' moves come from the server's clock, so the hand finishes without anyone else.
  for (let i = 0; i < 160; i++) {
    if (await page.getByRole('button', { name: 'Next hand' }).isVisible()) break;
    // Check when it's free, fold otherwise: never risk the stack, so a bot's shove can't end the game on hand 1.
    if (await myTurn(page)) {
      const check = page.getByRole('button', { name: 'Check', exact: true });
      if (await check.isVisible()) await check.click();
      else await page.locator('.action-buttons .btn-fold').click();
    }
    await page.waitForTimeout(500);
  }
  await expect(page.locator('.win-banner').first()).toBeVisible();
  // The next hand deals by itself.
  await expect(page.locator('.table-title small')).toHaveText('Hand 2', { timeout: 15_000 });
});

test('heads-up: when one player has all the chips, the game ends on the podium', async ({ browser }) => {
  const hostCtx = await browser.newContext();
  const friendCtx = await browser.newContext();
  const host = await hostCtx.newPage();
  const friend = await friendCtx.newPage();
  await host.goto('/');
  await host.getByRole('button', { name: 'Play with Friends' }).click();
  await setName(host, 'Kavi');
  await host.getByRole('button', { name: 'Next' }).click();
  await host.getByRole('switch', { name: /Rebuys/ }).click(); // off: no rebuy window to wait out
  await host.getByRole('button', { name: 'Open the table' }).click();
  const code = await tableCode(host);
  await friend.goto(`/${code}`);
  await friend.getByRole('button', { name: 'Take a seat' }).click();
  await setName(friend, 'Oliver');
  await friend.getByRole('button', { name: 'Take a seat' }).click();
  await expect(host.locator('.roster-item', { hasText: 'Oliver' })).toBeVisible();
  await host.getByRole('button', { name: 'Deal', exact: true }).click();

  // All in every hand until someone has everything.
  for (let i = 0; i < 200; i++) {
    if (await host.getByText(/wins?!$/).isVisible()) break;
    for (const page of [host, friend]) {
      if (!(await myTurn(page))) continue;
      const raise = page.locator('.action-buttons .btn-blue');
      if (await raise.isVisible()) {
        await raise.click();
        await page.locator('.raise-panel .preset[aria-label="All in"]').click();
        await page.locator('.raise-panel .btn-blue').click();
      } else await page.locator('.action-buttons .btn-green').click();
    }
    const next = host.getByRole('button', { name: 'Next hand' });
    if (await next.isVisible()) await next.click().catch(() => undefined);
    const next2 = friend.getByRole('button', { name: 'Next hand' });
    if (await next2.isVisible()) await next2.click().catch(() => undefined);
    await host.waitForTimeout(300);
  }
  await expect(host.getByText(/wins?!$/)).toBeVisible({ timeout: 20_000 });
  await expect(friend.getByText(/wins?!$/)).toBeVisible();
  await expect(host.locator('.podium-step')).toHaveCount(2);
  await shot(host, '16-podium');

  // Play again: the friend asks first, but nobody is seated until the host opens the new game.
  await friend.getByRole('button', { name: 'Play again', exact: true }).click();
  await expect(friend.getByRole('button', { name: /Waiting for Kavi/ })).toBeVisible();
  await expect(host.getByRole('button', { name: /Play again · 1 waiting/ })).toBeVisible();
  await host.getByRole('button', { name: /Play again/ }).click();
  await expect(host.getByRole('button', { name: 'Deal', exact: true })).toBeVisible();
  await expect(host.locator('.roster-item', { hasText: 'Oliver' })).toBeVisible();
  await expect(friend.getByText("You're in!")).toBeVisible();
  await shot(friend, '17-play-again');
  await hostCtx.close();
  await friendCtx.close();
});

test('the join popup shows its own letter keys and no phone keyboard', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Join with a code' }).click();
  const dialog = page.getByRole('dialog', { name: 'Join a table' });
  await expect(dialog.getByRole('button', { name: 'Scan a QR code' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'B', exact: true })).toBeVisible();
  await expect(dialog.getByRole('textbox')).toHaveCount(0);
  await shot(page, '20-join-popup');
});

test('the streak button opens the streak details', async ({ page }) => {
  const key = (back: number) => {
    const d = new Date();
    d.setDate(d.getDate() - back);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  await page.addInitScript((days) => localStorage.setItem('flipup.days', JSON.stringify(days)), [key(9), key(8), key(7), key(3), key(2), key(1), key(0)]);
  await page.goto('/');
  await page.getByRole('button', { name: /day streak/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Daily streak' });
  await expect(dialog.getByText('days in a row')).toBeVisible();
  await expect(dialog.getByText('Longest streak')).toBeVisible();
  await expect(dialog.getByText('4 days', { exact: true })).toBeVisible();
  await shot(page, '21-streak');
});

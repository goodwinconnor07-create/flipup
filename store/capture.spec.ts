import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { myTurn, setName, tableCode } from '../e2e/helpers';

// Real screens for the App Store cards: each test plays the app to a moment worth showing and saves it.
const DIR = new URL('./screens/', import.meta.url).pathname;
mkdirSync(DIR, { recursive: true });

async function save(page: Page, name: string): Promise<void> {
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${DIR}${name}.png` });
}

/** A returning player: a name, an emoji, a week of results and a streak. */
async function seedPlayer(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (localStorage.getItem('flipup.profile')) return;
    localStorage.setItem('flipup.profile', JSON.stringify({ name: 'Kavi', emoji: '🦊' }));
    const day = 86_400_000;
    const now = Date.now();
    const games = [
      { at: now - 6 * day, net: 420, hands: 38, players: 6 },
      { at: now - 5 * day, net: -150, hands: 24, players: 4 },
      { at: now - 4 * day, net: 610, hands: 41, players: 5 },
      { at: now - 2 * day, net: 280, hands: 30, players: 6 },
      { at: now - 1 * day, net: -90, hands: 18, players: 3 },
      { at: now - 3_600_000, net: 760, hands: 45, players: 6 },
    ];
    const net = games.reduce((s, g) => s + g.net, 0);
    const hands = games.reduce((s, g) => s + g.hands, 0);
    localStorage.setItem('flipup.stats', JSON.stringify({ net, tables: games.length, hands, counted: [], games }));
    const days = Array.from({ length: 7 }, (_, i) => new Date(now - i * day).toISOString().slice(0, 10));
    localStorage.setItem('flipup.days', JSON.stringify(days));
  });
}

/** Calls or checks until the flop is out and it's our turn again. */
async function playToFlop(page: Page): Promise<void> {
  const board = page.locator('.board .pcard:not(.pcard-slot)');
  for (let i = 0; i < 200; i++) {
    if (await page.getByRole('button', { name: /^(Next hand|Rebuy)/ }).isVisible()) {
      await page.getByRole('button', { name: /^(Next hand|Rebuy)/ }).click();
    } else if (await myTurn(page)) {
      if ((await board.count()) >= 3) return;
      const check = page.getByRole('button', { name: 'Check', exact: true });
      if (await check.isVisible()) await check.click();
      else await page.locator('.action-buttons .btn-green').click();
    }
    await page.waitForTimeout(250);
  }
  throw new Error('never reached the flop');
}

test('home', async ({ page }) => {
  await seedPlayer(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Play' })).toBeVisible();
  await save(page, 'home');
});

test('table on the flop', async ({ page }) => {
  await seedPlayer(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play the bots' }).click();
  await page.getByRole('button', { name: 'One less bot' }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  await playToFlop(page);
  await save(page, 'table-flop');
});

test('dark table on the flop', async ({ page }) => {
  await seedPlayer(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play the bots' }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Dark mode off' }).click();
  await page.getByRole('button', { name: 'Close' }).click();
  await playToFlop(page);
  await page.locator('.action-buttons .btn-blue').click();
  await expect(page.locator('.raise-panel')).toBeVisible();
  await save(page, 'table-raise-dark');
});

test('friends: lobby, and an all-in with the odds', async ({ browser }) => {
  const hostCtx = await browser.newContext();
  const friendCtx = await browser.newContext();
  const host = await hostCtx.newPage();
  const friend = await friendCtx.newPage();

  await host.goto('/');
  await host.getByRole('button', { name: 'Host a table' }).click();
  await setName(host, 'Kavi', '🦊');
  await host.getByRole('button', { name: 'Next' }).click();
  await host.getByRole('button', { name: 'Open the table' }).click();
  const code = await tableCode(host);

  await friend.goto(`/${code}`);
  await friend.getByRole('button', { name: 'Take a seat' }).click();
  await setName(friend, 'Remi', '🐸');
  await friend.getByRole('button', { name: 'Take a seat' }).click();
  await expect(host.locator('.roster-item', { hasText: 'Remi' })).toBeVisible();
  // The share link shows the dev server's address, so it's left out of the shot.
  await host.locator('.link-host').locator('xpath=ancestor::button[1]').evaluate((el) => ((el as HTMLElement).style.display = 'none'));
  await save(host, 'host-lobby');

  await host.getByRole('button', { name: 'Deal', exact: true }).click();
  await expect(host.locator('.my-cards .pcard:not(.pcard-slot)')).toHaveCount(2);
  // Whoever's turn it is goes all in, the other calls.
  for (let i = 0; i < 60 && !(await host.locator('.odds-box').isVisible()); i++) {
    for (const page of [host, friend]) {
      if (!(await myTurn(page))) continue;
      const raise = page.locator('.action-buttons .btn-blue');
      if (await raise.isVisible()) {
        await raise.click();
        await page.locator('.raise-panel .preset[aria-label="All in"]').click();
        await page.locator('.raise-panel .btn-blue').click();
      } else {
        await page.locator('.action-buttons .btn-green').click();
      }
    }
    await host.waitForTimeout(250);
  }
  await expect(host.locator('.odds-box')).toBeVisible();
  // Catch it on the turn, with odds still up.
  await expect(host.locator('.board .pcard:not(.pcard-slot)')).toHaveCount(4, { timeout: 20_000 });
  await save(host, 'allin-odds');
  await hostCtx.close();
  await friendCtx.close();
});

test('bot challenge sheet', async ({ page }) => {
  await seedPlayer(page);
  await page.goto('/');
  await page.locator('.quick-card').nth(1).click();
  await expect(page.getByRole('dialog').getByText('Goal')).toBeVisible();
  await save(page, 'challenge');
});

test('preflop drill with the coach', async ({ page }) => {
  await seedPlayer(page);
  await page.route('**/api/gto/**', (route) => route.abort());
  await page.goto('/');
  await page.getByRole('tab', { name: 'Train' }).click();
  await save(page, 'train');
  await page.getByRole('button', { name: /Poker library/ }).click();
  await page.getByRole('button', { name: /Opening the pot/ }).click();
  await expect(page.getByText('What do you do?')).toBeVisible({ timeout: 15_000 });
  await page.locator('.answer-btn').first().click();
  await expect(page.getByText('GTO says')).toBeVisible();
  await save(page, 'drill');
});

test('insights', async ({ page }) => {
  await seedPlayer(page);
  await page.goto('/');
  await page.getByRole('tab', { name: 'Insights' }).click();
  await expect(page.getByText('Recent tables')).toBeVisible();
  await save(page, 'insights');
});

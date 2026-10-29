import { expect, test, type Page } from '@playwright/test';
import { shot, tableCode, watchErrors } from './helpers';

const bankroll = (page: Page) => page.locator('.bankroll-chips');

async function openCampaign(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Campaign' }).click();
}

test.beforeEach(async ({ page }) => {
  watchErrors(page);
  // Only on the first load, so a reload keeps what the test did.
  await page.addInitScript(() => {
    if (!localStorage.getItem('flipup.profile')) localStorage.setItem('flipup.profile', JSON.stringify({ name: 'Sam', emoji: '🦊' }));
  });
});

test('first visit explains the campaign, pays the salary, and a tournament takes its buy-in', async ({ page }) => {
  await openCampaign(page);
  await expect(page.getByRole('heading', { name: 'How the campaign works' })).toBeVisible();
  await shot(page, 'campaign-intro');
  await page.getByRole('button', { name: 'Let’s go' }).click();
  await expect(page.getByRole('heading', { name: 'How the campaign works' })).not.toBeVisible();
  await page.getByRole('button', { name: 'Collect +1,000' }).click();
  await expect(bankroll(page)).toHaveText(/1,000/);
  await shot(page, 'campaign-tab');
  await page.locator('.home-sheet').evaluate((el) => el.scrollTo(0, 600));
  await shot(page, 'campaign-venues');
  await page.locator('.home-sheet').evaluate((el) => el.scrollTo(0, 99999));
  await shot(page, 'campaign-goals');

  // Every goal, in one sheet.
  await page.getByRole('button', { name: /^See all/ }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Goals' })).toBeVisible();
  await expect(page.getByRole('dialog').locator('.goal')).toHaveCount(19);
  await shot(page, 'campaign-all-goals');
  await page.getByRole('button', { name: 'Close' }).click();

  // The intro shows once.
  await page.reload();
  await page.getByRole('tab', { name: 'Campaign' }).click();
  await expect(bankroll(page)).toHaveText(/1,000/);
  await expect(page.getByRole('heading', { name: 'How the campaign works' })).not.toBeVisible();

  // The Garage's tournament: 100 to get in, and its prize is drawn as you sit down.
  await page.getByRole('listitem', { name: /^The Garage Sit & Go/ }).click();
  await page.getByRole('button', { name: 'Buy in for 100' }).click();
  await expect(page.locator('.table-screen')).toBeVisible();
  await expect(page.locator('.prize-reel')).toBeVisible();
  await shot(page, 'campaign-prize-reel');
  await expect(page.locator('.prize-total b')).toHaveText(/^\d[\d,]*$/, { timeout: 4000 });
  await page.waitForTimeout(4500);
  await shot(page, 'campaign-sng-table');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Leave the tournament' }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Campaign' })).toHaveAttribute('aria-selected', 'true');
  await expect(bankroll(page)).toHaveText(/900/);
});

test('a cash table gives the chips back when you cash out', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('flipup.campaign')) {
      const d = new Date();
      const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      localStorage.setItem('flipup.campaign', JSON.stringify({ v: 1, chips: 1000, peak: 1000, day, days: 1, intro: true }));
    }
  });
  await openCampaign(page);
  // The cash game starts on the biggest blinds you can cover.
  await expect(page.locator('.cash-stakes b')).toHaveText('5/10');
  await page.locator('.cash-go').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Sit down with 1,000' }).click();
  await expect(page.locator('.table-screen')).toBeVisible();
  // Out before the first deal, so nothing has gone in a pot yet.
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Cash out' }).click();
  await page.getByRole('button', { name: 'Cash out', exact: true }).last().click();
  await expect(bankroll(page)).toHaveText(/1,000/);
});

test('roulette takes the bet and pays a winner', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('flipup.campaign')) {
      const d = new Date();
      const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      localStorage.setItem('flipup.campaign', JSON.stringify({ v: 1, chips: 1000, peak: 1000, day, days: 1, intro: true }));
    }
  });
  await openCampaign(page);
  await page.getByRole('button', { name: /Roulette/ }).click();
  await expect(page.locator('.rl-wheel')).toBeVisible();
  await page.getByRole('radio', { name: '25' }).click();
  await page.getByRole('button', { name: /^Red/ }).click();
  await page.getByRole('button', { name: /^17/ }).click();
  await expect(page.locator('.rl-bank')).toHaveText('950');
  await shot(page, 'roulette-bets');
  await page.getByRole('button', { name: /^Spin/ }).click();
  await expect(page.locator('.rl-result.on')).toBeVisible({ timeout: 8000 });
  await shot(page, 'roulette-result');
  const n = Number(await page.locator('.rl-result .rl-n').textContent());
  const reds = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  const expected = 950 + (reds.includes(n) ? 50 : 0) + (n === 17 ? 900 : 0);
  await expect(page.locator('.rl-bank')).toHaveText(expected.toLocaleString('en-US'));
  await expect(page.locator('.rl-history i').first()).toHaveText(String(n));
});

test('friends see each other’s bankroll and play a tournament together', async ({ browser }) => {
  test.setTimeout(180_000);
  const seed = ({ name, emoji }: { name: string; emoji: string }) => {
    if (localStorage.getItem('flipup.profile')) return;
    const d = new Date();
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    localStorage.setItem('flipup.profile', JSON.stringify({ name, emoji }));
    localStorage.setItem('flipup.campaign', JSON.stringify({ v: 1, chips: name === 'Ana' ? 4200 : 1000, peak: 4200, day, days: 1, intro: true }));
  };
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  watchErrors(a);
  watchErrors(b);
  await a.addInitScript(seed, { name: 'Ana', emoji: '🦊' });
  await b.addInitScript(seed, { name: 'Ben', emoji: '🐼' });

  // Ana gets a friend code from the Campaign tab, and Ben adds her with it.
  await openCampaign(a);
  await a.getByRole('button', { name: /Get a friend code/ }).click();
  const code = (await a.locator('.camp-quiet b').textContent({ timeout: 10_000 }))!.trim();
  expect(code).toMatch(/^[A-Z]{5}$/);
  // Her bankroll goes on her card a few seconds after it changes; the code being made puts it there now.
  await openCampaign(b);
  await b.getByRole('button', { name: 'Add a friend' }).click();
  await b.keyboard.type(code);
  await expect(b.getByText('Ana is your friend now.')).toBeVisible({ timeout: 10_000 });
  await b.reload();
  await b.getByRole('tab', { name: 'Campaign' }).click();
  const board = b.getByRole('list', { name: 'You and your friends by bankroll' });
  await expect(board.locator('li').first()).toContainText('Ana', { timeout: 10_000 });
  await expect(board.locator('li').first()).toContainText('4,200');
  await shot(b, 'campaign-friends-board');

  // Ana opens the Garage for friends; Ben joins by the code and pays his own buy-in.
  await a.getByRole('button', { name: 'Play with friends' }).click();
  await shot(a, 'campaign-friends-sheet');
  await a.getByRole('button', { name: /^The Garage/ }).click();
  const table = await tableCode(a);
  await expect.poll(() => a.evaluate(() => JSON.parse(localStorage.getItem('flipup.campaign')!).chips)).toBe(4100);
  await b.goto(`/${table}`);
  await b.getByRole('button', { name: 'Buy in for 100' }).click();
  await expect(b.getByText('Your buy-in is paid.', { exact: false })).toBeVisible();
  await expect.poll(() => b.evaluate(() => JSON.parse(localStorage.getItem('flipup.campaign')!).chips)).toBe(900);
  await shot(a, 'campaign-friends-lobby');

  // Dealt: the empty seats fill with bots, and the prize reel plays on both phones.
  await a.getByRole('button', { name: 'Deal', exact: true }).click();
  await expect(a.locator('.prize-reel')).toBeVisible();
  await expect(b.locator('.prize-reel')).toBeVisible();
  await expect(a.locator('.table-title small')).toContainText('6 left', { timeout: 10_000 });

  // Ben leaves the tournament: he gives up his buy-in, and nothing comes back.
  await b.getByRole('button', { name: 'Menu' }).click();
  await b.getByRole('button', { name: 'Leave the tournament' }).click();
  await b.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(b.locator('.bankroll-chips')).toHaveText(/900/);
});

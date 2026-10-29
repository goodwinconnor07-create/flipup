import { expect, test, type Page } from '@playwright/test';
import { shot, watchErrors } from './helpers';

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

  // The intro shows once.
  await page.reload();
  await page.getByRole('tab', { name: 'Campaign' }).click();
  await expect(bankroll(page)).toHaveText(/1,000/);
  await expect(page.getByRole('heading', { name: 'How the campaign works' })).not.toBeVisible();

  // The Garage's tournament: 100 to get in.
  await page.locator('.venue-garage').getByRole('button', { name: /Tournament/ }).click();
  await page.getByRole('button', { name: 'Buy in for 100' }).click();
  await expect(page.locator('.table-screen')).toBeVisible();
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
  await page.locator('.venue-backroom').getByRole('button', { name: /Cash table/ }).click();
  await page.getByRole('button', { name: 'Sit down with 1,000' }).click();
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

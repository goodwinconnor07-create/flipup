import { expect, test, type Browser, type Page } from '@playwright/test';
import { shot, watchErrors } from './helpers';

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** A phone with a name and a bankroll of 1,000, salary already collected and the intro seen. */
async function phone(browser: Browser, name: string, emoji: string): Promise<Page> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  watchErrors(page);
  await page.addInitScript(
    ([name, emoji, day]) => {
      if (localStorage.getItem('flipup.profile')) return;
      localStorage.setItem('flipup.profile', JSON.stringify({ name, emoji }));
      localStorage.setItem('flipup.campaign', JSON.stringify({ v: 1, chips: 1000, peak: 1000, day, days: 1, streak: 1, intro: true }));
    },
    [name, emoji, todayKey()],
  );
  return page;
}

const chips = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('flipup.campaign')!) as { chips: number; bj: { paid: number; done: boolean } | null });

/** Stands on every decision until the round's result is up. */
async function playOut(page: Page): Promise<string> {
  const result = page.locator('.bj-status.big', { hasText: /You won|You lost|Your bet comes back/ });
  for (let i = 0; i < 120; i++) {
    if (await result.isVisible()) return (await result.textContent()) ?? '';
    const stand = page.getByRole('button', { name: 'Stand', exact: true });
    if (await stand.isVisible()) await stand.click();
    await page.waitForTimeout(250);
  }
  throw new Error('The round never finished');
}

test('floor games: roulette and blackjack, and a round against Vincent pays the bankroll', async ({ browser }) => {
  const page = await phone(browser, 'Sam', '🦊');
  await page.goto('/');
  await page.getByRole('tab', { name: 'Campaign' }).click();
  await expect(page.getByRole('heading', { name: 'Floor games' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Roulette/ })).toBeVisible();
  await page.getByRole('button', { name: /^Blackjack/ }).scrollIntoViewIfNeeded();
  await shot(page, 'bj-floor-games');

  await page.getByRole('button', { name: /^Blackjack/ }).click();
  await expect(page.getByRole('dialog').getByText(/I’m Vincent/)).toBeVisible();
  await shot(page, 'bj-start-sheet');
  await page.getByRole('dialog').getByRole('button', { name: 'Play with bots' }).click();

  // Vincent deals, with one or two bots at the table.
  await expect(page.locator('.bj-plate')).toHaveText('Vincent');
  const bots = await page.locator('.bj-seat .bj-bot').count();
  expect(bots).toBeGreaterThanOrEqual(1);
  expect(bots).toBeLessThanOrEqual(2);
  await expect(page.getByText(/Evening, Sam|Ah, Sam|Welcome, Sam|Good to see you, Sam/)).toBeVisible();
  await shot(page, 'bj-table-betting');

  await page.getByRole('button', { name: 'Add 100', exact: true }).click();
  await page.getByRole('button', { name: /^Deal · 125$/ }).click();
  await expect(page.locator('.bj-me .pcard').first()).toBeVisible();
  // The stake leaves the bankroll as the cards are dealt.
  await expect.poll(async () => (await chips(page)).bj?.paid ?? 0).toBeGreaterThanOrEqual(125);
  await page.waitForTimeout(1200);
  await shot(page, 'bj-table-playing');

  const text = await playOut(page);
  await shot(page, 'bj-table-result');
  const after = await chips(page);
  expect(after.bj?.done).toBe(true);
  const staked = after.bj!.paid;
  if (text.startsWith('You won')) expect(after.chips).toBeGreaterThan(1000);
  else if (text.startsWith('You lost')) expect(after.chips).toBe(1000 - staked);
  else expect(after.chips).toBe(1000);

  // The next round opens on its own, with the same bet ready.
  await expect(page.getByRole('button', { name: /^Deal · 125$/ })).toBeVisible({ timeout: 8000 });

  // Back on the tab, the card says your seat is waiting.
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('button', { name: /^Blackjack/ })).toContainText('Your seat is waiting');
});

test('invite a friend from your friends list to your blackjack table', async ({ browser }) => {
  const host = await phone(browser, 'Sam', '🦊');
  const friend = await phone(browser, 'Remi', '🐸');

  // The friend has a friend code, and the host has them on their list.
  await friend.goto('/');
  const code = await friend.evaluate(async () => {
    const deviceId = JSON.parse(localStorage.getItem('flipup.device')!);
    const res = await fetch('/api/friends', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ deviceId, name: 'Remi', emoji: '🐸' }) });
    const { code } = (await res.json()) as { code: string };
    localStorage.setItem('flipup.palcode', JSON.stringify(code));
    return code;
  });
  await friend.reload();
  await host.goto('/');
  await host.evaluate((code) => localStorage.setItem('flipup.pals', JSON.stringify([{ code, name: 'Remi', emoji: '🐸', addedAt: Date.now() }])), code);
  await host.reload();

  await host.getByRole('tab', { name: 'Campaign' }).click();
  await host.getByRole('button', { name: /^Blackjack/ }).click();
  await host.getByRole('dialog').getByRole('button', { name: 'Invite friends' }).click();
  await expect(host.getByRole('dialog').getByRole('heading', { name: 'Invite friends' })).toBeVisible({ timeout: 10_000 });
  await host.getByRole('dialog').getByRole('button', { name: 'Invite' }).click();
  await expect(host.getByRole('dialog').getByRole('button', { name: 'Sent' })).toBeVisible();
  await shot(host, 'bj-invite-sheet');
  await host.getByRole('button', { name: 'Close' }).click();

  // The invite reaches the friend's phone (it looks every 15 seconds).
  await expect(friend.locator('.bj-banner')).toContainText('Sam', { timeout: 25_000 });
  await shot(friend, 'bj-invite-banner');
  await friend.getByRole('button', { name: 'Join', exact: true }).click();
  await expect(friend.locator('.bj-seat', { hasText: 'Sam' })).toBeVisible({ timeout: 10_000 });
  await expect(host.locator('.bj-seat', { hasText: 'Remi' })).toBeVisible({ timeout: 10_000 });

  // Both bet; the cards come once everyone's in.
  await host.getByRole('button', { name: /^Bet · / }).click();
  await expect(host.getByText(/Waiting for Remi/)).toBeVisible();
  await friend.getByRole('button', { name: /^Bet · / }).click();
  await expect(host.locator('.bj-me .pcard').first()).toBeVisible({ timeout: 10_000 });
  await expect(friend.locator('.bj-me .pcard').first()).toBeVisible();
  await host.waitForTimeout(1500);
  await shot(friend, 'bj-online-playing');

  await Promise.all([playOut(host), playOut(friend)]);
  expect((await chips(host)).bj?.done).toBe(true);
  expect((await chips(friend)).bj?.done).toBe(true);
});

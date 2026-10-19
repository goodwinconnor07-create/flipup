import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { myTurn, setName, tableCode } from '../../e2e/helpers';

const OUT = new URL('./screens', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const snap = (page: Page, name: string) => page.screenshot({ path: `${OUT}/${name}.png` });

async function phone(browser: Browser): Promise<Page> {
  const { viewport, deviceScaleFactor, isMobile, hasTouch, baseURL } = test.info().project.use;
  return (await browser.newContext({ viewport, deviceScaleFactor, isMobile, hasTouch, baseURL })).newPage();
}

test('home and hand rankings', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1500);
  await snap(page, 'home');
  await page.getByRole('button', { name: /Hand rankings/ }).click();
  await page.waitForTimeout(1200);
  await snap(page, 'rankings');
});

test('bots table', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play the bots' }).click();
  await setName(page, 'Maya', '🦊');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.waitForTimeout(800);
  await snap(page, 'setup');
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  await expect(page.getByText('Your turn')).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1200);
  await snap(page, 'turn');
  await page.locator('.action-buttons .btn-blue').click();
  await page.getByRole('button', { name: 'Pot', exact: true }).click();
  await page.waitForTimeout(800);
  await snap(page, 'raise');
  await page.locator('.raise-panel .btn-blue').click();
  // Call down to a result.
  const next = page.getByRole('button', { name: /^(Next hand|Rebuy)/ });
  for (let i = 0; i < 120 && !(await next.isVisible()); i++) {
    if (await myTurn(page)) {
      const check = page.getByRole('button', { name: 'Check', exact: true });
      if (await check.isVisible()) await check.click();
      else await page.locator('.action-buttons .btn-green').click();
    }
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(1500);
  await snap(page, 'result');
});

test('online: lobby and all-in odds', async ({ browser }) => {
  const host = await phone(browser);
  await host.goto('/');
  await host.getByRole('button', { name: 'Host a table' }).click();
  await setName(host, 'Maya', '🦊');
  await host.getByRole('button', { name: 'Next' }).click();
  await host.getByRole('button', { name: 'Open the table' }).click();
  const code = await tableCode(host);
  const guests: Page[] = [];
  for (const [name, emoji] of [['Jake', '🔥'], ['Priya', '😎']] as const) {
    const g = await phone(browser);
    await g.goto(`/${code}`);
    await g.getByRole('button', { name: 'Take a seat' }).click();
    await setName(g, name, emoji);
    await g.getByRole('button', { name: 'Take a seat' }).click();
    await expect(host.locator('.roster-item', { hasText: name })).toBeVisible();
    guests.push(g);
  }
  // Show the live address, not the local dev server.
  await host.evaluate(() => {
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) n.nodeValue = n.nodeValue!.replace(/localhost:\d+/, 'flipup.kavishahtemu11.workers.dev');
  });
  await host.waitForTimeout(1500);
  await snap(host, 'lobby');
  await host.getByRole('button', { name: 'Deal', exact: true }).click();
  const all = [host, ...guests];
  for (let i = 0; i < 60 && !(await host.locator('.odds-box').isVisible()); i++) {
    for (const p of all) {
      if (!(await myTurn(p))) continue;
      const allin = p.locator('.action-buttons .btn-blue');
      if (await allin.isVisible()) {
        await allin.click();
        await p.locator('.raise-panel .preset[aria-label="All in"]').click();
        await p.locator('.raise-panel .btn-blue').click();
      } else await p.locator('.action-buttons .btn-green').click();
    }
    await host.waitForTimeout(300);
  }
  await expect(host.locator('.odds-box')).toBeVisible();
  await host.waitForTimeout(600);
  await snap(host, 'odds');
});

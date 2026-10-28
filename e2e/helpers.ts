import { expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const SHOTS = process.env.SHOTS_DIR;

/** Saves a screenshot when SHOTS_DIR is set (used to review the design). */
export async function shot(page: Page, name: string): Promise<void> {
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

/** Fails the test on any uncaught error in the page. */
export function watchErrors(page: Page): void {
  page.on('pageerror', (e) => {
    throw e;
  });
}

/** Name step: type a name, optionally pick an emoji, then Next. */
export async function setName(page: Page, name: string, emoji?: string): Promise<void> {
  await page.getByRole('textbox', { name: 'Your name' }).fill(name);
  if (emoji) {
    await page.getByRole('button', { name: 'Change your emoji' }).click();
    await page.getByRole('radio', { name: emoji }).click();
    await page.getByRole('button', { name: 'Done' }).click();
  }
}

/** Reads the join code from the invite tiles. */
export async function tableCode(page: Page): Promise<string> {
  const tiles = page.locator('.code-tiles[aria-label^="Table code"]').first();
  await expect(tiles).toBeVisible();
  return ((await tiles.getAttribute('aria-label')) ?? '').replace('Table code', '').replace(/\s/g, '');
}

/** True when it's this phone's turn. */
export async function myTurn(page: Page): Promise<boolean> {
  return page.getByText('Your turn').isVisible();
}

/** Checks if it can, otherwise calls. */
export async function checkOrCall(page: Page): Promise<void> {
  const check = page.getByRole('button', { name: 'Check', exact: true });
  if (await check.isVisible()) await check.click();
  else await page.locator('.action-buttons .btn-green').click();
}

/** Reloads the page. A launch lands on Home, so a table in progress is a tap away on its banner. */
export async function reloadToTable(page: Page): Promise<void> {
  await page.reload();
  await page.getByRole('button', { name: /^(Rejoin Lobby|Back to your table)/ }).click();
}

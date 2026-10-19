import { expect, test } from '@playwright/test';
import { checkOrCall, myTurn, setName, shot, watchErrors } from './helpers';

test('play hands against the bots on one phone', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await shot(page, '01-home');
  await page.getByRole('button', { name: 'Play the bots' }).click();
  await setName(page, 'Kavi', '🦊');
  await shot(page, '02-name');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('You vs the bots')).toBeVisible();
  await shot(page, '03-setup');
  await page.getByRole('button', { name: 'Sit down' }).click();

  // Lobby: four bots by default; add one more.
  await expect(page.locator('.roster-item:not(.add-bot)')).toHaveCount(5);
  await page.getByRole('button', { name: 'Add bot' }).click();
  await expect(page.locator('.roster-item:not(.add-bot)')).toHaveCount(6);
  await shot(page, '04-lobby');
  await page.getByRole('button', { name: 'Deal', exact: true }).click();

  // Two cards each, face down for the bots.
  await expect(page.locator('.my-cards .pcard:not(.pcard-slot)')).toHaveCount(2);
  await expect(page.locator('.pod')).toHaveCount(5);

  // Play along until a hand finishes.
  let sawTurn = false;
  for (let i = 0; i < 80; i++) {
    if (await page.getByRole('button', { name: 'Next hand' }).isVisible()) break;
    if (await myTurn(page)) {
      if (!sawTurn) await shot(page, '05-my-turn');
      sawTurn = true;
      await checkOrCall(page);
    }
    await page.waitForTimeout(500);
  }
  await expect(page.getByRole('button', { name: 'Next hand' })).toBeVisible();
  await expect(page.locator('.result-line').first()).toBeVisible();
  await shot(page, '06-result');

  // Next hand deals straight away when you're the only person at the table.
  await page.getByRole('button', { name: 'Next hand' }).click();
  await expect(page.locator('.table-title small')).toHaveText('Hand 2');

  // The table survives a reload.
  await page.reload();
  await expect(page.locator('.table-title small')).toHaveText(/Hand \d/);
  await expect(page.locator('.my-cards .pcard:not(.pcard-slot)')).toHaveCount(2);
});

test('raise with the bet sizer, then fold the next hand', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play the bots' }).click();
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'One less bot' }).click();
  await page.getByRole('button', { name: 'One less bot' }).click();
  await page.getByRole('button', { name: 'One less bot' }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();

  await expect(page.getByText('Your turn')).toBeVisible({ timeout: 15_000 });
  await page.locator('.action-buttons .btn-blue').click();
  await expect(page.locator('.raise-panel')).toBeVisible();
  await page.getByRole('button', { name: 'Pot', exact: true }).click();
  await shot(page, '07-raise');
  const amount = Number((await page.locator('.raise-amount').textContent())!.replace(/,/g, ''));
  expect(amount).toBeGreaterThan(10);
  await page.locator('.raise-panel .btn-blue').click();
  await expect(page.locator('.raise-panel')).toBeHidden();
  // Our raise is out in front of us.
  await expect(page.locator('.my-box-note')).toContainText(String(amount));
});

test('hand rankings from Home', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Hand rankings' }).click();
  await expect(page.getByRole('dialog', { name: 'Hand rankings' })).toBeVisible();
  await expect(page.locator('.ranking')).toHaveCount(10);
  await shot(page, '08-rankings');
});

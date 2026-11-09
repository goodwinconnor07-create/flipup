import { expect, test } from '@playwright/test';
import { checkOrCall, myTurn, reloadToTable, setName, shot, watchErrors } from './helpers';

test('play hands against the bots on one phone', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await shot(page, '01-home');
  await page.getByRole('button', { name: 'Play with Bots' }).click();
  await setName(page, 'Kavi', '🦊');
  await shot(page, '02-name');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('You vs the bots')).toBeVisible();
  await expect(page.getByText('Casual', { exact: true })).toBeVisible();
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
  // After a hand it says Next hand, or Rebuy if a bot just took all our chips.
  const next = page.getByRole('button', { name: /^(Next hand|Rebuy)/ });
  let sawTurn = false;
  for (let i = 0; i < 80; i++) {
    if (await next.isVisible()) break;
    if (await myTurn(page)) {
      if (!sawTurn) await shot(page, '05-my-turn');
      sawTurn = true;
      await checkOrCall(page);
    }
    await page.waitForTimeout(500);
  }
  await expect(next).toBeVisible();
  const ordinaryEngine = await page.evaluate(() => {
    const game = JSON.parse(localStorage.getItem('flipup.session') ?? 'null')?.game;
    return {
      difficulty: game?.botTable?.difficulty,
      identities: Object.keys(game?.botTable?.players ?? {}).length,
      model: game?.botTable?.traces?.at(-1)?.identityPolicyVersion,
      strategy: game?.botTable?.traces?.at(-1)?.prediction?.modelVersion,
    };
  });
  expect(ordinaryEngine.difficulty).toBe('casual');
  expect(ordinaryEngine.identities).toBe(5);
  expect(ordinaryEngine.model).toBe('everyday-1');
  expect(ordinaryEngine.strategy).toBe('baseline-7');
  await expect(page.locator('.win-banner').first()).toBeVisible();
  await shot(page, '06-result');

  // Next hand deals straight away when you're the only person at the table.
  await next.click();
  await expect(page.locator('.table-title small')).toHaveText('Hand 2', { timeout: 10_000 });

  // The table survives a reload: Home opens first, with your table one tap away.
  await reloadToTable(page);
  await expect(page.locator('.table-title small')).toHaveText(/Hand \d/);
  await expect(page.locator('.my-cards .pcard:not(.pcard-slot)')).toHaveCount(2);
});

test('against a bot with rebuys off, the hand that ends the game stays on screen before the winner page', async ({ page }) => {
  test.setTimeout(300_000);
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with Bots' }).click();
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'One less bot' }).click();
  const rebuys = page.getByRole('switch', { name: /Rebuys/ });
  if (await rebuys.isChecked()) await rebuys.click();
  await expect(rebuys).not.toBeChecked();
  // A short stack with big blinds, so the game is decided in a handful of hands.
  await page.getByRole('button', { name: 'Less Starting chips' }).click();
  for (let i = 0; i < 10 && !(await page.getByText('25/50', { exact: true }).isVisible()); i++)
    await page.getByRole('button', { name: 'More Blinds', exact: true }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();

  // All in every hand until the game is decided.
  let decided = false;
  for (let i = 0; i < 900 && !decided; i++) {
    if (await page.getByText(/The game ends in/).isVisible()) decided = true;
    else if (await page.getByText('Your turn').isVisible()) {
      const raise = page.locator('.action-buttons').getByRole('button', { name: /^(Bet|Raise)$/ });
      if (await raise.isVisible()) {
        await raise.click();
        // A short stack has no "All in" preset: the biggest one left is the whole stack.
        const allIn = page.locator('.raise-panel .preset[aria-label="All in"]');
        await ((await allIn.count()) > 0 ? allIn : page.locator('.raise-panel .preset').last()).first().click();
        await page
          .locator('.raise-panel .raise-actions')
          .getByRole('button', { name: /^(All in|Bet|Raise)$/ })
          .click();
      } else await checkOrCall(page);
    } else if (await page.getByRole('button', { name: 'Next hand' }).isVisible())
      await page.getByRole('button', { name: 'Next hand' }).click();
    await page.waitForTimeout(250);
  }
  expect(decided).toBe(true);
  // Still on the table: the banner and the cards are there, and the winner page comes after a pause.
  await expect(page.locator('.win-banner')).toBeVisible();
  await expect(page.locator('.board .pcard:not(.pcard-slot)')).toHaveCount(5);
  await expect(page.locator('.podium-step')).toHaveCount(0);
  await shot(page, '16-deciding-hand');
  await expect(page.getByText(/wins?!$/)).toBeVisible({ timeout: 12_000 });
});

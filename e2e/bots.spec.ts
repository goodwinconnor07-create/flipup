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
  await expect(page.locator('.win-banner').first()).toBeVisible();
  await shot(page, '06-result');

  // Next hand deals straight away when you're the only person at the table.
  await next.click();
  await expect(page.locator('.table-title small')).toHaveText('Hand 2', { timeout: 10_000 });

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

test('the raise panel fits on a short screen, and the hand log records the hand', async ({ page }) => {
  watchErrors(page);
  // About what's left of an iPhone screen with Safari's bars showing.
  await page.setViewportSize({ width: 390, height: 664 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Play the bots' }).click();
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  await expect(page.getByText('Your turn')).toBeVisible({ timeout: 20_000 });
  await page.locator('.action-buttons .btn-blue').click();
  const panel = page.locator('.raise-panel');
  await expect(panel).toBeVisible();
  await page.waitForTimeout(300);
  // Every option is on screen without scrolling.
  for (const el of [
    panel.getByRole('button', { name: 'Min' }),
    panel.getByRole('button', { name: 'All in' }),
    panel.locator('.btn-blue'),
    panel.getByRole('button', { name: 'Back' }),
  ]) {
    await expect(el).toBeInViewport({ ratio: 1 });
  }
  await shot(page, '09-raise-short');
  await panel.getByRole('button', { name: 'Back' }).click();
  await page.locator('.action-buttons .btn-fold').click();
  await expect(page.getByRole('button', { name: 'Show my cards' })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Show my cards' }).click();
  await expect(page.getByRole('button', { name: 'Show my cards' })).toBeHidden();

  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Hand log' }).click();
  const log = page.getByRole('dialog', { name: 'Hand log' });
  await expect(log.getByText('Hand #1')).toBeVisible();
  await expect(log.getByText(/posts the big blind/)).toBeVisible();
  await expect(log.getByText('Sam folds')).toBeVisible();
  await expect(log.getByText(/^Sam shows/)).toBeVisible();
  await expect(log.getByText(/^Your hand:/)).toBeVisible();
  await shot(page, '10-hand-log');
});

test('quick messages, table theme, sound toggle and the pre-action buttons', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play the bots' }).click();
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'One less bot' }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();

  // The dealer button and blinds are marked.
  await expect(page.locator('.pos-chip').first()).toBeVisible();

  // Quick message: a small button, a small panel, and it shows as a bubble on your chips box.
  await page.getByRole('button', { name: 'Quick messages' }).click();
  await shot(page, '11-quick-messages');
  await page.getByRole('menuitem', { name: 'Nice hand!' }).click();
  await expect(page.locator('.my-box .bubble-react')).toHaveText('Nice hand!');
  await expect(page.getByRole('menu')).toBeHidden();

  // Theme: pick a felt and a rail, and it sticks after a reload.
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Table theme' }).click();
  await page.getByRole('radio', { name: 'Burgundy' }).click();
  await page.getByRole('radio', { name: 'Light' }).click();
  await shot(page, '12-theme');
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.locator('.table-oval').first()).toHaveAttribute('style', /#8b1e3f/);
  await expect(page.locator('.table-oval').first()).toHaveClass(/rail-light/);
  // The felt really changes colour (it used to ignore the choice).
  const feltColour = () =>
    page
      .locator('.table-felt')
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundImage);
  const burgundy = await feltColour();
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Table theme' }).click();
  await page.getByRole('radio', { name: 'Midnight' }).click();
  await page.getByRole('button', { name: 'Done' }).click();
  expect(await feltColour()).not.toBe(burgundy);
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Table theme' }).click();
  await page.getByRole('radio', { name: 'Burgundy' }).click();
  await page.getByRole('button', { name: 'Done' }).click();
  await page.reload();
  await expect(page.locator('.table-oval').first()).toHaveAttribute('style', /#8b1e3f/);

  // Sound can be switched off from the menu, and stays off.
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Sound on' }).click();
  await expect(page.getByRole('button', { name: 'Sound off' })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();

  // Pre-action: while the bot is thinking, "Call any" can be armed, and then it plays itself on our turn.
  let armed = false;
  for (let i = 0; i < 120 && !armed; i++) {
    if (await page.getByText('Your turn').isVisible()) {
      const check = page.getByRole('button', { name: 'Check', exact: true });
      if (await check.isVisible()) await check.click();
      else await page.locator('.action-buttons .btn-green').click();
    }
    const call = page.getByRole('button', { name: 'Call any' });
    if (await call.isVisible()) {
      await call.click();
      await expect(call).toHaveAttribute('aria-pressed', 'true');
      armed = true;
    }
    await page.waitForTimeout(200);
  }
  expect(armed).toBe(true);
  await shot(page, '13-pre-action');
  // From here our own buttons should never sit waiting for a tap on this street. (A new street clears it.)
  const boardCount = () => page.locator('.board .pcard:not(.pcard-slot)').count();
  const armedOn = await boardCount();
  let waiting = 0;
  for (let i = 0; i < 40; i++) {
    if ((await boardCount()) !== armedOn) break;
    const visible = await page.locator('.action-buttons .btn-fold').isVisible();
    waiting = visible ? waiting + 1 : 0;
    expect(waiting).toBeLessThan(8);
    if (await page.locator('.win-banner').isVisible()) break;
    await page.waitForTimeout(150);
  }
});

test('ending a game adds to the Home totals', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play the bots' }).click();
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  await expect(page.locator('.my-cards .pcard:not(.pcard-slot)')).toHaveCount(2);
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'End the game' }).click();
  await page.getByRole('dialog', { name: 'End the game for everyone?' }).getByRole('button', { name: 'End game' }).click();
  await expect(page.getByText(/wins?!$/)).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByLabel('Your totals')).toBeVisible();
  await expect(page.getByLabel('Your totals').getByText('Tables')).toBeVisible();
  await shot(page, '14-home-totals');
});

test('with more than four others the row slides, keeps whoever is acting in view, and drops folded players', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play the bots' }).click();
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'One more bot' }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  await expect(page.locator('.pod')).toHaveCount(7);

  let sawSlide = false;
  let sawDrop = false;
  const firstShown = async () => page.locator('.pod:not(.away) .pod-name').first().textContent();
  let before = await firstShown();
  for (let i = 0; i < 60; i++) {
    expect(await page.locator('.pod:not(.away)').count()).toBeLessThanOrEqual(4);
    // Whoever is acting is always one of the visible players.
    const acting = page.locator('.pod.turn');
    if (await acting.count()) await expect(acting.first()).not.toHaveClass(/away/);
    const now = await firstShown();
    if (now !== before) sawSlide = true;
    before = now;
    if ((await page.locator('.pod.away').count()) > 3) sawDrop = true;
    if (await page.getByText('Your turn').isVisible()) await page.locator('.action-buttons .btn-fold').click();
    if (sawSlide && sawDrop) break;
    await page.waitForTimeout(400);
  }
  expect(sawDrop).toBe(true);
  await shot(page, '15-sliding-row');
});

test('against a bot with rebuys off, the hand that ends the game stays on screen before the winner page', async ({ page }) => {
  test.setTimeout(300_000);
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play the bots' }).click();
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'One less bot' }).click();
  await page.getByRole('switch', { name: /Rebuys/ }).click();
  // A short stack with big blinds, so the game is decided in a handful of hands.
  await page.getByRole('radio', { name: '500' }).click();
  await page.getByRole('radio', { name: '25/50' }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();

  // All in every hand until the game is decided.
  let decided = false;
  for (let i = 0; i < 900 && !decided; i++) {
    if (await page.getByText(/The game ends in/).isVisible()) decided = true;
    else if (await page.getByText('Your turn').isVisible()) {
      const raise = page.locator('.action-buttons .btn-blue');
      if (await raise.isVisible()) {
        await raise.click();
        await page.locator('.raise-panel .preset[aria-label="All in"]').click();
        await page.locator('.raise-panel .btn-blue').click();
      } else await page.locator('.action-buttons .btn-green').click();
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

test('the recorded sound effects load and decode', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  const durations = await page.evaluate(async () => {
    const c = new AudioContext();
    const out: Record<string, number> = {};
    for (const f of ['all-in', 'betting-calling', 'card-placed', 'cards-shuffled']) {
      const data = await (await fetch(`/sounds/${f}.mp3`)).arrayBuffer();
      out[f] = (await c.decodeAudioData(data)).duration;
    }
    return out;
  });
  for (const d of Object.values(durations)) expect(d).toBeGreaterThan(0.3);
});

test("after a hand the host can reveal the bots' hands, next to Show cards", async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play the bots' }).click();
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  await expect(page.locator('.my-cards .pcard:not(.pcard-slot)')).toHaveCount(2);
  // Not during the hand, and it isn't a table setting any more.
  await expect(page.getByRole('button', { name: "Reveal the bots' hands" })).toHaveCount(0);
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByRole('button', { name: /bots' hands/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Close' }).click();

  // Fold, and wait for the hand to finish.
  const reveal = page.getByRole('button', { name: "Reveal the bots' hands" });
  for (let i = 0; i < 100 && !(await reveal.isVisible()); i++) {
    if (await page.getByText('Your turn').isVisible()) await page.locator('.action-buttons .btn-fold').click();
    await page.waitForTimeout(400);
  }
  await expect(reveal).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show my cards' })).toBeVisible();
  const back = page.locator('.pod .pod-cards .pcard-back');
  // Anyone who folded kept their cards hidden: some backs are showing, until we reveal.
  await shot(page, '17-reveal-button');
  await reveal.click();
  await expect(page.locator('.pod .pod-cards .pcard-back')).toHaveCount(0);
  await expect(reveal).toHaveCount(0);
  expect(await back.count()).toBe(0);
});

test('every player has a position: yours too', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play the bots' }).click();
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'One less bot' }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  await expect(page.locator('.my-cards .pcard:not(.pcard-slot)')).toHaveCount(2);
  // Four seats: BTN, SB, BB and CO between them (one is mine).
  const labels = await page.locator('.pos-chip').allTextContents();
  expect(labels.sort()).toEqual(['BB', 'BTN', 'CO', 'SB']);
  await expect(page.locator('.my-box .pos-chip')).toHaveCount(1);
});

test('rising blinds: a setting, a countdown on the table', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play the bots' }).click();
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('radiogroup', { name: 'Blinds go up' }).getByRole('radio', { name: '5 min', exact: true }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await expect(page.getByText('Blinds up 5 min')).toBeVisible();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  await expect(page.locator('.table-title small')).toContainText(/blinds up in 4:\d\d|blinds up in 5:00/);
  await shot(page, '18-blind-clock');
});

test('dark mode: a switch in the menu that changes the whole app and sticks', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(await bg()).toBe('rgb(255, 255, 255)');
  await page.getByRole('button', { name: 'Play the bots' }).click();
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  await page.getByText('Your turn').waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Menu' }).click();
  await shot(page, '19-menu-light');
  await page.getByRole('button', { name: 'Dark mode off' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await bg()).toBe('rgb(14, 15, 20)');
  await shot(page, '19-menu-dark');
  await page.getByRole('button', { name: 'Close' }).click();
  await page.waitForTimeout(500);
  await shot(page, '19-table-dark');
  // Nothing on the table is still white-on-white: the text colour has flipped too.
  expect(await page.evaluate(() => getComputedStyle(document.body).color)).toBe('rgb(244, 244, 248)');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

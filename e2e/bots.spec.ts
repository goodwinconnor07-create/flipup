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

  // The table survives a reload: Home opens first, with your table one tap away.
  await reloadToTable(page);
  await expect(page.locator('.table-title small')).toHaveText(/Hand \d/);
  await expect(page.locator('.my-cards .pcard:not(.pcard-slot)')).toHaveCount(2);
});

test('raise with the bet sizer, then fold the next hand', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with Bots' }).click();
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

test('opening the bet sizer does not move or resize the table', async ({ page }) => {
  watchErrors(page);
  // A short screen, where the table is as tall as it can be.
  await page.setViewportSize({ width: 390, height: 664 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with Bots' }).click();
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  await expect(page.getByText('Your turn')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(800);
  const size = () => page.evaluate(() => [document.documentElement.scrollHeight, document.querySelector('.table-oval')!.getBoundingClientRect().height]);
  const before = await size();
  await page.locator('.action-buttons .btn-blue').click();
  await expect(page.locator('.raise-panel')).toBeVisible();
  for (let i = 0; i < 8; i++) {
    expect(await size()).toEqual(before);
    await page.waitForTimeout(40);
  }
  await page.getByRole('button', { name: 'Back' }).click();
  expect(await size()).toEqual(before);
});

test('bot table talk never overlaps: messages stay inside the seat row, small and in turn', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with Bots' }).click();
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  let seen = 0;
  for (let i = 0; i < 160; i++) {
    if (await page.getByText('Your turn').isVisible()) await page.locator('.action-buttons .btn-green').click();
    const boxes = await page.locator('.pod .bubble-react').evaluateAll((els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect();
        return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: innerWidth };
      }),
    );
    seen += boxes.length;
    for (const a of boxes) {
      expect(a.l).toBeGreaterThanOrEqual(-1);
      expect(a.r).toBeLessThanOrEqual(a.w + 1);
    }
    for (let x = 0; x < boxes.length; x++)
      for (let y = x + 1; y < boxes.length; y++) {
        const [p, q] = [boxes[x], boxes[y]];
        const overlap = p.l < q.r && q.l < p.r && p.t < q.b && q.t < p.b;
        expect(overlap, 'two bot lines on screen at once').toBe(false);
      }
    await page.waitForTimeout(150);
  }
  console.log('bot lines seen:', seen);
});

test('a heads-up game opens with the VS intro, and the bot says hello by name', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with Bots' }).click();
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'One less bot' }).click();
  await page.getByRole('button', { name: 'One less bot' }).click();
  await page.getByRole('button', { name: 'One less bot' }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  const started = Date.now();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  // Heads-up opens with the VS intro in place of a countdown, and nobody speaks until it's over.
  await expect(page.locator('.versus')).toBeVisible();
  await expect(page.locator('.versus')).toContainText('Sam');
  await expect(page.getByText(/Dealing in \d/)).toHaveCount(0);
  await page.waitForTimeout(1200);
  await shot(page, '14-versus');
  await expect(page.locator('.pod .thread')).toHaveCount(0);
  await expect(page.locator('.versus')).toBeHidden({ timeout: 3000 });
  // Then the bot says hello by name, and only after it has spoken do the cards come.
  await expect(page.locator('.pod .thread')).toContainText('Sam', { timeout: 3000 });
  await shot(page, '15-hello');
  await expect(page.locator('.my-cards .pcard:not(.pcard-slot)')).toHaveCount(2, { timeout: 10_000 });
  expect(Date.now() - started).toBeGreaterThanOrEqual(2900);
});

test('the +N badge lists the players out of the row with their chips', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with Bots' }).click();
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'One more bot' }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  const badge = page.getByRole('button', { name: /more players not shown/ });
  await expect(badge).toBeVisible({ timeout: 15_000 });
  await badge.click();
  const list = page.getByRole('dialog', { name: 'Other players' });
  await expect(list).toBeVisible();
  const rows = list.locator('.hidden-row');
  expect(await rows.count()).toBeGreaterThanOrEqual(1);
  // Each row has a name and a chip count.
  await expect(rows.first().locator('.hidden-name')).not.toBeEmpty();
  await expect(rows.first().locator('.num')).toHaveText(/\d/);
  await shot(page, '16-hidden-players');
  // Tapping away closes it.
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(list).toBeHidden();
});

test('names are at most 10 characters, even one saved before the limit', async ({ page }) => {
  watchErrors(page);
  await page.addInitScript(() => localStorage.setItem('flipup.profile', JSON.stringify({ name: 'Alexandrina Longname', emoji: '🙂' })));
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with Bots' }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  // The saved name was cut to ten characters.
  await expect(page.getByText('Alexandrin', { exact: true })).toBeVisible();
  await expect(page.getByText(/Alexandrina/)).toHaveCount(0);
});

test('the name box stops at 10 characters', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with Bots' }).click();
  const input = page.getByRole('textbox', { name: 'Your name' });
  await input.fill('ABCDEFGHIJKLMNOP');
  await expect(input).toHaveValue('ABCDEFGHIJ');
});

test('the screen is kept awake while you are at a table', async ({ page }) => {
  watchErrors(page);
  // A stand-in for the browser's wake lock that counts what the app asks for and lets go of.
  await page.addInitScript(() => {
    const w = window as unknown as { __locks: { asked: number; released: number } };
    w.__locks = { asked: 0, released: 0 };
    Object.defineProperty(navigator, 'wakeLock', {
      value: {
        request: async () => {
          w.__locks.asked++;
          return { release: async () => void w.__locks.released++ };
        },
      },
    });
  });
  await page.goto('/');
  const locks = () => page.evaluate(() => (window as unknown as { __locks: { asked: number; released: number } }).__locks);
  expect((await locks()).asked).toBe(0);
  await page.getByRole('button', { name: 'Play with Bots' }).click();
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await expect.poll(async () => (await locks()).asked).toBeGreaterThanOrEqual(1);
  // Still held while playing.
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  await expect(page.getByText('Your turn')).toBeVisible({ timeout: 20_000 });
  const l = await locks();
  expect(l.released).toBeLessThan(l.asked);
});

test('a finished hand can be shared from the hand log as plain text', async ({ page }) => {
  watchErrors(page);
  // A stand-in share sheet that keeps what it was given.
  await page.addInitScript(() => {
    (navigator as unknown as { share: (d: ShareData) => Promise<void> }).share = async (d) => {
      (window as unknown as { __shared: ShareData }).__shared = d;
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with Bots' }).click();
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  await expect(page.getByText('Your turn')).toBeVisible({ timeout: 20_000 });
  await page.locator('.action-buttons .btn-fold').click();
  await expect(page.getByRole('button', { name: 'Show my cards' })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Hand log' }).click();
  await page.getByRole('button', { name: 'Share hand #1' }).click();
  const shared = await page.evaluate(() => (window as unknown as { __shared: ShareData }).__shared);
  expect(shared.text).toContain('FlipUp · Hand #1');
  expect(shared.text).toContain('Your hand:');
  expect(shared.text).toMatch(/[♠♥♦♣]/);
  expect(shared.text).toContain('Sam folds');
  expect(shared.text).not.toMatch(/\[[2-9TJQKA][shdc]\]/);
});

test('hand rankings from Home', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /profile/ }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
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
  await page.getByRole('button', { name: 'Play with Bots' }).click();
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
  await page.getByRole('button', { name: 'Play with Bots' }).click();
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'One less bot' }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();

  // The dealer button and blinds are marked.
  await expect(page.locator('.pos-chip').first()).toBeVisible({ timeout: 10_000 });

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
  await reloadToTable(page);
  await expect(page.locator('.table-oval').first()).toHaveAttribute('style', /#8b1e3f/);

  // Sound can be switched off from the menu, and stays off.
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('switch', { name: 'Sound' }).click();
  await expect(page.getByRole('switch', { name: 'Sound' })).toHaveAttribute('aria-checked', 'false');
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

// History is off Home for now, so nothing opens this; it comes back with it.
test.skip('ending a game adds to History', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with Bots' }).click();
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  await expect(page.locator('.my-cards .pcard:not(.pcard-slot)')).toHaveCount(2);
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'End the game' }).click();
  await page.getByRole('dialog', { name: 'End the game for everyone?' }).getByRole('button', { name: 'End game' }).click();
  await expect(page.getByText(/wins?!$/)).toBeVisible({ timeout: 10_000 });
  // The finish screen is one long page: the big number, then standings further down.
  await expect(page.locator('.fin-big')).toBeVisible();
  await page.getByRole('heading', { name: 'Final standings' }).scrollIntoViewIfNeeded();
  await expect(page.locator('.standing')).toHaveCount(await page.locator('.standing').count());
  await shot(page, '17-finish-screen');
  await page.getByRole('button', { name: 'Done' }).click();
  // History counts tables by where you finished, not chips.
  await page.getByRole('tab', { name: 'History' }).click();
  await expect(page.getByText('Recent tables')).toBeVisible();
  await expect(page.getByText(/\d(st|nd|rd|th) of \d/)).toBeVisible();
  await shot(page, '14-home-totals');
});

test('with more than four others the row slides, keeps whoever is acting in view, and drops folded players', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with Bots' }).click();
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
  await page.getByRole('button', { name: 'Play with Bots' }).click();
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
        // A short stack has no "All in" preset: the biggest one left is the whole stack.
        const allIn = page.locator('.raise-panel .preset[aria-label="All in"]');
        await (((await allIn.count()) > 0 ? allIn : page.locator('.raise-panel .preset').last()).first().click());
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

test("after a hand the host can tap a bot to turn its cards over, next to Show cards", async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with Bots' }).click();
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  await expect(page.locator('.my-cards .pcard:not(.pcard-slot)')).toHaveCount(2);
  // There's no button for it, in the hand or in the menu: it's a tap on the bot itself, once the hand is over.
  await expect(page.getByRole('button', { name: /bots' hands/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByRole('button', { name: /bots' hands/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Close' }).click();

  // Fold every hand until one ends with a bot's cards still face down (a showdown turns them over by itself).
  const showCards = page.getByRole('button', { name: 'Show my cards' });
  const hidden = page.locator('.pod .pod-cards .pcard-back');
  for (let hand = 0; hand < 8; hand++) {
    for (let i = 0; i < 100 && !(await showCards.isVisible()); i++) {
      if (await page.getByText('Your turn').isVisible()) await page.locator('.action-buttons .btn-fold').click();
      await page.waitForTimeout(400);
    }
    await expect(showCards).toBeVisible();
    if ((await hidden.count()) > 0) break;
    await page.getByRole('button', { name: /^(Next hand|Rebuy)/ }).click();
    await expect(showCards).toHaveCount(0);
  }
  const pod = page.locator('.pod', { has: page.locator('.pcard-back') }).first();
  await expect(pod).toBeVisible();
  const before = await hidden.count();
  await shot(page, '17-bot-face-down');
  await pod.click();
  // Just that bot turns its two cards over.
  await expect(hidden).toHaveCount(before - 2);
  await expect(pod.locator('.pcard-back')).toHaveCount(0);
});

test('every player has a position: yours too', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with Bots' }).click();
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
  await page.getByRole('button', { name: 'Play with Bots' }).click();
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('radiogroup', { name: 'Blinds stop increasing at' })).toHaveCount(0);
  await page.getByRole('slider', { name: 'Blinds go up every' }).fill('5');
  await expect(page.getByRole('radiogroup', { name: 'Blinds stop increasing at' }).getByRole('radio', { name: 'No limit' })).toBeVisible();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await expect(page.getByText('Blinds double every 5 min')).toBeVisible();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  await expect(page.locator('.table-title small')).toContainText(/blinds up in 4:\d\d|blinds up in 5:00/);
  await shot(page, '18-blind-clock');
});

test('dark mode: an appearance choice in the menu that changes the whole app and sticks', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(await bg()).toBe('rgb(255, 255, 255)');
  await page.getByRole('button', { name: 'Play with Bots' }).click();
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  await page.getByText('Your turn').waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Menu' }).click();
  await shot(page, '19-menu-light');
  await expect(page.getByRole('radio', { name: 'Auto' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await bg()).toBe('rgb(0, 0, 0)');
  await shot(page, '19-menu-dark');
  await page.getByRole('button', { name: 'Close' }).click();
  await page.waitForTimeout(500);
  await shot(page, '19-table-dark');
  // Nothing on the table is still white-on-white: the text colour has flipped too.
  expect(await page.evaluate(() => getComputedStyle(document.body).color)).toBe('rgb(255, 255, 255)');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

// History is off Home for now, so nothing opens this; it comes back with it.
test.skip('home: games first, results from finished tables in History', async ({ page }) => {
  watchErrors(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('flipup.stats')) return;
    localStorage.setItem('flipup.profile', JSON.stringify({ name: 'Connor', emoji: '😎' }));
    const at = Date.now() - 3_600_000;
    localStorage.setItem(
      'flipup.stats',
      JSON.stringify({ net: 200, tables: 2, hands: 40, counted: [], games: [{ at, net: 300, hands: 20, players: 4, place: 1, variant: 'ghost' }, { at, net: -100, hands: 20, players: 5, place: 3 }] }),
    );
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Play' })).toBeVisible();
  await expect(page.getByText('Hi Connor.')).toBeVisible();
  // Chips reset every game, so Home never counts them.
  await expect(page.getByText(/chips/)).toHaveCount(0);
  // Every game has a card, and there are no learning tabs any more.
  await expect(page.getByRole('button', { name: /Ghost Hold'em/ })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Learn' })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Review' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Play with Friends' })).toBeVisible();
  await page.getByRole('tab', { name: 'History' }).click();
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
  await expect(page.getByText('1st of 4')).toBeVisible();
  await expect(page.getByText('Recent tables')).toBeVisible();
  await expect(page.getByText("Ghost Hold'em").first()).toBeVisible();
});

test('a table with players out of view never scrolls sideways', async ({ page }) => {
  watchErrors(page);
  await page.setViewportSize({ width: 460, height: 1000 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with Bots' }).click();
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'One more bot' }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  await page.getByText('Your turn').waitFor({ timeout: 30_000 });
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('button', { name: 'Fold' })).toBeEnabled();
});

test('when the blinds go up, a red banner slides down from the top, stays about five seconds, then slides out', async ({ page }) => {
  watchErrors(page);
  // A fake clock, so the five-minute blind level passes at once.
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with Bots' }).click();
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('slider', { name: 'Blinds go up every' }).fill('5');
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  await page.clock.fastForward(4000);
  await expect(page.locator('.my-cards .pcard:not(.pcard-slot)')).toHaveCount(2);
  await page.clock.fastForward('06:00');
  const banner = page.locator('.blind-banner');
  for (let i = 0; i < 80 && !(await banner.isVisible()); i++) {
    if (await page.getByText('Your turn').isVisible()) await page.locator('.action-buttons .btn-fold').click().catch(() => {});
    await page.clock.fastForward(1500);
    await page.waitForTimeout(100);
  }
  await expect(banner).toBeVisible();
  await expect(banner).toHaveText(/Blinds are now 10\/20 🚨/);
  await page.waitForTimeout(600);
  await shot(page, '22-blinds-banner');
  expect((await banner.boundingBox())?.y).toBe(0);
  // Still there a few seconds in, then it slides out and is removed.
  await page.clock.fastForward(2500);
  await expect(banner).toBeVisible();
  await expect(banner).not.toHaveClass(/leaving/);
  let sawLeaving = false;
  for (let i = 0; i < 60 && (await banner.count()) > 0; i++) {
    if (((await banner.getAttribute('class')) ?? '').includes('leaving')) sawLeaving = true;
    await page.clock.fastForward(100);
    await page.waitForTimeout(30);
  }
  expect(sawLeaving).toBe(true);
  await expect(banner).toHaveCount(0);
});

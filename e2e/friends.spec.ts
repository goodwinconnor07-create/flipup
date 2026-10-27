import { expect, test, type Page } from '@playwright/test';
import { myTurn, shot, tableCode, watchErrors } from './helpers';

const phone = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 };

/** A phone with a name and picture, and a twin that has learned how its owner folds to bets and rarely bets. */
async function seedTwin(page: Page, name: string, emoji: string, hands: number) {
  await page.addInitScript(
    ([n, e, h]) => {
      if (localStorage.getItem('seeded')) return;
      localStorage.setItem('seeded', '1');
      localStorage.setItem('flipup.profile', JSON.stringify({ name: n, emoji: e }));
      if (h > 0) {
        const stats = { vpip: 60, pfr: 40, firstIn: 60, betsFaced: 40, foldsToBet: 28, betOpps: 60, bets: 10 };
        localStorage.setItem('flipup.twin', JSON.stringify({ v: 1, hands: h, spots: {}, stats, seen: [] }));
      }
    },
    [name, emoji, hands] as const,
  );
}

/** Turns "Let friends play my twin" on in Settings and returns the code. */
async function shareMyTwin(page: Page): Promise<string> {
  await page.goto('/');
  await page.getByRole('button', { name: /^Your profile and settings/ }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('switch', { name: 'Let friends play my twin' }).click();
  const row = page.getByRole('button', { name: /^Your twin code · [A-Z]{5}$/ });
  await expect(row).toBeVisible();
  return ((await row.textContent()) ?? '').slice(-5);
}

test("add a friend's twin by its code, scout it, and play it", async ({ browser }) => {
  const danaCtx = await browser.newContext(phone);
  const samCtx = await browser.newContext(phone);
  const dana = await danaCtx.newPage();
  const sam = await samCtx.newPage();
  watchErrors(dana);
  watchErrors(sam);
  await seedTwin(dana, 'Dana', '🦊', 120);
  await seedTwin(sam, 'Sam', '🐼', 0);
  const code = await shareMyTwin(dana);

  await sam.goto('/');
  await sam.getByRole('button', { name: /^Friends' twins/ }).click();
  await shot(sam, 'friends-01-empty');
  await sam.getByRole('button', { name: "Add a friend's twin" }).first().click();
  // A wrong code says so; the right one opens Dana's twin.
  await sam.getByRole('textbox', { name: 'Twin code' }).fill('BCDFG');
  await expect(sam.getByText('No twin with that code')).toBeVisible();
  await sam.getByRole('textbox', { name: 'Twin code' }).fill(code);
  await expect(sam.getByText("Dana's twin").first()).toBeVisible();
  await expect(sam.getByText('They fold to 70% of bets after the flop.')).toBeVisible();
  await expect(sam.getByText(/^Plan: Bet your good hands and keep your bluffs small/)).toBeVisible();
  await shot(sam, 'friends-02-scout');

  // Play their twin: a heads-up game against a copy of Dana, with a badge.
  await sam.getByRole('button', { name: "Play Dana's twin" }).click();
  await expect(sam.locator('.pod .ai-chip')).toHaveText('AI');
  await expect(sam.locator('.pod-name')).toHaveText('Dana AI');
  await expect(sam.locator('.my-cards .pcard:not(.pcard-slot)')).toHaveCount(2, { timeout: 15_000 });
  await shot(sam, 'friends-03-table');

  // The twin Sam plays against remembers that it has played Dana once.
  const friends = await sam.evaluate(() => JSON.parse(localStorage.getItem('flipup.friends') ?? '[]'));
  expect(friends[0]).toMatchObject({ code, name: 'Dana', plays: 1 });
  await danaCtx.close();
  await samCtx.close();
});

test('a friend who shares their twin turns up in your friends after you play a hand together', async ({ browser }) => {
  const danaCtx = await browser.newContext(phone);
  const samCtx = await browser.newContext(phone);
  const dana = await danaCtx.newPage();
  const sam = await samCtx.newPage();
  watchErrors(dana);
  watchErrors(sam);
  await seedTwin(dana, 'Dana', '🦊', 120);
  await seedTwin(sam, 'Sam', '🐼', 0);
  const code = await shareMyTwin(dana);

  // Dana opens a table (her seat shows her twin code) and Sam joins it.
  await dana.reload();
  await dana.getByRole('button', { name: 'Play with Friends' }).click();
  await dana.getByRole('button', { name: 'Open the table' }).click();
  const table = await tableCode(dana);
  await sam.goto(`/${table}`);
  await sam.getByRole('button', { name: 'Take a seat' }).click();
  await expect(sam.getByText("You're in!")).toBeVisible();
  await dana.getByRole('button', { name: 'Deal', exact: true }).click();
  await expect(sam.locator('.my-cards .pcard:not(.pcard-slot)')).toHaveCount(2, { timeout: 10_000 });

  // Play the hand out: whoever's turn it is folds or checks.
  for (let i = 0; i < 80; i++) {
    for (const page of [dana, sam]) {
      if (!(await myTurn(page))) continue;
      const fold = page.locator('.action-buttons .btn-fold');
      if (await fold.isVisible()) await fold.click();
    }
    if (await sam.getByRole('button', { name: /^(Next hand|Rebuy)/ }).isVisible()) break;
    if (await sam.locator('.win-banner').first().isVisible()) break;
    await sam.waitForTimeout(300);
  }
  await expect(sam.locator('.win-banner').first()).toBeVisible();

  // Sam's phone counted Dana's moves and fetched the twin she shares.
  await expect
    .poll(async () => (await sam.evaluate(() => JSON.parse(localStorage.getItem('flipup.friends') ?? '[]')))[0]?.shared?.profile?.hands ?? 0, { timeout: 15_000 })
    .toBe(120);
  const friends = await sam.evaluate(() => JSON.parse(localStorage.getItem('flipup.friends') ?? '[]'));
  expect(friends).toHaveLength(1);
  expect(friends[0]).toMatchObject({ code, name: 'Dana' });
  expect(friends[0].seen.hands).toBe(1);
  await danaCtx.close();
  await samCtx.close();
});

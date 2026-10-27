import { expect, test } from '@playwright/test';
import { checkOrCall, myTurn, shot, watchErrors } from './helpers';

/** A phone with a name and picture, and (optionally) a twin that has learned from some hands. */
async function seed(page: import('@playwright/test').Page, hands: number) {
  await page.addInitScript((n) => {
    if (localStorage.getItem('seeded')) return;
    localStorage.setItem('seeded', '1');
    localStorage.setItem('flipup.profile', JSON.stringify({ name: 'Kavisha', emoji: '🦊' }));
    if (n > 0) localStorage.setItem('flipup.twin', JSON.stringify({ v: 1, hands: n, spots: {}, stats: {}, seen: [] }));
  }, hands);
}

test('Play shows the AI twins, and your twin asks for more hands first', async ({ page }) => {
  watchErrors(page);
  await seed(page, 12);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'AI twins' })).toBeVisible();
  await shot(page, 'twin-01-play');
  const you = page.getByRole('button', { name: /^Your twin\./ });
  await expect(you).toContainText('Play 38 more hands to meet it');
  await you.click();
  await expect(page.getByText('Your twin is a copy of you')).toBeVisible();
  await expect(page.getByText("You're at 12.")).toBeVisible();
  await shot(page, 'twin-02-sheet');
  await page.getByRole('button', { name: 'Not now' }).click();

  // Friends' twins open their own list.
  await page.getByRole('button', { name: /^Friends' twins/ }).click();
  await expect(page.getByRole('button', { name: "Add a friend's twin" }).first()).toBeVisible();
});

test('once it knows you, play your twin heads-up and keep teaching it', async ({ page }) => {
  watchErrors(page);
  await seed(page, 60);
  await page.goto('/');
  const you = page.getByRole('button', { name: /^Your twin\./ });
  await expect(you).toContainText('Still learning you');
  await shot(page, 'twin-03-ready');
  await you.click();

  // Heads-up against a copy of you, wearing your face and an AI badge.
  await expect(page.locator('.pod')).toHaveCount(1);
  await expect(page.locator('.pod .ai-chip')).toHaveText('AI');
  await expect(page.locator('.pod-name')).toHaveText('Kavisha AI');
  await expect(page.locator('.my-cards .pcard:not(.pcard-slot)')).toHaveCount(2, { timeout: 15_000 });
  await shot(page, 'twin-04-table');

  // Play one hand through; the twin learns from it.
  const next = page.getByRole('button', { name: /^(Next hand|Rebuy)/ });
  for (let i = 0; i < 80; i++) {
    if (await next.isVisible()) break;
    if (await myTurn(page)) await checkOrCall(page);
    await page.waitForTimeout(500);
  }
  await expect(next).toBeVisible();
  const hands = await page.evaluate(() => JSON.parse(localStorage.getItem('flipup.twin') ?? '{}').hands);
  expect(hands).toBe(61);
  // The report keeps what the twin held once the hand was over.
  const facts = await page.evaluate(() => JSON.parse(localStorage.getItem('flipup.twingames') ?? '[]').at(-1)?.hands?.[0]?.facts);
  expect(facts.mine).toHaveLength(2);
  expect(facts.theirs).toHaveLength(2);

  // The menu has the report, which already counts that hand.
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'What your twin found' }).click();
  await expect(page.getByText('That was a short one')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Habits your twin copied' })).toBeVisible();
  await shot(page, 'twin-05-report-short');
});

test('the twin report: what it cost you and the habits it copied', async ({ page }) => {
  watchErrors(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('seeded')) return;
    localStorage.setItem('seeded', '1');
    localStorage.setItem('flipup.profile', JSON.stringify({ name: 'Kavisha', emoji: '🦊' }));
    // Folds to bets a lot and rarely bets when checked to.
    const stats = { vpip: 50, pfr: 35, betsFaced: 40, foldsToBet: 28, betOpps: 60, bets: 10 };
    localStorage.setItem('flipup.twin', JSON.stringify({ v: 1, hands: 120, spots: {}, stats, seen: [] }));
    const bluff = { btn: true, mine: ['Ac', 'Ad'], theirs: ['Kh', '5d'], board: ['2c', '7d', '9h', 'Js'], sd: false, fold: 'turn', out: 'turn', bluff: 'worked', better: true };
    const hands = [60, -40, -120, -30, -90, 20].map((net, i) => ({ key: `t#${i + 1}`, number: i + 1, net, ...(i === 2 ? { facts: bluff } : {}) }));
    localStorage.setItem('flipup.twingames', JSON.stringify([{ id: 't', at: Date.now(), bb: 10, knew: 120, hands }]));
  });
  await page.goto('/');
  await page.getByRole('tab', { name: 'Learn' }).click();
  await page.getByRole('button', { name: 'Your twin' }).click();
  await expect(page.getByText('Your twin took 200 chips from you over 6 hands.')).toBeVisible();
  await expect(page.getByText('Hand 3 · −120').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Its bluffs' })).toBeVisible();
  await expect(page.getByText('Your twin bluffed you once after the flop.')).toBeVisible();
  await expect(page.getByText('Your twin bet with nothing. You had top pair and folded: the better hand.')).toBeVisible();
  await expect(page.getByText('You fold to a bet 70% of the time after the flop.')).toBeVisible();
  await expect(page.getByText('When nobody has bet, you only bet 17% of the time.')).toBeVisible();
  await page.locator('details.coach-numbers summary').first().click();
  await expect(page.getByText('Most players land between 32% and 52%.')).toBeVisible();
  await shot(page, 'twin-06-report');
});

test('Insights counts the games you played against your twin', async ({ page }) => {
  watchErrors(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('seeded')) return;
    localStorage.setItem('seeded', '1');
    localStorage.setItem('flipup.profile', JSON.stringify({ name: 'Kavisha', emoji: '🦊' }));
    const games = [
      { at: Date.now() - 2000, net: 500, hands: 30, players: 2, place: 1, twin: true },
      { at: Date.now() - 1000, net: -1000, hands: 18, players: 2, place: 2, twin: true },
      { at: Date.now(), net: 200, hands: 40, players: 4, place: 1 },
    ];
    localStorage.setItem('flipup.stats', JSON.stringify({ net: -300, tables: 3, hands: 88, counted: ['a', 'b', 'c'], games }));
    localStorage.setItem('flipup.twingames', JSON.stringify([{ id: 'b', at: Date.now(), bb: 10, knew: 90, hands: [{ key: 'b#1', number: 1, net: -30 }] }]));
  });
  await page.goto('/');
  await page.getByRole('tab', { name: 'Learn' }).click();
  await page.getByRole('button', { name: 'Insights' }).click();
  await expect(page.getByText('Against your twin')).toBeVisible();
  await expect(page.getByText('1 of 2')).toBeVisible();
  await expect(page.getByText('Your twin, 18 hands')).toBeVisible();
  await shot(page, 'twin-07-insights');
  await page.getByRole('button', { name: /Against your twin/ }).click();
  await expect(page.getByRole('heading', { name: 'Habits your twin copied' })).toBeVisible();
});

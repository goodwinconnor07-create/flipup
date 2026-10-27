import { expect, test } from '@playwright/test';
import { shot, watchErrors } from './helpers';

// A saved hand to watch back.
const record = {
  tableId: 'T1',
  number: 7,
  at: Date.now() - 600_000,
  smallBlind: 10,
  bigBlind: 20,
  buttonId: 'b',
  players: [
    { id: 'a', name: 'Connor', emoji: '😎', seat: 0, stack: 1000 },
    { id: 'b', name: 'Ollie', emoji: '🦊', seat: 1, stack: 1000 },
    { id: 'c', name: 'Bot Bea', emoji: '🤖', seat: 2, stack: 1000 },
  ],
  actions: [
    { street: 'preflop', playerId: 'a', move: 'raise', to: 60 },
    { street: 'preflop', playerId: 'b', move: 'call', to: 60 },
    { street: 'preflop', playerId: 'c', move: 'fold', to: 0 },
    { street: 'flop', playerId: 'a', move: 'bet', to: 80 },
    { street: 'flop', playerId: 'b', move: 'raise', to: 240 },
    { street: 'flop', playerId: 'a', move: 'call', to: 240 },
    { street: 'turn', playerId: 'a', move: 'check', to: 0 },
    { street: 'turn', playerId: 'b', move: 'check', to: 0 },
    { street: 'river', playerId: 'a', move: 'check', to: 0 },
    { street: 'river', playerId: 'b', move: 'check', to: 0 },
  ],
  board: ['Ks', '7d', '2c', 'Qh', '3s'],
  holes: { a: ['Ah', 'Qd'], b: ['Jc', 'Jd'] },
  won: { a: 540 },
  showdown: true,
};

test('replay a saved hand', async ({ page }) => {
  watchErrors(page);
  await page.addInitScript((rec) => {
    if (localStorage.getItem('flipup.history')) return;
    localStorage.setItem('flipup.profile', JSON.stringify({ name: 'Connor', emoji: '😎' }));
    localStorage.setItem('flipup.history', JSON.stringify([{ key: 'T1#7', heroId: 'a', record: rec }]));
  }, record);
  await page.goto('/');
  await page.getByRole('tab', { name: 'History' }).click();
  await page.getByRole('button', { name: 'Replay hand 7' }).click();

  // The hand starts playing on its own, with a plain sentence under the table and no coach.
  await expect(page.getByText('Replay · Preflop')).toBeVisible();
  await expect(page.getByText('GTO Coach')).toHaveCount(0);
  await shot(page, 'replay-1-deal');

  // Only what this phone could see is face up: the other seats stay face down until the result.
  await expect(page.locator('.rp-seat:not(.hero) .pcard-back').first()).toBeVisible();

  // Jump to the end with the timeline.
  await page.getByRole('button', { name: /of \d+: Result/ }).click();
  await expect(page.getByText('Ollie', { exact: true }).first()).toBeVisible();
  await expect(page.locator('.rp-seat:not(.hero) .pcard:not(.pcard-back)').first()).toBeVisible();
  await expect(page.getByText(/You won/)).toBeVisible();
  await shot(page, 'replay-4-result');
});

test('a full ring of nine still fits on a phone', async ({ page }) => {
  watchErrors(page);
  const names = ['Connor', 'Ollie', 'Bot Bea', 'Longname Lou', 'Sam', 'Priya', 'Mo', 'Jess', 'Dave'];
  const nine = {
    ...record,
    number: 9,
    buttonId: 'p3',
    players: names.map((name, i) => ({ id: `p${i}`, name, emoji: ['😎', '🦊', '🤖', '🐙', '🐸', '🦄', '🐯', '🐼', '🦁'][i], seat: i, stack: 1000 })),
    actions: [
      ...names.slice(3).concat(names.slice(0, 3)).map((_, k) => ({ street: 'preflop', playerId: `p${(3 + k) % 9}`, move: k === 3 ? 'raise' : 'fold', to: k === 3 ? 60 : 0 })).slice(0, 4),
      { street: 'preflop', playerId: 'p0', move: 'call', to: 60 },
      { street: 'preflop', playerId: 'p1', move: 'fold', to: 0 },
      { street: 'preflop', playerId: 'p2', move: 'fold', to: 0 },
    ],
    board: ['Ks', '7d', '2c'],
    holes: { p0: ['Ah', 'Qd'] },
    won: { p0: 130 },
    showdown: false,
  };
  await page.addInitScript((rec) => {
    if (localStorage.getItem('flipup.history')) return;
    localStorage.setItem('flipup.history', JSON.stringify([{ key: 'T1#9', heroId: 'p0', record: rec }]));
  }, nine);
  await page.goto('/');
  await page.getByRole('tab', { name: 'History' }).click();
  await page.getByRole('button', { name: 'Replay hand 9' }).click();
  await page.getByRole('button', { name: /of \d+: .* raised to 60/ }).click();
  await expect(page.locator('.rp-seat')).toHaveCount(9);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await shot(page, 'replay-9-seats');
});

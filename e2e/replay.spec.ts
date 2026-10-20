import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Replay is switched off for now; these tests come back when it does.
const REPLAY_ON = /REPLAY_ON = true/.test(readFileSync('src/train/replay.ts', 'utf8'));
import { shot, watchErrors } from './helpers';

// A saved hand with a coach report, so the replay and the GTO Coach can be checked without the solver service.
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

const gto = (best: string, mine: string, freq: number) => [
  { action: 'fold', frequency: best === 'fold' ? 1 : 0, ev_bb: 0 },
  { action: 'call', frequency: mine === 'call' ? freq : 0, ev_bb: -0.4 },
  { action: 'raise to 6', frequency: best === 'raise to 6' ? 1 - freq : 0.1, ev_bb: 0.3 },
];

const report = {
  hand_id: 'T1#7',
  players: {},
  board: record.board,
  summary: { decisions: 3, graded: 3, colours: { green: 1, yellow: 0, red: 2 }, total_ev_loss_bb: 1.4, grades: {} },
  notes: [],
  decisions: [
    { street: 'preflop', player: 'a', position: 'BTN', hand: 'AhQd', board: [], pot_bb: 1.5, to_call_bb: 1, action: { move: 'raise', to_bb: 3 }, matched_action: 'raise to 6', method: 'solver', best_action: 'raise to 6', gto: gto('raise to 6', 'raise to 6', 0.8), grade: 'best', colour: 'green', scenario: 'rfi', explanation: [] },
    { street: 'flop', player: 'a', position: 'BTN', hand: 'AhQd', board: ['Ks', '7d', '2c'], pot_bb: 6, to_call_bb: 0, action: { move: 'bet', to_bb: 4 }, matched_action: 'call', method: 'solver', best_action: 'fold', ev_loss_bb: 1.2, ev_loss_pct_pot: 20, gto: gto('fold', 'call', 0), grade: 'blunder', colour: 'red', scenario: 'cbet_ip', explanation: [] },
    { street: 'flop', player: 'a', position: 'BTN', hand: 'AhQd', board: ['Ks', '7d', '2c'], pot_bb: 18, to_call_bb: 8, action: { move: 'call', to_bb: 12 }, matched_action: 'call', method: 'solver', best_action: 'fold', ev_loss_bb: 0.2, gto: gto('fold', 'call', 0.3), grade: 'inaccuracy', colour: 'yellow', scenario: 'vs_checkraise', explanation: [] },
  ],
};

test('replay a saved hand with the GTO Coach', async ({ page }) => {
  test.skip(!REPLAY_ON, 'Replay is switched off for now (REPLAY_ON in src/train/replay.ts)');
  watchErrors(page);
  await page.addInitScript(
    ([rec, rep]) => {
      if (localStorage.getItem('flipup.history')) return;
      localStorage.setItem('flipup.profile', JSON.stringify({ name: 'Connor', emoji: '😎' }));
      localStorage.setItem('flipup.history', JSON.stringify([{ key: 'T1#7', heroId: 'a', record: rec }]));
      localStorage.setItem('flipup.reports', JSON.stringify({ 'T1#7': { at: Date.now(), report: rep } }));
      localStorage.setItem(
        'flipup.reviews',
        JSON.stringify({ 'T1#7': { key: 'T1#7', at: Date.now(), decisions: rep.decisions.map((d: { street: string; colour: string; ev_loss_bb?: number; scenario: string }) => ({ street: d.street, colour: d.colour, evLoss: d.ev_loss_bb ?? 0, scenario: d.scenario })) } }),
      );
    },
    [record, report] as const,
  );
  await page.goto('/');
  await page.getByRole('tab', { name: 'Insights' }).click();
  await page.getByRole('button', { name: 'Replay hand 7' }).click();

  // The coach introduces themself, and the hand starts playing on its own.
  await expect(page.getByText('GTO Coach').first()).toBeVisible();
  await expect(page.getByText('Replay · Preflop')).toBeVisible();
  await shot(page, 'replay-1-deal');

  // It stops at the first move that wasn't the GTO play.
  await expect(page.getByText("I'd skip call here.", { exact: false })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  await shot(page, 'replay-2-mistake');

  // Only what this phone could see is face up: the other seats stay face down until the result.
  await expect(page.locator('.rp-seat:not(.hero) .pcard-back').first()).toBeVisible();

  // Retry the spot.
  await page.getByRole('button', { name: 'Try this spot again' }).click();
  await page.getByRole('button', { name: 'Fold', exact: true }).click();
  await expect(page.getByText("That's it. You fixed it.")).toBeVisible();
  await shot(page, 'replay-3-retry');

  // Jump around with the buttons, then to the end.
  await page.getByRole('button', { name: /Jump to my mistakes/ }).click();
  await page.getByRole('button', { name: /of \d+: Result/ }).click();
  await expect(page.getByText('One thing to take away')).toBeVisible();
  await expect(page.getByText('Ollie', { exact: true }).first()).toBeVisible();
  await expect(page.locator('.rp-seat:not(.hero) .pcard:not(.pcard-back)').first()).toBeVisible();
  await shot(page, 'replay-4-result');

  // The full written review opens from here, with the same coach.
  await page.getByRole('button', { name: 'Full review' }).click();
  await expect(page.getByText('GTO Coach').first()).toBeVisible();
  await shot(page, 'replay-5-review');
});

test('a full ring of nine still fits on a phone', async ({ page }) => {
  test.skip(!REPLAY_ON, 'Replay is switched off for now (REPLAY_ON in src/train/replay.ts)');
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
  await page.getByRole('tab', { name: 'Insights' }).click();
  await page.getByRole('button', { name: 'Replay hand 9' }).click();
  await page.getByRole('button', { name: /of \d+: .* raised to 60/ }).click();
  await expect(page.locator('.rp-seat')).toHaveCount(9);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await shot(page, 'replay-9-seats');
});

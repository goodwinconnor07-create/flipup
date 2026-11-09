import { expect, test } from '@playwright/test';
import { setName, watchErrors } from './helpers';

test('invite BOT_001 and play its new engine through actual table turns', async ({ page }) => {
  watchErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with Bots' }).click();
  await setName(page, 'Bot tester');
  await page.getByRole('button', { name: 'Next' }).click();
  const toggle = page.getByRole('switch', { name: /Invite BOT_001/ });
  await expect(toggle).not.toBeChecked();
  await toggle.click();
  await expect(toggle).toBeChecked();
  await page.getByRole('button', { name: 'More BOT_001 personality', exact: true }).click();
  await expect(page.getByText('Patient', { exact: true })).toBeVisible();
  for (let n = 0; n < 4; n++) await page.getByRole('button', { name: 'One less bot' }).click();
  await page.screenshot({ path: '/tmp/bot-001-toggle.png', fullPage: true });
  await page.getByRole('button', { name: 'Sit down' }).click();
  await expect(page.getByText('BOT_001', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  let usedNewEngine = false;
  for (let n = 0; n < 80; n++) {
    const model = await page.evaluate(() => {
      const session = JSON.parse(localStorage.getItem('flipup.session') ?? 'null');
      return session?.game?.humanPoker?.lastDecision?.model;
    });
    if (model === 'baseline-5') {
      usedNewEngine = true;
      break;
    }
    const passive = page
      .locator('.action-buttons')
      .getByRole('button', { name: /^(Check$|Call\s)/ })
      .first();
    if (await passive.isVisible()) await passive.click();
    const next = page.getByRole('button', { name: /^Next hand/ });
    if (await next.isVisible()) await next.click();
    await page.waitForTimeout(500);
  }
  expect(usedNewEngine).toBe(true);
  const personality = await page.evaluate(
    () => JSON.parse(localStorage.getItem('flipup.session') ?? 'null')?.game?.humanPoker?.profile?.personality,
  );
  expect(personality).toBe('patient');
});

test('online BOT_001 acts through the Worker without broadcasting its memory', async ({ page, request }) => {
  const deviceId = `d${'a'.repeat(20)}`;
  const opened = await request.post('/api/tables', {
    data: {
      deviceId,
      name: 'Host',
      emoji: '🙂',
      bots: 1,
      settings: {
        startingStack: 1000,
        smallBlind: 5,
        bigBlind: 10,
        rebuys: true,
        turnSeconds: 0,
        humanPoker: true,
        botPersonality: 'aggressive',
      },
    },
  });
  expect(opened.ok()).toBe(true);
  const { code } = await opened.json();
  await page.goto('/');
  const result = await page.evaluate(
    ({ code, deviceId }) =>
      new Promise<string>((resolve, reject) => {
        const socket = new WebSocket(`${location.origin.replace('http', 'ws')}/api/tables/${code}/ws?device=${deviceId}`);
        const timeout = setTimeout(() => {
          socket.close();
          reject(new Error('BOT_001 did not act online'));
        }, 90000);
        let started = false,
          sent = '';
        socket.onmessage = (event) => {
          const message = JSON.parse(event.data);
          if (message.t !== 'state') return;
          const game = message.game;
          if (game.humanPoker !== undefined || game.botTable !== undefined) {
            clearTimeout(timeout);
            socket.close();
            reject(new Error('Private memory broadcast'));
            return;
          }
          const bot = game.players.find((p: { name: string }) => p.name === 'BOT_001');
          if (!bot) return;
          if (!started) {
            started = true;
            socket.send(JSON.stringify({ t: 'act', id: 'start', a: { type: 'start' } }));
          }
          const h = game.hand;
          if (!h) return;
          const ordinary = game.players.find((p: { id: string; bot: boolean }) => p.bot && p.id !== bot.id);
          if (
            (h.actions ?? []).some((a: { playerId: string }) => a.playerId === bot.id) &&
            (h.actions ?? []).some((a: { playerId: string }) => a.playerId === ordinary?.id)
          ) {
            clearTimeout(timeout);
            socket.close();
            resolve('acted');
            return;
          }
          const actor = game.players.find((p: { id: string }) => p.id === h.toAct);
          const key = `${h.number}:${h.seq}`;
          if (actor?.deviceId === deviceId && key !== sent) {
            sent = key;
            const seat = h.seats.find((s: { playerId: string }) => s.playerId === actor.id);
            socket.send(
              JSON.stringify({
                t: 'act',
                id: key,
                a: { type: 'act', hand: h.number, seq: h.seq, move: seat.bet >= h.currentBet ? 'check' : 'call' },
              }),
            );
          }
        };
        socket.onerror = () => {
          clearTimeout(timeout);
          socket.close();
          reject(new Error('WebSocket failed'));
        };
      }),
    { code, deviceId },
  );
  expect(result).toBe('acted');
});

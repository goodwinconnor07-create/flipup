import { expect, test } from '@playwright/test';
import { watchErrors } from './helpers';
import type { ResearchHand } from '../src/research/engine';
import type { ResearchMetadata } from '../src/research/protocol';

test('mobile research survives offline play, reload, retry and private review', async ({ page, context, request }) => {
  watchErrors(page);
  test.setTimeout(120_000);
  await page.goto('/#bot-research');
  await expect(page.getByRole('heading', { name: 'Help shape the bots' })).toBeVisible();
  await page.getByLabel('Session length').selectOption('12');
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Start research session' }).click();
  for (let n = 0; n < 150; n++) {
    if (await page.getByRole('button', { name: 'Next research hand' }).isVisible()) break;
    const check = page.getByRole('button', { name: 'Check', exact: true }),
      call = page.getByRole('button', { name: /^Call \d/ });
    if (await check.isVisible()) await check.click();
    else if (await call.isVisible()) await call.click();
    await page.waitForTimeout(200);
  }
  await expect(page.getByRole('button', { name: 'Next research hand' })).toBeVisible();
  await page.getByRole('button', { name: 'That felt odd' }).click();
  await page.getByLabel('What stood out?').fill('The river decision felt hesitant.');
  await page.getByLabel('How believable did the bots feel?').selectOption('3');
  await page.getByRole('button', { name: 'Save feedback' }).click();
  await page.getByRole('button', { name: 'Pause & upload' }).click();
  await expect(page.getByText(/1 hands saved on this phone · 0 uploaded/)).toBeVisible();
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Session paused' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hand flagged' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('What stood out?')).toHaveValue('The river decision felt hesitant.');
  await expect(page.getByText(/1 hands saved on this phone · 1 uploaded/)).toBeVisible({ timeout: 30_000 });
  const link = await page.getByLabel('Private review link').inputValue();
  const match = new URL(link).hash.match(/=([^\.]+)\.(.+)$/)!;
  expect((await request.get(`/api/bot-research/${match[1]}`)).status()).toBe(401);
  expect((await request.get(`/api/bot-research/${match[1]}`, { headers: { authorization: `Bearer ${'a'.repeat(64)}` } })).status()).toBe(
    403,
  );
  await page.getByRole('button', { name: 'Resume session' }).click();
  await page.getByRole('button', { name: 'Next research hand' }).click();
  await expect(page.getByRole('heading', { name: 'Raised multiway pot' })).toBeVisible();
  await page.getByRole('button', { name: 'Pause & upload' }).click();
  await page.goto(link);
  await expect(page.getByRole('heading', { name: '1 hands saved' })).toBeVisible();
  await expect(page.getByText('The river decision felt hesitant.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download full report' })).toBeVisible();
});

test('research API stores large hands, enforces revisions, pages results and deletes private sessions', async ({ request, page }) => {
  await page.goto('/#bot-research');
  const { hand, metadata } = (await page.evaluate(async () => {
    const modulePath = '/src/research/engine.ts',
      engine = await import(modulePath);
    const run = engine.startResearch('00000000-0000-4000-8000-000000000002', 233, 12, 1000);
    for (let n = 0; !run.game.hand.result && n < 500; n++) {
      if (run.game.hand.toAct === engine.researchHero(run.game).id) {
        const o = engine.researchOptions(run);
        engine.stepResearch(run, { move: o.canCheck ? 'check' : 'call' });
      } else engine.stepResearch(run);
    }
    const hand = engine.completeResearchHand(run);
    hand.initial.hand.log.push('x'.repeat(150 * 1024));
    return { hand, metadata: { protocol: run.protocol, engine: run.engine, seed: run.seed, limit: run.limit, startedAt: run.startedAt } };
  })) as { hand: ResearchHand; metadata: ResearchMetadata };
  const id = crypto.randomUUID(),
    key = 'b'.repeat(64),
    headers = { authorization: `Bearer ${key}` };
  expect((await request.post('/api/bot-research', { data: { id, key, metadata } })).status()).toBe(201);
  expect((await request.post('/api/bot-research', { data: { id, key, metadata } })).status()).toBe(200);
  const url = `/api/bot-research/${id}`;
  for (let index = 0; index < 9; index++)
    expect((await request.put(`${url}/hands/${index}`, { headers, data: { revision: 1, hand: { ...hand, index } } })).status()).toBe(200);
  const revised = { ...hand, feedback: { odd: true, note: 'Updated note' } };
  expect((await request.put(`${url}/hands/0`, { headers, data: { revision: 2, hand: revised } })).status()).toBe(200);
  expect((await request.put(`${url}/hands/0`, { headers, data: { revision: 1, hand } })).status()).toBe(409);
  expect((await request.put(`${url}/hands/0`, { headers, data: { revision: 2, hand: revised } })).status()).toBe(200);
  const firstPage = await (await request.get(url, { headers })).json();
  expect(firstPage.hands).toHaveLength(8);
  expect(firstPage.next).toBe(7);
  expect(firstPage.hands[0].feedback.note).toBe('Updated note');
  const last = await (await request.get(`${url}?after=7`, { headers })).json();
  expect(last.hands).toHaveLength(1);
  expect(last.next).toBeNull();
  expect((await request.put(`${url}/hands/0`, { headers, data: { revision: 3, hand: { ...hand, result: null } } })).status()).toBe(400);
  expect((await request.delete(url, { headers })).status()).toBe(200);
  expect((await request.get(url, { headers })).status()).toBe(403);
});

test('saved checkpoints reject a second tab overwriting the same research state', async ({ page }) => {
  await page.goto('/#bot-research');
  const outcomes = await page.evaluate(async () => {
    const enginePath = '/src/research/engine.ts',
      storagePath = '/src/research/storage.ts';
    const engine = await import(enginePath),
      storage = await import(storagePath);
    const run = engine.startResearch(crypto.randomUUID(), 17, 12);
    await storage.createResearchStorage(run);
    const one = structuredClone(run),
      two = structuredClone(run);
    const results = await Promise.allSettled([storage.saveResearch(one), storage.saveResearch(two)]);
    return results.map((r) => (r.status === 'fulfilled' ? 'saved' : String(r.reason.message)));
  });
  expect(outcomes.filter((r) => r === 'saved')).toHaveLength(1);
  expect(outcomes.some((r) => r.includes('another tab'))).toBe(true);
});

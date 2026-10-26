import { expect, test, type Page } from '@playwright/test';
import { setName, shot, watchErrors } from './helpers';

// Plays a real table in the browser and records, frame by frame, every message bubble that appears over a
// seat: when it came, when it went, where it was. Then checks the numbers a person would feel: messages are
// up long enough to read, follow-ups come fast, the typing dots are brief, nothing runs off the screen,
// and two seats never talk over each other. (The sequencing rules themselves are in src/game/chat.test.ts
// and the lab in scripts/chatLab.ts; this is the check that it all holds up in a real page.)

interface Seen {
  text: string;
  typing: boolean;
  pod: number;
  up: number;
  down: number | null;
  rect: { l: number; r: number; t: number; b: number };
  mine: boolean;
}

async function record(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const log: Seen[] = [];
    const seen = new Map<Element, Seen>();
    (window as unknown as { __chat: Seen[] }).__chat = log;
    const scan = () => {
      const now = performance.now();
      document.querySelectorAll('.thread .bubble').forEach((el) => {
        if (seen.has(el)) return;
        const r = el.getBoundingClientRect();
        const pods = [...document.querySelectorAll('.pod')];
        const pod = pods.findIndex((p) => p.contains(el));
        const rec: Seen = { text: el.textContent ?? '', typing: el.classList.contains('bubble-typing'), pod, up: now, down: null, rect: { l: r.left, r: r.right, t: r.top, b: r.bottom }, mine: !!el.closest('.my-box') };
        seen.set(el, rec);
        log.push(rec);
      });
      for (const [el, rec] of seen) {
        if (rec.down !== null) continue;
        if (!el.isConnected) rec.down = now;
        else {
          // Where it ends up, not where it was on its first frame (a seat may still be sliding in).
          const r = el.getBoundingClientRect();
          rec.rect = { l: r.left, r: r.right, t: r.top, b: r.bottom };
        }
      }
      requestAnimationFrame(scan);
    };
    requestAnimationFrame(scan);
  });
}

const read = (page: Page) => page.evaluate(() => ({ log: (window as unknown as { __chat: Seen[] }).__chat, now: performance.now(), width: innerWidth }));

const pct = (xs: number[], p: number) => {
  const a = [...xs].sort((x, y) => x - y);
  return a.length ? a[Math.min(a.length - 1, Math.floor((p / 100) * a.length))] : 0;
};

test('table talk reads like texting: quick follow-ups, enough time to read, never off screen', async ({ page }) => {
  test.setTimeout(170_000);
  watchErrors(page);
  await record(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with Bots' }).click();
  await setName(page, 'Sam');
  await page.getByRole('button', { name: 'Next' }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'One more bot' }).click();
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();

  // Play along: check or call, and fold when it's expensive, so hands keep moving.
  const started = Date.now();
  let shotTaken = false;
  while (Date.now() - started < 110_000) {
    if (await page.getByText('Your turn').isVisible()) {
      const check = page.getByRole('button', { name: 'Check', exact: true });
      if (await check.isVisible()) await check.click();
      else await page.getByRole('button', { name: /^Fold/ }).first().click();
    }
    const next = page.getByRole('button', { name: /^(Next hand|Rebuy)/ });
    if (await next.isVisible()) await next.click();
    if (!shotTaken && (await page.locator('.thread .bubble-react').count()) > 0) {
      await shot(page, '30-talk');
      shotTaken = true;
    }
    await page.waitForTimeout(120);
  }

  const { log, now, width } = await read(page);
  const messages = log.filter((m) => !m.typing && !m.mine);
  const dots = log.filter((m) => m.typing);
  console.log(`messages ${messages.length}, typing bubbles ${dots.length}`);
  expect(messages.length, 'a table of bots with 110 seconds of play should have said something').toBeGreaterThanOrEqual(3);

  // Up long enough to read: a message that wasn't taken over by its speaker's next move stays at least a second.
  const visible = messages.map((m) => (m.down ?? now) - m.up);
  console.log('up ms p5/p50/p95', pct(visible, 5), pct(visible, 50), pct(visible, 95));
  const shortOnes = messages.filter((_, i) => visible[i] < 700);
  expect(shortOnes.length / messages.length, `messages gone in under 0.7s: ${shortOnes.map((m) => m.text).join(' | ')}`).toBeLessThanOrEqual(0.2);
  expect(pct(visible, 50)).toBeGreaterThanOrEqual(1100);

  // Follow-ups from the same seat arrive quickly after the one before, like a burst of texts.
  const byPod = new Map<number, Seen[]>();
  for (const m of messages) byPod.set(m.pod, [...(byPod.get(m.pod) ?? []), m]);
  const gaps: number[] = [];
  for (const list of byPod.values()) {
    list.sort((a, b) => a.up - b.up);
    for (let i = 1; i < list.length; i++) {
      const gap = list[i].up - list[i - 1].up;
      if (gap < 1500) gaps.push(gap);
    }
  }
  console.log('burst gaps ms', gaps.map(Math.round).join(', '));
  for (const g of gaps) {
    // Not so fast it's a blur, not so slow it stops feeling like one thought.
    expect(g).toBeGreaterThanOrEqual(150);
    expect(g).toBeLessThanOrEqual(1500);
  }

  // The typing dots are brief.
  const dotMs = dots.map((d) => (d.down ?? now) - d.up);
  console.log('dots ms p50/p95', pct(dotMs, 50), pct(dotMs, 95));
  expect(pct(dotMs, 95)).toBeLessThanOrEqual(1400);

  // Everything inside the screen: not off either side, and not up under the header.
  const outside = log.filter((m) => !m.mine && (m.rect.l < -1 || m.rect.r > width + 1 || m.rect.t < 40));
  expect(outside.map((m) => `${m.text} ${JSON.stringify(m.rect)}`), 'bubbles outside the screen').toEqual([]);

  // Two seats never talk over each other: where bubbles from different seats are up together they don't overlap.
  const events = [...messages, ...dots].sort((a, b) => a.up - b.up);
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const [p, q] = [events[i], events[j]];
      if (q.up >= (p.down ?? now) || p.pod === q.pod) continue;
      const overlap = p.rect.l < q.rect.r && q.rect.l < p.rect.r && p.rect.t < q.rect.b && q.rect.t < p.rect.b;
      expect(overlap, `"${p.text}" and "${q.text}" overlap`).toBe(false);
    }
  }
});

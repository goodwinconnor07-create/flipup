import { chromium } from '@playwright/test';
const D = process.argv[2];
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
const shot = async (n) => { await p.waitForTimeout(700); await p.screenshot({ path: `${D}/${n}.png` }); };
await p.goto('http://localhost:5174/');
await p.getByRole('button', { name: 'Play the bots' }).click();
await p.getByRole('textbox', { name: 'Your name' }).fill('Sam');
await p.getByRole('button', { name: 'Next' }).click();
await p.getByRole('button', { name: 'One more bot' }).click();
await p.getByRole('button', { name: 'Sit down' }).click();
await p.getByRole('button', { name: 'Deal', exact: true }).click();
// wait until it's not my turn to see pre-actions, then my turn
await p.waitForTimeout(800);
await shot('t1');
await p.getByText('Your turn').waitFor({ timeout: 30000 });
await shot('t2');
await p.getByRole('button', { name: 'Quick messages' }).click();
await shot('t3');
await p.getByRole('menuitem', { name: 'Nice hand!' }).click();
await shot('t4');
await p.locator('.action-buttons .btn-green').click();
// play to result
for (let i = 0; i < 60; i++) {
  if (await p.locator('.win-banner').isVisible()) break;
  if (await p.getByText('Your turn').isVisible()) { const c = p.getByRole('button', { name: 'Check', exact: true }); if (await c.isVisible()) await c.click(); else await p.locator('.action-buttons .btn-green').click(); }
  await p.waitForTimeout(500);
}
await shot('t5');
await p.getByRole('button', { name: 'Menu' }).click();
await shot('t6');
await p.getByRole('button', { name: 'Table theme' }).click();
await p.getByRole('radio', { name: 'Burgundy' }).click();
await p.getByRole('radio', { name: 'Wood' }).click();
await shot('t7');
await p.getByRole('button', { name: 'Done' }).click();
await shot('t8');
await b.close();

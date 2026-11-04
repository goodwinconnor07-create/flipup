// Start a recorder-enabled Expo web server and the local Worker first; see native/README.md.
const assert = require('node:assert/strict');
const { mkdirSync } = require('node:fs');
const { chromium } = require('@playwright/test');

const base = process.env.NATIVE_BASE_URL || 'http://localhost:8083';
const output = process.env.SHOTS_DIR || '/tmp/flipup-native-regressions';
const variants = ['holdem', 'pineapple', 'deuces', 'ghost', 'pittsburgh', 'dice', 'redriver', 'imposter', 'crucifix', 'circle', 'memory', 'beanstalk', 'bjholdem'];

async function fixture(browser, variant, calm = false) {
  const context = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(({ calm }) => {
    localStorage.setItem('flipup.profile', JSON.stringify({ name: 'Audit', emoji: '😎' }));
    localStorage.setItem('flipup.premium', 'true');
    localStorage.setItem('flipup.muted', 'true');
    localStorage.setItem('flipup.calm', JSON.stringify(calm));
  }, { calm });
  await page.goto(`${base}/setup?mode=bots&variant=${variant}`);
  await page.getByRole('button', { name: 'Sit down', exact: true }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  await page.waitForFunction(() => !!window.__flipupTable?.()?.hand, { timeout: 30000 });
  return { context, page, errors };
}

async function inViewport(locator) {
  const bounds = await locator.boundingBox();
  assert(bounds && bounds.y >= 0 && bounds.y + bounds.height <= 668, `Offscreen control: ${JSON.stringify(bounds)}`);
}

(async () => {
  mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    for (const variant of variants) {
      const { context, page, errors } = await fixture(browser, variant);
      await page.waitForTimeout(1000);
      await inViewport(page.getByRole('button', { name: 'Stack in chips, tap to switch', exact: true }));
      await inViewport(page.getByRole('button', { name: 'Quick messages', exact: true }));
      const actions = page.getByRole('button').filter({ hasText: /^(Fold|Check|Call|Raise|Bet|Hit)/ });
      for (const action of await actions.all()) await inViewport(action);
      await page.screenshot({ path: `${output}/${variant}-375x667.png` });
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`PASS ${variant}: cards/controls fit at 375x667`);
    }

    const { context, page, errors } = await fixture(browser, 'holdem', true);
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await page.getByRole('switch', { name: 'Animations', exact: true }).click();
    await page.goBack();
    await page.waitForTimeout(1000);
    const hiddenFaces = await page.getByRole('img').evaluateAll((elements) => elements.filter((e) => {
      const bounds = e.getBoundingClientRect();
      return bounds.y > 400 && getComputedStyle(e.parentElement).opacity === '0';
    }).map((e) => e.getAttribute('aria-label')));
    assert.deepEqual(hiddenFaces, [], 'Turning animations on hid dealt card faces');
    await page.screenshot({ path: `${output}/animations-enabled.png` });
    assert.deepEqual(errors, []);
    await context.close();
    console.log('PASS enabling animations keeps dealt cards face up');

    const recovery = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
    const missing = await recovery.newPage();
    await missing.addInitScript(() => {
      localStorage.setItem('flipup.profile', JSON.stringify({ name: 'Audit', emoji: '😎' }));
      localStorage.setItem('flipup.session', JSON.stringify({ mode: 'online', code: 'BCDFG', game: null }));
    });
    await missing.goto(`${base}/table`);
    await missing.getByRole('button', { name: 'Join another table', exact: true }).waitFor({ timeout: 30000 });
    await inViewport(missing.getByRole('button', { name: 'Back to Home', exact: true }));
    await missing.screenshot({ path: `${output}/missing-table.png` });
    await missing.getByRole('button', { name: 'Back to Home', exact: true }).click();
    await missing.getByRole('button', { name: /Play with bots/ }).waitFor();
    await recovery.close();
    console.log('PASS missing table has a working exit to Home');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });

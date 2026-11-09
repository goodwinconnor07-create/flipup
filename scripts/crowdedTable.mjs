// A nine-player table with the longest legal names, loaded at 320 × 568 and 390 × 844 in the app's web export, so a
// small-phone layout break shows up in review. Checks: no page errors, no sideways scroll, the table drew.
//   cd native && npx expo export --platform web --output-dir /tmp/flipup-web
//   node --import tsx scripts/crowdedTable.mjs /tmp/flipup-web          (SHOTS_DIR=/some/dir saves the pictures)
// Needs Playwright's Chromium (CHROMIUM_PATH if it isn't at /opt/pw-browsers/chromium). Local files only.
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { applyAction, BOTS, createTable, DEFAULT_SETTINGS, LIMITS, seededRng } from '../src/game/index.ts';

const dist = resolve(process.argv[2] ?? '');
if (!process.argv[2] || !existsSync(join(dist, 'index.html'))) {
  console.error('Usage: node --import tsx scripts/crowdedTable.mjs <web export folder>');
  process.exit(2);
}
const HOST = 'd0123456789abcdefghij';

/** Nine players: you with the longest name, and the eight bots whose names are longest. */
function fixture() {
  const rng = seededRng(9);
  const longest = [...BOTS].sort((a, b) => b.name.length - a.name.length).slice(0, 8);
  let g = createTable({ hostDeviceId: HOST, name: 'W'.repeat(LIMITS.maxNameLength), emoji: '🧑‍🍳', settings: { ...DEFAULT_SETTINGS, variant: 'holdem', startingStack: 10000 }, bots: 0, code: null, now: 0, rng });
  for (const b of longest) {
    const r = applyAction(g, { type: 'addBot', name: b.name }, { deviceId: HOST, now: 0, rng });
    if (r.ok) g = r.game;
  }
  let r = applyAction(g, { type: 'start' }, { deviceId: HOST, now: 0, rng });
  if (!r.ok) throw new Error(r.error);
  g = r.game;
  let clock = 0;
  // Play until the hand has been dealt and the board is partly out, so seats show cards, bets and bubbles.
  for (let i = 0; i < 200; i++) {
    clock = (g.wakeAt ?? clock) + 1;
    r = applyAction(g, { type: 'tick' }, { deviceId: 'server', now: clock, rng });
    if (!r.ok) throw new Error(r.error);
    g = r.game;
    if (g.hand && g.hand.board.length >= 3) break;
  }
  return { game: g, players: g.players.length, names: g.players.map((p) => p.name) };
}

const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf', '.wav': 'audio/wav', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' };
const server = createServer((q, r) => {
  let p = join(dist, decodeURIComponent((q.url ?? '/').split('?')[0]));
  if (!p.startsWith(dist) || !existsSync(p) || statSync(p).isDirectory()) p = join(dist, 'index.html');
  r.setHeader('content-type', types[extname(p)] ?? 'application/octet-stream');
  r.end(readFileSync(p));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${server.address().port}`;

const { game, players, names } = fixture();
if (players !== 9) throw new Error(`fixture has ${players} players, not 9`);
const session = JSON.stringify({ mode: 'local', code: null, game });
const shots = process.env.SHOTS_DIR;
if (shots) mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' });
const problems = [];
for (const [w, h] of [[320, 568], [390, 844]]) {
  for (const scheme of ['dark', 'light']) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme });
    await ctx.addInitScript(([s]) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem('flipup.session', s);
        localStorage.setItem('flipup.device', JSON.stringify('d0123456789abcdefghij'));
        localStorage.setItem('flipup.launched', 'true');
        sessionStorage.setItem('seeded', '1');
      }
    }, [session]);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message.slice(0, 120)));
    await page.goto(`${base}/table`, { waitUntil: 'load' });
    await page.waitForTimeout(3500);
    const m = await page.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, text: document.body.innerText }));
    const tag = `${w}x${h} ${scheme}`;
    if (errors.length) problems.push(`${tag}: page errors ${[...new Set(errors)].join(' | ')}`);
    if (m.scrollW > m.innerW + 1) problems.push(`${tag}: sideways scroll (${m.scrollW} > ${m.innerW})`);
    if (!/pot/i.test(m.text) && !/Dealing/i.test(m.text)) problems.push(`${tag}: no table drawn: ${m.text.slice(0, 80).replace(/\n/g, ' | ')}`);
    if (shots) await page.screenshot({ path: join(shots, `crowded-${w}x${h}-${scheme}.png`) });
    await ctx.close();
  }
}
await browser.close();
server.close();
console.log(`9 players (${names.join(', ')})`);
if (problems.length) {
  console.log('PROBLEMS:\n- ' + problems.join('\n- '));
  process.exit(1);
}
console.log('OK: 4 views, no page errors, no sideways scroll');

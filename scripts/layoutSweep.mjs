// Layout sweep: loads the iPhone app's web export at every game × player count × moment of a hand (and the main
// screens), measures what's on screen, and prints only what looks wrong, grouped so one bug is one line. It's meant
// to be read by a person or by Claude without screenshots: text cut off or covered, text off the screen, words like
// "undefined" or "{you}", tiny text or tap targets, sideways scroll, page and console errors.
//   cd native && npx expo export --platform web --output-dir /tmp/flipup-web
//   node --import tsx scripts/layoutSweep.mjs /tmp/flipup-web
// Options (environment):
//   ONLY=table|screens           one half only
//   GAMES=holdem,onion           some games only (ids from VARIANTS)
//   PLAYERS=2,6,9                player counts (default 2,6,9)
//   SIZES=375x667,390x844        viewports (default: iPhone SE, the smallest iOS 26 runs on, and iPhone 16; 320x568 for a stress test)
//   MOMENTS=preflop,flop,river,result   moments of the hand (default all four)
//   SHOTS_DIR=/some/dir          saves a cropped picture of each flagged spot (the first of each group)
//   FULL=1                       with SHOTS_DIR, also saves the whole screen of every page with a finding
//   JSON=/some/file.json         writes every finding, ungrouped
//   MAX=12                       kinds of problem listed per check (the rest are counted)
//   REPORT=/some/file.json       groups a saved JSON again without opening a browser
//   KNOWN=0                      also lists what's drawn that way on purpose (INTENDED)
//   EVAL='js expression'         prints what it returns on every page (to measure something by hand)
//   PROBE=regex                  prints the markup round the first text matching it (to find which component drew it)
//   CHROMIUM_PATH                if Playwright's Chromium isn't at /opt/pw-browsers/chromium
// Exit code 1 when anything was found. Local files only.
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { applyAction, BOTS, createTable, DEFAULT_SETTINGS, seededRng, VARIANTS } from '../src/game/index.ts';

const dist = resolve(process.argv[2] ?? '');
if (!process.env.REPORT && (!process.argv[2] || !existsSync(join(dist, 'index.html')))) {
  console.error('Usage: node --import tsx scripts/layoutSweep.mjs <web export folder>');
  process.exit(2);
}
const list = (v, d) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : d);
const HOST = 'd0123456789abcdefghij';
const T0 = Date.parse('2026-11-13T18:00:00Z');
const GAMES = list(process.env.GAMES, VARIANTS.map((v) => v.id));
const PLAYERS = list(process.env.PLAYERS, ['2', '6', '9']).map(Number);
const SIZES = list(process.env.SIZES, ['375x667', '390x844']).map((s) => s.split('x').map(Number));
const MOMENTS = list(process.env.MOMENTS, ['preflop', 'flop', 'river', 'result']);
const ONLY = process.env.ONLY;
const SHOTS = process.env.SHOTS_DIR;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

// ---------------------------------------------------------------- fixtures: real tables played to each moment

/** Plays a table of `n` players (you plus the bots with the longest names) and keeps a copy at each moment. */
function snapshots(variant, n) {
  const rng = seededRng(7 + n);
  const bots = [...BOTS].sort((a, b) => b.name.length - a.name.length || a.name.localeCompare(b.name)).slice(0, n - 1);
  let g = createTable({ hostDeviceId: HOST, name: 'Wilhelmina', emoji: '🧑‍🍳', settings: { ...DEFAULT_SETTINGS, variant }, bots: 0, code: null, now: T0, rng });
  for (const b of bots) {
    const r = applyAction(g, { type: 'addBot', name: b.name }, { deviceId: HOST, now: T0, rng });
    if (r.ok) g = r.game;
  }
  let r = applyAction(g, { type: 'start' }, { deviceId: HOST, now: T0, rng });
  if (!r.ok) throw new Error(`${variant}: ${r.error}`);
  g = r.game;
  const meId = g.players.find((p) => p.deviceId === HOST)?.id;
  let clock = T0;
  const out = {};
  const keep = (name) => {
    if (out[name] || !MOMENTS.includes(name)) return;
    out[name] = { game: structuredClone(g), at: clock };
  };
  for (let i = 0; i < 600 && Object.keys(out).length < MOMENTS.length; i++) {
    const h = g.hand;
    if (h && !h.result) {
      if (h.street === 'preflop' && h.toAct) keep('preflop');
      if (h.street === 'flop' && h.toAct) keep('flop');
      if (h.street === 'river' && (h.toAct || h.board.length)) keep('river');
    }
    if (h?.result) {
      keep('result');
      if (Object.keys(out).length >= MOMENTS.length) break;
    }
    // Your move: stay in the hand (check, else call), so later streets still have your cards on the table.
    if (h && h.toAct === meId) {
      const seat = h.seats.find((s) => s.playerId === meId);
      const move = h.currentBet - (seat?.bet ?? 0) > 0 ? 'call' : 'check';
      const a = applyAction(g, { type: 'act', hand: h.number, seq: h.seq, move }, { deviceId: HOST, now: clock, rng });
      if (a.ok) { g = a.game; continue; }
    }
    clock = Math.max(clock + 1, g.wakeAt ?? clock + 1000);
    r = applyAction(g, { type: 'tick' }, { deviceId: 'server', now: clock, rng });
    if (!r.ok) throw new Error(`${variant}: ${r.error}`);
    g = r.game;
  }
  return out;
}

// ---------------------------------------------------------------- the in-page audit (runs in the browser)

function audit(probe) {
  const W = innerWidth, H = innerHeight;
  const found = [];
  const add = (check, detail, rect, extra = '') => found.push({ check, detail, rect, extra });
  const style = (el) => getComputedStyle(el);
  const label = (el) => {
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const a = e.getAttribute('aria-label');
      if (a) return a.slice(0, 50);
    }
    return '';
  };
  const textOf = (el) => (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  const isAncestor = (a, b) => a !== b && a.contains(b);

  // Effective visibility: display, visibility and the product of opacities up the tree.
  const opacityCache = new Map();
  const opacity = (el) => {
    if (!el || el === document.documentElement) return 1;
    if (opacityCache.has(el)) return opacityCache.get(el);
    const s = style(el);
    let o = s.display === 'none' || s.visibility === 'hidden' ? 0 : Number(s.opacity);
    if (o > 0) o *= opacity(el.parentElement);
    opacityCache.set(el, o);
    return o;
  };
  const intersect = (a, b) => ({ left: Math.max(a.left, b.left), top: Math.max(a.top, b.top), right: Math.min(a.right, b.right), bottom: Math.min(a.bottom, b.bottom) });
  const area = (r) => Math.max(0, r.right - r.left) * Math.max(0, r.bottom - r.top);
  /** The nearest ancestor that scrolls, or null. */
  const scrollerOf = (el) => {
    for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
      const s = style(e);
      if (/(auto|scroll)/.test(s.overflowX + s.overflowY) && (e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1)) return e;
    }
    return null;
  };
  const inScroller = (el) => !!scrollerOf(el);
  /** Content scrolling under a bar that stays put (a title, the tab bar) is how scroll views work. */
  const scrollsUnder = (a, b) => scrollerOf(a) !== scrollerOf(b);
  const show = (t) => JSON.stringify(t.trim().replace(/\s+/g, ' ').slice(0, 30));
  /** The area an element can paint in: the viewport cut by every ancestor that clips. */
  const clipOf = (el) => {
    let r = { left: -1e6, top: -1e6, right: 1e6, bottom: 1e6 };
    for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
      const s = style(e);
      // A scroll view is a window to scroll, not a clip: half a row at its edge is fine.
      if (/(auto|scroll)/.test(s.overflowX + s.overflowY)) continue;
      if (s.overflowX !== 'visible' || s.overflowY !== 'visible') {
        const b = e.getBoundingClientRect();
        r = intersect(r, { left: s.overflowX === 'visible' ? -1e6 : b.left, right: s.overflowX === 'visible' ? 1e6 : b.right, top: s.overflowY === 'visible' ? -1e6 : b.top, bottom: s.overflowY === 'visible' ? 1e6 : b.bottom });
      }
    }
    return r;
  };

  // Text leaves: elements with their own words, measured by the glyphs (a Range), not the box.
  const leaves = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const byEl = new Map();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement;
    if (!el || /^(SCRIPT|STYLE|NOSCRIPT|TITLE)$/.test(el.tagName)) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
    if (!rects.length) continue;
    const box = rects.reduce((a, r) => ({ left: Math.min(a.left, r.left), top: Math.min(a.top, r.top), right: Math.max(a.right, r.right), bottom: Math.max(a.bottom, r.bottom) }), { left: 1e6, top: 1e6, right: -1e6, bottom: -1e6 });
    const prev = byEl.get(el);
    if (prev) { prev.box = { left: Math.min(prev.box.left, box.left), top: Math.min(prev.box.top, box.top), right: Math.max(prev.box.right, box.right), bottom: Math.max(prev.box.bottom, box.bottom) }; prev.text += n.textContent; continue; }
    const leaf = { el, box, text: n.textContent };
    byEl.set(el, leaf);
    leaves.push(leaf);
  }
  // Reanimated's web build lifts a view with an entering animation out of the layout (position: absolute), so it
  // shrinks to its words and wraps or cuts them. The phone lays it out normally: size checks skip those views.
  const lifted = (el) => {
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      if (/animation-name: REA-/.test(e.getAttribute('style') ?? '') && style(e).position === 'absolute') return true;
    }
    return false;
  };
  const shown = leaves.filter((l) => opacity(l.el) > 0.3);
  const rectOf = (b) => ({ x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.right - b.left), h: Math.round(b.bottom - b.top) });

  for (const l of shown) {
    const t = JSON.stringify(l.text.trim().replace(/\s+/g, ' ').slice(0, 40)).slice(1, -1);
    const s = style(l.el);
    // Words that should never reach a screen.
    if (/\bundefined\b|\bNaN\b|\bnull\b|\[object|\{[a-z]+\}|\|\|?|Infinity/.test(l.text)) add('bad-text', `"${t}"`, rectOf(l.box), label(l.el));
    // Off the screen (and not something you can scroll to).
    if ((l.box.left < -1 || l.box.right > W + 1 || l.box.top < -1 || l.box.bottom > H + 1) && !inScroller(l.el)) add('off-screen', `"${t}"`, rectOf(l.box), label(l.el));
    // Cut by a parent that clips: partly visible.
    const clip = clipOf(l.el);
    const full = area(l.box), vis = area(intersect(l.box, clip));
    if (full > 0 && vis > 0 && vis / full < 0.9 && !lifted(l.el)) add('clipped', `"${t}" (${Math.round((100 * vis) / full)}% shows)`, rectOf(l.box), label(l.el));
    // Cut short: text-overflow, or a single line wider than its box with no room to wrap.
    if (l.el.scrollWidth > l.el.clientWidth + 1 && s.overflowX !== 'visible' && l.el.clientWidth > 0 && !lifted(l.el)) add('truncated', `"${t}" (needs ${l.el.scrollWidth}px, has ${l.el.clientWidth})`, rectOf(l.box), label(l.el));
    if (parseFloat(s.fontSize) < 9) add('tiny-text', `"${t}" at ${s.fontSize}`, rectOf(l.box), label(l.el));
  }

  // Text over text: two sets of words drawn on top of each other.
  for (let i = 0; i < shown.length; i++) {
    for (let j = i + 1; j < shown.length; j++) {
      const a = shown[i], b = shown[j];
      if (isAncestor(a.el, b.el) || isAncestor(b.el, a.el) || scrollsUnder(a.el, b.el)) continue;
      const over = area(intersect(a.box, b.box));
      const small = Math.min(area(a.box), area(b.box));
      if (small > 0 && over / small > 0.2 && over > 20) {
        add('text-on-text', `${show(a.text)} × ${show(b.text)}`, rectOf(intersect(a.box, b.box)), `${label(a.el)} | ${label(b.el)}`);
      }
    }
  }

  // Covered text: something opaque painted over the middle of the words. Hit testing with pointer events forced on.
  const force = document.createElement('style');
  force.textContent = '* { pointer-events: auto !important; }';
  document.head.appendChild(force);
  const opaque = (e) => {
    const s = style(e);
    if (s.backgroundImage !== 'none') return true;
    const m = s.backgroundColor.match(/rgba?\(([^)]+)\)/);
    if (!m) return false;
    const p = m[1].split(',').map(Number);
    return (p.length < 4 || p[3] > 0.6);
  };
  for (const l of shown) {
    const cx = (l.box.left + l.box.right) / 2, cy = (l.box.top + l.box.bottom) / 2;
    if (cx < 0 || cy < 0 || cx > W || cy > H) continue;
    const top = document.elementFromPoint(cx, cy);
    if (!top || top === l.el || l.el.contains(top) || top.contains(l.el)) continue;
    // Walk from what's on top up to the branch shared with the text; covered if any of it is opaque and visible.
    let coverer = null;
    for (let e = top; e && !e.contains(l.el); e = e.parentElement) {
      // Only a box with words of its own counts (a pill, a bubble, a button): drawings and glows are left out.
      if (opacity(e) > 0.5 && opaque(e) && textOf(e) && !/^(svg|path|g|circle|rect)$/i.test(e.tagName)) { coverer = e; break; }
    }
    // A show over the whole table (the die roll, the Imposter's role card) covers it on purpose.
    const cr = coverer?.getBoundingClientRect();
    if (coverer && cr.width * cr.height > 0.4 * W * H) coverer = null;
    if (coverer && !scrollsUnder(l.el, coverer)) add('covered', `${show(l.text)} under ${show(textOf(coverer))}`, rectOf(l.box), `${label(l.el)} | ${label(coverer)}`);
  }
  force.remove();

  // Tap targets smaller than 30pt either way (Apple asks for 44; 30 keeps this to the ones that really are small).
  for (const el of document.querySelectorAll('[role="button"],button,a[href],[role="switch"],[role="tab"]')) {
    if (opacity(el) < 0.3) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || r.bottom < 0 || r.top > H) continue;
    if (r.width < 30 || r.height < 30) add('small-tap', `${el.getAttribute('aria-label') || textOf(el) || '(no label)'} ${Math.round(r.width)}×${Math.round(r.height)}`, rectOf(r));
    if (!el.getAttribute('aria-label') && !textOf(el)) add('no-label', `button with no label ${Math.round(r.width)}×${Math.round(r.height)}`, rectOf(r), label(el.parentElement ?? el));
  }
  if (document.documentElement.scrollWidth > W + 1) {
    // Name the outermost element that reaches past the right edge, so the line says what to fix.
    let culprit = null;
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.right > W + 1 && r.width > 0 && !(culprit && culprit.contains(el)) && !scrollerOf(el)) { culprit = el; }
    }
    const r = culprit?.getBoundingClientRect();
    add('sideways-scroll', `${document.documentElement.scrollWidth} > ${W}: ${culprit ? `${show(textOf(culprit))} ${label(culprit)} reaches x=${Math.round(r.right)} ${culprit.outerHTML.replace(/<svg[\s\S]*/, "<svg…").slice(0, 300)}` : ''}`, r ? rectOf(r) : { x: 0, y: 0, w: W, h: 1 });
  }
  // PROBE=text: the markup round the first words matching it, to find which component drew them.
  if (probe) {
    const hit = leaves.find((l) => new RegExp(probe).test(l.text));
    if (hit) add('probe', hit.el.parentElement.parentElement.outerHTML.replace(/<svg[\s\S]*?<\/svg>/g, '<svg/>').replace(/ class="[^"]*"/g, '').slice(0, 1500));
  }
  return { found, text: document.body.innerText.slice(0, 200) };
}

// ---------------------------------------------------------------- the browser side

const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' };
const server = createServer((q, r) => {
  let p = join(dist, decodeURIComponent((q.url ?? '/').split('?')[0]));
  if (!p.startsWith(dist) || !existsSync(p) || statSync(p).isDirectory()) p = join(dist, 'index.html');
  r.setHeader('content-type', types[extname(p)] ?? 'application/octet-stream');
  r.end(readFileSync(p));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = process.env.REPORT ? null : await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' });

/** Opens one page with this storage and clock, waits for it to settle, audits it. */
async function visit({ path, w, h, scheme, storage, at, tag }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, reducedMotion: 'no-preference' });
  // The table runs on the phone's real clock, so every time in the fixture moves forward to "now" as the page opens.
  if (at) storage = { ...storage, 'flipup.session': JSON.stringify(shiftTimes(JSON.parse(storage['flipup.session']), Date.now() + 1500 - at)) };
  await ctx.addInitScript((items) => {
    if (sessionStorage.getItem('seeded')) return;
    for (const [k, v] of Object.entries(items)) localStorage.setItem(k, v);
    sessionStorage.setItem('seeded', '1');
  }, storage);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`page error: ${e.message.split('\n')[0].slice(0, 140)}`));
  page.on('console', (m) => {
    if (m.type() !== 'error' && m.type() !== 'warning') return;
    const t = m.text().split('\n')[0];
    if (/Failed to load resource|favicon|net::ERR|WebSocket|Download the React DevTools|shadow\*" style props are deprecated|props.pointerEvents is deprecated|Animated: `useNativeDriver`/.test(t)) return;
    errors.push(`console ${m.type()}: ${t.slice(0, 160)}`);
  });
  let res;
  try {
    await page.goto(`${base}${path}`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(3000);
    res = await page.evaluate(audit, process.env.PROBE ?? '');
    if (process.env.EVAL) console.log(`${tag}: ${await page.evaluate(process.env.EVAL)}`);
  } catch (e) {
    res = { found: [{ check: 'load-failed', detail: String(e.message).split('\n')[0].slice(0, 120) }], text: '' };
  }
  for (const e of new Set(errors)) res.found.push({ check: e.startsWith('page') ? 'page-error' : 'console', detail: e });
  if (SHOTS && process.env.FULL && res.found.length) await page.screenshot({ path: join(SHOTS, `${tag.replace(/[^\w]+/g, '-')}.png`) });
  if (SHOTS && res.found.some((f) => f.rect)) {
    for (const f of res.found) {
      if (!f.rect) continue;
      const key = signature(f);
      if (shotTaken.has(key)) continue;
      shotTaken.add(key);
      const pad = 40;
      const clip = { x: Math.max(0, f.rect.x - pad), y: Math.max(0, f.rect.y - pad), width: Math.min(w, f.rect.w + 2 * pad), height: Math.min(h, f.rect.h + 2 * pad) };
      clip.width = Math.min(clip.width, w - clip.x);
      clip.height = Math.min(clip.height, h - clip.y);
      if (clip.width > 2 && clip.height > 2) {
        f.shot = join(SHOTS, `${shotTaken.size}-${f.check}.png`);
        await page.screenshot({ path: f.shot, clip }).catch(() => (f.shot = undefined));
      }
    }
  }
  await ctx.close();
  for (const f of res.found) f.where = tag;
  return res;
}
const shotTaken = new Set();
/** Moves every timestamp in a saved table (anything near T0) by `delta` ms. */
function shiftTimes(v, delta) {
  if (typeof v === 'number') return Math.abs(v - T0) < 1e9 ? v + delta : v;
  if (Array.isArray(v)) return v.map((x) => shiftTimes(x, delta));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shiftTimes(x, delta)]));
  return v;
}
/** Takes out what changes from table to table (cards, bots, faces, numbers) so one bug is one line. */
const RANKS = '(ace|king|queen|jack|ten|nine|eight|seven|six|five|four|three|two)';
const normalize = (t) => String(t ?? '')
  .replace(new RegExp(`${RANKS} of (hearts|diamonds|clubs|spades)`, 'gi'), 'a card')
  .replace(/[A-Z][a-z]+ [A-Z]?,? ?a bot, [\d,]+ chips(, their turn)?(, folded)?(, offline)?/g, 'a bot seat')
  .replace(/(Point at|Vote for|Tag) [A-Z][a-z]+( [A-Z])?/g, '$1 someone')
  .replace(/Position [A-Z+\d]+/g, 'Position X')
  .replace(/^[^:\[]*: how it plays/, 'game: how it plays')
  .replace(/Your (mission|power): [^.]*\.[^\]]*/g, 'Your $1')
  .replace(/"(High card|[A-Z][a-z]+ high|Pair of [a-z]+|Two pair|Three of a kind|Straight|Flush|Full house|Four of a kind)\b[^"]*"/g, '"<hand name>"')
  .replace(/"(10|[2-9JQKA]|[♠♥♦♣])"/g, '"card"')
  .replace(/\p{Extended_Pictographic}(\u200d\p{Extended_Pictographic}|\ufe0f|[\u{1F3FB}-\u{1F3FF}])*/gu, '☺')
  .replace(/[\d,.]+/g, '#');
/** Drawn this way on purpose (the owner's design): position marks on card backs, the small bold labels on the power
 * and mission cards. Also Reanimated's web warning for the app's own entering worklets (bubblePop and friends), which
 * only the web preview can't play. KNOWN=0 shows them anyway. */
const INTENDED = [/Face-down card/, /Couldn't load entering\/exiting animation/, /^tiny-text\|"(BTN|BB|SB|MISSION|POWER|PLAY|DONE)"/];
const intended = (f) => process.env.KNOWN !== '0' && INTENDED.some((r) => r.test(`${f.check}|${f.detail}|${f.extra ?? ''}`));
const signature = (f) => `${f.check}|${normalize(f.detail)}|${normalize(f.extra)}`;

const baseStorage = {
  'flipup.device': JSON.stringify(HOST),
  'flipup.launched': 'true',
  'flipup.rulesseen': JSON.stringify(VARIANTS.map((v) => v.id)),
  'flipup.handtoolstip': 'true',
  'flipup.profile': JSON.stringify({ name: 'Wilhelmina', emoji: '🧑‍🍳' }),
};

const jobs = [];
const REPORT = process.env.REPORT;
if (REPORT) {
  // Report only: group a saved JSON again (after changing the grouping) without opening a browser.
} else if (ONLY !== 'screens') {
  for (const v of GAMES) {
    for (const n of PLAYERS) {
      let snaps;
      try { snaps = snapshots(v, n); } catch (e) { console.error(`fixture ${v} ${n}p: ${e.message}`); continue; }
      for (const [moment, s] of Object.entries(snaps)) {
        for (const [w, h] of SIZES) {
          jobs.push({ path: '/table', w, h, scheme: 'dark', at: s.at, tag: `table ${v} ${n}p ${moment} ${w}w`, storage: { ...baseStorage, 'flipup.session': JSON.stringify({ mode: 'local', code: null, game: s.game }) } });
        }
      }
      for (const m of MOMENTS) if (!snaps[m]) console.error(`fixture ${v} ${n}p: never reached ${m}`);
    }
  }
}
if (!REPORT && ONLY !== 'table') {
  const screens = ['/', '/games', '/profile', '/settings', '/stats', '/help', '/whats-new', '/train', '/play-bots', '/premium', '/replays', '/share', '/join', '/hand-rankings', '/card-packs'];
  for (const path of screens) for (const [w, h] of SIZES) for (const scheme of ['dark', 'light']) jobs.push({ path, w, h, scheme, tag: `screen ${path} ${w}w ${scheme}`, storage: baseStorage });
}

console.error(`${jobs.length} pages to check…`);
const all = REPORT ? JSON.parse(readFileSync(REPORT, 'utf8')) : [];
let next = 0, done = 0;
const t0 = Date.now();
await Promise.all(Array.from({ length: 4 }, async () => {
  while (next < jobs.length) {
    const job = jobs[next++];
    const res = await visit(job);
    all.push(...res.found);
    if (++done % 25 === 0) console.error(`  ${done}/${jobs.length} (${Math.round((Date.now() - t0) / 1000)}s)`);
  }
}));
await browser?.close();
server.close();

// ---------------------------------------------------------------- the report: one line per kind of problem

const groups = new Map();
for (const f of all) {
  if (intended(f)) continue;
  const k = signature(f);
  const g = groups.get(k) ?? { ...f, count: 0, wheres: [] };
  g.count += 1;
  g.wheres.push(f.where);
  if (!g.shot && f.shot) g.shot = f.shot;
  groups.set(k, g);
}
const ORDER = ['page-error', 'load-failed', 'bad-text', 'sideways-scroll', 'covered', 'text-on-text', 'off-screen', 'clipped', 'console', 'truncated', 'tiny-text', 'no-label', 'small-tap'];
const sorted = [...groups.values()].sort((a, b) => ORDER.indexOf(a.check) - ORDER.indexOf(b.check) || b.count - a.count);
const shortWhere = (ws) => {
  const u = [...new Set(ws)];
  return u.length <= 3 ? u.join('; ') : `${u.slice(0, 3).join('; ')} (+${u.length - 3} more)`;
};
if (process.env.JSON) writeFileSync(process.env.JSON, JSON.stringify(all, null, 1));
const MAX = Number(process.env.MAX ?? 12);
console.log(`Checked ${REPORT ? 'saved' : jobs.length} pages in ${Math.round((Date.now() - t0) / 1000)}s. ${sorted.length} kinds of problem, ${all.length} sightings.`);
let last = '', shown = 0;
const left = (c) => sorted.filter((g) => g.check === c).length - MAX;
for (const g of sorted) {
  if (g.check !== last) {
    if (last && left(last) > 0) console.log(`- …and ${left(last)} more kinds (MAX=${MAX})`);
    console.log(`\n## ${g.check}`);
    last = g.check;
    shown = 0;
  }
  if (++shown > MAX) continue;
  console.log(`- ${normalize(g.detail)}${g.extra ? `  [${g.extra}]` : ''}  ×${g.count}: ${shortWhere(g.wheres)}${g.shot ? `  (${g.shot})` : ''}`);
}
if (last && left(last) > 0) console.log(`- …and ${left(last)} more kinds (MAX=${MAX})`);
process.exit(sorted.length ? 1 : 0);

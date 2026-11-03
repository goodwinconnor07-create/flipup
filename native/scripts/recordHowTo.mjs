// Records How to Play's clips: a real bots-only hand of each game, played on the iPhone app's own table (its web
// build), filmed frame by frame, then cut to one hand that reaches a showdown and shows the game's big moment
// (the Pineapple throw-away, the die, the ghost, the vote...). Writes assets/howto/<game>.mp4 and the moments the
// captions follow to src/components/how-to/clips.json. Nothing here ships in the app.
//
//   cd native
//   EXPO_PUBLIC_RECORDER=1 npx expo export --platform web --output-dir /tmp/howto-web
//   node scripts/recordHowTo.mjs /tmp/howto-web [game ...]
//
// Needs Playwright's Chromium (CHROMIUM_PATH to use another build) and ffmpeg with libx264.

import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const { chromium } = require(require.resolve('playwright', { paths: [root, join(root, '..')] }));

const ALL = ['holdem', 'pineapple', 'deuces', 'ghost', 'pittsburgh', 'dice', 'redriver', 'crucifix', 'circle', 'memory', 'beanstalk', 'imposter'];
const [site, ...asked] = process.argv.slice(2);
if (!site || !existsSync(join(site, 'index.html'))) {
  console.error('Usage: node scripts/recordHowTo.mjs <web export dir> [game ...]');
  process.exit(1);
}
const games = asked.length ? asked : ALL;
const OUT = join(root, 'assets', 'howto');
const CLIPS = join(root, 'src', 'components', 'how-to', 'clips.json');
const WORK = join(process.env.TMPDIR ?? '/tmp', 'howto-frames');
mkdirSync(OUT, { recursive: true });

/** Longest clip after speeding up: a whole hand fits, nobody waits. */
const MAX_SECONDS = 42;
const ATTEMPT_MS = 6 * 60_000;

// The web export, served with a single-page fallback.
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ico': 'image/x-icon' };
const server = createServer((req, res) => {
  const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
  let file = join(site, path);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(site, 'index.html');
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
await new Promise((ok) => server.listen(0, ok));
const base = `http://localhost:${server.address().port}`;

const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox'] });
const clips = existsSync(CLIPS) ? JSON.parse(readFileSync(CLIPS, 'utf8')) : {};

for (const game of games) {
  console.log(`\n${game}`);
  const clip = await record(game);
  if (!clip) {
    console.log('  no hand worth keeping, skipped');
    continue;
  }
  clips[game] = clip;
  mkdirSync(dirname(CLIPS), { recursive: true });
  writeFileSync(CLIPS, `${JSON.stringify(clips, null, 2)}\n`);
}
await browser.close();
server.close();

async function record(game) {
  rmSync(WORK, { recursive: true, force: true });
  mkdirSync(WORK, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: 'dark' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('  page error:', e.message));
  await page.addInitScript(() => {
    localStorage.setItem('flipup.profile', JSON.stringify({ name: 'You', emoji: '😎' }));
    localStorage.setItem('flipup.fast', 'true');
    localStorage.setItem('flipup.muted', 'true');
  });
  await page.goto(`${base}/setup?mode=bots&variant=${game}`);
  await page.getByRole('button', { name: 'Sit down' }).click();
  await page.getByRole('button', { name: 'Deal' }).click({ timeout: 15_000 });

  // Every painted frame, with the time it was painted.
  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  let n = 0;
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const file = join(WORK, `f${String(n++).padStart(6, '0')}.jpg`);
    writeFileSync(file, Buffer.from(data, 'base64'));
    frames.push({ t: metadata.timestamp, file });
    void cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 82, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });

  const started = Date.now();
  let hand = null; // the hand being watched: { number, from, events, board, holes }
  let peekAt = null;
  let keep = null;
  while (Date.now() - started < ATTEMPT_MS && !keep) {
    const now = Date.now() / 1000;
    const g = await page.evaluate(() => {
      const t = window.__flipupTable?.();
      if (!t) return null;
      const h = t.hand;
      const me = t.players.find((p) => p.name === 'You');
      const seat = h?.seats.find((s) => s.playerId === me?.id);
      return {
        peek: !!t.memory,
        number: h?.number ?? 0,
        board: h?.board.length ?? 0,
        holes: seat?.cards.length ?? 0,
        discarding: !!h?.discarding,
        dice: !!h?.dice,
        voting: !!h?.voting,
        result: h?.result ? { showdown: h.result.showdown, ghost: !!h.result.ghost, imposter: !!h.result.imposter, iWon: !!me && (h.result.won[me.id] ?? 0) > 0 } : null,
      };
    });
    if (g) {
      // Memory Poker shows its cards before the hand is dealt: the clip starts there.
      if (g.peek && peekAt == null) peekAt = now;
      if (g.number && hand?.number !== g.number) {
        hand = { number: g.number, from: peekAt ?? now, events: peekAt != null ? [{ t: peekAt, kind: 'peek' }] : [], board: 0, holes: 0 };
        hand.events.push({ t: now, kind: 'deal' });
        peekAt = null;
      }
      if (hand && hand.number === g.number && !hand.done) {
        if (g.board > hand.board) {
          hand.streets = (hand.streets ?? 0) + 1;
          hand.events.push({ t: now, kind: 'street', n: hand.streets, cards: g.board });
          hand.board = g.board;
        }
        if (g.holes > hand.holes && hand.holes > 0) hand.events.push({ t: now, kind: 'grow', cards: g.holes });
        hand.holes = Math.max(hand.holes, g.holes);
        for (const k of ['discarding', 'dice', 'voting']) {
          if (g[k] && !hand[k]) {
            hand[k] = true;
            hand.events.push({ t: now, kind: k === 'discarding' ? 'discard' : k === 'voting' ? 'vote' : 'dice' });
          }
        }
        if (g.result) {
          hand.done = true;
          hand.to = now;
          hand.events.push({ t: now, kind: g.result.imposter ? 'reveal' : g.result.ghost ? 'ghost' : g.result.showdown ? 'showdown' : 'fold' });
          if (worthKeeping(game, hand, g.result)) keep = hand;
          else {
            // Not this one: let its frames go, so a long session doesn't fill the disk.
            for (const f of frames.splice(0, frames.length)) if (f.t < now - 1) rmSync(f.file, { force: true });
          }
        }
      }
      // Play along like a person who wants to see the hand through: check, else call; throw away the first card; vote.
      await act(page);
    }
    await page.waitForTimeout(120);
  }
  if (keep) await page.waitForTimeout(3600);
  await cdp.send('Page.stopScreencast').catch(() => {});
  await ctx.close();
  if (!keep) return null;
  return encode(game, keep, frames);
}

function worthKeeping(game, hand, result) {
  if (!result.showdown && !result.imposter) return false;
  const has = (kind) => hand.events.some((e) => e.kind === kind);
  if (game === 'pineapple') return has('discard');
  if (game === 'dice') return has('dice');
  if (game === 'imposter') return has('vote');
  if (game === 'memory') return has('peek');
  if (game === 'ghost') return result.ghost;
  // Red River's whole point is a red river bringing another card.
  if (game === 'redriver') return hand.board > 5;
  return (hand.streets ?? 0) >= 3;
}

async function act(page) {
  const click = async (loc) => {
    if (await loc.isVisible().catch(() => false)) {
      await loc.click({ timeout: 2000 }).catch(() => {});
      return true;
    }
    return false;
  };
  if (await click(page.getByRole('button', { name: /^Throw away the / }).first())) return;
  if (await click(page.getByRole('button', { name: /^Vote for / }).first())) return;
  if (await click(page.getByRole('button', { name: 'Check', exact: true }))) return;
  await click(page.getByRole('button', { name: /^Call( \d|$)/ }).first());
}

function encode(game, hand, frames) {
  const from = hand.from - 0.4;
  const to = hand.to + 3.4;
  const shots = frames.filter((f) => f.t <= to);
  // The frame showing at `from` starts the clip.
  const first = Math.max(0, shots.findIndex((f) => f.t >= from) - 1);
  const use = shots.slice(first);
  if (use.length < 2) return null;
  const length = to - from;
  const speed = Math.max(1, length / MAX_SECONDS);
  const list = use.map((f, i) => {
    const start = Math.max(f.t, from);
    const end = i + 1 < use.length ? use[i + 1].t : to;
    return `file '${f.file}'\nduration ${Math.max(0.001, (end - start) / speed).toFixed(4)}`;
  });
  list.push(`file '${use.at(-1).file}'`);
  const listFile = join(WORK, 'list.txt');
  writeFileSync(listFile, list.join('\n'));
  const out = join(OUT, `${game}.mp4`);
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-vf', 'scale=480:-2:flags=lanczos,fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '31', '-profile:v', 'high', '-movflags', '+faststart', '-an', out]);
  const seconds = +(length / speed).toFixed(2);
  const events = hand.events.filter((e) => e.t >= from && e.t <= to).map((e) => ({ ...e, t: undefined, at: +((e.t - from) / speed).toFixed(2) }));
  console.log(`  ${seconds}s (x${speed.toFixed(2)}), ${(statSync(out).size / 1024).toFixed(0)} KB, ${events.map((e) => e.kind).join(' ')}`);
  return { seconds, events };
}

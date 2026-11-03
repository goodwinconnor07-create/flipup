// Shoots How to Play's pictures: a real bots-only hand of each game, played on the iPhone app's own table (its web
// build) by a script that plays like a person (it waits a moment on its turn, then checks or calls, and never
// folds), with a screenshot at each moment the steps talk about: the deal, each street, the game's own twist (the
// throw-away, the die, the vote, the cards to remember) and the showdown. A hand without the game's twist is
// played out and dropped. Writes assets/howto/<game>/<moment>.webp and src/components/how-to/shots.ts, which
// lists them for the app. Nothing here ships in the app.
//
//   cd native
//   EXPO_PUBLIC_RECORDER=1 npx expo export --platform web --output-dir /tmp/howto-web
//   node scripts/shootHowTo.mjs /tmp/howto-web [game ...]
//
// Needs Playwright's Chromium (CHROMIUM_PATH to use another build) and ffmpeg with libwebp.

import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
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
  console.error('Usage: node scripts/shootHowTo.mjs <web export dir> [game ...]');
  process.exit(1);
}
const games = asked.length ? asked : ALL;
const OUT = join(root, 'assets', 'howto');
const LIST = join(root, 'src', 'components', 'how-to', 'shots.ts');
const WORK = process.env.SHOTS_WORK ?? join('/tmp', 'howto-shots');
const ATTEMPT_MS = 9 * 60_000;
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
/** How many tables play at once. */
const AT_ONCE = Number(process.env.AT_ONCE ?? 3);

// The web export, served with a single-page fallback.
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.ttf': 'font/ttf', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ico': 'image/x-icon' };
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
mkdirSync(WORK, { recursive: true });

const queue = [...games];
await Promise.all(
  Array.from({ length: Math.min(AT_ONCE, queue.length) }, async () => {
    for (let game = queue.shift(); game; game = queue.shift()) {
      const shots = await shoot(game).catch((e) => {
        console.log(`${game}: failed, ${e.message}`);
        return null;
      });
      if (!shots) {
        console.log(`${game}: no hand worth keeping, kept the old pictures`);
        continue;
      }
      save(game, shots);
    }
  }),
);
await browser.close();
server.close();
writeList();


/** Plays hands until one shows everything this game's steps need. Returns { moment: png buffer }. */
async function shoot(game) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: 'dark' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`${game}: page error:`, e.message));
  await page.addInitScript(() => {
    localStorage.setItem('flipup.profile', JSON.stringify({ name: 'You', emoji: '😎' }));
    localStorage.setItem('flipup.muted', 'true');
  });
  await page.goto(`${base}/setup?mode=bots&variant=${game}`);
  await page.getByRole('button', { name: 'Sit down' }).click({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Deal' }).click({ timeout: 30_000 });

  const started = Date.now();
  let hand = null;
  let peek = null; // Memory Poker's picture of the cards to remember, taken before the hand is dealt
  let pending = null; // { shot, min, deadline, mine }: the next picture to take
  let turnSince = 0;
  let turnKey = '';
  let kept = null;
  const snap = async () => page.screenshot({ type: 'png' });
  const take = async () => {
    if (!pending || !hand) return;
    if (!hand.shots[pending.shot]) hand.shots[pending.shot] = await snap();
    pending = null;
  };
  const plan = async (shot, wait, opts = {}) => {
    // A new moment before the last picture was taken (a run-out): take that one now.
    if (pending) await take();
    const now = Date.now();
    pending = { shot, min: now + wait, deadline: now + (opts.deadline ?? wait), mine: !!opts.mine };
  };

  while (Date.now() - started < ATTEMPT_MS && !kept) {
    const g = await page.evaluate(() => {
      const t = window.__flipupTable?.();
      if (!t) return null;
      const h = t.hand;
      const me = t.players.find((p) => p.name === 'You');
      const seat = h?.seats.find((s) => s.playerId === me?.id);
      return {
        peek: !!t.memory,
        number: h?.number ?? 0,
        seq: h?.seq ?? 0,
        street: h?.street ?? '',
        board: h?.board.length ?? 0,
        holes: seat?.cards.length ?? 0,
        folded: !!seat?.folded,
        myTurn: !!h && !h.result && !!me && h.toAct === me.id,
        discarding: !!h?.discarding,
        dice: !!h?.dice,
        voting: !!h?.voting,
        result: h?.result ? { showdown: h.result.showdown, ghost: !!h.result.ghost, imposter: !!h.result.imposter } : null,
      };
    });
    const now = Date.now();
    if (g) {
      if (g.peek && !peek && (!hand || hand.done)) {
        await sleep(1600);
        peek = await snap();
      }
      if (g.number && hand?.number !== g.number) {
        hand = { number: g.number, shots: {}, streets: 0, board: g.board, done: false, flags: {} };
        if (peek) hand.shots.peek = peek;
        peek = null;
        pending = null;
        await plan('deal', 1200, { mine: true, deadline: 9000 });
      }
      if (hand && hand.number === g.number && !hand.done) {
        if (g.board > hand.board) {
          hand.streets += 1;
          hand.board = g.board;
          const shot = hand.streets === 1 ? 'flop' : hand.streets === 2 ? 'turn' : hand.streets === 3 ? 'river' : 'more';
          await plan(shot, 1700, { mine: true, deadline: 5000 });
        }
        for (const [flag, shot, wait] of [['discarding', 'discard', 1000], ['dice', 'dice', 2200], ['voting', 'vote', 1100]]) {
          if (g[flag] && !hand.flags[flag]) {
            hand.flags[flag] = true;
            await plan(shot, wait);
          }
        }
        if (g.result) {
          hand.done = true;
          hand.result = g.result;
          await plan(g.result.imposter ? 'reveal' : g.result.ghost ? 'ghost' : 'showdown', 2600);
        }
      }
      // The picture, once the moment has settled (and, where it helps, once it's your turn so the buttons show).
      if (pending && now >= pending.min && (!pending.mine || g.myTurn || now >= pending.deadline)) {
        if (pending.mine && g.myTurn) await sleep(500);
        await take();
        if (hand?.done && !pending) {
          if (worthKeeping(game, hand)) kept = hand.shots;
          continue;
        }
      }
      // Play like a person: think for a moment on your turn, then check, else call.
      const key = `${g.number}-${g.seq}`;
      if (g.myTurn && key !== turnKey) {
        turnKey = key;
        turnSince = now;
      }
      const waitingForPicture = pending && (pending.shot === 'discard' || pending.shot === 'vote' || (pending.mine && g.myTurn));
      if (!waitingForPicture && (g.discarding || g.voting || (g.myTurn && now - turnSince > 1500))) await act(page);
    }
    await sleep(150);
  }
  await ctx.close();
  return kept;
}

function worthKeeping(game, hand) {
  const r = hand.result;
  const s = hand.shots;
  if (!r || !s.deal) return false;
  if (!r.showdown && !r.imposter) return false;
  if (game === 'pineapple') return !!s.discard && !!s.flop && !!s.turn;
  if (game === 'dice') return !!s.dice;
  if (game === 'imposter') return !!s.vote && !!s.reveal;
  if (game === 'memory') return !!s.peek && !!s.flop;
  if (game === 'ghost') return r.ghost && !!s.ghost;
  // Red River's whole point is a red river bringing another card.
  if (game === 'redriver') return hand.board > 5 && !!s.river;
  return !!s.flop && !!s.turn && !!s.river;
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
  await click(page.getByRole('button', { name: /^(Call|All in)( \d|$)/ }).first());
}

/** Writes a game's pictures as WebP, 585 points wide (1.5× a 390pt phone), replacing the old set. */
function save(game, shots) {
  const dir = join(OUT, game);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  let bytes = 0;
  for (const [shot, png] of Object.entries(shots)) {
    const tmp = join(WORK, `${game}-${shot}.png`);
    writeFileSync(tmp, png);
    const out = join(dir, `${shot}.webp`);
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', tmp, '-vf', 'scale=585:-2:flags=lanczos', '-c:v', 'libwebp', '-quality', '78', '-compression_level', '6', out]);
    bytes += statSync(out).size;
    rmSync(tmp);
  }
  console.log(`${game}: ${Object.keys(shots).join(' ')} (${Math.round(bytes / 1024)} KB)`);
}

/** src/components/how-to/shots.ts: every picture on disk, so the bundler packs them with the app. */
function writeList() {
  const lines = [];
  for (const game of ALL) {
    const dir = join(OUT, game);
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter((f) => f.endsWith('.webp')).sort();
    if (!files.length) continue;
    lines.push(`  ${game}: {`);
    for (const f of files) lines.push(`    ${f.replace('.webp', '')}: require('../../../assets/howto/${game}/${f}'),`);
    lines.push('  },');
  }
  writeFileSync(
    LIST,
    `// How to Play's pictures, one real hand of each game on the app's own table (scripts/shootHowTo.mjs writes this
// file). Bundled with the app, so they show with no connection.
import type { Variant } from '@/engine';

import type { Shot } from './steps';

export const SHOTS: Partial<Record<Variant, Partial<Record<Shot, number>>>> = {
${lines.join('\n')}
};
`,
  );
}

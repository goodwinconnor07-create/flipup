// The Mac's half of How to Play's shoot: a small server the recorder in the app (on the iPhone simulator) calls at
// each moment. /shot takes a real iOS screenshot with `xcrun simctl io screenshot`; /keep makes the chosen hand's
// pictures the game's set (WebP, 804 pixels wide: 2× a 402pt iPhone 17 Pro); /done writes
// src/components/how-to/shots.ts and stops. See .github/workflows/howto-shots.yml and docs/HOW_TO_PLAY.md.
//
//   node scripts/howto/host.mjs <simulator udid> [game ...]
// Needs Xcode's simctl and cwebp (brew install webp).
import { execFileSync } from 'node:child_process';
import { Buffer } from 'node:buffer';
import { inflateSync } from 'node:zlib';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const [udid, ...games] = process.argv.slice(2);
if (!udid) {
  console.error('Usage: node scripts/howto/host.mjs <simulator udid> [game ...]');
  process.exit(1);
}
const ALL = ['holdem', 'pineapple', 'deuces', 'ghost', 'pittsburgh', 'dice', 'redriver', 'crucifix', 'circle', 'memory', 'beanstalk', 'bjholdem', 'imposter', 'power'];
const OUT = join(root, 'assets', 'howto');
const LIST = join(root, 'src', 'components', 'how-to', 'shots.ts');
const WORK = process.env.SHOTS_WORK ?? join(root, '..', 'howto-work');
const WIDTH = 804;
mkdirSync(WORK, { recursive: true });

const started = Date.now();
const stamp = () => `${Math.round((Date.now() - started) / 1000)}s`;
const safe = (s) => String(s ?? '').replace(/[^a-z0-9-]/gi, '');

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const q = Object.fromEntries(url.searchParams);
  let answer = 'ok';
  try {
    switch (url.pathname) {
      case '/games':
        answer = games.join(',');
        break;
      case '/log':
        console.log(`[${stamp()}] ${q.msg}`);
        break;
      case '/shot': {
        const dir = join(WORK, safe(q.game), safe(q.hand));
        mkdirSync(dir, { recursive: true });
        const file = join(dir, `${safe(q.name)}.png`);
        // A system notification over the top of the screen spoils the picture: try again for a few seconds.
        let clear = false;
        for (let i = 0; i < 6 && !clear; i++) {
          if (i) execFileSync('sleep', ['0.7']);
          execFileSync('xcrun', ['simctl', 'io', udid, 'screenshot', '--type=png', file], { stdio: 'ignore' });
          clear = !hasBanner(file);
        }
        if (!clear) rmSync(file, { force: true });
        console.log(`[${stamp()}] ${q.game} ${q.hand} ${q.name}${clear ? '' : ' (a system banner covered it every time: dropped)'}`);
        answer = clear ? 'ok' : 'banner';
        break;
      }
      case '/window': {
        // A picture taken wholly inside [from, to] (ms since 1970, the simulator's clock is the Mac's): the
        // screenshot itself takes a varying time on CI, so keep trying until one starts and ends inside it.
        const dir = join(WORK, safe(q.game), safe(q.hand));
        mkdirSync(dir, { recursive: true });
        const from = Number(q.from);
        const to = Number(q.to);
        let got = false;
        const tries = [];
        while (Date.now() < to && !got) {
          if (Date.now() < from) execFileSync('sleep', [String((from - Date.now()) / 1000)]);
          const start = Date.now();
          const tmp = join(dir, `${safe(q.name)}.try.png`);
          execFileSync('xcrun', ['simctl', 'io', udid, 'screenshot', '--type=png', tmp], { stdio: 'ignore' });
          const end = Date.now();
          tries.push(`${start - from}..${end - from}`);
          got = start >= from && end <= to && !hasBanner(tmp);
          // Only a picture inside the window (and with no system banner over it) replaces the one already kept.
          if (got) renameSync(tmp, join(dir, `${safe(q.name)}.png`));
          else rmSync(tmp, { force: true });
        }
        console.log(`[${stamp()}] ${q.game} ${q.hand} ${q.name} ${got ? 'in its window' : 'MISSED its window'} (ms after it opened: ${tries.join(', ')})`);
        answer = got ? 'ok' : 'missed';
        break;
      }
      case '/keep':
        keep(safe(q.game), safe(q.hand), q.score);
        break;
      case '/done':
        writeList();
        console.log(`[${stamp()}] done`);
        setTimeout(() => process.exit(0), 200);
        break;
      default:
        answer = 'unknown';
    }
  } catch (e) {
    console.log(`[${stamp()}] ${url.pathname} failed: ${e.message}`);
    answer = 'error';
  }
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end(answer);
});
server.listen(8123, '127.0.0.1', () => console.log('How to Play host listening on 127.0.0.1:8123'));

/**
 * Whether an iOS notification banner (a fresh simulator's "Ready for Apple Intelligence") covers the top of a
 * screenshot: the table's screen is black across the row just under the nav bar, a banner is grey all the way.
 * Decodes the PNG simctl writes (8-bit RGB or RGBA, not interlaced) with zlib alone.
 */
function hasBanner(file) {
  const png = readFileSync(file);
  let at = 8;
  let width = 0;
  let height = 0;
  let channels = 4;
  const idat = [];
  while (at < png.length) {
    const len = png.readUInt32BE(at);
    const type = png.toString('ascii', at + 4, at + 8);
    const data = png.subarray(at + 8, at + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      channels = data[9] === 2 ? 3 : 4;
    } else if (type === 'IDAT') idat.push(data);
    at += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const row = Math.round(height * 0.145);
  // Unfilter rows up to the one we need.
  let prev = Buffer.alloc(stride);
  let line = prev;
  for (let y = 0; y <= row; y++) {
    const start = y * (stride + 1);
    const filter = raw[start];
    line = Buffer.from(raw.subarray(start + 1, start + 1 + stride));
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? line[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      const add = filter === 1 ? a : filter === 2 ? b : filter === 3 ? (a + b) >> 1 : filter === 4 ? paeth(a, b, c) : 0;
      line[x] = (line[x] + add) & 0xff;
    }
    prev = line;
  }
  let darkest = 255;
  for (let i = 15; i <= 85; i += 2) {
    const x = Math.round((width * i) / 100) * channels;
    darkest = Math.min(darkest, Math.round(0.299 * line[x] + 0.587 * line[x + 1] + 0.114 * line[x + 2]));
  }
  return darkest > 20;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** The chosen hand's pictures become the game's set, replacing the old one. */
function keep(game, hand, score) {
  const from = join(WORK, game, hand);
  if (!hand || !existsSync(from) || Number(score) < 0) {
    console.log(`[${stamp()}] ${game}: no hand worth keeping (best ${hand || 'none'}, score ${score}), kept the old pictures`);
    return;
  }
  const dir = join(OUT, game);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const shots = readdirSync(from).filter((f) => f.endsWith('.png'));
  for (const f of shots) {
    execFileSync('cwebp', ['-quiet', '-q', '80', '-m', '6', '-resize', String(WIDTH), '0', join(from, f), '-o', join(dir, f.replace('.png', '.webp'))]);
  }
  console.log(`[${stamp()}] ${game}: kept hand ${hand} (score ${score}): ${shots.map((f) => f.replace('.png', '')).join(' ')}`);
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
    `// How to Play's pictures: one real hand of each game, screenshots of the app on an iPhone 17 Pro simulator
// (native/scripts/howto, .github/workflows/howto-shots.yml write this file). Bundled with the app, so they show with
// no connection.
import type { Variant } from '@/engine';

import type { Shot } from './steps';

/** The pictures' shape: an iPhone 17 Pro screen, 402 × 874 points. */
export const SHOT_ASPECT = 402 / 874;

export const SHOTS: Partial<Record<Variant, Partial<Record<Shot, number>>>> = {
${lines.join('\n')}
};
`,
  );
}

// The Mac's half of How to Play's shoot: a small server the recorder in the app (on the iPhone simulator) calls at
// each moment. /shot takes a real iOS screenshot with `xcrun simctl io screenshot`; /keep makes the chosen hand's
// pictures the game's set (WebP, 804 pixels wide: 2× a 402pt iPhone 17 Pro); /done writes
// src/components/how-to/shots.ts and stops. See .github/workflows/howto-shots.yml and docs/HOW_TO_PLAY.md.
//
//   node scripts/howto/host.mjs <simulator udid> [game ...]
// Needs Xcode's simctl and cwebp (brew install webp).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
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
const ALL = ['holdem', 'pineapple', 'deuces', 'ghost', 'pittsburgh', 'dice', 'redriver', 'crucifix', 'circle', 'memory', 'beanstalk', 'bjholdem', 'imposter'];
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
        execFileSync('xcrun', ['simctl', 'io', udid, 'screenshot', '--type=png', join(dir, `${safe(q.name)}.png`)], { stdio: 'ignore' });
        console.log(`[${stamp()}] ${q.game} ${q.hand} ${q.name}`);
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
          execFileSync('xcrun', ['simctl', 'io', udid, 'screenshot', '--type=png', join(dir, `${safe(q.name)}.png`)], { stdio: 'ignore' });
          const end = Date.now();
          tries.push(`${start - from}..${end - from}`);
          got = start >= from && end <= to;
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

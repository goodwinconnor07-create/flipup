// The Mac's half of the App Store screenshots: a small server the recorder in the app (on the iPhone simulator)
// calls at each screen. /shot takes a real iOS screenshot with `xcrun simctl io screenshot` and saves it as a JPEG
// (App Store Connect turns away PNGs with an alpha channel, and simctl's PNGs have one), at the simulator's own
// size: 1320 × 2868 on an iPhone 17 Pro Max (the 6.9" set), 1206 × 2622 on an iPhone 17 Pro (the 6.1"/6.3" set).
// /done stops it. See .github/workflows/store-shots.yml.
//
//   node scripts/storeshots/host.mjs <simulator udid> <folder> [screen ...]
// Needs Xcode's simctl and macOS's sips.
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';

const [udid, out, ...only] = process.argv.slice(2);
if (!udid || !out) {
  console.error('Usage: node scripts/storeshots/host.mjs <simulator udid> <folder> [screen ...]');
  process.exit(1);
}
mkdirSync(out, { recursive: true });
const started = Date.now();
const stamp = () => `${Math.round((Date.now() - started) / 1000)}s`;
const safe = (s) => String(s ?? '').replace(/[^a-z0-9-]/gi, '');

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const q = Object.fromEntries(url.searchParams);
  let answer = 'ok';
  try {
    switch (url.pathname) {
      case '/only':
        answer = only.join(',');
        break;
      case '/log':
        console.log(`[${stamp()}] ${q.msg}`);
        break;
      case '/shot': {
        const png = join(out, `${safe(q.name)}.png`);
        execFileSync('xcrun', ['simctl', 'io', udid, 'screenshot', '--type=png', png], { stdio: 'ignore' });
        execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '92', png, '--out', join(out, `${safe(q.name)}.jpg`)], { stdio: 'ignore' });
        rmSync(png, { force: true });
        console.log(`[${stamp()}] shot ${q.name}`);
        break;
      }
      case '/done':
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
server.listen(8124, '127.0.0.1', () => console.log('App Store screenshots host listening on 127.0.0.1:8124'));

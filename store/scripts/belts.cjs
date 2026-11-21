// The Party tab's tilted belts of game pictures, as a still (the universal creative asset) or a looping video.
//   node store/scripts/belts.cjs <games.json> <out> <width> <height> <tile px> [centreY] [seconds]
// With seconds, writes an H.264 MP4 at 30 fps where every row slides one full pass of its games, so it loops.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const [file, out, W, H, TILE, CY, SECS] = process.argv.slice(2).map((v, i) => (i < 2 ? v : Number(v)));
const games = require(require('path').resolve(file));
const GAP = Math.round(TILE * 0.13), PITCH = TILE + GAP;
const shuffle = (a, seed) => { a = [...a]; let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// Rows: with more than 16 games, rows alternate between two halves, so neighbouring rows share nothing. Every row's
// order is searched so a game is never within MIN_NEAR tiles of itself in the next row, nor MIN_FAR two rows away
// (positions measured round the loop, with each row's half-tile stagger). All rows move the same way, so this holds
// for the whole video.
const ROWS = Math.ceil((H * 1.25 + W * 0.13) / PITCH) + 2;
const halves = games.length > 16 ? [shuffle(games, 5).slice(0, Math.ceil(games.length / 2)), null] : [games, games];
if (halves[1] === null) halves[1] = games.filter((g) => !halves[0].includes(g));
const perRow = halves[0].length;
const stagger = (i) => -(i % 2) * 0.5;
const MIN_NEAR = 2.5, MIN_FAR = 2;
function far(a, b, n) { const d = Math.abs(a - b) % n; return Math.min(d, n - d); }
const rows = [];
let seed = 3;
for (let i = 0; i < ROWS; i++) {
  const set = halves[i % 2];
  for (let tries = 0; ; tries++) {
    const cand = shuffle(set, seed++);
    const ok = [[1, MIN_NEAR], [2, MIN_FAR]].every(([back, min]) => {
      const prev = rows[i - back]; if (!prev) return true;
      return cand.every((g, c) => { const pc = prev.indexOf(g); if (pc < 0) return true;
        return far(c + stagger(i), pc + stagger(i - back), cand.length) >= min; });
    });
    if (ok) { rows.push(cand); break; }
    if (tries > 200000) throw new Error('no arrangement for row ' + i);
  }
}
const span = perRow * PITCH, copies = Math.ceil((W * 1.6) / span) + 2;
const tile = (g) => `<div class="t" data-g="${g.id}" style="background:${g.field}">${g.svg}</div>`;
const html = `<html><head><style>*{margin:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;overflow:hidden;background:#fff;position:relative}
.wrap{position:absolute;left:50%;top:${CY || H / 2}px;width:${W * 1.6}px;transform:translate(-50%,-50%) rotate(-7deg);display:flex;flex-direction:column;gap:${GAP}px}
.row{display:flex;gap:${GAP}px;will-change:transform}
.t{flex:none;width:${TILE}px;height:${TILE}px;border-radius:22.5%;display:grid;place-items:center;box-shadow:0 ${TILE * 0.055}px ${TILE * 0.13}px rgba(20,30,60,.16)}
.t svg{width:92%;height:92%}</style></head><body><div class="wrap">${rows.map((r, i) => `<div class="row" data-i="${i}">${Array.from({ length: copies }, () => r.map(tile).join('')).join('')}</div>`).join('')}</div>
<script>const SPAN=${span};window.at=(t)=>document.querySelectorAll('.row').forEach((r,i)=>{const start=-SPAN-(i%2)*${PITCH / 2};const d=-1;r.style.transform='translateX('+(start+d*t*SPAN)+'px)'});at(0);</script></body></html>`;
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}); const p = await b.newPage({ viewport: { width: W, height: H } });
  await p.setContent(html); await p.waitForTimeout(500);
  // Check: the closest any picture comes to a twin on screen, in tiles (centre to centre), over a few moments.
  for (const t of [0, 0.37, 0.71]) {
    const near = await p.evaluate(([t, W, H, P]) => { at(t); const pts = [...document.querySelectorAll('.t')].map((e) => { const r = e.getBoundingClientRect(); return { g: e.dataset.g, x: r.x + r.width / 2, y: r.y + r.height / 2 }; }).filter((q) => q.x > -P && q.x < W + P && q.y > -P && q.y < H + P);
      let best = 1e9; for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) if (pts[i].g === pts[j].g) best = Math.min(best, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)); return best / P; }, [t, W, H, PITCH]);
    console.log(`t=${t}: closest twins ${near.toFixed(2)} tiles apart`);
  }
  await p.evaluate(() => at(0));
  if (!SECS) { await p.screenshot({ path: out }); await b.close(); return; }
  const n = SECS * 30;
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'slow', '-r', '30', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = 0; f < n; f++) { await p.evaluate((t) => at(t), f / n); const buf = await p.screenshot({ type: 'jpeg', quality: 95 }); if (!ff.stdin.write(buf)) await new Promise((ok) => ff.stdin.once('drain', ok)); }
  ff.stdin.end(); await new Promise((ok) => ff.on('close', ok)); await b.close();
})();

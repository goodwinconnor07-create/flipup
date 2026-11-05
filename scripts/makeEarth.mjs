// Draws the Earth texture for the Global tab's globe (native/assets/images/earth.jpg): an equirectangular map from
// world-atlas's public-domain Natural Earth land shapes, in the app's colours: brand-blue land, pale ice at
// the poles, a night-blue sea, flat and solid. Rendered in Chromium.
//
//   npm pack world-atlas@2.0.2 (unpack it somewhere), then ATLAS=/that/folder/package node scripts/makeEarth.mjs
// The TopoJSON is read as data and decoded here (`rings()`), so no code from the package runs.
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const W = 2048;
const H = 1024;

/** TopoJSON land to polygons of [lon, lat] rings: delta-decoded, quantised arcs joined by index (~i is reversed). */
function rings(topo) {
  const [sx, sy] = topo.transform.scale;
  const [tx, ty] = topo.transform.translate;
  const arcs = topo.arcs.map((arc) => {
    let x = 0;
    let y = 0;
    return arc.map(([dx, dy]) => [(x += dx) * sx + tx, (y += dy) * sy + ty]);
  });
  const ring = (ids) =>
    ids.flatMap((i, k) => {
      const a = i >= 0 ? arcs[i] : [...arcs[~i]].reverse();
      return k ? a.slice(1) : a;
    });
  const out = [];
  for (const g of topo.objects.land.geometries) {
    const polys = g.type === 'Polygon' ? [g.arcs] : g.type === 'MultiPolygon' ? g.arcs : [];
    for (const poly of polys) out.push(poly.map(ring));
  }
  return out;
}

const polygons = rings(JSON.parse(readFileSync(`${process.env.ATLAS}/land-50m.json`, 'utf8')));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent(`<canvas id="c" width="${W}" height="${H}"></canvas>`);
const data = await page.evaluate(
  ({ polygons, W, H }) => {
    const c = document.getElementById('c');
    const g = c.getContext('2d');
    const x = (lon) => ((lon + 180) / 360) * W;
    const y = (lat) => ((90 - lat) / 180) * H;
    // In the app's colours, flat and solid: night-blue sea, brand-blue land, pale ice at the poles.
    g.fillStyle = '#0e1b42';
    g.fillRect(0, 0, W, H);
    const mask = document.createElement('canvas');
    mask.width = W;
    mask.height = H;
    const m = mask.getContext('2d');
    m.fillStyle = '#fff';
    for (const poly of polygons) {
      m.beginPath();
      for (const ring of poly) {
        ring.forEach(([lo, la], i) => {
          if (!i || Math.abs(lo - ring[i - 1][0]) > 180) m.moveTo(x(lo), y(la));
          else m.lineTo(x(lo), y(la));
        });
      }
      m.fill('evenodd');
    }
    const paint = document.createElement('canvas');
    paint.width = W;
    paint.height = H;
    const p = paint.getContext('2d');
    const bands = p.createLinearGradient(0, 0, 0, H);
    for (const [o, col] of [[0, '#dfe8ff'], [0.12, '#dfe8ff'], [0.16, '#3a6ae6'], [0.84, '#3a6ae6'], [0.88, '#dfe8ff'], [1, '#dfe8ff']]) bands.addColorStop(o, col);
    p.fillStyle = bands;
    p.fillRect(0, 0, W, H);
    p.globalCompositeOperation = 'destination-in';
    p.drawImage(mask, 0, 0);
    g.drawImage(paint, 0, 0);
    return c.toDataURL('image/jpeg', 0.85).split(',')[1];
  },
  { polygons, W, H },
);
writeFileSync(new URL('../native/assets/images/earth.jpg', import.meta.url), Buffer.from(data, 'base64'));
await browser.close();
console.log('wrote native/assets/images/earth.jpg');

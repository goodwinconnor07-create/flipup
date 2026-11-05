// Draws the Earth texture for the Global tab's globe (native/assets/images/earth.jpg): an equirectangular map from
// world-atlas's public-domain Natural Earth land shapes, coloured by latitude (ice, forest, desert), on a deep ocean,
// with shallow water at the coasts and a little grain. Rendered in Chromium.
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
    const sea = g.createLinearGradient(0, 0, 0, H);
    sea.addColorStop(0, '#0a2440');
    sea.addColorStop(0.5, '#124f7d');
    sea.addColorStop(1, '#0a2440');
    g.fillStyle = sea;
    g.fillRect(0, 0, W, H);
    // Land as a mask.
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
    // Ground colours by latitude, with grain, cut to the land.
    const paint = document.createElement('canvas');
    paint.width = W;
    paint.height = H;
    const p = paint.getContext('2d');
    const bands = p.createLinearGradient(0, 0, 0, H);
    for (const [o, col] of [
      [0, '#f4f7fa'], [0.1, '#e6ecf0'], [0.15, '#6b7458'], [0.24, '#3f6a34'], [0.32, '#8c7a4f'], [0.37, '#c4a66c'],
      [0.44, '#3d7a2e'], [0.5, '#2c6524'], [0.56, '#3d7a2e'], [0.62, '#c9ab70'], [0.68, '#7d7448'], [0.76, '#4d6b3a'],
      [0.84, '#8a8f86'], [0.88, '#eef2f5'], [1, '#ffffff'],
    ])
      bands.addColorStop(o, col);
    p.fillStyle = bands;
    p.fillRect(0, 0, W, H);
    for (let i = 0; i < 40000; i++) {
      p.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.035)';
      p.beginPath();
      p.arc(Math.random() * W, Math.random() * H, 0.8 + Math.random() * 2.5, 0, Math.PI * 2);
      p.fill();
    }
    p.globalCompositeOperation = 'destination-in';
    p.drawImage(mask, 0, 0);
    // Shallow water at the coasts, then the land.
    g.filter = 'blur(8px)';
    g.globalAlpha = 0.25;
    g.drawImage(mask, 0, 0);
    g.filter = 'none';
    g.globalAlpha = 1;
    g.drawImage(paint, 0, 0);
    return c.toDataURL('image/jpeg', 0.85).split(',')[1];
  },
  { polygons, W, H },
);
writeFileSync(new URL('../native/assets/images/earth.jpg', import.meta.url), Buffer.from(data, 'base64'));
await browser.close();
console.log('wrote native/assets/images/earth.jpg');

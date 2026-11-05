// Measures the main colour of every emoji in the profile picker (src/game/emoji.ts) and writes
// src/design/emojiColours.ts, so a profile sheet can fade from the colour of the person's emoji (Apple's profile
// sheet does this with your picture). Drawn with the computer's colour emoji font in Chromium:
//
//   CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/emojiColours.mjs
//
// The main colour is the most common saturated hue (its pixels averaged); an emoji with none (a white ghost, a
// panda) gets a soft slate.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(ROOT, 'src', 'game', 'emoji.ts'), 'utf8');
const list = source.slice(source.indexOf('export const EMOJIS = ['), source.indexOf('] as const;'));
const emojis = [...list.matchAll(/'([^']+)'/g)].map((m) => m[1]);

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();
await page.setContent('<!doctype html><html><body></body></html>');
const colours = await page.evaluate((emojis) => {
  const c = document.createElement('canvas');
  c.width = c.height = 96;
  const g = c.getContext('2d', { willReadFrequently: true });
  const hex = (r, gr, b) => `#${[r, gr, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
  return emojis.map((e) => {
    g.clearRect(0, 0, 96, 96);
    g.font = '80px "Noto Color Emoji"';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(e, 48, 52);
    const d = g.getImageData(0, 0, 96, 96).data;
    const buckets = Array.from({ length: 12 }, () => ({ n: 0, r: 0, g: 0, b: 0 }));
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 200) continue;
      const [r, gr, b] = [d[i] / 255, d[i + 1] / 255, d[i + 2] / 255];
      const max = Math.max(r, gr, b);
      const min = Math.min(r, gr, b);
      const l = (max + min) / 2;
      const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
      if (s < 0.3 || l < 0.15 || l > 0.85) continue;
      let h = max === r ? ((gr - b) / (max - min)) % 6 : max === gr ? (b - r) / (max - min) + 2 : (r - gr) / (max - min) + 4;
      h = (h * 60 + 360) % 360;
      const k = buckets[Math.floor(h / 30) % 12];
      k.n++;
      k.r += d[i];
      k.g += d[i + 1];
      k.b += d[i + 2];
    }
    const best = buckets.reduce((a, b) => (b.n > a.n ? b : a));
    return best.n < 60 ? '#5b6476' : hex(best.r / best.n, best.g / best.n, best.b / best.n);
  });
}, emojis);
await browser.close();

// Where the computer's emoji font differs from Apple's in what you notice first (Noto's ghost shows a pink tongue,
// its ninja and vampire their skin, its shark a red mouth), the colour is set by hand.
const BY_HAND = { '👻': '#8fa3bf', '🤖': '#7d8fa8', '👽': '#8d93a6', '🦈': '#4f86b8', '🧛': '#8a1e3a', '🥷': '#3b3f4a' };
emojis.forEach((e, i) => {
  if (BY_HAND[e]) colours[i] = BY_HAND[e];
});

const lines = emojis.map((e, i) => `  '${e}': '${colours[i]}',`);
writeFileSync(
  join(ROOT, 'src', 'design', 'emojiColours.ts'),
  `// Written by scripts/emojiColours.mjs: don't edit. The main colour of each emoji in the profile picker, for sheets
// that take their colour from a person's emoji.
export const EMOJI_COLOURS: Record<string, string> = {
${lines.join('\n')}
};

/** Colours for an emoji typed in rather than picked: one of these, always the same for the same emoji. */
const TYPED = ['#8468ee', '#e0533d', '#1f9d6a', '#2f7bff', '#e0a100', '#d6409f', '#0f9fb5', '#7a5cff'];

/** The colour a sheet about this person fades from: their emoji's main colour. */
export function emojiColour(emoji: string): string {
  const known = EMOJI_COLOURS[emoji];
  if (known) return known;
  let h = 0;
  for (const ch of emoji) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return TYPED[h % TYPED.length];
}
`,
);
console.log(emojis.map((e, i) => `${e} ${colours[i]}`).join('  '));

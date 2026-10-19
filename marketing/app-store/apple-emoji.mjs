// Swaps every emoji on a page for Apple's own artwork, so screenshots show the emojis an iPhone
// would. Images (160px, from emojicdn.elk.sh) are downloaded once into emoji/ and passed into the
// page as data URLs. On a live app page, call the returned undo() straight after the screenshot so
// React's own text nodes are back before the app updates again.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync } from 'node:fs';

const DIR = new URL('./emoji/', import.meta.url).pathname;

/** Only characters that show as emoji: suits like ♠ and ♥ stay as text. */
const PATTERN = String.raw`(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}️)\p{Emoji_Modifier}?(?:‍\p{Extended_Pictographic}️?\p{Emoji_Modifier}?)*|\p{Regional_Indicator}{2}`;

/** An emoji's image as a data URL, downloading it the first time. */
function emojiData(emoji) {
  mkdirSync(DIR, { recursive: true });
  const code = [...emoji].map((c) => c.codePointAt(0).toString(16)).join('-');
  const file = `${DIR}${code}.png`;
  if (!existsSync(file)) {
    try {
      execFileSync('curl', ['-sSfL', '--retry', '4', '--retry-all-errors', '-o', file + '.part', `https://emojicdn.elk.sh/${encodeURIComponent(emoji)}?style=apple`]);
      renameSync(file + '.part', file);
    } catch {
      return null;
    }
  }
  return 'data:image/png;base64,' + readFileSync(file).toString('base64');
}

/** @param {import('@playwright/test').Page} page */
export async function showAppleEmoji(page) {
  const found = await page.evaluate((src) => [...new Set(document.body.innerText.match(new RegExp(src, 'gu')) ?? [])], PATTERN);
  const images = Object.fromEntries(found.map((e) => [e, emojiData(e)]).filter(([, d]) => d));
  await page.evaluate(
    ([src, images]) => {
      const re = new RegExp(src, 'gu');
      const swaps = [];
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        const text = n.nodeValue ?? '';
        const matches = [...text.matchAll(re)].filter((m) => images[m[0]]);
        if (!matches.length) continue;
        const span = document.createElement('span');
        let last = 0;
        for (const m of matches) {
          span.append(text.slice(last, m.index));
          const img = document.createElement('img');
          img.src = images[m[0]];
          img.alt = m[0];
          img.className = 'apple-emoji';
          img.style.cssText = 'height:1.15em;width:1.15em;vertical-align:-0.2em;display:inline-block';
          span.append(img);
          last = m.index + m[0].length;
        }
        span.append(text.slice(last));
        swaps.push([n, span]);
      }
      for (const [n, span] of swaps) n.replaceWith(span);
      window.__undoEmoji = () => swaps.forEach(([n, span]) => span.replaceWith(n));
    },
    [PATTERN, images],
  );
  await page.waitForFunction(() => [...document.querySelectorAll('img.apple-emoji')].every((i) => i.complete && i.naturalWidth > 0));
  return () => page.evaluate(() => window.__undoEmoji?.());
}

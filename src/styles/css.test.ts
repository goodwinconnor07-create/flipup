/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Read from disk: Vitest turns CSS imports (even ?raw) into empty strings, which would pass every check.
const dir = new URL('.', import.meta.url);
const sheets = Object.fromEntries(
  readdirSync(dir)
    .filter((f) => f.endsWith('.css'))
    .map((f) => [f, readFileSync(new URL(f, dir), 'utf8')]),
);

// One unclosed brace in a stylesheet swallows every rule after it once the files are joined into the built app.
describe('stylesheets', () => {
  for (const [file, css] of Object.entries(sheets)) {
    it(`${file} opens and closes every block and comment`, () => {
      expect(css.length).toBeGreaterThan(100);
      expect(css.split('/*').length).toBe(css.split('*/').length);
      const bare = css.replace(/\/\*[\s\S]*?\*\//g, '');
      let depth = 0;
      for (const ch of bare) {
        depth += ch === '{' ? 1 : ch === '}' ? -1 : 0;
        expect(depth).toBeGreaterThanOrEqual(0);
      }
      expect(depth).toBe(0);
    });
  }
});

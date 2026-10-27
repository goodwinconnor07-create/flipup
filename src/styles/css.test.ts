import { describe, expect, it } from 'vitest';

const sheets = import.meta.glob('./*.css', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

// One unclosed brace in a stylesheet swallows every rule after it once the files are joined into the built app.
describe('stylesheets', () => {
  for (const [file, css] of Object.entries(sheets)) {
    it(`${file} opens and closes every block and comment`, () => {
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

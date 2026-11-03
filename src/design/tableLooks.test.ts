/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cleanLook, RAILS } from './tableLooks';

// (Read from disk: Vitest turns CSS imports into empty strings.)
const css = readFileSync(new URL('../styles/table.css', import.meta.url), 'utf8');

describe('table looks', () => {
  it("each rail's colours match table.css", () => {
    for (const r of RAILS) {
      const sel = r.id === 'dark' ? '.table-oval {' : `.rail-${r.id} {`;
      const body = css.slice(css.indexOf(sel), css.indexOf('\n}', css.indexOf(sel)));
      expect(/--rail-a:\s*([^;]+);/.exec(body)![1], r.id).toBe(r.colors[0]);
      expect(/--rail-b:\s*([^;]+);/.exec(body)![1], r.id).toBe(r.colors[1]);
    }
  });

  it('falls back to the default for a broken look', () => {
    expect(cleanLook({ felt: 'red', rail: 'gold' as never })).toEqual({ felt: '#1f7a4d', rail: 'dark', logo: true });
  });

  it('keeps the FlipUp logo on unless it was turned off', () => {
    expect(cleanLook({ logo: false }).logo).toBe(false);
    expect(cleanLook(null).logo).toBe(true);
  });
});

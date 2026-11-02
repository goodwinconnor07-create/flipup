/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BUBBLE_STYLES } from '../game/bubbles';
import { CARD_PACKS } from '../game/cardPacks';
import { BUBBLE_LOOKS, CARD_BACKS } from './premiumLooks';

// The web paints these from global.css tokens in premium.css. Every solid colour the app uses has to be one of them.
// (Read from disk: Vitest turns CSS imports into empty strings.)
const css = readFileSync(new URL('../styles/global.css', import.meta.url), 'utf8');
const root = css.slice(css.indexOf(':root {'), css.indexOf('\n}', css.indexOf(':root {')));
const tokens = new Set([...root.matchAll(/--[\w-]+:\s*(#[0-9a-f]{3,8});/gi)].map((m) => m[1].toLowerCase()));
const premium = readFileSync(new URL('../styles/premium.css', import.meta.url), 'utf8');

describe('Premium looks', () => {
  it('has a back for every card pack and a look for every bubble colour', () => {
    for (const p of CARD_PACKS) expect(CARD_BACKS[p.id], p.id).toBeDefined();
    for (const b of BUBBLE_STYLES) expect(BUBBLE_LOOKS[b.id], b.id).toBeDefined();
  });

  it('uses only the tokens global.css has', () => {
    for (const [id, look] of Object.entries(CARD_BACKS)) if (id !== 'plain') for (const c of look.base) expect(tokens.has(c), `${id} ${c}`).toBe(true);
    for (const [id, look] of Object.entries(BUBBLE_LOOKS)) for (const c of look.fill) expect(tokens.has(c), `${id} ${c}`).toBe(true);
  });

  it("keeps each pack's glow and pattern colour from premium.css", () => {
    for (const p of CARD_PACKS.filter((x) => !x.venue)) {
      const start = premium.indexOf(`.pack-${p.id} {`);
      const body = premium.slice(start, premium.indexOf('\n}', start));
      const glow = /--pk-glow:\s*([^;]+);/.exec(body)![1];
      if (!glow.startsWith('var(')) expect(CARD_BACKS[p.id].glow, p.id).toBe(glow);
      expect(body.includes(CARD_BACKS[p.id].ink), `${p.id} pattern`).toBe(true);
    }
  });
});

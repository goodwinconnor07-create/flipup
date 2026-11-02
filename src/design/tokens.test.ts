/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { gradients, palette, party, radius, shadows, type } from './tokens';

// The web keeps its tokens as CSS custom properties in global.css. These checks keep them and tokens.ts the same.
// (Read from disk: Vitest turns CSS imports into empty strings.)
const css = readFileSync(new URL('../styles/global.css', import.meta.url), 'utf8');

/** The custom properties in the first block that starts with `selector {`. */
function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`no ${selector} block`);
  const body = css.slice(start, css.indexOf('\n}', start));
  const vars: Record<string, string> = {};
  for (const m of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim().toLowerCase();
  return vars;
}

const root = block(':root');
const dark = { ...root, ...block("html[data-theme='dark']") };

const PALETTE_VARS = {
  background: 'bg',
  cell: 'bg-2',
  cellPressed: 'bg-3',
  separator: 'line',
  label: 'ink',
  secondaryLabel: 'ink-2',
  tertiaryLabel: 'ink-3',
  quaternaryLabel: 'ink-4',
  accent: 'blue',
  onColor: 'on-color',
  green: 'green',
  red: 'red',
  gold: 'gold',
  pink: 'pink',
  violet: 'violet',
  indigo: 'indigo',
  slate: 'slate-hi',
  switchOn: 'switch-on',
  scrim: 'scrim',
} as const satisfies Record<keyof (typeof palette)['light'], string>;

describe('design tokens match global.css', () => {
  it('light palette', () => {
    for (const [key, v] of Object.entries(PALETTE_VARS)) expect(palette.light[key as keyof typeof PALETTE_VARS], key).toBe(root[v]);
  });

  it('dark palette', () => {
    for (const [key, v] of Object.entries(PALETTE_VARS)) expect(palette.dark[key as keyof typeof PALETTE_VARS], key).toBe(dark[v]);
  });

  it('party colours and the play-tile gradients', () => {
    for (const c of ['pink', 'orange', 'yellow', 'blue', 'green', 'edge'] as const) expect(party[c], c).toBe(root[`party-${c}`]);
    expect(gradients.blue).toEqual([root['party-blue'], root['blue-lo']]);
    expect(gradients.green).toEqual([root['party-green'], root.green]);
  });

  it('radii', () => {
    for (const r of ['xs', 'sm', 'md', 'lg', 'xl'] as const) expect(`${radius[r]}px`, r).toBe(root[`r-${r}`]);
    expect(`${radius.full}px`).toBe(root['r-pill']);
  });

  it('shadows', () => {
    for (const [mode, vars] of [['light', root], ['dark', dark]] as const) {
      expect(shadows[mode].sm, mode).toBe(vars['shadow-sm']);
      expect(shadows[mode].soft, mode).toBe(vars['shadow-soft']);
      expect(shadows[mode].raised, mode).toBe(vars.shadow);
    }
  });

  it('the type sizes the web uses', () => {
    expect(`${type.body.size}px`).toBe(root['fs-body']);
    expect(`${type.subhead.size}px`).toBe(root['fs-small']);
    expect(`${type.footnote.size}px`).toBe(root['fs-caption']);
    expect(`${type.title2.size}px`).toBe(root['fs-h3']);
    expect(`${type.title1.size}px`).toBe(root['fs-h1']);
    expect(`${type.largeTitle.size}px`).toBe(root['fs-display-1']);
  });
});

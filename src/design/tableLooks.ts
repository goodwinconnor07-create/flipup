// The player's own table for Texas Hold'em: a felt colour and a rail. Shared by the web (the Table theme sheet,
// `--felt` and `.rail-<id>` in table.css) and the iPhone app. tableLooks.test.ts checks the rails against table.css.

export type Rail = 'dark' | 'wood' | 'light';

export const FELTS: { name: string; felt: string }[] = [
  { name: 'Classic', felt: '#1f7a4d' },
  { name: 'Teal', felt: '#0f766e' },
  { name: 'Midnight', felt: '#1d3a8a' },
  { name: 'Violet', felt: '#5b3aa6' },
  { name: 'Burgundy', felt: '#8b1e3f' },
  { name: 'Sunset', felt: '#c2410c' },
  { name: 'Slate', felt: '#3b4252' },
  { name: 'Rose', felt: '#be4f7a' },
];

/** Each rail's gradient, top colour to bottom. */
export const RAILS: { id: Rail; name: string; colors: readonly [string, string] }[] = [
  { id: 'dark', name: 'Dark', colors: ['#4a4a55', '#1b1b22'] },
  { id: 'wood', name: 'Wood', colors: ['#a8693a', '#54301a'] },
  { id: 'light', name: 'Light', colors: ['#ffffff', '#d9d9e3'] },
];

export interface TableLook {
  /** Felt colour, "#rrggbb". */
  felt: string;
  rail: Rail;
}

export const DEFAULT_LOOK: TableLook = { felt: FELTS[0].felt, rail: 'dark' };

/** A stored look, checked: anything broken falls back to the default. */
export function cleanLook(l: Partial<TableLook> | null | undefined): TableLook {
  return {
    felt: typeof l?.felt === 'string' && /^#[0-9a-f]{6}$/i.test(l.felt) ? l.felt : DEFAULT_LOOK.felt,
    rail: l?.rail === 'wood' || l?.rail === 'light' || l?.rail === 'dark' ? l.rail : DEFAULT_LOOK.rail,
  };
}

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { ICON_ART, ICON_COLORS, iconArtSvg } from '../src/components/launch-mark';

// The launch cover draws ICON_ART; the icon on the Home Screen must be the same art, written by scripts/makeAppIcon.mjs.
const root = new URL('../../', import.meta.url);
const hex = (c: string) => '#' + c.replace('srgb:', '').split(',').slice(0, 3).map((v) => Math.round(Number(v) * 255).toString(16).padStart(2, '0')).join('');

describe('the launch cover is the app icon', () => {
  it('draws the same art as the icon layer', () => {
    const svg = readFileSync(new URL('native/assets/expo.icon/Assets/card.svg', root), 'utf8');
    expect(svg).toContain(iconArtSvg());
    for (const p of ICON_ART) expect(svg).toContain(`d="${p.d}"`);
  });
  it('uses the same field, by day and at night', () => {
    const json = JSON.parse(readFileSync(new URL('native/assets/expo.icon/icon.json', root), 'utf8'));
    const look = (dark: boolean) =>
      json['fill-specializations'].find((f: { appearance?: string }) => (f.appearance === 'dark') === dark).value['linear-gradient'] as string[];
    expect(look(false).map(hex)).toEqual([ICON_COLORS.field, ICON_COLORS.field]);
    expect(look(true).map(hex)).toEqual([ICON_COLORS.fieldDark, ICON_COLORS.fieldDark]);
    expect(json.groups[0].layers[0]['image-name']).toBe('card.svg');
  });
  it('keeps the layer to plain filled paths, which Icon Composer can read', () => {
    const svg = readFileSync(new URL('native/assets/expo.icon/Assets/card.svg', root), 'utf8');
    expect(svg).not.toMatch(/stroke|mask|filter|clip-path|<g/);
  });
});

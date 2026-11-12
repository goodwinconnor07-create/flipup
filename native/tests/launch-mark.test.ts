import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { ICON_COLORS, ICON_COLORS_DARK, MARK, PLACE } from '../src/components/launch-mark';

// The launch cover must show exactly the app icon: same spade, same place on the canvas, same colours.
const root = new URL('../../', import.meta.url);
describe('the launch cover is the app icon', () => {
  it('draws the same spade at the same place as the icon layer', () => {
    const svg = readFileSync(new URL('native/assets/expo.icon/Assets/spade.svg', root), 'utf8');
    expect(svg).toContain(`d="${MARK}"`);
    expect(svg).toContain(`transform="${PLACE}"`);
  });
  it("uses the icon's dark look at night", () => {
    const json = JSON.parse(readFileSync(new URL('native/assets/expo.icon/icon.json', root), 'utf8'));
    const dark = json['fill-specializations'].find((f: { appearance?: string }) => f.appearance === 'dark').value['linear-gradient'] as string[];
    const hex = (c: string) => '#' + c.replace('srgb:', '').split(',').slice(0, 3).map((v) => Math.round(Number(v) * 255).toString(16).padStart(2, '0')).join('');
    expect(hex(dark[0])).toBe(ICON_COLORS_DARK.violetTop);
    expect(hex(dark[1])).toBe(ICON_COLORS_DARK.violetBottom);
    const script = readFileSync(new URL('scripts/makeAppIcon.mjs', root), 'utf8').toLowerCase();
    expect(script).toContain(ICON_COLORS_DARK.light);
  });
  it("uses the icon script's colours", () => {
    const script = readFileSync(new URL('scripts/makeAppIcon.mjs', root), 'utf8');
    for (const hex of Object.values(ICON_COLORS)) expect(script.toLowerCase()).toContain(hex);
    expect(script).toContain('translate(512 500) scale(5.15)');
  });
});

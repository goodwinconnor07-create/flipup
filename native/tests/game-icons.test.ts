import { existsSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

import { CHALLENGES } from '../../src/game/challenges';
import { VARIANTS } from '../../src/game/variants';
import { ICON_COLOURS } from '../../src/design/gameIcons';

// Every game and solo card has an icon (scripts/drawGameIcons.mjs), its picture in the app
// (scripts/renderGameIcons.mjs) and an entry in game-icon.tsx, which Metro needs written out by hand.
const ids = [...VARIANTS.map((v) => v.id), ...CHALLENGES.map((c) => c.id), 'ranges'];
const component = readFileSync(new URL('../src/components/game-icon.tsx', import.meta.url).pathname, 'utf8');

it.each(ids)('%s has an icon, its colours and its picture', (id) => {
  expect(ICON_COLOURS).toHaveProperty(id);
  expect(existsSync(new URL(`../../src/design/icons/${id}.svg`, import.meta.url).pathname)).toBe(true);
  expect(existsSync(new URL(`../assets/game-icons/${id}.webp`, import.meta.url).pathname)).toBe(true);
  expect(component).toContain(`${id}: require('../../assets/game-icons/${id}.webp')`);
});

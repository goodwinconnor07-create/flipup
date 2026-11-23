import { describe, expect, it } from 'vitest';

import { VARIANTS } from '../game/variants';
import { gameSubject } from './gameArt';
import { gameBanner } from './gameBanner';

// The lobby's game card. The art is checked by eye; these hold what would break it quietly.
describe('the game banners', () => {
  for (const { id } of VARIANTS) {
    describe(id, () => {
      const banner = gameBanner(id);
      it('keeps the subject recognisable: most of its shapes are drawn, none twice', () => {
        const subject = gameSubject(id);
        const drawn = banner.layers.flatMap((l) => l.shapes).filter((s) => subject.some((t) => JSON.stringify(t) === JSON.stringify(s)));
        expect(new Set(drawn.map((s) => JSON.stringify(s))).size).toBe(drawn.length);
        // Waves and clock hands are redrawn wider or split for the banner; everything else is the game's own.
        expect(drawn.length).toBeGreaterThanOrEqual(subject.length - 3);
      });
      it('draws every layer in a real box', () => {
        for (const l of banner.layers) if (l.box) expect(l.box[2] > 0 && l.box[3] > 0).toBe(true);
      });
    });
  }
});

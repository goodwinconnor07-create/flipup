import { describe, expect, it } from 'vitest';

import { VARIANTS } from '../game/variants';
import { gameSubject } from './gameArt';
import { bannerParticles, gameBanner } from './gameBanner';

// The lobby's living game card. The art is checked by eye; these hold what would break it quietly.
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
      it('moves on sensible clocks, never faster than a second a loop', () => {
        for (const l of banner.layers) {
          if (!l.move) continue;
          expect(l.move.period).toBeGreaterThanOrEqual(1);
          if (l.box) expect(l.box[2] > 0 && l.box[3] > 0).toBe(true);
        }
        expect(banner.layers.some((l) => l.move)).toBe(true);
      });
      it('places the same particles every time, spread across the card', () => {
        const a = bannerParticles(id);
        expect(a).toEqual(bannerParticles(id));
        expect(a.length).toBe(banner.particles.count);
        for (const p of a) {
          expect(p.x).toBeGreaterThan(0);
          expect(p.x).toBeLessThan(1);
          expect(p.period).toBeGreaterThan(1);
          expect(p.opacity).toBeGreaterThan(0);
          expect(p.opacity).toBeLessThanOrEqual(1);
        }
        const left = a.filter((p) => p.x < 0.5).length;
        expect(left).toBeGreaterThan(0);
        expect(left).toBeLessThan(a.length);
      });
    });
  }
});

import { describe, expect, it } from 'vitest';

import { VARIANTS } from '../src/engine';
import { basicsOf } from '../src/data/game-basics';

// The first-time rules card (components/rules-card.tsx) has to be read in five seconds at an online table.
describe('game basics', () => {
  it('gives every mini game three short lines', () => {
    for (const v of VARIANTS) {
      const lines = basicsOf(v.id);
      if (v.id === 'holdem') {
        expect(lines).toEqual([]);
        continue;
      }
      expect(lines.length, v.id).toBe(3);
      for (const line of lines) expect(line.length, `${v.id}: ${line}`).toBeLessThanOrEqual(60);
    }
  });
});

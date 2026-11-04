import { writeFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';

import { replay } from '@train/ranges/model';

// Range training's numbers are worked out ahead (src/data/range-numbers.json), because the phone's JavaScript engine
// takes seconds over a multiway hand. This checks the file still matches the shared model for every hand.
// After changing a hand in src/train/ranges, run `UPDATE_RANGES=1 npm test` (in native/) to write it again.
vi.mock('expo-sqlite/localStorage/install', () => ({}));

it('has every hand’s numbers, matching the model', async () => {
  const { computeNumbers, SCENARIOS } = await import('../src/state/ranges');
  const fresh = Object.fromEntries(SCENARIOS.map((s) => [s.id, computeNumbers(s, replay(s))]));
  if (process.env.UPDATE_RANGES) writeFileSync(new URL('../src/data/range-numbers.json', import.meta.url).pathname, JSON.stringify(fresh) + '\n');
  else expect((await import('../src/data/range-numbers.json')).default).toEqual(fresh);
}, 120_000);

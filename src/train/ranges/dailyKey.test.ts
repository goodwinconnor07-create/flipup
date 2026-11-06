// The answer key the Worker scores Today's three with (worker/index.ts, `scoreDaily()`): every hand's id in the app's
// order (written, then generated) with its best play and the plays that are also fine. It's small, so the server
// never loads the hands themselves. `UPDATE_RANGES=1 npx vitest run src/train/ranges/dailyKey.test.ts` writes it again.
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { SCENARIOS, unpack } from './scenarios';
import type { Scenario } from './model';

const FILE = new URL('./dailyKey.json', import.meta.url);

describe('the daily answer key', () => {
  it('matches every hand', () => {
    const all = [...SCENARIOS, ...unpack(JSON.parse(readFileSync(new URL('./generated.json', import.meta.url), 'utf8')) as Scenario[])];
    const key = all.map((s) => [s.id, s.best, ...(s.alsoOk ?? [])]);
    if (process.env.UPDATE_RANGES) writeFileSync(FILE, JSON.stringify(key));
    expect(JSON.parse(readFileSync(FILE, 'utf8'))).toEqual(key);
  });
});

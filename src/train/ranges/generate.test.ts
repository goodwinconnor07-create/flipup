// Rebuilds generated.json with GEN_RANGES=1. The hands themselves are checked in
// ranges.test.ts like the hand-written ones.
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { generateScenarios } from './generate';
import { pack } from './scenarios';

describe.skipIf(!process.env.GEN_RANGES)('generating range hands', () => {
  it('writes generated.json', () => {
    const t = Date.now();
    const all = generateScenarios(Number(process.env.GEN_ROUNDS ?? 3));
    console.log(`${all.length} hands in ${((Date.now() - t) / 1000).toFixed(0)}s`);
    writeFileSync(new URL('./generated.json', import.meta.url), JSON.stringify(pack(all)) + '\n');
    expect(all.length).toBeGreaterThan(0);
  }, 3_600_000);
});

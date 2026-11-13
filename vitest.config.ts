import { defineConfig } from 'vitest/config';

/**
 * The files that play whole bot tables or run calibration sims: each takes 4s to 2 minutes of one CPU (the production
 * Hold'em bots think hard: range sampling in `src/bot_engine`). Run side by side with everything else on CI's 4-core
 * runner they starved each other, and tests near their limits (the chip-accounting table in engine.test.ts at 20s,
 * twin.test.ts at 30s) timed out at random, on main and on pull requests (12 November 2026). So they run as their own
 * group after the quick tests, three at a time, each with a core to itself. A new file that plays many hands goes here.
 */
const SIMS = [
  'src/game/chat.test.ts',
  'src/game/variants.test.ts',
  'src/game/bots.test.ts',
  'src/game/crafts.test.ts',
  'src/game/engine.test.ts',
  'src/game/redactLeaks.test.ts',
  'src/game/fuzzActions.test.ts',
  'src/game/challenges.test.ts',
  'src/research/research.test.ts',
  'src/bot_engine/everyday.test.ts',
  'src/bot_engine/feel.test.ts',
  'src/game/variantFeel.test.ts',
  'src/bot_engine/personalities.test.ts',
  'src/bot_engine/learning.test.ts',
  'src/bot_engine/preflop.test.ts',
  'src/bot_engine/system.test.ts',
  'src/bot_engine/evaluation.test.ts',
  'src/bot_engine/calibration.test.ts',
];

// Unit tests cover the pure game engine, so they don't need the Cloudflare plugin from vite.config.ts.
export default defineConfig({
  test: {
    environment: 'node',
    // Several tests play whole bot tables or run calibration sims. They pass in a few seconds on a quick machine and take over
    // the 5s default on a slow CI runner (CI was red on main for exactly these). A timeout never changes what a test asserts.
    testTimeout: 30_000,
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['src/**/*.test.ts', 'worker/**/*.test.ts'], exclude: SIMS, sequence: { groupOrder: 0 } },
      },
      {
        extends: true,
        test: { name: 'sims', include: SIMS, sequence: { groupOrder: 1 }, maxWorkers: 3 },
      },
    ],
  },
});

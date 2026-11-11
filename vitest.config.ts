import { defineConfig } from 'vitest/config';

// Unit tests cover the pure game engine, so they don't need the Cloudflare plugin from vite.config.ts.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'worker/**/*.test.ts'],
    environment: 'node',
    // Several tests play whole bot tables or run calibration sims. They pass in a few seconds on a quick machine and take over
    // the 5s default on a slow CI runner (CI was red on main for exactly these). A timeout never changes what a test asserts.
    testTimeout: 30_000,
  },
});

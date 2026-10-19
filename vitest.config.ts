import { defineConfig } from 'vitest/config';

// Unit tests cover the pure game engine, so they don't need the Cloudflare plugin from vite.config.ts.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});

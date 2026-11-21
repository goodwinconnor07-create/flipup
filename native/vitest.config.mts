import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@game': fileURLToPath(new URL('../src/game', import.meta.url)),
      '@design': fileURLToPath(new URL('../src/design', import.meta.url)),
      '@train': fileURLToPath(new URL('../src/train', import.meta.url)),
    },
  },
  // 30s a test, as the engine's tests: the ones that play real hands in every game (share-layout) ran past the
  // default 5s on a busy CI runner beside the worklet compile check.
  test: { include: ['native/tests/**/*.test.ts'], environment: 'node', testTimeout: 30_000 },
});

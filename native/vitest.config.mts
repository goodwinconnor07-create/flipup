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
  test: { include: ['native/tests/**/*.test.ts'], environment: 'node' },
});

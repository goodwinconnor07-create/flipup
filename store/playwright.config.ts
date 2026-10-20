import { defineConfig } from '@playwright/test';

const PORT = 5174;

// App Store art. `capture.spec.ts` plays the real app at the 6.9" iPhone size (430×932 at 3x = 1290×2796)
// and saves each screen to store/screens; `render.spec.ts` then draws the icon and the cards from those
// screens into store/out. Run with `npm run store`.
export default defineConfig({
  testDir: '.',
  timeout: 180_000,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    browserName: 'chromium',
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    cwd: '..',
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

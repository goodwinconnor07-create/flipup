import { defineConfig } from '@playwright/test';

const PORT = 5174;
/** Set BASE_URL to test a running server instead (e.g. `npm run preview` or the live site). */
const external = process.env.BASE_URL;

// End-to-end tests run against the Vite dev server, which also runs the Worker
// and Durable Object locally, so online tables are tested without a Cloudflare account.
const baseURL = external ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL,
    browserName: (process.env.BROWSER as 'webkit') ?? 'chromium',
    // SMALL=1 checks a small phone (360×740) instead of a typical one.
    viewport: process.env.SMALL ? { width: 360, height: 740 } : { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    // REDUCED=1 runs with Reduce Motion on.
    contextOptions: { reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference' },
    trace: 'retain-on-failure',
  },
  webServer: external
    ? undefined
    : {
        command: `npx vite --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}/api/health`,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});

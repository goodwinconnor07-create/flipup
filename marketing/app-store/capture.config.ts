// Captures the app screens used on the App Store cards on an iPhone Pro Max-sized screen at 3×.
// The height leaves out the 54pt status bar (932 − 54), which cards.html draws back in.
// Run: npm run store:capture
import { fileURLToPath } from 'node:url';
import base from '../../playwright.config';

const root = fileURLToPath(new URL('../..', import.meta.url));

export default {
  ...base,
  testDir: '.',
  testMatch: 'capture.spec.ts',
  timeout: 240_000,
  use: { ...base.use, viewport: { width: 430, height: 878 }, deviceScaleFactor: 3 },
  // The dev server runs from the repo root, not this folder.
  webServer: base.webServer && { ...base.webServer, cwd: root },
};

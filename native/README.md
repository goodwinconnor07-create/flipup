# FlipUp for iPhone and iPad

The native app: Expo (SDK 58), Expo Router, TypeScript. It's a new client for the same Cloudflare Worker as the web
app, and it uses the same poker engine (`../src/game`, imported as `@game/*` through `src/engine`). Never copy the
engine in here.

- `appInfo.ts`: every name, id and link (bundle ID, EAS project ID, Premium product ID, API origin, privacy and
  support URLs, support email). `app.config.ts` reads it.
- `npm start`: the dev server (scan the QR code with Expo Go or a development build).
- `npm run typecheck`, `npm run lint`, `npm run doctor`.
- Builds and App Store uploads run in GitHub Actions (`.github/workflows/ios-build.yml`), started by hand.
- App Store rules and the launch checklist: `../docs/APP_STORE.md`.

## Regression checks

Install the root project's dependencies as well as this app's dependencies. From the repository root, run
`npm run test:native` for purchase-event, connection-retry, identity-reset and stale-entitlement regression tests.
`npm run check` still runs the shared engine/Worker checks. From `native`, run `npm run typecheck` and `npm run lint`.

For the native client's small-screen and motion checks, start the local Worker with `npm run dev` at the repository
root. In another terminal, from `native`, start:

```sh
EXPO_PUBLIC_RECORDER=1 EXPO_PUBLIC_API_ORIGIN=http://localhost:5173 npm run web -- --port 8083
```

Then, from the repository root:

```sh
node native/scripts/verify-table.cjs
```

The browser script requires the root Playwright dependency and Chromium (`CHROMIUM_PATH` overrides its executable).
`NATIVE_BASE_URL` overrides the Expo URL; `SHOTS_DIR` overrides `/tmp/flipup-native-regressions` for screenshots.
It uses local Premium fixtures to reach every variant, not App Store purchases. Keep recorder builds for development
only. These checks complement an actual iPhone run for safe areas, VoiceOver, native gestures and StoreKit sandbox.

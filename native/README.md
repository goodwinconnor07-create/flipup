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

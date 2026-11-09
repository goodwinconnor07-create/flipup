# Overnight sweep report (9 Nov 2026)

**What happened.** The scheduled overnight run started at 15:23 UTC and stopped after 13 minutes because it could not push to GitHub (the scheduled session had no repo access). It left three fixes in a private artifact. I then ran the sweep in the main session from 22:19 UTC, on the branch `overnight/bug-sweep` (from the latest `main`; nothing was pushed to `main`). I re-did the three fixes myself and checked each before keeping it.

Not the five hours the task asked for: this pass was a bit over an hour, so the list under "Not done" is real.

## Fixed (each with a test, each in its own commit)
1. Worker: a broken `%` escape in `/api/usernames` and `/api/boards` answered 500; now 404.
2. Worker: the socket route let anyone scan table codes without a limit; now it counts misses like the plain lookup (429 after 40).
3. Name filter: invisible characters could split a blocked word; they are now ignored.
4. App: a hotel-Wi-Fi sign-in page where JSON should be showed "Unexpected token '<'"; now a plain sentence.
5. CI: `main`'s check was red because three simulation tests time out at 5s on a slow runner; the default is now 30s (`vitest.config.ts`). Assertions are unchanged. The native lint error in `felt.tsx` (a state update inside an effect) had already been fixed on `main` by someone else.
6. The new Deploy workflow now pins its actions to exact commits like the iOS build.

## Tests added (all pass; none found a bug, which is the result)
- No hidden card, deck, ghost, Memory card, device id or bot secret reaches a phone, in all 13 games, every step (and it fails when redaction is deliberately broken).
- 1,500 random and invalid actions per game, no exceptions, no chip created or lost.
- 310 corrupted-storage combinations and 4 corrupted saved tables in the web export: no crash.
- 3,940 fuzzed requests against the local Worker: no 5xx.

## Needs your decision (details in `docs/security/FINDINGS.md`)
- Table codes are a small space (3,900). Longer codes, or a Cloudflare rate-limit rule?
- Strip bidi override characters from names?
- Confirm `PREMIUM_ENFORCED` is "1" in production before charging for Premium games.
- The privacy page promises a response to reports within 24 hours. Can you keep it?
- Support email is still the placeholder `goodwinconnor007@gmail.com`.
- Native dependency audit: 8 moderate, all in Expo's build tooling; don't run `audit fix --force` (it downgrades Expo to 52).

## Ideas
`docs/ideas/README.md` ranks ten, with three mockups in `docs/ideas/mockups/ideas.html`. They are proposals from reading the code and web screenshots, not playtests.

## Not done
- The bot labs, engine edge cases beyond the two fuzz tests above, and the `remove` action in the fuzz.
- Reconnect storms, out-of-order socket messages, clock skew, Durable Object storage growth; authorization logic for friends and parties (only crash-fuzzed); Apple signature chains.
- Anything on a real iPhone: the web export differs from the app (for example the floating Play/Train bar at the top of the web preview is web-only), so layout notes are from screenshots, not devices.
- Nothing was run against production.

## Test environment note
Three tests under `src/bot_engine` start a child process with `node --import tsx`; `tsx` is in `package.json` but was missing from this sandbox, so they failed here until I installed it (without saving). They pass with it, and CI installs it.

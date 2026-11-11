# Security and break-it findings (9 Nov 2026)

Everything was tested against a local copy of the Worker (`wrangler dev` on 127.0.0.1) or in unit tests. Nothing touched production or any third party, and no real user data was used. Scripts: `scripts/security/`.

A scheduled overnight run did the first part of this (three fixes) and was stopped by a push permission problem after 13 minutes. I re-checked each of its three findings myself before keeping them: the name-filter bypass failed its test before the fix, the two bad-escape routes returned 500 before the fix and 404 after, and the socket scan returned 404 for every probe before and 429 after 40.

## Fixed

| # | Severity | Finding | Fix | Test |
|---|----------|---------|-----|------|
| 1 | low | `GET /api/usernames/%E0%A4%A` and `/api/boards/%zz` threw `URIError` and answered 500 | `worker/safeDecode.ts`, both routes now 404 | `worker/safeDecode.test.ts`; checked live |
| 2 | medium | Scanning table codes through the socket route (`/api/tables/CODE/ws`) was not rate limited, unlike `GET /api/tables/CODE`. Generated codes are 39 words × 100 numbers = 3,900 values | A socket 404 now counts as a miss; 429 after 40 | `scripts/security/probe-ws-scan.sh` (39 × 404 then 429) |
| 3 | low | Zero-width, soft-hyphen and bidi characters split a blocked word (`a​ss`) and got past the name filter | Those characters are removed before matching in `letters()` | `names.test.ts` (failed before the fix) |
| 4 | low | A web page where JSON should be (hotel or airport Wi-Fi sign-in) showed the user "Unexpected token '<'… is not valid JSON" | `answerJson()` in the app's `state/api.ts` | `native/tests/api-errors.test.ts` (failed before the fix) |
| 5 | medium (once Premium is enforced) | A free host could open a Hold'em table, then change its mode to a Premium one inside the room (`settings` with `variant`). Premium was checked only when a table or party was opened, not when its mode changed. Reproduced locally with `--var PREMIUM_ENFORCED:1`: the table became Imposter | `actionNeedsPremium()` in `src/game/premiumGate.ts`, enforced in `worker/room.ts` for `settings` and for the new `playAgain` mode | `src/game/playAgainMode.test.ts`; end to end against the local server, refused with the gate and allowed without it |

## New regression tests (they found nothing, which is the point)

- `src/game/redactLeaks.test.ts`: in all 13 game modes, after every step of 12 hands, the host's redacted view contains no other seat's hidden card, no deck, no ghost cards before a showdown, no Memory cards before the hand ends, no other phone's device id, no bot internals (`style`, `twin`, `reads`, `minds`...), and the hand log holds only its own and shown cards. I broke `redact.ts` on purpose and all 13 failed, then restored it.
- `src/game/fuzzActions.test.ts`: in all 13 modes, 700 random and invalid actions each (wrong types, NaN, 1e308, `__proto__`, other players' ids, cards not in the hand), through `parseAction` and `applyAction` from three different devices. No exception, no chip created or lost. `remove` is left out because a removal during a hand is deferred to the hand's end, so it needs its own accounting.
- `scripts/security/fuzz-routes.mjs`: 3,940 requests across every `/api` route and method with bad bodies and header tricks. No 5xx and no non-JSON answer. (With a 2 MB body the local dev server drops the connection; the Worker itself refuses anything over 16 KB from the `content-length`, so I count that as a local-runtime artifact, not an app bug.)

## Recommended, not changed (owner's call)

- **Small code space.** 3,900 generated table codes, and anyone with a code can sit at a table, even one that has started (by design in `docs/RULES.md`). The miss limiter lives in one Worker instance's memory, so it is best effort and resets on deploy. A Cloudflare rate-limit rule or longer codes is the real fix.
- **Bidi override characters in names** are still stored and shown (only matching ignores them). Removing them in `cleanName()` is one line, but it changes stored names.
- **`PREMIUM_ENFORCED` is "0" in `wrangler.jsonc`**, so Premium is not enforced on the server at all today. Set it to "1" before charging for Premium games, otherwise anyone can host them free. (Fix 5 above closes the in-room path for when you do.)
- **The privacy page promises a response to reports within 24 hours.** Make sure that is something you can keep.
- **Support email** on the privacy and support pages is still `goodwinconnor007@gmail.com`, which `appInfo.ts` flags as a placeholder.
- **Native dependency audit:** 8 moderate findings, all in Expo's own build tooling (`glob`, `minimatch`). They run on the build machine and don't ship in the app. The suggested `npm audit fix --force` downgrades Expo to 52, so don't. The web and Worker dependencies have 0 findings.

## Checked, no problem found

- Malformed JSON on every POST route: 400, never 500. Oversized bodies: refused.
- A spectator socket can't start, end, remove or act; a guest acting out of turn is rejected; `tick` and `presence` from a client are refused.
- Path tricks (`/..%2f`, `/assets/../../package.json`) get the app page, not files. No CORS headers are sent; a cross-site Origin is refused on socket routes.
- Forged Apple purchase payloads are rejected.
- No secrets or private keys committed. No `pull_request_target` workflow. Every workflow that uses a secret is run by hand only. (`bot-training.yml` also runs on a daily schedule and uses no deploy secrets.)
- The privacy page's retention times (3 days, 2 days, 120 days, 180 days) match the constants in the code.

## Not done

Friends, party, blackjack and report routes were fuzzed for crashes only, not for authorization logic (using another phone's friend code, for example). Reconnect storms, out-of-order socket messages, clock skew, Durable Object storage growth, Apple JWS with real forged chains, and anything on a real iPhone or in production.

# Parked code

Features that are built but not part of the shipping iPhone app. Nothing here is imported by `native/`, and nothing in
`native/` switches it on or off: App Store Review sees only what is shown. To bring a feature back, move its files
to the same path under `native/` (`parked/native/src/x` -> `native/src/x`) and undo the wiring listed below.

## Global tab and Bankroll (parked November 2026)
Files: `(tabs)/(global)/`, `app/bankroll.tsx`, `app/bankroll-intro.tsx`, `app/country.tsx`, `app/ad.tsx` (the rebuy's
placeholder ad), `state/ads.ts`, `state/bankroll.ts`, `state/board-filler.ts`, `components/board-row.tsx`,
`components/global/*`, `components/table/bankroll-strip.tsx`, tests `board-filler` and `global-standing`.
Wiring removed from `native/`:
- `(tabs)/_layout.tsx`: the `(global)` trigger (trophy.fill, "Global").
- `_layout.tsx`: the `country`, `bankroll`, `bankroll-intro` and `ad` screens.
- `table.tsx`: `BankrollStrip` and `BankrollEnded`, and `code={game?.bankroll ? null : t.code}`.
- `state/session.ts`: `openBankrollTable()`, the `room: 'bankroll'` session field and `connect(code, room)`.
- `state/connection.ts`: the `room` constructor argument (`/api/bankroll/:code/ws` instead of `/api/tables/:code/ws`).
- `state/pals.ts` and `state/api.ts`: `COUNTRY_KEY` and the `country` sent with the friend card.
- `(play)/settings.tsx`: the "Show my country" row.
- `ranges.tsx`: `noteDailyPick()` after a Today's three answer.
- `appInfo.ts`: `privacyBoards` (the privacy text about public boards).
The Worker (`worker/bankroll.ts`, `worker/leaderboard.ts`) and the engine (`src/game/bankroll.ts`) are shared with
the web and stay where they are. Plan: `docs/BANKROLL.md`.

## Development-only screens and hooks
`(tabs)/(play)/design.tsx` (design catalogue, was linked from Home under `__DEV__`), `(tabs)/(play)/motion.tsx`,
`app/sample-sheet.tsx`, `components/ranges/teaser.tsx` and `components/play-tile.tsx` (unused).
`recorder.patch.md`: the `window.__flipupTable` hook `scripts/shootHowTo.mjs` needs.

# FlipUp: notes for Claude

Poker night on your phones: no-limit Texas Hold'em for play chips. A host opens a table and friends join on their own phones with a 5-letter code; bots fill empty seats. There's also a bots-only mode that runs entirely on one phone. Read `docs/RULES.md` before changing any poker rule.

## Commands

- `npm run dev`: app plus the Worker and Durable Object, all local (http://localhost:5173)
- `npm run typecheck`: `tsc -b` over app, worker and tooling projects
- `npm test`: Vitest unit tests for `src/game`
- `npm run e2e`: Playwright, phone-sized Chromium, starts its own dev server on 5174. In the cloud sandbox Chromium is at `/opt/pw-browsers` and `@playwright/test` is pinned to 1.56.1 to match it. `SHOTS_DIR=/some/dir` saves a screenshot of each screen.
- `npm run check`: typecheck + unit tests + build. Run it before committing.
- `npm run deploy`: build and `wrangler deploy` (needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the environment; never commit them).
- After editing `wrangler.jsonc`, run `npm run cf-typegen` and commit `worker-configuration.d.ts`.

## Layout

- `src/game/`: the pure TypeScript poker engine, shared by the app and the server. No DOM or Node APIs here.
  - `cards.ts`, `evaluate.ts` (hand ranking), `equity.ts` (odds and the bots' hand strength)
  - `holdem.ts`: dealing, blinds, betting rounds, side pots, showdown
  - `reducer.ts`: `applyAction()`, the only way a table changes. Server and phone run the same code.
  - `bots.ts`, `selectors.ts`, `validate.ts` (`parseAction()` for anything from the network), `redact.ts`
- Home (`src/screens/Home.tsx`, `HomeInsights.tsx`, `HomeTrain.tsx`, `src/styles/home.css`): a felt backdrop, a glass sheet and a floating tab bar (Play, Insights, Train; a left rail on desktop). Insights reads the per-table results in `flipup.stats.games` and the training stats.
- `src/state/store.ts`: the app store and every screen command. Bots-only tables run `applyAction()` locally with their own clock; online tables send actions to the server and show what it sends back.
- `src/ui/sound.ts` (synthesised table sounds, no files) and `src/ui/useTableSounds.ts` (plays them by watching how the game changes). `Count` in `components.tsx` is the counting-number animation for pot and stacks.
- Per-phone settings live in `src/state/persist.ts`: table felt/rail (`flipup.table`), mute, lifetime totals and the last online table for Home. Pre-actions (Check/Fold, Call any) are screen state in `Table.tsx`, never sent to the server until your turn.
- Desktop: `src/styles/desktop.css` is one media query (min-width 960px and min-height 600px, the same as `useDesktop` in `src/ui/useDesktop.ts`), so phones never see it. `installDesktopScale()` sets `--desk-zoom` from a 1440×900 baseline; the table is `zoom`ed by it. On desktop the table has a `.stage` (players round the oval, positions from `--ax`/`--ay` set in `Table.tsx`) and a side panel (`SidePanel.tsx`: standings and live hand log). On a phone `.stage` is `display: contents` and the row of four slides. Keep phone CSS outside that media query.
- Quick messages are `react` actions from the fixed list in `src/game/reactions.ts`; nothing typed is ever accepted.
- `worker/room.ts`: one `TableRoom` Durable Object per join code, the only true copy of an online table and its deck. Its alarm is the table's clock (bots, turn timers, run-outs, next deal) and also deletes tables idle for 3 days.

## Rules that matter

- Hidden information stays hidden. `redactForDevice()` strips the deck and every hole card that isn't yours or face up. Bots-only tables keep the deck on the phone but the screens still only get the redacted view.
- Win/tie odds show only during an all-in run-out, when every live hand is face up. Never while betting is still possible (product owner's call).
- Every timed thing goes through `game.wakeAt` and a `tick` action. `parseAction()` never accepts `tick` from a phone.
- Chips are never created or lost: the "keeps every chip accounted for" test plays bot hands and checks the total after every step. Keep it passing.
- When a poker rule is unclear, ask the product owner, then write the answer in `docs/RULES.md`.

## UI style

Same feel as the product owner's golf app (CardShot): white background, big bold system font (SF Pro on iPhone), large colourful buttons, minimal text, instant feedback (press scale, ripple, haptics, confetti, card flips) that never blocks play. Profile pictures are emojis (pick from the grid or type any). Respect `prefers-reduced-motion`. Plain writing: no buzzwords, contractions are fine.

Every colour, size, radius and shadow is a token in `:root` in `src/styles/global.css`. Colours needed from code live in `src/ui/theme.ts`. Don't hard-code new values; spacing is on a 4px grid.

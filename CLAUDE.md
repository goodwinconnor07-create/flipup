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
  - Bots: 40 of them (`botStyles.ts`), four each of ten hidden styles. `botPlay.ts` decides: preflop from GTO charts (`botCharts.json`, 2–6 players at 100/40/20bb; 7–9 handed fold into the 6-max chart) bent by style; postflop by hand bucket and board texture, from `botPostflop.json` (trained on turn and river spots with the engine) blended with hand-written defaults, plus a little adapting to each player's public tendencies (`game.reads`). `botTalk.ts` holds their fixed comment lines (ids `b:...`, never accepted from phones). `redactForDevice()` strips styles and reads. Rebuild the data with `gto/scripts/export_bot_charts.py` and `gto/scripts/train_bots.py` (its `--parity` output is `botPlay.parity.json`, which the unit test checks the TypeScript buckets against). `botSim.ts` plays bot-only tables for tuning.
- Home (`src/screens/Home.tsx`, `HomeInsights.tsx`, `HomeTrain.tsx`, `src/styles/home.css`): a large title, a streak and settings capsule up top, a banner card for the one next step (your open table, the online table you left, your last bots game, or a fresh start), grouped rows, a shelf of quick bot games (`HomeQuick.tsx`) and a floating tab bar (Play, Insights, Train; a left rail on desktop). The daily streak counts days with a hand played (`flipup.days`). Insights reads the per-table results in `flipup.stats.games` and the training stats.
- Bot challenges (`src/state/challenges.ts`, sheets in `SheetHost.tsx`, tiles in `HomeQuick.tsx`, scenes in `botScenes.ts`): one small heads-up game per bot (short stacks, a bluff quota, a comeback...) with a goal and up to three stars. Six show on Home each week. Not training, so no GTO service. Flavour text never says how a bot plays. Progress rides on the local `Session.challenge`; best stars per bot are in `flipup.challenges`.
- GTO Coach (`src/train/Coach.tsx`, wording in `src/train/coach.ts`): a 🧑‍💻 avatar named "GTO Coach" that gives all advice in speech bubbles (reviews, replay, drills, stats, the Train tab). New advice copy goes in `coach.ts`: short, plain, contractions, no jargon until "Show me the numbers". Grades read Good / Close call / Costly.
- Replay (`src/screens/train/Replay.tsx`, `src/train/replay.ts`): watch a saved hand back from its `HandRecord` (works for online tables too, since the record only holds the cards that phone could see). `buildFrames()` is pure; the screen has no action buttons and never shows hidden cards. Opens from Insights, the review list, a review and the table between hands.
- `src/gto/preflop.ts`: preflop drills dealt on the phone from `public/gto/preflop-6p-100bb.json` (a solved 6-handed, 100bb game). `getDrill()` in `src/gto/api.ts` tries it first for the six preflop scenarios and falls back to the coach service. Rebuild the file with `gto/scripts/export_preflop.py` (needs the built C++ engine, see `gto/README.md`); `preflop.reference.json` holds solver numbers the unit test checks the file against, so regenerate both together.
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

Apple-like: it should feel like Apple made a poker app. System font only (SF Pro on iPhone, the platform default elsewhere), regular weight for body text, semibold for headings and buttons, bold only for large titles. Light mode is white with `#f2f2f7` cells, dark mode is true black with `#1c1c1e` cells, and the accent is system blue. Cells are flat (a soft fill, no outline, no shadow). Glass (the blurred, see-through look) stays on what floats: the tab bar, capsules, sheets and toasts. Large titles on Home, grouped rows with a coloured icon square and a chevron, a banner card with its own action bar for the one main next step. Instant feedback (press scale, haptics, confetti, card flips) that never blocks play. Profile pictures are emojis (pick from the grid or type any). Respect `prefers-reduced-motion`. Plain writing: no buzzwords, contractions are fine.

Every colour, size, radius and shadow is a token in `:root` in `src/styles/global.css`. Colours needed from code live in `src/ui/theme.ts`. Don't hard-code new values; spacing is on a 4px grid.

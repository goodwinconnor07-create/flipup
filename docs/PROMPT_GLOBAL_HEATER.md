# Build prompt: Train and Global tabs, Join on Play, and Heater

Paste everything below the line into a fresh Claude Code session on this repo.

---

You're working on FlipUp, the iPhone app in `native/` (Expo SDK 58, Expo Router) and its Cloudflare Worker in `worker/`. Read `CLAUDE.md` in full before you start, then `docs/RULES.md`, `docs/CHALLENGES.md`, `docs/MOTION.md` and `docs/APP_STORE.md`. Every rule in `CLAUDE.md` applies: the palette (black, white, Apple's greys, violet for actions, gold for wins and highlights, red only for Fold and destructive actions, the one green for Raise), SF Symbols through `Icon` with a Material lookalike for the web build, `ThemedText` for every piece of text, `PressableScale` for press feedback, `LivingCard` for coloured cards, `SheetScroll` in every sheet, the shadow-outside/clip-inside rule, Reduce Motion, `.get()`/`.set()` on shared values, no `@expo/ui/swift-ui` outside `.ios.tsx` files, and plain writing with no buzzwords.

The goal: make FlipUp something people open every day. That means a new tab layout, a global leaderboard with monthly seasons, and one new monthly game, **Heater**, that people replay to beat their own score and each other's.

This is the iPhone app only. Don't build any of it for the web app in `src/screens`. Shared engine code in `src/game` is fine and expected, because the Worker needs it.

**Don't touch Premium.** Leave `purchase.ts`, `entitlement.ts`, `unlock.ts`, `premium.tsx`, the $9 price and everything it unlocks exactly as they are. No subscriptions in this work.

Work in the stages below, in order. After each one, run `npm run check` at the root and `npm run typecheck` plus `npm test` in `native/`, then commit. Update `CLAUDE.md` and the relevant docs as you go, so the next session knows where everything lives. Add a stage list to `docs/TODO.md` and tick each stage off.

## Stage 1: The new tab bar

The tabs become **Play, Train, Global, Friends**, in that order, in `(tabs)/_layout.tsx` (`NativeTabs`).

- **Play** keeps Home as it is, with two changes. Join moves here (see below), and the Range training card and `ChallengeRow` move to Train.
- **Train** is a new tab, `(tabs)/(train)/train.tsx`, built with `TabScreen` (the large rounded "Train" title, `ProfileMenu` on the right). It holds Range training at the top as a large card (the `RangeTeaser` hero, today's three squares, the flame), then the three challenges (Short Stack, Style Detective, Rewind) as cards with their pictures and your best, then Your tricks and Poker words as rows. The `range-training` and `challenge/[id]` sheets open from here as they do now. Use SF Symbol `brain.head.profile` (or `target` if it reads better) for the tab.
- **Global** is a new tab, `(tabs)/(global)/global.tsx` (Stage 3). Use `trophy.fill` for the tab.
- **Friends** stays as it is, with its badge.
- **Party moves onto Home.** The Party tab goes away. Put a Party card on Home under the start tiles (night violet `LivingCard`, "GAME NIGHT", "4 to 12 games. One winner.", Host and Join a party). Keep `party.tsx`'s poster with its drifting belts as a pushed screen that the card opens, so none of that work is lost. Your open party keeps showing in Home's banner. `party-setup` and `party-room` keep their routes.
- **The Join tab goes away**, and so does the iOS 26 search-role button.

### Join on Play

- Add a "Join with a code" button to Home's title row as a round glass button (`RoundButton`, SF Symbol `keyboard` or `qrcode.viewfinder`) next to `ProfileMenu`.
- It opens a `join` sheet with the same content as today's `(join)/join.tsx`: `CodePad` (the keyboard opens as the sheet opens), Scan a QR code, the table it found and Sit down. Move the code, don't copy it. Keep `codeFromScan()` and party codes working, so a party code or party QR still lands in the party.
- Home's Party card also offers Join a party, which opens `code-entry` as it does now.
- Every deep link and route that pointed at `(join)` or `(party)` must still work. Grep for them and redirect where needed. Check that the Join Universal Link (`/ABCDE`) and `/party/CODE` still open the right place.

Run the app's e2e and typecheck, take screenshots of all four tabs in light and dark mode, and check the tab bar at the smallest iPhone width.

## Stage 2: Server-side scores you can trust

Every score on a global board is checked by the server. Phones send what they did, never a score.

- Add a `Leaderboard` Durable Object in `worker/leaderboard.ts` (and the binding in `wrangler.jsonc`, then `npm run cf-typegen`). One instance per board, named `<board>:<season>`, for example `heater:2026-11` or `daily:2026-11-05`.
- Each board keeps each player's best score only, keyed by friend code, with their username, emoji, optional country and the time. It returns the top 100, a player's own rank and score, and the scores of a list of friend codes (for the Friends view).
- `POST /api/scores/:board` takes the device id, the friend code, the seed and the full list of moves. The Worker replays them with the shared engine (`applyAction()` and the challenge code in `src/game`), works out the score itself, and stores it only if it beats that player's best. It refuses a run whose seed doesn't match the board's, a moves list that doesn't replay cleanly, or a device that doesn't own that friend code. Rate limit it per code.
- Replays must be deterministic. Challenge tables already seed from `challengeRng()`; make sure nothing on that path reads the clock or `Math.random`. Add a test that plays a scripted run on the "phone" side, replays it on the "server" side and gets the same score, plus one that tampers with a move and is refused.
- Today's three (Range training's daily set) gets a board too, scored on the server from the answers.
- Usernames on a world board are public. Run each one through `isUsername()` and `isNameBlocked()` before it's shown, and hide anyone who fails. Rows get `openPlayerMenu()` (Report and Block) like a party board row, and blocked players are hidden from your view of the board.
- Deleting your data (`deleteMyData()`) removes your rows from every board.

## Stage 3: The Global tab

Use the screenshot from the owner as the layout reference: a small caps line ("NOVEMBER SEASON ENDS IN 25 DAYS"), a big rounded title, a World/Friends `SegmentedControl`, a grouped table of rows (position, flag, @username, points), and your own row pinned at the bottom over the list. Draw it in FlipUp's own palette, not the screenshot's red: violet for the selected segment and your pinned row, gold, silver and bronze squares for 1 to 3, gold for highlights.

Top to bottom:

1. **This month's Heater** as a large `LivingCard` (Stage 4): the month's name, the eight boss faces in a row, your best score and rank, and Play.
2. **Today's challenge**: Today's three from Range training with its board, your score and Play.
3. **The boards**: a `SegmentedControl` for Heater and Today, then World and Friends, then the list. Friends shows you and your friends only, ranked. Rows slide to their rank (reuse the motion from `components/party/board.tsx`). Pull to refresh.
4. **Your row**, pinned above the tab bar: your rank, or "Not on this board yet" with a Play button.

Each row has an optional flag, the @username, a badge if they earned one (Stage 5), and the score. A tap opens a small card for that player: their emoji, username, best score this season, and Add friend if they aren't one.

## Stage 4: Heater, the monthly game

"On a heater" is what poker players call a hot streak. Heater is a poker roguelike: one run against a ladder of eight bosses, the same ladder for everyone that month, played as often as you like to beat your best.

### How a run works

- You start with 100 big blinds and face eight bosses heads-up, one after another. Your stack carries from one to the next.
- Beating a boss means taking all their chips or being ahead after their hand limit (12 hands for bosses 1 to 4, 15 for 5 to 8). Behind at the limit, or busted, and the run is over.
- The blinds go up with each boss.
- **Bosses bring the variants.** Each boss plays one of the games in `VARIANTS` (Texas Hold'em for the first, then a different game each fight, picked by the season's seed), using the variant rules and bots that already exist (`botVariants.ts` for variant tables). Each boss is a named bot with a fixed style, picked from `BOTS` by the seed and toughened from boss 1 to boss 8 (use `dull` the other way round: boss 1 plays loose and makes mistakes, boss 8 plays close to its full strength). The boss greets you, needles you during the fight with its usual lines from `botTalk.ts`, and has a loss line and a win line.
- **Edges.** After each boss you win, pick one of three **Edges** for the rest of the run. Edges bend the rules in your favour and stack. Write about 24, roughly half common and half rare, for example:
  - *Tell*: you see whether the boss's hand is a pair, once per hand.
  - *Rabbit hunt*: after a fold you see the cards that would have come.
  - *Cooler insurance*: the first time you lose an all-in as a favourite, you get half the pot back.
  - *Wild pairs*: your pocket pairs count deuces as wild (Crazy Deuces rules).
  - *Extra card*: you're dealt three hole cards and discard one after the flop (Crazy Pineapple rules).
  - *Short memory*: the boss forgets your last bluff (clear their reads).
  - *Tight is right*: folding preflop costs no blind once per orbit.
  - *Heater*: every pot you win in a row adds 10% to the next one you win, from the bank.
  Edges change the game only for you, are applied through the engine (not the screen), and are logged in the moves so the server can replay them. **Chips are never created or lost** inside a fight; anything an Edge adds comes from a separate run bank that the score counts, not from the table. Keep the "keeps every chip accounted for" test passing, and add one for runs with Edges.
- **The seed.** Each month has one seed (`heater:2026-11`), which sets the bosses, their games and styles, the order and which Edges are offered at each step. **The cards are dealt fresh for every attempt** (from a per-attempt seed the server hands out when a run starts), so people can't memorise a deck: they have to play the ladder better.

### Scoring

- Score = bosses beaten × 1,000, plus chips at the end of the run, plus a bonus for each boss beaten in fewer hands.
- **Luck-adjusted all-ins.** When chips go all in before the river, count the hand at its equity (your share of the pot × your chance of winning at that moment, from `equity.ts`), not the result. A bad beat doesn't cost you score and a suck-out doesn't give you one. Say so on the start sheet: "Scored on your decisions, not your luck." This is what poker players will brag about.
- The server works out the score from the replay (Stage 2). The phone shows a provisional score during the run and swaps in the server's when it arrives.

### Screens

- **Start sheet** (`heater` sheet, night grain like Range training's `NightSheet`): this month's name, the eight bosses as faces with their game icons (faces after the one you reached are shown as silhouettes until you've reached them), your best, your rank, today's free run or the ad button (below), and Play.
- **The run** uses the normal table screen (`table.tsx`) with a Heater header: the boss's face and name, "Boss 3 of 8", hands left in this fight, your Edges as small icons you can tap to read. Use the existing variant felts for each boss's game.
- **Between bosses**: a short beat where the boss says their losing line, then the Edge pick as three tall cards side by side (`LivingCard`, gold for rare), one tap to pick, with a light haptic.
- **End of run**: the score counting up, bosses beaten as a row of faces (the one who knocked you out marked), "New best" if it is, your world rank and the change, Play again, and Share.
- **Share card**: a 1080 × 1350 picture like `useStatsShare()`: "Heater · November", the eight faces with how far you got, your score, your top percentage, and "Knocked out by Vinnie, 7-2 offsuit" (the boss and the hand that ended it). Plus a "Beat my run" link.
- **Beat my run**: the link opens Heater for the receiver with the sender's run as a ghost: same bosses and Edges offered, but the receiver's own deal. At the end it shows both scores side by side. It counts toward the board like any other run.

### Runs per day and the ad structure

- **The first run each day is free.** After that, each extra run costs one rewarded ad.
- **Build the ad structure, but don't connect an ad network.** Add `native/src/state/ads.ts` with `showRewardedAd(reason): Promise<'rewarded' | 'skipped' | 'unavailable'>`. For now it opens a placeholder `ad` sheet that shows a 5-second countdown ("Ad placeholder: the real ad goes here"), with a close button after the countdown, and resolves `rewarded` when it finishes or `skipped` if closed early. Add one clear `TODO` comment where the real SDK call goes.
- The start sheet's button reads "Play (first run of the day is free)" or "Watch an ad for another run". A run in progress is never interrupted by an ad, and no ads appear anywhere else in the app.
- The server hands out a per-attempt seed for each run (`POST /api/heater/start`) and counts how many each device has started that day. It allows one free run, and then one more for each ad confirmation. For now an ad confirmation is a phone-side flag sent with the start request; leave a `TODO` for server-side ad verification when a network is connected. Store the daily count on the device too, so the button is right offline.
- Premium buyers get nothing different here for now (don't touch Premium).
- Update `docs/APP_STORE.md`: rewarded ads need the App Tracking Transparency question answered and the privacy nutrition label updated once a network is connected. Leave that as an open item.

### Tuning and tests

- Add `scripts/heaterLab.ts`, like `challengeLab.ts`, that plays many runs with scripted players (a tight player, a loose player, the constant bluffer from `botSim.ts`) and reports how far each gets and the spread of scores. Tune boss strength so a decent player usually reaches boss 4 or 5 and beating all eight is rare, around 1 run in 50 for a good player. Write the results in `docs/HEATER.md` along with the rules.
- Unit tests in `src/game/heater.test.ts`: same seed gives the same ladder and Edge offers; each Edge does what it says; scores replay identically on the server; all-in scoring by equity; chips accounted for.

## Stage 5: Monthly seasons and badges

- A season is a calendar month in UTC. Heater's board resets with the new month's Heater, and the Global tab's caps line counts down the days left.
- When a season ends, the top 100 on the Heater world board get a badge for that month, shown next to their username on boards (a small outlined pill like the "OG" in the reference, gold for the top 10). Each player shows their best badge. Store badges on the `FriendCard`, written by the Worker when it closes the season (a scheduled Worker cron or the first request of the new month, whichever is simpler and reliable).
- Last month's top 3 stay on the Global tab for the first few days of a new season as a small "Last season" podium.
- Keep old season boards readable for a year, then delete them.

## Stage 6: Country flags

- Country is optional and off by default. Add a "Show my country" row in Settings with a picker that suggests the phone's region (`expo-localization`) and lets you choose another or none. Never use IP location.
- The flag is stored on the `FriendCard` and shown on board rows. Draw it as the regional-indicator emoji pair.
- Update the privacy policy text in `appInfo.ts` and the App Store notes in `docs/APP_STORE.md`: country is optional, shown publicly on leaderboards, and removed with Delete my data.

## When you're done

- Every stage committed, `npm run check` and the native checks passing.
- `CLAUDE.md` describes the four tabs, the Join sheet, Train, Global, the Leaderboard Durable Object, Heater (rules in `docs/HEATER.md`), the ad structure, seasons and flags, in the same style as the rest of the file.
- Screenshots of Play, Train, Global, the Heater start sheet, an Edge pick, the end of a run and the share card, in light and dark mode, sent to the owner.
- A short list of anything you weren't sure about, so the owner can decide.

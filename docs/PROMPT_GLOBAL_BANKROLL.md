# Build prompt: Global tab, Join on Play, and Bankroll

Paste everything below the line into a fresh Claude Code session on this repo.

---

You're working on FlipUp, the iPhone app in `native/` (Expo SDK 58, Expo Router) and its Cloudflare Worker in `worker/`. Read `CLAUDE.md` in full before you start, then `docs/RULES.md`, `docs/CHALLENGES.md`, `docs/MOTION.md` and `docs/APP_STORE.md`. Every rule in `CLAUDE.md` applies: the palette (black, white, Apple's greys, violet for actions, gold for wins and highlights, red only for Fold and destructive actions, the one green for Raise), SF Symbols through `Icon` with a Material lookalike for the web build, `ThemedText` for every piece of text, `PressableScale` for press feedback, `LivingCard` for coloured cards, `SheetScroll` in every sheet, the shadow-outside/clip-inside rule, Reduce Motion, `.get()`/`.set()` on shared values, no `@expo/ui/swift-ui` outside `.ios.tsx` files, and plain writing with no buzzwords.

The goal: make FlipUp something people open every day. That means a new tab layout, a global leaderboard with monthly seasons, and one new monthly game, **Bankroll**, that people come back to every day.

This is the iPhone app only. Don't build any of it for the web app in `src/screens`. Shared engine code in `src/game` is fine and expected, because the Worker needs it.

**Don't touch Premium.** Leave `purchase.ts`, `entitlement.ts`, `unlock.ts`, `premium.tsx`, the $9 price and everything it unlocks exactly as they are. No subscriptions in this work.

Work in the stages below, in order. After each one, run `npm run check` at the root and `npm run typecheck` plus `npm test` in `native/`, then commit. Update `CLAUDE.md` and the relevant docs as you go, so the next session knows where everything lives. Add a stage list to `docs/TODO.md` and tick each stage off.

## Stage 1: The new tab bar

Today the tabs are Play, Train, Friends, and Join as the iOS 26 search-role button beside the bar. There's no Party tab: a party starts from Play with friends. Check `(tabs)/_layout.tsx` and `CLAUDE.md` before you change anything, in case it has moved on since this prompt was written.

The tabs become **Play, Train, Global, Friends**, in that order.

- **Play** stays as it is, except Join moves here (see below).
- **Train** stays exactly as it is. Don't rebuild it or move anything into or out of it.
- **Global** is a new tab, `(tabs)/(global)/global.tsx` (Stage 3), with SF Symbol `trophy.fill`, between Train and Friends.
- **Friends** stays as it is, with its badge.
- **The Join tab goes away**, and so does the search-role button.

### Join on Play

- Add a "Join with a code" button to Home's title row as a round glass button (`RoundButton`, SF Symbol `qrcode.viewfinder` or `keyboard`) next to `ProfileMenu`.
- It opens a `join` sheet with everything today's `(join)/join.tsx` does: `CodePad` (the keyboard opens as the sheet opens), Scan a QR code, the table it found and Sit down, and party codes and party QR codes, which still land in the party. Move the code, don't copy it.
- Every deep link and route that pointed at `(join)` must still work. Grep for them and redirect where needed. Check that the join link (`/ABCDE`) and `/party/CODE` still open the right place.

Take screenshots of all four tabs in light and dark mode, and check the tab bar at the smallest iPhone width.

## Stage 2: Server-side play you can trust

Bankroll is played against bots, but **the server deals every card and runs every bot**. The phone never holds the deck, never sees a card before it's dealt and never reports its own chip count. Players get fresh random cards (no shared daily deal: that would let a late player ask a friend what's coming), so the server has to be the only one who knows them.

- Add a `BankrollRoom` Durable Object in `worker/bankroll.ts` (binding in `wrangler.jsonc`, then `npm run cf-typegen`), one per player per season, named `<friendCode>:<season>`, for example `482913:2026-11`. It holds that player's bankroll, today's hand count, rebuy, cut status and the live table. Reuse as much of `worker/room.ts` and the online table path as you can: it's a normal online table where every other seat is a bot, run by `applyAction()`, dealt with `cryptoRng`, with the alarm as the clock. The phone talks to it like any online table (`state/connection.ts`) and only ever gets `redactForDevice()`'s view.
- The bankroll is the stack. When the player sits down, their whole bankroll (capped at the table's max buy-in, see Stage 4) goes on the table; when they leave or hit the day's 50 hands, the stack goes back into the bankroll. Chips only move inside the engine, so the "keeps every chip accounted for" test covers it. Add a test that plays a session, leaves, comes back and checks the bankroll matches.
- Add a `Leaderboard` Durable Object in `worker/leaderboard.ts`, one per board, named `<board>:<season>` (`bankroll:2026-11`, `daily:2026-11-05`). `BankrollRoom` writes the player's bankroll to it after every hand. Each row is keyed by friend code, with username, emoji, optional country, bankroll, peak, rebuy used and status (alive, busted, cut). It returns the top 100, a player's own rank, and a list of friend codes' rows (for the Friends view).
- Today's three (Range training's daily set) gets its own board too, scored on the server from the answers.
- The phone can't post anything to a board directly. Refuse any request whose device doesn't own its friend code, and rate limit per code.
- Usernames on a world board are public. Run each one through `isUsername()` and `isNameBlocked()` before it's shown, and hide anyone who fails. Rows get `openPlayerMenu()` (Report and Block) like a party board row, and blocked players are hidden from your view.
- Deleting your data (`deleteMyData()`) removes your rows from every board and deletes your `BankrollRoom`.

## Stage 3: The Global tab

Base the layout on the owner's reference screenshot: a small caps line ("NOVEMBER SEASON ENDS IN 25 DAYS"), a big rounded title ("Climb the boards." or similar), a World/Friends `SegmentedControl`, a grouped table of rows (POS, flag, @username, then the number on the right), and your own row pinned at the bottom over the list. Draw it in FlipUp's own palette, not the screenshot's red: violet for the selected segment and your pinned row, gold, silver and bronze squares for positions 1 to 3, gold for highlights. Tied players share a position, like the two 8s in the reference.

Top to bottom:

1. **This month's Bankroll** as a large `LivingCard` (Stage 4): the month, your bankroll counting up, your rank, hands left today ("32 of 50 left"), how many players are still alive, the days until the next cut, and Play.
2. **Today's challenge**: Today's three from Range training, your score and Play.
3. **The boards**: a `SegmentedControl` for Bankroll and Today, then World and Friends, then the list. Friends shows only you and your friends, ranked. Rows slide to their rank (reuse the motion from `components/party/board.tsx`). Pull to refresh. Busted and cut players stay on the board under the live ones, greyed, with their peak.
4. **Your row**, pinned above the tab bar: your rank and bankroll, or "Not on this board yet" with Play.

Each row has an optional flag, the @username, a badge if they earned one (Stage 5), and the number. A tap opens a small card for that player: their emoji, username, bankroll, peak, and Add friend if they aren't one.

### Filler rows in development builds only

To see how a full board looks while it's empty, add filler rows **in development builds only** (`__DEV__`, or `EXPO_PUBLIC_FILLER=1` for screenshot builds). Never in a release build: add a test that the filler code returns nothing when `__DEV__` is false.

- Put them in `native/src/state/board-filler.ts`: about 200 rows with usernames in the style of the reference (`@parker7335`, `@cal03`, `@sneaky_vincent8`, `@enzxity`, `@louie_lct`: first names with digits, short handles, the odd underscore), mostly US flags with some Canada, UK, Australia, Hong Kong and others, a few with a season badge, and bankrolls on a believable curve (a handful above 20,000, most between 500 and 5,000, a tail of greyed busted players).
- Generate them from a fixed seed so they don't jump around between launches, and merge them with the real rows by bankroll.

## Stage 4: Bankroll, the monthly game

One month, one stack. Everyone starts the month with 1,000 chips and plays cash hands against bots. The stack carries from day to day, and the biggest bankroll at the end of the month wins.

### Rules

- **Start:** 1,000 chips on the 1st of the month (UTC). Anyone who joins later in the month starts with 1,000 too.
- **One stake for everyone.** All players sit at the same blinds, and the blinds rise through the month (for example 5/10 in week one, 10/20 in week two, 25/50 in week three, 50/100 in the last days). Tune the steps with the lab below. Max buy-in is 100 big blinds; anything above that stays in the bankroll and is shown next to the stack ("+ 4,200 in the bank"). If the bankroll is under the max, everything goes on the table.
- **The table:** six seats, you and five bots from `BOTS` with mixed styles. Busted bots are replaced at the next deal (reuse `refillCash()` from `reducer.ts`). The bots are full strength; no `dull`.
- **50 hands a day.** Each player can play at most 50 hands a day (UTC), across as many sittings as they like. The count is kept by `BankrollRoom`, so it can't be reset on the phone. When the 50th hand ends, the table closes for the day with "Back tomorrow" and the time until midnight UTC.
- **Fresh random cards.** Every hand is dealt by the server from `cryptoRng`, a new random deck per player per hand. There's no shared deal.
- **Busting and the rebuy.** When the bankroll hits zero, the player is offered one rebuy for the month: watch an ad (see the ad structure below) and get 1,000 chips back. A rebuy is shown next to their name on the board (a small "R" pill). Bust again, or skip the ad, and they're out for the month: greyed on the board with their peak.
- **Weekly cuts.** Every Sunday at midnight UTC, two groups are cut: the bottom 10% of alive players by bankroll, and anyone alive who didn't play a hand that week. Cut players are out for the rest of the month, greyed with their peak and "Cut, week 2". Players who started that week are safe from the inactivity cut for that week. Run it from a Worker cron (`triggers.crons` in `wrangler.jsonc`), and make it safe to run twice.
- **Leaving mid-hand.** Leaving or losing connection works like any online table: the player sits out, their hand is folded on the clock (`TIMING.offlineClock`), and the stack goes back to the bankroll. The hand still counts toward the 50.

### Screens

- **Start sheet** (`bankroll` sheet, night grain like Range training's `NightSheet`): this month, your bankroll and peak, today's hands left, the current blinds and when they rise, the next cut and how many are still alive, your rank, and Sit down. First time only: a short How it works (1,000 chips, 50 hands a day, the stack carries over, bottom 10% cut every Sunday, one rebuy).
- **The table** is the normal `table.tsx` with a Bankroll header: your bankroll, hands left today ("Hand 18 of 50"), your rank live. The table menu has Leave (back to the bankroll).
- **End of day / leaving**: a small summary sheet: today's result (+ or −), bankroll now, rank and the change, hands left, Share.
- **Busted**: "You're busted." with your peak and rank, then "Watch an ad to rebuy 1,000" (if the rebuy isn't used) or "Out for November. Back on December 1st."
- **Cut**: shown the next time they open the Global tab or Bankroll: "Cut in week 2" with their peak and best rank.
- **Share card**: a 1080 × 1350 picture like `useStatsShare()`: "Bankroll · November · Day 23", the bankroll, "#84 of 2,140 still alive", the peak. If they're out: "Busted on day 12 by Vinnie, K♠K♥ into A♣A♦" (the bot and the hand that ended it).

### The ad structure (not connected)

- The only ad in the app is the Bankroll rebuy. Build the structure, don't connect an ad network.
- Add `native/src/state/ads.ts` with `showRewardedAd(reason): Promise<'rewarded' | 'skipped' | 'unavailable'>`. For now it opens a placeholder `ad` sheet with a 5-second countdown ("Ad placeholder: the real ad goes here") and a close button once the countdown is done. It resolves `rewarded` when the countdown finishes, or `skipped` if closed early. Put one clear `TODO` comment where the real SDK call goes.
- The rebuy request (`POST /api/bankroll/rebuy`) carries a phone-side "ad watched" flag for now; leave a `TODO` for server-side ad verification once a network is connected. The server allows one rebuy per player per month whatever the flag says.
- Premium buyers get nothing different for now. Don't touch Premium.
- Update `docs/APP_STORE.md`: rewarded ads need the App Tracking Transparency question answered and the privacy label updated once a network is connected. Leave it as an open item.

### Tuning and tests

- Add `scripts/bankrollLab.ts`, like `challengeLab.ts`, that plays whole months with scripted players (a tight player, a loose player, the constant bluffer from `botSim.ts`) at 50 hands a day and reports bankrolls, bust rates and who survives each cut. Tune the blind steps so a solid player usually survives to the end, a loose one usually busts or gets cut by week three, and the top bankrolls land around 10 to 30 times the starting 1,000. Write the rules and results in `docs/BANKROLL.md`.
- Unit and Worker tests: chips accounted for across sittings and days; the 50-hand limit can't be passed; one rebuy only; the weekly cut picks the right players and is safe to run twice; a new month starts everyone at 1,000; the phone never receives an unseen card.

## Stage 5: Monthly seasons and badges

- A season is a calendar month in UTC. The Bankroll board resets on the 1st, and the Global tab's caps line counts down the days left.
- When a season ends, the top 100 bankrolls get a badge for that month, shown next to their username on boards (a small outlined pill like the "OG" in the reference, gold for the top 10). Each player shows their best badge. Store badges on the `FriendCard`, written by the same Worker cron that runs the cuts.
- Last month's top 3 stay on the Global tab for the first few days of a new season as a small "Last season" podium.
- Keep old season boards readable for a year, then delete them.

## Stage 6: Country flags

- Country is optional and off by default. Add a "Show my country" row in Settings with a picker that suggests the phone's region (`expo-localization`) and lets you choose another or none. Never use IP location.
- The flag is stored on the `FriendCard` and shown on board rows, drawn as the regional-indicator emoji pair.
- Update the privacy policy text in `appInfo.ts` and the notes in `docs/APP_STORE.md`: country is optional, shown publicly on leaderboards, and removed with Delete my data.

## When you're done

- Every stage committed, `npm run check` and the native checks passing.
- `CLAUDE.md` describes the four tabs, the Join sheet, Global, the `BankrollRoom` and `Leaderboard` Durable Objects, Bankroll (rules in `docs/BANKROLL.md`), the dev-only filler rows, the ad structure, cuts, seasons and flags, in the same style as the rest of the file.
- Screenshots of Play, Train, Global (with filler rows), the Bankroll start sheet, a Bankroll table, the busted sheet with the ad placeholder, and the share card, in light and dark mode, sent to the owner.
- A short list of anything you weren't sure about, so the owner can decide.

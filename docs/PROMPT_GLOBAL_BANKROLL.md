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

1. **This month's Bankroll** as a large `LivingCard` (Stage 4): the month, your bankroll counting up, your rank, hands left today ("32 of 50 left"), how many players are still alive ("1,204 of 4,812"), the days until the next cut, and Play.
2. **Today's challenge**: Today's three from Range training, your score and Play.
3. **The boards**: a `SegmentedControl` for Bankroll and Today, then World and Friends, then the list. Friends shows only you and your friends, ranked. Rows slide to their rank (reuse the motion from `components/party/board.tsx`). Pull to refresh. Busted and cut players stay on the board under the live ones, greyed, with their peak.
4. **Your row**, pinned above the tab bar: your rank and bankroll, or "Not on this board yet" with Play.

Each row has an optional flag, the @username, a badge if they earned one (Stage 5), and the number. A tap opens a small card for that player: their emoji, username, bankroll, peak, and Add friend if they aren't one.

### Filler rows in development builds only

To see how a full board looks while it's empty, add filler rows **in development builds only** (`__DEV__`, or `EXPO_PUBLIC_FILLER=1` for screenshot builds). Never in a release build: add a test that the filler code returns nothing when `__DEV__` is false.

- Put them in `native/src/state/board-filler.ts`: about 200 rows with usernames in the style of the reference (`@parker7335`, `@cal03`, `@sneaky_vincent8`, `@enzxity`, `@louie_lct`: first names with digits, short handles, the odd underscore), mostly US flags with some Canada, UK, Australia, Hong Kong and others, a few with a season badge, and bankrolls on a believable curve (a handful above 20,000, most between 500 and 5,000, a tail of greyed busted players).
- Generate them from a fixed seed so they don't jump around between launches, and merge them with the real rows by bankroll.

## Stage 4: Bankroll, the monthly game

**"1,000 chips. One month. Don't go broke."** That's the whole pitch, and the game has to stay that simple. A new player should get it in one sentence, and every day should give them something to share. When a choice comes up while you build it, pick the simpler one.

### The rules (these five, nothing more)

1. Everyone starts with 1,000 chips on the 1st of the month (UTC). Anyone joining later in the month starts with 1,000 too.
2. Play up to 50 hands a day against bots.
3. Your chips carry over. Bust and you're out for the month, with one rebuy by watching an ad.
4. Every Sunday at midnight UTC, the bottom 10% of players still alive are cut.
5. Biggest stack at the end of the month wins.

These five lines are what the start sheet shows. There are no stakes to pick, no levels, no table choice: one Sit down button.

### How it works underneath

- **One blind level all month**, the same for everyone (10/20 unless the lab below says otherwise). Your stack on the table is capped at 100 big blinds; anything above that stays in your bankroll and shows next to your stack ("+ 4,200 in the bank"). If the bankroll is under the cap, it all goes on the table. The cap means nobody wins the month in one hand.
- **The table:** six seats, you and five bots.
- **Bots are always full strength.** No `dull`, no difficulty curve, nothing that changes with your bankroll or rank.
- **Every table is a random mix.** Each time you sit down, the five bots are drawn at random from `BOTS` across all the styles, so one session you get a soft table and the next you're with sharks. Their styles are never shown; working out who's who is the skill.
- **The bots remember you.** Each player's reads (`PlayerRead`: how often they fold, fold to c-bets and 3-bets, bluff, check-raise, what their bet sizes have meant at showdown) are kept in their `BankrollRoom` for the whole month and seeded into `game.reads` every time they sit down, so every bot at every table plays against what the month has shown about them. The more someone plays one way, the harder the bots punish it. Reads reset with the month.
- **And they say so.** Add a set of "I remember you" lines in `botLines.ts` (new ids at the end only), triggered by a read that's strong enough, for example "You again? Still bluffing rivers?", "Third time you've folded to a 3-bet today.", "Big bet, so you've got it. You always do.", "Let me guess. Check-raise?" At most one or two per session, so they land. They go through `botSays()` like every other line. These lines are the part people screenshot, so write plenty and make them sharp.
- **Bots match your stack.** At every deal, each bot's stack is set within about 70% to 130% of your stack on the table (spread so they aren't all equal, and never under 10 big blinds), so a short stack plays a short table and a deep stack plays a deep one. A bot that busts is replaced at the next deal with a new random bot in that range (build on `refillCash()` in `reducer.ts`). A bot that runs far above the range leaves the table at the next deal and a new one sits down; chips are never taken off a bot mid-session. Top-ups and swaps touch only bot chips, never yours, and only between hands. Keep the chip-accounting test passing by counting them as chips entering and leaving the table, and add a test that the bots stay in range over a long session for a short, a medium and a 100-big-blind stack.
- **50 hands a day**, across as many sittings as they like. `BankrollRoom` counts them, so the phone can't reset it. After the 50th hand the table closes with "Back tomorrow" and the time until midnight UTC.
- **Fresh random cards.** Every hand is dealt by the server from `cryptoRng`, a new random deck per player per hand. No shared deal.
- **Busting and the rebuy.** At zero, the player is offered one rebuy for the month: watch an ad (below) and get 1,000 back. A rebuy shows as a small "R" pill next to their name on the board. Bust again, or skip the ad, and they're out for the month: greyed on the board with their peak.
- **The Sunday cut** takes the bottom 10% of alive players by bankroll. Cut players are out for the month, greyed with their peak and "Cut, week 2". Players who haven't played yet that month are left off the board, so they aren't cut before they start. Run it from a Worker cron (`triggers.crons` in `wrangler.jsonc`) and make it safe to run twice.
- **Leaving mid-hand** works like any online table: they sit out, the hand folds on the clock (`TIMING.offlineClock`), the stack goes back to the bankroll, and the hand counts toward the 50.

### Screens

- **Start sheet** (`bankroll` sheet, night grain like Range training's `NightSheet`): your bankroll big, your rank, "1,204 of 4,812 still alive", hands left today, days to the next cut, and Sit down. The five rules underneath, every time, in small type.
- **The table** is the normal `table.tsx` with a Bankroll header: your bankroll, "Hand 18 of 50", your rank live. The table menu has Leave.
- **Today's card**, after the 50th hand or on leaving: today's result big ("+640 today"), the bankroll, the rank and how far it moved, and Share. This is the daily share, like Wordle's grid: small, the same shape every day, one tap.
- **Busted**: "You're busted." with the hand that did it, your peak and rank, then "Watch an ad to rebuy 1,000" if the rebuy isn't used, or "Out for November. Back December 1st."
- **Cut**: shown the next time they open the app: "Cut in week 2" with their peak and best rank.
- **Share pictures**, 1080 × 1350 like `useStatsShare()`:
  - the daily card: "Bankroll · November · Day 23", "+640 today", the bankroll, "#212 of 4,812 still alive";
  - the bust card: "Busted on day 12. K♠K♥ into A♣A♦", with the bot who did it;
  - the end-of-month card: final place, final bankroll, peak, and the badge if they earned one.

### Friend alerts

The fastest way to get someone to open the app is a friend passing them. While the app is open, `useFriendWatch()` (or a light poll of the friends' rows) shows a small banner like `InviteBanner` when a friend passes you ("@cal03 just passed you"), busts ("@jake4147 busted") or survives a cut you didn't. Once per event, never more than one every few minutes. Leave a `TODO` for push notifications for the same three events; don't build push now.

### The ad structure (not connected)

- The only ad in the app is the Bankroll rebuy. Build the structure, don't connect an ad network.
- Add `native/src/state/ads.ts` with `showRewardedAd(reason): Promise<'rewarded' | 'skipped' | 'unavailable'>`. For now it opens a placeholder `ad` sheet with a 5-second countdown ("Ad placeholder: the real ad goes here") and a close button once the countdown is done. It resolves `rewarded` when the countdown finishes, or `skipped` if closed early. Put one clear `TODO` comment where the real SDK call goes.
- The rebuy request (`POST /api/bankroll/rebuy`) carries a phone-side "ad watched" flag for now; leave a `TODO` for server-side ad verification once a network is connected. The server allows one rebuy per player per month whatever the flag says.
- Premium buyers get nothing different for now. Don't touch Premium.
- Update `docs/APP_STORE.md`: rewarded ads need the App Tracking Transparency question answered and the privacy label updated once a network is connected. Leave it as an open item.

### Tuning and tests

- Add `scripts/bankrollLab.ts`, like `challengeLab.ts`, that plays whole months with scripted players (a tight player, a loose player, the constant bluffer from `botSim.ts`) at 50 hands a day, with the month-long reads on, and reports bankrolls, bust rates and who survives each cut. Check that the bots' reads make a one-note player (the constant bluffer) lose more as the month goes on. Pick the blind level so a solid player usually survives to the end, a loose one usually busts or is cut by week three, and the top bankrolls land around 10 to 30 times the starting 1,000. Write the rules and results in `docs/BANKROLL.md`.
- Unit and Worker tests: chips accounted for across sittings and days; the 50-hand limit can't be passed; one rebuy only; reads carry across sittings and reset with the month; the Sunday cut picks the right players and is safe to run twice; a new month starts everyone at 1,000; the phone never receives an unseen card.

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
- `CLAUDE.md` describes the four tabs, the Join sheet, Global, the `BankrollRoom` and `Leaderboard` Durable Objects, Bankroll (rules in `docs/BANKROLL.md`), the dev-only filler rows, month-long bot reads, friend alerts, the ad structure, cuts, seasons and flags, in the same style as the rest of the file.
- Screenshots of Play, Train, Global (with filler rows), the Bankroll start sheet, a Bankroll table, the busted sheet with the ad placeholder, and the share card, in light and dark mode, sent to the owner.
- A short list of anything you weren't sure about, so the owner can decide.

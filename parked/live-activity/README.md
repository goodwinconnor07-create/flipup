# The parked Live Activity

Your table on the Lock Screen and in the Dynamic Island: your cards, the board, the pot and, on your turn, a gold clock
and a Check button. Built on 17 November 2026 and taken out the same day, before the first App Store release (the
owner: no new features this close to review, and it was too buggy; it was never checked on a phone, because the Swift
only compiles in the iOS build). The app, the Worker and the engine no longer know it, so nothing about it ships, not
even switched off.

Its setup (Apple key, secrets, capabilities) is in `docs/LIVE_ACTIVITY.md` here.

## What is here

Every file is at the path it had, under this folder (`parked/live-activity/native/targets/live` goes back to
`native/targets/live`, and so on):

- `native/targets/live/`: the SwiftUI widget extension (`@bacons/apple-targets`, bundle id `com.goodwin.flipup.live`):
  `TableLiveActivity.swift` (the Lock Screen and island layouts), `Cards.swift` (the cards, drawn like the app's own),
  `CheckIntent.swift` (the Check button), `TableActivityAttributes.swift` (must match the module's copy).
- `native/modules/flipup-live/`: the ActivityKit module (start, update, end, push tokens).
- `native/src/state/live-activity.ts`: starts it as an online table deals, ends it when you leave.
- `native/tests/live-activity.test.ts`: keeps the two Swift copies and `LiveState` in step.
- `src/game/liveActivity.ts` (+ test): `liveState()`, one phone's view, always from `redactForDevice()`.
- `worker/live.ts` (+ test): the APNs push (ES256 provider token with WebCrypto).
- `docs/LIVE_ACTIVITY.md`: the Apple key, the `APNS_KEY` and `APNS_KEY_ID` secrets, the capabilities.

## Bringing it back

The last commit on main that had it working in full is **`8852c8d`** (pull request #150). `git show 8ed6928` is the
first version, with every shared-file change in one place. Move the files back, then redo what came out of the shared
ones:

- `native/app.config.ts`: add `'@bacons/apple-targets'` to `plugins`, take out `withoutPush` (the Live Activity needs
  `aps-environment`), add `appleTeamId: APP_INFO.appleTeamId` under `ios`, and `NSSupportsLiveActivities` and
  `NSSupportsLiveActivitiesFrequentUpdates` (both `true`) to `infoPlist`. `native/appInfo.ts`: `appleTeamId: '9FAJRHL979'`.
- `native/package.json`: `"@bacons/apple-targets": "5.0.0"` (then `npm install` in `native/` for the lockfile).
- `native/src/state/prefs.ts`: `useLiveActivity`, `setLiveActivity`, `isLiveActivityOn` (`flipup.liveactivity`, on by
  default). `native/src/components/you-settings.tsx`: the Live Activity switch, shown when `FlipupLive` exists.
- `native/src/state/session.ts`: `syncLive(...)` at the end of `set()` and `endAllLive()` in
  `resetSessionIdentity()`. `native/tests/identity.test.ts`: mock `../modules/flipup-live`.
- `src/game/index.ts`: `export * from './liveActivity'`. `src/game/redactLeaks.test.ts`: check `liveState()` for leaks.
- `worker/index.ts`: `liveRoute()` and the `/live`, `/live/check`, `/live/stop` match on `/api/tables/:code`.
  `worker/room.ts`: `registerLive()`, `stopLive()`, `liveCheck()`, `queueLive()`, `pushLive()`, `liveRegs()`.
- `native/src/components/icon.tsx`: `'iphone': 'smartphone'`. `native/src/data/whats-new.ts` and `public/privacy.html`
  (a Live Activity paragraph: the push token is kept with the device id while you're seated), the App Store privacy
  answers and review notes in `docs/APP_STORE.md`, and the description in `docs/SUBMISSION.md`.

Left in place on purpose, so nothing needs redoing in Apple's portal:

- Push Notifications stays on for the app's App ID, so the workflows keep `EXPO_NO_CAPABILITY_SYNC` (Apple's API turns
  away EAS's request to change Push with an App Store Connect key).
- EAS already holds signing for the extension's App ID (`com.goodwin.flipup.live`).
- The Cloudflare secrets `APNS_KEY` and `APNS_KEY_ID` can stay.

Before it ships again, run it on a real phone at an online table with a friend: the layout at every phone size (the
first version was cut off at the corners), the gold turn clock, Check, the end of a hand and leaving the table.

## The design (as it was, from `docs/DESIGN.md`)

> **Live Activity (owner, 2026-11-17; redrawn twice the same day after Flighty's, the first looked "really ugly and
> gets cut off on the corners"):** an online table you're seated at shows on the Lock Screen and in the Dynamic Island
> (`native/targets/live`). It answers one question: is it my turn? A near-black card (`LivePalette.card`), 22pt in
> from the sides and 20pt top and bottom so nothing meets the rounded corners, in four rows: a small top row
> (FlipUp's spade on blue, the game's name, the hand number or party round in grey on the right); a big middle row
> (your cards 44pt wide, drawn like the app's own cards: 5:7, the rank top left and the suit glyph under it in the
> four-colour deck, with your made hand under them
> in a soft light blue; the board on the right, only the cards that have landed, "Before the flop" until then, with
> the pot under it); a hairline; and a status row. On your turn the card warms towards gold (`turnCard`), the
> hairline is the gold clock draining, the countdown is the biggest thing on the card (34pt gold) with "Your turn ·
> free to check" or "Your turn · 4 bb to call" (the cost in gold) under it, and a gold Check button sits on the right
> only when checking is free: only real buttons look like buttons, and anything that costs chips is done in the app.
> Otherwise the row is the line ("Mia is thinking", "Two pair took it", "Mia took the pot") over your chips behind,
> with your net as a pill after a hand (filled gold when you won); the line never repeats the pill's number. Before
> the deal and after the game: the top row and one big line. Compact island: your two cards left; right the gold ring
> on your turn, `+12 bb` in gold after a win, else the pot. Minimal: the ring, or a spade. Expanded: your hand left,
> board and pot right, then the hairline and the status row. Your cards and made hand are `.privacySensitive()`, so
> they stay hidden until the phone is unlocked. Chips are in big blinds. Bots-only tables have none.

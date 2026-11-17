# Live Activity

An online table you're seated at shows on the Lock Screen and in the Dynamic Island: your cards, the board, the pot,
and above all whether it's your turn. The design is the "Live Activity" box in `docs/DESIGN.md`.

## How it fits together

| Piece | Where | What it does |
|---|---|---|
| What it shows | `src/game/liveActivity.ts` | `liveState(game, deviceId, now, act)`: one phone's view, always built from `redactForDevice()`. `livePriority()` and `liveAlert()` decide how urgent a push is. Tested in `liveActivity.test.ts` and held to the hidden-card rule by `redactLeaks.test.ts`. |
| The pushes | `worker/live.ts`, `worker/room.ts` | The table keeps each phone's push token (`live` in its storage) and, after every change, pushes that phone its own `liveState()` through APNs, skipping pushes that change nothing. Priority 10 (with an alert) when your turn starts and when a hand you're in ends; 5 for the rest. An end push when you leave or the table closes. |
| Routes | `worker/index.ts` | `POST /api/tables/:code/live` (register a token, answers the Check key), `/live/stop`, `/live/check`. |
| Starting and ending it | `native/src/state/live-activity.ts` | Starts as an online table you're seated at is dealt (in the foreground, so the token always reaches the table), updates it while the app is open, ends it when you leave. Settings > Live Activity turns it off. Bots-only tables have none. |
| The native module | `native/modules/flipup-live` | ActivityKit: start, update, end, and each push token as `onPushToken`. |
| The drawing | `native/targets/live` | A widget extension made by `@bacons/apple-targets` at prebuild (bundle id `com.goodwin.flipup.live`). SwiftUI for the Lock Screen and the island, and `CheckIntent`, the Check button. |

`TableActivityAttributes.swift` is in both `modules/flipup-live/ios` and `targets/live` (ActivityKit matches them by
name and shape). `native/tests/live-activity.test.ts` fails if the two copies differ or if their fields stop matching
`LiveState`. Change all three together.

## Check button

The button never sends the device id. When a phone registers, the table gives its activity a random key (`act`); the
button sends that key with the hand number and move counter it was drawn for, and the table checks for that seat only
if it's still that turn and checking is free. Anything that costs chips opens the app.

## Setting it up (the owner, once)

1. **Push capability.** The app now has Push Notifications on (the `aps-environment` entitlement; it's used only for
   Live Activity updates, the app never asks for notification permission for them). The next EAS build turns the
   capability on for the App ID and remakes the provisioning profile, and makes the profile for the new
   `com.goodwin.flipup.live` extension. Both happen in the iOS build workflow with the App Store Connect key it has.
2. **An APNs key.** Apple Developer portal > Certificates, Identifiers & Profiles > Keys > + > tick Apple Push
   Notifications service (APNs), environment Sandbox & Production. Download the `.p8` (it can only be downloaded once)
   and note the Key ID.
3. **Give the Worker the key** (never commit it):
   ```sh
   npx wrangler secret put APNS_KEY      # paste the whole .p8 file, BEGIN and END lines included
   npx wrangler secret put APNS_KEY_ID   # the 10-character Key ID
   ```
   `APPLE_TEAM_ID` and `APPLE_BUNDLE_ID` are already in `wrangler.jsonc`. Without the key the Worker sends nothing, and
   the activity only moves while the app is open.
4. **Deploy** the Worker, then build the app.

## Checking it on a phone

- Sit at an online table with a friend (or a second phone), deal, lock the phone: the Lock Screen shows the table.
- When it's your turn the island lights gold with a short alert and the ring drains. With a free check, Check works
  from the Lock Screen.
- Fold or win a hand: the island shows `+N bb` in gold after a win.
- Leave the table: it goes. Close the table by waiting it out: it says why and goes a minute later.
- Settings > Live Activity off: it goes at once.
- A development build uses Apple's sandbox (`sandbox: __DEV__` when registering).

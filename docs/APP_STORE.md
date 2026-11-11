# FlipUp on the App Store

What Apple asks of FlipUp's iPhone and iPad app, what we'll do about each rule, and what's still open.
Everything below was checked against Apple's own pages on **2 November 2026** unless a line says otherwise.
The App Review Guidelines page showed "Last Updated: October 16, 2026" that day.

Status: **Phase 1 done, waiting for the owner's review.** Phase 2 doesn't start until the change list at the
end and the questions under it have answers.

Sources:
[App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) ·
[Offering account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/) ·
[Age ratings](https://developer.apple.com/help/app-store-connect/reference/age-ratings) ·
[App privacy details](https://developer.apple.com/app-store/app-privacy-details/) ·
[Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications) ·
[Expo: privacy manifests](https://docs.expo.dev/guides/apple-privacy/)

---

## Phase 0: where setup stands

| Step | State |
|---|---|
| Repository secrets | All five are set. The Expo token is stored as `EXPO_API_TOKEN` (not `EXPO_TOKEN`), and the workflow reads that name. |
| Expo skills | Installed (`expo` plugin, 24 skills including `expo-design-system`, `expo-native-ui`, `expo-animation`, `expo-ui`). The plugin came from the `anthropic-plugin-directory` marketplace; `claude-plugins-official` didn't list it. Cloud sessions start fresh, so each new session reinstalls it with `claude plugin install expo@anthropic-plugin-directory`. |
| Impeccable | Installed for this project (`npx impeccable install`): the skill in `.claude/skills/impeccable`, its agents in `.claude/agents`. Its engine binary (21 MB) isn't committed; it downloads itself on first use. Its design hook is in `.claude/settings.local.json`, which stays on the machine, so a new session reruns the installer to get the hook back. |
| `native/` app | iPhone only for the first release (`supportsTablet: false`). Made with `create-expo-app` (Expo SDK 58, React Native 0.88, Expo Router). The template's demo screens are gone; one shell screen proves the engine loads. The engine is shared, not copied: `@game/*` points at `../src/game` (`native/tsconfig.json`, `native/metro.config.js`) and `native/src/engine` is the app's one door to it. `npx tsc --noEmit` passes and `npx expo export --platform ios` bundles it. |
| Names, ids, links | One file: `native/appInfo.ts` (store name, product ID, API origin, privacy and support URLs, support email). `native/app.config.ts` reads it. |
| Build workflow | `.github/workflows/ios-build.yml`: run by hand only, inputs `submit` (default false) and `profile` (default production), pinned actions and Node, one build at a time, the `.p8` key written to `$RUNNER_TEMP` and deleted in an `always()` step. |
| Test build | **Passed** on 2 November 2026 (iOS build run 3, `submit: false`): EAS build `ebc6822d-f26f-427c-b40e-ad77019b375e` on `@goodwinconnor0s-team/flipup`, build number 1, signed for the App Store with distribution certificate `E920A1A8…` and profile `44BX8YB7GT` (both expire 2 November 2027). It's the Phase 0 shell (one screen, Expo's placeholder icon), so it must not be submitted. Earlier runs: run 1 had the wrong secret name, run 2 had no signing set up; the first signing runs answered EAS's team type list with Enterprise, fixed with `EXPO_APPLE_TEAM_TYPE`. |
| Snapshot | Branch `native-rebuild` made from `claude/main` (417c33a) before any change. `main` is one fix ahead of it (#49, blank Home while scrolling on iPhone). |

---

## The rules, one by one

### 2.1 App completeness

**Apple says:** submissions must be final, "with all necessary metadata and fully functional URLs included;
placeholder text, empty websites, and other temporary content should be scrubbed." The app must be tested on a
device, the back end must be on, and 2.1(b) says in-app purchases must be "complete, up-to-date, visible to the
reviewer and functional."

**What we'll do:**
- Replace every Expo placeholder: the icon (`assets/expo.icon`, `assets/images/icon.png`) and the splash image. Done: both are drawn by `scripts/makeAppIcon.mjs`.
- Remove every `ComingNext` screen (`native/src/components/coming-next.tsx`): Phase 5 uses them as stand-ins for
  steps it hasn't built yet. `grep -r ComingNext native/src` must find nothing but the file itself, then delete it.
- `/privacy` and `/support` on gtoduel.online answer today, but only with the web app's page (the single-page
  fallback), not a policy. Make them real static pages before submitting.
- Premium must be buyable in the review build with a sandbox account, and the review notes say where it is.
- Keep the Worker up during review. `/api/health` already exists for a quick check.

### 2.3 Accurate metadata

**Apple says:** metadata, "including privacy information, descriptions, screenshots, and previews, must
accurately reflect the app's core experience." Screenshots show the app in use (2.3.3), answer the age rating
honestly (2.3.6), name at most 30 characters with no keyword stuffing (2.3.7), metadata suitable for 4+ (2.3.8).

**What we'll do:** screenshots taken from the real native build. Nothing about Campaign, roulette, blackjack or
AI Legends anywhere in the listing, since they won't be in the app. The description says plainly that chips are
play chips with no cash value. Name "FlipUp: Poker with Friends" is 26 characters; subtitle "Variants and party
nights" is 25.

### 2.5.2 Software requirements (no downloaded code)

**Apple says:** apps may not "download, install, or execute code which introduces or changes features or
functionality of the app."

**What we'll do:** everything ships in the bundle, including the engine and the bots' charts. No `expo-updates`
in version 1. If it's added later, it's only for bug fixes, never new features.

### 3.1.1 In-app purchase

**Apple says:** "If you want to unlock features or functionality within your app ... you must use in-app
purchase. Apps may not use their own mechanisms to unlock content or functionality." And: "you should make sure
you have a restore mechanism for any restorable in-app purchases."

**Subscriptions (November 2026, the owner's call): Premium is now sold as auto-renewing subscriptions.**
- One subscription group, "FlipUp Premium", with two products: `flipup.premium.monthly` at $7.00 a month and
  `flipup.premium.yearly` at $50.00 a year (`native/appInfo.ts`). Each has an introductory offer, **pay up front,
  $1.00 for 14 days** (set it per product in App Store Connect > Subscriptions > Subscription Prices > Introductory
  Offers). **TODO(owner): make the group, both products and both offers in App Store Connect before the next build**,
  and add the two ids to the review build's sandbox testers.
- The old one-time `flipup.premium.unlock` is no longer sold. Anyone who bought it keeps Premium for good (the app and
  the server both still accept it); don't remove it from sale in a way that breaks Restore.
- 3.1.2 asks for the price, the period, what renews and how to cancel next to Subscribe, plus links to the terms of
  use and the privacy policy: the Premium sheet's pinned bar has all of it (Apple's standard EULA at
  `APP_INFO.termsUrl`). Manage subscription (`deepLinkToSubscriptions`) is on the sheet once you have Premium.
- The server (`worker/premium.ts`, `entitlement.ts`) keeps each subscription's expiry from the signed transaction and
  from App Store Server Notifications (renewals move it on), with a day's grace. Set the notifications URL
  (`/api/apple/notifications`, version 2) in App Store Connect so renewals and expiries reach it.

**Before November 2026:**
- Premium is the non-consumable `flipup.premium.unlock`, sold through StoreKit (`react-native-iap` or
  `expo-iap`, whichever supports SDK 58 when we get there). The price shown comes from StoreKit, never a
  hard-coded "$9".
- A Restore Purchases button on the Premium sheet and in Settings. Done in the app (Phase 5, step 6, `expo-iap`, `native/src/state/purchase.ts`).
- The stand-in `purchasePremium()` (always succeeds) and `restorePurchase()` never ship in the native build.
- Premium never buys chips. Chips can't be bought at all (also 5.3.3).
- Recommended: the server checks a signed StoreKit 2 transaction before honouring a Premium bubble, card pack or
  game mode at an online table, because today it accepts them from any phone.

### 4.2 Minimum functionality

**Apple says:** "Your app should include features, content, and UI that elevate it beyond a repackaged website."

**What we'll do:** no web view of the web app anywhere. Native stack navigation with swipe-back, system sheets
with detents, `expo-haptics`, SwiftUI-backed controls through `@expo/ui` where React Native's don't look right,
Liquid Glass (`expo-glass-effect`) on iOS 26 and later. Bots-only play works with no network, which also helps
here.

### 4.8 Login services

**Apple says:** an app that uses a third-party or social login for the main account must also offer an
equivalent private login (Sign in with Apple is the usual one).

**What we'll do:** nothing to do. FlipUp has no login of any kind, and we won't add one.

### 5.1.1(i) Privacy policy

**Apple says:** a link to the policy in App Store Connect "and within the app in an easily accessible manner."
It must say what's collected and how it's used, that third parties protect it equally, and how data is kept,
deleted and how a person asks for deletion.

**What we'll do:** write the policy as a static page at `https://gtoduel.online/privacy` (URL kept in
`native/appInfo.ts`). It covers: the random device ID made on the phone, the friend code with its name and
emoji, what an online table or party keeps while it runs, how long each is kept (tables 3 days, parties 2 days,
friend codes 120 days after their last use, all deleted automatically), Cloudflare as the host that processes it,
no ads, no analytics, no tracking, purchases handled by Apple, and how to delete everything from the app. Link it
from Settings and from the Premium sheet.

### 5.1.1(v) Account deletion

**Apple says:** "If your app supports account creation, you must also offer account deletion within the app."
Apple's deletion page adds that automatically created accounts count ("My app automatically creates an account
for the user. Do I need to include an option to initiate account deletion? Yes.") and that "people should have
the option to delete automatically generated accounts (sometimes called 'guest' accounts)." Deactivating isn't
enough.

**Is a device ID an account?** On its own, no: it never leaves the phone except to prove a phone owns its seat.
But a **friend code** is a record on our server (a name, an emoji and the owning device ID in a `FriendCard`
Durable Object, kept for 120 days after last use) that others look up. That's a guest account in Apple's words.

**What we'll do:** add "Delete my data" to Settings. It asks once, then:
1. calls a new `DELETE /api/friends/:code` (only the owning device may) which clears that `FriendCard`,
2. leaves any open table or party,
3. wipes every `flipup.*` key on the phone, including the device ID and the friend list,
4. tells the person it's done. Premium survives because Apple keeps that record, and Restore brings it back.

### 1.2 User-generated content

**Apple says:** apps where people "create, generate, upload, share, or otherwise contribute content" need: a way
to filter objectionable material, a way to report offensive content with timely responses, a way to block
abusive users, and published contact information.

**Does it apply?** Yes, in a small way. Strangers can sit at the same online table or party by code, and each one
sees the others' chosen names and emoji. Quick messages come from a fixed list and nothing typed is ever
accepted, so there's no free chat.

**What we already have:** `src/game/names.ts` filters names on the server (`isNameBlocked()` in `lookFields()`),
and a host can remove a player (`remove`).

**What we'll add:**
- **Report** on a seat's menu and a party leaderboard row: a reason picker, sent to a new `POST /api/reports`
  that stores it with the table code and the name shown, and emails the support address (Resend is already
  connected to this project). Reports get a reply or action within 24 hours.
- **Block** on the same menus: kept on the phone. A blocked player's name and emoji are hidden on your screen and
  their quick messages are muted. If they host, you aren't seated at their table again.
- The support email shown in Settings and on the support page.
- Typed emoji (the "Type any emoji" box) go through the same server check (`isEmoji()`) so only one emoji is
  accepted.

### 5.1.2 Data use and tracking (ATT)

**Apple says:** "You must receive explicit permission from users via the App Tracking Transparency APIs to track
their activity."

**What we'll do:** no tracking, no advertising ID, no third-party analytics. No ATT prompt.
`NSPrivacyTracking` is `false` in the privacy manifest. There are no ads (the owner dropped rewarded ads on
4 November 2026).

### 5.3 Gaming, gambling and lotteries

**Apple says:** 5.3.3: "Apps may not use in-app purchase to purchase credit or currency for use in conjunction
with real money gaming of any kind." 5.3.4: real-money gaming, "such as sports betting, poker, casino games,"
needs licences and geo-restriction. The age rating page defines **Simulated Gambling** as "Betting or wagering
without using real money or in-game currency that can be exchanged for real money."

**What we'll do:** FlipUp is simulated gambling only.
- Chips are play chips: they can't be bought, sold, cashed out or swapped for anything.
- Premium unlocks looks and game modes, never chips.
- No links to real-money poker sites, no prizes.
- A short line in the app (Home footer or Settings > About, and the first table): "Play chips only. They have no
  cash value and can't be bought or won."
- The same line in the App Store description.
- Campaign (bankroll, salary, roulette, blackjack, daily spin, missions) isn't in the native build, which also
  takes out the most casino-like screens.

### Age rating

Apple's tiers are 4+, 9+, 13+, 16+ and 18+. Infrequent simulated gambling is 13+; **frequent simulated gambling
is 18+**. FlipUp is poker from start to finish, so the honest answer is **Frequent**, which makes the app **18+**.

Planned answers:

| Question | Answer | Why |
|---|---|---|
| Simulated gambling | Frequent | Every game is poker for play chips |
| Gambling (real money) | No | No real money anywhere |
| Contests | Frequent | Party mode ranks players and scores points |
| User-generated content | Yes | Player names and emoji are seen by others |
| Messaging and chat | No | Only fixed quick messages; nothing typed is sent |
| Loot boxes | No | |
| Parental controls, age assurance | No | |
| Everything else (violence, mature themes, horror, alcohol, medical, web access) | None / No | |

Regional effects: **Australia** shows R 18+. **Brazil** shows A18. **South Korea** only lists apps with frequent
simulated gambling if we give a Rating Classification Number (RCN); without one the app isn't available there.

Plan the listing around 18+: no "for kids", no "family" wording, and nothing that reads as a casino promotion.

### Export compliance

**Apple says** (Info.plist key `ITSAppUsesNonExemptEncryption`): an app that only uses encryption built into the
operating system, such as HTTPS through the system's networking, can declare it doesn't use non-exempt
encryption. Apple's own page didn't load in full during this check, so confirm the wording when App Store
Connect asks.

**What we'll do:** FlipUp only uses HTTPS and secure WebSockets through iOS. `native/app.config.ts` sets
`ios.config.usesNonExemptEncryption: false` and `ITSAppUsesNonExemptEncryption: false`, so App Store Connect
shouldn't ask the export question on each build.

### App Privacy ("nutrition label")

"Collect" means sending data off the phone where we can read it for longer than it takes to answer the request.
What FlipUp collects, all **linked to the user**, all for **App Functionality** only, **none used for tracking**:

| Apple's data type | What it is in FlipUp |
|---|---|
| Identifiers > User ID | The friend code, and the screen name shown at tables, parties and on the friend card ("screen name, handle ... assigned user ID") |
| Identifiers > Device ID | The random ID the app makes on first launch (`flipup.device`), which proves a phone owns its seat or friend code. Not the advertising ID or the vendor ID |
| User Content > Gameplay Content | Online tables and parties: seats, moves, chips and results while the table runs (deleted 3 days after it goes quiet) |
| User Content > Other User Content | The emoji picture on a friend card and at tables |

Premium: the server keeps Apple's original transaction id and the device ids it was shown on (Purchases, linked to
the device id, for App Functionality). It keeps no name, email or card details. "Delete my data" removes the device
link. Add Purchases to the label when the server check ships (see "Premium, checked on the server").

Not collected by FlipUp itself: contact info, location, health, financial info, contacts, browsing, search,
diagnostics, usage data, purchases (Apple handles the purchase; if the server later checks StoreKit transactions and keeps them, add
**Purchases > Purchase History**). Bots-only games never leave the phone.

`native/app.config.ts` writes the same four types into the privacy manifest. Keep the two in step.

### Privacy manifest (`PrivacyInfo.xcprivacy`)

Expo writes it from `ios.privacyManifests` in the app config. Required-reason APIs declared, taken from the
manifests the React Native and Expo modules ship with:

| API category | Reasons |
|---|---|
| UserDefaults | CA92.1 |
| File timestamp | C617.1, 0A2A.1, 3B52.1 |
| System boot time | 35F9.1 |
| Disk space | E174.1, 85F4.1 |

Recheck after every `npx expo install` of a native module: open the built `.ipa` and compare, since Apple emails
after upload when a reason is missing.

### Review access (draft review notes)

> FlipUp needs no account or login. To play right away, tap **Play with bots** on Home, then **Deal**. The bots
> fill the table and the game runs on the phone, so no second device is needed. To see an online table, tap
> **Play with friends**: it opens a table with a 5-letter code, and **Add bot** fills the seats. Party mode is on
> the same page: **Start a party**, pick the games, **Save playlist**, then **Open the party**.
>
> Chips are play chips only. They can't be bought, cashed out or exchanged, and there's no real-money play.
>
> Premium is an auto-renewing subscription (`flipup.premium.monthly`, `flipup.premium.yearly`, each with a 14-day $1 introductory offer). Open it from Settings > FlipUp Premium, or by
> tapping any locked card back, bubble colour or game. Buy it with a sandbox account; **Restore Purchases** is on
> the same sheet. Five game modes are free. The other eight need Premium to host; anyone can join one with a code
> for free, so only the host needs it. There are no ads and no referral rewards. To check account deletion: Settings > Delete my data.
>
> Reporting and blocking: tap a player's seat at an online table, then Report or Block.

### Performance

Measure cold start and memory on the oldest phone iOS 18 runs on (iPhone XS / XR class) and an older iPad,
using Instruments, before submitting. Today the iOS bundle is 3.1 MB of Hermes bytecode with the engine and bot
data in it. If the bots' chart data slows the first screen, load it when the first table opens instead of at
launch.

---

## Store assets

### Screenshots (checked 2 November 2026)

PNG or JPEG, no transparency, 1 to 10 per size.

| Device | Size (portrait) | Needed? |
|---|---|---|
| iPhone, Dynamic Island, medium (6.1" class) | 1179 × 2556 or 1206 × 2622 | **Required** (at least one) |
| iPhone, Dynamic Island, large (6.9" class) | 1320 × 2868, 1290 × 2796 or 1260 × 2736 | Optional, but give these: the store shows them on the biggest phones |
| iPhone, Face ID, large (6.5" class) | 1284 × 2778 or 1242 × 2688 | Only if the 6.9" set is missing |
| iPad 13" | 2064 × 2752 or 2048 × 2732 | Required only when the app supports iPad. Not for the first release (`supportsTablet` is off) |
| iPhone Duo | 1398 × 2034 outer, 2007 × 2853 inner | Optional now; required from April 2027 for apps built with the iOS 27.1 SDK or later |

Smaller sizes fall back to these, so a 6.9" set and a 6.1" set cover every iPhone. The 13" iPad set comes with
the iPad release.

### App icon

- One 1024 × 1024 square, no transparency and no rounded corners (the system masks it).
- For iOS 26 and later, make it in Apple's **Icon Composer** as a layered `.icon` file with default, dark, clear
  and tinted looks. Expo takes it through `ios.icon` (the template already points there). Older iOS versions get a
  flat image from the same file.
- Apple's icon page didn't load during this check; these are the long-standing rules. Confirm against the Human
  Interface Guidelines when the icon is made.

---

## Open items before submission

- **Rewarded ads (Bankroll's rebuy).** No ad network is connected: `native/src/state/ads.ts` opens a placeholder. Before one is connected: answer App Tracking Transparency (most networks want the IDFA; FlipUp could run them without tracking), update the App Privacy label (Advertising Data, Device ID for third-party advertising if tracked) and `NSPrivacyTracking`/`NSPrivacyTrackingDomains` in `app.config.ts`, and verify rewards on the server (`TODO` in `worker/bankroll.ts`).
- **Public boards and country.** Usernames, emojis, scores and badges are public on the Global tab. Country is optional and off by default, picked in Settings (suggested from the phone's region setting, never IP location), shown publicly on the boards, and removed with Delete my data. The hosted privacy policy needs `APP_INFO.privacyBoards` added. Board rows have Report and Block (guideline 1.2).

| # | Item | Who |
|---|---|---|
| 1 | GitHub secrets: done. The Expo token is `EXPO_API_TOKEN` | Done |
| 2 | Bundle ID `com.goodwin.flipup`, in `native/appInfo.ts` | Done |
| 3 | EAS project ID `55f84d03-0b82-48a2-9fa8-a4f76a7d112a`, in `native/appInfo.ts` | Done |
| 4 | **Support email `goodwinconnor007@gmail.com` is a placeholder** (`TODO(before launch)` in `native/appInfo.ts`). Replace it before submitting | Owner |
| 5 | Real static pages at `/privacy` and `/support` (today both return the web app) | Claude, Phase 2 |
| 6 | The first EAS build may need the Apple team type (individual or company). If the build asks, set `EXPO_APPLE_TEAM_TYPE` in the workflow | Owner says which |
| 7 | `eas submit` may need the App Store Connect app ID (the number in the app's URL) if it can't find the app from the bundle ID | Owner, if asked |
| 8 | App icon and splash made for FlipUp: done (`scripts/makeAppIcon.mjs`). Check the layered icon in Icon Composer or on a TestFlight build, since it was written by hand, not exported | Done, check on device |
| 9 | Availability: leave out **South Korea** and **China mainland** (decided 2 November 2026) | Owner sets it in App Store Connect |
| 10 | **Fix web payments.** The web's Premium purchase is still a stand-in that always succeeds. The web waits for a real payment provider before launch | Owner picks a provider, then Claude |
| 11 | ~~Google AdMob account~~ Dropped: no ads (4 November 2026). Instead: set the App Store Server Notifications V2 URL to `https://gtoduel.online/api/apple/notifications` (production and sandbox), then set `PREMIUM_ENFORCED` to `"1"` in `wrangler.jsonc` and deploy | Owner |
| 12 | **Join links open the app.** Put your Apple Developer Team ID (10 characters) in `APPLE_TEAM_ID` in `wrangler.jsonc` and deploy, so the Worker can answer `/.well-known/apple-app-site-association`. The app needs a new build too (`associatedDomains` in `app.config.ts`). Check with `curl https://gtoduel.online/.well-known/apple-app-site-association`, then tap a link in Messages on a phone with the build installed. If the domain changes, the app and the Worker both follow `apiOrigin` | Owner (the Team ID), then Claude |

---

## Every change the research asks for

Native build:
1. Leave Campaign (bankroll, salary, venues, goals, missions, daily spin, roulette, blackjack, blackjack invites)
   and AI Legends out of the native build completely.
2. Premium through StoreKit only, the price from StoreKit, a working Restore Purchases button on the Premium
   sheet and in Settings, no stand-in purchase code.
3. Never sell or give chips for money; Premium unlocks looks and modes only.
3a. Game modes: only normal Texas Hold'em free, the other games need Premium to host (free hosts also seat only the ten original bots; Range training is one set of five hands a day, and Premium has every hand). Only the host needs it; people joining
   by code don't. The server checks it (see "Premium, checked on the server"). No ads.
3b. "Type any emoji" free for everyone.
4. A "play chips only" line in the app and in the description.
5. Settings: Privacy Policy and Support links (from `native/appInfo.ts`), the support email, and "Delete my data". Done in the app (Phase 5, step 5); Restore Purchases joined it in step 6.
6. Report and Block on a player's seat and on party leaderboard rows. Done in the app (`components/player-menu.ts`, `state/blocks.ts`, Settings > Blocked players).
7. Camera permission text for the QR scanner (done in `app.config.ts`), and a clear message if it's denied.
8. No web views of the web app, native navigation and sheets, haptics (4.2).
9. No `expo-updates` in version 1; nothing downloaded that changes features.
10. No analytics, tracking or ad SDK, and no ATT prompt.
11. Privacy manifest and `ITSAppUsesNonExemptEncryption` (done in `app.config.ts`); recheck the manifest in the
    built `.ipa`.
12. Replace Expo's placeholder icon, splash and shell screen.
13. iPad support off for the first release (done in `app.config.ts`); the app still has to work in iPhone mode
    on an iPad.

Server (Cloudflare Worker):
14. `DELETE /api/friends/:code` for the owning device. Done (Phase 5, step 5), with Delete my data in the app's Settings.
15. `POST /api/reports`, stored and emailed to the support address. Done (`worker/reports.ts`, the `ReportBox` Durable Object, kept 180 days). Email needs the Worker secrets `RESEND_API_KEY` and `REPORT_TO` (and `REPORT_FROM` on a domain verified in Resend); without them reports are only stored.
16. Check a signed StoreKit transaction before honouring Premium looks or modes at an online table. Done in code
    (`worker/appleJws.ts`, `worker/premium.ts`, `worker/entitlement.ts`, enforced by `worker/index.ts` and
    `worker/room.ts`); switched on by `PREMIUM_ENFORCED` once the owner's steps in row 11 are done.
17. Static `/privacy` and `/support` pages, written in plain language.

Store listing:
18. Age rating questionnaire as above (18+).
19. App Privacy answers as above.
20. Screenshots at 6.9" and 6.1" from the real app (iPad later).
21. Review notes as drafted above.
22. Category Games, with Card as the subcategory.

---

## Questions for the owner (answered 2 November 2026)

1. Should Premium include the variants as paid modes, or only cosmetics?
   **Answer:** Yes. (Changed 11 November 2026: only normal Texas Hold'em is free, with the ten original bots and one daily range quiz; everything else is Premium.) The game modes past Hold'em are Premium, and anyone without Premium can
   (changed 4 November 2026: no ads) host a Premium game without Premium. When someone joins a Premium game with a
   code, only the host needs Premium; the people joining don't.
   - Free, in `VARIANTS` order: Texas Hold'em, Crazy Pineapple, Crazy Deuces, Ghost Hold'em, Pittsburgh.
   - Premium: Die on the River, Red River, Imposter, Crucifix, Circle Hold'em, Memory Poker, Bean
     Stalk.
2. Does the desktop version need its own layout changes beyond sharing the new tokens?
   **Answer:** Yes. Parts of it are laid out like the phone app and don't use the whole screen. The board is good,
   but some things don't line up or look bad. It should feel as easy as the phone app, but made for a desktop.
   This is Phase 6 work.
3. Do you want the iPad layout at launch, or after the iPhone version is approved?
   **Answer:** After. `supportsTablet` is now `false` in `native/app.config.ts`, so iPads run the iPhone app in
   iPhone mode and no iPad screenshots are needed for the first release. App Review can still test on an iPad in
   that mode, so it must work there.
4. Which table improvements from Phase 5 should be built?
   **Answer:** None for now. The table changes only as far as the app-wide changes reach it (tokens, sheets,
   motion, safe areas). Its core stays the same.
5. Is there anything in the current app that must not change for the first release?
   **Answer:** The table's feel, the emoji faces and their reactions, the text bubbles, the game modes, and the
   work on the bots and the game rules. Changes should keep the app's core feel and goal.
6. Is "Type any emoji" for everyone or a Premium unlock?
   **Answer:** For everyone. Premium no longer lists it.
7. What happens to Premium on the web, where the stand-in purchase always succeeds?
   **Answer:** The web waits for real payments. Fixing web payments is an open item before launch (below).
8. Leave South Korea and China mainland out of the first release's availability?
   **Answer:** Yes.

### What Premium unlocks now

Card packs, chat bubble effects, and hosting the seven Premium game modes. AI Legends and "Type any
emoji" are no longer Premium unlocks (Legends aren't in the native app; any emoji is free).

### Rewarded ads: dropped (4 November 2026)

The owner dropped rewarded ads completely. There's no ad SDK, no AdMob account, no ATT prompt, no consent form and
nothing ad-related on the privacy label. A free player who wants to host a Premium game buys Premium; everyone can
still join one for free. `unlockToHost()` in `native/src/state/unlock.ts` opens the Premium offer for the game.

### Premium, checked on the server

- **What the phone sends.** After a purchase or a restore, StoreKit 2's signed transaction goes to
  `POST /api/premium/verify`. The Worker checks Apple's signature itself (`worker/appleJws.ts`: the certificate chain
  must end in Apple Root CA G3, whose SHA-256 fingerprint is pinned in the file; every link must be signed by the
  next; the chain's dates are checked at the transaction's own `signedDate`), then that the bundle id and product id
  are ours, the environment is Production or Sandbox, it isn't revoked and isn't Family Shared.
- **What comes back.** Nothing but `ok`. The Worker ties that device id to the purchase in the `Entitlements`
  Durable Object and remembers it. There's no pass, no expiry, no renewal and no secret: the phone sends its device id
  and the server looks it up.
- **Where it's checked.** `POST /api/tables` and `POST /api/parties` refuse a Premium game when the host's device isn't
  tied to a live purchase (HTTP 402). A table's WebSocket checks the same thing when a phone connects; without
  Premium the table drops the Premium bubble and card back from that phone's `setLook` (the name and emoji stay).
  Joining is never gated.
- **Refunds.** The `Entitlements` Durable Object (`worker/entitlement.ts`, one instance named `premium`) stores
  Apple's original transaction id and the device ids bound to it (at most 6). Apple's Server Notifications V2
  (`POST /api/apple/notifications`, REFUND, REVOKE, REFUND_REVERSED) mark a purchase revoked, so every phone
  tied to it loses Premium on the server at once. On the phone, `startStore()` turns Premium off when the App Store answers and the account owns nothing.
- **Off by default.** `PREMIUM_ENFORCED` is `"0"` in `wrangler.jsonc` because the web app has no payment and would be
  locked out of Premium games and looks. Switch it to `"1"` when the iPhone app is the client that sells them.
- **Family Sharing** is off for the purchase (a shared purchase is refused by the check).
- **Not done:** Apple offer codes (unconfirmed for non-consumables), a referral reward (see `docs/PREMIUM_PLAN.md`).

- Contacts (November 2026): the Invite from contacts sheet reads names and phone numbers on the phone only, after the system permission prompt (`NSContactsUsageDescription` from the expo-contacts plugin). Nothing is uploaded, so the privacy label needs no Contacts data type; say so in review notes if asked.

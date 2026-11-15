# Submitting FlipUp 1.0 to the App Store

The owner's run-book, written 15 November 2026 after a full test and review pass. It goes in order: each step
assumes the ones above it are done. Everything Claude could do in the repository is done; everything here needs the
owner's accounts (App Store Connect, GitHub Actions with its secrets, Cloudflare through the Deploy workflow).
The rules behind each answer are in `docs/APP_STORE.md`.

## 1. Merge and deploy (GitHub)

1. Merge the App Store prep pull request into `main`.
2. Merge **#110** ("Don't show the hand recap for a restored table"): it's your own bug fix and isn't on `main` yet.
   **#111** and **#112** (six more Range training hands) are optional, but merge them now if you want them in 1.0:
   the daily hand is picked from the app's list of hands, so phones on different lists get different daily hands.
3. Actions > **Deploy** > Run workflow (on `main`). This puts the corrected privacy policy and support page live.
   Check them in a browser afterwards: https://playflipup.com/privacy should say "Last updated 15 November 2026".

## 2. App Store Connect: money and subscriptions

Without these the reviewer's Premium page says "Can't reach the App Store" and the app is rejected (2.1).

1. **Business** (Agreements, Tax, and Banking): the **Paid Apps** agreement must be **Active**, with the tax forms and
   a bank account filled in. A free app that sells subscriptions still needs it.
2. Your app > **Monetization > Subscriptions** > create a subscription group. Reference name `FlipUp Premium`; add a
   group localization (English) with the display name `FlipUp Premium`.
3. In that group, create two subscriptions. The product IDs must be exactly these (the app and the server use them):

   | | Monthly | Yearly |
   |---|---|---|
   | Reference name | Premium Monthly | Premium Yearly |
   | Product ID | `flipup.premium.monthly` | `flipup.premium.yearly` |
   | Duration | 1 month | 1 year |
   | Price (US) | $7.00 | $50.00 |
   | Display name | FlipUp Premium Monthly | FlipUp Premium Yearly |
   | Description (55 characters at most) | Every game, every bot, every training hand. | Every game, every bot, every training hand. |
   | Family Sharing | Off | Off |

   Put both on the **same level** in the group (they give the same thing; only the billing differs).
4. For each subscription: **Subscription Prices > Introductory Offers > Create**. All countries, start today, no end
   date, **Pay up front**, **1 month**, **$1.00**. (Apple doesn't allow a 14-day paid offer; its shortest pay-up-front
   offer is a month. The app reads the offer from the App Store and says "Try 1 month for $1.00".)
5. Each subscription's **Review Information**: a screenshot of the Premium page (take it on your phone from a TestFlight
   build: Play > Premium) and this note: "Opened from Premium on the Play tab. Unlocks hosting the 13 mini games, the
   full bot roster and all Range training hands. Restore is on the same page and in Settings."
6. Ignore the old one-time `flipup.premium.unlock` if it's there: don't attach it to the version.
7. Your app > **App Information > App Store Server Notifications**: Version 2, Production URL and Sandbox URL both
   `https://playflipup.com/api/apple/notifications`. Renewals, expiries and refunds reach the server this way.
8. **Users and Access > Sandbox** > add a sandbox tester (any email you control) for your own purchase tests.

## 3. Build and test (GitHub Actions, then your iPhone)

1. Actions > **iOS build** > Run workflow on `main`: profile `production`, where `github-mac`, **submit off** for this
   first run. It uploads nothing yet; it proves the build.
2. Run it again with **submit on**. The build goes to App Store Connect and shows in TestFlight after Apple processes it
   (10 to 30 minutes). If it fails on "Associated Domains" in the provisioning profile, turn on **Associated Domains**
   for the App ID `com.goodwin.flipup` in the Apple Developer site (Certificates, Identifiers & Profiles) and run again.
3. Install it from TestFlight and check, in this order:
   - Play bots > Start game: a hand plays out. Try Haunted Pot from the game swiper (it may be this week's free game).
   - Premium: both plans show real prices and "Try 1 month for $1.00". Buy one (TestFlight purchases are free and
     renew fast), close and reopen the app, Premium stays. Settings > Restore Purchases says it's back.
   - Settings: there is **no "Testing" section** any more.
   - At a table, the share button > a share card > Share > **Save Image**: it saves (this crashed the app before).
   - Host a game on one phone, Join a game on another (code and QR). Tap the other player's face: Report… and Block.
   - A join link (`https://playflipup.com/` + code) tapped in Messages opens the app.
   - Settings > Delete my data, then Premium > Restore.
   - The 8 held-back games (Secret Missions, Slide Switch, Headband, Conveyor Belt, Onion, Chain Reaction, Elevator,
     Double Board PLO) appear nowhere: not on Home, See all, the lobby's game list or the party playlist.

## 4. Screenshots (GitHub Actions)

1. Actions > **App Store screenshots** > Run workflow on `main` (dark, all screens). It takes about an hour on a Mac
   runner and uses no secrets.
2. Download **store-screenshots** from the run's page. It has two folders: `6.9-inch-1320x2868` (iPhone 17 Pro Max)
   and `6.3-inch-1206x2622` (iPhone 17 Pro). Open the run's log first: a line ending "time ran out" means that
   screen's moment didn't come in time; run it again for that screen only (the `only` box takes numbers, like `02`).
3. Upload in this order (the variants first: they're what no other poker app has): 01 Crucifix, 02 Die on the River's
   roll, 03 Home, 04 the lobby with the game code (or 04b Play bots, whichever reads better), 05 Haunted Pot,
   06 Range training's daily hand, 07 Texas Hold'em, 08 a share card. The 6.9" folder goes in the iPhone 6.9" slot;
   the 6.3" folder in the 6.3"/6.1" slot if App Store Connect shows one (smaller sizes are made from these).

## 5. App Store Connect: the listing

Version 1.0 page and App Information:

| Field | What to put |
|---|---|
| Name | FlipUp: Poker with Friends |
| Subtitle | Variants and party nights |
| Category | Games; subcategory Card |
| Promotional text | Poker night on your phones: host a table, friends join with a code, and bots fill the empty seats. Texas Hold'em plus 13 mini games with a twist. |
| Keywords | `poker,holdem,texas,cards,friends,party,bots,game night,mini games,pineapple,range,training,offline` |
| Support URL | https://playflipup.com/support |
| Marketing URL | https://playflipup.com (optional) |
| Privacy Policy URL | https://playflipup.com/privacy |
| Copyright | 2026 and your legal name or company |
| Price | Free |
| Availability | Every country except **China mainland** and **South Korea** (South Korea needs a rating number for simulated gambling) |
| Version release | Manually release this version (so you choose the day) |

**Description** (paste as it is):

> FlipUp is poker night on your phones.
>
> Host a table and your friends join from their own iPhones with a six-character code or a QR code. There are no
> accounts and nothing to sign up for. Bots fill any empty seats, each with its own style and plenty to say.
>
> Play Texas Hold'em, or one of 13 mini games with a twist. In Haunted Pot you have to beat the ghost as well as your
> friends. In Imposter everyone holds the same two cards except one player. Die on the River lets a die swap a board
> card, and Crucifix lays the board out as a cross. Every game has its own table and a short How to Play.
>
> Line up a party of 4 to 12 games and see who's on top of the board at the end of the night. No friends around? Play
> bots on your own, even with no signal.
>
> Range training gives you one real hand a day from a published strategy breakdown. Pick your play, then see why the
> expert chose theirs. Save your best hands, watch them back move by move and turn them into a share card.
>
> FLIPUP PREMIUM
> Premium lets you host every mini game and play the whole bot roster, and it opens all of Range training. Friends
> always join your games free. Premium is an auto-renewing subscription, monthly or yearly, with an introductory offer
> for new subscribers. Payment is charged to your Apple Account, and a subscription renews unless you cancel it at
> least 24 hours before the end of the period. Manage or cancel it in your Apple Account settings.
> Terms of use: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
> Privacy policy: https://playflipup.com/privacy
>
> PLAY CHIPS ONLY
> FlipUp is for entertainment. Chips have no cash value and can't be bought, sold, won or exchanged. FlipUp doesn't
> offer real-money gambling.

**Age rating** (gives 18+, the honest answer for poker throughout): Simulated Gambling **Frequent**; real gambling
**No**; Contests **Frequent** (party boards rank players); User-Generated Content **Yes** (names and emoji); Messaging
and Chat **No** (fixed quick messages only); Advertising **No**; Unrestricted Web Access **No**; Loot Boxes **No**;
Parental Controls and Age Assurance **No**; everything else **None**.

**App Privacy**: Data is collected. Types: Identifiers > **User ID** and **Device ID**; User Content > **Gameplay
Content** and **Other User Content**; Purchases > **Purchase History**. For each: linked to the user **Yes**, used for
tracking **No**, purpose **App Functionality** only. Nothing else (no contacts, photos, location, diagnostics or usage
data: contacts and photos never leave the phone). Privacy policy URL as above.

**App Review Information**: sign-in required **No**; your name, phone and email as the contact; the notes are the
block under "Review access" in `docs/APP_STORE.md` (copy it without the `>` marks).

**In-App Purchases and Subscriptions** (on the version page): add both subscriptions, so they're reviewed with the
app. A first subscription can only be approved together with an app version.

**Build**: pick the TestFlight build from step 3. Export compliance is already answered in the build (it uses only
Apple's own HTTPS), so it shouldn't ask.

**Content rights**: App Store Connect asks whether the app shows third-party content. Range training describes hands
from published articles (seats, cards, the action and the author's answer, with a link to each source) and doesn't copy
their text or pictures. That's your call; if you're unsure, answer Yes and keep the source list in
`docs/RANGE_SOURCES.md` handy.

## 6. Submit

Press **Add for Review**, then **Submit to App Review**. Keep the server up during review (`/api/health` answers
`{"ok":true}`) and watch the support inbox: reports and Apple's messages land there. When it's approved, press
**Release**. After release, the Share FlipUp and Rate FlipUp rows in Settings start working (the App Store page doesn't
exist until then).

## What only the owner can do

- Everything in App Store Connect (steps 2, 5 and 6) and the Apple Developer site.
- Run the Deploy, iOS build and App Store screenshots workflows (they use the repository's secrets and macOS minutes).
- Merge pull requests.
- Send one test report from the app after Deploy, to confirm the report email arrives (the Worker's `RESEND_API_KEY`,
  `REPORT_TO` and `REPORT_FROM` secrets can't be read from here).

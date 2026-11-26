# Submitting FlipUp 1.0 to the App Store

The owner's run-book, written 15 November 2026 after a full test and review pass. It goes in order: each step
assumes the ones above it are done. Everything Claude could do in the repository is done; everything here needs the
owner's accounts (App Store Connect, GitHub Actions with its secrets, Cloudflare through the Deploy workflow).
The rules behind each answer are in `docs/APP_STORE.md`.

## 1. Merge and deploy (GitHub)

Done by Claude on 16 November 2026: the clean-up pull request is merged and deployed, so the website is the landing
page and the server has no Friends, Bankroll, Campaign or Blackjack left. Check https://playflipup.com shows the
landing page and https://playflipup.com/privacy says "Last updated 16 November 2026".

**The waitlist's owner key** (once): make a long random password (at least 24 characters, for example from your
password manager), add it in GitHub as a repository secret named `WAITLIST_TOKEN` (Settings > Secrets and variables
> Actions), then run Actions > **Deploy** again. The Deploy workflow copies it to the Worker. Then you can see how many
people have signed up:

```
curl -H "Authorization: Bearer YOUR_TOKEN" https://playflipup.com/api/waitlist/count
```

The confirm emails go out from the address your report emails use (the `REPORT_FROM` Worker secret, as `hello@` on
the same domain), or `hello@mail.playflipup.com` when that isn't set. That domain must be verified in Resend. Sign up
once yourself on https://playflipup.com and check the confirm email arrives (look in spam too).

## 2. App Store Connect: check the subscriptions

You've made the subscriptions. Run Actions > **App Store Connect check** (no inputs). It reads them with the same
App Store Connect key the iOS build uses and prints `ok` or `FIX` for each thing the app and server rely on:

- Both product IDs exactly `flipup.premium.monthly` and `flipup.premium.yearly`, in one group, 1 month and 1 year.
- US prices $7.00 and $50.00 (a different price is fine if you chose it; the app shows whatever the App Store says).
- An introductory offer on each (the plan was pay up front, 1 month, $1.00; the app words whatever is set).
- A localization (display name and description) and a review screenshot on each.
- Family Sharing off (the server ties Premium to one purchase).
- App Information > **App Store Server Notifications**: Version 2, with production and sandbox URLs both
  `https://playflipup.com/api/apple/notifications`, so renewals, expiries and refunds reach the server.

It can't see these, so check them by hand: **Business** (Agreements, Tax, and Banking) has the **Paid Apps**
agreement **Active** with tax and bank filled in (without it the Premium page says "Can't reach the App Store" and
review rejects the app), and **Users and Access > Sandbox** has a tester for your own purchase tests. The review note
for each subscription: "Opened from Premium on the Play tab. Unlocks hosting the 12 mini games, Bot Lab, every bot
and all Range training hands. Restore is on the same page and in Settings."

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
   - A join link (`https://playflipup.com/` + code) tapped in Messages opens the app. On a phone without the app it
     shows the small join page with the code and Open in FlipUp.
   - There is no Friends tab, no friend rows anywhere, and the app never asks for Contacts.
   - Settings > Delete my data, then Premium > Restore.
   - Only the 13 games show (Texas Hold'em and 12 mini games). The 8 newer ones and Imposter are out of the app's code entirely
     and kept in `parked/games/` for later.

## 4. Screenshots (already made, in `store/`)

The nine slides are finished: `store/screenshots/6.9in-1320x2868/` and `store/screenshots/6.3in-1206x2622/`, each
`01-friends.jpg` to `09-bots.jpg` in upload order (what each shows is in `store/README.md`).

1. On the version page, **Previews and Screenshots**: upload the 6.9" folder into the iPhone 6.9" slot and the 6.3"
   folder into the 6.3" slot, 01 to 09 in order (App Store Connect makes the smaller sizes from these).
2. Optional key art (the header and search banner on newer iOS): `store/creative/universal-belts-13.png`. Not the
   22-game one until those games are back in the app.
3. One slot of ten is free, kept for the update that brings back the parked games.

## 5. App Store Connect: the listing

Version 1.0 page and App Information. Your App Store seller and legal name: Clodex Studios Pty Ltd (the owner's company, 25 Nov 2026; Apple asks for a company for simulated gambling, guideline 5.1.1(ix)).

| Field | What to put |
|---|---|
| Name | FlipUp: Poker with Friends |
| Subtitle | Texas Hold'em + 12 mini games |
| Category | Games; subcategory Card |
| Promotional text | Poker night on your phones. Host a table, friends join with a code, bots fill the empty seats. Texas Hold'em, 12 mini games and a daily range trainer hand. |
| Keywords | `holdem,gto,trainer,range,training,strategy,multiplayer,party,bots,offline,card,chips,night,pineapple` (100 of 100 characters; words in the name and subtitle are left out because Apple indexes those already) |
| Support URL | https://playflipup.com/support |
| Marketing URL | https://playflipup.com |
| Privacy Policy URL | https://playflipup.com/privacy |
| Copyright | 2026 Clodex Studios Pty Ltd |
| Price | Free |
| Availability | Every country except **China mainland** and **South Korea** (South Korea needs a rating number for simulated gambling) |
| Version release | Manually release this version (so you choose the day) |

**Description** (paste as it is):

> FlipUp is poker night on your phones.
>
> PLAY WITH FRIENDS
> Host a table and your friends join from their own iPhones with a six-character code or a QR code. No accounts,
> nothing to sign up for. Bots fill any empty seats, each with its own style and plenty to say.
>
> 13 WAYS TO PLAY
> Texas Hold'em, plus 12 mini games with a twist. Throw a card away in Crazy Pineapple. Roll a die to swap the river
> in Die on the River. Beat the ghost as well as your friends in Haunted Pot. Read the board as a cross in Crucifix.
> Every game has its own table and a Demo: a quick hand with a guide that shows you what to tap.
>
> PARTY NIGHTS
> Line up 4 to 12 games and see who tops the board at the end of the night.
>
> BOTS WORTH PLAYING
> No one around? Play bots on your own, even with no signal. They open from real GTO preflop charts, read the board and
> remember how you play.
>
> RANGE TRAINER
> Sharpen your strategy with one hand a day. Make your call, then see the best play, what each option wins and how
> often you're ahead of every hand they could hold.
>
> SAVE AND SHARE
> Save your best hands, replay them move by move, and turn them into share cards.
>
> FLIPUP PREMIUM
> Premium lets you host every mini game, make your own bots in Bot Lab and opens all of the range trainer, with more share
> card designs, card backs and a gold name. Friends always join your games free. Premium is an auto-renewing
> subscription, monthly or yearly, with an introductory offer for new subscribers. Payment is charged to your Apple Account, and a subscription renews unless you cancel it at
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

**Content rights**: App Store Connect asks "Does your app contain, show, or access third-party content?" The safe
answers are **Yes**, then **Yes, I have the necessary rights**. FlipUp has two kinds of third-party material, and you
have the rights to both:

- The table sounds `deal`, `flip`, `fold`, `check`, `chip` and `place` are recordings from Kenney's Casino Audio pack,
  released under CC0 (public domain): free to use in a paid app with no credit needed.
- Range training's hands are modelled on hands from published strategy articles and videos. The app uses the facts of
  each hand (seats, stacks, cards and the action), which aren't anyone's property, writes every explanation in its own
  words, quotes nothing and shows no source names, links or pictures (the owner's call, 17 Nov 2026: neither the app,
  the website nor the store page says where a hand came from). `docs/RANGE_SOURCES.md` keeps the list for the record,
  and for asking the authors' permission. Whether to rely on the facts alone or get that permission is the owner's
  decision; App Review can ask for proof of rights (guideline 5.2.1).

Everything else (the icon, the game pictures, the bots' lines, the text) was made for FlipUp. Saying Yes costs
nothing and matches the truth; saying No would be wrong because of the sounds and the sourced hands.

## 6. Submit

Press **Add for Review**, then **Submit to App Review**. Keep the server up during review (`/api/health` answers
`{"ok":true}`) and watch the support inbox: reports and Apple's messages land there. When it's approved, press
**Release**. After release, the Share FlipUp and Rate FlipUp rows in Settings start working (the App Store page doesn't
exist until then).

## What only the owner can do

- Everything in App Store Connect (steps 2, 5 and 6) and the Apple Developer site.
- The `WAITLIST_TOKEN` secret (step 1), and on launch day the waitlist email (below).
- Run the Deploy, iOS build and App Store screenshots workflows (they use the repository's secrets and macOS minutes).
- Merge pull requests.
- Send one test report from the app after Deploy, to confirm the report email arrives (the Worker's `RESEND_API_KEY`,
  `REPORT_TO` and `REPORT_FROM` secrets can't be read from here).

## Launch day: email the waitlist

Once FlipUp is live on the App Store:

1. In `site/landing.ts` set `LAUNCHED = true` (the waitlist form becomes a Get it on the App Store button), merge,
   and run Deploy.
2. Send the email. It goes to everyone who confirmed, at most 300 a call, and deletes each address as it's sent, so
   run it again until it says `"left": 0`. With `{}` it sends the standard email (subject "FlipUp is on the App
   Store", two lines and the App Store link); to word it yourself, send `{"subject": "...", "lines": ["...", "..."]}`
   and put the link in a line.

```
curl -X POST https://playflipup.com/api/waitlist/launch \
  -H "Authorization: Bearer YOUR_TOKEN" -H "content-type: application/json" -d '{}'
```

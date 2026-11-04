# FlipUp Premium: plan to make it real

Status (4 November 2026): phases 1 to 3 and most of 4 are built; what's left is in "What's left" below. Written after reading `native/src/state/purchase.ts`, `native/src/app/premium.tsx`,
`native/src/state/unlock.ts`, `worker/room.ts`, `worker/index.ts`, `src/game/validate.ts` and `docs/APP_STORE.md`.

## 1. Where Premium stands today

What works:
- The purchase itself. `purchase.ts` runs StoreKit 2 through `expo-iap` for the one non-consumable
  `flipup.premium.unlock`, loads the price from the App Store, handles Ask to Buy, and has Restore Purchases.
- `flipup.premium` is a local true/false flag, set only by a purchase or restore.

What is missing or only a stand-in:
1. **The server trusts every phone.** `parseAction()` only checks that a bubble or card pack id is a real id, and
   `/api/tables` and `/api/parties` accept any game. Nothing server-side knows who bought Premium, so a modified client
   gets every look and every game for free. `docs/APP_STORE.md` already lists this as a recommended fix.
2. **The Premium games aren't really locked.** `unlockToHost()` returns `true` for everyone (the ad is a TODO), and only
   `party-setup.tsx` calls it. A plain table with a Premium game never hits the gate at all.
3. **No refund or revocation.** Once the flag is on, nothing turns it off, even if Apple refunds the purchase.
4. **The Premium screen is thin.** Three one-line perks and a fan of card backs. It doesn't show the games, doesn't let
   anyone try a look, doesn't say that friends join Premium games free, and has no states for Ask to Buy waiting,
   store unreachable, or bought-but-not-synced.

## 2. What Apple allows (read this before building the referral part)

The text pasted into this chat is a summary of the rules, not Apple's wording. Apple's own words are in Guideline 3.1.1,
quoted in `docs/APP_STORE.md`: apps "may not use their own mechanisms to unlock content or functionality". The useful
reading of both:

- Anything Premium sells (the seven games, the eleven card packs, the eleven bubble effects) may only be unlocked by a
  StoreKit purchase, or by an Apple mechanism such as an offer code. Our own logic must not hand it out.
- That rules out "invite 3 friends, get a week of Premium", and it also rules out my earlier idea of giving one of the
  Premium card packs as a referral reward. That would be unlocking paid content by our own rule. I got that wrong
  before: a referral reward has to be an item Premium doesn't include and nobody can buy.
- Rewarding the person who invites is the safer side. Rewarding the new person for installing is what gets flagged.
- Explain any referral mechanics in the App Review notes.

Two things to confirm before we rely on them (I haven't verified either from Apple's pages):
- Whether offer codes now work for non-consumable purchases in App Store Connect. If they do, they are the official way
  to give Premium away (reviews, giveaways, friends of the team).
- Whether `expo-iap` hands back the signed StoreKit 2 transaction in `purchase.purchaseToken` on iOS. The server design
  below depends on it.

## 3. Decisions (made 4 November 2026)

1. **No ads, and no Game of the Day.** Rewarded ads are dropped completely. A free player who wants to host a Premium
   game buys Premium; everyone can still join any game for free.
2. **Family Sharing: off.** The server refuses a transaction whose ownership type isn't `PURCHASED`.
3. **No launch-price message.** The price is whatever the App Store says.
4. **No pass, no secret.** The server remembers which devices are tied to a purchase and looks the device id up. No token
   and no expiry (changed 4 November 2026).
5. Referral reward: still open, after launch (phase 6).

## 4. Build plan

### Phase 1: the server learns who bought Premium

Goal: a phone proves it owns Premium once, and tables can check that cheaply.

- New Durable Object `Entitlements` in `worker/entitlement.ts` (binding `ENTITLEMENTS`, a new migration in
  `wrangler.jsonc`, then `npm run cf-typegen` and commit `worker-configuration.d.ts`). Keyed by Apple's
  `originalTransactionId`, so the same Apple account is one entitlement across phones. It stores the device ids bound
  to it (cap about 6), the first-seen time, and a `revoked` flag.
- `POST /api/premium/verify` with `{ device, signedTransaction }`. The Worker verifies the StoreKit 2 JWS on its own:
  signature, the certificate chain up to Apple's root, bundle id, product id, environment, and no `revocationDate`. It
  needs no Apple key for this, only WebCrypto. On success it binds the device to the purchase and answers `ok`. There is no token: the 7 day
  pass was removed on 4 November 2026, and so was the secret.
- `POST /api/apple/notifications`: App Store Server Notifications V2 (the webhook). Verified the same way. REFUND and
  REVOKE mark the entitlement revoked, so the device stops counting as Premium straight away. The URL is set in App Store Connect by the owner.
- `TableRoom` asks the `Entitlements` object about the `?device=` id when a socket connects. Parties and table creation
  ask it about the host's device id.
- Tests (Vitest, with a throwaway CA built in the test so nothing real is needed): good transaction, wrong bundle id,
  wrong product, revoked, expired chain and tampered payload.

### Phase 2: enforce it where it matters

- **Looks.** `TableRoom` drops `bubble` and `cardPack` from a `setLook` unless the socket's device owns Premium. A
  refund mid-table keeps the look for that hand, then falls back to plain at the next deal (no jarring mid-hand
  change).
- **Games.** `/api/tables` and `/api/parties` refuse a Premium game unless the host's device owns Premium. Joining is
  never gated: guests play any game.
- **The phone side of the gate.** `unlockToHost()` is real and every host path calls it, including the plain
  table in Setup, not just `party-setup.tsx`. On "no", it opens the Premium sheet with a reason (see phase 3).
- Bots-only tables stay as they are: nobody else sees them, so the local flag is enough there and works offline.
- Tests: the reducer is untouched. Add Worker-level tests for each refusal and a `unlockToHost` unit test. The
  "keeps every chip accounted for" test must still pass.

### Phase 3: the Premium screen

The screen should sell Premium by showing it. Layout, top to bottom:

1. **Header.** The fan of card backs (keep), a headline that matches why you opened it ("Host Imposter with Premium",
   "Get the Galaxy cards", or the default), and one line under it.
2. **"Friends play free."** A strip right under the header: only the host needs Premium, everyone joins by code for
   free. This is the strongest argument, so it goes first.
3. **The seven games.** The `GameThumb`s with their crowns, a one-line twist each, and a tap that opens How to Play for
   that game. The tapped game (if any) comes first.
4. **Card packs.** A sideways strip of all eleven backs, each with its name. Tapping one shows a full-size card that
   flips, so people can see it before buying.
5. **Chat bubbles.** Live samples of the eleven effects on the real bubble capsule, with a looping typing animation
   (still under Reduce Motion).
6. **Free or Premium.** A short two-column list: 5 games or 12, 1 look or 12, and so on, from real counts in the code
   (`VARIANTS`, `CARD_PACKS`, `BUBBLE_STYLES`), not typed numbers.
7. **Price bar, pinned at the bottom.** "Unlock for $X" with the price from StoreKit, then "Restore Purchases" and
   "Redeem a code" (Apple's code sheet, only if offer codes are confirmed), Terms and Privacy links, and the one-line
   "one-time, never chips" note.

States to design and test: price loading, store unreachable (with Retry), purchase in progress, **Ask to Buy pending**
("Waiting for approval. You'll get Premium when it's approved"), success (confetti, then "Try your new looks" linking
to card packs and bubbles), already owned, restore found nothing, and **bought but not yet verified by the server**
(Premium works on this phone at once, verification retries in the background, quiet message only if it keeps failing).

Rules for the screen: the palette in CLAUDE.md (violet and gold, night card), Dynamic Type, VoiceOver labels,
Reduce Motion, haptics per `docs/MOTION.md`, SF Symbols only. Nothing says "limited time" unless it's true.

### Phase 4: lifecycle and honesty

- `checkOwned()` in `purchase.ts` also turns Premium **off** when the App Store says this account no longer owns it
  (refund, family removal). Only when the store answered; never on an error or when offline.
- Delete my data removes the device's binding on the server (the entitlement stays with Apple, so Restore brings it
  back). Update the privacy policy and the App Privacy answers: we now keep a purchase record tied to a device id.
- A Settings row shows Premium status (Active, Restore, Redeem a code).
- A server outage never takes anything away from someone on their own bots table.

### Phase 5: App Store Connect and review

- The IAP's name, description, price, screenshot of the new screen, and review notes (where Premium lives, the sandbox
  account, that there are no ads, and any referral mechanic).
- Family Sharing is off (section 3).
- A local StoreKit configuration file for testing, then a TestFlight pass with a sandbox account covering: buy, cancel,
  Ask to Buy, restore on a second phone, refund, airplane mode.
- Update `docs/APP_STORE.md` (the server-check recommendation becomes "done" and describes how) and `CLAUDE.md`.

### Phase 6: referral reward (after launch, if approved)

- Reward the inviter only. The new player gets nothing extra.
- The reward is a **Friends-only item that Premium doesn't include and nobody can buy** (for example a "Plus One" card
  back and a matching bubble). It unlocks no game, no pack, no bubble from the Premium list, and no time.
- A friend counts when the **server** sees them play their first hand at a table the inviter hosted or joined (so a link
  click or an install alone counts for nothing). One reward per friend, per-device and per-day caps, and a table
  of invitees stored against the inviter's friend code.
- Apple offer codes are the official tool for giving away real Premium.
- Describe the mechanic in the review notes.

## 5. Order and size

Phase 1 and phase 3 don't depend on each other and can run side by side. Phase 2 needs phase 1. Phase 4 and 5 come
after both. Phase 6 waits for launch.

Rough weight: phase 1 is the hardest (Apple's signature check), phase 2 is wide but simple, phase 3 is the most visible
work, and phases 4 and 5 are small but easy to forget. Use Opus 5.5 at high for phases 1 and 2, and the same or Sonnet
5.5 at high for phase 3.

## 6. Do not

- Don't unlock Premium content by any rule of our own: a referral, a streak, a time, a code we generate.
- Don't hard-code the price. Don't show a price we don't sell.
- Don't touch the poker rules or `redactForDevice()`.
- Don't commit secrets. Don't ship the web stand-in purchase.

## 7. What's built, and what's left

Built (all typechecked; unit tests for the Apple signature check and the gate):
- Phase 1: `worker/appleJws.ts`, `entitlement.ts` (the `Entitlements` Durable Object, migration
  v8), `premium.ts`, the routes `/api/premium/verify|forget` and `/api/apple/notifications`.
- Phase 2: `src/game/premiumGate.ts`, the gate in `createTableRoute`, the party route and `TableRoom`, and
  `unlockToHost()` called from Setup and party setup.
- Phase 3: the rebuilt `native/src/app/premium.tsx`, with Ask to Buy and error states.
- Phase 4: refund turns Premium off at launch (when the App Store answers), Delete my data forgets the device.

Left for the owner (nothing here can be done from the code):
1. In App Store Connect, set the Server Notifications V2 URL (production and sandbox) to
   `https://gtoduel.online/api/apple/notifications`.
2. Deploy, then set `PREMIUM_ENFORCED` to `"1"` in `wrangler.jsonc` and deploy again. Do this only when the iPhone app is
   live, because the web app has no payment and would lose Premium games and looks.
3. Test on a real phone with a sandbox account: buy, cancel, Ask to Buy, restore on a second phone, refund, and
   airplane mode. I couldn't run StoreKit here.
4. Confirm Apple's root fingerprint in `appleJws.ts` against https://www.apple.com/certificateauthority/ and that
   `expo-iap` returns the signed transaction in `purchase.purchaseToken` (the code assumes both).
5. Add Purchases to the App Privacy answers (see `docs/APP_STORE.md`) and the privacy page.

Not built: Apple offer codes (unconfirmed for non-consumables) and the referral reward (phase 6).

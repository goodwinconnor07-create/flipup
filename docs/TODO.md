# FlipUp: improvement list

The single record of the big batch of fixes and changes. Every item has an ID. A stage ticks its items off when they're done and checked, and updates `CLAUDE.md` where the change makes a note there stale. Nothing leaves this file until it's ticked.

## Ground rules (decided)

- **Phone only.** No changes to `src/styles/desktop.css`, the desktop stage or the side panel. Anything new must still not break them (run the app at desktop size once to check nothing is broken, don't redesign it).
- FlipUp is an installed web app on iPhone (no native project in the repo). "iOS only" means: design and test for iPhone-sized screens, use iOS conventions (pull to refresh, haptics, sheets).
- The server (`worker/`) is still in scope where a feature needs it (friend requests, table invites). Those are the only server changes.
- Friend requests: the sender is taken to have agreed. The receiver must accept. Friends already on a list stay as they are.
- Small changes don't need screenshots. Stage 7 (and anything marked SHOT) does.
- Every stage ends with `npm run check`, a commit, ticking this file, and updating `CLAUDE.md`.
- Follow the UI rules in `CLAUDE.md`: tokens only (no new hard-coded values), 4px grid, respect `prefers-reduced-motion`, plain writing in any copy.

## Stage order and settings

| Stage | What | Model | Effort |
|---|---|---|---|
| 1 | Table quick wins | Sonnet | low |
| 2 | Personal box and card-back chips | Sonnet | medium |
| 3 | Bot chat | Sonnet | medium |
| 4 | Friends: refresh, requests, badge | Opus | high |
| 5 | Gradients and grain background | Sonnet | medium |
| 6a | Setup: game carousel and settings table | Opus | high |
| 6b | Setup: invite friends and bots rows | Opus | high |
| 6c | Play with bots flow | Sonnet | medium |
| 7 | Center of attention and fold shelf | Opus | max |
| 8 | Final sweep | Sonnet | medium |

---

## Stage 1: Table quick wins

Files to start from: `src/screens/table/Actions.tsx`, `table/Pods.tsx`, `Table.tsx`, `src/styles/table.css`, `src/ui/components.tsx`.

- [x] **T1 Raise panel all green.** The raise slider and its quick-bet buttons use purple on some and green on others. Make every one of them green (same token). Check the slider thumb, the track fill, the preset chips (1/2 pot, pot, all-in and whatever else is there), the confirm button and the pressed and disabled states.
- [x] **T2 Call button blue again.** Restore the system-blue (accent token) Call button. Check the "Call 40" label state and the pre-action versions (Call current, Call any) keep matching colours.
- [x] **T3 BTN outline glitch.** The dealer button currently shows a stray outline artifact. Find the cause (likely a border plus box-shadow or a clipped pseudo-element), fix it in the current location. Stage 2 later moves position chips onto the card backs, but this fix stands on its own, so the BTN is clean in the meantime.
- [x] **T4 Gold turn glow behind a player's emoji.** When it's a player's turn (bots and people, not your own box, which is P2), a very subtle gold glow sits behind their emoji. Soft, low opacity, no pulsing faster than a slow breathe; none under reduced motion (static glow only). Goes with the other glow rules: no ambient glow behind screens, this is on the seat only.
- [x] **T5 Remove mood reactions.** Remove the seat emoji reactions: shake, sweat drop (💦), fire (🔥 on a shove), sparkles on a win, 💔, dizzy stars, droop and the fold slump. Remove `MoodFace`/`moodOf()` behaviour and its CSS at the end of `table.css`. Keep the plain emoji face. Delete dead code and tests that only tested reactions. Remove the "Seat reactions" and "Reacting faces" notes from `CLAUDE.md`. (Chat bubbles stay.)
- [x] **T6 Pot chip becomes a chip stack.** The chip next to the "Pot" pill turns into a stack that grows with the pot. Five versions (suggested bands by big blinds in the pot: under 5, 5 to 15, 15 to 40, 40 to 100, over 100; tune so it feels right in play): 1 chip, a small stack, a taller stack, a stack plus a second stack, a big pile. Same footprint as today or slightly more, and the image never grows past that: bigger pots just show the next version. Switching versions should pop in (short scale), not jump. Reduced motion: swap instantly.
- [x] **T7 After-hand buttons.** After a hand, "Next hand" should not take the whole row: leave a small gap to its left, and add a "Show cards" button in that space. Only available after the hand ends (not during play, not before the showdown is settled). Your greyed-out cards turn white when you tap it, as the feedback, and the choice is sent as the existing show action (check `reveal`/show handling in the reducer so a rule isn't broken, and read `docs/RULES.md`). Online, only your own cards.
- [x] **T8 Table menu icons.** In the table menu, End game, Leave game and Home become large app-style icons in one row at the top with the label under each. Sit out becomes a larger button too (same row if it fits, otherwise directly below at the same size). Bots-only games have no Leave game (it wouldn't run without you): show End game and Home only. Make the row adapt to two, three or four icons without looking empty. Keep the rest of the menu as it is.

## Stage 2: Personal box and card-back chips

Files: `table/Pods.tsx`, `src/ui/` playing card component, `src/styles/premium.css` (card packs), `table.css`, `global.css` tokens.

- [ ] **P1 Chat bubble position.** Your own text bubble stops sitting inside your box. It sits on the outside of the box, slightly overlapping the top-left corner, as a real pill (the same look as the text bubble, scaled down, not the same size). Must not cover your cards or your chip count.
- [ ] **P2 Quick message / bubble on the right.** The existing bubble that is inside the box now moves to the top-right corner, sitting between the outside edge of the box and the card (as described: "top right hand corner between the outside of the card"). Confirm during the build which element this is (the quick-message / reaction pill vs the speech bubble) and keep one on each corner without them colliding. If unclear, ask.
- [ ] **P3 Chip number bigger.** Your chip count is the largest text in the box.
- [ ] **P4 Name and emoji at the bottom.** Name and emoji sit under the chip number, right at the bottom of the box.
- [ ] **P5 Your turn glow.** On your turn the whole box glows gold. Soft, no layout shift, ends the moment the turn ends. Static under reduced motion.
- [ ] **C1 Position chips on card backs.** Players' card backs carry their table position. Applies to bots especially, and to every seat. Example for the small blind: one of the two cards shows the normal bot or pack design, the other shows a subtle "SB" chip on its back. Do the same for BB, BTN (and UTG or other positions only if it reads clearly; at minimum SB, BB, BTN). Heads-up: BTN is also the SB, so decide and note which chip shows. It must work with the Premium card packs (`.pk.pack-<id>`) and with campaign trophy backs. The chip stays subtle: small, low contrast, readable at the size of an opponent's cards.
- [ ] **C2 Remove old BTN badge usage where replaced.** Once the chip is on the card back, make sure the dealer button isn't drawn twice (keep one clear marker). Check this at 2 players, 6 players and 9 players.
- [ ] **C3 Check the flip.** The chip is on the back only. When cards flip to the face, nothing is left behind.

## Stage 3: Bot chat

Files: `src/game/chat.ts`, `botTalk.ts`, `botLines.ts`, `legendTalk.ts`, `table/Bubbles.tsx`, `scripts/chatLab.ts`, `e2e/chat-timing.spec.ts`, `docs/CHAT.md`.

- [ ] **B1 Slower, readable.** Slow down the ticker so a person has time to read: lower the letters-per-second, raise the hold time on the last words, raise the cap on a whole line (currently 3.4s), and slow the gaps between speakers. Set the target: any line can be read at normal pace with a second to spare. Measure with `chatLab` and `chat-timing.spec.ts` and update their thresholds.
- [ ] **B2 Chattier.** Bots speak more often (adjust the per-style odds in `botTalk.ts`) without any one bot dominating. Keep the `talkDone` rule so a bot waits for its own line to finish before moving, and keep the "stale line gets dropped" rule.
- [ ] **B3 More lines, more personal.** Add many new lines (aim to roughly double the library) across the existing events and add new events where useful: by street, by opponent's move, by pot size, after a bad beat, during a long hand, after being bluffed, about the person at the table by name (`{you}`), about the bot's own stack, about the position they're in, about the hand number. Lines should read like a character, in the style's voice (keep legends in their own voice). Ids only grow at the end of the arrays (see `botLines.ts`). No buzzwords.
- [ ] **B4 Bots-only drama.** In bots-only games, a bot that has something to say before a reveal can slow the moment: a longer pause before the flop, turn, river or showdown flip while the line is said, and the next card waits for the talk. Keep it skippable-feeling: never longer than a few seconds, scaled down under "Fast bot games". Online tables are not changed (they stay out of scope).
- [ ] **B5 Update tests and docs.** `docs/CHAT.md` and the chat note in `CLAUDE.md` updated with the new timings.

## Stage 4: Friends (refresh, requests, badge)

Files: `src/state/pals.ts`, `worker/friendCard.ts`, `/api/friends` routes in the worker, `src/screens/HomeParty.tsx` (Party tab), `sheets/CodeSheets.tsx` (`AddPalSheet`), BjInvite banner code for polling reference (`watchInvites()`), tests for the worker.

- [ ] **F1 Fix the stale list.** Adding a friend doesn't show without leaving and re-entering. Find why (state not updating after add, list read once on mount) and fix so the new friend appears at once.
- [ ] **F2 Pull to refresh.** On the Party tab (friends list), swipe down to refresh, the iPhone way, with haptic tick when it triggers. Also refreshes on tab focus.
- [ ] **F3 Skeleton loader.** While refreshing, show skeleton placeholders for the friend boxes only. Everything else on the screen stays put and visible. No thin top bar. Skeleton uses a gentle shimmer (CSS transform based, off under reduced motion).
- [ ] **F4 Friend requests (server).** Adding a friend by code now sends a request. The sender is added on their side straight away (they agreed by sending). The receiver sees a pending request and must accept or deny. Stored on the receiver's `FriendCard`. Denying removes the request quietly (no message to the sender; the sender's list shows them as "pending" until it's cleared or they're accepted). Handle: duplicate requests, a request from someone you already have, both people adding each other at the same time (auto-accept), a code that doesn't exist, rate limits so a phone can't spam one code. Owner check stays: only the phone that owns a card can read its requests.
- [ ] **F5 Incoming Friend Requests section (UI).** A temporary section at the top of the friends list called "Incoming Friend Requests". Each row: their profile (emoji, name), an Accept button and a Deny button. The section disappears when empty. Accept moves them into Friends with a short animation.
- [ ] **F6 Arrives on its own.** A request shows up within a few seconds without the person doing anything: poll `GET /api/friends/:code/requests` about every 5 seconds while the app is open (and on resume from background), the way `watchInvites()` does for blackjack. Pull to refresh also loads it. Keep polling cheap (one request, a cheap server read, stop when hidden).
- [ ] **F7 Red notification pill.** The Party tab icon (and the Friends heading) shows a small red pill with the count of pending requests ("1", "2"…). Same pill on whichever entry point holds Friends. It disappears at zero. Requests can also be accepted or denied from the pill: tapping it opens a small sheet listing the requests with Accept and Deny.
- [ ] **F8 Pending state on the sender.** The sender sees their new friend marked "Pending" until the receiver accepts. If it's denied, the entry quietly goes away at the next refresh.
- [ ] **F9 Tests.** Worker or unit tests for the request flow (send, accept, deny, duplicate, mutual), plus an e2e for the sheet. Update the Friends note in `CLAUDE.md`.

## Stage 5: Gradients and grain background

Files: `src/styles/global.css` (`--party-*` tokens), `home.css`, `campaign.css`, `premium.css`, `src/ui/theme.ts`, plus a shared background component.

- [ ] **G1 Audit every gradient.** List all gradients in the CSS (tokens and one-offs), and soften each: lower saturation and contrast a bit. Keep text contrast passing on light and dark. Keep the loud-gradient-on-what-you-tap rule, just less harsh. Record the before and after token values.
- [ ] **G2 Slow movement.** Gradients drift slowly and dynamically, done cheaply: animate `transform` or `opacity` of one oversized gradient layer (compositor only), never `background-position` or repainting gradients. Long duration (20s or more), no JavaScript per frame. Pause with `animation-play-state` when the page is hidden, and off under `prefers-reduced-motion`. Test on a throttled CPU in Chromium for jank. **If a gradient can't be moved cheaply (for example small buttons), leave it still.** Report which ones moved and which didn't.
- [ ] **G3 Grain.** A shared "grain background" used by the new Play pages: a dark, moving, grainy field. Static noise tile (small PNG or SVG filter baked to an image, no live filter) that drifts slowly by transform, over a dark gradient. Much darker colours so text and emojis stay clear. Reusable as a component so Stage 6 can use it.
- [ ] **G4 Check battery.** Note in the commit how it was kept light (one layer, transform only, paused when hidden). No `filter: blur` on moving layers.

## Stage 6a: Play with friends page: games and settings

Files: `src/screens/Setup.tsx`, `GamePicker.tsx`, `HomeGames.tsx`, `src/ui/gameThemes.ts`, `GameIllustrations.tsx`, `sheets/GameStartSheet.tsx`, `Lobby.tsx`.

- [ ] **S1 New page shell.** Tapping "Play with Friends" opens a new page on the grain dynamic background (G3), much darker colours so text and characters stay readable, with a clean white header. The old seating table is removed.
- [ ] **S2 Game row (third row).** A horizontally scrolling row of app-icon style tiles for every game mode (Texas Hold'em and every entry in `VARIANTS`), name underneath each like an iOS home screen. Scroll snap, no scrollbar, momentum.
- [ ] **S3 Game popup.** Tapping an icon opens a popup (sheet) with what the game is (rules summary and the game's scene) and two choices: Select, or Close. Reuse text from `docs/RULES.md` and `GameStartSheet` where it fits.
- [ ] **S4 Selected outline.** The chosen game's icon gets a themed outline/glow around it in its own theme colour so it's obvious.
- [ ] **S5 Merged settings table.** Combine chips, blinds and house rules into one grouped table (one rounded block with rows), same content as before. Row icons all use the same themed colour background (one colour for all, not a rainbow).
- [ ] **S6 Open table button.** A good-looking Open table button that doesn't clash with the grain/gradient background: if the background is dark enough, a solid light or accent button works; avoid two same-coloured layers on top of each other. Chunky bottom edge per the party tokens.
- [ ] **S7 Table behaviour kept.** Everything the old setup did still works: variants, blinds, rebuys, house rules, clock, campaign tables (`openCampaignForFriends()` must still reach its own path).

## Stage 6b: Invite friends and bots rows

Files: `Setup.tsx`, `Lobby.tsx`, `src/state/pals.ts`, `worker/` table routes, `store.ts`, `src/game/botTalk.ts`.

- [ ] **I1 Invite friends row (first row).** A large "Invite friends" row at the top: bigger font than now, bigger emojis than now, friends shown as large profile circles in a horizontal row.
- [ ] **I2 Invite tap.** Tapping a friend sends them an invite and plays purple ripple rings out from their profile picture for a few seconds. A pill sits on the picture reading "Invited…" with the dots cycling ".", "..", "…" (three-bubble lines). The pill stays the same size whatever dots are showing (fixed width, tabular).
- [ ] **I3 Joined state.** When the friend joins, the same ring animation plays in green and the pill says "Joined".
- [ ] **I4 Invites reach the friend.** The invite shows on their phone as a banner within about 15 seconds (reuse the `BjInviteBanner` pattern and `watchInvites()`), with Join and Decline. Server: add a table invite type to `FriendCard` like `BjInvite`. Invites expire. Invites for a table that has started or closed can't be joined.
- [ ] **I5 Declined / no answer.** If they decline or it expires, the pill clears back to normal after a moment.
- [ ] **I6 Bots row (second row).** Same row style as friends. Remove the +/- bot stepper. Starts empty with a circle containing a plus. Tapping it adds a random bot (from `BOTS`) with its face (always the bot face, never a picker emoji) and a small BOT pill overlapping the bottom edge of the emoji so it takes little room. Added bots show in the row with the + circle after them until the table is full. Tap a bot to remove it.
- [ ] **I7 Bot announcement.** When a bot is added it says one line a short while later (about 0.8 to 1.5 seconds, not instantly), in a bubble over its icon. Lines are friendly or funny: "Hi, thanks for adding me", "This was a mistake", and many more, in the bot's style voice. Add at least 25 lines. Add to `botTalk.ts` with ids at the end.
- [ ] **I8 Seats and limits.** Max seats respected (counts people plus bots). The Open table button shows how many are in.
- [ ] **I9 Lobby.** The lobby after opening matches the new look and no longer uses the old seating table. Code, QR and share still work.

## Stage 6c: Play with bots

- [ ] **N1 Bots page.** Same page as friends but without the Invite friends row. Rows: bots, game, settings.
- [ ] **N2 Confirm popup.** Instead of an open table step, a small confirm popup shows all the chosen game settings (game, bots, chips, blinds, house rules) with one button. Pressing it deals and starts straight away (keeps the existing start delay or VS intro behaviour).
- [ ] **N3 Cleanup.** Remove the old Setup code paths, "Pick your bots" screen, "Random table" toggle or fold them into the new bots row. Make sure Play again, Home banners and `openTable('local', …)` still work. Update the Setup, Lobby and Picking bots notes in `CLAUDE.md`.

## Stage 7: Center of attention and fold shelf

Files: `Table.tsx`, `table/Pods.tsx`, `table.css`, `table/Versus.tsx`, `store.ts` (nothing new needed), possibly a new `table/Shelf.tsx`. SHOT: needs screenshots at 2, 3, 6 and 9 players on an iPhone size, and a quick look at a small iPhone (SE size).

**Open questions to ask before building:** (a) How does the shelf sit with the header (menu button, blinds info)? Above it, as the brief says, and what is the total vertical budget? (b) Max pills before the shelf scrolls or compresses at 8 folded. (c) Does "centre of attention" apply to bots-only games and campaign tables the same way? (d) At 3 players, what is the layout? (e) What happens in a multiway all-in run-out with the board cards?

- [ ] **A1 Active players are the focus.** Players who haven't folded become the focus as the hand goes on. With 3 or more still in, they stay arranged round the table; folded players leave the table.
- [ ] **A2 Heads-up focus.** With 1 to 2 players left, move them toward the middle and enlarge them (bigger emoji, bigger chip count, name), so a heads-up hand feels personal, the bot or your friend noticeably bigger than normal because there's room. Smooth transition between layouts (no jumping); handles the board cards and the pot staying visible and not overlapped.
- [ ] **A3 Fold shelf.** A small horizontal shelf at the very top of the table screen, above the menu button and blinds info. It holds small pills: the player's emoji and chip amount, greyed out but still readable.
- [ ] **A4 Fold animation.** When a player folds: hold a second so their "Fold" can be seen and heard, then shrink them and fly them into the shelf. The remaining players shift slightly down to make room for the shelf. Sound unchanged.
- [ ] **A5 Shelf behaviour.** Pills stay in fold order, update chips live, handle many folds (compress or scroll), handle a folded player who's out of chips and a player who leaves. A new hand clears the shelf, with a short reverse animation as they fly back (or a quiet fade).
- [ ] **A6 Layout fit.** Everything fits on small iPhones: shelf, header, the other players, the board, the pot, your box and actions. No overlap with bubbles or the VS intro. Desktop layout is untouched (it may simply not show the shelf).
- [ ] **A7 Reduced motion.** No flying; pills just appear.
- [ ] **A8 Test.** Play bot hands at 2, 3, 6 and 9 players, folding at every street, check the screenshots, and iterate until it feels effortless. Check bubbles still land above the right seat when the seat has moved.
- [ ] **A9 Docs.** Update the table screen notes in `CLAUDE.md`.

## Stage 8: Final sweep

- [ ] **Z1 Compare this file.** Every box above ticked or explained.
- [ ] **Z2 Full run.** `npm run check`, `npm run e2e`, then a manual pass through Home, Party, Play with friends, Play with bots, a bot hand, a heads-up hand, and campaign tables.
- [ ] **Z3 Docs.** `CLAUDE.md` matches the app (removed reactions, new setup, new shelf, friends requests).
- [ ] **Z4 Desktop sanity.** Open at desktop size once: nothing crashes or overflows. No redesign.

# AI twins: plan

Status: plan only, nothing built yet. Decisions below came from the product owner.

Two new ways to play, in an "AI twins" group on the Play tab under the Play with Friends and Play with Bots cards, above Quick games:

1. **Your twin.** Play a copy of yourself and learn from the habits it uses against you.
2. **Friends' twins.** Play a copy of a friend, scout how they play, and find a way to beat them.

## Decisions

| Question | Answer |
|---|---|
| How is a twin built? | Fit a bot `Style` to the player's stats, then copy their own choice in *similar* spots (not only near-identical ones). Where there's little data it falls back to the fitted style. |
| How does the player learn? | Normal play against the twin, with the GTO Coach on top: it names the hands the twin won and the habits behind them. |
| Where do friends' twins come from? | Both. Built from tables you shared, and a twin the friend shares themselves. The shared twin wins where there is one. |
| Memory | A separate long-lived twin store. The 24 hour hand history (`loadHistory()`) stays as it is. |
| When is a twin ready? | From about 50 hands, labelled "Still learning you" and filling toward 300 hands. |
| Friend consent | An opt-in switch, "Let friends play my twin", off by default. |
| Where on Play? | An "AI twins" group below the mode cards. |
| Twin name | The player's name cut to 7 characters, plus " AI" (the name limit is 10; `uniqueName()` still applies). Their emoji, with a small "AI" badge on the seat. |
| Table shape | Heads-up only for now. Twins at a full table with bots can come later. |
| Storage | A friend's shared profile may live on the Worker. It's a few KB of habit counters under a code: no cards, no chat. |

## The card

Two tiles side by side in a `.twins` grid, each with a drawing at the top and a title, a line of text and a progress line below. The same shape as a mode card, but narrower so Quick games stays on screen.

**The picture.** An emoji looks into a mirror (🪞) and sees itself.

- Left: the player's own profile emoji, a little larger, facing the mirror.
- Right: a tall rounded mirror with a thin metal frame (SVG, like `CardArt.tsx`) and a glass gradient. The same emoji sits inside it as the reflection, flipped with `scaleX(-1)`, a touch softer, with a diagonal shine across the glass and a small "AI" chip in the corner.
- **Your twin:** the player's emoji. If they haven't picked one yet, the default profile emoji.
- **Friends' twins:** a friend's emoji looks in, with a small 🔍 on the glass to show it's about scouting. With no friend added yet it shows two overlapping faces.
- Colour: one new gradient token pair per tile (for example teal and indigo), added to `:root` in `global.css`, not hard-coded. Phone CSS stays outside the desktop media query.
- Motion: the shine sweeps across the glass once on appear and on press. Under `prefers-reduced-motion` it doesn't move. The art is `aria-hidden`, and the button carries the label ("Your twin. Still learning you, 34 percent.").
- Under 50 hands, the "Your twin" tile is dimmed with "Play 50 hands to meet your twin" and opens a short sheet with a button into a bot game.

## Build order

### 1. Twin memory

New pure code in `src/game/` (no DOM) and storage in `src/state/`.

- A `flipup.twin` key of counters, not stored hands. Each counter is keyed by spot: street, position group, hand-strength bucket, what the player faces (nothing, small bet, big bet, all-in) and players in. It holds how often they folded, checked or called, bet small or big, and raised.
- Summary stats kept alongside: VPIP, raise rate, 3-bet, how often they bet into a checked street, fold-to-bet, c-bet, bluff share, showdown rate, average open size, and bet size by hand strength.
- Updated from `captureFinishedHand()`, which already has the player's hole cards and the `HandRecord`. `buildFrames()` in `src/train/replay.ts` can give pot and stacks at each decision.
- Reuse the hand-strength bucket that `botPlay.parity.json` checks, so spot keys and the bots agree. (To confirm in the code.)
- Settings gets "Reset my twin". Confidence is hands ÷ 300, capped at 1.
- Size: sparse counters should stay well under 100 KB of `localStorage`. Check it with a test that plays a few thousand bot hands.

### 2. Fit and copy

- `fitStyle(profile) → Style` maps the stats onto the style knobs: VPIP to `pre.tight` and `pre.loose`, raise-to-call ratio to `pre.aggro`, open size to `pre.open`, fold-to-bet to `post.scared` and `post.sticky`, bet rate to `post.bet`, bluff share to `post.bluff`, size tells to `post.tell`. Start from the nearest of the ten styles and adjust.
- In `botPlay.ts`, a player with a `twin` attached also runs a similarity lookup. Neighbouring strength buckets, nearby bet sizes and the same street count with less weight. If there are enough weighted samples, the twin draws from the player's own action mix. How much it trusts that grows with the sample count (n / (n + k)). Thin spots use the fitted style.
- Bet sizes copy the player's share of the pot.
- It must stay fair: the twin reads only its own cards and public moves. The profile is data. Extend the existing test that hides every hidden card to seat a twin.
- Keep each decision within the couple-of-milliseconds budget.

### 3. The "Your twin" game

- `startTwin()` in `src/state/store.ts`, modelled on `startPlaystyle()`: a local heads-up table, the bot seat carrying the twin, no timer.
- `redactForDevice()` strips the twin data like it does styles and reads.
- No server needed. Chips still add up (the "keeps every chip accounted for" test gets a twin case).

### 4. Learning from your mistakes

- After a twin game, the GTO Coach (new lines in `coach.ts`: short, plain, contractions) shows the hands where the twin took the most chips. Each opens Replay and the existing GTO review.
- It also names the habits the twin used, in plain words: "You folded to river bets 8 times out of 11. GTO folds about half as often." The numbers sit behind "Show me the numbers".
- Results go into `flipup.stats.games` with a twin kind, so Insights can show how you do against yourself.

### 5. Friends' twins

**Source A: tables you shared.**
- A phone keeps a `HandRecord` of online hands, which holds public moves plus any cards shown. Friends' stats come from those, so fits are rougher and copied spots exist only where cards were shown.
- It needs a friend ID that holds across tables. To confirm whether one exists. If not, add a random per-device ID to the join message and the player record (`protocol.ts`, `redact.ts`).
- Only tracked for friends who've switched on "Let friends play my twin". The flag travels with the player.

**Source B: a twin the friend shares.**
- The friend switches sharing on and gets a 5 letter code and a link. Their compact profile is saved on the Worker through a new `/api/twin` route (storage binding to decide in `wrangler.jsonc`; run `npm run cf-typegen` and commit `worker-configuration.d.ts` after).
- Unused profiles expire like idle tables (3 days).
- You add it from the Join sheet or the link. A re-sync button refreshes it. Switching sharing off deletes the server copy. It can't remove copies people already downloaded, and Settings says so.

**Merging:** the shared twin wins where there is one; shared-table data fills the gaps.

New screens: a friends list (face, name, confidence, where the data came from, "Add a friend's twin"), and a per-friend scouting report.

### 6. Beating a friend's twin

- The scouting report leads with plain-English habits ("Folds to flop bets two thirds of the time") and keeps the numbers behind "Show me the numbers".
- A short list of ways to beat it comes from a fixed set of rules ("folds a lot → bet small and often", "calls too much → bet thinner for value, bluff less").
- Play starts a heads-up game against that twin. Afterwards the coach says which plans worked ("Your steal raises won 7 of 10").
- Check every rule in `scripts/botLab.ts` by simulating a script that follows it against fitted twins, as the lab does for `bluffBot`. A rule that doesn't win there doesn't ship.

### 7. Tests, docs, rollout

- **Unit:** counters and spot keys; fit round-trip (build a twin from a simulated styled bot and check its stats land within a few points of the original); lookup fallback when data is thin; hidden-information test with a twin; chips test with a twin; the opt-in flag is respected.
- **E2E:** Play → AI twins → start a table. Add the mirror card to `SHOTS_DIR` screenshots in light and dark.
- **Docs:** update `CLAUDE.md` with a layout entry, and add anything rule-like to `RULES.md`.
- **Order of shipping:** 1 → 2 → 3 → 4 (Your twin works end to end), then 5 → 6 (friends).

## Not yet checked

- Whether `wrangler.jsonc` already has a storage binding that suits the twin code.
- Whether players carry an ID that survives across tables.
- The exact shape of the strength bucket in `botPlay.ts`.
- Whether the tile text fits at the smallest phone width. Check it in the e2e screenshots.

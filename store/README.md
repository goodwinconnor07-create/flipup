# App Store assets

What goes on FlipUp's App Store page besides the text (the text is in `docs/SUBMISSION.md`). Made in November 2026
with the owner, one asset at a time, from Apple's [asset best practices](https://developer.apple.com/app-store/asset-best-practices/).

## Screenshots (`screenshots/`)

Nine slides on white, in upload order, at the two iPhone sizes App Store Connect takes: `6.9in-1320x2868` (the
iPhone Pro Max class) and `6.3in-1206x2622` (the required medium Dynamic Island class). JPEG, no transparency. Ten are
allowed, so one slot is free, kept for the update that brings back the parked games.

1. Your friends. One table. (Hold'em with chat bubbles)
2. Add friends with a code. Free. (the lobby, its game code pulled out)
3. 13 games. One app. (every game's picture; tag "12 with Premium")
4. Three cards. Throw one away. (Crazy Pineapple's discard; Premium tag)
5. Roll the die. Swap the river. (Die on the River; Premium tag)
6. Bend the rules. Play a power card. (Power Cards, the Fold Tax panel pulled out; Premium tag)
7. Make the right call. Built-in range trainer. See why, hand by hand. (the daily hand's Best play, free)
8. Save any hand. Replay every move. (the owner's replay screenshot, its controls pulled out; free, no tag)
9. No one around? Bots fill the seats. (a Crazy Pineapple table; no tag, the owner's call)

A slide that shows a Premium game wears a small gold "Premium" tag with a crown above its headline (`premium()` in
`slides.cjs`; the owner's call, 17 Nov 2026), so nobody downloads expecting every game free.

Only the first three show in search results. The type is Inter Display (not SF Pro, whose licence covers UI mock-ups,
not marketing headlines). Emoji are only ever cut from real iPhone screenshots, never drawn.

Remake them with `node store/scripts/slides.cjs` (add `CHROMIUM_PATH=/opt/pw-browsers/chromium` in a cloud
session). The layouts are `scripts/slides.cjs` and `scripts/slides.html`; the pictures are in `scripts/sources/`:

- `holdem-yourturn.png`, `pineapple-discard.png`, `pineapple-yourturn.png`, `dice-dice.png`: How to Play's iPhone 17
  Pro simulator shots (`native/assets/howto`), which are 804 pixels wide, so the slides are a little soft.
- `lobby-sb.png`, `power-sb.png`, `power-panel.png`, `replay-sb.png`, `replay-controls.png`: the owner's own iPhone
  screenshots of the lobby, a Power Cards table and its Fold Tax panel, and a hand replay, with a clean 9:41 status bar drawn over the real one. They show the owner's name on
  their seat.
- `web-hand-sb.png`, `bestplay.png`, `chart.png`: Range training from the app's web build (its icons and font are the
  web's stand-ins), with a drawn status bar.
- `x-*.png` (bubble faces), `discard-row.png`, `rolled.png`, `codecard.png`: pieces cut from those.

Better source pictures, full size from the simulator, would come from `.github/workflows/store-shots.yml`. GitHub
only offers a by-hand workflow on the repository's default branch, which is `claude/main` (9 Nov 2026), not `main`,
so it can't be run until the default branch is changed in the repository's settings.

## Creative assets (`creative/`)

Apple's key art for the product page header and search results (iOS 27 and later; optional, the screenshots stand in
without it). One **universal** image, 16:9, 5244 x 2950 PNG, which Apple crops for both. It is the old Party tab's belts:
rows of game pictures tilted -7 degrees, arranged so a game never sits within 2.7 tiles of itself (checked on screen
by the script).

- `universal-belts-13.png`: the 13 games in 1.0. **Use this one for launch.**
- `universal-belts-22.png`: adds the eight parked games and Imposter (pictures from commit `866d552`, the last with
  all 22). Guideline 2.3: store art must show what is in the app, so switch to it only when the update with those
  games is live. The swap is made in App Store Connect and needs no build.

The header and search placements also take a looping video (5 to 30 seconds). The same script makes them, every row
sliding one full pass in 30 seconds so the loop has no seam (H.264, 30 fps, no sound). They are about 60 MB each, so
they are not kept in git:

```
node store/scripts/belts.cjs store/scripts/games-13.json header-13.mp4 3840 1646 469 0 30
node store/scripts/belts.cjs store/scripts/games-13.json search-13.mp4 2400 1600 347 0 30
node store/scripts/belts.cjs store/scripts/games-13.json store/creative/universal-belts-13.png 5244 2950 640 1141
```

Use `games-22.json` for the 22-game versions. `games-13.json` is written by `npx tsx store/scripts/game-art.ts`
(rerun it after a game's picture changes in `src/design/gameArt.ts`); `games-22.json` was made the same way at
`866d552`.

## App icon

Kept as it is (`scripts/makeAppIcon.mjs`, owner's call 17 Nov 2026). Check the tinted and clear looks on a real
iPhone before submitting, since the layered icon was written by hand, not exported from Icon Composer.

## Not made yet

- App preview video (parked by the owner).
- In-App Event art: a 16:9 card and a 9:16 details page, only when an event runs.

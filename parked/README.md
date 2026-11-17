# Parked code

Features that are built but not part of the shipping iPhone app. Nothing here is imported by `native/`, and nothing in
`native/` switches it on or off: App Store Review sees only what is shown. To bring a feature back, move its files
to the same path under `native/` (`parked/native/src/x` -> `native/src/x`) and undo the wiring listed below.

## The eight parked games (November 2026)
In `games/`, with their rules and how to bring them back: see `games/README.md`.

## The parked Live Activity (November 2026)
In `live-activity/`, with its design and how to bring it back: see `live-activity/README.md`.

## Development-only screens and hooks
`(tabs)/(play)/design.tsx` (design catalogue, was linked from Home under `__DEV__`), `(tabs)/(play)/motion.tsx`,
`app/sample-sheet.tsx`, `components/ranges/teaser.tsx` (imports the old Range training game's pieces, now gone) and `components/play-tile.tsx` (unused).

# Design direction (iPhone app)

The owner's decisions from November 2026, after looking at SCRAM and Apple's Games app. The lesson taken from both
is not "have less": it's that every screen is built from the same few parts, and colour comes from one place.
FlipUp keeps its depth (14 games, parties, friends, challenges); it gets a stricter frame.

## Decisions

- **Neutral frame.** Outside the table, secondary buttons, pills and rows are neutral (glass or grey capsules,
  like the Games app). Violet is kept for the one main play action on a screen. Gold stays for wins, Premium and
  streaks. The table is unchanged (felt, Raise green, Fold red).
- **Colour comes from the game.** Wherever a game shows, the screen takes its colour from it: game sheets fade
  from the game's colour into the page, shelf cards tint the panel under the icon from their art, Setup tints
  from the chosen game, Party from its playlist.
- **Icons.** Every game and solo card gets a hand-made SVG app icon in one shared style: one bold, lit subject,
  cropped large. Games whose twist is a creature (Ghost, Imposter, Pineapple, Bean Stalk) get a simple
  character face drawn in the same style; the rest are objects. Shared recipe: the game's two colours as a
  diagonal gradient, a soft light from the top left, a vignette, one subject with a lit gradient, a highlight
  and a soft contact shadow. No SVG filters (react-native-svg can't draw them): shadows and glows are radial
  gradients. Playing cards in an icon are the game's own card, as on the table and the old thumbnails: plain
  white, a heavy rounded rank top left, one big suit below it, the four-colour deck, no corner pips or gloss.
  Drawn on a 1024 box by `node scripts/drawGameIcons.mjs`, which writes `src/design/icons/<id>.svg` (every game in
  `VARIANTS` plus the four solo cards); `docs/design/icon-samples/all-icons.png` is the overview. Edit the script,
  not the SVGs, and rerun it. Not wired into the app yet.
- **Type.** SF Pro Rounded stays. Big numbers (chips, pot, stats, Passport, finish page) are heavy with
  tabular digits.
- **Appearance.** Follows the phone. Tints and art must work in light and dark.
- **Home hero.** A full-bleed carousel under the "Play" title, fading into the page, with page dots. Live
  things first (your table, party, an invite), then: Game of the week, today's challenge or Range daily, your
  last game (replaces the LastGame row), and Premium (only without it). Each slide: eyebrow, title, line, one
  button.
- **Profile tint.** Your profile and friends' sheets fade from the colour of the person's emoji (a table of
  dominant colours worked out once).
- **Patterns.** Section headers are a small coloured eyebrow with an icon over a bold title with a chevron.
  Cards are the picture on top, then eyebrow, title, line and one capsule button. Rows carry a number
  ("Friends · 4"). Empty states are one picture, one sentence, one button. Price lines sit right under Buy.
- **Speed.** The app never makes you wait for itself; only the game may. Where the outcome is near certain
  (accept or deny a friend, send an invite, join, save) the result shows at once and is put right, with a
  quiet note, if the server says no. Purchases still wait. Tabs load from the saved copy and never animate.
- **Scope.** Home, games and their sheets; Profile, Friends and Party; the Premium offer. Not the table.

## Order

1. Icons (done, waiting on the owner's review), then put them in the app in place of `gameThumb()` pictures.
2. Game sheets tinted from the game, neutral buttons.
3. Home hero.
4. Profile, Friends, Party.
5. Premium.

# FlipUp design (iPhone app)

> **In force now (owner, 2026-11-05, after seeing the mockups): keep the app's design as it is on TestFlight.**
> The changes on top of it are small: no purple (the brand and action colour is a deep blue, `brand.violet` in
> `native/src/theme/brand.ts`, keys unchanged), no film grain (pages get a moving deep blue light field,
> `GrainBackground`, and cards keep their slow glows, `LivingCard`), the original game pictures (`gameArt.ts`; the
> detailed icons were tried and dropped), fewer spinners and faster screens. Everything below this box is the paper, ink and
> red direction from the interview: **parked, not in effect**. Don't build it unless the owner asks again.
>
> **12 Nov 2026 (owner): consistency between Play and Train, and a lighter bots lobby.** Range training's ways to train
> (Daily hand, Endless, Sets, Gaps) are tiles in exactly the style of Play's game tiles: a flat field, a sticker picture
> from gameArt's shapes (`src/design/trainArt.ts`), the name in white rounded capitals on a darker band, the same crown.
> Play with bots shows who's at the table as a small group of faces floating softly (filled circles, names under them,
> evenly spaced on equal columns, a same-sized dashed Add button at the end), not a list and not a drawn table, so the
> game card stays on screen; new bots pop in, holding one pops it out. The LIVE tag on Rejoin has a pulsing dot.

> **Minimal Home, a test on a branch (owner, 2026-11-10, from a reference with a big greeting; not merged until the
> owner has seen it on TestFlight).** Play is one page on a livelier moving field of its own (`LivelyBackground`: five brighter lights on 4.5 to 10s clocks over the same dark base, always dark):
> FlipUp in SF Pro Rounded heavy and your face, "Hi, <name>." at up to 92pt rounded heavy (by screen height), one line under it, then down by the tab bar (the
> page fits between the bars without scrolling; the room left over goes above and below the greeting) the quiet see-through cards (white at 9%, radius 24): your live table when you're at one (a green LIVE tag),
> and every game's icon rolling slowly past (`GameCarousel`, the flat cartoon art from `b8cdec6`, 26pt a second,
> still and swipeable under Reduce Motion), then Host a game (solid white, dark ink) and Join with a code (white at
> 14%), and Play with bots and How it works as quiet links. Body text is SF Pro, headings and buttons SF Pro Rounded.

> **Game-lobby Home, a test on a branch (2026-11-10, after Oliver asked for "a normal game app home screen": bottom
> tabs, main middle buttons, side bars; the owner's answers: the chosen game is the star, the page's colour follows
> the game, all four shortcuts, lots of motion. Not merged until both have seen it on TestFlight).** Nothing scrolls.
> The page is a dark shade of the chosen game's colour with three lights in its brighter tones (`GameBackdrop`; a
> new game's colours fade in over the old). In order of importance: the games as a line of cards across the whole
> screen, locked on one at a time (`GameSwiper`: the middle one full size, neighbours smaller and fainter either side,
> the outer ones tucked under like a fanned deck; the card follows the finger, rubber-bands past the ends, and the
> flick's speed carries into `SETTLE`, capped so it never overshoots; one swipe moves one game; a selection tick as
> each passes; `flipup.homegame` keeps the pick), its name, hook and dots; a row of round see-through shortcuts
> (Stats, Rules, All games, Premium in gold, Settings, Share) just over PLAY (`PlayButton`: solid white, the game's
> dark ink, a breathing glow and a band of the game's colour sweeping across), with Play bots and Join a game under
> it and a slim LIVE strip above when you're at a table. PLAY and Play bots open with the middle card growing to fill
> the screen in its own colour (`Fill`, 300ms ease-out), then the page fades in over it (`fill=1`). "Play" as the
> big title top left and your face top right, ringed, opening your profile (asked the same day: no name chip, no spade). The parts fade in 30ms apart
> when the app opens. The tab bar stays. Every loop stops off screen, in the background and under Reduce Motion.

> **Range training (owner, 2026-11-11):** always dark, on a dimmer, slower light field that answers how you're doing
> (warm for a best play, cool for a miss, a calm gold once the daily quiz is done) and stands still while you read a
> hand. Free players see the daily quiz as the whole screen; Premium players see Play a set first. Details in CLAUDE.md.

> **Cards on the dark blue pages (owner, 2026-11-09): one surface.** Every card on the lobby and Play with friends/bots
> pages (Game code, Game mode, Start a party, the party playlist, House rules, Players) is the same see-through panel:
> `usePanel()` fill and edge at `PANEL_RADIUS`, no solid grey `colors.cell`, no blue outline. Blue lives in icons,
> chevrons and text buttons only. The pinned Start game / Deal button waiting on players is a solid dim fill, never
> a translucent one, so rows scrolling under it can't show through.
> **Premium page (owner, 2026-11-11, after Flighty Pro's page):** a FlipUp | PREMIUM pill and a round close button;
> every perk as its own big picture (drawn from the app's pieces) with a rounded title and a line, sliding on every
> 4.2s and swipeable (still under Reduce Motion), on a night-to-bright-blue light that falls to black; then the plans
> as big dark cards you swipe between (Yearly, Best value, with the gold Save pill; Monthly, Most flexible): badge,
> name, line, the App Store's price, one big blue button, two lines of what's in it. A tap on a picture opens `premium-perk`.
> The owner said to build it without a mockup. Share cards come in five designs that are pictures, not app screens, so
> they keep their own looks (felt, gold foil, receipt, poster) whatever this box says.

> **Power Cards table (owner, 2026-11-12, built without a mockup at the owner's ask, after playing it):** the power is
> a card, not a strip. It sits beside your two cards (`PowerCard`: gold foil frame, deep blue face, the power's
> picture and name; face down between hands so its place never moves), and the hole cards step down to make room.
> It lifts 6pt and glows gold when it can be played (PLAY on a gold capsule); played, folded or over, it fades. A tap
> opens a panel that rises from the bottom like the raise panel (`PowerPanel`): the rule, where it stands, and on
> your turn the choice drawn as the real thing (faces for a player, the cards themselves, a row of ranks) with one
> gold button that says what will happen ("X-ray Sam", "Reroll the 5♣"). Nothing about a power ever sits in the
> action area, which keeps one height. A played power is a banner along the bottom of the felt for its 1.8s; what
> it does shows where it happens: your X-ray's card face up on that seat (ringed gold, an eye), your Peek's card
> faint in the next board slot, 🤐 and 🛡️ on seats, a live bounty or fold tax in the game pill, and after the hand
> everyone's power on their seat.

The one source of truth for how the iPhone app looks, reads and moves outside the game table. It records the
owner's answers from the November 2026 interview (nine rounds), why each was chosen, and what was rejected.

BOT_001 personalities (owner request, 9 November 2026): when Invite BOT_001 is on, the existing House rules panel
shows a BOT_001 personality control: Original, Patient, Curious, Aggressive, with a short description. Reuse the
existing segmented control in native setup/lobby and the existing step row on web. Only the host edits it; changes
apply next hand. This adds a row to existing screens without changing their surfaces or navigation.

Everyday bot tables (owner request, 9 November 2026): Play with bots keeps its existing setup and Start game flow.
Standard Hold'em uses a balanced automatic mix of subtly different opponents. Add one optional Bot level row to
House rules, default Casual with Challenge as the alternative; use the existing native segmented control and web
step row. No personality labels on seats, extra onboarding or new screens. Difficulty changes apply next hand.

Range training, Read · Decide · Learn (owner request, 10 November 2026: keep it simple, make it feel finished). One
page, the table never moves. Read: concept and title, the table at your decision, Replay hand, the hand as one line
per street (tap a street to replay from it), then your cards with what you have and the price. Decide: the glass
answer bar pinned at the bottom, Hint and Skip under your hand. Learn: the answer bar opens into the result card in
the same place (rises from its bottom edge, from 95%), and the opponents' likely hands turn up on their seats. The
card holds four things only: the verdict (Best play in gold, Also good in blue, Missed it in grey), one sentence of
why, one picture (facing a bet, one bar of how often you win with a mark at the price; otherwise what each play wins)
and their range as three piles (facing a bet: Beat you, You beat, Bluffs; otherwise: Fold, Call ahead, Call behind),
then Breakdown and Next hand. Breakdown is the `range-breakdown` sheet with everything else. No full-screen
celebration: a best play pops its verdict with a sound and a haptic; confetti only at runs of 3, 5, 10 and every 10.
Green stays Raise only.

Range training, start screen and sets of 5 (owner request, 10 November 2026). The Train tab is a start screen: one
violet card ("Play a set", a line, a white Start button), three numbers once you've played (best plays, mastered out
of all, best run), and a Work on list (your weakest kinds of spot, Retry your misses), each starting a set of those.
Start opens the set full screen over the tabs (`range-session`): "‹ Back" on the left, "Hand 2 of 5" over five
progress bars in the middle (gold best, blue also good, grey missed, the current one outlined), and the trainer
below as above. The fifth answer's button says See your set: dots, "4 of 5", a word (Perfect, Strong, Good set, Keep
at it), the five hands with their grades (a tap opens the breakdown), and Done / Another 5 pinned. No stars, tiers or
modes.

Bot research (owner request, 10 November 2026): a separate mobile-browser research session, entered from
Settings. Setup shows the length, what is recorded, and Start. Play uses the existing card and button styles with
opponents, board, own cards, legal actions, progress, an optional “That felt odd” marker, and Pause & upload.
Pausing shows saved/upload status, Resume, an optional note and a private review link. Records survive reloads,
upload completed hands incrementally, and stay separate from normal games, statistics and Range trainer lessons.
The report page also offers Copy review packet with numbered parts and selectable text for mobile chat sharing.
It preserves the existing uploaded hands and reuses the existing fields and buttons; no new screen or motion.
The default copy includes all hands and explanations; an optional larger copy retains exact replay checkpoints.
Wireframe shown in the implementation chat before building: Back / Bot research; 60 hands / Start; then Hand N,
scenario label, table, Fold/Call/Raise, That felt odd, Pause & upload. Use existing surfaces and motion.

**How this document works.** Read it before any UI change. A new decision is written here first, then built. If a
screen and this document disagree, the document wins until the owner says otherwise; then the document is changed
in the same commit. New screens are mocked up and shown to the owner before they're built.

## 1. What FlipUp feels like

**A poker league for you and your friends, printed on paper.** You keep score against your mates: who won, how
often, who's on top this month. The pages are warm grey paper with near-black ink, one signal red for actions and
gold for winning. Everything is flat and still. The words are plain and calm, and there are very few of them.

The game table is the one place with colour, felt and life. Everything around it is the scoreboard.

## 2. Why: what was wrong

The owner's complaints about the app before the rebuild, in their words and ours:

- **"Vibe-coded."** It looked generated rather than designed.
- **Purple gradients and glows.** Violet gradient cards, drifting glows, film grain and blurred art are the look
  of AI-made apps.
- **Too many styles.** Each screen was modelled on a different app (Flighty, Apple's Games app, Chess.com,
  Settings, SCRAM), so nothing felt made by one hand.
- **Detailed game icons.** The shaded, glossy, many-shape icons were the biggest single cause. The first, simple
  flat Imposter drawing was the only one that didn't feel that way, because it was simple.
- **Too much like Apple's Games app** after the hero carousel and art-tinted sheets.

## 3. What we take from other apps, and why

| App | What we take | Why |
| --- | --- | --- |
| SCRAM | Flat cards barely lighter than the page, hairline dividers, a stats grid that is only type and lines | It looks designed without decoration: the structure is the style |
| SCRAM | The recipe of paper, ink and one red, big confident titles, wide capital labels | It reads instantly and feels sporty |
| Flighty | Your numbers made beautiful: big figures that feel earned | Stats are the reward in a league |
| Duolingo | Only on challenge and learning screens: chunky pressable buttons, celebrations, progress you can see | Learning needs encouragement; the rest of the app stays calm |
| The first Imposter drawing | Flat simple shapes, no shading | It was the one picture that didn't feel generated |

Not taken: Apple's Games app (hero carousel, art-tinted sheets, glossy icons), SCRAM's cheeky voice (the owner
chose plain and calm), Spotify, Revolut.

## 4. What stays as it is

- **The table during play** and all of the gameplay: felt, rail, seats, cards, actions, raise panel, bubbles,
  sounds, deal, run-outs. Its own colours stay (Call blue, Raise green, Fold red), because they belong to the
  table, not the menus.
- **Emoji profiles.** Everyone's picture is an emoji.

Everything else is rebuilt: Home, the lobby before the deal, the table menu and its sheets, the finish page, Party,
Range training, challenges, Premium, Settings and every sheet.

## 5. Rules (never break these)

1. No gradients, glows, grain, film texture, blur or glass on any content. (The system tab bar and sheets keep
   whatever iOS gives them.)
2. No shadows on cards. Cards are flat, a shade lighter than the page.
3. No violet. The brand is paper, ink, red and gold.
4. No coloured icon squares in rows (the iPhone Settings look). Rows are text, an optional emoji or drawing, a
   value and a chevron.
5. No explanation lines under rows or titles, except where a mistake costs something (Delete my data, leaving a
   table) and in How to Play.
6. Red means "do this": the main button, links, the selected tab. Gold means "you won": 1st place, streaks,
   Premium. Nothing else gets colour.
7. One way to do each thing: one button style per job, one row style, one card style, one back button.
8. Every number that matters is set in the narrow display face; every label in the wide face, in capitals.
9. Motion is snappy and native. Nothing drifts, loops or breathes outside the table and learning screens.
10. Mock up new screens and show the owner before building them.

## 6. Tokens

### Colour

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `page` | `#F3F0ED` | `#141210` | Every page |
| `card` | `#F9F7F5` | `#1E1C1A` | Cards, rows, inputs |
| `cardPressed` | `#ECE8E4` | `#2A2725` | A pressed row or card |
| `disc` | `#E9E5E1` | `#2A2725` | The disc behind an emoji |
| `hairline` | `#E2DDD8` | `#2E2B28` | Dividers, card and input edges |
| `ink` | `#141210` | `#F3F0ED` | Titles, numbers, body text |
| `ink2` | `#5E5954` | `#A8A29C` | Secondary text |
| `ink3` | `#736D67` | `#8A847E` | Labels, placeholders, chevrons (dark enough for 12pt labels) |
| `red` | `#E5262A` | `#E5262A` | Main buttons, links, selected tab |
| `redPressed` | `#C81E22` | `#C81E22` | A pressed red button |
| `onRed` | `#FFFFFF` | `#FFFFFF` | Text on red |
| `gold` | `#E8B13A` | `#E8B13A` | Fills: 1st place, streak flame, Premium badge |
| `goldInk` | `#9A6A00` | `#F0C45C` | Gold as text on the page |
| `silver` / `bronze` | `#C9CDD3` / `#D8955E` | same | 2nd and 3rd place on a board |
| `goldBg` / `goldDeep` | `#FBEFD2` / `#7A5300` | `#3A2E14` / `#F0C45C` | The win panel on learning screens and its text |

Game drawings keep their own flat colours (section 8).

### Type

One family, Archivo (free, SIL Open Font License), in two widths, plus the system font for reading:

| Step | Face | Size / line | Use |
| --- | --- | --- | --- |
| `display` | Archivo Expanded ExtraBold | 40 / 44 | "Hi, Connor.", "You." |
| `title` | Archivo Expanded Bold | 28 / 32 | Screen and sheet titles |
| `heading` | Archivo Expanded Bold | 20 / 24 | Card and section headings |
| `label` | Archivo Expanded SemiBold, capitals, +1.2 tracking | 12 / 16 | Eyebrows, stat labels, column heads |
| `number` | Archivo ExtraCondensed Black | 44 / 44 | Stat figures, scores, chips, ranks |
| `numberSm` | Archivo ExtraCondensed Bold | 24 / 26 | Row values, board points |
| `body` | SF Pro, regular | 17 / 22 | Reading text |
| `bodySm` | SF Pro, regular | 15 / 20 | Row text, small lines |
| `button` | SF Pro, semibold | 17 / 22 | Buttons |

Sizes follow Dynamic Type with caps (display and number stop at 1.3×).

### Shape and space

- Spacing on a 4pt grid: 4, 8, 12, 16, 20, 24, 32, 48. Page margin 20.
- Corners: cards 16, buttons 14, inputs 14, game drawings 12, small chips 8, emoji discs round.
- Hairlines are 1pt (`hairline`). Cards have no border unless they sit on another card.
- Tap targets are at least 44pt; main buttons are 54pt tall.

## 7. Components

- **Button.** `primary`: solid red, white text, 54pt, corner 14, pressed `redPressed`. `secondary`: `card` fill,
  `ink` text, a 1pt hairline. `text`: red words, no box (Not now, See all). `destructive`: red text on `card`.
- **Learning button** (challenge and learning screens only): solid colour with a 4pt darker lip under it that
  presses down, Duolingo's way. Fold is `card` with a grey lip, Call red, Raise ink; on the win panel the next
  step is gold with ink text.
- **Switch.** On is `ink`, not red or green (red means "do this", gold means a win).
- **Card.** `card` fill, corner 16, no shadow, padding 20.
- **Row.** Inside a card: optional leading emoji or drawing, the text, a value in `numberSm` or `ink2`, a chevron
  in `ink3`. Rows are split by hairlines inset to the text.
- **Stat grid.** Two columns, hairlines between cells; each cell is a `number` and a `label` under it. Nothing
  played yet shows "–", never "0%".
- **Eyebrow.** A `label` in `ink3` above a title or a card's content.
- **Board row.** Place in a small square (gold, silver, bronze for the top three, `disc` after), the emoji, the
  @username, then the score in `numberSm`.
- **Emoji avatar.** The emoji on a round `disc` with a 1pt hairline. No ring, no colour.
- **Navigation.** The standard iOS bar: a centred title and a red "‹ Back"; swipe back everywhere but the table.
- **Tab bar.** Play · Ranks · You, iOS's own bar, the chosen tab in red.

## 8. Game drawings

Each game has a flat drawing: 2 to 4 flat colours, simple shapes, no outlines, no gradients, no shine, at most one
soft flat shadow shape. On a rounded square (corner 12) in the game's own colour. They should look like the first
Imposter drawing: readable at 44pt, with a little character. Playing cards in them are the table's card (white, a
heavy rank, one suit, the four-colour deck), drawn flat.

## 9. Screens

- **Play** (tab). "Hi, Connor." in `display`, then two buttons: Host a game (red) and Join with a code
  (secondary). Then the live thing if there is one (your table, an invite). Then sections, each an eyebrow and a
  card: Games (all 13 as rows: drawing, name, one short line), Party night, Challenges and Range training, Friends.
- **Ranks** (tab). "Ranks." with This month / All time. Your place card ("Not ranked yet: 3 of 5 games" until
  you've played five). The board: place, emoji, @username, win rate out of 100.
- **You** (tab). "You." and a settings button. A card with your emoji, @username in `title`, and the stat grid:
  hands, games won, win rate, biggest pot, best hand, streak. Then Friends, Card packs and bubbles, Premium as
  rows. Friends is a pushed screen like SCRAM's: Add a friend (the @username field), My QR and Share my link,
  Friends · N, Requests.
- **Game sheet.** The drawing, the name in `title`, how it plays as short numbered lines, then Play with friends
  (red) and Play with bots (secondary).
- **Setup** (Play with friends / bots). A paper page: who's in (emoji discs, + Invite, + Bot), the game as a row
  that opens the game list, the table's settings as rows, Open table / Deal pinned in red.
- **Lobby.** The code big in `number`, the QR, Share; who's at the table; settings; Deal in red.
- **Premium.** The same paper page: a gold Premium badge, the title, the eight Premium games' drawings, three plain
  lines, a red Buy with the price, "One payment, no subscription." under it, Restore as a text button.
- **Challenges and Range training.** Duolingo's feel: a progress bar across the top, chunky learning buttons,
  a celebration (a bounce, confetti in red and gold, a sound) for a best play or a new best.
- **Finish.** Your place huge in `number`, the stat grid for the table, the standings as board rows, Play again in
  red.

## 10. Ranks

- **Score:** win rate out of 100 = games finished 1st ÷ games played, rounded.
- **What counts:** online games with at least one friend at the table. Bots-only tables and challenges don't.
- **Fair start:** you're "Not ranked yet" until you've played 5 counting games.
- **Periods:** This month (resets on the 1st; "November ends in 25 days") and All time.
- **Who:** you and your friends only.
- Needs the server to keep each player's counts per month on their friend card (not built yet).

## 11. Words

Plain and calm. Short sentences; titles may end with a full stop ("You.", "Ranks."). No jokes on buttons. Almost
no help text (rule 5). Numbers are written as figures.

## 12. Motion

Snappy and native: system pushes and sheets, a 97% press dip, numbers that count up once. Learning screens may
bounce and celebrate. Respect Reduce Motion everywhere.

## 13. Mockups

The owner reviews mockups before anything is built: https://claude.ai/artifact/6DoCrFYztyxGutbd9hkJPP (Play, Play in
dark mode, Ranks, You, Friends, all games, a game sheet, Play with friends, the lobby, Premium, a Range training hand
and its best-play panel).

## 14. Decision log

- 2026-11-05: the interview above. Replaces `docs/DESIGN_DIRECTION.md` (the Games-app direction).
- 2026-11-05: first mockups made.
- 2026-11-05: the owner chose to keep the TestFlight design with small changes (the box at the top). The interview
  direction is parked.

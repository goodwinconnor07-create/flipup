# FlipUp design (iPhone app)

> **In force now (owner, 2026-11-05, after seeing the mockups): keep the app's design as it is on TestFlight.**
> The changes on top of it are small: no purple (the brand and action colour is a deep blue, `brand.violet` in
> `native/src/theme/brand.ts`, keys unchanged), no film grain (pages get a moving deep blue light field,
> `GrainBackground`, and cards keep their slow glows, `LivingCard`), the original game pictures (`gameArt.ts`; the
> detailed icons were tried and dropped), fewer spinners and faster screens. Everything below this box is the paper, ink and
> red direction from the interview: **parked, not in effect**. Don't build it unless the owner asks again.
>
> **23 Nov 2026 (owner): lessons from EasyPoker, in our own look** (mock-ups on the owner's canvas, then built). The
> table menu opens with a gold **Your turn** bar while it's your move (the seconds left and a draining line; a tap goes
> back to the table) and is cut to what matters mid-hand: the action tiles, This hand (Hand rankings with your hand as
> its detail, Hand log, Standings), Table (invite, settings, theme, add a bot) and Sound and feel; every row has a
> glyph. **Hand rankings** open on "You have now" (your hand's name and five cards on a blue card, what beats it) and
> light your row with a gold YOU tag. The lobby's **code card** makes the code its hero: GAME CODE, the code centred at
> 64pt, how friends join, then a white Share invite capsule with Copy and QR as round icons. **House rules** give every
> number a short line on what it does, as the switches already had. **Welcome** has a three-step strip (Host a table,
> Send the code, Friends sit down on their phones) and a name counter. The **You tab** has Your look (card backs, gold
> name, table felt as tiles showing what you wear). **Card packs** open on the pack you wear, fanned big, and a crowned
> pack is tried on there with Unlock with Premium before the offer. **Premium**'s buttons say the deal ("Subscribe
> for $50.00 a year", or the intro offer) and yearly says what it works out to a month.

> **21 Nov 2026 (owner): the Demo replaces How to Play.** Every game's Demo button (Home under the game's name, the
> game sheet's picture, the lobby's game card, the games shelf, the profile's Demos, the Premium games list) opens one
> hand of that game on the real table, against Luna and Max, with a coach over it (`docs/DEMO.md`). One step at a
> time: everything but the part it's about sinks under a deep night-blue dim (`rgba(5, 16, 58, 0.84)`), the part is cut
> out with rounded corners and the cut-out glides to the next part (320ms, ease-out). The caption is a white card with
> a blue step count, a rounded bold title and one line, under or over the lit part, whichever has more room; a step to
> read has a blue Next capsule, a step to do has a gold "Tap Call" line instead, and the thing to tap wears a breathing
> gold ring and a gold pointing-hand badge (both still under Reduce Motion) and is the only thing that takes a tap; a
> tap anywhere else lights the ring and buzzes. A capsule at the top names the demo, with Close on the right. The end
> is a white card: the game's icon, "That's <game>!", three ticked lines, then Play <game> (blue), or Unlock with
> Premium (gold, with a crown) for a Premium game without it, and Watch again and Done. Free for every game.
>
> **19 Nov 2026 (owner): shaded, not grey.** A card that isn't part of the hand that matters (a showdown's other cards,
> your folded cards, a folded player's in a replay) keeps its white face and full-colour ink under a dark shade
> (`dim` in `playing-card.tsx`), as the big poker apps do; the winning five lift with a gold ring. Grey faces with faded
> ink were hard to read.
>
> **19 Nov 2026 (owner): home game rules and the hand review.** The home game rules sit in the same box as Rebuys,
> each an on/off switch; turning the ante or bomb pots on adds a row of pills under it (the size, how often), the picked
> one in the app's blue. The table settings sheet has the same as toggles with a segmented control under them.
> Run it twice asks in the action area (Once in grey, Twice in the Call blue with a draining bar) and shows both boards
> on the felt, the first small over the second, each with a round run number. The hand review lives in the replay, not a new
> screen: a Review card at the top of the list, a line under the felt on each of your moves, a mark beside your moves in
> the hand log, and one line on the hand recap. It never grades: a pale blue eye where the odds come from real cards,
> a grey info mark where it's the pot odds and your hand only. Without Premium the card and the line are locked (a
> crown) and open the offer at `?reason=review`.
>
> **12 Nov 2026 (owner): consistency between Play and Train, and a lighter bots lobby.** Range training's ways to train
> (Daily hand, Endless, Sets, Gaps) are tiles in exactly the style of Play's game tiles: a flat field, a sticker picture
> from gameArt's shapes (`src/design/trainArt.ts`), the name in white rounded capitals on a darker band, the same crown.
> Play with bots shows who's at the table as a small group of faces floating softly (filled circles, names under them,
> evenly spaced on equal columns, a same-sized dashed Add button at the end), not a list and not a drawn table, so the
> game card stays on screen; new bots pop in, and a bot's menu (tap or long press) takes it out. The online lobbies' Players section is the same group, with an "Add Bot" button; a tap on a person opens their menu. People come first and wear a solid white ring (you, gold); bots follow with a faint ring. The LIVE tag on Rejoin has a pulsing dot.

> **21 Nov 2026 (owner, from a reference card): the lobby's game card is a living scene.** The picture is the whole
> card: the game's own sticker subject drawn big on the left (live SVG, sharp at any size) in a world of its own, parts
> of it moving on slow loops and the game's particles drifting over everything, the words on the right over a shade
> of the game's band. Each game has its own: Hold'em a table rail and rising suits, Haunted Pot a moonlit night and
> snow, Pittsburgh a bridge over flowing rivers and rain, Crazy Deuces confetti, Bean Stalk clouds and falling leaves,
> Round the Clock turning hands, Power Cards rings of power and sparks, and so on (`src/design/gameBanner.ts`). Still
> under Reduce Motion, paused off screen. Set pieces never sit behind the words.

> **Home (owner, 2026-11-19, from a mock-up).** Two tabs: Play and Train (a Hands tab came and went the same day: once
> Home had its shortcuts the owner had it removed). Home is the game
> swiper a little bigger, the game's name, hook and a "Try a demo hand" text link (a "How it plays ›" link until 21 Nov 2026, a Demo button until 23 Nov, when
> the owner agreed it read as a fourth button), then Play with friends on the big white button (near-black ink, not
> navy, and never the game's colour: one steady thing to press while the games flick past; 23 Nov 2026) (it was Host <game> until the same day: the name was said twice), with Play bots and Join a game under
> it. No "Tap me" hint pill and no page dots. Later the same day the owner brought back a row of round shortcuts over
> the big button: Stats, Saved hands and Share cards (the game card a touch smaller to make room; the big name and
> buttons stay). The spare height goes mostly above the game, so the buttons sit a little above the tab bar instead
> of leaving a gap under the link. The profile keeps Settings, Premium and Demos.

> **23 Nov 2026, evening (owner, from screenshots): Home and You tightened.** Home's "Try a demo hand" link went (it
> looked bad): a tap on the game's picture plays its demo hand. The three buttons have their icons back (two people,
> the robot, the QR viewfinder; words alone looked flat) and sit just above the tab bar, the spare height all above the
> game. Where your face used to be, top right, is a round glass button with a gold crown that opens Premium. On the You
> tab the face is smaller (108pt) and the Your poker card is compact (three numbers in one row; games and table wins
> sit in its All stats bar), so the card and Your look fit on the first screen. Every row on the You tab and in
> Settings has an SF Symbol in one fixed column, like the table menu. The table menu's Your turn bar sits under the
> sheet's title, not behind it.
>
> **23 Nov 2026 (owner): a You tab and a four-button Home.** The tab bar is Play, Train and You. You is the old
> profile as a tab: your face and name, the Your poker card (All stats), Saved hands and Share cards, then Premium,
> Demos and Settings. Home loses your face in the corner and the three round shortcuts, so it holds Demo, Play with
> friends, Play bots and Join a game, and the game card takes the room (up to 290pt). Train loses the face too.
>
> **23 Nov 2026, later (owner): the full-page colour is back, without the blue.** The night-blue base below was
> tried and dropped the same day: `GameBackdrop` is the game's own colour over the whole page again (lighter behind
> the picture, deepest at the foot), with no blue base and no blue light, but it keeps the calm: two faint white
> lights on 22s and 31s clocks, a few percent of breathing, and the colour following the swiper. Home's buttons (Play
> with friends, Play bots, Join a game) are words only, no icons.
>
> **23 Nov 2026 (owner): a game's page is night blue with the game's colour as a glow.** *(Replaced by the note above.)* Mixing each game's colour
> towards black turned the warm games brown (Die on the River's orange became a chocolate page) and the lights moved
> too much. Now `GameBackdrop` is the same night blue for every game (`brand.backdropTop` to `brand.backdropBottom`),
> with the game's colour as a glow centred on its picture (`focus`) that fades out before the buttons, and a faint
> wash from the top, so the shortcuts, buttons and tab bar look the same whichever game is chosen. Two soft lights
> (brand blue, a little white) drift on 22s and 31s clocks over a short distance, and the glow breathes a few percent
> on a 27s one: noticed only when looked for. On Home the colour follows the swiper (`progress`), blending between
> two games as the finger drags, rather than fading in after the card lands. Home and the lobbies stay dark in light
> mode too (the game art is drawn for dark), and the status bar is set for the whole app from one place
> (`StatusBarFollower`, `barStyleFor()` in `state/status-bar.ts`): white on the always-dark pages, the phone's own
> look elsewhere, unchanged under a sheet.
>
> **23 Nov 2026 (owner): one moving thing per page.** On the lobbies the page's slow glow is the only motion. The
> game card (`GameBanner`) is the same scene standing still (its bobbing parts and drifting particles are gone), and
> the faces in the players group (`FloatTable`) sit still. Pops, settles and fades on a change stay.
>
> **19 Nov 2026 (owner, from a mock-up): lobbies in the game's colour.** Play with bots, Play with friends and the
> table lobby use Home's `GameBackdrop` (`LobbyBackdrop` in `components/lobby/lobby-backdrop.tsx`): a dark shade of
> the chosen game's colour with its lights, fading to the next game's when Change picks another. The lobby's blue
> accents take the game's tint (`gameTint()`/`useLobbyTint()` in `native/src/theme/lobby-tint.tsx`): Back, Change,
> Copy, "How … plays" and Add Bot in a pale version of the game's light tone, the Start game words in its band colour
> darkened, the fade under the button in the page's darkest colour. Gold stays for you; panels stay see-through white.
> A party's lobby (several games) keeps the blue field. Texas Hold'em's lobby is green, as Home is.
>
> **19 Nov 2026 (owner): which pages wear a game's colour.** One rule: **a page about one game wears that game's
> colour; a page about the app, or about several games, stays on the blue field.** Game colour: Home (the game in the
> middle), the game sheet (`game/[id]`, `GameBackdrop` as a layer inside its scroll content), Play with bots, Play
> with friends and the table lobby. Blue: the party's lobby, playlist and party room (several games), Hands, Saved
> hands, Share, Premium, the welcome, Bot Lab and Settings; Train keeps its own darker blue. A party's break shows the
> next game as an **Up next** card in that game's colour (`UpNext` in `components/party/panel.tsx`: its picture, name,
> hook and the countdown), a card and not the page, because the break is mostly seen on the table's finish screen.
> The table page itself is never tinted: the felt already carries the game, and a coloured page would fight it and the
> cards. A replay keeps the blue page with the game's felt.
>
> **19 Nov 2026 (owner): buttons don't repeat the game.** The game's name is said once per screen, by the title or
> the game card. Home's big button is **Play with friends** ("Host a table · share the code"), the same on the game
> sheet, beside Play bots. A lobby's Start game (and Start party) has no second line when it's ready, since the game
> card names the game and Players counts who's in; its line only says what's missing ("Add a bot first", "Add a bot
> or wait for a friend").
>
> **19 Nov 2026 (owner, from a mock-up): the Train tab has one thing to do.** Titled Train, like its tab. Today's
> hand is a wide card at the top (`DailyCard` in `components/range/train-home.tsx`): the date, "Your first hand" on a
> first visit or "One spot. Your call.", and Play with your streak beside it; once played, how you did (a gold tick
> for the best play), when the next hand comes, Your answer and Share, and along its bottom the offer "Remind me
> tomorrow at 6 pm?" (the switch itself is in Settings). How it works shows for your first three hands. Under it,
> "Keep training": Endless, Sets and Gaps in one row (`ModeTiles`), under the same blurred lock as Home's Host button without Premium (`LockVeil`, "Unlock Premium to train"); Gaps is blue, not gold,
> and waits, dimmed, until you've missed something. Work on (Premium, once there's something), then your numbers
> (best plays, best run, hands played) only once you've played, then the library. No empty zeros, no footnote.
>
> **19 Nov 2026 (owner): no neutral grey boxes on a coloured page.** House rules' values are bold text under their
> name, with no box (`NumberRow`): the opaque system grey was the one dead colour on a game's page and read as a field
> you could type in beside its stepper. Lobbies scroll in `LobbyScroll`, which fades in a blur tinted with the page's
> darkest colour under the status bar once the page moves, matching Start game's bar at the bottom.
>
> **19 Nov 2026 (owner): lobby layout.** Code, Players, the game (its Demo inside its card), house rules, then
> Start a party last. The code card has Copy and QR as small round icons and Share as its one text button; a tap on
> the code changes it. Start game sits on a blurred bar tinted with the page's darkest colour, so nothing reads
> through round it. A tap or long press on a bot opens its menu (Swap for another bot, Remove from table, then Undo);
> the hold ring and its caption are gone.
>
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
> **Changed 17 Nov 2026 (owner):** a full page, not a pull-up sheet, closed by the round X; the app's own moving blue
> field and type (no bright gradient to black); each perk shown like an App Store screenshot, its title and line over
> an iPhone showing the app, cut off by the plan cards. Plan cards are solid dark panels at the panel radius.
> **Share cards (owner, 2026-11-19, from a mock-up):** drawn like the game icons, the sticker system of `gameArt.ts`:
> the game's flat colour, the real sticker cards and scenes with one ink outline and a hard flat shadow, the big
> number outlined like a sticker (gold for a win), white capsules for labels, the darker band for your face and name.
> Every card carries the real app icon with "Free on the App Store" and the game's icon in the corner. All free: a
> card is advertising, never a paywall. One style, no design picker; a hand can be drawn as Hand, Showdown or Odds.

> **Premium carousel (owner, 2026-11-17, after Flighty Pro's page):** one perk at a time, a big rounded title and a
> line over an iPhone running down under the plan cards. No pop-outs over the phone (tried and dropped the same day).
> Games is one slide, every extra game mode together on the Game modes screen, never a slide per game.

> **Bot Lab (owner, 2026-11-17, built without a mockup at the owner's ask):** Settings > Bot Lab is a dark page like
> Play with bots: your bots two to a row on the see-through panels, a round + at the top right. The editor puts the
> face big (a tap opens the faces under it) and the name as the big rounded title, then "How it plays": eight settings
> one a row on one panel, each the table's raise slider from 0 to 10 (17 Nov 2026: the round dials fought the
> page's scroll), with its name and a word for where it sits, the number on the right and its two ends under it, then Table talk. The editor has no swipe back (17 Nov 2026, the owner: a finger that just missed a slider and drifted sideways pulled the whole page away, since iOS 26 swipes back from anywhere), and each slider has 14pt of extra touch room above and below (`reach`); the page has its own Back, Save and Delete. + Add Bot in any lobby opens a small card out of the button: Random bot,
> your bots, Bot Lab. Bot Lab is Premium, and it's the Premium page's bots perk now (the roster is mentioned in its line).

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
   table) and in the Demo.
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

# The eight parked games

Secret Missions, Slide Switch, Headband, Conveyor Belt, Onion, Chain Reaction, Elevator and Double Board PLO were
taken out of FlipUp on 16 November 2026, before the first App Store release (the owner's call: they had no How to
Play pictures yet and little TestFlight time, and Slide Switch's bots folded too often). The app, the Worker and the
engine no longer know them, so nothing about them ships, not even switched off.

Their rules are in `RULES.md` here.

## Bringing one back

The quickest route is git. **`866d552`** (main after pull request #113) is the last commit where all 22 games work
on the engine, the server and the iPhone app. `git show 866d552:<path>` gives any file as it was.

This folder keeps copies from that commit so the code is easy to find without git:

- **Only these games used them** (move back as they are): `src/game/twists.ts` (Headband, Conveyor Belt, Onion,
  Chain Reaction, Elevator, Double Board PLO), `slide.ts`, `missions.ts`, `missionList.ts` and their tests;
  `native/src/components/table/mission-card.tsx`, `missions.tsx`, `native/src/state/mission-view.ts` and its test.
- **Shared files, whole, as they were** (merge the game parts back by hand, since these files have moved on):
  - `src/game/`: `holdem.ts` (dealing, the slide, peel and mission steps, PLO's showdown), `reducer.ts`, `types.ts`,
    `variants.ts`, `redact.ts`, `validate.ts`, `moments.ts`, `botVariants.ts`, `botGames.ts`, `botGameLines.ts`,
    `botTalk.ts` and `redactLeaks.test.ts`.
  - `src/design/`: `gameArt.ts` (the pictures) and `tokens.ts` (the felts).
  - `native/src/components/table/`: `felt.tsx` (the belt, the burned strip, two boards), `variant-steps.tsx` (the
    slide and peel pickers), `seats.tsx` (forehead cards, peeled cards), `my-area.tsx` (four and five hole cards, the
    mission card), `actions.tsx`.
  - `native/src/components/how-to/steps.ts` and `native/src/data/game-basics.ts` (their How to Play, which the app no
    longer has: it became the Demo on 21 Nov 2026, and their rules card).

What came out of the shared files, so you know what to look for:

- `types.ts`: the eight ids in `Variant`; `hand.slides`, `hand.slid`, `hand.peels`, `hand.peeled`, `hand.lastStop`,
  `hand.dropped`, `hand.burned`, `hand.headbands`, `hand.missionsDone`, `result.plo`; `game.missions`; the `slide`
  and `peel` actions; the `slides` and `peels` moments.
- `holdem.ts`: `askForSlides()`, `slideCard()`, `endSlides()`, `askForPeels()`, `peelCard()`, `endPeels()`,
  `dealMissions()`, `settleMissions()`, the belt, elevator and chain dealing, and the PLO split in `showdown()`.
- `variants.ts`: their `VARIANTS` entries, `holeCount()` by player count, `burns`, `streetCards`, `potLimit`,
  `showsOdds`, the PLO helpers.
- `redact.ts`: the headband view (your own card hidden, everyone's forehead card shown) and the slide and peel picks.
- The Secret Missions race makes chips from nothing when it settles; the "keeps every chip accounted for" test
  allowed exactly that.

To ship one: put its code back, write its Demo (a hand in `DEMO_SPECS` in `src/game/demo.ts` and its steps in
`native/src/components/demo/steps.ts`; `demo.test.ts` and `native/tests/demo-steps.test.ts` fail until it has one, see
`docs/DEMO.md`), add it to What's New, run `npm run check`, the native checks and `npm run bot:variants`, and play it on TestFlight.

## Imposter (parked 17 November 2026)

Imposter was taken out the same way (the owner's call: it had many issues still to fix). Its rules are in `RULES.md`
here, its old How to Play pictures are in `native/assets/howto/imposter/` (How to Play has since become the Demo) and the website's screenshot in
`public/shots/imposter.webp`. The last commit where it works is the one before the pull request that parked it:
`git log -S"id: 'imposter'" --oneline -- src/game/variants.ts` shows the commit that took it out, and `git show
<that commit>^:<path>` gives any file as it was.

What came out of the shared files:

- `types.ts`: `hand.imposter`, `hand.voting`, `hand.votes`, `hand.discussing`, `hand.tally`, `hand.points`,
  `result.imposter`, `moment.step`, the `discuss` and `tally` moment kinds, the `vote` and `point` actions and
  `TalkSeen.points`.
- `holdem.ts`: the seven-card deal (everyone the same two cards but one), the ante, no folding, `pendingVoters()`,
  `botsPoint()`, `startDiscussion()`, `endDiscussion()`, `pointAt()`, `startVote()`, `castVote()`, `endVote()`,
  `endTally()`, `splitPot()` and `imposterShowdown()`.
- `variants.ts`: the `VARIANTS` entry, `showsOdds()`, `anteBigBlinds()`, `IMPOSTER_MIN`, `botVote()`; `botGames.ts`:
  `crowdDeviation()` and `crowdAggression()`; `botVariants.ts`: `blendIn()`; `redact.ts`: the `imposter` and `votes`
  views; `moments.ts`: `tallyShown()`, `tallyOrder()` and the discuss and tally timings; `reactions.ts`:
  `IMPOSTER_REACTIONS`; `botGameLines.ts`: the five `imp*` lines; `variantFeel.ts`: its goals; `tableSetup.ts`: the
  bigger blinds.
- The app: the `Discuss`, `SuspectBar`, `Vote` and `Tally` steps in `variant-steps.tsx`, the role flash and pointing bar
  in `table.tsx`, the result banner and pill in `felt.tsx`, the vote sounds in `use-table-sounds.ts`, the extra quick
  messages, its picture and felt (`gameArt.ts`, `tokens.ts`) and its How to Play steps (now a Demo to write) and rules card.

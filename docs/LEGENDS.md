# Legends

> **Hidden for launch.** `LEGENDS_ON` in `src/game/legends.ts` is `false`, which removes the Home shelf, the finish screen's next-legend card and `startLegend()`. Everything below is still built. Parts of it also describe the AI twins, Insights, History and the coach, which have since been removed from the app.

Bots in the style of famous poker players, for a ladder of heads-up games. Stages 1 to 3 (the data, the
fit, the voices and the lab checks; the Play tab group, profile pages and heads-up play; the touches that
make each one feel like themselves) are built. The ladder that unlocks is stage 4, below.

## Decisions

| Question | Answer |
|---|---|
| Names | Real names, emoji avatars, no photos or lookalike art. Every screen that shows one says: "A style inspired by this player's public reputation. Not their real hands, and not endorsed by or affiliated with them." (`LEGEND_NOTE`). Names live in one file, so swapping to persona names is one change if anyone objects. This isn't legal advice: check before promoting the app widely. |
| Source | Hand-tuned from public reputation. We have no hands of theirs. |
| Access | A ladder that unlocks: beat one to open the next. |
| First version | Heads-up, five legends. |
| What they say | Original lines in `legendTalk.ts` that fit each style. Nothing is a quote. |

## The five, in ladder order

| Rung | Legend | How they play (our reading) | Signature habits |
|---|---|---|---|
| 1 | Doyle Brunson 🎩 | Old-school and aggressive: big bets, loose calls, quick play | Bets 75% to 150% of the pot, shoves readily |
| 2 | Phil Hellmuth 🧐 | Very few hands, folds a lot, easy to steal from | Tilts hard after a bad beat, slow, shows good folds |
| 3 | Daniel Negreanu 😄 | Small bets, wide calls, a lot of reading | Bets 25% to 60%, talks a lot, adjusts to you |
| 4 | Phil Ivey 🕶️ | Balanced, patient, no obvious leak | Quiet, leans on GTO's mix, adapts fast |
| 5 | Tom Dwan 🎲 | Loose and relentless, lots of hands and barrels | Fast, bets again and again, hard to read |
| 6 | Ethan “Rampage” Yau 🎰 | Action player: big bluffs, slow-played monsters, thin value raises | Reads opponents, a little overreach |

## How they're built (`src/game/legends.ts`)

- Each legend is a set of **numbers** (hands played, raising, folding to raises and bets, betting, c-bet,
  bluff share, open size, showdowns), the same numbers a twin keeps. `legendProfile()` turns them into the
  counts a twin would have after a thousand hands, and `fitStyle()` (the twin fit) turns those into a bot
  `Style`.
- **Habits** are laid over that style by `overlay()`: bet sizes, how much it reads, how much it leans on
  GTO, tilt and grudges, tempo, what it shows, how chatty it is.
- `dressAsLegend(player, legend)` sits one in a bot seat: its short name (seats hold ten characters), face,
  `Player.legend` (public), the matching style id for tilt and table talk, and its brain in `Player.twin`
  (stripped before a phone sees it, like a twin). There are no spots to copy, so it plays its style.
- **Talk.** `botSays()` speaks in the legend's voice (`b:<legend>:<event>:<i>`): the tone's pool first,
  then its own lines, short enough for a bubble. Phones can't send any of it.

## Checked in the lab

`npx tsx scripts/twinLab.ts legends 400` plays each legend at six-handed tables and compares its play with
its numbers, then plays heads-up.

- **Numbers.** Hands played and raising land within about 2 points of target; most of the others within 3 to 7. Aggression (bets and raises against calls after the flop) runs high for the quieter ones, and open size a little high.
- **Difficulty.** Bb/100 for a plain, honest player against each (the lower, the harder): Brunson −23, Hellmuth −9, Negreanu −64, Ivey −83, Dwan −67 (two seeds each of 2,000 hands per cell, so about ±20 of noise).
- **Heads-up against each other** (row against column, bb/100): Dwan beats all four (64, −12, 87, 102), Ivey comes out roughly even with the field, and Brunson and Hellmuth lose most. So the ladder follows what was measured: Brunson, Hellmuth, Negreanu, Ivey, Dwan. Ivey is the hardest for a plain player and Dwan the hardest against the other legends. Two rounds of making Dwan looser and wilder didn't move that, so it's left as measured.
- Tests (`legends.test.ts`): five distinct people and faces (none share a face or name with the forty bots), numbers read back from the counts, habits laid over the fit, every line short and spoken from its own voice, a legend's seat never sends its brain or style to a phone, and a legend decides from its own cards only while chips always add up.

## In the app (stages 2 and 3)

- **Play tab.** A "Legends" shelf under AI twins (`HomeLegends.tsx`): one card each, easiest first, on a
  backdrop that suits them (`LEGEND_SCENES` in `botScenes.ts`: colours and three emoji props, like the
  quick-game tiles) with their difficulty in a word (`RUNG_WORDS`: Warm-up, Easy, Tricky, Hard, Boss).
- **Profile** (`train/Legend.tsx`, route `legend`): their backdrop and five dots for how hard they are, a
  line on how they play, three things they're known for (`Legend.signature`), "How to beat them" (the same
  scouting a friend's twin gets, from their numbers, with a lower bar for what counts as standing out;
  Ivey has no habit to aim at and the page says so), a Play button and the note.
- **Play.** `startLegend()` sits you heads-up against a bot seat dressed by `dressAsLegend()`. The game
  carries `Game.legendGame`, so Play again on the final screen sits you down against the same legend again.
  Hands against a legend count towards your own twin like any other, and the game goes in Insights with
  their name. For now every legend is open: locking comes with the ladder.
- **Seat.** A gold star chip where a twin has "AI" (`Player.legend`, public), and "a legend" in the seat's
  accessible name.
- **Talk.** Each legend has about 40 lines. A second pass added the moments the first left quiet (watching
  someone else's all-in, a pot they weren't in, being bluffed, a reply), after the first lines so earlier
  line ids keep their meaning (tested).
- End to end: `legends.spec.ts` (the shelf in ladder order, a profile, sitting down against one, the star
  on its seat).

## Stages

1. Data, fit, voices and lab checks. **Built.**
2. Play tab "Legends" group, profile page, heads-up play. **Built.**
3. Backdrops, seat star, signature lines and more table talk. **Built.**
4. The ladder: beat one to open the next, badges stored on the phone, results in Insights, and the coach reviewing each game like the twin report.
5. Later: a full-table "legends night", more legends.

## Rampage

Added after stage 3. His numbers are prototype dials for the fit (aggressive, a taste for big bluffs, good at reading opponents), not his real statistics: nobody has his full hands, and the profile this comes from says so. The dials map onto existing knobs only: big and overbet sizes, `bluff`/`raise`/`value` leans, `trap` for slow-playing monsters, `sense` and `adapt` for reading, a little `wobble` and `chase` for overreach. No new bot logic. Measured with `twinLab.ts legends 300`, a plain player loses −123 bb/100 against him, the worst of the six, so he sits on the top rung ("Boss"); the rung words are now Warm-up, Easy, Tricky, Tough, Hard, Boss.

## Stage 4, as built

- **Ladder.** Brunson is open. Each next legend opens when you knock the one before out heads-up (their stack at zero, you first). Locked legends can still be read (profile and scouting), but "Play" is greyed out.
- **Badges and goals.** One badge for each legend beaten, one for the whole ladder, and others for wins, bluffs, big pots, all-ins, comebacks, beating your twin or a friend's, hands played and streaks. Three goals a day, one of them easy. Both live on the "Goals and badges" screen (Review tab, and the Today card on Play).
- **Memory.** A legend greets you with a rematch line if you've beaten them, or if you've only lost to them, and says a line when the game ends.
- **Records.** Your score against each legend, your twin and friends' twins, shown on the profile, the twin tile and the finish screen.
- **Not done.** Coaching review per legend and Insights charts per legend.

## Techniques, not just numbers

Each legend now also has a `craft` (see BOTS.md): Brunson plays ten-deuce and says so when it wins; Hellmuth waits, traps
and lays down good hands; Negreanu floats, probes, check-raises, reads and calls down; Ivey bets big on the river with the
best hands and with blocker bluffs, bets thin and adjusts fastest; Dwan fires barrels, floats and 3-bets and 4-bets light;
Rampage overbets the river, check-raises and traps. Their profile bullets say so. A legend that studies players
(`scouting`) also starts a game knowing what your AI twin knows about you. Daily goals are paused (`DAILY_GOALS`), so the
page with the ladder and badges is "Badges and ladder".

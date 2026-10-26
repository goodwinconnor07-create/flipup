# Legends

Bots in the style of famous poker players, for a ladder of heads-up games. Stage 1 (the data, the fit,
the voices and the lab checks) is built. The Play tab group, profile pages and the ladder are stages 2
to 4, below.

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

## Stages

1. Data, fit, voices and lab checks. **Built.**
2. Play tab "Legends" group under AI twins, one card each on a themed emoji backdrop, a profile page (how they play, difficulty, the note, Study and Play), heads-up play.
3. Signature touches: art, a seat badge, and more table talk.
4. The ladder: beat one to open the next, badges stored on the phone, results in Insights, and the coach reviewing each game like the twin report.
5. Later: a full-table "legends night", more legends.

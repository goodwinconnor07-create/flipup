# Table talk

How the bots (and the quick messages) talk at the table, and how that was tuned. The code is
`src/game/chat.ts` (the rules and timings, no screen in it), `src/game/botTalk.ts` and `botLines.ts` (what is
said), `src/screens/table/Bubbles.tsx` (the phone's side) and the lab in `scripts/chatLab.ts`.

## What it should feel like

Texting. A bot doesn't post a paragraph: it sends a few short messages in a quick row, each after a moment of
typing dots, and another bot may answer while the last message is still up. Nothing blocks play: a bot only waits
as long as its own line takes, and a person's quick message is up the moment it's sent.

## How a line is said

- **Cut into messages.** A line is a string; `|` starts the next message at once, `||` is a second thought (a longer
  pause, with the dots gone). Anything over 15 letters (`CHAT.cutAt`, what fits on one line in the narrowest seat)
  is cut at its sentences, then at a comma or a dash, then between two words near the middle. At most three
  messages. The cutting is done on the template, so a person's name in `{you}` can't add a break.
- **Typing, then the message.** Dots for `220 ms + 13 ms a letter` (at most 520), follow-ups 30% quicker, a
  150 ms settle between messages, 650 ms before a `||`.
- **Up long enough to read.** The words of a bot's line come through its bubble one at a time (`150 ms + 44 ms a
  letter` a word, a little longer at a comma, 300 ms at a full stop, never more than 4.8 s for the whole line), the
  last words hold for 1.3 s, and the bubble is up at least `readMs()` (a moment to notice it, then an easy 15 letters
  a second) plus a second to spare, so any line can be read at a normal pace with time left over. A seat shows one
  message at a time: the next replaces it, but not before it has had `readMs()`. Nothing stacks, and a bubble is never wider than its seat, so neighbours can't overlap.
- **One speaker types at a time.** The next bot starts typing 750 ms after the last message of the one before has
  landed, so they answer each other, but a message still up while the next bot types is fine, like a group chat.
- **Stale lines go.** A "c'mon!" is dropped when the next card lands; a remark about a move is dropped once the move
  is made; a line that waited more than 3.2 s (5.2 s for a reaction to a hand) never starts. A person's quick message
  skips the queue.

`ChatLane` (in `chat.ts`) does all of that with the time passed in, so it is tested with no clock and no screen.
`useReactions()` (in `Bubbles.tsx`) feeds it what the game says, and wakes up when it says something is due.

## Who says what, and when

- `botSays()` returns how long a line takes to say and read, and the bot waits that long before it moves
  (`game.talkDone`), so a line is never cut off by the move it was about. With every person out of the hand the
  bots hurry, so they don't think out loud then.
- After a hand the next deal waits for the talk (`TIMING.talkPause` to `talkPauseMax`), and sometimes another bot
  answers: `cheer` after a win, `commiserate` after a loss, `reply` otherwise.
- A person's quick message is answered about 60% of the time by a bot that hasn't just spoken: `thanks` for a
  compliment, `ribbed` for a tease, `goodLuck`, `gg` (`ANSWER` in `reducer.ts`), by name.
- A new game with several players: one bot welcomes the table, and another may say hi back (`greetBack`) before the
  cards come. Heads-up, the bot says hello to the person by name.
- A legend that wins with its signature hand says so (`signature`).
- On a phone, a seat out of the row slides in when its player talks, as long as whoever is on turn stays in view;
  if it can't, the line is dropped instead of drawn off screen (`canShow` in `Pods.tsx`).

## Talking more, without one bot taking over

`botSays()` rolls the dice for each moment: the moment's chance (`CHANCE`) times the style's chattiness times
`TALKATIVE` (1.3), times `share()`. `share()` is 1 for a bot that has said no more than the table's average plus two
lines and falls to 0.35 for one far ahead of it, so the loudest style can't take over. Heads-up the one bot is
the whole conversation, so it eases to 0.6. The per-bot cooldown is 2.6 s.

New moments (the pools start empty in `botTalk.ts` and grow in `botLines.ts`, in the legends' file for them):

- `flop`, `turn`, `river`, `bigPot` (30 big blinds or more), `longHand` (a river after 14 moves): `streetTalk()` after a street
  comes down, one bot still in the hand, only while a person is in it. They are dropped when the next card lands.
- `shortStack` (10 big blinds or less), `chipLead` (1.8 times the table's average), `button`, `bigBlind`,
  `handMilestone` (every tenth hand): `dealTalk()` at the deal.
- `beforeFlop`, `beforeTurn`, `beforeRiver`, `beforeShowdown`: see the next part.

## A word before the card turns (phone tables only)

On a table that runs on one phone (no table code), a bot that still has cards in the hand may say something just
before the flop, turn, river or showdown turns over. `dramaPause()` returns how long the line takes to say and read, and
the card waits for it: `pauseBeforeNextStreet()` adds it to the street pause, and the showdown waits in
`hand.showdownAt`. It never holds the card longer than `DRAMA_MAX` (3.2 s), halves under Fast bot games, and is
skipped once every person has folded. An online table (it has a code) is left as it was. These lines are dropped
with the other "c'mon" kind when the card lands.

## Writing lines

- Every message should fit one line in a seat: about 15 letters. Use `|` to say where it breaks.
- Line ids are indexes into a pool and only ever grow at the end (`botLines.ts` is the second pass). Change the
  words of an old line if you like; don't remove or reorder one.
- A `hello` line has to name the person (`{you}`). Anywhere else a bot may not know who it's talking to, and the name
  is left out cleanly ("Bold, {you}." says "Bold.").
- Tests (`chat.test.ts`) check every line in the game: no empty message, no words lost, at most three messages, nearly
  all one line, spoken in under two seconds.

## The lab

`npx tsx scripts/chatLab.ts [tables] [hands]` plays whole tables with a person at them on a simulated clock, feeds
what the bots say through the same lane, and reports how it would feel (it also prints the longest line in the game).
Stage 3 numbers, from 12 tables of 40 hands in each setting, before and after:

| Table | lines a hand | busiest bot's share | bubble up p5 | bubble up p50 | talk on screen | moves before the line landed |
|---|---|---|---|---|---|---|
| heads-up | 0.52 → 0.85 | one bot | 1.4 → 2.2 s | 2.0 → 2.8 s | 8% → 16% | 0 → 0 |
| 3 bots | 0.85 → 1.45 | 39% | 1.5 → 2.2 s | 2.0 → 2.8 s | 11% → 23% | 0 → 0 |
| 5 bots | 0.71 → 1.27 | 31% | 1.4 → 2.2 s | 2.0 → 2.8 s | 9% → 19% | 0 → 0 |
| 8 bots | 1.21 → 1.82 | 23% | 1.5 → 2.2 s | 2.0 → 2.8 s | 10% → 20% | 0 → 0 |

The longest line in the game (an answer by name, 41 letters) takes 2.4 s → 3.5 s to say and read, which is how long
its bot waits before it moves, and its bubble is up 3.8 s → 5.2 s from the first dots. Every bubble is up at least its
read time plus a second. There are about 2,800 different lines now, up from about 1,300. The earlier table
(24 tables of 60 hands) is in git history.

`e2e/chat-timing.spec.ts` (dropped in Phase 2, in git history; it was not re-run for Stage 3) played 110 seconds of a seven-bot table in a real browser and records every bubble frame
by frame: messages were up for a median 1.2 s (never under 0.9 s), follow-ups 300 to 350 ms apart, typing dots about
330 ms, nothing off the screen or under the header, no two seats' bubbles overlapping.

Two things the browser test found that the unit tests didn't: a bot moved only 0.6 s after speaking, so its message
was gone before it could be read (now `CHAT.readTime`, and the bot waits for its own line), and a new hand dealing
wiped messages that had just landed (now only a waiting line or a "c'mon" is dropped when the moment changes).


## Bubble upgrades (9 Nov 2026)

- **Held beats.** A bot's line is one bubble, but its `|` and `||` breaks are kept as pauses in the ticker (`Beat.pauses`,
  `CHAT.pauseQuick` 220ms, `pauseSlow` 560ms, after the word that ends a piece), so `Funny.||I'll remember this.` and
  `Brick.|Brick.|Brick.` keep the timing they were written with.
- **Windows stop at a full stop.** `windowAt()` never reaches back over the end of a sentence, so two thoughts are not run
  together in one bubble.
- **Why not a bigger bubble.** A wrapped two- or three-line bubble was tried on paper and dropped. Lines run a median 14
  letters (p90 22, p99 31, max 41), but a seat at a four-handed table has room for about 10 letters a line, so half of all
  lines would be two lines (about 40pt) and one in four three (about 56pt), growing over the neighbouring seats and the
  board while up to two bots' bubbles are up at once. The one-line conveyor stays.
- **Who is talking.** The line id says the voice (`voiceKind()`): a friendly bot's bubble has a thin blue ring, a legend's a
  gold one, a trash talker's is plain. A line aimed at you has a stronger blue ring and a light haptic as it lands.
- **Emoji are stickers.** An emoji-only message (yours or a bot's) is drawn big with no capsule. Bots send them now and
  then (`EMOJI_TRASH`/`EMOJI_FRIENDLY` in `botLines.ts`), and the quick messages gain Nice fold!, Big bet?, Run it!, 😎, 😭, 🙏
  (bots answer them through `ANSWER` in `reducer.ts`).
- **A voice.** Each word of a bot's line makes a very quiet tick, pitched per bot from a hash of its id (`playBlip()` in
  `sounds.ts`); muted when the table is muted. VoiceOver reads only lines aimed at you and people's own messages.

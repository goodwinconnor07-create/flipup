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
  80 ms settle between messages, 650 ms before a `||`.
- **Up long enough to read.** Each message stays `700 ms + 30 ms a letter` (1.2 s to 2.4 s). A seat shows one
  message at a time: the next replaces it, but not before it has had `readMs()` (a moment to notice it, then 25
  letters a second). Nothing stacks, and a bubble is never wider than its seat, so neighbours can't overlap.
- **One speaker types at a time.** The next bot starts typing 260 ms after the last message of the one before has
  landed, so they answer each other, but a message still up while the next bot types is fine, like a group chat.
- **Stale lines go.** A "c'mon!" is dropped when the next card lands; a remark about a move is dropped once the move
  is made; a line that waited more than 2.6 s (4.5 s for a reaction to a hand) never starts. A person's quick message
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
what the bots say through the same lane, and reports how it would feel. From 24 tables of 60 hands in each setting:

| Table | lines a minute | messages a line | start p50 | up p5 | talk on screen | two seats talking | moves before the line landed |
|---|---|---|---|---|---|---|---|
| heads-up | 2 | 1.3 | 0.36 s | 1.2 s | 5% | 0% | 0 |
| 3 bots | 4 | 1.3 | 0.4 s | 1.2 s | 8% | 1% | 0 |
| 5 bots | 4 | 1.3 | 0.6 s | 1.2 s | 8% | 1% | 0 |
| 8 bots | 5.5 | 1.4 | 0.4 s | 1.2 s | 10% | 2% | 0 |

`e2e/chat-timing.spec.ts` plays 110 seconds of a seven-bot table in a real browser and records every bubble frame
by frame: messages up for a median 1.2 s (never under 0.9 s), follow-ups 300 to 350 ms apart, typing dots about
330 ms, nothing off the screen or under the header, no two seats' bubbles overlapping.

Two things the browser test found that the unit tests didn't: a bot moved only 0.6 s after speaking, so its message
was gone before it could be read (now `CHAT.readTime`, and the bot waits for its own line), and a new hand dealing
wiped messages that had just landed (now only a waiting line or a "c'mon" is dropped when the moment changes).

## The coach

The coach's bubbles (`Coach.tsx`) get the same treatment: a long line is cut at its sentences into at most three
bubbles (`splitSentences()`), smaller (15 px), and each pops in as long after the one before as that one takes to
read (`COACH_TIMING`), after a 0.34 s "typing" bubble.

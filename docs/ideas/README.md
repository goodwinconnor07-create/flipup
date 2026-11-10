# Ideas, ranked

**Built on 9 Nov 2026 (branch `overnight/bug-sweep`):** 2 (can't-connect card and page), 8 (mode chip on the finish page, with a Premium check in the room), 9 (Premium banner after the first finished game) and 10 (`scripts/crowdedTable.mjs`). **6 is not built:** see the note under the table.

Proposals only. Nothing here is built, and the owner approves mockups first (see `CLAUDE.md`). They come from reading the code and looking at web-export screenshots at 320 and 390pt, not from playing on a phone. Open `mockups/ideas.html` in a browser to compare the three that are drawn.

| # | Idea | File | Effort | Why first |
|---|------|------|--------|-----------|
| 1 | "Deal me in": a first hand with bots before the two tiles (mockup 1) | first-run-and-home | S–M | Fewest decisions before the first card |
| 2 | A calm "can't connect" page that says your chips are safe (mockup 2) | errors | M | The real worry in a failed connection |
| 3 | One line on why that hand won, at every showdown (mockup 3) | table-and-game-flow | S | The text already exists in `explainHand()` |
| 4 | Ask for the name after the first hand, not before | first-run-and-home | S | Removes the only wall on the friends path |
| 5 | On small phones, shrink the Range felt instead of letting the answer bar cover it | table-and-game-flow | S | Seen at 320 × 568 |
| 6 | Opt-in "Your turn" notification when the app is in the background | table-and-game-flow | S | Online games stall on a sleeping phone |
| 7 | Imposter: show how many are pointing at each seat | table-and-game-flow | M | It is the heart of the mode |
| 8 | A "Next mode" chip beside Play again | table-and-game-flow | S | Keeps a group in the app between games |
| 9 | Show the Premium banner after the first finished game | first-run-and-home | S | Don't ask before the player has had fun |
| 10 | A 9-player, longest-name screenshot test at 320 and 390pt | errors | S | Small-phone layout bugs keep coming back |

Also in the files: a "First hand!" payoff on Passport (first-run), who-left toasts (errors).

**Why 6 is not built.** The idea said a local notification. A phone can only schedule a local notification while the app is running, and iOS suspends FlipUp and drops its socket soon after you leave it, so the app can't know it is your turn. It needs a real push from the server: an Apple push key, a device token sent to the Worker, and the Worker calling Apple when a turn starts. That is a new server feature with a secret, so it needs the owner's go-ahead.

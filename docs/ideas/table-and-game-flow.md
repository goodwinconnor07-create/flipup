# Table and game flow

From reading the code (`moments.ts`, `variant-steps.tsx`, `table.tsx`) and the earlier mini-game work. Not playtested on a device.

## 1. One-line "what just happened" at every showdown (S)
**Problem.** The mini games change who wins in ways players can miss (a wild 2 became a straight, the third river was used, closest to 21 took half).
**Proposal.** `explainHand()` already says which line, river or run a hand uses. Show its sentence as a single caption under the winner banner for every variant, for about 3 seconds, and keep the full text in the hand log.
**Why.** Turns a confusing loss into a learned rule, which is what keeps people trying the other modes.
**Risk.** One more thing on a busy screen; use the existing banner slot, not a new overlay.

## 2. A "your turn" nudge that waits, then asks (S)
**Problem.** With a 30s clock and friends around a real table, a missed turn is easy (people look away). The seat glow breathes, but nothing reaches a locked phone.
**Proposal.** Optional local notification ("Your turn at ACES42") only when the app is in the background and the table has a clock, off by default in Settings.
**Why.** Online friend games stall when one phone sleeps.
**Risk.** Needs a notification permission prompt; keep it opt-in, and ask only after the first friends table.

## 3. Show the clock ring earlier on small phones (S)
**Problem.** At 320pt wide the Range training answer bar covers the felt (seen in the web export at 568pt height).
**Proposal.** Below ~600pt of height, shrink the felt (the table already supports `fit` down to 60%) instead of letting the pinned bar cover it.
**Why.** iPhone SE class devices are small but still sold.
**Risk.** None for larger phones.

## 4. Imposter: let people see who has pointed at whom while discussing (M)
**Problem.** `hand.points` is public, but during the 14s discussion the pointing is a quiet thing.
**Proposal.** A thin arrow or a small count badge on each seat ("2 pointing at you") while the discussion runs.
**Why.** It is the heart of the mode; more visible social pressure makes the vote feel earned.
**Risk.** Visual noise at nine seats; show counts only, not arrows, above six players.

## 5. Table-end "one more?" that remembers the mode (S)
**Problem.** After a game ends, Play again exists, but players who want a different mode have to go Home.
**Proposal.** Put a "Next mode" chip beside Play again that cycles to another mode the table hasn't played tonight.
**Why.** Mini-game nights thrive on variety; this keeps the group in the app.
**Risk.** Host-only control for online tables (already how Play again works).

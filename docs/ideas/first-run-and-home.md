# First run and Home

Written from reading the code and looking at web-export screenshots at 390 and 320pt (not played on a phone). Nothing here is built.

## 1. A "Deal me in" first hand (S–M)
**Problem.** A brand-new player lands on Home with two equal big tiles (friends, bots), a Join row and a shelf of ten game modes. Only a small "How to play" card at the bottom explains anything. The friends tile also asks for a name first, which is a wall before any fun.
**Proposal.** Until the first hand is played, Home leads with one hero card, "Deal me in", that sits down with three bots in Texas Hold'em at once (no lobby, no name page: the name is asked after the first hand, where the finish page already has a natural place for it). The two tiles come back after the first hand.
**Why.** Fewer decisions before the first card. The hand itself is the tutorial; How to play stays one tap away on the hero.
**Risk.** Changes the owner's Home layout; needs a mockup approval (see `mockups/ideas.html`, frame 1).

## 2. Ask for the name later, once (S)
**Problem.** Play with friends and Join both stop at "What should we call you?" the first time.
**Proposal.** Default to "Player" + a random face, offer the name sheet as a small, skippable row on the finish page ("Your friends see 'Player'. Change?").
**Why.** Removes the only blocker on the friends path. Names are already filtered and unique per table.
**Risk.** A table of five "Player"s: the engine already suffixes duplicates (`uniqueName()`).

## 3. Premium banner timing (S)
**Problem.** Premium shows on Home from the first launch, under How to play.
**Proposal.** Show it after the first finished game (the review prompt already waits for three), and keep it in Game modes via the crown tiles meanwhile.
**Why.** Asking before the player has had fun is the weakest moment to ask.
**Risk.** Lower early Premium sightings; the crowns still advertise it.

## 4. A fuller empty state for "Passport" (S)
**Problem.** Before the first hand Home shows the How to play card; after it, Passport. Nothing in between celebrates the first hand.
**Proposal.** After hand one, Passport appears with a one-time "First hand!" line and the hand you made.
**Why.** A small payoff right when the player is deciding whether to come back.

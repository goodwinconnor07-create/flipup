# Errors and unplanned situations

A review of what a person can actually reach when something goes wrong. See also `docs/security/FINDINGS.md`.

## Checked and fine
- No network: calls say "Couldn't reach the server. Check your connection and try again." (`request()` in `state/api.ts`).
- Wrong or closed table, full table, wrong code, rate limits, Premium required, blocked name: the server's own plain sentence is shown.
- A corrupted or older saved value in any `flipup.*` key (310 combinations tried in the web export): the app opens, no crash screen.
- Camera or contacts permission denied: the Join sheet offers a Settings button, and Invite from contacts has a denied state with Open Settings.
- A corrupted saved table: "No table open" with a way back.

## Fixed in this branch
- Hotel and airport Wi-Fi sign-in pages answer with HTML and a 200. The app used to show the raw "Unexpected token '<'…" sentence; it now says "The server's answer didn't look right. Check your connection and try again."

## Ideas
### 1. A calm full-page "can't connect" with Retry (M)
**Problem.** A lost connection at a table shows "Reconnecting… No connection. Trying again…" with only Back to Home.
**Proposal.** After about 20 seconds of failing, change it to one sentence ("Still can't reach the table. Your chips are safe.") with Try again and Leave. Say that chips are safe because that is the real worry.
**Why.** A player who can't tell whether they lost money will leave angry.
**Risk.** Needs a copy check against what is true for each mode (online tables keep your seat for a while).

### 2. Say who left, not just that someone did (S)
**Problem.** A host leaving ends or moves a table; guests may not know which.
**Proposal.** A one-line toast: "Connor left. Alex is the host now." (or "The table closed.").
**Why.** Removes the guessing at the moment people are most confused.

### 3. Long names and nine players (S)
**Problem.** Names are limited, but a 10-letter name in a narrow seat plus a bubble at nine players was not re-checked at 320pt in this pass.
**Proposal.** Add a Playwright screenshot test at 320 × 568 and 390 × 844 for 9 players with the longest legal names and emoji, so layout regressions show up in review.
**Why.** The seat row, the bubbles and the ghost seat have all had small-phone bugs this month.

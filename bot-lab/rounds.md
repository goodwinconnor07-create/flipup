# Tuning rounds

Rules followed: at most three rounds; each candidate is the baseline plus **one** change (so a regression can't hide behind an
improvement), kept as a patch in `patches/` and a frozen engine in `engines/`; every candidate is compared with the baseline on the
**same sessions** (same chance seeds, seats and bot names; differences are candidate minus baseline). Development seeds only. The
confirmation seeds were not touched until the candidate was frozen (see `report.md`).

Matched comparisons mean that where a change never fires, a session comes out *bit-for-bit identical* in both arms (for example
the archetype rows that read "+0.00"). Where it does fire, play diverges after that hand and chance takes over, so bb/100
differences between styles are mostly noise; read the behaviour rows and the intervals, not the bb/100 point estimates.

Hands simulated for tuning: round 1 7,100, round 2 8,300, round 3 6,200 (21,600 total). Wall time 309 s, 99 s and 27 s.

## Round 1: price floor (kept)

- **Issue:** finding 1, choice noise can fold a hand that is far ahead of the price.
- **Change** (`patches/r1-price-floor.patch`, 3 lines in `postflop()`): if the bot isn't able to check, its chance of winning against
  the range it imagines is over 0.5, and that is more than three times the price of the call (`toCall / (pot + toCall)`), it
  cannot fold. This is the existing "nobody folds the near-nuts" rule (equity over 0.92) extended to cover cheap prices.
- **Expected benefit:** no more folding full houses for a few chips. **Possible cost:** nervous becomes a little less timid; the
  soft styles could win a little more.
- **Sample:** `full9-bots`, `six-bots`, `six-two-archetypes`, 17 matched sessions, 7,100 hands.
- **Result.**
  - Strong hands folded to half-pot-or-smaller bets, nervous: **21% → 5%, difference −16.7 points [−30.8, −4.4]**. Others unchanged
    (0 to 3%).
  - Nervous fold to bet 55% → 57%, bluff share 43% → 40% (not significant), VPIP and PFR unchanged for every style (the change is
    post-flop only; tag +0.5 points [+0.1, +1.1] is the only significant preflop difference and is chance, since preflop never uses the change).
  - bb/100 differences are all inside their intervals except where they touch zero: pro +48 [−0.4, +96], maniac +154 [0, +371],
    gambler −42 [−94, +0.6], nervous −13 [−62, +28], station −14 [−55, +29].
  - Table shape unchanged (flops 69% → 68%, showdowns 37% → 37%, average pot 87 → 89 bb nine-handed).
  - Mean pairwise distance between styles 1.15 → 1.16; closest pair 0.35 → 0.33 (within noise).
  - Speed unchanged (mean 6.9 → 6.2 ms a step).
- **Decision: keep.** It fixes a confirmed bug-like behaviour at no visible cost. The maniac and gambler differences are the
  ones to watch; they are inside noise here and the confirmation set checks them.

## Round 2: shorthanded tight cutoff, multiplicative (rejected)

- **Issue:** finding 4, tight styles don't open up as the table shrinks.
- **Change** (`patches/r2-short-handed-tight.patch`): multiply a tight style's cutoff by `1 − 0.35 × (6 − players) / 4`, so 5
  players ×0.91, heads-up ×0.65.
- **Sample:** `hu-bots`, `hu-archetype`, `six-two-archetypes` (5 players), 87 matched sessions, 8,300 hands.
- **Result.** It worked on the target and broke a guardrail.
  - Heads-up and 5-handed VPIP: tag 26% → 33%, trapper 27% → 33%, **rock 19% → 34%**, nervous 33% → 36%.
  - But rock (34%) now plays as many hands as tag (33%) and trapper (33%): the order of "how tight" collapsed. Rock lost its identity.
  - Side effect that looked good: the aggressive script's edge over the field shrank from +194 to −18 bb/100 (difference −212 [−409, −39]),
    and the station script did worse (−43 [−66, −16]).
- **Decision: reject as written, revise** (round 3). Scaling a cutoff *proportionally* squeezes the differences between styles,
  because VPIP is steep in the cutoff below about 0.6.

## Round 3: shorthanded tight cutoff, additive (kept, low confidence)

- **Change** (`patches/r3-short-handed-tight-additive.patch`, later tidied into `tightLine()` in `botPlay.ts`): subtract
  `0.14 × (6 − players) / 4` from every tight style's cutoff, so the gap between styles is unchanged.
- **Sample:** `hu-bots` and `hu-archetype`, 80 matched sessions, 6,200 hands (the five-player table was dropped to stay inside the hand
  budget; round 2 had shown it moves little).
- **Result.**
  - Heads-up VPIP: rock 19% → 24% [+1.0, +8.0], tag 25% → 31%, trapper 27% → 34% [+5.1, +9.3], nervous 39% → 45% [+2.5, +9.3].
    **Order kept: rock 24 < tag 31 < trapper 34 < nervous 45.**
  - Pro, shark, lag, gambler: sessions bit-identical (they have no cutoff).
  - Style separation (distance between styles divided by the noise floor) 1.1 → 1.5; closest pair 0.61 → 0.84. Personalities
    got a little more distinct, not less.
  - Difficulty: maniac −118 [−302, 0] (more forgiving), station −12 [−30, 0], tag −40 [−86, +5], trapper +25 [−38, +62],
    nervous +52 [−26, +121]. None clearly outside noise.
  - The aggressive script's edge did *not* shrink (+131 → +146 [−23, +60]): that effect in round 2 came from the larger change.
- **Decision: keep, low confidence.** The benefit is realism in short-handed games (tight bots don't fold 75–80% of
  hands heads-up) and it does not cost any identity, but there is no measured win-rate benefit.

## Looked at and not changed

- **Full-ring width (the earlier "RING" idea).** Not tested. The baseline shows nine-handed tables already see a flop 69–72% of
  the time, and the symptoms that motivated it (a fold-fest, check-arounds) did not appear (finding 3). Making tables looser
  would add to the "hot" behaviour in finding 8, not fix anything we could measure.
- **3-bet defence.** Not changed. The probe showed openers fold 44% to a 3-bettor and 4-bet 19% (finding 2).
- **Cloned bots / near-identical families (pro vs shark)** and **bluffing the calling station**: design questions or thin
  evidence; listed in `findings.md`.

## Hand budget

| Phase | Hands |
|---|---|
| Pilot (baseline engine) | 2,010 |
| Baseline study (development seeds) | 20,000 |
| Re-run of the heads-up sessions with the second counter set | 4,200 |
| 3-bet probe (baseline) | 4,000 |
| Round 1 / 2 / 3 (candidate arm only; the matched baseline sessions already existed) | 7,100 / 8,300 / 6,200 |
| Confirmation, baseline arm + candidate arm (14,880 each) | 29,760 |
| **Total** | **81,570** (cap 82,000) |

# The FlipUp GTO playbook

What the backend knows about GTO poker, condensed into rules that drive the review explanations
and are worth knowing as a player. Every claim either comes from the research notes in
`research/` (which cite their sources) or was reproduced with our own solvers; results we
computed ourselves are marked **[our solver]**.

## 1. What "GTO" means here

- In heads-up poker, a GTO strategy is a Nash equilibrium: it can't lose on average against any
  opponent, and no single deviation by either player gains. Our postflop solver finds it with
  Discounted CFR and measures how far from perfect it is with an exact best response
  ("exploitability", reported as % of the pot). Review solves stop around 0.5–1% of the pot;
  standalone solves go below 0.3%.
- With three or more players there's no unexploitability guarantee. Our preflop solver still uses
  CFR (as Pluribus did) and the results look like published solver charts, but multiway advice
  is "solver-approved", not provably optimal.
- The review grades by **EV loss**, not by frequency. At equilibrium, a hand that mixes two actions
  is indifferent between them, so choosing either is correct. "GTO bets 30% of the time" doesn't
  make checking wrong.

## 2. The math every explanation uses

| idea | formula | half-pot bet | pot-size bet |
|---|---|---|---|
| required equity to call | call / (pot after bet + call) | 25% | 33% |
| MDF (defend at least) | pot / (pot + bet) | 67% | 50% |
| alpha (bluff needs to work) | bet / (pot + bet) | 33% | 50% |
| river bluff share of a balanced range | bet / (pot + 2·bet) | 25% | 33% |
| value : bluff on the river | (pot + bet) / bet | 3 : 1 | 2 : 1 |

- Geometric sizing: betting ((1 + 2·SPR)^(1/n) − 1) / 2 of the pot on each of n streets gets
  stacks in by the river. For a 100bb single-raised pot (SPR 17.7) that's 116% per street
  **[our solver reproduces GTO Wizard's 115.8%]**.
- MDF applies to the first bet against zero-equity bluffs. Out of position, and on earlier streets
  where bluffs have equity, GTO often defends somewhat less.
- SPR guides commitment: top pair stacks off at SPR ≤ 2, is marginal around 5, and is a
  pot-control hand at 13+.

## 3. Verified foundations [our solver]

- **Polar river game.** A bettor holding nuts or air against a pure bluff catcher bets all value,
  bluffs b/(1+b) as often as it value-bets, and the caller defends 1/(1+b). With a pot-size bet:
  bluffs at half the value frequency, calls 50%, and the bettor wins 4.5/19 of the pot. The solver
  reproduces all three to three decimals. This is the reason behind every bluff-frequency
  explanation.
- **Push/fold heads-up at 10bb.** The button shoves 58.2% of hands and the BB calls 37.3%, the known
  Nash result. At 15bb it's 45.5% / 28.5%; at 20bb 40.2% / 21.7%.
- **Postflop accuracy.** On river, turn and flop spots our EVs match the open-source
  postflop-solver within 0.01% of the pot.

## 4. Preflop

**Opening (raise first in).** Published 6-max 100bb charts (raked games) open roughly UTG 17.6%,
HJ 21.4%, CO 27.8%, BTN 43.5%, with the SB raising 40–50% (about 62% if it can limp). Sizes:
2–2.3bb early, 2.5bb on the button, 3bb from the SB. Open-limping isn't part of GTO except from
the small blind.

**No rake makes everything wider.** Home games with friends have no rake, so the blinds can defend
more and everyone can open a little wider. Our solver is rakeless by default for that reason; set
`rake_rate`/`rake_cap` to compare.

**3-bets.** In deep cash games, every position except the BB mostly plays 3-bet-or-fold against an
open. Size about 3× in position and 4× from the blinds. Value is QQ+ and AK; the bluffs are hands
that block strong hands and play well (A5s–A2s, suited connectors). Ranges are linear when players
are left behind and polar when nobody is (or in position against the opener).

**4-bets** go to about 2.2–2.5× the 3-bet at 100bb; most 4-bet all-ins come from out of position.

**BB defense.** The BB gets a good price but realizes its equity badly out of position, so it folds
weak offsuit hands even against small opens. Pot odds against a 2.5× open are 27% without rake.

**Equity realization (EQR) [our solver].** Across 16 random flops in a BTN-vs-BB single-raised pot
(100bb), the button realized **115%** of its raw equity and the big blind **75%**, in line with
published figures. Board by board the BB ranged from **52%** (A♦A♣2♣) and 61% (A♠K♥5♥) up to 90%
(J♥8♠8♣): ace-high and paired-ace boards are terrible for the caller, low and middling boards much
better. Per hand, strong hands realize far more than their equity (AA about 1.7× in position) and
weak offsuit hands out of position far less (72o, T6o under 40%). That's why the BB folds trash even
at a good price, and why preflop calls need a margin over raw pot odds. The preflop solver's
realization model is fitted to these measurements (`scripts/calibrate_eqr.py`).

## 5. Postflop principles

- **Range advantage sets how often you bet; nut advantage sets how big.** The preflop raiser has
  both on high-card boards (A-K-x, K-Q-x), so it bets very often and small there. The caller's
  range hits low, connected boards (7-6-5, 6-4-2), so the raiser checks more and bets bigger with
  the hands it does bet.
- **In-position c-bets** (BTN vs BB): close to 100% on dry high and paired boards with small sizes,
  around 70% on A-high and connected single-broadway boards, 55–60% on middling boards, and low on
  low connected boards. **Out of position** the raiser c-bets much less (UTG vs BTN about 28%).
- **Bet / check / bluff.** Value hands should be ahead of most of the hands that call (more than
  50% on the river; a bit more in position, where you can be raised). Medium hands with showdown
  value check. Bluffs are hands with little showdown value. Before the river the best bluffs have
  equity (draws, backdoors); on the river they block the calls and unblock the folds.
- **Later streets get more polar**: lower betting frequency, bigger sizes, two pair+ and draws bet
  while one-pair hands check.
- **Bluff catching**: call when your hand beats all the bluffs and blockers tilt the ratio, not
  because "they could be bluffing". Over-bluffed spots turn bluff catchers into pure calls.
- **Thin value** after the turn checks through is small (about 16–21% of the pot); strong value is big.

## 6. Multiway pots

- Each player needs to defend far less: against a pot-size bet, each of two defenders only about
  29%. So bluffs need real equity, sizes get smaller, and value ranges get tighter.
- Small-stakes players heavily under-bluff multiway rivers, so fold more bluff catchers there.
- The review handles multiway postflop spots with labelled heuristics (equity against estimated
  ranges vs the price), since equilibrium solvers don't apply cleanly. GTO Wizard's analyzer skips
  them entirely.

## 7. Home games: where to deviate from GTO

GTO is the baseline; the review shows it first. Common, data-backed adjustments against typical
recreational players:

| they... | you... |
|---|---|
| call too much | value-bet thinner and bigger, bluff less, c-bet more on boards that hit you |
| fold too much | bluff more, size down |
| limp a lot | isolate wide: about 4bb + 1bb per extra limper in position, 5bb + 1bb out of position |
| rarely 3-bet | open wider; fold more to their 3-bets |
| under-bluff river raises | fold more bluff catchers than MDF says |

## 8. Stack depth

- Short (≤ 30bb): fewer small pairs and suited connectors, more all-ins; below about 15bb,
  push/fold. The preflop solver offers an all-in at every raise when stacks are 30bb or less.
- Deep (150bb+): opens stay about the same, 3-bets become more polar, 4-bets get bigger (about 3×),
  and geometric overbets with the nuts become standard.

## 9. Reading the review

- Each decision lists every option with **how often GTO takes it with that exact hand** and its
  **EV**. The best option is the highest EV; the cost of a choice is the EV gap.
- Grades are bands of EV loss as a share of the pot (best ≤ ~0.5%, inaccuracy ≤ 2.5%, mistake ≤ 8%,
  blunder above). River mistakes cost more than flop mistakes, and calls cost more than bets,
  because more money is at stake.
- "Not in GTO's range" means GTO wouldn't hold that hand at that point, usually because of an
  earlier preflop decision. The engine still compares each option's EV.
- Lines GTO never takes (limps, odd multiway calls) are solved with those actions forced and an
  assumed range for the player who took them; the assumption is stated in the explanation.

## 10. Engine notes from our experiments

- Discounted CFR with the paper's parameters (α=1.5, β=0, γ=2) is the default. postflop-solver's
  variant (γ=3, restarting the average at powers of 4) made no material difference in our tests
  (0.360% vs 0.344% exploitability at 100 iterations on a turn spot, 0.055% vs 0.054% at 400).
- Half-float storage halves memory with EVs unchanged (exploitability 0.043% vs 0.020% at 500
  iterations on a turn spot). int16 regrets with per-node scaling did much worse (0.27%): low-reach
  hands lose precision.
- Flop trees are the expensive part: a BTN-vs-BB single-raised pot with full ranges and one size per
  street is ~300k decision nodes. The review simplifies turn/river betting in flop solves, then
  re-solves those streets exactly when the hand gets there.
- Three preflop bugs found by playing library drills (UTG "shoving 100bb with 83% of its range
  against a 3-bet"):
  1. The three-player pot cap also applied to calling an all-in. Once a cold caller filled the
     third seat, the original raiser couldn't call a shove and had to fold, even with AA. The
     equilibrium exploited this, so HJ 3-bet 0% against UTG and AA's 3-bet was valued at −5bb. All-in
     calls are now exempt from the cap: they never see a flop decision. After the fix, HJ 3-bets
     about 5% against UTG, close to published solutions.
  2. The average strategy of a hand whose reach dropped to zero after the first iteration stays at
     that iteration's uniform mix forever. Below 0.1% average reach the engine now uses the current
     regret-matching strategy, and cached solves store regrets as well.
  3. With four or more players all in, "3-way share × heads-up equity against each extra player"
     paid out only part of the pot (1/6 each instead of 1/4 for four equal hands). Shares are now
     rescaled so equal hands split the pot evenly. This mattered little in practice; (1) was the
     real cause.
- Drills and reviews treat preflop lines GTO plays with less than 1–2% of its range as off-tree:
  strategies behind them were never trained against a real range.

## 11. Benchmarks against GTO Wizard (6-max, 100bb, rake 5% capped at 4bb (NL50) or 0.6bb (NL500), GW open sizes)

Published GW figures are quoted from their blog text (charts are images); "~" figures are approximate.
"Old rake" raked only the pot on the flop; "flop rake x growth" rakes the pot each flop is expected to end
with (data/rake_growth.json, measured by scripts/measure_rake.py).

| Spot | Old rake, NL50 | Flop rake x growth, NL50 | Same, NL500 | GTO Wizard / reference |
|---|---|---|---|---|
| UTG opens | 20.5% | 21.0% | 21.2% | 17.6% (NL50 and NL500) |
| BTN opens | 40.7% | 41.0% | 40.3% | 42% (NL50) |
| SB raise / limp / fold | 39 / 25 / 36 | 52 / 2 / 46 | 50 / 3 / 47 | 43 / 2 / 54 (gtopreflop, 5%/4bb); SB folds 54% (GW NL200) |
| BB vs BTN 2.5x: fold / call / 3-bet | 54 / 34 / 12 | 61 / 26 / 13 | 58 / 28 / 14 | ~60 / ~26 / ~14 (NL50) |
| BTN vs UTG: call / 3-bet | 6.6 / 7.6 | 2.3 / 9.0 | 3.2 / 8.4 | 8.2 / 7.5 (NL500) |
| BTN vs CO: 3-bet / call | 10.6 / 5.8 | 12.0 / 2.2 | 11.2 / 3.1 | ~12 / ~5 (NL500) |
| CO vs BTN 3-bet: fold / call / 4-bet | 50 / 36 / 14 | 57 / 27 / 16 | 51 / 32 / 17 | 52 / 28 / 19 (NL500) |

- Pots grow about 3x after the flop (limped 3.6x, single-raised 2.8-3.1x, 3-bet 3.2x, 4-bet 2.2x), so the
  old model charged about a third of the real rake (BTN vs BB at NL50: 0.74bb measured, 0.28bb charged).
  With the real rake the SB's limping drops from 25% to 2-3%, matching published solves: the "SB limps too
  much" gap was the rake model, not realization. Rake-free games (all the app plays) are unaffected; there
  the SB limps about 35%, which fits solver advice that unraked SBs flat/limp very wide (published rake-free
  6-max numbers weren't found to check it exactly).
- Rich vs lean postflop trees (scripts/tree_bias.py, SB vs BB single-raised, A72r): OOP's share 0.734 rich vs
  0.724 lean, so the lean calibration tree doesn't flatter the out-of-position player.
- Per pot-kind realization tables (scripts/calibrate_kinds.py): only the 4-bet tables are used; the full set
  (data/eqr_kinds.candidate.json) made BTN open 26% and the BB defend 61% under the old rake model.
- Open gaps: UTG/HJ open about 3 points too wide; BTN flats a UTG open far less than GW; the SB raises about
  7 points too often.

## 12. Postflop benchmarks (BTN vs BB single-raised pot, 100bb, scripts/postflop_bench.py)

Published references: GTO Wizard's BTN c-bets about 75% over all flops when checked to, about 54% of
the time with the small size and a little over 10% large or overbet (PokerStrategy's reading of GTO
Wizard reports; an earlier note here said 53%, which was the small-bet share); RangeConverter's aggregate BB response to a 1/3-pot c-bet is fold 34 / call 52 / raise 14; paired
and high-card flops are c-bet at very high frequency, mostly small; overbets are common on A-K-x and
middling connected boards (GTO Wizard: more than half of BTN's c-bets on T-9-5 are overbets).

The flop tree used by Custom hand and reviews checks the river down and has one turn size. Comparing
flop strategies (check / 33% / 75% / 125% when checked to) with a tree that has real turn and river
betting:

| Flop | One raise per street (old) | Two raises (current) | Full turn + river tree |
|---|---|---|---|
| Qh9h4c | 50 / 13 / 2 / 34 | 32 / 46 / 3 / 19 | 38 / 39 / 3 / 19 |
| KhQd5s | 55 / 26 / 1 / 18 | 35 / 54 / 0 / 10 | (published: about 6 / 76 / 18 with 25% and 80% sizes) |
| 7s7d2c | 48 / 13 / 34 / 5 | 20 / 51 / 18 / 11 | (published paired low flops: mostly small, high frequency) |

- What mattered was letting a c-bet re-raise a check-raise. River betting with one size, or turn
  and river all-ins, barely changed the flop strategy (Qh9h4c: 52/12/4/32 and 51/6/3/39).
- With one raise per street, a check-raise could only be called or folded against, which made
  betting look much worse. Flop trees now allow two raises (memory 0.8GB -> 1.1GB at 100bb).
- The BB's response to a 33% c-bet averaged fold 32 / call 51 / raise 16 over ten flops, in line with
  the published aggregate.

## 13. Multi-spot realization refits (scripts/realization_dataset.py, fit_realization.py)

Per-class flop realization measured for UTG/CO/BTN/SB vs BB single-raised pots from postflop solves,
then refit (same additive hand-feature model). Candidates are in research/candidates; the live
calibration is still the BTN-vs-BB one. NL50 benchmark (GTO Wizard settings):

| Spot | Live | r1 (32 flops, one raise) | r2 (28 flops, two raises) | GTO Wizard |
|---|---|---|---|---|
| UTG opens | 21.0 | 19.4 | 21.0 | 17.6 |
| BB vs UTG fold | 66.5 | 64.3 | 71.9 | 62 |
| SB raise / limp / fold | 52 / 2 / 46 | 40 / 4 / 56 | 47 / 1 / 52 | 43 / 2 / 54 |
| BB vs BTN fold / call / 3-bet | 61 / 26 / 13 | 53 / 33 / 13 | 61 / 25 / 14 | 60 / 26 / 14 |
| BTN opens | 41.0 | 39.4 | 42.7 | 42 |

- With one raise per street the measurement flattered the out-of-position caller (BB over-defends vs
  BTN in r1). With two raises (r2) BB vs BTN and the SB match GTO Wizard closely, but the BB folds
  far too much against UTG, so r2 isn't live either.
- Measured against the old model, pairs realize 0.05-0.10 of the pot more than modelled in every spot
  and dominated offsuit hands less, but per-class data is noisy on 28-32 flops (sets).
- r2 with hand-vs-hand interaction terms (class_k_* / class_d): UTG 20.5, BB vs UTG fold 71.4, SB 46/1/53,
  BB vs BTN 61/25/14. Same as r2, so the gap vs UTG isn't the model's form: postflop solves with these ranges
  say the BB realizes too little against UTG to defend 38%.
- That measurement holds up: BB vs UTG (live ranges), lean two-raise tree at 250 iterations vs a rich tree
  (33/75/125% flop, turn and river all-ins): BB share 0.392 vs 0.395 (As7h2d), 0.271 vs 0.266 (Ks8d3c),
  0.301 vs 0.302 (Qh9h4c). So the remaining BB-vs-UTG gap comes from elsewhere: candidates are the rake
  model for small single-raised pots, the 3-bet/4-bet tree, or GTO Wizard's UTG range differing from ours.
- Not rake: r2 at NL500 still has the BB folding 70.4% vs UTG (GTO Wizard 59%); BB vs BTN 57/28/15, SB
  46/0/54, CO vs BTN 3-bet 54/30/16.

## 14. Library-wide flop strategies (scripts/flop_library.py, about 240 random flops per spot)

Weighted by how often each flop comes up and by the range reaching the decision (6-max, 100bb, the
explorer tree Custom hand uses). The flops are a fair random sample (the shuffled order).

| Spot | First to act | In position when checked to | Facing 33% | Facing 75% |
|---|---|---|---|---|
| BTN vs BB | BB checks 100 | check 27 / 33% 54 / 75% 6 / 125% 13 | fold 31 / call 54 / raise 15 | 48 / 44 / 8 |
| CO vs BB | BB checks 100 | 26 / 55 / 8 / 11 | 33 / 53 / 15 | 49 / 43 / 8 |
| UTG vs BB | BB checks 100 | 27 / 54 / 7 / 12 | 34 / 51 / 14 | 50 / 42 / 8 |
| SB vs BB | SB: 57 / 24 / 8 / 11 | BB: 53 / 20 / 1 / 26 | 17 / 67 / 17 | 38 / 44 / 18 |
| BB 3-bets BTN | BB: 25 / 30 / 43 / 2 | BTN: 57 / 37 / 5 / 1 | 31 / 51 / 18 | 47 / 44 / 10 |
| SB limps, BB checks | SB: 49 / 34 (50%) / 10 / 7 | BB: 49 / 9 / 25 / 17 | 28 / 58 / 14 | 39 / 51 / 10 |

- BTN vs BB matches the published aggregate: c-bet 73% (published about 75%), small 54% (54%), large
  19% (a little over 10%). BB vs a 33% c-bet 31 / 54 / 15 (RangeConverter 34 / 52 / 14; GTO Wizard's
  average check-raise vs a small bet 17.5%).
- SB vs BB at 40bb is published as a 58% c-bet; ours is 43% at 100bb, where a lower frequency is expected.
- The 3-bettor's big 75% c-bet share (43%) was a tree artefact: with shallow stacks, checking the river
  down makes small c-bets look much worse. BB 3-bet vs BTN call (pot 20.5bb, 90bb behind), flop c-bet
  check / 33% / 75%:

| Flop | Live tree (river checked down) | + turn & river all-ins | + river 75% & all-in | Full tree |
|---|---|---|---|---|
| Ks8d3c | 1 / 29 / 70 | 1 / 65 / 34 | 1 / 73 / 27 | 2 / 81 / 16 |
| 9h8h6c | 29 / 25 / 45 | 30 / 31 / 39 | 29 / 32 / 39 | 33 / 34 / 30 |
| 7s7d2c | 0 / 7 / 90 | 0 / 29 / 68 | 0 / 20 / 78 | 0 / 34 / 65 |
| QhJd4c | 48 / 14 / 37 | 45 / 28 / 26 | 42 / 32 / 25 | 45 / 37 / 18 |
| As7h2d | 12 / 65 / 23 | 1 / 88 / 11 | 2 / 87 / 11 | 7 / 86 / 6 |

  Small-bet share off by 26 points on average with the live tree, 7 with turn and river all-ins (about
  1.3x the solve time), 6 with a river bet size too (about 2x). Flop trees now keep turn and river all-ins
  when the flop SPR is below 6; the 3-bet pot library is being re-solved with it.

## 15. Value networks (DeepStack-style depth-limited solving)

A solve can stop where the next street would be dealt and ask a small network what each hand is
worth there, given both players' ranges at that point (flipup_gto/valuenet.py; the engine's LEAF
nodes). The network is trained on random spots solved exactly, so it stands in for the rest of the
game without storing it.

- **River network:** input is each player's range mass over 64 river-strength buckets (every live combo ranked on the board) plus log(1 + SPR). Output is each bucket's value as a fraction of the pot, then DeepStack's zero-sum correction. Three hidden layers of 256.
- **Training data:** random boards, ranges from DeepStack's recursive generator, pot 4-150bb, SPR 0.1-15, solved on the rich river tree (33/75/125%, 60% raises, two raises, all-in). About 20 spots a second per process on a 16-core Fly machine.

| Training spots | Held-out error (range-weighted, fraction of pot) |
|---|---|
| 200 | 0.113 |
| 32,000 | 0.030 |
| 71,000 | 0.023 |
| 432,000 | 0.020 |
| (ignore the ranges) | 0.25 |

Turn solves (BTN vs BB ranges, pot 12bb, 94bb behind; turn and river 33/75/125%) with river leaves
against the full solve, BB's turn strategy (check / 33%) and BB's average hand value:

| Turn board | Full | River network (71k) | River network (432k) | Time |
|---|---|---|---|---|
| Qh9h4c2s | 91 / 9, 0.382 | 87 / 11, 0.378 | 91 / 7, 0.379 | 21s -> 5.5s |
| Ks8d3c7h | 91 / 9, 0.397 | 88 / 8, 0.387 | 91 / 4, 0.387 | 21s -> 8.6s |
| 8h7h5c2d | 74 / 24, 0.430 | 69 / 27, 0.432 | 70 / 26, 0.434 | 22s -> 5.7s |

The first turn network (5,730 spots, error 0.049) makes flop solves take about 1s instead of 60-100s but
isn't accurate yet: BB check-raises a 33% c-bet 5-6% (live tree 15%, published 14%), and on Qh9h4c BTN
checks 61% (live 32%). More turn data is being generated.

Memory drops from 202MB to 1MB. The turn network (hands bucketed by mean river strength x its
spread, 16 x 4) is trained from full turn solves the same way; with it a flop solve can stop at the
turn, which is what would make live flop answers fast.

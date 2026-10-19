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

**Equity realization (EQR) [our solver].** In a BTN-vs-BB single-raised pot, the BB realized only
64–79% of its raw equity on the boards we measured (e.g. 64% on A♠J♣4♣, 79% on A♣6♣3♣). That's why
preflop calls need a margin over raw pot odds. The preflop solver's realization model is fitted to
these measurements (`scripts/calibrate_eqr.py`).

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

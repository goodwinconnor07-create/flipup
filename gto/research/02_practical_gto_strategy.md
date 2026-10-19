# Practical GTO Strategy for NLHE Cash (6-max and Heads-Up, 100bb)

*A reference for a hand-review engine that tells players what they did right and wrong, with percentages.*

Research compiled 2026-10-19. Every factual claim links to its source. Some numbers in this document are **computed** from standard formulas rather than quoted; those are labelled *(computed)*. A number labelled *(single source)* or *(approx.)* should not be treated as a hard solver constant. Solver outputs change with rake, open size, stack depth and bet-size tree, so the published numbers differ between sources. Read every table as a **baseline with a tolerance band**, not as an exact target.

---

## 0. Source quality notes

| Tier | Sources | How to use |
|---|---|---|
| A: solver-derived, methodology stated | GTO Wizard blog and help center, Upswing articles that name their solver (Lucid / "CFR"), GTO Wizard help docs | Use numbers directly, with the spot noted (positions, rake, depth) |
| B: coach-simplified solver charts | PokerCoaching "implementable" charts, Upswing rule-of-thumb articles | Good for rules and default ranges. They are pure (unmixed) simplifications. |
| C: coach opinion / population claims without data | Most "common leaks" articles | Use for explanation text only. Do not show these figures as precise numbers. |
| D: SEO or anonymous charts (Scribd uploads, AI-written "preflop wizard" sites) | — | Avoided. Where mentioned, it is only to flag disagreement. |

---

## 1. Core math

### 1.1 Formulas (all from GTO Wizard unless noted)

| Concept | Formula | Source |
|---|---|---|
| Pot odds / required equity | `Q = call / (pot after you call)`. Odds of X:1 need `1/(X+1)` | [GTO Wizard – pot odds](https://blog.gtowizard.com/what-are-pot-odds-in-poker/) |
| Call EV | `EV(call) = Win% × Win$ − Lose% × Lose$` (relative to folding) | [GTO Wizard – pot odds](https://blog.gtowizard.com/what-are-pot-odds-in-poker/) |
| Alpha (bluff break-even fold %) | `α = bet / (bet + pot)`; in general, `risk / (risk + reward)` | [GTO Wizard – MDF & Alpha](https://blog.gtowizard.com/mdf-alpha/) |
| MDF | `MDF = pot / (pot + bet) = 1 − α = 1/(1 + bet%)` | [GTO Wizard – MDF & Alpha](https://blog.gtowizard.com/mdf-alpha/), [Math misconceptions](https://blog.gtowizard.com/mathematical-misconceptions-in-poker/) |
| Pure bluff EV | `EV = Fold% × Pot − Call% × Bet` | [GTO Wizard – MDF & Alpha](https://blog.gtowizard.com/mdf-alpha/) |
| Semi-bluff EV | `EV = Fold% × Pot + Call% × [Win% × (Bet + Pot) − Lose% × Bet]` | [GTO Wizard – MDF & Alpha](https://blog.gtowizard.com/mdf-alpha/) |
| River bluff share of a polar betting range | `bluff% = pot odds laid to the caller = bet / (pot + 2·bet)`; `value% = 1 − bluff%` | [Math misconceptions](https://blog.gtowizard.com/mathematical-misconceptions-in-poker/) |
| Equity realization | `EV = Equity × EQR × Pot` (EQR above 100% means over-realizing) | [GTO Wizard – EQR](https://blog.gtowizard.com/equity-realization/) |
| SPR | `effective stack / pot` | [GTO Wizard – SPR](https://blog.gtowizard.com/stack-to-pot-ratio/) |
| Value bet threshold (river) | A value bet must win **more than 50% when called**, whatever its size | [GTO Wizard – river principles](https://blog.gtowizard.com/principles-of-river-play/) |
| Multiway fold-per-player for a bluff to break even | `each player's fold% = α^(1/n)` (n = number of defenders) | [GTO Wizard – 10 multiway tips](https://blog.gtowizard.com/10-tips-multiway-pots-in-poker/) |

**Geometric bet size** (same fraction of the pot on each of *n* remaining streets so that the last bet is all-in). GTO Wizard defines the concept but shows its formula only as an image ([Pot Geometry](https://blog.gtowizard.com/pot-geometry/)). The closed form is:

```
f = ((1 + 2·SPR)^(1/n) − 1) / 2
```

This formula reproduces both of GTO Wizard's published figures. A 100bb single-raised pot, BTN vs BB, with three streets left (pot 5.5bb, stack 97.5bb, SPR ≈ 17.7) gives **115.8%** ([larger-than-geometric article](https://blog.gtowizard.com/why-so-much-an-exploration-of-larger-than-geometric-bet-sizing/)). The same pot and stack with two streets left gives **252%** ([Pot Geometry](https://blog.gtowizard.com/pot-geometry/)). *(The formula is computed; the match against both published numbers is the check.)*

### 1.2 Bet-size reference table *(computed from the formulas above)*

| Bet (% pot) | Caller's required equity | Alpha (bluff needs this fold %) | MDF | River bluff share of a polar range | Value:Bluff |
|---|---|---|---|---|---|
| 10% | 8.3% | 9.1% | 90.9% | 8.3% | 11:1 |
| 25% | 16.7% | 20.0% | 80.0% | 16.7% | 5:1 |
| 33% | 19.9% | 24.8% | 75.2% | 19.9% | 4:1 |
| 50% | 25.0% | 33.3% | 66.7% | 25.0% | 3:1 |
| 66% | 28.4% | 39.8% | 60.2% | 28.4% | 2.5:1 |
| 75% | 30.0% | 42.9% | 57.1% | 30.0% | 2.33:1 |
| 100% | 33.3% | 50.0% | 50.0% | 33.3% | 2:1 |
| 125% | 35.7% | 55.6% | 44.4% | 35.7% | 1.8:1 |
| 150% | 37.5% | 60.0% | 40.0% | 37.5% | 1.67:1 |
| 200% | 40.0% | 66.7% | 33.3% | 40.0% | 1.5:1 |
| 300% | 42.9% | 75.0% | 25.0% | 42.9% | 1.33:1 |

PokerCoaching publishes the same MDF values: ⅓ pot 75%, ½ pot 67%, ⅔ pot 60%, ¾ pot 57%, pot 50%, 1.5× pot 40% ([PokerCoaching – MDF](https://pokercoaching.com/blog/mdf-poker/)). GTO Wizard's worked half-pot river example gives pot odds 25%, α 33%, MDF 67%, value/bluff 75/25 ([Math misconceptions](https://blog.gtowizard.com/mathematical-misconceptions-in-poker/)).

**A note on the "2:1" rule.** The pot-bet 2:1 value:bluff figure above is correct. Several coaches, though, quote "2:1" for a ¾-pot bet as well. Matthew Janda derived ratios for ¾-pot bets in *Applications of No-Limit Hold'em* ([RIO thread](https://www.runitonce.com/nlhe/bluff-value-ratio/)), and Upswing quotes Janda's ¾-pot river result as **1 bluff : 2.33 value** ([Upswing – bluff-to-value](https://upswingpoker.com/what-is-bluff-to-value-ratio/)). The engine should always compute the ratio from the actual bet size.

### 1.3 Ratios on earlier streets (rules of thumb)

These hold because flop and turn bluffs keep equity, so the river formula does not apply directly.

| Street | Value share of betting range | Bluff:Value | Source |
|---|---|---|---|
| Flop | ≈ ⅓ value | ≈ 2:1 | [GTO Wizard](https://blog.gtowizard.com/mathematical-misconceptions-in-poker/), [Upswing (Janda)](https://upswingpoker.com/what-is-bluff-to-value-ratio/) |
| Turn | ≈ ½ value | ≈ 1:1 | same |
| River | ≈ ⅔ value (pot-size bet) | ≈ 1:2 | same |

From Janda, via Upswing: with ¾-pot bets on every street and a perfectly polar range, **34.3% of flop bets are value** ([Upswing](https://upswingpoker.com/what-is-bluff-to-value-ratio/)). GTO Wizard adds that blockers and rake usually justify going **slightly more value-heavy** than these ratios ([Math misconceptions](https://blog.gtowizard.com/mathematical-misconceptions-in-poker/)).

### 1.4 When MDF does *not* apply (important for "you folded too much" feedback)

From [GTO Wizard – MDF & Alpha](https://blog.gtowizard.com/mdf-alpha/) and [Math misconceptions](https://blog.gtowizard.com/mathematical-misconceptions-in-poker/):

- MDF and alpha are exact **only for the first bet**. Against raises the risk/reward is different. A $60 bet into $100 has α 37.5%. If it is raised to $200, the raiser's α is 55.5% and MDF is 44.5%. The **initial bettor's advantage**: a 50% raise over a 30% bet needs 45.83% folds, against 33.3% for a 50% bet ([Initial bettor's advantage](https://blog.gtowizard.com/the-initial-bettors-advantage/)).
- MDF assumes bluffs have zero equity. When the bettor's bluffs have equity (draws) or showdown value, the defender should defend **less** than MDF. Against a pot-sized shove from a 20%-equity draw, the correct call rate is 57%. If the bluffs would have 20% equity when checking back, defend 40% instead of 50%.
- **Out of position on the flop and turn, solvers over-fold relative to MDF.** In position they defend close to MDF. The BB consistently over-folds against BTN c-bets of 20% to 200% pot (1,755 flops), but defends close to MDF against SB c-bets ([Math misconceptions](https://blog.gtowizard.com/mathematical-misconceptions-in-poker/)).
- Against opponents who under-bluff (common at low stakes), fold more than MDF ([PokerCoaching – MDF](https://pokercoaching.com/blog/mdf-poker/), [Upswing – MDF](https://upswingpoker.com/mdf-vs-no/)).
- Hands may be folded even with more equity than pot odds require when they will **under-realize** that equity. Facing a 33% bet (4:1), the BB folds many hands with more than 20% equity, and 97o folds with about 44% raw equity on J♥T♦9♥ ([GTO Wizard – EQR](https://blog.gtowizard.com/equity-realization/)). A7o with more than 40% equity folds to a 2bb bet into 6bb, while 42s with about 18% calls because of backdoor potential ([GTO Wizard – pot odds](https://blog.gtowizard.com/what-are-pot-odds-in-poker/)).

### 1.5 Multi-street bluff math

A triple-barrel of pot-sized bets (1, 3 and 9 into a starting pot of 1) has to succeed on the river **72.2%** of the time to break even on the whole line (13 risked to win 5), against 50% for a single river bluff ([Multistreet bluffs](https://blog.gtowizard.com/the-math-of-multistreet-bluffs/)).

### 1.6 Equity realization (EQR) heuristics

From [GTO Wizard – EQR](https://blog.gtowizard.com/equity-realization/):
- Out-of-position hands have lower EQR. A♦2♦ on J♥T♦9♥ realizes almost 100% of its equity for the HJ (IP) but under 2% for the BB.
- **Medium-strength hands under-realize the most.** Strong hands over-realize through value betting and equity denial. Very weak hands can over-realize by bluffing.
- Backdoors matter. 98s realizes under 25%, while 9♦8♦ with a backdoor flush draw realizes close to 50%.

### 1.7 SPR heuristics

From [GTO Wizard – SPR](https://blog.gtowizard.com/stack-to-pot-ratio/):

| SPR | Equity needed to call a flop all-in (no folds) | What can stack off |
|---|---|---|
| 1 | ≈ 33% | Flush draws can shove profitably |
| 2 | ≈ 40% | Any top pair or better |
| 3 | ≈ 43% | — |
| 4+ | — | Stacking off with a single pair gets risky |
| ~5 | — | Top pair gets "a bit dicey" |
| ~16 | — | Top pair is roughly indifferent between calling and folding a stack-off |

**Typical 100bb SPRs** *(computed, ignoring rake)*: SRP BTN 2.5bb vs BB ≈ **17.7**; IP 3-bet pot (2.5 → 7.5 called) ≈ **5.6**; OOP 3-bet pot (BTN 2.5, BB 3-bets to 11) ≈ **4.0**; 4-bet pot (≈22bb called) ≈ **1.7**; limped BB pot ≈ **49**.

**Geometric sizes by SPR** *(computed, formula in 1.1)*:

| SPR | 1 street | 2 streets | 3 streets |
|---|---|---|---|
| 1 | 100% | 37% | 22% |
| 2 | 200% | 62% | 35% |
| 4 | 400% | 100% | 54% |
| 6 | 600% | 130% | 68% |
| 10 | 1000% | 179% | 88% |
| 13 | 1300% | 210% | 100% |
| 17.7 (100bb SRP) | 1770% | 252% | 116% |

GTO Wizard's 4-bet-pot geometric c-bet is about 27% pot at 100bb and about 37% at 200bb ([IP 4-betting](https://blog.gtowizard.com/ip-4-betting-in-deep-stacked-cash-games/)). **Solvers mostly do not bet geometrically on the flop.** GTO Wizard: "GTO strategies are non-geometric in the majority of spots." Geometric sizing shows up when the bettor has a big nut advantage, a polar range against a capped one, on later streets, and on turn probes ([Pot Geometry](https://blog.gtowizard.com/pot-geometry/)).

---

## 2. Preflop (6-max, 100bb cash)

### 2.1 Open sizes

| Position | GTO Wizard NL500 100bb | PokerCoaching implementable chart | Notes |
|---|---|---|---|
| UTG/LJ | **2.0bb** | 2.5bb | Earlier positions open smaller because they face more 3-bets |
| HJ | (≈2.0–2.3bb) | 2.5bb | |
| CO | **2.3bb** | 2.5bb | |
| BTN | **2.5bb** | 2.5bb | |
| SB | **3.0bb** | 3.0bb | |

Sources: [GTO Wizard – preflop range morphology](https://blog.gtowizard.com/preflop-range-morphology/), [PokerCoaching charts](https://pokercoaching.com/preflop-charts/). GTO Wizard found that a 3bb open risks 50% more than a 2bb open but gains only 5–10% more folds from HJ, CO and BTN. From LJ, only KK+ and AKs prefer 3bb at 200bb. Against casual players who call too much and rarely 3-bet, a **larger, stronger** open can be a good exploit ([Preflop raise sizing](https://blog.gtowizard.com/preflop-raise-sizing-examining-2-key-factors/)). The HJ figure is an interpolation, not a published value.

### 2.2 RFI (raise first in) frequencies

| Position | PokerCoaching (100bb, 2.5x, pure strategy) | GTO Wizard | Upswing CFR | Commonly quoted band |
|---|---|---|---|---|
| UTG (6-max first seat, "LJ") | **17.6%** | **17.6%** (NL500 and NL50, 100bb); 16.5% (MTT 100bb) | — | 15–18% |
| HJ | **21.4%** | — | — | 20–22% |
| CO | **27.8%** | — | — | 26–30% |
| BTN | **43.5%** | — | **43.6%** vs a BB playing well | 42–48% |
| SB | **62.3% raise-or-call** (includes limps) | — | Upswing Lab: **40–50% raise** (no limp) | 40–50% raise-only; ~60% if limping is allowed |

Sources: [PokerCoaching charts](https://pokercoaching.com/preflop-charts/), [GTO Wizard – preflop morphology](https://blog.gtowizard.com/preflop-range-morphology/), [GTO Wizard – stack sizes](https://blog.gtowizard.com/how-stack-sizes-change-your-range/), [Upswing – blinds that fold too much](https://upswingpoker.com/how-to-respond-big-blind-small-blind-too-tight/), [Upswing – small blind](https://upswingpoker.com/use-these-4-rules-to-play-your-small-blind-smart/).

### 2.3 RFI ranges in text notation (PokerCoaching "implementable" 6-max 100bb)

These are pure simplifications of solver output, verbatim from [pokercoaching.com/preflop-charts](https://pokercoaching.com/preflop-charts/):

| Pos | % | Range |
|---|---|---|
| LJ (=UTG 6-max) | 17.6% | `66+, A3s+, K8s+, Q9s+, J9s+, T9s, ATo+, KJo+, QJo` |
| HJ | 21.4% | `55+, A2s+, K6s+, Q9s+, J9s+, T9s, 98s, 87s, 76s, ATo+, KTo+, QTo+` |
| CO | 27.8% | `33+, A2s+, K3s+, Q6s+, J8s+, T7s+, 97s+, 87s, 76s, A8o+, KTo+, QTo+, JTo` |
| BTN | 43.5% | `33+, A2s+, K2s+, Q3s+, J4s+, T6s+, 96s+, 85s+, 75s+, 64s+, 53s+, A4o+, K8o+, Q9o+, J9o+, T8o+, 98o` |
| SB (raise or call) | 62.3% | `22+, A2s+, K2s+, Q2s+, J2s+, T3s+, 94s+, 84s+, 74s+, 63s+, 53s+, 43s, A2o+, K4o+, Q5o+, J7o+, T7o+, 96o+, 86o+, 76o` |

PokerCoaching's sizes for these charts: open 2.5bb (SB 3bb), **3-bet 3.5× IP / 4× OOP**, BB raise to 3.5bb vs an SB limp, **4-bet 2.3× the 3-bet IP / 2.5× OOP** ([PokerCoaching](https://pokercoaching.com/preflop-charts/)).

The same page also gives full-ring (8-max) ranges, useful for live and home games: UTG 11.4% `77+, A3s+, K9s+, QTs+, JTs, T9s, AQo+, KQo` … BTN 40.3% ([PokerCoaching](https://pokercoaching.com/preflop-charts/)).

**Mixed-frequency notes from GTO Wizard.** At NL50 compared with NL500, UTG still opens 17.6% but plays more K8s–K5s and A2s, and fewer of 55–22, KTo and T8s. Higher rake makes BB 3-bets more valuable, so UTG leans toward blocker hands ([GTO Wizard – preflop morphology](https://blog.gtowizard.com/preflop-range-morphology/)). Small pairs (22–44) are not opened 100% of the time ([The fish were right](https://blog.gtowizard.com/the-fish-were-right-all-along/)). Engine implication: treat the bottom 1–3% of each range (small pairs, weakest suited Kx, weakest offsuit broadways) as **mixed**. Opening or folding them should be "correct" or an "inaccuracy", never a "blunder".

### 2.4 3-bets

**Structure** (Upswing, from Lucid solver charts; GTO Wizard):
- Solvers use **3-bet-or-fold from every position except the BB** in non-ante, deep cash games. The BTN also cold-calls some hands, and the SB "almost exclusively 3-bets or folds" ([Upswing – 3-bet](https://upswingpoker.com/3-bet-strategy-aggressive-preflop/), [GTO Wizard – 3-bet pots OOP](https://blog.gtowizard.com/crush-3-bet-pots-oop-in-cash-games/)).
- **Linear** 3-bet ranges are used when players are left to act behind or against callers. **Polar** ranges are used when no one is left behind, when calling is attractive (BB, antes), or when in position against the opener ([Upswing – 3-bet](https://upswingpoker.com/3-bet-strategy-aggressive-preflop/)). GTO Wizard: smaller 3-bet sizes and lower rake push ranges linear; larger sizes and higher rake push them polar ([Range morphology](https://blog.gtowizard.com/range-morphology/)).
- Example hands: value QQ+ and AK. Linear semi-bluffs A5s, A4s, 65s, 77, plus "mergy" ATs and 88. BB vs BTN polar bluffs A8o, KTo, K9o, K7s, J8s, T7s ([Upswing – 3-bet](https://upswingpoker.com/3-bet-strategy-aggressive-preflop/)). Pure 3-bets vs a BTN open for both blinds at NL500: **TT+, AJs+, AQo+** ([GTO Wizard](https://blog.gtowizard.com/crush-3-bet-pots-oop-in-cash-games/)).

**Sizes**: about **3× IP** and **4–4.5× OOP** at 100bb with no ante ([Upswing – 3-bet](https://upswingpoker.com/3-bet-strategy-aggressive-preflop/)). PokerCoaching uses 3.5× and 4× ([PokerCoaching](https://pokercoaching.com/preflop-charts/)). The GTO Wizard examples use 11bb and 13bb 3-bets against a BTN open ([Range morphology](https://blog.gtowizard.com/range-morphology/)).

**Frequencies (sparse published data):**

| Spot | 3-bet % | Source / caveat |
|---|---|---|
| BB vs UTG min-open, NL500 100bb | **5.4%** | [GTO Wizard – 3 biggest leaks](https://blog.gtowizard.com/the_3_biggest_leaks_killing_your_winrate/). GTO Wizard notes that mass data shows the BB "heavily under 3-bets" |
| BB vs UTG 2.2× (50bb, MTT with ante) | 5% (call 51%, fold 44%) | [Upswing/Lucid](https://upswingpoker.com/lose-less-win-more-the-fundamentals-of-big-blind-defense/). Not cash |
| BB vs BTN 2.2× (50bb, MTT with ante) | 17% (call 66%, fold 17%) | same. Antes widen defense a lot |
| Facing a CO open (generic) | ≈16% | Scribd chart, unattributed (tier D, shown only to mark the band) |

I found **no** freely published, solver-attributed table of cash 3-bet % by seat matchup. The engine should get these values from its own solver runs.

### 2.5 BB defense

| Spot | Defend (call + 3-bet) | Source |
|---|---|---|
| BB vs BTN 2.5× ($5 at $1/$2), cash with rake, 100bb | **51.7%** | [Upswing – BB MTT vs cash](https://upswingpoker.com/big-blind-defend-strategy-mtt-vs-cash/) |
| Required equity in that spot (with rake) | >28.6% | same |
| BB vs BTN, theoretical "stop any-two profit" threshold, 2.5× | ≈48–50% | [Upswing (MTT context)](https://upswingpoker.com/lose-less-win-more-the-fundamentals-of-big-blind-defense/) |
| Heads-up BB vs min-raise | ≥70–75% | [PokerCoaching – HU](https://pokercoaching.com/blog/heads-up-poker/) |

Pot odds facing an open with no rake *(computed)*: vs 2× need 1/4.5 ≈ **22%**; vs 2.5× need 1.5/5.5 ≈ **27%**; vs 3× need 2/6.5 ≈ **31%**. GTO Wizard cites **3.5:1** for the BB vs a 2× open ([large preflop raises](https://blog.gtowizard.com/how-to-respond-to-large-preflop-raises-in-poker/)). Rake "eviscerates" the blinds' pot odds: with rake, the BB calls a min-raise only about 60% as often as without ([Preflop raise sizing](https://blog.gtowizard.com/preflop-raise-sizing-examining-2-key-factors/)). Against large raises, calls "vanish almost entirely" (BB vs 5×) and are replaced by a linear 3-bet range ([large preflop raises](https://blog.gtowizard.com/how-to-respond-to-large-preflop-raises-in-poker/)). Cash hands the BB folds against a BTN open include **K7o, Q8o and 84s** ([Upswing](https://upswingpoker.com/big-blind-defend-strategy-mtt-vs-cash/)).

Exploit data: against a BB that 3-bets 5% less and folds 3% more than GTO, the BTN should open **63.6% instead of 43.6%**, worth about 2bb/100 preflop ([Upswing](https://upswingpoker.com/how-to-respond-big-blind-small-blind-too-tight/)).

### 2.6 4-bets

- Sizes: GTO Wizard 4-bets to about **20bb IP / 21bb OOP over an 8bb 3-bet** at 100bb, roughly 2× the 3-bet IP. At 200bb, IP 4-bets are about 3× ([IP 4-betting](https://blog.gtowizard.com/ip-4-betting-in-deep-stacked-cash-games/)). Upswing's rule of thumb: about 2.3× IP and 2.6× OOP ([Upswing – 4-bet size](https://upswingpoker.com/4-bet-size-strategy/)).
- At 100bb, **4-bet all-ins** mostly come from out of position against the 3-bettor (SB vs BB has a "significant" all-in frequency) ([GTO Wizard – hypergeometric bet](https://blog.gtowizard.com/the-power-of-the-hypergeometric-bet/), [Upswing – 4-bet all-in](https://upswingpoker.com/4-bet-all-in/)).
- Upswing's example IP 4-bet range is TT+ and AK for value, with high-card hands (A5s-type blockers) as the main bluffs ([Upswing](https://upswingpoker.com/4-bet-size-strategy/)). *(Summarised from search snippets; not every hand was verified on the page.)*
- Break-even for a 4-bet bluff: CO 2.5 / BTN 7.5 / CO 19 means the 4-bettor needs folds in 16.5/28 = **59%** of cases, so a 3-bet range should be at most about 59% bluffs ([Upswing – MDF](https://upswingpoker.com/mdf-vs-no/)).

### 2.7 Limping

- Open-limping is "rarely correct" in standard cash games ([pokertrainer.se – preflop intro](https://pokertrainer.se/preflop-introduction/)). Upswing: "almost never open limp in a NLHE cash game"; overlimping is acceptable with hands that flop strong holdings (55, 44, A3s) ([Upswing – limping](https://upswingpoker.com/why-limping-in-poker-is-bad/)). Upswing does not recommend SB open-limps in cash games ([Upswing – SB](https://upswingpoker.com/use-these-4-rules-to-play-your-small-blind-smart/)).
- Solvers do limp in specific spots: the SB (blind vs blind), heads-up, under 7bb, and short-stacked MTTs ([GTO Wizard – Is limping pimping](https://blog.gtowizard.com/is-limping-pimping/)). The EV difference between limping and min-raising is often negligible there ([The fish were right](https://blog.gtowizard.com/the-fish-were-right-all-along/)). The engine should **not flag an SB limp as a blunder** if the solver tree it uses includes SB limps.
- **Isolating limpers**: raise to **4bb + 1bb per extra limper IP, 5bb + 1bb OOP**, with a wide range (40–100% depending on position and players behind) ([Upswing – exploit leaks](https://upswingpoker.com/exploit-poker-leaks/)).

---

## 3. Postflop concepts

### 3.1 Range advantage vs nut advantage

- **Range (equity) advantage** mainly drives *how often* you bet. **Nut advantage and fold equity** mainly drive *how big* you bet ([GTO Wizard – c-bet sizing mechanics](https://blog.gtowizard.com/the-mechanics-of-c-bet-sizing/)).
- Range advantage is the whole range's average equity on the board. Nut advantage is about who holds more of the very top hands (sets, straights, flushes). A player can have one without the other ([PokerCoaching – range advantage](https://pokercoaching.com/blog/range-advantage/)).
- If your opponent has both advantages, check more ([PokerCoaching](https://pokercoaching.com/blog/range-advantage/)). Example: on A♠K♦2♣ UTG has more AA, KK, Ax and Kx. On 8♠7♦6♣ the BB has more two pair and straights ([PokerCoaching](https://pokercoaching.com/blog/range-advantage/)).

**Bet bigger when** ([c-bet sizing mechanics](https://blog.gtowizard.com/the-mechanics-of-c-bet-sizing/)): you have many nutted hands and the opponent has few; the opponent has many medium-strong hands that will pay; your bets fold out hands with real equity; your range has few middling hands that need protecting.
**Bet smaller when**: the opponent has many nutted hands; few of the opponent's hands have reasonable equity against the top of your range; bets mostly fold low-equity hands; your range has many middling hands that need protection.

GTO Wizard's examples (BTN vs BB, 100bb SRP): Q♥Q♣6♦ → bet often, mostly 33%. K♥J♥7♦ → mostly 75% or 125%, and the BB folds 62% against 125%. Q♦J♦T♦ → bet about half the time, mostly 33%. Sizing **rises from dry to wet and falls again on very wet boards** ([c-bet sizing mechanics](https://blog.gtowizard.com/the-mechanics-of-c-bet-sizing/)).

### 3.2 Board texture → c-bet frequency and size (IP preflop raiser, SRP, vs BB)

From [Upswing c-bet podcast (100bb cash, no ante)](https://upswingpoker.com/podcast/ep4-c-bet-frequency/) and [GTO Wizard – IP c-bet heuristics (BTN vs BB)](https://blog.gtowizard.com/flop-heuristics-ip-c-betting-in-cash-games/):

| Texture | Example | C-bet frequency | Size | Why |
|---|---|---|---|---|
| High paired | AA3, KKQ, JJ8, TT2 | ≈100% | 25–33% | Raiser dominates. Paired boards are bet more often than unpaired, mostly small |
| Single broadway, dry | K72r | ≈100% | small | Few BB hands connect |
| Double broadway | KQ4, AJ6, QT2 | ≈100% small **or** ≈75% large | 25–33% or ≈75% | Raiser has the nut advantage |
| A-high | A85, A62 | ≈70% | mixed | Bet less often than 8- through K-high boards: weaker fold equity, and the BB range is polar |
| Single broadway, connected | Q65, J42, K53 | ≈70% | — | Low suited hands connect for the BB |
| Middling / two-tone | 984 fd, 863, 762 | ≈55–60% | ≥50%; BTN ≈75%; avoid 33% | Draws and BB nut hands |
| Low connected | 753, 543, 643 | BTN low; MP ≈0%; UTG 0% on 543; CO ≈20% on 643 | big when betting | BB has the nut advantage |
| Monotone | — | sharply lower | smaller | BB check-raise frequency is very low |

GTO Wizard's sizing pattern for BTN vs BB: disconnected boards mostly 33% (130% also common); boards where an OESD is possible use more 66%; connected boards use the least 133%; paired boards small; monotone smaller ([GTO Wizard](https://blog.gtowizard.com/flop-heuristics-ip-c-betting-in-cash-games/)). Upswing's K♠T♣4♦ example: the solver "only" c-bets 89% (the author suggests 100% for simplicity) ([search summary of Upswing](https://upswingpoker.com/when-to-check-top-pair/)). **IP hands that check back often on A73r:** weak Ax, KK–JJ and KJ. They rarely get outdrawn, and betting exposes them to check-raises ([GTO Wizard](https://blog.gtowizard.com/flop-heuristics-ip-c-betting-in-cash-games/)).

Coach-level aggregate *(tier B/C)*: IP c-bet about 60–80% on many dry boards, OOP about 40–50%; dry boards 25–35% pot, wet boards 65%+ ([PokerCoaching – c-betting](https://pokercoaching.com/blog/c-betting-in-poker/)).

### 3.3 OOP c-betting (preflop raiser out of position)

- UTG vs BTN flat, 100bb NL50: **UTG checks about 72% and c-bets about 28%** in aggregate. GTO Wizard says most humans c-bet more than this ([GTO Wizard – OOP c-betting](https://blog.gtowizard.com/c-betting-as-the-oop-preflop-raiser/)). By board: Q96r and 432r range-check; KQ6r bet 100% at ⅓; K43r bet 100% at ⅔. UTG check-raises about 10% on Q96 and about 18% on 432 after a BTN stab.
- 3-bet pots: the OOP 3-bettor checks **33.9%** of flops on average, against **19.7%** for the IP 3-bettor ([GTO Wizard – 3-bet pots OOP](https://blog.gtowizard.com/crush-3-bet-pots-oop-in-cash-games/)).
- OOP without a range advantage: check frequently ([Protection](https://blog.gtowizard.com/the-right-way-to-think-about-protection/)).

### 3.4 Defender's options: donk bets, check-raises, probes

**Donk bets** ([GTO Wizard – donk betting](https://blog.gtowizard.com/is-donk-betting-for-donkeys/)): the BB should almost never donk. Donking appears on **low connected flops** (6- and 5-high) where the BB's equity is near 50% and the BB has a nut advantage. The main size is about **33% pot**. At 20bb the BB donks about 60% on 654r; at 100bb donk frequency on 764r falls by nearly two-thirds. The donk range is top pair, second pair, OESDs and better Ax/Kx, plus some nut hands for balance, with few pure-air bluffs. **Engine rule:** flag a BB donk on a high or dry board as a deviation, not necessarily a large EV loss, and show the EV loss.

**Check-raises:**
- BB vs a small c-bet on K84r: check-raise about **14%** (solver) ([Upswing – not aggressive enough](https://upswingpoker.com/3-common-spots-where-poker-players-arent-aggressive-enough/)). Players miss backdoor-draw raises with hands like A♣6♣, T♥7♥ and J♦7♦.
- One-pair check-raises are best in 3-bet and 4-bet pots, late position vs late position, on low flops, and usually need a backdoor draw ([Check-raising a single pair](https://blog.gtowizard.com/check-raising-a-single-pair/)).
- At 200bb vs a 25% c-bet on AK7r, the BB check-raises **under 7%** ([Maximizing monsters](https://blog.gtowizard.com/maximizing-monsters-in-deep-stacked-scenarios/)).

**Probe bets** (OOP bets the turn after the IP raiser checked back the flop) ([GTO Wizard – probe betting](https://blog.gtowizard.com/probe-betting/)): on raiser-favoured flops (A♦K♥8♥), a flop check-back usually means a medium hand, so the BB probes at low frequency ("no turn BB bets at higher than 50% frequency"), uses large sizes, and plays a polar range (nuts plus draws). On neutral flops (6♥5♦4♦) the BB probes more, especially on small turns. Geometric two-street probes are about 252% pot at 100bb SRP ([Pot geometry](https://blog.gtowizard.com/pot-geometry/)).

**Delayed c-bets** ([GTO Wizard – delayed c-betting](https://blog.gtowizard.com/delayed-c-betting/)): the raiser checks the flop and bets the turn. On A♦K♥8♥ the LJ bets about 90% of its flop range, so its checking range is medium pairs, some no-made hands, and trapped AA. After a flop check and a BB turn check, thin value increases: A9 and AJ, mixed on the flop, now bet purely.

### 3.5 Polarized vs linear/merged vs condensed ranges

From [GTO Wizard – range morphology](https://blog.gtowizard.com/range-morphology/):

| Shape | Contents | Typical use |
|---|---|---|
| Linear | Top-down value | Only one continuing action (raise-or-fold); preflop 3-bet-or-fold |
| Polarized | Nuts (>75% equity) plus bluffs (<33% equity) | Rivers IP; large bets; geometric sizing with perfect polarity |
| Merged | Nuts, medium hands (33–75% equity) and some trash | Small bets; check-raises on 992; ranges that must survive several streets |
| Condensed | Mostly medium hands | Capped calling ranges (e.g. SB call vs HJ) |
| Capped | Lacks the strongest hands | BB calling range without QQ+/AK |

### 3.6 Bet / check / bluff categorization (useful for explanations)

- **Value**: wins more than 50% when called. IP non-all-in value bets should win somewhat more than 50% because of raise risk; OOP can bet thinner ([River principles](https://blog.gtowizard.com/principles-of-river-play/)).
- **Bluff**: gets folds from better hands and has little showdown value. The weakest hands bluff small; hands with some showdown value that bluff should "go big or go home" ([Thin value](https://blog.gtowizard.com/mastering-thin-value-bets-in-checked-down-pots/)).
- **Check**: medium hands with showdown value that are not strong enough for value ([River principles](https://blog.gtowizard.com/principles-of-river-play/)).
- **Thin value after check-check**: in checked-down pots the BB value-bets about its top 40%, and even bottom pair can block-bet. Thin value sizes are small (about 16–21% pot) and strong value is large (about 77%) ([Thin value](https://blog.gtowizard.com/mastering-thin-value-bets-in-checked-down-pots/)). *(The spots are 40bb MTT, so the thresholds are approximate.)*
- **Turn**: after a 33% flop c-bet is called on K♠8♥4♦ Q♠, UTG bets about 40%, always overbetting with a polar range. Two pair and sets bet; second and third pair and most top pair check ([Turn principles](https://blog.gtowizard.com/principles-of-turn-strategy/)). The pattern: lower frequency, bigger sizes, more polar on later streets.

### 3.7 Bluff catchers, blockers, indifference

- **Laws of indifference** ([GTO Wizard](https://blog.gtowizard.com/the-three-laws-of-indifference/)): (1) every hand takes its highest-EV action; (2) if a hand mixes, the mixed actions have equal EV; (3) changing the mix between indifferent actions cannot lose EV against a fixed opponent. **Engine implication:** when a player picks a lower-frequency action whose EV equals the top action's, the play is *correct*, not a mistake. Grade by EV loss, not frequency alone.
- **Blocker checklist** ([Understanding blockers](https://blog.gtowizard.com/understanding-blockers-in-poker/)): (1) does the hand beat bluffs? (2) is the opponent over- or under-bluffing? (3) only then, blockers. When bluffing or bluff-catching, block value and unblock trash. With a marginal hand, block bets and unblock checks. With the nuts, block checks and unblock bets. Blockers matter most with narrow or polar ranges and large bets. Over-bluffing outweighs blockers: T♠9♠ becomes a pure call if the BB bluffs about 1% more.
- **Bluff-catching** ([River principles](https://blog.gtowizard.com/principles-of-river-play/)): bad reasons to call are "they could be bluffing" and "it's a good bluff card". Good reasons are that the hand beats all bluffs plus some value, or that blockers and unblockers shift the ratio.

### 3.8 Protection / equity denial

From [GTO Wizard – protection](https://blog.gtowizard.com/the-right-way-to-think-about-protection/):
- Protection is worth paying for only when the bet folds out **real equity** and gets called by near-dead hands. Betting 75% with AA on 8♥6♦4♥ loses about 7% of the pot compared with checking.
- On A♠8♥2♦ the BTN should bet small with 8x, because the BB continues with nearly every K-to-9 hand (about 30% of its range). Forcing a 75% bet at the same frequency costs about 6bb/100.
- On A-X-2 rainbow boards, the BTN's main size is about 125% when X is broadway and about 33% otherwise.

### 3.9 Overbets

From [GTO Wizard – flop overbets (cash)](https://blog.gtowizard.com/overbetting-the-flop-in-cash-games/): flop overbets are predominant on double-broadway boards (two-tone more than rainbow), middling boards where the raiser holds all overpairs (973r), low paired boards vs SB flats, and A-low-low boards when an IP caller is checked to. Not on K72-type boards. The heuristic: **"Nut Advantage + Draw-Heavy Board = Urgency → Motivating Big Bets."** Elasticity example: 44 always calls 33%, mixes folds vs 50%, mostly folds vs 75%, and can't continue vs an overbet.

---

## 4. Common amateur leaks vs GTO

### 4.1 Measured population data (the few studies with numbers)

**River under-bluffing, by bet size** (online regulars at 500nl–10knl, 2025; heads-up rivers in pots under 20bb; sample size not stated) ([Upswing – exploits backed by data](https://upswingpoker.com/3-cash-game-exploits-regs-backed-by-data/)):

| River bet size | Observed weak hands (bluffs) | GTO bluff % | Gap |
|---|---|---|---|
| 10–39% | 12% | ~18% | −6 |
| 40–59% | 16% | 25% | −9 |
| 60–89% | 19% | 30% | −11 |
| 90–110% | 22% | 33% | −11 |
| Overbets | 25% | ~37% | −12 |

In **multiway rivers**, block bets were 7% bluffs against about 18% GTO, and half-pot bets 9% against 25% ([same source](https://upswingpoker.com/3-cash-game-exploits-regs-backed-by-data/)). Over-folding by the same pool: against delayed c-bets, 11% over-fold to the 30% size and 6% to the 66–75% and 120–150% sizes. Against turn probes, 10% over-fold to block bets, 8% to medium bets and 7% to overbets.

Other numbers: the BB over-folds to BTN c-bets relative to MDF even in solver play ([GTO Wizard](https://blog.gtowizard.com/mathematical-misconceptions-in-poker/)). The BB under-3-bets according to GTO Wizard mass data ([GTO Wizard](https://blog.gtowizard.com/the_3_biggest_leaks_killing_your_winrate/)). In a low-stakes BTN-vs-BB turn-probe sample, about 56% of the population's turn betting range was unmade hands, and a "mass data" figure is cited for this ([GTO Wizard – over-bluffed lines](https://blog.gtowizard.com/calling-down-the-over-bluffed-lines-in-lower-limits/)).

### 4.2 Leaks reported by coaches (qualitative, tier C)

| Leak | What GTO does instead | Typical coach framing | Source |
|---|---|---|---|
| Playing too many hands; open-limping; limp-calling | Raise-or-fold, ~15–45% RFI by seat | "Most common leak at every stake" | [PokerCoaching – cash mistakes](https://pokercoaching.com/blog/cash-game-mistakes/), [Upswing – limping](https://upswingpoker.com/why-limping-in-poker-is-bad/) |
| Calling 3-bets OOP / cold-calling too wide | 3-bet-or-fold outside the BB and BTN | Hard postflop spots, capped range | [Upswing – 3-bet](https://upswingpoker.com/3-bet-strategy-aggressive-preflop/) |
| 3-betting too narrow (value only) | Include blocker and suited bluffs | Too easy to read | [PokerCoaching charts page](https://pokercoaching.com/preflop-charts/) |
| Over-c-betting OOP and multiway | OOP UTG vs BTN c-bets only ~28% | "Humans c-bet more" | [GTO Wizard](https://blog.gtowizard.com/c-betting-as-the-oop-preflop-raiser/), [PokerCoaching](https://pokercoaching.com/blog/c-betting-in-poker/) |
| Sizing by hand strength rather than by range/texture | One size for the range in a spot | Telegraphs hand strength | [PokerCoaching](https://pokercoaching.com/blog/c-betting-in-poker/) |
| Not check-raising enough (backdoor draws) | ~14% vs small c-bet on K84r | Missed aggression | [Upswing](https://upswingpoker.com/3-common-spots-where-poker-players-arent-aggressive-enough/) |
| Slowplaying on dry boards; betting too small vs capped ranges; not betting low-equity hands | Check-raise; size up; stab | "Made by 90% of low-stakes players" (unsourced claim) | [PokerNews / GTO Wizard](https://www.pokernews.com/strategy/gto-wizard-low-stakes-mistakes-47867.htm) |
| Small stakes: calling too much on the flop, folding too much on turn and river, under-bluffing missed draws | MDF-consistent defense and balanced bluffs | Exploit: bet thinner, bluff rivers less | [PokerCoaching – postflop basics](https://pokercoaching.com/blog/gto-postflop-basics/) |
| Under-bluffing rivers after a triple barrel | ~25–33% bluffs depending on size | Exploit: fold pure bluff-catchers vs triple barrels | [Upswing – exploit leaks](https://upswingpoker.com/exploit-poker-leaks/) |
| River raises under-bluffed | — | Exploit: over-fold vs river raises | [Upswing – MDF](https://upswingpoker.com/mdf-vs-no/) |
| Over-protecting / betting draws too much as OOP | Check more when draws behind have implied odds | — | [Protection](https://blog.gtowizard.com/the-right-way-to-think-about-protection/), [GTO Wizard](https://blog.gtowizard.com/how_pros_use_solvers_to_crush_pool_leaks/) |

### 4.3 Which mistakes cost the most

From [GTO Wizard – which mistakes cost the most](https://blog.gtowizard.com/understanding-which-mistakes-cost-you-the-most-money/):
- **Calling mistakes cost more than betting mistakes** (bets can still win by folds). Bad shoves cost less than bad calls. Bad folds are an opportunity cost.
- **Later streets cost more**: river errors cost more than turn errors, and turn more than flop. Betting 50% instead of 25% cost 0.31bb on a J♥J♦4♠ flop but 0.87bb on the turn.
- Preflop magnitudes: one "pip" too wide when opening (A9o vs ATo) costs 0.14bb, about 14bb/100. Folding J6s in the BB costs 0.26bb. Calling A9o instead of AJo as HJ costs 0.42bb. AA's opening EV is 10.05bb, and 44 is about 0.01bb.

---

## 5. How GTO Wizard grades decisions

### 5.1 Move categories (Trainer, "Measure Performance")

From [GTO Wizard Help – Measure Performance](https://help.gtowizard.com/measure-performance/):

| Category | Definition |
|---|---|
| **Best Move** | The highest-frequency action, or the RNG-selected action if RNG mode is on |
| **Correct Move** | An action GTO takes at some frequency, but not the top one |
| **Inaccuracy** | An action taken **less than 3.5%** of the time in GTO that does not lose significant EV |
| **Wrong Move** | An action never taken in GTO |
| **Blunder** | An action never taken in GTO that **loses significant EV** |

- **GTOW Score**: each move scores between −100% and +100%. Best actions earn maximum points, lower-frequency actions score according to their frequency, and "**blunders lose points according to their loss in percentage pot**" ([Trainer help](https://help.gtowizard.com/how-to-use-the-trainer/)). GTO Wizard does **not publish** the formula or the "significant EV" threshold.
- **EV-loss metrics** (in bb, relative to GTO): total EV loss, average EV loss per hand, average EV loss per mistake, and **EV loss as % of pot** (added so results compare across pot sizes) ([Measure Performance](https://help.gtowizard.com/measure-performance/)).
- **Average frequency difference**: frequency of the most common action minus frequency of the action taken, averaged over decisions. Example: with raise 20%, call 50%, fold 30%, choosing raise gives a difference of 30% ([Measure Performance](https://help.gtowizard.com/measure-performance/)).
- **Frequency mode** lets the user enter a mixed strategy (e.g. raise 30% and call 70%) instead of one action ([Trainer help](https://help.gtowizard.com/how-to-use-the-trainer/)).

### 5.2 Hand History Analyzer

From [How to work with Analyze Mode](https://help.gtowizard.com/how-to-use-the-hand-history-analyzer/), [Analyze Mode overview](https://help.gtowizard.com/analyze-mode-guide/), [Redesigned analyzer](https://blog.gtowizard.com/redesigned_analyzer_and_upgraded_gto_reports/) and [2020 patch notes](https://blog.gtowizard.com/hand-history-analyzer-is-here-patch-notes/):
- Preflop through turn are compared against **presolved solutions**, using the closest rake structure and stack depth. **The river is solved on the fly** from the exact board, stacks and sizes.
- Bet sizes are **mapped to the nearest solved size**, and the discrepancy is shown in parentheses (e.g. a 2.5bb open compared against a 2.3bb solution). A size mismatch can produce a misleading "mistake".
- Statuses: Analyzed, **Non-existing GTO spot** (multiway postflop, stacks too deep or shallow, or a line that GTO never reaches), and Error. Multiway postflop hands are skipped.
- Colours: **red = blunder, yellow = inaccuracy, green = correct**. EV loss is shown in bb and as bb/100 (a 7.65bb loss is shown as 765bb/100). Tables sort by EV loss. The replayer shows GTO frequencies and EV at every node.
- Reports: a "Mistakes" panel lists the top 10 hands by EV lost per stat (e.g. 3-bet), covering both wrong 3-bets and missed profitable ones. Hand fields include average GTO score, average frequency difference, total EV loss, and correctness per street ([Redesigned analyzer](https://blog.gtowizard.com/redesigned_analyzer_and_upgraded_gto_reports/)).
- Solution accuracy: GTO Wizard reports **0.21% Nash distance** for its flop solutions and 99.8% of flop EV captured compared with PioSolver ([Accuracy & Benchmarks](https://help.gtowizard.com/accuracy-and-benchmarks/)). EV differences smaller than about this tolerance should not be graded as errors.

### 5.3 Suggested grading scheme for our engine *(my proposal, not published by GTO Wizard)*

This mirrors GTO Wizard's categories but fills in the thresholds it leaves unstated:

| Grade | Rule |
|---|---|
| Best | Action has the highest solver frequency (or EV within ε of the best action) |
| Correct | Solver frequency ≥ 3.5%, **or** EV loss < 0.5% of pot |
| Inaccuracy | Solver frequency < 3.5% and EV loss < ~2% of pot |
| Mistake / Wrong | Solver frequency ≈ 0 and EV loss between ~2% and ~8% of pot |
| Blunder | EV loss ≥ ~8% of pot (or ≥ X bb absolute) |

Report EV loss in **bb and in % of pot**, together with the solver's frequency for each action, EV per action, hand equity and EQR, as GTO Wizard does. The % thresholds are placeholders to tune against real data; GTO Wizard does not publish its own. Use GTO Wizard's guidance that mixed-frequency choices with equal EV are *not* errors ([Laws of indifference](https://blog.gtowizard.com/the-three-laws-of-indifference/)), and that river close calls are "close in EV at equilibrium" ([River principles](https://blog.gtowizard.com/principles-of-river-play/)).

---

## 6. Multiway pots and home games

### 6.1 Multiway heuristics

- **Defense requirements fall sharply.** A 10%-pot bet needs about 91% defense heads-up but about 26% per player with 8 defenders. Each defender's fold frequency is `α^(1/n)` ([GTO Wizard – 10 multiway tips](https://blog.gtowizard.com/10-tips-multiway-pots-in-poker/)). *Computed*: against a pot-sized bet, each of 2 defenders needs to defend only about 29%, and each of 3 about 21%.
- **Pure bluffs are ineffective**: almost never bluff without real drawing equity (the river is the main exception). Bet smaller, overbet rarely and only with a big nut advantage, tighten value thresholds, and stop range-betting ([10 multiway tips](https://blog.gtowizard.com/10-tips-multiway-pots-in-poker/)).
- **3-way example** (CO c-bets ¼ pot on T♠7♥4♠): heads-up, the BTN folds about 10%, calls 73% and raises 17%. With the BB behind, it folds 31%, calls 39% and raises 30%, so it plays tighter, more aggressive and more linear, and raises mostly at ¼ pot ([Monkey in the middle](https://blog.gtowizard.com/monkey-in-the-middle-3-way-pot-heuristics/)).
- Population: multiway river bets are heavily under-bluffed (block bets 7% vs about 18% GTO, half-pot 9% vs 25%), so **fold more bluff-catchers multiway**. The example is folding top pair with A5s to a 75% river bet after a multiway flop ([Upswing – data](https://upswingpoker.com/3-cash-game-exploits-regs-backed-by-data/)).
- Multiway equilibria are not unique and do not guarantee unexploitability, so use them as a baseline ([Quirks of multiway Nash](https://blog.gtowizard.com/quirks_of_nash_equilibrium_in_multiway/)). GTO Wizard's analyzer **skips multiway postflop spots** ([Analyze Mode](https://help.gtowizard.com/analyze-mode-guide/)). Our engine needs heuristic (rule-based) feedback there instead of EV-loss grades.

### 6.2 Home games and small stakes: exploitative adjustments

| Opponent tendency | Adjustment | Source |
|---|---|---|
| Calling station (checks and calls too much) | C-bet more on the flop (83% vs 71% GTO on QJ5r at ¼ pot), lower value thresholds, use 40–100% sizes and never overbet, bluff less but keep small pure bluffs | [GTO Wizard – calling station](https://blog.gtowizard.com/exploiting-profiles-episode-i-the-calling-station/) |
| Over-folder | Size down or check the nuts, bluff more. Against a BB that never folds to 33%, CO EV rose from 3.7bb to 4.71bb | [Five imbalances](https://blog.gtowizard.com/the-five-imbalances-of-exploitative-poker/) |
| Too elastic (folds to big bets) | Overbet more (CO overbet frequency from 52% to 66%) | [Five imbalances](https://blog.gtowizard.com/the-five-imbalances-of-exploitative-poker/) |
| Too inelastic (calls any size) | Use the biggest value size | same |
| Limpers | Isolate wide: 4bb + 1/limper IP, 5bb + 1/limper OOP. Overlimp the BTN with small pairs and suited connectors | [Upswing](https://upswingpoker.com/exploit-poker-leaks/), [GTO Wizard – loose-passive limpers](https://blog.gtowizard.com/how-to-handle-loose-passive-limpers/) |
| Folds too much to 3-bets (>50%) | Polar 3-bets with suited-connector and suited-Ax bluffs | [Upswing](https://upswingpoker.com/exploit-poker-leaks/) |
| Calls 3-bets too wide (live pools) | Merged 3-bets (suited broadways, strong Ax), no extra bluffs | [Upswing – live rake](https://upswingpoker.com/live-preflop-rake-adjustments/) |
| Rarely 3-bets | Tighten calls vs their 3-bets to medium pairs through QQ and AQs+. 4-bet only KK+ | [Upswing](https://upswingpoker.com/exploit-poker-leaks/) |
| Under-bluffs river / river raises | Fold more than MDF | [PokerCoaching – MDF](https://pokercoaching.com/blog/mdf-poker/), [Upswing – MDF](https://upswingpoker.com/mdf-vs-no/) |
| Over-bluffs bet-check-bet lines | Call more indifferent bluff-catchers. At 31% bluffs instead of 27%, the best response is to almost never fold | [GTO Wizard – over-bluffed lines](https://blog.gtowizard.com/calling-down-the-over-bluffed-lines-in-lower-limits/) |
| Casual players who call opens a lot | Larger opens with a stronger range | [Preflop raise sizing](https://blog.gtowizard.com/preflop-raise-sizing-examining-2-key-factors/) |

**Rake and home games.** Live rake (taken only when there is a flop) argues for tighter calls, especially in the BB, and more 3-bets. **Timed-rake or no-rake home games** let you play the wider unraked ranges ([Upswing – live rake](https://upswingpoker.com/live-preflop-rake-adjustments/)). Unraked games also allow wider overlimping ([Upswing – limping](https://upswingpoker.com/why-limping-in-poker-is-bad/)). Live opens are typically 4–5× rather than 2–3× online ([Upswing](https://upswingpoker.com/big-blind-defend-strategy-mtt-vs-cash/)).

**Engine framing for friends' games.** Present the GTO baseline first, then add a population note when the hand is in a known-leak spot, e.g. "GTO calls 38% here, but in small games river raises are under-bluffed, so folding is fine". Back this with the data in §4.1. When both the solver EV and the exploit point the same way, say so.

---

## 7. Stack-depth adjustments

### 7.1 Short stacks (below 100bb)

- **SPR drives commitment**: at SPR 2 or below, top pair+ stacks off; flush draws can jam at SPR 1 ([GTO Wizard – SPR](https://blog.gtowizard.com/stack-to-pot-ratio/)).
- UTG RFI by depth (GTO Wizard, MTT chip-EV): 100bb **16.5%** (2.3bb open) → 50bb **17.7%** → 17bb **15.8%** → about 16% at 14bb (with 7.5% min-raise and 4.6% limp) → about 36.5% at 2bb. Small pairs and suited connectors lose value as stacks shorten (65s and 76s drop out at 50bb; 33 and 22 at 30bb). Around 20bb, **3-bet shoving** becomes profitable ([How stack sizes change your range](https://blog.gtowizard.com/how-stack-sizes-change-your-range/)). *(These are MTT figures with antes; use them for direction in cash.)*
- Turn play at 20bb: the most common bet becomes 50% pot rather than an overbet. Top pair and second pair bet more, draws bet less, and the strategy is less polar ([Turn principles](https://blog.gtowizard.com/principles-of-turn-strategy/)).
- Below about 15bb, push/fold charts take over (PokerCoaching 10bb MTT examples: UTG 16.9% `44+, A4s+, K9s+, QTs+, J9s+, T9s, A9o+, KJo+`) ([PokerCoaching](https://pokercoaching.com/preflop-charts/)). These are tournament figures with antes.
- BB defense: at 20bb the BB folds 17 points less, calls 14 points more and 3-bets about 60% more often than at 50bb (Lucid, MTT) ([Upswing](https://upswingpoker.com/lose-less-win-more-the-fundamentals-of-big-blind-defense/)).

### 7.2 Deep stacks (150–300bb)

- Opens: about the same sizes ([Upswing – deep stacks](https://upswingpoker.com/deep-stack-strategy-tips/)). The 100bb and 200bb preflop results are "not much different" ([Preflop raise sizing](https://blog.gtowizard.com/preflop-raise-sizing-examining-2-key-factors/)).
- 3-bets: Upswing says to 3-bet bigger OOP (10–11bb vs a 2.5bb open, instead of 9bb), polarize more and add suited connectors ([Upswing](https://upswingpoker.com/deep-stack-strategy-tips/)). GTO Wizard finds the BB 3-bets **more polar** at 200bb and the SB uses a **smaller** 3-bet size ([IP 4-betting](https://blog.gtowizard.com/ip-4-betting-in-deep-stacked-cash-games/)). The two sources **conflict on OOP size**.
- 4-bets: about 3× the 3-bet IP at 200bb, against about 2× at 100bb ([IP 4-betting](https://blog.gtowizard.com/ip-4-betting-in-deep-stacked-cash-games/)). Do not 4-bet light for value deep. Flat QQ and AK more often; AA and KK can flat ([Upswing](https://upswingpoker.com/deep-stack-strategy-tips/)).
- Deeper preflop: blinds 3-bet less and call slightly more. Facing a 2× open at 300bb, AA is the only pure 3-bet ([Large preflop raises](https://blog.gtowizard.com/how-to-respond-to-large-preflop-raises-in-poker/)).
- Postflop: geometric sizing becomes a "robust default" with the nuts. At 200bb the BTN c-bets geometrically on AK7r (an overbet), and after a 25% flop bet the turn double barrel is about 3× pot ([Maximizing monsters](https://blog.gtowizard.com/maximizing-monsters-in-deep-stacked-scenarios/)). The largest postflop change is for the **OOP preflop raiser in 3-bet pots: check and call more, bet and check-raise less** ([Upswing](https://upswingpoker.com/deep-stack-strategy-tips/)).

---

## 8. Heads-up specifics (100bb)

| Item | Value | Source / confidence |
|---|---|---|
| BTN/SB open at 2× to 2.25× | 90%+ (chart example 91%) | [Upswing HU](https://upswingpoker.com/heads-up-button-open-strategy-no-limit-hunl/) (coach, no solver named) |
| BTN open at 2.5× | 80–90% (example 82.5%); default with no reads 2.5× at about 85% | same; [PokerCoaching HU](https://pokercoaching.com/blog/heads-up-poker/) |
| BTN open at 3× vs a loose BB | 70–80% | Upswing |
| BB defense vs min-raise | ≥70–75% | [PokerCoaching HU](https://pokercoaching.com/blog/heads-up-poker/) |
| BB 3-bet vs BTN | ≈20% to 4× with ≈40% calls (2+2 forum consensus, older) | [2+2 thread](https://forumserver.twoplustwo.com/15/poker-theory-amp-gto/current-standard-heads-up-nl-open-defend-ranges-1782213/) (could not fetch directly; from search summary) |
| SB limping | Upswing (older): never limp deeper than 40bb. GTO Wizard: limping is standard heads-up and in the SB | [Upswing HU](https://upswingpoker.com/heads-up-button-open-strategy-no-limit-hunl/) vs [GTO Wizard](https://blog.gtowizard.com/is-limping-pimping/). **Conflict**: modern solvers do mix limps |
| HU 50bb (ante) baseline | SB folds only 4%; BB raises about 34% vs a limp (to 6bb); 3-bets to 8.4bb vs a 2.1bb open | [GTO Wizard – HU SB mistakes](https://blog.gtowizard.com/heads-up-exploiting-sbs-preflop-mistakes/) (50bb, not 100bb) |

GTO Wizard notes that heads-up players commonly c-bet more often than the solver ([How to improve your HU game](https://blog.gtowizard.com/how-to-improve-your-heads-up-game/)).

---

## 9. Rule and explanation cheat-sheet for the engine

1. **Always compute the price.** Show required equity (`call / final pot`), MDF and alpha for the bet the player faced or made (§1.2), then compare with the player's hand equity *and* likely EQR (OOP, medium hands and no backdoors mean low EQR).
2. **Value test (river)**: does the hand win more than 50% when called by the hands that call? If not, it is a check or a bluff, not a value bet ([River principles](https://blog.gtowizard.com/principles-of-river-play/)).
3. **Bluff test**: the break-even fold % equals alpha. Compare with population fold rates (populations under-bluff, so bluff-catchers can over-fold, especially vs river raises and multiway).
4. **Frequency rules**: preflop, use the RFI bands (UTG ~17–18%, HJ ~21%, CO ~28%, BTN ~43–44%, SB ~40–50% raise). Postflop, IP c-bets ~100% on high-paired and dry broadway boards, ~70% on A-high and connected single-broadway boards, ~55–60% on middling boards, and low on low-connected boards. OOP c-bets are much lower (UTG vs BTN ~28%).
5. **Sizing rules**: range advantage sets frequency and nut advantage sets size. Use small (25–33%) on dry, static or paired boards; large (66–125%+) on dynamic boards where you hold the nut advantage; small again on very wet boards where both sides have nuts. Use geometric sizing on later streets with polar ranges.
6. **Grade by EV loss, not frequency.** Equal-EV mixes are "correct". Use GTO Wizard's categories (Best / Correct / Inaccuracy <3.5% frequency / Wrong / Blunder) with EV loss shown in bb and % pot.
7. **Calls cost more than bets, and river errors cost more than flop errors.** Weight feedback priority accordingly ([GTO Wizard](https://blog.gtowizard.com/understanding-which-mistakes-cost-you-the-most-money/)).
8. **Multiway**: tighten value, bluff only with equity, size smaller, and use rule-based feedback because solvers and analyzers often skip these spots.
9. **Stack depth**: adjust the stack-off threshold by SPR (top pair is fine at SPR ≤ 2, dicey at ~5, marginal at 13+).

---

### Gaps and caveats

- I found no freely published, solver-attributed tables of **6-max cash 3-bet % by seat matchup**, **BB defend % by opener at 100bb with rake**, or **BTN vs BB aggregate c-bet frequency**. GTO Wizard's own charts for these are images or behind login. Generate them with the project's solver (see `03_solver_implementations.md`).
- GTO Wizard does **not publish** the EV threshold for "significant" loss (blunder) or the GTOW Score formula.
- PokerCoaching ranges are pure simplifications. GTO Wizard's NL500 ranges differ in the mixed bottom of each range.
- Population figures come mainly from one Upswing data article (high-stakes online regulars) and coach anecdotes. Home-game populations are likely more extreme (more calling, less bluffing), but I found no data to confirm this.

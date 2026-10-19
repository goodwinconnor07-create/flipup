# GTO Poker: Algorithms, Papers, and Implementation Notes

**Scope:** The algorithms behind a No-Limit Hold'em (NLHE) solver and hand-review engine. It covers equilibrium concepts, the CFR family, abstraction, subgame solving, the superhuman bots (Libratus, DeepStack, Pluribus, ReBeL, Student of Games), the engineering tricks that make solvers fast, how to score human mistakes, and 2023–2026 research.

**Method:** Every paper cited below was located and, where marked "(read)", its full text was downloaded and checked for the formulas and numbers quoted. Numbers quoted from a paper come from that paper. Items marked "industry" are blog-level sources, not peer-reviewed work.

---

## 0. TL;DR for the backend

| Decision | Recommendation (with source) |
|---|---|
| Core solver for a 2-player postflop spot | Vectorized (range-vs-range) CFR over the public tree using **DCFR(α=1.5, β=0, γ=2)** with alternating updates. DCFR beat CFR+ by about 2–3x in HUNL subgames and matched or beat it everywhere it was tested (Brown & Sandholm 2019). PCFR+ is *not* better on poker endgames (Farina et al. 2021). |
| Cheap upgrade worth A/B testing | Hyperparameter Schedules (HS-DCFR): α = 1 + 3t/n, β = −1 − 2t/n, γ = 30 − 5t/n (Zhang, McAleer & Sandholm, AAAI 2026). It was strong on HUNL endgames. |
| Terminal evaluation | Sort hands by strength once per river board. Then compute showdown values in **O(n)** with prefix sums plus inclusion–exclusion for card removal (Johanson et al. 2011). Fold nodes are also O(n). |
| Symmetry | Canonicalize suits (Waugh 2013 indexer). There are 169 preflop classes, and the flop, turn and river have 1,286,792 / 55,190,538 / 2,428,287,420 canonical (hole + board) classes. |
| Off-tree bet sizes | Re-solve the subgame with the actual size added (nested subgame solving). Use pseudo-harmonic translation only as a fallback. In one test it was ~10x more exploitable than re-solving: 1,465 vs ~119 mbb/h (Brown & Sandholm 2017). |
| Convergence target | 1 mbb/g counts as "essentially solved" (Bowling et al. 2015). In practice solvers stop after 100–1,000 iterations (Brown & Sandholm 2019). Report exploitability as % of pot for postflop spots. |
| Mistake metric for hand review | EV loss at an infoset = max_a v(I,a) − v(I, a_played), using equilibrium counterfactual values. This is the instantaneous counterfactual regret of the played action, normalized by reach. Treat any action with positive equilibrium frequency as ~0 loss. |
| Multiway (3+ players) | No equilibrium guarantees exist, but MCCFR plus depth-limited search works well in practice (Pluribus). Present multiway output as "strong strategy", not "the GTO". |

---

## 1. Equilibrium, exploitability, best response

### 1.1 Nash equilibrium: two-player zero-sum vs multiplayer

- A **Nash equilibrium** σ* is a strategy profile in which no player can gain by deviating alone: ∀i, u_i(σ_i*, σ_{−i}*) = max_{σ_i'} u_i(σ_i', σ_{−i}*).
- **Two-player zero-sum (2p0s)** games such as heads-up poker are the easy case. Equilibria are interchangeable: if each player independently picks *any* equilibrium strategy, the resulting pair is still an equilibrium. Every equilibrium strategy also guarantees the game value. This is what makes "GTO" well defined for heads-up play.
- **Three or more players** behave differently. No polynomial-time algorithm is known even for two-player general-sum games, and the zero-sum case with 3+ players is at least as hard. The Pluribus paper uses the Lemonade Stand Game to show that independently chosen equilibria may not form an equilibrium together. Its conclusion is that for six-max "our goal should not be a specific game-theoretic solution concept, but rather to create an AI that empirically consistently defeats human opponents." CFR has no NE guarantee outside 2p0s. It does guarantee sublinear regret in every finite game, and it iteratively eliminates strictly dominated actions (Brown & Sandholm, Science 2019, read).
  - *Product implication:* for multiway pots, "GTO" output is a heuristic strong strategy, not an unexploitable one. Label it accordingly in the UI.

### 1.2 Exploitability

From Brown & Sandholm 2019 (DCFR paper, read):

- Best response: BR(σ_i) = argmax_{σ_{−i}'} u_{−i}(σ_i, σ_{−i}').
- Exploitability of σ_i in a 2p0s game: e(σ_i) = u_i(σ_i*, BR(σ_i*)) − u_i(σ_i, BR(σ_i)), i.e., how much worse σ_i does against a best response than an equilibrium strategy does.
- A profile is an **ε-Nash equilibrium** if no player can gain more than ε by deviating.
- Folk theorem used by all CFR papers: if both players' average regret satisfies R_i^T / T ≤ ε, then the average strategy profile is a **2ε-Nash equilibrium**.
- Reporting conventions differ, so check which one a paper uses. Some papers report the *average* of the two players' exploitability (DCFR paper, ReBeL). Others report the *total* or summed value (Deep CFR, which notes the difference explicitly). ReBeL defines exploitability as Σ_i max_π v_i(π, π*_{−i}) / |N|.

**Units**

- **mbb/g (or mbb/h)** means milli-big-blinds per game, i.e., big blinds won per hand × 1000. Professionals regard 50 mbb/g as a sizable margin (DeepStack paper). The "always fold" strategy loses 750 mbb/g in HUNL with 50/100 blinds (DeepStack LBR table).
- **"Essentially solved" = 1 mbb/g.** At that level a human lifetime of play cannot distinguish the strategy from an exact equilibrium with statistical confidence. Cepheus reached 0.986 mbb/g in heads-up limit hold'em, which brackets the dealer's game value at 87.7–89.7 mbb/g (Bowling et al. 2015, read).
- **% of pot** is the natural unit for postflop subgames whose starting pot varies. ReBeL plots TEH exploitability "relative to initial pot size". Commercial solvers expose a similar "Nash distance as % of pot" stopping criterion (industry convention).

### 1.3 Computing a best response

- **Public-tree, vector-form traversal (Johanson, Waugh, Bowling & Zinkevich, IJCAI 2011, read).** The traversal walks the *public* tree, which contains betting actions and board cards only. It passes down a vector of opponent reach probabilities over private hands and passes up a vector of values for every private hand. Four accelerations are described:
  1. Public-tree traversal instead of the full game tree. This does up to 1326x less work, and the authors measured about a 110x speedup.
  2. **O(n) terminal evaluation**, covered in §6.3. It ran 7.7x faster than the O(n²) evaluation in Texas hold'em.
  3. **Suit isomorphism.** In hold'em the public tree becomes 21.5x smaller.
  4. Parallelism over independent subtrees.
  With these, an exact best response for heads-up limit hold'em became feasible: 76 CPU-days sequentially, parallelized linearly.
- **Local Best Response (LBR) (Lisý & Bowling 2017, arXiv:1612.07547).** HUNL is too large for an exact best response, so LBR computes a cheap *lower bound* on exploitability. It looks only a small number of actions ahead and uses a heuristic value function. Results:
  - ACPC bots were exploitable by >3,000 mbb/g, four times worse than always folding: Hyperborean 4675, Slumbot 4020, Act1 3302.
  - Card abstraction contributed considerably more exploitability than betting abstraction.
  - LBR found no positive exploit of DeepStack (DeepStack paper, read).
- **Evaluation variance.** **AIVAT** (Burch et al., AAAI 2018) is an unbiased variance-reduction estimator. It uses a value heuristic and the known strategy of the bot. It cut the standard deviation of a man–machine match by 85%, which means 44x fewer hands for the same statistical conclusion. **AV-AIVAT** (Li, Chen & Huang, arXiv 2608.06362, Aug 2026) adds anytime-valid confidence sequences, so an evaluation can stop early with a valid guarantee. It reports a median 74x fewer hands than raw outcomes at a ±1 bb target.

---

## 2. The CFR family

### 2.1 Vanilla CFR (Zinkevich, Johanson, Bowling & Piccione, NIPS 2007, read)

Notation: π^σ(h) is the reach probability of history h. π_i^σ is player i's contribution to it and π_{−i}^σ is everyone else's, including chance. The counterfactual value v_i^σ(I) is i's expected utility at infoset I, weighted by π_{−i}.

- **Instantaneous counterfactual regret** for action a at infoset I on iteration t:
  r^t(I,a) = v^{σ^t}(I,a) − v^{σ^t}(I)
- **Cumulative regret:** R^T(I,a) = Σ_{t=1..T} r^t(I,a), and R^T_+ = max(R^T, 0).
- **Regret matching (RM):**
  σ^{T+1}(I,a) = R^T_+(I,a) / Σ_{a'} R^T_+(I,a') if the denominator is > 0; otherwise 1/|A(I)|.
- **Average strategy**, which is the output and is what converges:
  σ̄^T(I)(a) = Σ_t π_i^{σ^t}(I) σ^t(I)(a) / Σ_t π_i^{σ^t}(I)
- **Key theorem:** the overall regret satisfies R_i^T ≤ Σ_{I∈I_i} R^{T,+}_{i,imm}(I). Minimizing regret locally at every infoset therefore minimizes global regret. RM gives R^T(I) ≤ Δ√|A(I)| √T, so exploitability falls as O(1/√T), i.e., O(1/ε²) iterations.
- The paper solved abstractions of about 10¹² states, two orders of magnitude larger than earlier methods.
- **Alternating updates** (update one player per pass) are much faster in practice than simultaneous updates, although the theory is messier. Every modern result uses them (Brown & Sandholm 2019).

### 2.2 CFR+ (Tammelin 2014, arXiv:1407.5042, read; used to solve HULHE in Bowling et al., Science 2015)

There are three changes:

1. **Regret matching+ (RM+):** floor cumulative regret at zero on every iteration:
   Q^T(I,a) = max{0, Q^{T−1}(I,a) + r^T(I,a)}
2. **Linear (delayed) averaging:** weight iteration T by w_T = max(T − d, 0), where d is an averaging delay.
3. Alternating updates in vector form.

Other properties:

- The *current* strategy of CFR+ empirically converges, or nearly converges, by itself. For HULHE the averaged strategy was "later measured to be more exploitable than the current strategy and so discarded" (Bowling et al., CACM 2017 reprint, read).
- Clipped regrets make the regret tables mostly zeros. HULHE stored regrets with fixed-point compression at a ratio of about 13:1.
- The HULHE run used 200 nodes × 24 cores, 1,579 iterations, 68.5 days and 900 core-years. It reached 0.986 mbb/g.

### 2.3 Linear CFR and Discounted CFR (Brown & Sandholm, AAAI 2019, arXiv:1809.04040, read)

**DCFR(α, β, γ):** on each iteration t:

```
if R(I,a) > 0:  R(I,a) ← R(I,a) · t^α / (t^α + 1)      # positive regrets
else:           R(I,a) ← R(I,a) · t^β / (t^β + 1)      # negative regrets
R(I,a) += r^t(I,a)
S(I,a) ← S(I,a) · (t/(t+1))^γ + π_i^t(I) · σ^t(I,a)    # average-strategy accumulator
```

Special cases:

- **LCFR = DCFR(1,1,1).** Iteration t is weighted by t, so after T iterations the first iteration keeps weight 2/(T²+T) instead of 1/T. To avoid numerical problems, implement it as multiplying the accumulated values by t/(t+1) each iteration.
- **CFR+ ≈ DCFR(∞, −∞, 2)** when quadratic averaging is used.
- **Recommended setting: α = 3/2, β = 0, γ = 2.** It "matches or outperforms CFR+ across the board. The improvement is usually a factor of 2 or 3." With β = 0, negative regrets are halved each iteration.
- Convergence bound for DCFR: a 6Δ|I|(√|A| + 1/√T)/√T-Nash equilibrium after T iterations, which is CFR's bound up to a constant.

Practical findings:

- **CFR+ is faster with quadratic averaging** (weight t²) than with linear averaging t. Theorem 1 of the paper allows any non-decreasing weights.
- **LCFR** is excellent early but worse than CFR+ asymptotically. It is best in games with *large-mistake actions*, such as subgames with a small pot relative to stacks. In a motivating example LCFR needed 970 iterations where CFR+ needed 471,407.
- **LCFR+**, i.e., linear weighting combined with the regret floor, performed *worse* than both.
- **DCFR(3/2, −∞, 2)**, which zeroes negative regrets, is usually just as good but occasionally produces exploitability spikes. The paper recommends β = 0 over β = −∞.
- **β > 0 for pruning.** With β ≤ 0, suboptimal actions' regrets do not go to −∞, which prevents regret-based pruning. DCFR(3/2, 1/2, 2) was nearly identical in HUNL subgames and is the choice when pruning matters.
- **Optimistic RM** counts the last regret twice. It helped LCFR in subgames with large mistakes but hurt DCFR. **NormalHedge** sometimes helped per iteration but each iteration cost 5x more.
- **Discounted MCCFR:** split the run into periods of 10⁷ nodes touched and multiply all regrets and average-strategy sums by n/(n+1) after period n. This clearly beat vanilla MCCFR. CFR+'s changes do *not* help MCCFR.
- **Iteration budget:** "In practice, this is usually after 100–1,000 iterations." The benchmarks were Libratus HUNL river and turn subgames, using bet sizes of 0.5x and 1x pot plus all-in for the first bet and 1x pot plus all-in afterwards.

### 2.4 Predictive CFR+ (Farina, Kroer & Sandholm, AAAI 2021, arXiv:2007.14358, read)

**Predictive regret matching+ (PRM+)**, with prediction m^t of the next loss and loss vector ℓ:

```
NextStrategy(m^t):
    θ^t ← [ z^{t−1} + ⟨m^t, x^{t−1}⟩·1 − m^t ]^+
    x^t ← θ^t / ||θ^t||_1            (uniform/arbitrary if θ^t = 0)
ObserveLoss(ℓ^t):
    z^t ← [ z^{t−1} + ⟨ℓ^t, x^t⟩·1 − ℓ^t ]^+
```

- The prediction is the last observed loss, m^t = ℓ^{t−1}. In CFR terms, the strategy is computed by regret-matching on (cumulative regret + last instantaneous regret) while the stored state is the ordinary RM+ cumulative regret.
- **PCFR+** = PRM+ at every infoset + alternating updates + **quadratic averaging** with weights 6t²/(T(T+1)(2T+1)).
- PCFR+ is faster by orders of magnitude on many non-poker games (Battleship and Pursuit-evasion by 3–6 orders of magnitude after 500 iterations). **But on the Libratus river endgame it was "slightly faster than CFR+, but slower than DCFR,"** and DCFR remained better on the deeper poker games. Use DCFR-family methods for poker.
- The paper also shows RM = FTRL and RM+ = OMD applied to Blackwell approachability. Later variants build on this connection.

### 2.5 2023–2026 CFR variants

| Variant | Update / idea | Poker-relevant result |
|---|---|---|
| **DCFR+ / PDCFR+** (Xu et al., IJCAI 2024, arXiv:2404.13891, read) | DCFR+: R^t = [R^{t−1}·(t−1)^α/((t−1)^α+1) + r^t]^+ with average weight ((t−1)/t)^γ. PDCFR+ predicts with R̃^{t+1} = [R^t·t^α/(t^α+1) + v^{t+1}]^+. Tuned values: α = 2.3, γ = 5 for PDCFR+, and α = 1.5, γ = 4 for DCFR+. | In HUNL subgames, **DCFR+ was the fastest**, while PDCFR+ was comparable to CFR+ and PCFR+. PDCFR+ beat others by 4–8 orders of magnitude on non-poker games. |
| **DDCFR** (Xu et al., ICLR 2024 spotlight) | An RL policy, trained on four small games, picks DCFR's (α, β, γ) during the run. | Generalizes, but adds the cost of running the policy. |
| **Hyperparameter Schedules** (Zhang, McAleer & Sandholm, arXiv:2404.09097, AAAI 2026, read) | Training-free schedules with t = current iteration and n = total iterations: α = 1 + 3t/n, β = −1 − 2t/n, γ = 30 − 5t/n (HS(30)) or 15 − 5t/n (HS(15)). The large γ suppresses early iterations for hundreds of iterations. The change is under 15 lines of code. | HS-DCFR "consistently" strong on HUNL endgames. They report an average 12.5 orders of magnitude over prior SoTA across 10 games, mostly small games where it reaches machine precision, so read that number with care. The authors confirm **DCFR > PCFR+ on HUNL endgames**. Experiments ran 1,000 iterations. |
| **APCFR+ / SAPCFR+** (Meng et al., arXiv:2503.12770, 2025) | Asymmetric step sizes between the implicit and explicit regret updates reduce PCFR+'s sensitivity to bad predictions. SAPCFR+ is a one-line change. | Tested on 2 HUNL subgames and generalizes to DCFR. No headline numbers in the abstract. |
| **IREG-PRM+** (Zhang, Anagnostides & Sandholm, arXiv:2510.04407) | A scale-invariant, parameter-free PRM+ with T^{−1/2} best-iterate and optimal T^{−1} average-iterate convergence. | Matches or beats PRM+. This is mainly theoretical. |
| **RM+ (in)stability** (Farina et al., NeurIPS 2023, arXiv:2305.14709) | RM+ and PRM+ can be unstable. Restarts or clipping away part of the orthant fix this. | Theoretical; small gains in practice. |
| **Magnetic Mirror Descent** (Sokota et al., ICLR 2023, arXiv:2206.05825) | Mirror descent with a "magnet" regularizer converges linearly to QRE (regularized NE). | Competitive with CFR when used tabularly and works with deep RL. It gives last-iterate convergence, which matters for neural methods. |

### 2.6 Monte Carlo CFR (Lanctot, Waugh, Zinkevich & Bowling, NIPS 2009, read)

- Split the terminal histories Z into blocks Q_j and sample one block per iteration. q(z) is the probability that terminal z is sampled. The **sampled counterfactual value** reweights each sampled terminal's utility by 1/q(z), so it equals the true counterfactual value in expectation, and the regret bounds hold with high probability.
- **External sampling:** sample the opponent's and chance actions, and enumerate all of the traverser's actions. Only a constant-factor increase in iterations is needed, and cost per iteration drops by an order of magnitude. This is the standard choice; Libratus and Pluribus both used variants of it.
- **Outcome sampling:** sample a single trajectory. Use ε-greedy exploration at the traverser's infosets; **ε = 0.6** worked well across games. Variance is high.
- **Chance sampling:** sample only chance outcomes. **Public Chance Sampling (PCS)** (Johanson et al., AAMAS 2012, read) samples only *public* chance (board cards) and enumerates all private hands as vectors. It amortizes strategy computation and enables O(n) terminal evaluation, so it converged faster than chance-sampled CFR in poker. Variants: **SPCS** samples own private plus public chance and keeps the opponent as a vector; **OPCS** does the reverse. **This is the architecture that commercial range-vs-range solvers use.**
- **Average Strategy Sampling** (Gibson, Burch, Lanctot & Szafron, NIPS 2012) samples a subset of the traverser's actions in proportion to the average strategy. It helps in no-limit games with many bet sizes.
- **Neural CFR:**
  - **Deep CFR** (Brown, Lerer, Gross & Sandholm, ICML 2019, arXiv:1811.00164) runs K external-sampling traversals per iteration. It trains an advantage network from a reservoir-sampled buffer, then a final average-policy network, and needs no abstraction.
  - **ESCHER** (McAleer, Farina, Lanctot & Sandholm, ICLR 2023) removes the importance-sampling variance by learning a history value function.
  - **Deep (Predictive) Discounted CFR** (Xu et al., AAAI 2026, arXiv:2511.08174) approximates DCFR- and PDCFR+-style discounting and clipping in a model-free neural CFR.

### 2.7 Pruning

- **Partial pruning** is classic: skip a subtree when the opponent's reach is 0 (Lanctot et al. 2009 used this for vanilla CFR).
- **Regret-Based Pruning (RBP)** (Brown & Sandholm, NIPS 2015, read): if R(I,a) ≤ 0, the subtree D(I,a) can be skipped for as many iterations as it would provably take for the regret to become positive. Once the regret could turn positive, the skipped iterations are "caught up" with a single traversal. In one example, partial pruning still traversed 10% of the tree while RBP traversed far less. RBP gave an order-of-magnitude speedup over partial pruning, growing with game size, for both CFR and CFR+. A later version, "Reduced Space and Faster Convergence ... via Regret-Based Pruning" (arXiv:1609.03234), also frees memory. Interaction with discounting: pruning needs β > 0 in DCFR (§2.3).
- **Probabilistic negative-regret skipping in MCCFR:**
  - *Libratus* probabilistically skips actions with very negative regret. This gave a **3x speedup** of MCCFR and also mitigates imperfect-recall bucket "fighting", because unreachable decision points stop updating shared buckets (Brown & Sandholm, Science 2018, read).
  - *Pluribus* does not explore actions with "extremely negative regret" in **95% of iterations** (Science 2019, read).

### 2.8 Warm starting

- **Strategy-based warm starting** (Brown & Sandholm, AAAI 2016) takes any strategy pair and, in one tree traversal, sets regrets so that CFR resumes as though it had already run as many iterations as it would have needed to reach that strategy's quality. Convergence bounds are unchanged. Two use cases: solving a coarse abstraction first and then warm starting the fine one, or a *hand-review engine re-solving a slightly modified tree*.
- ReBeL uses a policy network to warm start subgame CFR ("Self-Play Value/Policy Net" in its Fig. 2).
- **Regret transfer** (Brown & Sandholm, AAAI 2014) carries regrets across changes to bet-size parameters. The Libratus paper (read) cites it for locally optimizing early-game bet sizes.

---

## 3. Abstraction

### 3.1 Card (information) abstraction

From Johanson, Burch, Valenzano & Bowling, *Evaluating State-Space Abstractions in Extensive-Form Games* (AAMAS 2013, read):

- **Hand strength (HS):** on the river, the probability of beating a uniformly random opponent hand (ties counted as half).
- **E[HS]:** the expectation of HS over all rollouts of the remaining board cards.
- **E[HS²]:** the expectation of HS². It gives relatively more weight to *drawing hands* with high variance.
- **Percentile bucketing:** buckets hold equal numbers of hands. *Nested* bucketing first splits by E[HS²] and then by E[HS], e.g., 5×2 = 10 buckets. This was Hyperborean's ACPC 2007–2009 abstraction.
- **Problem:** expectation-based metrics merge hands with the same mean but very different distributions (e.g., 6♠6♥ vs T♠J♠).
- **Distribution-aware: hand-strength histograms + Earth Mover's Distance (EMD) + k-means.** Precompute a histogram of the final HS for every (hole, board) pair on the flop and turn, and cluster with k-means under EMD. For 1-D histograms, EMD is a single pass over cumulative sums, i.e., the L1 distance between CDFs. On the river, EMD reduces to the difference in HS.
- **OCHS (Opponent Cluster Hand Strength):** a vector of 8 equities against 8 clusters of opponent starting hands, compared with L2 distance. It is mainly used on the river.
- **Imperfect recall:** forget earlier-round buckets so the current round can have many more buckets. In this paper's measurements, imperfect-recall, distribution-aware abstractions beat perfect-recall and expectation-based ones in both exploitability (computed with CFR-BR) and head-to-head play.

**Potential-aware abstraction with EMD** (Ganzfried & Sandholm, AAAI 2014): instead of histograms over *final* HS, cluster each round by the distribution over *next-round clusters*, using EMD where the ground distance is the distance between next-round cluster centroids. This captures the full trajectory of strength. It beat the prior best approach in NLHE. A 2025 paper describes this method as a component used in DeepStack, Libratus and Pluribus.

**Real deployments:**

- *Libratus* used no card abstraction on preflop and flop. It grouped 55M turn hands into 2.5M buckets and 2.4B river hands into 1.25M buckets, *only in the blueprint*. Real-time subgame solving used no card abstraction.
- *DeepStack* encoded ranges for its value networks over 1,000 hand clusters.
- *Pluribus* used information abstraction only for *future* rounds during search, never for the round it was currently in.

**Lossless abstraction:** Gilpin & Sandholm, *Lossless abstraction of imperfect information games*, JACM 54(5), 2007 (GameShrink, "games of ordered signals"). Suit isomorphism is its practical core (§6.1).

**Abstraction pathologies:** refining an abstraction can *increase* real-game exploitability (Waugh et al., cited in Johanson 2013). Abstract-game exploitability is not a reliable proxy; measure in the real game, or use LBR.

**Recent work (2025):** Fu, Yin, Liu, Xu & Huang argue that outcome-based imperfect recall discards useful history.

- *FROI* (Full-Recall Outcome Isomorphism) and the *signal observation ordered games* formalism, arXiv:2510.15094.
- *KrwEmd* (k-recall winrate features + EMD), arXiv:2511.12089.

### 3.2 Action abstraction

- *Pluribus* considered 1 to 14 bet sizes depending on the situation. The preflop tree was dense, and later streets were handled by search.
- *Libratus* used mostly "nice fractions or multiples of the pot" taken from common human sizes. Some early-tree sizes were locally optimized with an application-independent parameter-optimization algorithm (regret transfer). Its **self-improver** module added branches for the off-tree sizes humans actually used and solved them overnight.
- *ReBeL* used at most 9 actions, with bet and stack sizes randomized during training. Any off-tree action at test time is added to the subgame.
- *Student of Games* used randomized betting abstractions that reduce about 20,000 actions to 4–5.
- **RL-CFR** (Li, Fang & Huang, arXiv:2403.04344): an RL policy picks the action abstraction per public state, and CFR solves the resulting tree. It won by 64 ± 11 mbb/hand against a ReBeL replication and by 84 ± 17 mbb/hand against Slumbot, without increasing solve time. This line of work suggests *learned, state-dependent bet-size menus* for a solver product.

### 3.3 Action translation and the pseudo-harmonic mapping

Ganzfried & Sandholm, *Action Translation in Extensive-Form Games with Large Action Spaces: Axioms, Paradoxes, and the Pseudo-Harmonic Mapping*, IJCAI 2013. The formula is as restated by Ganzfried in arXiv:1510.08578 (read).

The opponent bets x, which lies between abstract sizes A < x < B. **All sizes are expressed as fractions of the pot.** Map x to A with probability

```
f_{A,B}(x) = ((B − x)(1 + A)) / ((B − A)(1 + x))
```

and to B with probability 1 − f(x). Properties:

- The mapping was derived from analytical solutions of simplified poker games.
- It satisfies boundary conditions, monotonicity and scale invariance, and it is Lipschitz-continuous in A and B, so it is robust to small changes in the abstraction.
- It had much lower exploitability than earlier mappings and was competitive against ACPC 2012 agents.
- Pluribus used it for slightly off-tree preflop bets.

**Its limits matter:** in Brown & Sandholm's nested-subgame-solving experiment, the **randomized pseudo-harmonic mapping was exploitable for 1,465 mbb/h**. The subgame-solving methods in the same setup were exploitable for 119–150 mbb/h (§4.1). Re-solving beats translation whenever time allows.

---

## 4. Subgame solving and search

### 4.1 Safe and nested subgame solving (Brown & Sandholm, NeurIPS 2017 Best Paper, arXiv:1705.02955, read)

- **Unsafe subgame solving:** assume the opponent played the blueprint to reach the subgame, compute the resulting belief distribution, and solve. It has no guarantees and can be very exploitable, but it often works well in practice.
- **Re-solve (Burch et al., CFR-D, AAAI 2014):** build an *augmented subgame* (a "gadget"). Before each of the opponent's (P1's) root infosets, P1 chooses between entering the subgame and taking an **alternative payoff** equal to their blueprint counterfactual best-response value CBV^{σ2}(I1). The new strategy is then guaranteed to be no more exploitable than the blueprint.
- **Maxmargin:** maximize the minimum margin M(I1) = CBV^{σ2}(I1) − CBV^{σ2'}(I1) over root infosets. Re-solve only requires margins to be ≥ 0.
- **Reach subgame solving:** raise the alternative payoffs by the **"gifts"** P1 gave away earlier in the hand, i.e., the value lost by taking suboptimal actions on the path, using lower bounds on those gifts. When several subgames are solved, the gift must be split among them; splitting equally worked well. This gives margins ≥ Maxmargin's.
- **Estimates instead of CBVs:** use the *blueprint's* estimated equilibrium values for alternative payoffs instead of the pessimistic CBVs. Exploitability is bounded by the estimate error (Theorem). Adding "distributional" alternative payoffs further reduced exploitability in most cases.
- **Nested subgame solving:** re-solve every time the opponent acts off-tree. Results on an NLFH test game, in mbb/h exploitability:

| Method | mbb/h |
|---|---|
| Randomized pseudo-harmonic translation | 1,465 |
| Resolve | 150.2 |
| Reach-Maxmargin (expensive) | 149.2 |
| Unsafe (expensive) | 148.3 |
| Maxmargin | 122.0 |
| Reach-Maxmargin | 119.1 |

- **Libratus** (Brown & Sandholm, Science 2018, read) combined three modules:
  1. A MCCFR blueprint with negative-regret pruning.
  2. Nested safe subgame solving from the turn onward and after every off-tree bet, with no card abstraction, solved with CFR+.
  3. A self-improver.
  It beat four top professionals by **147 mbb/hand** over 120,000 hands (99.98% significance). The blueprint alone lost to Baby Tartanian8 by 8 ± 15 mbb/hand; with post-processing it won by 18 ± 21. The full Libratus beat Baby Tartanian8 by 63 ± 28.

### 4.2 DeepStack: continual re-solving with counterfactual value networks (Moravčík et al., Science 2017, arXiv:1701.01724, read)

- **Continual re-solving:** carry only (a) *your own range* and (b) a *vector of opponent counterfactual values*, never the opponent's range. At each decision:
  - **Own action:** re-solve, then replace the opponent CFVs with the values the re-solve computed for the chosen action, and Bayes-update your range.
  - **Chance card:** replace the opponent CFVs with the re-solve's values for that card, and zero out impossible hands.
  - **Opponent action:** no change.
  Re-solving uses the CFR-D gadget, with the opponent CFVs as alternative payoffs.
- **Depth-limited lookahead:** stop at the end of the round, or earlier, and query a **deep counterfactual value network**.
  - *Inputs:* pot size as a fraction of stacks, public cards, and both ranges bucketed into 1,000 clusters.
  - *Architecture:* 7 fully connected hidden layers of 500 units with PReLU.
  - *Outputs:* CFVs for both players. A zero-sum post-processing layer makes them consistent.
  - *Training:* Huber loss and Adam. The turn network was trained on 10M random solved turn games (fold/call/pot/all-in, no card abstraction) and the flop network on 1M flop games. A preflop auxiliary network was also used.
- **Sparse lookahead trees:** about 10⁷ decision points, solved in under 5 s on a GTX 1080. The theoretical guarantee is exploitability ≤ k1·ε + k2/√T, where ε is the network error and T the number of iterations.
- **Results:** 44,852 hands against 33 professionals. It won 492 mbb/g raw and 486 mbb/g with AIVAT, beating 10 of the 11 players who completed 3,000 games significantly. LBR found no exploit.

### 4.3 Depth-limited solving with multi-valued states (Brown, Sandholm & Amos, NeurIPS 2018, arXiv:1805.08195, read)

- At the depth limit, the *opponent* chooses among **k continuation strategies**, so the leaf has multiple values instead of one fixed value. This keeps the searcher balanced.
- **Bias approach:** the blueprint, plus the blueprint biased toward folding, calling and raising, where the bias multiplies the favored action's probability by 10 and renormalizes. **Self-generative approach:** iteratively add best responses; 10 strategies were used.
- **Modicum** used 700 core-hours to build, a 4-core CPU and 16 GB RAM, and plays about 20 s per hand. It beat Baby Tartanian8 by 6 ± 5 and Slumbot by 11 ± 9 mbb/g. Naive single-valued depth-limited search lost to Baby Tartanian8 (−10 ± 8). For comparison, Baby Tartanian8 took about 2M core-hours and 18 TB of RAM, and Slumbot about 250k core-hours and 2 TB.
- A small DNN (2 hidden layers × 64 units, 34 input features → 4 values as fractions of the pot) could replace rollouts at the leaves.

### 4.4 ReBeL (Brown, Bakhtin, Lerer & Gong, NeurIPS 2020, arXiv:2007.13544, read)

- **Public Belief State (PBS):** the public observations plus every player's probability distribution over private infostates. A PBS turns the game into a continuous-state perfect-information game. Theorem: infostate values are a supergradient of the PBS value function, so it suffices to learn infostate values given the PBS.
- **Self-play loop:**
  1. Build a depth-limited subgame at the root PBS.
  2. Run T iterations of CFR-D, specifically alternating-updates **Linear CFR**, with leaf values from the value network evaluated at the leaf PBSs *of the current iteration*.
  3. Add the root's average value vector to the training data.
  4. Sample a leaf PBS **at a random iteration t ∼ unif{0, T−1}** and recurse. The random stopping iteration is what keeps the approach sound at test time.
- **Networks:** MLPs with GeLU and LayerNorm, Huber loss for values and MSE for the policy. Training used up to 128 machines × 8 GPUs for data generation.
- **Results:** beat BabyTartanian8 by 9 ± 4 and Slumbot by 45 ± 5 mbb/g, and Dong Kim by 165 ± 69. It won 881 ± 94 mbb/g against a restricted LBR and took under 2 s per hand. In turn-endgame hold'em, its exploitability equalled about 125 iterations of full-game tabular CFR.

### 4.5 Student of Games (Schmid, Moravčík, Burch et al., arXiv:2112.03178, read; journal version reportedly Science Advances 2023, not independently verified here)

- **GT-CFR (growing-tree CFR)** alternates a public-tree CFR regret-update phase with an expansion phase that adds public states via simulated trajectories, PUCT-style. It is trained by "sound self-play" with value and policy networks.
- One algorithm plays chess, Go, poker and Scotland Yard. Exploitability is O(1/√T) under its assumptions.
- **HUNL:** beat Slumbot by 7 ± 3 mbb/hand over 3.1M hands. LBR could not exploit it, and it beat LBR by 434 ± 9.

### 4.6 Search without common knowledge (2025–2026)

**Obscuro** (B. H. Zhang & Sandholm, arXiv:2506.01242, ICLR 2026) extends subgame solving to games where enumerating the common-knowledge closure is impractical. It was the first superhuman Fog-of-War chess AI. This is less relevant to hold'em, whose public tree is small, but it is the current frontier in imperfect-information search.

---

## 5. Pluribus: six-player NLHE (Brown & Sandholm, Science 365:885–890, 2019, read)

**Blueprint**

- MCCFR with **Linear CFR discounting in early iterations**. Discounting was later turned off because the multiplications were not worth their cost.
- Actions with extremely negative regret were skipped in 95% of iterations.
- Compute: 8 days on a 64-core server, **12,400 core-hours, under 512 GB RAM**, about $144 at spot prices.
- The blueprint is played only on the preflop when the opponent stays near the tree. Slightly off-tree preflop bets are mapped with pseudo-harmonic translation.

**Depth-limited search**

- On the flop onward, and preflop after large off-tree bets, Pluribus searches in real time.
- At the leaves, **each player chooses among k = 4 continuation strategies**: the blueprint and the blueprint biased toward fold, call or raise.
- Pluribus computes its strategy for **every hand in its range** and balances across them before acting with the hand it holds.
- Search solver: Monte Carlo Linear CFR for large or early subgames, otherwise an optimized **vector-based Linear CFR that samples only chance events**, i.e., public chance sampling.
- Hardware: 2 Haswell CPUs, under 128 GB RAM, 1–33 s per subgame, about 20 s per hand in self-play.

**Results (AIVAT-adjusted)**

- 5 humans + 1 AI: +48 mbb/g (SE 25) over 10,000 hands, p = 0.028.
- 1 human + 5 AIs: +32 mbb/g (SE 15), p = 0.014, against Darren Elias and Chris Ferguson.

**Strategic findings**

- Pluribus confirmed that **open-limping is bad except from the small blind**. It "initially experimented with limping ... it gradually discarded this action."
- It **disagrees with the folk wisdom that donk betting is a mistake** and donks "far more often than professional humans do."
- Its strategy is heavily mixed. Unpredictability comes from balancing across the whole range at each search.
- Heads-up limit hold'em shows the same pattern: Cepheus "emphatically" agrees that limping as the first action is bad, and the dealer's game value is about +88 mbb/g.

---

## 6. Engineering tricks used by real solvers

### 6.1 Card isomorphism / suit symmetry

Waugh, *A Fast and Optimal Hand Isomorphism Algorithm*, AAAI-13 Computer Poker workshop (read). Reference C code: github.com/kdub0/hand-isomorphism.

- Suits can be permuted, and cards dealt within the same round can be reordered. AK offsuit is one class whatever the suits.
- The indexer is *optimal* (no holes in the index space), has an *inverse* (index → canonical hand), and generalizes to other games such as PLO and Leduc. It uses colex indexing of same-suit rank sets and multiset-colex to break ties between suits with identical configurations.
- **Canonical index sizes** for hole + board:

| Round | Canonical classes |
|---|---|
| Preflop | 169 |
| Flop | 1,286,792 |
| Turn | 55,190,538 |
| River | 2,428,287,420 |

  A less careful scheme needs 1.37–2.91x more entries.
- Isomorphism made computing a partial hand's EV up to 24x cheaper, and it made the hold'em public tree 21.5x smaller for best-response computation (Johanson 2011).
- *For a postflop solver:* canonicalize the flop (1,755 strategically distinct flops) and remap suits on turn and river cards. When the board has suit symmetry, the solver can solve only one representative of each equivalent turn or river card and reuse the strategy through suit permutation.

### 6.2 Vectorized range-vs-range CFR ("public chance sampling" across hands)

Following Johanson et al. 2012 (PCS) and Tammelin's vector-form CFR+:

- Traverse the **public tree** only: betting nodes and board-card chance nodes.
- At each node, keep **reach vectors of length ≤ 1326** (hole-card combos) for each player. Return **CFV vectors** of the same length.
- At a player node, the strategy is a |A| × 1326 matrix from regret matching. The acting player's reach is multiplied by σ(a) element-wise, while the opponent's reach passes through unchanged.
- At chance nodes, either enumerate all board cards (full CFR, as commercial postflop solvers do) or sample them (PCS / Pluribus's vector Linear CFR). Remove combos blocked by the new card.
- All of this is SIMD- and GPU-friendly. It also gives O(n) leaf evaluation.

### 6.3 O(n) showdown evaluation by sorting (Johanson et al. IJCAI 2011, read; also PCS 2012)

The naive showdown is O(n²) over (my hand, opp hand) pairs. The fast version:

1. For the final 5-card board, compute each hand's rank, and **sort the combos by strength once**. This costs O(n log n) and is amortized over every terminal node under that board.
2. Sweep from weakest to strongest, maintaining the cumulative opponent reach of *strictly weaker* hands and of *equal* hands. For hand h: `value(h) = pot_win · P(opp weaker) − pot_lose · P(opp stronger)`, with ties split.
3. **Card removal (inclusion–exclusion):** the opponent cannot hold either of my cards. Maintain per-card cumulative reach sums (52 accumulators) alongside the total. When evaluating hand {c1, c2}, subtract the opponent mass containing c1 and the mass containing c2, then add back the single combo {c1, c2}, which was subtracted twice. The result is exact and O(1) per hand after O(n) preprocessing.
4. **Fold nodes:** value(h) = payoff × (total opponent reach − reach on combos sharing c1 − reach sharing c2 + reach of {c1, c2}), which is also O(n).

The paper measured 7.7x faster than O(n²) in Texas hold'em. In vector CFR the leaf work then becomes linear in range size, and that is the dominant cost.

### 6.4 Memory and numerics

- **Store regrets and strategy sums as float32 or compressed fixed-point.** RM+/DCFR clipping makes values sparse; HULHE got about 13:1 compression.
- **Discount by multiplication, not by growing weights.** Multiply by t/(t+1) or the DCFR factors each iteration to avoid overflow.
- **Use the current iterate where it converges.** CFR+ current strategies often suffice, which saves storing the average.
- Use **alternating updates** in every algorithm.
- Use **β > 0 if pruning.**
- **Measure exploitability with a best response every N iterations** and stop at a target % of pot. Users are sensitive to wall-clock time, and the 100–1,000-iteration practical range comes from the DCFR paper.

---

## 7. Learning from solvers: simplification, EV loss, human rules

### 7.1 How much does simplification cost?

- **Fewer bet sizes (industry, GTO Wizard blog, "Do Multiple Sizes Matter?", A. Brokos, Mar 2024).** The test spot was UTG vs BB, 100bb, single-raised pot.
  - Flop: a one-size strategy was usually within **0.01 bb** of the multi-size one. The worst case was **about 0.02 bb**, under 0.5% of the pot.
  - Turn: the largest gap was about 0.6 bb for certain hand classes on a K♠ turn, where the complex strategy polarizes between 40% pot and 200% pot.
  - Multiple sizes matter most when the solver uses very different sizes at significant frequency, and most on the river.
  - The author also warns that imitating a complex mixed strategy imperfectly can cost more than the 0.01 bb it gains, because sizing tells become exploitable.
- **Purification and thresholding** (Ganzfried, Sandholm & Waugh, AAMAS 2012). Rounding an abstract equilibrium toward its high-probability actions (purification = play the argmax action; thresholding = zero out actions below a threshold and renormalize) often *improved* performance against real opponents. It also adds robustness to abstraction error. Libratus likewise reports that "eliminating low-probability actions empirically leads to better" performance. *Implication:* the review engine can present a thresholded or purified "practical" strategy next to the full mix.
- **Sparse betting abstractions are exploitable** in theory (Lisý & Bowling 2017). In practice the EV cost against non-adaptive opponents is small. Make both points to users.

### 7.2 Human-understandable rules distilled from solvers

- **MDF.** For a bet b into pot P:
  - MDF α = P/(b+P). This is the calling frequency that makes a pure bluff break even: α(−b) + (1−α)P = 0.
  - The bettor's matching bluff fraction of the betting range is b/(P+2b).
- **Ganzfried & Chiswick, "Most Important Fundamental Rule of Poker Strategy"** (arXiv:1906.09895, read). They solved 100,000 random simplified games per bet size (0.5, 0.75 and 1 pot) and regressed the optimal defense frequency (ODF) on MDF and **range advantage (RA)**, the bettor's equity vs the caller's range.
  - With a pot-sized bet: fixed MDF had MSE 0.0067, while ODF ≈ −0.446·RA + 0.688 had MSE 0.0024. A quadratic −1.760·RA² + 1.316·RA + 0.275 had MSE 0.0012.
  - Across sizes, ODF ≈ 0.904·MDF − 0.495·RA + 0.261 (MSE 0.0030 vs 0.0086 for fixed MDF). The human-friendly version is **ODF ≈ min(MDF, MDF − 0.5·RA + 0.25)**, and when RA > 0.75, ODF ≈ 1 − RA.
  - *Takeaway:* defend *less* than MDF when the bettor has a range advantage.
- **Ganzfried, "Computing Human-Understandable Strategies"** (arXiv:1612.06340) is the earlier version of this rule-mining approach.
- **Bertsimas & Paskov, "World-class interpretable poker"** (Machine Learning 111:3063–3083, 2022) combines optimal classification trees with CFR self-play. The result is a fully interpretable HUNL bot that beat Slumbot, and the authors argue humans can learn its strategies.
- **Solver-Guided Reasoning for Mixed-Equilibrium Strategies** (Wang et al., arXiv:2608.06741, Aug 2026):
  - Builds **Mixed-Strategy Decision Trees** that compress solver output (over 250M NLHE decisions) into sparse rules humans and LLMs can follow.
  - Cut LLMs' distance to equilibrium by 52.6%.
  - Notes that human play is biased toward pure strategies.

### 7.3 Scoring mistakes by EV loss (design notes)

- **Definition.** At the player's infoset I with equilibrium counterfactual action values v(I,a):

  `EV_loss(I, a_played) = max_a v(I,a) − v(I, a_played)`

  This is the instantaneous counterfactual regret of the played action, divided by the opponent's reach so that it is in "given we are here" units. Express it in bb and as % of pot.
  - At equilibrium, every action with positive frequency has (approximately) the same value. **Actions inside the support of the mix are ~0 EV loss**, even at low frequencies. A practitioner tool states the same rule: 0.00 EV loss means "broke even against a GTO player" (industry, Fearless River docs).
- **Granularity.** Compute the loss per decision, then aggregate per hand weighted by how often the spot occurs. Separate "frequency mistakes", which cost little EV, from "action-class mistakes", which cost much more.
- **Use a re-solved subgame with the actual bet sizes**, not an abstract-tree lookup, so the off-tree sizes the user actually chose get correct values (§4.1). Warm start from the blueprint (§2.8) to keep latency low.
- **Solver noise floor.** Differences below the solver's exploitability (e.g., <0.1–0.3% of pot at convergence) are noise. GTO Wizard notes that some simplified-strategy EVs came out *higher* than the complex ones because of solver error. Do not flag those.
- **Multiway pots.** EV loss is still computable against a fixed opponent model, such as a Pluribus-like strong strategy, but it is not "loss vs GTO". Label it accordingly.

---

## 8. Recent developments (2023–2026) relevant to a solver backend

1. **Faster tabular solvers**
   - DCFR+, PDCFR+ (IJCAI 2024), HS-DCFR and HS-PCFR+ (AAAI 2026), APCFR+ (2025) and IREG-PRM+ (2025).
   - On poker specifically, DCFR-style discounting (DCFR, DCFR+, HS-DCFR) remains the best choice. Predictive methods dominate non-poker benchmarks.
2. **Learned discounting** (DDCFR, ICLR 2024) and **meta-learned regret minimizers** (arXiv:2504.18917) adapt the update rule as the solve proceeds.
3. **Neural CFR maturing:** ESCHER (ICLR 2023) and Deep (Predictive) Discounted CFR (AAAI 2026).
4. **Last-iterate and regularized methods:** MMD (ICLR 2023) and RM+ stabilization (NeurIPS 2023). These matter for neural or RL training, where averaging is awkward.
5. **Abstraction research revived:**
   - Learned action abstraction: RL-CFR, 2024.
   - Higher-resolution hand abstraction: FROI and KrwEmd, 2025.
6. **Search beyond common knowledge:** Obscuro (ICLR 2026).
7. **Benchmarks and evaluation:**
   - **GTO Wizard Benchmark** (Provost, Ilenic, Solinas & Beardsell, arXiv:2603.23660, Mar 2026) provides a public HUNL API against GTO Wizard AI, which beat Slumbot by 19.4 ± 4.1 bb/100. AIVAT is built in. All frontier LLMs tested, zero-shot, were far below baseline.
   - **AV-AIVAT** (Aug 2026) makes evaluation stoppable early with a valid guarantee.
8. **LLMs plus solvers:** solver-distilled rules such as Mixed-Strategy Decision Trees (2026), and LLM poker agents such as SpinGPT (arXiv:2509.22387). These are directly relevant to *explaining* solver output in a hand-review product.

---

## 9. References (all located; "(read)" = full text checked)

**Foundations and CFR**

- Zinkevich, Johanson, Bowling, Piccione. *Regret Minimization in Games with Incomplete Information.* NIPS 2007. https://proceedings.neurips.cc/paper/2007/hash/08d98638c6fcd194a4b1e6992063e944-Abstract.html (read)
- Lanctot, Waugh, Zinkevich, Bowling. *Monte Carlo Sampling for Regret Minimization in Extensive Games.* NIPS 2009. https://proceedings.neurips.cc/paper/2009/hash/00411460f7c92d2124a67ea0f4cb5f85-Abstract.html (read)
- Johanson, Bard, Lanctot, Gibson, Bowling. *Efficient Nash Equilibrium Approximation through Monte Carlo Counterfactual Regret Minimization.* AAMAS 2012. https://webdocs.cs.ualberta.ca/~bowling/papers/12aamas-pcs.pdf (read)
- Gibson, Burch, Lanctot, Szafron. *Efficient Monte Carlo CFR in Games with Many Player Actions.* NIPS 2012. https://proceedings.neurips.cc/paper/2012/hash/3df1d4b96d8976ff5986393e8767f5b2-Abstract.html
- Tammelin. *Solving Large Imperfect Information Games Using CFR+.* arXiv:1407.5042, 2014. https://arxiv.org/abs/1407.5042 (read)
- Bowling, Burch, Johanson, Tammelin. *Heads-up Limit Hold'em Poker is Solved.* Science 347(6218):145–149, 2015. CACM reprint: https://www.cs.ualberta.ca/~games/poker/publications/heads-up_limit_poker_is_solved.acm2017.pdf (read)
- Brown, Sandholm. *Regret-Based Pruning in Extensive-Form Games.* NIPS 2015. https://proceedings.neurips.cc/paper/2015/hash/c54e7837e0cd0ced286cb5995327d1ab-Abstract.html (read)
- Brown, Sandholm. *Strategy-Based Warm Starting for Regret Minimization in Games.* AAAI 2016. https://ojs.aaai.org/index.php/AAAI/article/view/10056
- Brown, Sandholm. *Solving Imperfect-Information Games via Discounted Regret Minimization.* AAAI 2019. https://arxiv.org/abs/1809.04040 (read)
- Farina, Kroer, Sandholm. *Faster Game Solving via Predictive Blackwell Approachability.* AAAI 2021. https://arxiv.org/abs/2007.14358 (read)
- Farina, Grand-Clément, Kroer, Lee, Luo. *Regret Matching+: (In)Stability and Fast Convergence in Games.* NeurIPS 2023. https://arxiv.org/abs/2305.14709
- Xu, Li, Fu, Fu, Xing, Cheng. *Dynamic Discounted Counterfactual Regret Minimization.* ICLR 2024. https://proceedings.iclr.cc/paper_files/paper/2024/hash/a89331e2ecbbd9d9618bc94717a91155-Abstract-Conference.html
- Xu, Li, et al. *Minimizing Weighted Counterfactual Regret with Optimistic Online Mirror Descent* (PDCFR+). IJCAI 2024. https://arxiv.org/abs/2404.13891 (read)
- Zhang, McAleer, Sandholm. *Faster Game Solving via Hyperparameter Schedules.* AAAI 2026. https://arxiv.org/abs/2404.09097 (read)
- Meng, Yang, Zhang, Ge, Gao. *Faster Game Solving via Asymmetry of Step Sizes* (APCFR+). arXiv:2503.12770, 2025. https://arxiv.org/abs/2503.12770
- Zhang, Anagnostides, Sandholm. *Scale-Invariant Regret Matching and Online Learning with Optimal Convergence.* arXiv:2510.04407, 2025. https://arxiv.org/abs/2510.04407
- Sokota et al. *A Unified Approach to RL, Quantal Response Equilibria, and Two-Player Zero-Sum Games* (MMD). ICLR 2023. https://arxiv.org/abs/2206.05825
- Brown, Lerer, Gross, Sandholm. *Deep Counterfactual Regret Minimization.* ICML 2019. https://arxiv.org/abs/1811.00164
- McAleer, Farina, Lanctot, Sandholm. *ESCHER.* ICLR 2023. https://www.mit.edu/~gfarina/2023/escher_iclr23
- Xu et al. *Deep (Predictive) Discounted Counterfactual Regret Minimization.* AAAI 2026. https://arxiv.org/abs/2511.08174

**Abstraction and translation**

- Gilpin, Sandholm. *Lossless Abstraction of Imperfect Information Games.* JACM 54(5), 2007.
- Johanson, Burch, Valenzano, Bowling. *Evaluating State-Space Abstractions in Extensive-Form Games.* AAMAS 2013. https://webdocs.cs.ualberta.ca/~bowling/papers/13aamas-abstraction.pdf (read)
- Ganzfried, Sandholm. *Potential-Aware Imperfect-Recall Abstraction with Earth Mover's Distance in Imperfect-Information Games.* AAAI 2014. https://ojs.aaai.org/index.php/AAAI/article/view/8816
- Ganzfried, Sandholm. *Action Translation in Extensive-Form Games with Large Action Spaces: Axioms, Paradoxes, and the Pseudo-Harmonic Mapping.* IJCAI 2013. https://www.ijcai.org/Abstract/13/028 ; formula restated in Ganzfried, arXiv:1510.08578 (read) https://arxiv.org/abs/1510.08578
- Ganzfried, Sandholm, Waugh. *Strategy Purification and Thresholding.* AAMAS 2012. https://ifaamas.csc.liv.ac.uk/Proceedings/aamas2012/papers/3E_4.pdf
- Waugh. *A Fast and Optimal Hand Isomorphism Algorithm.* AAAI-13 Workshop. https://cdn.aaai.org/ocs/ws/ws0977/7042-30528-1-PB.pdf (read); code: https://github.com/kdub0/hand-isomorphism
- Li, Fang, Huang. *RL-CFR: Improving Action Abstraction ...* arXiv:2403.04344, 2024. https://arxiv.org/abs/2403.04344
- Fu, Yin, Liu, Xu, Huang. *Beyond Outcome-Based Imperfect-Recall* (FROI). arXiv:2510.15094. https://arxiv.org/abs/2510.15094 ; *KrwEmd.* arXiv:2511.12089. https://arxiv.org/abs/2511.12089

**Evaluation**

- Johanson, Waugh, Bowling, Zinkevich. *Accelerating Best Response Calculation in Large Extensive Games.* IJCAI 2011. https://www.cs.ualberta.ca/~games/poker/publications/ijcai2011_accelerated_best_response.pdf (read)
- Lisý, Bowling. *Equilibrium Approximation Quality of Current No-Limit Poker Bots* (LBR). arXiv:1612.07547. https://arxiv.org/abs/1612.07547
- Burch, Schmid, Moravčík, Morrill, Bowling. *AIVAT.* AAAI 2018. https://ojs.aaai.org/index.php/AAAI/article/view/11481
- Li, Chen, Huang. *AV-AIVAT.* arXiv:2608.06362, 2026. https://arxiv.org/abs/2608.06362
- Provost, Ilenic, Solinas, Beardsell. *GTO Wizard Benchmark.* arXiv:2603.23660, 2026. https://arxiv.org/abs/2603.23660

**Subgame solving and agents**

- Burch, Johanson, Bowling. *Solving Imperfect Information Games Using Decomposition* (CFR-D). AAAI 2014. https://arxiv.org/abs/1303.4441
- Moravčík et al. *DeepStack: Expert-Level AI in Heads-Up No-Limit Poker.* Science 356, 2017. https://arxiv.org/abs/1701.01724 (read)
- Brown, Sandholm. *Safe and Nested Subgame Solving for Imperfect-Information Games.* NeurIPS 2017. https://arxiv.org/abs/1705.02955 (read)
- Brown, Sandholm. *Superhuman AI for heads-up no-limit poker: Libratus beats top professionals.* Science 359(6374), 2018. doi:10.1126/science.aao1733 ; preprint https://par.nsf.gov/biblio/10077416 (read)
- Brown, Sandholm, Amos. *Depth-Limited Solving for Imperfect-Information Games.* NeurIPS 2018. https://arxiv.org/abs/1805.08195 (read)
- Brown, Sandholm. *Superhuman AI for multiplayer poker.* Science 365(6456):885–890, 2019. doi:10.1126/science.aay2400 ; preprint https://par.nsf.gov/biblio/10119653 (read)
- Brown, Bakhtin, Lerer, Gong. *Combining Deep Reinforcement Learning and Search for Imperfect-Information Games* (ReBeL). NeurIPS 2020. https://arxiv.org/abs/2007.13544 (read)
- Schmid, Moravčík, Burch, et al. *Student of Games.* arXiv:2112.03178 (journal version reportedly Science Advances 2023; unverified). https://arxiv.org/abs/2112.03178 (read)
- Zhang, Sandholm. *General search techniques without common knowledge for imperfect-information games, and application to superhuman Fog of War chess* (Obscuro). ICLR 2026. https://arxiv.org/abs/2506.01242

**Learning from solvers**

- Ganzfried, Chiswick. *Most Important Fundamental Rule of Poker Strategy.* arXiv:1906.09895. https://arxiv.org/abs/1906.09895 (read)
- Ganzfried. *Computing Human-Understandable Strategies.* arXiv:1612.06340. https://arxiv.org/abs/1612.06340
- Bertsimas, Paskov. *World-Class Interpretable Poker.* Machine Learning 111:3063–3083, 2022. https://link.springer.com/article/10.1007/s10994-022-06179-8
- Wang et al. *Solver-Guided Reasoning for Mixed-Equilibrium Strategies.* arXiv:2608.06741, 2026. https://arxiv.org/abs/2608.06741
- (Industry) Brokos. *Do Multiple Sizes Matter?* GTO Wizard Blog, 2024. https://blog.gtowizard.com/do-multiple-sizes-matter/

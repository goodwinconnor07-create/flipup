# 03 — How open-source poker solvers work inside

This note covers the internals of the main open-source NLHE solvers. The goal is a fast, accurate heads-up postflop solver backend: Python + numpy first, with a possible C++/Rust core later. All code was cloned into `scratchpad/ext/<repo>`. I read it but did not build or run it.

| Repo | Commit | Language | Role |
|---|---|---|---|
| `b-inary/postflop-solver` | 9d1509f | Rust | Reference design: DCFR, 16-bit compression, suit isomorphism, bunching |
| `bupticybee/TexasSolver` | bb53f8c | C++ (Qt/OpenMP) | Older design with a different tree builder; has preflop-capable tree rules |
| `b-inary/wasm-postflop` | 97360db | Vue/TS + Rust/wasm | Frontend for postflop-solver; EV/equity/EQR reporting, default thresholds |
| `MatthewPDingle/GTOpen` | 368e599b | Rust (+CUDA) | Recent (2026). Postflop DCFR/CFR+/PCFR+ plus a multiway **preflop** solver over an equity-realization model |
| `noambrown/poker_solver` | 6a10442 | Python + C++ | River-subgame solver by the DCFR co-author. A clean reference for DCFR parameters and vectorized showdowns |

Shark 2.0 (`ext/shark-2.0`) was skipped as requested.

File paths below are relative to each repo root. Excerpts are trimmed or paraphrased; `…` marks omissions.

---

## 1. postflop-solver (b-inary, Rust)

### 1.1 Architecture in one paragraph

Building happens in two layers:

1. An **`ActionTree`** (`src/action_tree.rs`) contains only betting decisions. It does not distinguish chance outcomes: a chance node has exactly one child, `Action::Chance(0)`.
2. **`PostFlopGame`** (`src/game/base.rs`) expands that tree into a flat arena of `PostFlopNode`s. Every non-isomorphic turn/river card gets its own copy of the subtree.

Nodes are laid out by street: all flop nodes first, then turn, then river. Each node's children are contiguous, located through `children_offset` and `num_children`.

Per-node data lives in four global byte arenas, and each node keeps raw pointers into them:
- `storage1`: cumulative strategy.
- `storage2`: cumulative regrets. After `finalize` this is overwritten with per-action counterfactual values (cfvalues).
- `storage_ip`: IP cfvalues at street-root nodes.
- `storage_chance`: cfvalues at chance nodes.

Every array is shaped `[num_actions][num_hands]`, row-major by action (`src/game/mod.rs`, `src/game/node.rs`).

Hands are a fixed per-player list `private_cards[player]` of the combos with non-zero range weight that don't touch the starting board. Hands that conflict with a later turn/river card stay in the arrays; they are simply skipped at terminals via `valid_indices_{flop,turn,river}`.

### 1.2 Tree construction and the bet-size syntax

`src/bet_size.rs` parses comma-separated strings. Sizes are sorted after parsing.

| Token | Meaning | Notes |
|---|---|---|
| `70%` | Fraction of the pot | Bets: `pot*r`. Raises: `prev_amount + pot*r`, where `pot` is the pot *after calling* |
| `2.5x` | Multiple of the previous bet | Raises only; must be > 1.0 |
| `100c` | Constant chip amount | Must be an integer |
| `20c3r` | Constant raise with a raise cap of 3 | Raises only (FLHE). The only explicit raise cap in this solver |
| `e`, `2e`, `3e200%` | Geometric size over X streets, optionally capped at Y% of the pot | Bare `e` means 3 streets on the flop, 2 on the turn, 1 on the river. For raises, X is reduced by the number of prior bets |
| `a` | All-in | |

Geometric sizing (`push_actions`, `src/action_tree.rs`):

```rust
let spr_after_call = opponent_stack as f64 / pot as f64;
let compute_geometric = |num_streets: i32, max_ratio: f64| {
    let ratio = ((2.0 * spr_after_call + 1.0).powf(1.0 / num_streets as f64) - 1.0) / 2.0;
    (pot as f64 * ratio.min(max_ratio)).round() as i32
};
// for raises: num_streets = max(num_streets - num_bets + 1, 1)
```

`TreeConfig` carries the following fields (defaults are wasm-postflop's UI values from `src/store.ts`: 150%, 20%, 10%):
- `starting_pot`
- `effective_stack`
- `rake_rate`, `rake_cap`
- `{flop,turn,river}_bet_sizes: [BetSizeOptions; 2]` (OOP and IP each have bet and raise lists)
- `turn_donk_sizes` and `river_donk_sizes: Option<DonkSizeOptions>`
- `add_allin_threshold` (1.5)
- `force_allin_threshold` (0.15–0.20)
- `merging_threshold` (0.1)

The precise rules, all from `push_actions`:

- **Pot and limits.** `pot = starting_pot + 2*(node.amount + to_call)` is the pot after the actor calls. Also `max_amount = opponent_stack + prev_amount` and `min_amount = clamp(prev_amount + to_call, 1, max_amount)`. Note that the min-raise is `prev_amount + to_call`, i.e. raise-to ≥ 2× the previous bet when nothing was put in earlier on that street.
- **Donk bets.** The donk menu is used only when donk options are `Some`, the previous action was `Chance`, and `oop_call_flag` is set (OOP called on the previous street, so IP was the aggressor). Otherwise OOP leads with its normal bet sizes.
- **Add all-in.** An all-in is added when `max_amount <= round(pot * add_allin_threshold)`. For raises the test is `max_amount <= prev_amount + round(pot*thr)`.
- **Force all-in.** A size becomes all-in when the SPR left after the opponent's call is at or below the threshold:

  ```rust
  let is_above_threshold = |amount| {
      let new_pot = pot + 2 * (amount - prev_amount);
      max_amount <= amount + (new_pot as f64 * force_allin_threshold).round() as i32
  };
  ```

  Every bet/raise is first clamped to `[min_amount, max_amount]`, then converted to `AllIn(max_amount)` if this test holds.
- **No raises after an all-in.** `allin_flag` blocks raises once someone is all-in.
- **Raise caps.** There is no generic raise cap. Raising continues until the stack runs out, except for `XcYr`. Trees stay small only because force-all-in and the merge rule prune them.
- **Merging close sizes** (`merge_bet_actions`, "same as PioSOLVER"). Walk from the largest size down. Keep a size only if its pot ratio is below `(cur_ratio - t)/(1 + t)`, where `cur_ratio` belongs to the last kept size. Equivalently, drop Y when `(1+X)/(1+Y) < 1+t`. Ratios are measured relative to `prev_amount` and `pot`.
- **Dedupe.** Actions are sorted and deduplicated after clamping.
- **Next player.** A call on the river leads to a terminal; on earlier streets it leads to a chance node. OOP check → IP; IP check → chance or terminal. After an all-in and call, a chance node on the flop leads to another chance node (run out turn and river), and on the turn leads to a terminal.
- **Manual edits.** `add_line` and `remove_line` edit the action tree after building. wasm-postflop exposes these as "added/removed lines".

### 1.3 CFR variant: Discounted CFR with a non-standard averaging schedule

From `src/solver.rs`:

```rust
let nearest_lower_power_of_4 = match t { 0 => 0, x => 1 << ((x.leading_zeros() ^ 31) & !1) };
let t_alpha = (t as i32 - 1).max(0) as f64;
let t_gamma = (t - nearest_lower_power_of_4) as f64;
alpha_t = t_alpha.powf(1.5) / (t_alpha.powf(1.5) + 1.0);   // positive-regret multiplier
beta_t  = 0.5;                                             // negative-regret multiplier
gamma_t = (t_gamma / (t_gamma + 1.0)).powi(3);             // strategy-sum multiplier
```

- **Regrets.** This is DCFR with α=1.5 and β=0. Under β=0 the negative-regret multiplier is t⁰/(t⁰+1) = 0.5; noambrown's `DcfrParams{1.5, 0.0, 2.0}` computes exactly that.
- **Strategy average.** The averaging uses γ=3, and `gamma_t` returns to 0 at t = 0, 1, 4, 16, 64, 256, … So the **average strategy restarts at every power of 4**, which throws away early garbage. This is an undocumented tweak versus the paper's γ=2.
- **Update order.** Updates alternate: one traversal per player per iteration. The traverser's update is `R ← R·(R≥0 ? α_t : β_t) + (v_a − v)` and `S ← S·γ_t + σ`.
- **Own reach is not used.** `S` accumulates the current strategy σ **without own-reach weighting**: the recursion carries only the opponent's `cfreach`. GTOpen and noambrown both weight by own reach (`strat = strat*γ + reach_p*σ`).
- **Regret matching** is per hand: `max(R,0)/Σ`, falling back to uniform when Σ = 0.
- **Stopping.** Exploitability is checked every 10 iterations and at the end; the loop stops at the target. wasm-postflop's default target is 0.3% of the starting pot, with up to 1000 iterations.
- **Node locking.** Locked entries (a lock value ≥ 0) overwrite σ and zero out regret and strategy updates.

The core recursion (`solve_recursive`, paraphrased):

```rust
if terminal { evaluate(result, node, player, cfreach); return }
if num_actions == 1 && !chance { recurse into child; return }
if chance {
    cfreach' = cfreach / chance_factor          // 45 on flop->turn, 44 on turn->river
    for each child (parallel via rayon if river not dealt): cfv[a] = recurse(child, cfreach')
    result = Σ_a cfv[a]  (accumulated in f64)
    for each eliminated isomorphic card i: result += swap(cfv[ref_i], swap_list_i)
} else if node.player == player {
    for each child: cfv[a] = recurse(child, cfreach)
    σ = regret_matching(R); result = Σ_a σ[a]*cfv[a]
    update S and R as above
} else {
    σ = regret_matching(R_opp)
    for each child: cfv[a] = recurse(child, cfreach * σ[a]);  result = Σ_a cfv[a]
}
```

### 1.4 Storage and compression

The uncompressed mode uses f32 everywhere. With `allocate_memory(true)`, the solver instead stores:
- regrets as `i16` with one f32 scale per node: `scale = max|x|` and `q = round(x * 32767/scale)`;
- strategy sums as `u16`: `q = floor(x*65535/scale + 0.49999997)`;
- cfvalues as i16.

The decode step is fused into the update (`alpha_decoder = α_t * scale / i16::MAX`). This halves memory and is faster in practice because CFR is memory-bandwidth bound.

GTOpen does the same thing but adds **reproducible stochastic rounding**, seeded with `(iteration<<32)|node_idx`. Without it, small updates to large regrets round away to nothing.

Saving with a "storage mode" of Flop or Turn (`src/game/serialization.rs`) drops the deeper streets' arrays so files stay small.

### 1.5 Chance nodes and card removal

- **Normalization.** The chance factor is the number of cards left after removing the board and *both* players' hole cards: 45 on the turn, 44 on the river (minus bunching dead cards). For any compatible (hero, villain) pair, exactly 45 (or 44) turn (or river) cards are possible, so dividing the opponent reach by that constant and summing over *all* dealt cards gives the exact expectation.
- **No reach masking.** The solver never zeroes reach at chance nodes. Opponent hands that collide with the new card are dropped at the terminal through `valid_indices_*`, and the traverser's colliding hands get a cfv of 0 because the result buffer is zero-initialized.
- **Exact `num_combinations`.** At setup the solver computes `num_combinations = Σ_{compatible pairs} w_oop*w_ip` with an O(n²) double loop. Terminal payoffs are divided by it, so root EVs come out in chips per combo pair.

### 1.6 Showdown terminals in O(n) (`src/game/evaluation.rs`)

**Precomputation** (`CardConfig::hand_strength`, `src/card.rs`). For every possible (turn, river) pair (index `card_pair_to_index`, 1326 slots) and each player:
- build a `Vec<StrengthItem{strength:u16, index:u16}>` sorted ascending, skipping board-colliding hands;
- add sentinels: strength 0 at the front and `u16::MAX` at the back.

Strength is `Hand::evaluate()+1`. That value is the position of a 7-card rank code in a sorted `HAND_TABLE` (binary search; `src/hand.rs`, `src/hand_table.rs`), so it is a dense rank in u16.

**No-rake case: two passes.** Ties contribute 0 because payoffs are measured relative to half the pot.

```rust
let pot = (starting_pot + 2*node.amount) as f64;
let amount_win  = (0.5*pot - rake) / num_combinations;
let amount_lose = -0.5*pot / num_combinations;
// pass 1 (ascending): accumulate opponents strictly weaker than me
for &StrengthItem{strength, index} in valid_player_strength {
    while opp[i].strength < strength {
        let w = cfreach[opp[i].index]; sum += w;
        minus[c1(opp[i])] += w; minus[c2(opp[i])] += w; i += 1;
    }
    result[index] = amount_win * (sum - minus[c1(index)] - minus[c2(index)]);
}
// pass 2 (descending): accumulate opponents strictly stronger, add amount_lose * (...)
```

The card-removal fix is `sum − minus[c1] − minus[c2]`. An opponent combo containing both of hero's cards would be identical to hero's combo, and it is never in the strictly-weaker or strictly-stronger set because it has equal strength. So no same-hand add-back is needed here. Accumulation is done in f64.

**Raked case: three passes** (`amount_tie = -0.5*rake/num_combinations`). First compute the total of all valid opponent reach plus per-card totals. Then a single ascending sweep keeps two cursors (`i` for "<", `j` for "≤") and copies the win state into the tie state when strength increases:

```
value = win*W + tie*(cf_tie − cf_win + cf_same) + lose*(cf_total − cf_tie)
```

Here `cf_same = cfreach[same_hand_index[h]]`, the identical combo in the opponent's list. It is added back to the "≤" bucket because inclusion–exclusion removed it twice.

**Bunching** (`evaluate_internal_bunching`) falls back to O(n²) inner products against precomputed bunching arenas.

### 1.7 Fold terminals with card removal

Inclusion–exclusion per card:

```rust
for &i in valid_indices[opp] { let w = cfreach[i]; sum += w; minus[c1]+=w; minus[c2]+=w; }
for &i in valid_indices[me] {
    let same = same_hand_index[me][i];   // index of the identical combo in opponent's list, or u16::MAX
    let cf = sum + cfreach[same] - minus[c1] - minus[c2];
    result[i] = payoff * cf;             // payoff = amount_win if the opponent folded else amount_lose
}
```

The `+cfreach[same]` term matters: an identical combo is subtracted once for c1 and once for c2, so it must be added back once. Rake is applied to fold pots too (`amount_win = (pot/2 − rake)/N`).

### 1.8 Suit isomorphism (`CardConfig::isomorphism`, `src/card.rs`)

1. **Suit classes from ranges.** Two suits are interchangeable only if *both* ranges are invariant under swapping them (`Range::is_suit_isomorphic`, which checks all 1326 weights).
2. **Turn.** Suit `s1` maps to an earlier suit `s2` when the flop's rank sets in the two suits are equal (`flop_rankset[s1]==flop_rankset[s2]`) and the suits are in the same range class. Turn cards of suit `s1` are then not expanded. `isomorphism_ref_turn` records which child index to reuse, `isomorphism_card_turn` lists the eliminated cards, and `isomorphism_swap_turn[suit]` holds, per player, the list of hand-index pairs `(i, j)` to swap.
3. **River.** The same test is applied per turn card using `turn_rankset`. On a flop root this also requires the flop ranksets to match.
4. **Using it.** At chance nodes, for each eliminated card the solver swaps the reference child's cfv row in place, adds it to the total, and swaps back (§1.3). Child nodes for eliminated cards never exist, which saves both memory and time.

The README claims monotone flops skip two of the three non-board suits. GTOpen reports ~1.4× speed on two-tone flops, ~2.2× on monotone, and none on rainbow.

### 1.9 Exploitability and best response (`src/utility.rs`)

`compute_best_cfv_recursive` is the same traversal as CFR with three differences:
- the opponent plays the *normalized average* strategy;
- traverser nodes take an element-wise `max` over action cfvs (`max_slices_uninit`), or `max_fma` when locked;
- there are no updates.

```rust
mes_ev[p] = Σ_h br_cfv[p][h] * initial_weights[p][h]
exploitability = if !raked { (mes_ev[0] + mes_ev[1]) / 2 }
                 else { ((mes_ev[0]-cur_ev[0]) + (mes_ev[1]-cur_ev[1])) / 2 }
```

All values carry a bias of −starting_pot/2, so without rake the game is zero-sum and the BR sum is the exploitability. Callers express it as a fraction of the starting pot.

### 1.10 EV, equity, and EQR reporting (`src/game/interpreter.rs`, `wasm-postflop/rust/solver-src/lib.rs`)

- **`finalize`** runs one `compute_cfvalue_recursive(save_cfvalues=true)` pass with the average strategy. It stores per-action cfvalues at every action node (in `storage2`), cfvalues at chance nodes for the player who acts after the chance, and IP cfvalues at street roots.
- **Normalized weights.** `w_norm[h] = w[h] * (Σ_o w_o + w[same] − Σ_{o∋c1} w_o − Σ_{o∋c2} w_o)`, i.e. own weight times the compatible opponent mass. This is inclusion–exclusion again.
- **EV per hand.** `ev = cfv * (num_combinations * chance_factor) * (w_raw / w_norm) + starting_pot/2 + node.amount + max(own_bet − opp_bet, 0)`. EV is the expected chip *share of the pot*: folding has EV 0, and EV_oop + EV_ip = pot. Rows for fold actions are set to 0.
- **Equity.** `equity_internal` runs the same two-pass sweep with opponent weights (not reach), adding `+0.5·w` for "beats" and `−0.5·w` for "loses". It sums over all river boards (1/44 per river on the turn; 1/(45·44) per unordered (turn, river) pair on the flop) and returns `v·(w_raw/w_norm) + 0.5`.
- **EQR** (in wasm `get_results`): `pot = starting_pot + min(bets) + own_bet` and `eqr = ev / (pot * equity)`. A hand with equity < 5e-7 gets ±inf, shown as NaN. Range-level EQR is the weighted EV divided by `(eqrBase * weighted equity)`, not an average of per-hand EQRs (`ResultTable.vue`). `get_chance_reports` produces per-turn/river-card summaries (combos, equity, EV, EQR, strategy) by stepping into each card.

### 1.11 Parallelism and memory

- **Threads.** Rayon parallelizes `for_each_child` only where `river == NOT_DEALT` (`enable_parallelization`), so flop and turn nodes fan out and river subtrees run serially.
- **Allocation.** A custom stack allocator (`src/alloc.rs`, nightly feature `custom-alloc`) avoids malloc in the hot path.
- **Bunching** (`src/bunching.rs`) models dead cards from folded players using precomputed arenas. It is unique among these solvers and slow.

---

## 2. TexasSolver (bupticybee, C++)

### 2.1 Tree construction (`src/GameTree.cpp`, `src/tools/*`)

**Config.** Settings come from a command file (`resources/text/commandline_sample_input.txt`):

```
set_pot 50
set_effective_stack 200
set_bet_sizes oop,flop,bet,50
set_bet_sizes oop,flop,raise,60
set_bet_sizes oop,flop,allin
set_bet_sizes oop,river,donk,50
set_bet_sizes ip,river,raise,60,100
set_allin_threshold 0.67
set_accuracy 0.5
set_max_iteration 200
set_print_interval 10
set_use_isomorphism 1
```

Sizes are plain percentages per (player, street, bet|raise|donk), plus an `allin` flag. Hidden defaults in `include/tools/CommandLineTool.h`: `raise_limit=4`, `small_blind=0.5`, `big_blind=1`, `allin_threshold=0.67`. Note that player index 1 is OOP and 0 is IP.

**Sizing rules** (`get_possible_bets`):
- `pot = 2*max(commit)`, i.e. the pot after calling.
- Bets: `amount = round(ratio*pot)`. Raises add the to-call amount on top of that.
- Amounts are rounded to the big blind (or the small blind in preflop special cases).
- **All-in threshold.** If `amount + commit > initial_effective_stack * allin_threshold`, the size becomes all-in. This threshold is a fraction of the **initial effective stack**, unlike postflop-solver's SPR-based rule.
- Sizes larger than the stack are clamped to all-in.
- Raises must be ≥ 2× the gap; amounts are deduplicated.
- **Raise cap.** `raise_times >= raise_limit` stops further raises (default 4 per street).
- **Donk.** The donk list is used when OOP acts first after a chance node that followed an OOP call (the `ChanceNode::isDonk` flag).
- **No merging and no add-all-in-below-X.** The `allin` flag simply always adds a jam.

**Preflop.** The builder contains preflop logic: SB/BB first action, "BB check after limp" closing the round. It is preflop-capable in principle, but the GUI and solver target postflop.

**Payoffs are baked into the nodes.**
- Fold: `TerminalNode{payoffs = {±commit}}`.
- Showdown: `ShowdownNode{player_payoffs[winner] = {+opp_commit, −own_commit}, tie_payoffs}`.

**No rake support anywhere** (grep finds none).

### 2.2 CFR variant (`src/trainable/DiscountedCfrTrainable.cpp`)

The constants are `alpha=1.5`, `beta=0.5`, `gamma=2`, `theta=0.9`:

```cpp
alpha_coef = pow(t, 1.5); alpha_coef /= (1 + alpha_coef);
r_plus[i] = regret[i] + r_plus[i];                 // add first...
r_plus[i] *= (r_plus[i] > 0) ? alpha_coef : beta;  // ...then discount the *sum*
strategy_coef = pow(t/(t+1.0), gamma);
cum_r_plus[i] = cum_r_plus[i]*theta + current_strategy[i]*strategy_coef;
```

This departs from the paper in three ways:
- the discount multiplies the new instantaneous regret as well as the old sum;
- the average strategy decays by an extra θ=0.9 every iteration, so it is heavily recency-weighted;
- the average is not weighted by own reach.

There is also a `cfr_plus` trainer, which is unused. Half-float variants (`…HF`, `…SF`, using `half_float::half`) can be enabled for river nodes only.

**Storage.** One `Trainable` per (action node, *deal*). `deal` is an integer that encodes the chance history: `0` for none, `1..52` for the turn card, and `53 + 52*turn + river` for (turn, river). Trainables are created lazily (`ActionNode::getTrainable`). The tree itself is not expanded per card: chance nodes have one child, and card-specific state lives in the `trainables[deal]` vector.

**Warmup trick.** For `iter <= warmup`, the solver samples one suit per rank at chance nodes and weights it by the multiplier. At `iter == warmup` it copies the strategy into every suit-equivalent deal (`getAllAbstractionDeal` + `copyStrategy`).

### 2.3 Chance nodes and card removal (`PCfrSolver::chanceUtility`)

```cpp
int possible_deals = node->getCards().size() - board.size() - 2;   // 52-3-2 = 47 on turn, 46 on river
for each valid card (not on board, not iso-eliminated)   // OpenMP parallel for
    new_reach[o] = collides(card, o) ? 0 : reach[o] / possible_deals;
    results[card] = cfr(child, new_reach, board|card, new_deal);
for each card: if iso offset < 0, take results[card+offset] and exchange_color(...)
chance_utility = Σ results
```

**Normalization caveat.** The divisor is 47/46, not 45/44. For a compatible hero/villain pair only 45 (or 44) cards are possible, so post-chance values get scaled by 45/47 ≈ 0.957 per street relative to pre-chance fold payoffs. Unless something elsewhere compensates (I didn't find anything; `BestResponse.cpp` uses the same constant), this is a systematic bias. **Use 45/44 as postflop-solver does.**

**Isomorphism** (`findGameSpecificIsomorphisms`):
- `color_iso_offset[deal][suit]` is computed **from board suits only**: two suits are equivalent if they hold the same board ranks. The range-symmetry check is a `// TODO`.
- This is only correct if the input ranges are suit-symmetric. Symmetric preflop ranges usually are, but a hand-edited range can break it.
- `exchange_color` permutes a cfv vector's hands by swapping two suits.

### 2.4 Terminal values (`PCfrSolver::showdownUtility`, `terminalUtility`)

**Showdown.** `RiverRangeManager::getRiverCombos` sorts combos by rank and caches the result per board in a mutex-protected `unordered_map`. Rank comes from `Dic5Compairer`: a 2.6M-line dictionary of 5-card hands, taking the minimum over 7-card subsets. Lower rank means stronger. The sweep is the same two-pass prefix-sum-plus-52-card-correction scheme as postflop-solver:

```cpp
while (j < oppo.size() && me.rank < oppo[j].rank) { winsum += r; card_winsum[c1]+=r; card_winsum[c2]+=r; j++; }
payoffs[me.idx] = (winsum - card_winsum[me.c1] - card_winsum[me.c2]) * win_payoff;
// reverse pass for losses with lose_payoff
```

Ties contribute 0 because payoffs are net commits.

**Fold.** Inclusion–exclusion with `+reach[same_hand]` via `pcm.indPlayer2Player`.

### 2.5 Exploitability and outputs (`src/solver/BestResponse.cpp`)

- **Best response.** The traversal maxes over traverser actions against `getAverageStrategy()`. `getBestReponseEv` normalizes each hand by its compatible opponent weight and `relative_prob`, giving `total = (BR_0 + BR_1)/2 / initial_pot * 100` (percent of pot). It is checked every `print_interval` iterations; the loop stops at `accuracy`.
- **EV per hand.** After training, a final "collecting statics" pass sets `evs[a][h] = action_utility / rp_sum` with `rp_sum = oppo_sum − card_sum[c1] − card_sum[c2] + reach[same]`. That pass uses the **current** strategy, not the average, which is inconsistent with the dumped average strategy.
- **No equity or EQR.** JSON dumps contain only strategy and EVs, with suit-swapped keys reconstructed for iso-eliminated deals (`reConvertJson`).
- **Parallelism.** OpenMP over chance children.

---

## 3. wasm-postflop (frontend facts worth copying)

- **UI defaults** (`src/store.ts`):
  - `addAllInThreshold=150` (%)
  - `forceAllInThreshold=20` (%)
  - `mergingThreshold=10` (%)
  - `rakePercent=0`, `rakeCap=0`
  - `donkOption=false`
- **Limits.** `MAX_BET_SIZES = 30` per list. The bet-string sanitizer also accepts space-separated tokens.
- **Solve loop** (`RunSolver.vue`). Target = `startingPot * targetExploitability% / 100`, with a default of 0.3% and max 1000 iterations. It calls `solve_step(t)` once per iteration and computes exploitability every 10 iterations, then runs `finalize`.
- **Results payload** (`get_results`): pot per player, weights (anything below 0.0005 truncated to 0), normalized weights, equity, EV, EQR, strategy, and per-action EVs (`expected_values_detail`).
- **Aggregates.** Range-level aggregates are weighted by `normalized_weights` (combos × compatible opponent mass). That is the correct weight for "% of range" displays.

---

## 4. Preflop: what exists in open source

The search turned up nothing comparable to postflop-solver for preflop. There are many small push/fold or chart-viewer repos and several 2026 "trainer" repos that look low-quality or star-inflated. I treated these as untrusted and did not clone them.

The one substantive project is **GTOpen**. Its approach:

- **169-class abstraction** (`crates/solver/src/preflop/equity.rs`). A pairwise Monte-Carlo equity table `T[i][j]` (default 20k samples per pair, `PREFLOP_EQ_SAMPLES`) bakes in i-vs-j blockers but not joint card removal across more than two players. The table is cached on disk.
- **Tree config** (`PreflopConfig`, `preflop/mod.rs`):
  - `positions`, `posts` (blinds/straddle), `ante`, and `limp`;
  - `open_raises` as raise-to sizes in bb;
  - `raise_mults` (re-raise-to = `max(to_call*m, to_call+last_raise)`) and optional separate `fourbet_mults`, both overridable per seat;
  - `max_raises` (default 4, where the open counts as one);
  - `add_allin`, plus `allin_threshold` (default 0.85: a raise-to above 85% of the stack becomes a jam);
  - rake % and cap, and `no_flop_no_drop`.
- **Leaf values are a model, not a solved postflop game.** Heads-up leaves split one pot using a "Balanced" realization model: `a = e·w_h·0.92`, `b = (1−e)·w_j·1.08`, and `OOP share = a/(a+b)`. This blends back toward raw equity as SPR approaches 0. Rake is deducted once from the continuation pot. Multiway leaves (3+ players) use a "coupled-deck" table of 1,024 latent-strength samples. The doc is candid that this is an approximation (`docs/preflop_balanced_model.md`, `docs/technical_reference.md`).
- **Solver.** DCFR with α=1.5, γ=2, and the negative-regret multiplier 0.5 (`cfr.rs`, `Discounts::for_iteration`). The comment says "β=0", which is the same thing. Strategy sums are reach-weighted. There is CUDA support, and best-response gaps are computed per seat.
- **Postflop tree** (`crates/solver/src/tree.rs`):
  - sizes are `PotPct`, `PrevMult`, or `AllIn`;
  - `allin_threshold` is a fraction of the remaining "to" amount (default 0.85);
  - `max_raises` defaults to 10;
  - `add_allin` is available;
  - the donk menu applies only when IP was the last aggressor and that initiative has not been cleared by a check-through street (a 2026 fix);
  - rake is `min(pct*pot, cap)`.

**noambrown/poker_solver** is river-only. It contributes two useful pieces:
- clean DCFR code: `pos = t^α/(t^α+1)`, `neg = t^β/(t^β+1)`, `strat = (t/(t+1))^γ` with defaults (1.5, 0, 2), applied as a decay before adding;
- an alternative showdown evaluator (`cpp/src/vector_eval.cpp`): sorted prefix sums with `lower_bound`/`upper_bound` per hand, plus precomputed per-hand lists of *blocked opponent indices* split into less, equal, and greater. That is O(n·~100), simple, and easy to vectorize.

**Practical conclusion for preflop.** No open-source exact preflop solver exists. Everyone uses one of:
- (a) imported static ranges;
- (b) a 169-class preflop CFR over equity × realization leaves (GTOpen);
- (c) push/fold Nash for short stacks.

For our postflop backend, preflop should be an *input*: range strings in the Pio/postflop-solver syntax (`"QQ+,AKs,A5s-A2s:0.5"`). Option (b) can be added later as a separate module.

---

## 5. Cross-solver comparison

| Aspect | postflop-solver | TexasSolver | GTOpen (postflop) | noambrown |
|---|---|---|---|---|
| Regret discount (+/−) | `(t−1)^1.5/(…+1)` / 0.5, applied before adding | `t^1.5/(…+1)` / 0.5, applied after adding | `t^1.5/(…+1)` / 0.5 | `t^α/(…+1)` / `t^β/(…+1)` |
| Strategy weight | `((t−4^k)/(t−4^k+1))^3`; resets at powers of 4; no own reach | `(t/(t+1))^2` plus θ=0.9 decay; no own reach | `(t/(t+1))^2 × own reach` | `(t/(t+1))^2 × own reach` |
| Raise cap | Only `XcYr` | `raise_limit` (4) | `max_raises` (10) | `max_raises` |
| All-in conversion | SPR after call ≤ `force_allin_threshold` | commit > `thr × initial stack` | to ≥ `thr × max_to` | — |
| Add all-in | max bet ≤ `thr × pot` | Always, if `allin` set | `add_allin` flag | `include_all_in` |
| Size merging | Pio-style threshold | No | No | No |
| Chance divisor | 45 / 44 (exact) | 47 / 46 (biased) | exact | river only |
| Iso check | Board ranks + range symmetry | Board only | Board + ranges | — |
| Showdown | 2 passes (3 with rake) + per-card minus | 2 passes + per-card | Same | Prefix sums + blocked lists |
| Rake | `min(pot·r, cap)` at showdown and fold | None | `min(pct·pot, cap)` | — |
| Compression | i16/u16 + per-node scale | half floats (river) | i16/u16 + stochastic rounding | — |
| EV convention | Pot share (fold = 0) | Net cfv / compatible mass | Pot share | — |

---

## 6. Recommended design for our solver

### 6.1 Principles

1. **Copy postflop-solver's math exactly.** That covers terminal evaluation, chance normalization (45/44), inclusion–exclusion, the iso swap lists, the EV/equity/EQR formulas, and the rake formula. It is the most careful implementation and the de-facto reference; wasm-postflop's published comparisons match PioSOLVER/GTO+ closely.
2. **Do not port its per-node recursion to Python.** A single-raise-size flop tree has ~10⁵–10⁶ expanded nodes. Python dispatch at a few µs per numpy call times ~10 calls per node gives seconds to tens of seconds *per iteration*.
3. **Use the property postflop-solver's `ActionTree` already exploits: the betting tree is identical under every chance outcome.** So vectorize across runouts as well as hands. Each action-tree node then becomes a small number of numpy calls on tensors shaped `[R, A, H]`. Here R is the runout count at that street (1 on the flop; ≤49 turn cards on the turn, fewer after iso; ≤49·48 (turn, river) pairs on the river), A is actions, and H is hands. Python overhead becomes O(|action tree|) per iteration, roughly 10²–10⁴ nodes, while the arithmetic stays in BLAS/ufunc loops. This is the "level-synchronous" idea GTOpen uses for CUDA, applied to numpy.

### 6.2 Data model

- **Hands.** Per player, fixed lists of combos `(c1, c2)` with weight > 0 that don't collide with the root board (H ≤ 1326). Also keep:
  - `same_idx[p]`: index of the identical combo in the opponent's list, or −1;
  - `card_inc[p]`: a sparse/boolean `H×52` incidence matrix.
- **Runout axes.** Per street, an array of canonical runouts after suit-iso reduction. Each runout carries:
  - a validity mask `valid[R, H]` (hand doesn't collide with turn/river);
  - for each eliminated runout, a `(ref_runout, perm_p0, perm_p1)` triple, where `perm` is the hand permutation that swaps suits.

  Build iso classes exactly as postflop-solver does: a suit is equivalent only if both ranges are symmetric under the swap **and** the board ranksets match.
- **Action tree.** Built once with the postflop-solver rules (§1.2), as flat arrays in BFS order per street: `parent`, `first_child`, `num_children`, `player`, `kind` (action/chance/fold/showdown), `pot`, `amount`, `prev_bet`. Add a `max_raises` cap (TexasSolver/GTOpen style, default ∞) to postflop-solver's syntax, because it is the most effective tree-size control.
- **Per-node state.** One contiguous float32 array per street holding regrets and strategy sums, shaped `[R_street, A_node, H_player]` for each node. Use a per-street arena with offsets. Optional later: float16 or i16 + per-node-scale compression, with stochastic rounding as in GTOpen.

### 6.3 Bet-size syntax and tree rules

Accept the postflop-solver grammar verbatim:
- `N%`, `Nx` (raises only), `Nc`, `NcMr`;
- `e`, `Xe`, `XeY%`;
- `a`;
- per street, per player, separate bet and raise lists, plus optional OOP donk lists for turn and river.

Implement these rules exactly:
- **Geometric:** `ratio = ((2·spr_after_call+1)^(1/n) − 1)/2`, capped at Y.
- **Min raise:** `min_amount = prev_amount + to_call`; clamp to `[min, max]`.
- **Force all-in:** convert to all-in when `max_amount ≤ amount + round(new_pot·force_allin_threshold)`, with a default of 0.15.
- **Add all-in:** add a jam when `max_amount ≤ prev_amount + round(pot·add_allin_threshold)`, with a default of 1.5.
- **Merge:** use the Pio-style rule with `t = 0.1`, keeping a size iff `ratio < (cur_ratio − t)/(1 + t)`.
- **Dedupe**, then add our own `max_raises`.
- Use integer chips internally to avoid float dedupe issues; postflop-solver uses i32 too.

### 6.4 Algorithm

**DCFR with alternating updates and a pluggable schedule.** Default to postflop-solver's schedule because it is proven on exactly this problem:
- `α_t = (t−1)^1.5/((t−1)^1.5+1)`
- negative multiplier 0.5
- `γ_t = ((t−4^k)/(t−4^k+1))^3`, with strategy-sum resets at powers of 4

Keep a "paper" schedule (1.5, 0, 2) available for testing.

**Weight strategy sums by own reach** (`S = S·γ + π_own·σ`), as GTOpen and noambrown do. This needs both reach vectors in the traversal, which is cheap. Validate it against the unweighted variant on a fixed spot. Optionally add PCFR+ later; GTOpen implements it in about 40 lines.

**Vectorized traversal for a street.** Process the street's subtree in reverse topological order. A forward pass pushes reach down; a backward pass pulls cfvs up:

```python
# forward: reach_opp[node] has shape [R, H_opp]
sigma = regret_match(R[node])                        # [R, A, H], np.maximum + sum + divide (uniform where 0)
child_reach = reach[node][:, None, :] * sigma        # only at opponent nodes
# backward: cfv[node] has shape [R, H_trav]
v_a = stack(cfv[child] for child)                    # [R, A, H]
v = (sigma * v_a).sum(1)                             # traverser node
R[node] = R[node] * np.where(R[node] > 0, a_t, b_t) + (v_a - v[:, None, :])
S[node] = S[node] * g_t + own_reach[:, None, :] * sigma
```

**Chance transition** from street k to street k+1:
- *Down:* `reach_next = reach[parent_runout_index] / 45` (or 44) — just a gather along R.
- *Up:* `cfv_parent = segment_sum(cfv_child, parent_index)`, implemented with `np.add.reduceat` or `np.add.at`. Eliminated iso runouts are added as `cfv[ref][:, perm]` with a fancy-index gather.
- *Masking:* multiply by the validity masks so colliding hands contribute 0, exactly as postflop-solver gets from `valid_indices`.

**Memory batching.** For flop roots, process the river street in chunks of turn cards (for example 4–8 turns × 48 rivers at a time) to cap temporary tensors.

### 6.5 Terminal evaluation in numpy

**Fold** (batched over R and over all fold terminals of a street):

```python
card_sum = W_opp @ card_inc_opp                      # [R, 52]  (W_opp = masked reach, [R, H_opp])
total    = W_opp.sum(-1, keepdims=True)
same     = np.where(same_idx >= 0, W_opp[:, same_idx], 0)
cfv = payoff * (total - card_sum[:, c1] - card_sum[:, c2] + same) * valid_me
```

**Showdown.** Exact, O(52·H) per runout, no Python loops. Precompute once per river board: opponent sort order `ord`, sorted strengths, and for each traverser hand `lo = searchsorted(s_sorted, s_h, 'left')` and `hi = searchsorted(…, 'right')`. Then:

```python
w   = W_opp[:, ord]                                       # [R, H_opp] sorted
P   = np.concatenate([zeros, w.cumsum(-1)], -1)            # [R, H+1]
PC  = np.concatenate([zeros, (w[..., None] * inc_sorted).cumsum(-2)], -2)   # [R, H+1, 52]
win  = P[:, lo] - PC[:, lo, c1] - PC[:, lo, c2]            # strictly weaker, card-removed
lose = (P[:, -1:] - P[:, hi]) - (PC[:, -1, c1] - PC[:, hi, c1]) - (PC[:, -1, c2] - PC[:, hi, c2])
total = P[:, -1] - PC[:, -1, c1] - PC[:, -1, c2] + same
tie  = total - win - lose
cfv  = (win*W + tie*T + lose*L) * valid_me                 # W=(pot/2-rake)/N, L=-pot/2/N, T=-rake/2/N
```

The `PC` tensor is `R×(H+1)×52` float32, about 270 KB per runout. Chunk R to stay within a few hundred MB.

**River-only (and turn) solves: dense BLAS alternative.** Precompute the signed compatibility matrix `M[h, o] ∈ {W, T, L, 0}` per board and per pot size, and compute `cfv = W_opp @ M.T` with a GEMM over all showdown terminals at once. At H ≈ 1000 that is 1M multiply-adds, which numpy's BLAS beats any Python-orchestrated O(n) scheme on small batches. Use it when `n_boards × H² × 1 byte` fits; store the matrix as int8 win/tie/lose plus a compat mask and scale by pot afterwards.

Compute hand strengths once per board with a fast 7-card evaluator. Write our own lookup-table evaluator, or port postflop-solver's `Hand::evaluate` + `HAND_TABLE` rank compression to u16. Cache them as `[n_boards, H]` uint16 per player.

### 6.6 Exploitability, EV, equity, EQR

- **Best response.** Same vectorized sweep: the opponent plays the average strategy (S normalized), and traverser nodes use `np.max` over A. `expl = (BR0 + BR1)/2`, or subtract the current EVs when raked. Report it as % of the starting pot. Check every 10 iterations (25 for big trees); target 0.3%.
- **Finalize.** One cfv pass with the average strategy. Store per-action cfvs at decision nodes, plus chance-node cfvs for browsing.
- **Reporting.** Follow wasm-postflop exactly:
  - `w_norm = w·(Σw_opp + w_same − Σ_{∋c1} − Σ_{∋c2})`
  - `EV = cfv·N·chance_factor·(w/w_norm) + pot0/2 + amount + max(own−opp, 0)` (pot-share convention, fold = 0)
  - equity via the same sorted sweep with weights, averaged over runouts
  - `EQR = EV/(pot·equity)` with `pot = pot0 + min(bets) + own_bet`
  - aggregate over ranges with `w_norm` weights

### 6.7 Rake

Use `rake = min(pot·rate, cap)` on the final pot, applied to showdowns (win `pot/2 − rake`, tie `−rake/2`) and to fold wins, as postflop-solver does. Postflop pots always "see a flop", so no-flop-no-drop is irrelevant here. When rake > 0, exploitability must subtract current EVs.

### 6.8 Validation plan

1. Kuhn/Leduc and a toy clairvoyance river game with closed-form answers (postflop-solver `tests/`, GTOpen accuracy tests).
2. A river spot: compare against the dense O(n²) brute force for fold and showdown cfvs on random reach vectors, including identical combos in both ranges and rake > 0.
3. Iso on vs off on monotone and two-tone flops: strategies must match to float tolerance.
4. Compare root EVs and strategies with postflop-solver on identical configs. It can serve as an external oracle if we're later allowed to build it.

### 6.9 Path to a native core

Keep the numpy layer as orchestration: tree build, iso tables, reporting. Isolate three kernels behind one interface:
- `regret_match_update(R, S, v_a, sigma, reach, coefs)`
- `fold_eval` / `showdown_eval(W_opp, board_idx)`
- `chance_up/down`

These are exactly what a Rust (PyO3) or C++ (pybind11) core would replace. They map 1:1 onto postflop-solver's `solve_recursive`/`evaluate_internal`, so porting is mechanical, and rayon/OpenMP parallelism over runouts drops in naturally.

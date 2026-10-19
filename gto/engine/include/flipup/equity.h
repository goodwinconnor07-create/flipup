// Equity calculations: exact enumeration postflop, seeded Monte Carlo preflop.
#pragma once

#include <array>
#include <cstdint>
#include <vector>

#include "flipup/cards.h"

namespace flipup {

constexpr int NUM_CLASSES = 169;

// Hand class index in the 13x13 grid (row-major, AA = 0, AKs = 1, ..., 22 = 168).
// Suited hands sit above the diagonal, offsuit below.
int combo_class(int combo);

struct EquityResult {
  double win = 0, tie = 0, lose = 0;  // probabilities
  double equity() const { return win + tie / 2; }
};

// Hand vs weighted range on a board (0, 3, 4 or 5 cards). Exact when the board
// has 3+ cards; otherwise Monte Carlo with `samples` boards per call (seeded).
EquityResult equity_vs_range(int combo, const std::vector<float>& range, const std::vector<int>& board,
                             int samples = 20000, uint64_t seed = 1);

// Per-combo equity of every combo in `hero` vs `villain` (both 1326 weights).
// Returns 1326 values (0 where hero weight is 0 or blocked by the board).
std::vector<float> range_equities(const std::vector<float>& hero, const std::vector<float>& villain,
                                  const std::vector<int>& board, int samples = 20000, uint64_t seed = 1);

// Exact preflop all-in equity of two specific combos (enumerates all 1,712,304 boards).
EquityResult preflop_equity_exact(int combo_a, int combo_b);

// 169x169 matrix: equity of class i vs class j averaged over compatible combo
// pairs, plus the number of compatible combo pairs. Monte Carlo per combo pair.
struct ClassMatrix {
  std::vector<float> equity;  // [i * 169 + j]
  std::vector<float> pairs;   // compatible combo pairs
};
ClassMatrix preflop_class_matrix(int samples_per_class_pair, uint64_t seed = 7);

// Multiway (3-way) preflop all-in equity tensor by class: share of the pot for
// the first class, averaged over compatible combo triples. [i][j][k] layout.
std::vector<float> preflop_class_tensor3(int samples_per_triple, uint64_t seed = 11);

}  // namespace flipup

// Solver checks: closed-form river toy game + exploitability convergence on real spots.
#include <chrono>
#include <cmath>
#include <cstdio>
#include "flipup/solver.h"
#include "flipup/eval.h"
using namespace flipup;

static std::vector<float> range_of(const std::vector<std::pair<int,int>>& pairs_of_ranks, CardMask board) {
  std::vector<float> w(NUM_COMBOS, 0.0f);
  for (auto [r1, r2] : pairs_of_ranks)
    for (int s1 = 0; s1 < 4; ++s1) for (int s2 = 0; s2 < 4; ++s2) {
      int a = make_card(r1, s1), b = make_card(r2, s2);
      if (a == b || (card_bit(a) | card_bit(b)) & board) continue;
      w[combo_index(a, b)] = 1.0f;
    }
  return w;
}

int fails = 0;
#define CHECK(cond, ...) do { if (!(cond)) { printf("FAIL: " __VA_ARGS__); printf("\n"); fails++; } } while (0)

void clairvoyance_game() {
  TreeConfig cfg;
  cfg.board = parse_cards("Kh Qh 7c 4d 2s");
  CardMask b = cards_mask(cfg.board);
  cfg.starting_pot = 1.0; cfg.effective_stack = 1.0; cfg.min_bet = 0.01;
  cfg.add_allin_threshold = 0.0;
  cfg.sizes[0][2].bet = {{BetSize::POT_FRACTION, 1.0}};
  cfg.range[0] = range_of({{11, 11}, {4, 3}}, b);  // KK (nuts) + 65 (air)
  cfg.range[1] = range_of({{1, 1}}, b);            // 33 (bluff catcher)
  Solver s(cfg);
  auto st = s.solve(3000, 0.001, 100);
  auto ev = s.root_ev();
  printf("clairvoyance: iters=%d expl=%.5f%% ev0=%.5f (exp %.5f) ev1=%.5f\n", st.iteration, st.exploitability_pct, ev[0], 4.5/19, ev[1]);
  CHECK(std::fabs(ev[0] - 4.5 / 19) < 1e-3, "clairvoyance EV");
  NodeInfo root = s.query({});
  // root actions: check, bet(all-in)
  double bluff = 0, bluff_w = 0, value = 0, value_w = 0;
  for (size_t h = 0; h < root.combos[0].size(); ++h) {
    int r = card_rank(combo_card(root.combos[0][h], 0));
    double bet = root.strategy[1 * root.combos[0].size() + h];
    if (r == 11) { value += bet; value_w += 1; } else { bluff += bet; bluff_w += 1; }
  }
  printf("  value bet freq %.4f (exp 1), bluff freq %.4f (exp %.4f)\n", value / value_w, bluff / bluff_w, 1.5 / 16);
  CHECK(std::fabs(value / value_w - 1) < 0.01, "value betting");
  CHECK(std::fabs(bluff / bluff_w - 1.5 / 16) < 0.01, "bluff frequency");
  NodeInfo facing = s.query({"1"});
  double call = 0; size_t n1 = facing.combos[1].size();
  for (size_t h = 0; h < n1; ++h) call += facing.strategy[1 * n1 + h];
  printf("  call freq %.4f (exp 0.5)\n", call / n1);
  CHECK(std::fabs(call / n1 - 0.5) < 0.02, "call frequency (MDF)");
}

void convergence(const char* name, const char* board, double pot, double stack, int iters) {
  TreeConfig cfg;
  cfg.board = parse_cards(board);
  cfg.starting_pot = pot; cfg.effective_stack = stack;
  for (int p = 0; p < 2; ++p) {
    cfg.sizes[p][0].bet = {{BetSize::POT_FRACTION, 0.33}, {BetSize::POT_FRACTION, 0.75}};
    cfg.sizes[p][0].raise = {{BetSize::POT_FRACTION, 0.6}};
    cfg.sizes[p][1].bet = {{BetSize::POT_FRACTION, 0.5}, {BetSize::POT_FRACTION, 1.0}};
    cfg.sizes[p][1].raise = {{BetSize::POT_FRACTION, 0.6}};
    cfg.sizes[p][2].bet = {{BetSize::POT_FRACTION, 0.5}, {BetSize::POT_FRACTION, 1.0}};
    cfg.sizes[p][2].raise = {{BetSize::POT_FRACTION, 0.6}};
  }
  cfg.max_raises = 2;
  // Wide-ish symmetric ranges: every combo at weight 1 for OOP, 0.6 for IP
  cfg.range[0].assign(NUM_COMBOS, 1.0f);
  cfg.range[1].assign(NUM_COMBOS, 0.6f);
  auto t0 = std::chrono::steady_clock::now();
  Solver s(cfg);
  double build = std::chrono::duration<double>(std::chrono::steady_clock::now() - t0).count();
  printf("%s: nodes=%zu action=%zu mem=%.1fMB build=%.2fs\n", name, s.num_nodes(), s.num_action_nodes(), s.memory_bytes() / 1e6, build);
  auto st = s.solve(iters, 0.3, 25, [](const SolveStatus& x) { printf("   it=%d expl=%.3f%% t=%.1fs\n", x.iteration, x.exploitability_pct, x.seconds); fflush(stdout); return true; });
  CHECK(st.exploitability_pct < 1.0, "%s did not converge (%.3f%%)", name, st.exploitability_pct);
}

int main() {
  clairvoyance_game();
  convergence("river", "Ks 9d 5c 2h Qh", 10, 45, 500);
  convergence("turn", "Ks 9d 5c 2h", 10, 45, 300);
  printf(fails ? "FAILURES: %d\n" : "ALL PASS\n", fails);
  return fails != 0;
}

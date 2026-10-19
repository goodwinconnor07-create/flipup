// N-player (2-9) No-Limit Hold'em preflop solver.
//
// Hands are the 169 classes. Strategies are found with Discounted CFR
// (simultaneous updates) over an abstract preflop betting tree. Pots that see
// a flop are valued with an equity-realization model instead of being played
// out (the standard approach of preflop solvers):
//   heads-up: IP share s = e*Rip / (e*Rip + (1-e)*Roop), e = all-in equity,
//             R depends on the stack-to-pot ratio bucket and optionally the class;
//   3-way:    3-way equity share (tensor) scaled by a positional factor.
// All-in pots are valued at exact equity. Card removal between the hero and
// each opponent is exact at the class level; between two opponents it is ignored.
//
// Player index = preflop action order: 0 acts first, ..., N-2 = SB, N-1 = BB
// (heads-up: 0 = BTN/SB, 1 = BB).
#pragma once

#include <array>
#include <atomic>
#include <functional>
#include <string>
#include <vector>

namespace flipup {

constexpr int PF_CLASSES = 169;

// An action the tree must take at a given point (used to replay a real hand's
// preflop line exactly, including lines GTO never takes, like open limps).
struct PreflopForced {
  int player;
  int type;   // PreflopAction::Type
  double to;  // street bet after the action (bb), for calls/raises
};

struct PreflopConfig {
  int num_players = 6;
  std::vector<double> stacks;  // starting stack per player (bb), before blinds/antes
  double sb = 0.5, bb = 1.0, ante = 0.0;
  double rake_rate = 0.0, rake_cap = 0.0;  // taken only from pots that see a flop

  // Action abstraction.
  std::vector<double> open_size;    // raise-to (bb) per player when first in
  std::vector<int> can_limp;        // 1 if the player may open-limp (SB completing counts)
  double iso_per_limper = 1.0;      // + this many bb per limper when raising over limps
  double bb_raise_vs_limp = 3.5;    // BB's raise-to when the pot is limped (x bb)
  double threebet_ip = 3.0;         // raise-to as a multiple of the open, in position
  double threebet_oop = 4.0;        // ... out of position (blinds)
  double squeeze_per_caller = 1.0;  // + this many opens per cold caller
  double fourbet_ip = 2.2;          // raise-to as a multiple of the 3-bet
  double fourbet_oop = 2.4;
  double allin_threshold = 0.45;    // a raise committing >= this share of the stack becomes all-in
  double allin_option_stack = 30.0; // offer an all-in option at every raise when stack <= this (bb)
  int max_raises = 4;               // open = 1, 3-bet = 2, 4-bet = 3, 5-bet = 4
  int max_players_flop = 3;
  bool allow_cold_call = true;
  bool multiway_blinds_only = true; // the third player into a 3-way pot must be a blind

  // Equity realization (heads-up flops) per SPR bucket: [<1.5, 1.5-4, 4-8, 8+].
  std::array<double, 4> eqr_ip = {1.0, 1.0, 1.04, 1.07};
  std::array<double, 4> eqr_oop = {1.0, 0.95, 0.88, 0.83};
  // eqr_model 0: multiplicative (class_eqr_* are multipliers on eqr_ip/eqr_oop, default 1).
  // eqr_model 1: additive (class_eqr_* are share adjustments, default 0; eqr_ip/oop unused).
  int eqr_model = 0;
  std::vector<float> class_eqr_ip;
  std::vector<float> class_eqr_oop;
  std::array<double, 3> multiway_role = {0.9, 0.98, 1.12};  // 3-way: OOP-most, middle, IP-most

  // Starting ranges (169 weights) per player, default all 1. Used for custom
  // spots (e.g. a limper's range in hand review).
  std::vector<std::vector<float>> initial_range;
  // The first forced.size() decisions are fixed to these actions.
  std::vector<PreflopForced> forced;

  // Tables: class equity matrix and compatible-pair counts (169x169).
  std::vector<float> equity;
  std::vector<float> pairs;
  // 3-way equity tensor T[h][o1][o2] as a per-h low-rank factorization:
  // T[h] ~= sum_r A[h][r][:] outer B[h][r][:]. Empty = no 3-way pots.
  int tensor_rank = 0;
  std::vector<float> tensor_a;  // [h][r][o1]
  std::vector<float> tensor_b;  // [h][r][o2]
};

struct PreflopAction {
  enum Type : int { FOLD, CHECK, CALL, RAISE, ALLIN };
  Type type;
  double to;     // street bet after the action (bb)
  double added;  // chips added
};

struct PreflopNodeInfo {
  bool terminal = false;
  std::string terminal_kind;   // "fold", "flop", "allin"
  int player = -1;
  double pot = 0;
  std::vector<double> invested;
  std::vector<int> folded;
  std::vector<PreflopAction> actions;
  std::vector<float> strategy;   // [action][169]
  std::vector<float> action_ev;  // [action][169], bb, relative to the start of the hand
  std::vector<std::vector<float>> reach;  // per player [169]
  std::vector<float> ev;         // actor (or all players at terminals: [player][169]) EV
};

class PreflopSolver {
 public:
  explicit PreflopSolver(const PreflopConfig& cfg);

  size_t num_nodes() const { return nodes_.size(); }
  size_t num_action_nodes() const { return num_action_nodes_; }
  int iterations_done() const { return iteration_; }

  void iterate(int n);
  // Sum over players of (best-response value - current value), bb. 0 at equilibrium.
  double nash_conv(std::vector<double>* per_player = nullptr);
  std::vector<double> player_ev();  // EV of each player's average strategy (bb)
  int solve(int max_iterations, double target_bb, int check_every,
            const std::function<bool(int, double)>& callback = nullptr);

  PreflopNodeInfo query(const std::vector<int>& path);

  // Average-strategy state, for caching solved spots on disk.
  const std::vector<float>& cumulative_strategy() const { return cum_; }
  void load_cumulative_strategy(const std::vector<float>& cum, int iterations);
  void request_stop() { stop_ = true; }

 private:
  struct State;
  struct Node {
    int type;  // 0 action, 1 fold terminal, 2 flop, 3 allin
    int player;
    int child_begin = 0, num_children = 0;
    long storage = -1;
    double pot = 0;
    std::array<double, 9> inv{};  // effective investments (uncalled chips returned at terminals)
    uint16_t folded = 0;
    int spr_bucket = 0;
    std::array<int8_t, 3> roles{};  // 3-way: players ordered OOP-most .. IP-most
  };

  int build(const State& s);
  int make_terminal(const State& s);
  using Vecs = std::vector<std::vector<float>>;
  // reach[k]: player k's reach per class; m[k] = Pn @ reach[k] (probability k
  // reaches given the hero's class, card-removal aware).
  void walk(int node, Vecs& reach, Vecs& m, Vecs& cfv, const std::array<float, 3>& d, int depth);
  void eval(int node, Vecs& reach, Vecs& m, std::vector<float>& out, int br_player, int target);
  void terminal_values(const Node& n, const Vecs& reach, const Vecs& m, Vecs& cfv, int only = -1) const;
  Vecs reach_mass(const Vecs& reach) const;
  void strategy_of(const Node& n, std::vector<float>& out, bool average) const;
  void matvec(const std::vector<float>& M, const std::vector<float>& x, float* out) const;
  int postflop_rank(int player) const;

  PreflopConfig cfg_;
  int N_;
  std::vector<Node> nodes_;
  std::vector<int> children_;
  std::vector<PreflopAction> actions_;
  size_t num_action_nodes_ = 0;
  std::vector<float> regret_, cum_;
  int iteration_ = 0;
  std::atomic<bool> stop_{false};

  // Precomputed 169x169 matrices.
  std::vector<float> Pn_;                 // compatible-combo probability weight
  std::vector<float> Weq_;                // Pn * equity
  std::array<std::vector<float>, 4> Wip_, Woop_;  // Pn * realized share, per SPR bucket
  std::vector<float> class_combos_;       // combos per class (4, 6 or 12)
  std::vector<float> TA_, TB_;            // 3-way factors pre-multiplied by Pn: [h][r][o]
};

std::vector<std::string> position_names(int num_players);

}  // namespace flipup

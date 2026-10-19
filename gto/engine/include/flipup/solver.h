// Heads-up No-Limit Hold'em postflop solver (Discounted CFR, vector form).
//
// Players: 0 = OOP (acts first postflop), 1 = IP.
// Chips are arbitrary units (the Python layer uses big blinds).
//
// Payoff convention: a player's payoff is the chips they collect from the pot
// at the end of the hand minus the chips they put in after the root, so the
// pot at the root is "up for grabs" and the game is constant-sum (sum =
// starting pot, less rake). EVs reported by queries are node-relative: the
// chips a hand expects to collect from here on minus what it still has to put
// in, so folding is always worth exactly 0.
#pragma once

#include <array>
#include <atomic>
#include <cstdint>
#include <functional>
#include <string>
#include <unordered_map>
#include <vector>

#include "flipup/cards.h"

namespace flipup {

struct BetSize {
  enum Kind : int {
    POT_FRACTION = 0,   // bet: fraction of pot; raise: fraction of pot after calling
    PREV_BET_MULT = 1,  // raise to `value` times the opponent's current street wager
    ALL_IN = 2,
    GEOMETRIC = 3,      // equal pot-fraction bets that get stacks in over `value` streets (0 = remaining)
  };
  Kind kind = POT_FRACTION;
  double value = 0.0;
};

struct StreetSizes {
  std::vector<BetSize> bet;    // opening bet on the street
  std::vector<BetSize> raise;  // raises
  std::vector<BetSize> donk;   // OOP leading into the previous street's aggressor (turn/river only)
};

struct TreeConfig {
  std::vector<int> board;          // 3, 4 or 5 cards
  double starting_pot = 0;         // chips in the pot at the root
  double effective_stack = 0;      // chips behind for each player at the root
  StreetSizes sizes[2][3];         // [player][street: 0 flop, 1 turn, 2 river]
  int max_raises = 3;              // raises allowed after the opening bet on each street
  double min_bet = 1.0;            // minimum bet / raise increment (1 big blind)
  double add_allin_threshold = 1.5;    // offer all-in when all-in <= threshold * pot
  double force_allin_threshold = 0.15; // bet becomes all-in if remaining stack <= threshold * pot after a call
  double merge_threshold = 0.1;        // drop bet sizes within threshold * pot of a larger kept size
  double rake_rate = 0.0;
  double rake_cap = 0.0;           // 0 = uncapped
  bool compress = false;           // half-float regrets and strategy sums, scaled per node (half the memory)
  std::array<std::vector<float>, 2> range;  // 1326 weights per player (0 = not in range)
};

enum class NodeType : uint8_t { ACTION, CHANCE, FOLD, SHOWDOWN, ALLIN };

struct Action {
  enum Type : uint8_t { FOLD, CHECK, CALL, BET, RAISE };
  Type type;
  double amount;  // street wager after the action ("bet to" / "raise to"); 0 for fold/check
  double added;   // chips moved into the pot by this action
  bool all_in;
};

struct Node {
  NodeType type;
  int8_t player;     // actor (ACTION) or folder (FOLD); -1 otherwise
  int8_t street;     // 0 flop, 1 turn, 2 river
  double pot;        // total pot including all wagers so far
  double contrib[2]; // chips each player put in since the root
  double stack[2];
  CardMask board;
  int32_t child_begin = 0;
  int32_t num_children = 0;
  int64_t storage = -1;  // offset into regret / strategy arrays (ACTION only)
  int32_t slot = -1;     // action-node ordinal (per-node scales when compressed)
  int32_t iso_begin = 0; // CHANCE: isomorphic (skipped) cards
  int32_t num_iso = 0;
};

struct IsoEntry {
  int8_t card;        // skipped card
  int32_t rep_child;  // child index (relative to child_begin) of its representative
  int8_t swap_id;     // which suit swap maps the skipped card to the representative
};

struct SolveStatus {
  int iteration = 0;
  double exploitability = -1;  // chips
  double exploitability_pct = -1;  // % of starting pot
  double seconds = 0;
};

struct NodeInfo {
  NodeType type;
  int player;
  int street;
  double pot;
  double contrib[2];
  double stack[2];
  std::vector<int> board;
  std::vector<Action> actions;            // ACTION nodes
  std::vector<int> deal_cards;            // CHANCE nodes: cards that can come
  std::array<std::vector<int>, 2> combos; // combo index per hand (each player's hand list)
  std::array<std::vector<float>, 2> reach;   // range weight reaching this node per hand
  std::array<std::vector<float>, 2> weight;  // reach x compatible opponent mass (for averaging)
  std::array<std::vector<float>, 2> ev;      // node-relative EV per hand (chips)
  std::array<std::vector<float>, 2> equity;  // showdown equity vs opponent's range here
  std::vector<float> strategy;            // [action][hand] for the actor
  std::vector<float> action_ev;           // [action][hand] for the actor
};

class Solver {
 public:
  explicit Solver(const TreeConfig& config);

  // Tree statistics.
  size_t num_nodes() const { return nodes_.size(); }
  size_t num_action_nodes() const { return num_action_nodes_; }
  size_t memory_bytes() const;
  int num_hands(int p) const { return static_cast<int>(hands_[p].size()); }
  const std::vector<int>& hand_combos(int p) const { return hand_combo_[p]; }

  // Runs DCFR until `max_iterations` or exploitability <= target_pct (% of pot).
  // The callback (optional) gets each exploitability check; return false to stop.
  SolveStatus solve(int max_iterations, double target_pct, int check_every = 10,
                    const std::function<bool(const SolveStatus&)>& callback = nullptr);
  void iterate(int iterations);  // raw iterations (no exploitability checks)
  double exploitability();       // chips (Nash gap / 2)
  std::array<double, 2> root_ev();  // EV of each player's average strategy (chips)
  int iterations_done() const { return iteration_; }

  // Path tokens: action index as decimal string ("0", "1", ...) or a card ("Kh") at chance nodes.
  NodeInfo query(const std::vector<std::string>& path, bool with_equity = true);

  // Equity per hand for player p vs opponent reach on a given board (generic helper).
  std::vector<float> equity_vs(int p, const std::vector<float>& opp_reach, CardMask board) const;

  void request_stop() { stop_flag_ = true; }

 private:
  struct Hand {
    uint8_t c1, c2;
    int16_t combo;
  };
  struct SortedEntry {
    uint32_t strength;
    int16_t idx;
    uint8_t c1, c2;
  };
  struct RiverBoard {
    std::array<std::vector<SortedEntry>, 2> sorted;
  };
  struct Discount {
    float pos, neg, strat;
  };
  enum class EvalMode { AVERAGE, BEST_RESPONSE };

  // Tree building.
  struct BuildState;
  int build(const BuildState& s, uint8_t dealt_suits);
  void add_action_children(int node_id, const BuildState& s, uint8_t dealt_suits);
  std::vector<std::pair<Action, BuildState>> legal_actions(const BuildState& s) const;
  int make_terminal_or_next(const BuildState& s, uint8_t dealt_suits);

  // Precomputation.
  void init_hands();
  void init_isomorphism();
  void init_river_boards();
  const RiverBoard& river_board(CardMask board) const;

  // CFR.
  void cfr(int node_id, int p, const float* opp_reach, const float* own_reach, float* out,
           const Discount& d, int depth);
  void evaluate(int node_id, int p, const float* opp_reach, float* out, EvalMode mode, int depth);
  void terminal_value(const Node& n, int p, const float* opp_reach, float* out) const;
  void showdown_diff(int p, const float* opp_reach, const RiverBoard& rb, float* diff, float* S = nullptr) const;
  void allin_diff(int p, const float* opp_reach, CardMask board, float* diff) const;
  void nonconflict_mass(int p, const float* opp_reach, float* S) const;
  void chance_combine(const Node& n, int p, const float* results, float* out) const;
  const std::vector<int>& board_blocked(int p, CardMask board) const;
  void current_strategy(const Node& n, float* out) const;
  void average_strategy(const Node& n, float* out) const;
  // Storage access (handles compression). Buffers hold num_children * hands floats.
  void load_regret(const Node& n, float* out) const;
  void store_regret(const Node& n, const float* in);
  void load_cum(const Node& n, float* out) const;
  void store_cum(const Node& n, const float* in);
  double rake(double pot) const;
  bool parallel_here(int depth) const;

  TreeConfig cfg_;
  std::vector<int> root_board_;
  CardMask root_mask_ = 0;

  std::array<std::vector<Hand>, 2> hands_;
  std::array<std::vector<int>, 2> hand_combo_;
  std::array<std::vector<float>, 2> init_weight_;
  std::array<std::vector<int>, 2> same_idx_;  // index of the same combo in the opponent's list, or -1
  std::array<std::array<int16_t, NUM_COMBOS>, 2> combo_to_idx_;
  std::array<std::array<std::vector<int>, NUM_CARDS>, 2> hands_with_card_;

  // Suit isomorphism: 6 suit pairs; valid_swap_[k] if the root board and both ranges are invariant.
  std::array<std::pair<int, int>, 6> swap_pairs_;
  std::array<bool, 6> valid_swap_{};
  std::array<std::array<std::vector<int32_t>, 2>, 6> swap_perm_;  // [swap][player][hand] -> hand

  std::vector<Node> nodes_;
  std::vector<int32_t> children_;
  std::vector<int8_t> chance_cards_;   // parallel to children_ for CHANCE nodes
  std::vector<Action> actions_;        // parallel to children_ for ACTION nodes
  std::vector<IsoEntry> iso_;
  size_t num_action_nodes_ = 0;

  std::vector<float> regret_;
  std::vector<float> cum_strategy_;
  std::vector<_Float16> regret_h_;    // compressed regrets (value / node scale)
  std::vector<_Float16> cum_h_;       // compressed strategy sums (value / node scale)
  std::vector<float> regret_scale_;   // per action node
  std::vector<float> cum_scale_;

  std::unordered_map<CardMask, int> river_index_;
  std::vector<RiverBoard> river_boards_;

  int iteration_ = 0;
  double pair_mass_ = 0;  // sum over non-conflicting hand pairs of w0 * w1
  std::atomic<bool> stop_flag_{false};
};

}  // namespace flipup

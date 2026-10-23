// Multiway No-Limit Hold'em postflop solver: 2 to 4 players, Discounted CFR in vector form.
//
// Players are numbered in postflop acting order (0 acts first). Every player starts the tree with the
// same stack behind (single-raised pots where everyone called the same amount), so there are no side
// pots. Payoffs follow the heads-up solver: chips collected minus chips put in after the root, and EVs
// reported by queries are node-relative (folding is worth exactly 0).
//
// Showdowns with three or more players treat the opponents' hands as independent of each other: your
// own cards still block theirs exactly, but two opponents holding the same card is not ruled out. That
// keeps a showdown linear in the number of hands, like heads-up, and the error is small.
//
// The tree runs from the root street to `end_street`. Where betting ends on `end_street` with the board
// still one card short (a flop root solved through the turn), the showdown is averaged over that last
// card: the river is checked down. A turn or river root plays every street to the end.
#pragma once

#include <array>
#include <atomic>
#include <cstdint>
#include <unordered_map>
#include <vector>

#include "flipup/cards.h"

namespace flipup {

constexpr int MW_MAX_PLAYERS = 4;

struct MWConfig {
  int players = 3;
  std::vector<int> board;                // 3, 4 or 5 cards
  double pot = 0;                        // chips in the pot at the root
  double stack = 0;                      // chips behind for every player at the root
  std::vector<std::vector<float>> range; // [player][1326]
  std::array<std::vector<double>, 3> bet;    // opening bets per street (pot fractions)
  std::array<std::vector<double>, 3> raise;  // raises per street (pot fraction after calling)
  int max_raises = 1;                    // raises allowed after the opening bet, per street
  int end_street = 2;                    // last street with betting (0 flop, 1 turn, 2 river)
  // The cards dealt after the root street (empty = every card). A spread-out sample keeps flop solves
  // fast; values are reweighted so the sample stands in for the whole deck.
  std::vector<int> deal_subset;
  double min_bet = 1.0;
  double add_allin_threshold = 1.5;      // offer all-in when it is at most this many pots
  double force_allin_threshold = 0.15;   // a bet becomes all-in when less than this share of the pot is left behind
  double merge_threshold = 0.1;          // drop sizes within this share of the pot of a larger one
  double dcfr_alpha = 1.5;
  double dcfr_gamma = 3.0;
  double max_memory_mb = 0;
};

struct MWAction {
  enum Type : uint8_t { FOLD, CHECK, CALL, BET, RAISE };
  Type type;
  double amount;  // the actor's street wager after the action
  double added;   // chips moved in
  bool all_in;
};

struct MWNodeInfo {
  int type = 0;        // 0 action, 1 chance, 2 fold terminal, 3 showdown terminal
  int player = -1;     // actor
  int street = 0;
  double pot = 0;
  std::vector<double> contrib;  // chips each player put in since the root
  std::vector<double> wager;    // this street
  std::vector<bool> active;     // not folded
  std::vector<int> board;
  std::vector<MWAction> actions;
  std::vector<int> deal_cards;
  std::vector<std::vector<float>> reach;     // [player][1326]
  std::vector<std::vector<float>> strategy;  // actor: [action][1326]
  std::vector<std::vector<float>> action_ev; // actor: [action][1326], node-relative chips
  std::vector<std::vector<float>> ev;        // [player][1326], node-relative chips (0 where not in range)
  std::vector<std::vector<float>> equity;    // [player][1326], showdown share vs the active opponents
};

class MultiwaySolver {
 public:
  explicit MultiwaySolver(const MWConfig& cfg);
  void iterate(int iterations);
  int iteration() const { return iteration_; }
  size_t num_nodes() const { return nodes_.size(); }
  size_t num_action_nodes() const { return num_action_; }
  size_t memory_bytes() const { return (regret_.size() + cum_.size()) * sizeof(float); }
  // Each player's gain from switching to a best response, averaged over players, as % of the root pot.
  double exploitability_pct();
  std::vector<double> root_ev();  // each player's EV at the root (chips, root-relative + contrib = node-relative)
  MWNodeInfo query(const std::vector<int>& path, bool with_ev, bool with_equity);
  void request_stop() { stop_ = true; }

 private:
  struct Node {
    uint8_t type;      // 0 action, 1 chance, 2 fold, 3 showdown
    int8_t actor;
    int8_t street;
    uint8_t active;    // bitmask: not folded
    uint8_t allin;     // bitmask
    double pot;
    double contrib[MW_MAX_PLAYERS];
    double wager[MW_MAX_PLAYERS];
    CardMask board;
    int32_t child_begin = 0;
    int32_t num_children = 0;
    int64_t storage = -1;
  };
  struct BuildState {
    int street;
    uint8_t active, allin, acted;
    double pot;
    double contrib[MW_MAX_PLAYERS], wager[MW_MAX_PLAYERS], stack[MW_MAX_PLAYERS];
    int to_act;
    int num_bets;
    double last_inc;
    CardMask board;
  };
  struct RankEntry {
    int16_t combo;
    uint8_t a, b;  // its cards
  };
  struct BoardRank {
    std::vector<RankEntry> sorted;   // combos in anyone's range and clear of the board, weakest first
    std::vector<int32_t> groups;     // start of each run of equal strength, then sorted.size()
  };
  struct Discount {
    float pos, strat;
  };

  int build(const BuildState& s);
  int after_betting(const BuildState& s);
  int next_actor(const BuildState& s, int from) const;
  std::vector<std::pair<MWAction, BuildState>> legal_actions(const BuildState& s) const;
  const BoardRank& board_rank(CardMask board) const;
  void ensure_board_rank(CardMask board);

  void current_strategy(const Node& n, float* out) const;
  void average_strategy(const Node& n, float* out) const;
  // mode 0: CFR update, 1: average strategy, 2: best response for i.
  void walk(int node, int i, const float* reach, float* out, const Discount& d, int mode, int depth);
  void terminal_value(const Node& n, int i, const float* reach, float* out) const;
  void showdown_board(const Node& n, int i, const float* reach, const BoardRank& br, float* out,
                      bool count_folded = true) const;
  void others_mass(const Node& n, int i, const float* reach, float* out) const;  // prod of compatible mass

  MWConfig cfg_;
  int np_;
  CardMask root_board_;
  std::vector<Node> nodes_;
  std::vector<int32_t> children_;
  std::vector<MWAction> actions_;   // aligned with children_ for action nodes
  std::vector<int8_t> deal_;        // aligned with children_ for chance nodes
  std::array<std::vector<int16_t>, MW_MAX_PLAYERS> hands_;  // combos per player
  std::vector<float> regret_, cum_;
  std::vector<float> root_reach_;   // [player][1326]
  std::vector<char> in_any_;        // combo is in at least one range
  std::unordered_map<CardMask, BoardRank> ranks_;
  size_t num_action_ = 0;
  int iteration_ = 0;
  std::atomic<bool> stop_{false};
};

}  // namespace flipup

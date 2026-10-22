#include "flipup/solver.h"

#include <omp.h>
#ifdef __F16C__
#include <immintrin.h>
#endif

#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstring>
#include <numeric>
#include <stdexcept>

#include "flipup/eval.h"

namespace flipup {

namespace {

constexpr int PARALLEL_DEPTH = 6;  // spawn OpenMP tasks for nodes this close to the root

inline bool hand_has(uint8_t c1, uint8_t c2, int card) { return c1 == card || c2 == card; }

double choose(int n, int k) {
  double r = 1;
  for (int i = 1; i <= k; ++i) r = r * (n - k + i) / i;
  return r;
}

}  // namespace

struct Solver::BuildState {
  int street;
  CardMask board;
  int to_act;
  double pot;
  double contrib[2];
  double stack[2];
  double wager[2];
  double last_raise_inc;
  int num_bets;          // opening bet + raises on this street
  int street_aggressor;  // last bettor/raiser on this street, -1 if none
  int prev_aggressor;    // last aggressor of the previous street, -1 if none
};

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

Solver::Solver(const TreeConfig& config) : cfg_(config) {
  if (cfg_.board.size() < 3 || cfg_.board.size() > 5)
    throw std::invalid_argument("board must have 3, 4 or 5 cards");
  if (cfg_.starting_pot <= 0) throw std::invalid_argument("starting_pot must be positive");
  if (cfg_.effective_stack < 0) throw std::invalid_argument("effective_stack must be >= 0");
  for (int p = 0; p < 2; ++p)
    if (cfg_.range[p].size() != NUM_COMBOS) throw std::invalid_argument("ranges need 1326 weights");
  root_board_ = cfg_.board;
  root_mask_ = cards_mask(root_board_);
  if (__builtin_popcountll(root_mask_) != static_cast<int>(root_board_.size()))
    throw std::invalid_argument("duplicate board cards");

  init_hands();
  init_isomorphism();

  BuildState root{};
  root.street = static_cast<int>(root_board_.size()) - 3;
  root.board = root_mask_;
  root.to_act = 0;
  root.pot = cfg_.starting_pot;
  root.stack[0] = root.stack[1] = cfg_.effective_stack;
  root.street_aggressor = -1;
  root.prev_aggressor = -1;
  uint8_t dealt = 0;
  if (cfg_.effective_stack <= 0) {
    // No decisions left: straight to the runout.
    make_terminal_or_next(root, dealt);
  } else {
    build(root, dealt);
  }

  int64_t offset = 0;
  for (auto& n : nodes_) {
    if (n.type == NodeType::ACTION) {
      n.storage = offset;
      n.slot = static_cast<int32_t>(num_action_nodes_);
      offset += static_cast<int64_t>(n.num_children) * static_cast<int64_t>(hands_[n.player].size());
      ++num_action_nodes_;
    }
  }
  const double need_mb = static_cast<double>(offset) * (cfg_.compress ? 4.0 : 8.0) * (cfg_.predictive ? 1.5 : 1.0) / 1e6;
  if (cfg_.max_memory_mb > 0 && need_mb > cfg_.max_memory_mb)
    throw std::length_error("tree needs " + std::to_string(static_cast<long>(need_mb)) + " MB (limit " +
                            std::to_string(static_cast<long>(cfg_.max_memory_mb)) + " MB)");
  if (cfg_.compress) {
    regret_h_.assign(offset, static_cast<_Float16>(0.0f));
    cum_h_.assign(offset, static_cast<_Float16>(0.0f));
    regret_scale_.assign(num_action_nodes_, 0.0f);
    cum_scale_.assign(num_action_nodes_, 0.0f);
    if (cfg_.predictive) {
      pred_h_.assign(offset, static_cast<_Float16>(0.0f));
      pred_scale_.assign(num_action_nodes_, 0.0f);
    }
  } else {
    regret_.assign(offset, 0.0f);
    cum_strategy_.assign(offset, 0.0f);
    if (cfg_.predictive) pred_.assign(offset, 0.0f);
  }

  init_river_boards();  // all-in runouts on the turn still need them
  if (cfg_.leaf_street >= 0) init_leaf();

  std::vector<float> S(hands_[0].size());
  nonconflict_mass(0, init_weight_[1].data(), S.data());
  pair_mass_ = 0;
  for (size_t h = 0; h < hands_[0].size(); ++h) pair_mass_ += static_cast<double>(init_weight_[0][h]) * S[h];
  if (pair_mass_ <= 0) throw std::invalid_argument("ranges have no non-conflicting combinations");
}

void Solver::init_hands() {
  for (int p = 0; p < 2; ++p) {
    combo_to_idx_[p].fill(-1);
    for (int combo = 0; combo < NUM_COMBOS; ++combo) {
      float w = cfg_.range[p][combo];
      if (w <= 0 || (combo_mask(combo) & root_mask_)) continue;
      combo_to_idx_[p][combo] = static_cast<int16_t>(hands_[p].size());
      hands_[p].push_back({static_cast<uint8_t>(combo_card(combo, 0)),
                           static_cast<uint8_t>(combo_card(combo, 1)), static_cast<int16_t>(combo)});
      hand_combo_[p].push_back(combo);
      init_weight_[p].push_back(w);
    }
    if (hands_[p].empty()) throw std::invalid_argument("player " + std::to_string(p) + " has an empty range");
  }
  for (int p = 0; p < 2; ++p) {
    for (auto& v : hands_with_card_[p]) v.clear();
    for (size_t h = 0; h < hands_[p].size(); ++h) {
      hands_with_card_[p][hands_[p][h].c1].push_back(static_cast<int>(h));
      hands_with_card_[p][hands_[p][h].c2].push_back(static_cast<int>(h));
    }
  }
  for (int p = 0; p < 2; ++p) {
    same_idx_[p].resize(hands_[p].size());
    for (size_t h = 0; h < hands_[p].size(); ++h) same_idx_[p][h] = combo_to_idx_[1 - p][hands_[p][h].combo];
  }
}

void Solver::init_isomorphism() {
  int k = 0;
  for (int a = 0; a < 4; ++a)
    for (int b = a + 1; b < 4; ++b) swap_pairs_[k++] = {a, b};

  for (int s = 0; s < 6; ++s) {
    auto [a, b] = swap_pairs_[s];
    std::array<int, 4> perm = {0, 1, 2, 3};
    perm[a] = b;
    perm[b] = a;
    bool ok = true;
    for (int c : root_board_)
      if (!(root_mask_ & card_bit(permute_card(c, perm)))) ok = false;
    for (int p = 0; p < 2 && ok; ++p)
      for (int combo = 0; combo < NUM_COMBOS && ok; ++combo)
        if (std::fabs(cfg_.range[p][combo] - cfg_.range[p][permute_combo(combo, perm)]) > 1e-6f) ok = false;
    valid_swap_[s] = ok;
    if (!ok) continue;
    for (int p = 0; p < 2; ++p) {
      auto& perm_p = swap_perm_[s][p];
      perm_p.resize(hands_[p].size());
      for (size_t h = 0; h < hands_[p].size(); ++h) {
        int idx = combo_to_idx_[p][permute_combo(hands_[p][h].combo, perm)];
        if (idx < 0) throw std::logic_error("isomorphism: hand list not closed under swap");
        perm_p[h] = idx;
      }
    }
  }
}

void Solver::init_river_boards() {
  std::vector<CardMask> boards;
  std::vector<int> free_cards;
  for (int c = 0; c < NUM_CARDS; ++c)
    if (!(root_mask_ & card_bit(c))) free_cards.push_back(c);
  int need = 5 - static_cast<int>(root_board_.size());
  if (need == 0) {
    boards.push_back(root_mask_);
  } else if (need == 1) {
    for (int c : free_cards) boards.push_back(root_mask_ | card_bit(c));
  } else {
    for (size_t i = 0; i < free_cards.size(); ++i)
      for (size_t j = i + 1; j < free_cards.size(); ++j)
        boards.push_back(root_mask_ | card_bit(free_cards[i]) | card_bit(free_cards[j]));
  }
  river_boards_.resize(boards.size());
  for (size_t i = 0; i < boards.size(); ++i) river_index_[boards[i]] = static_cast<int>(i);

#pragma omp parallel for schedule(dynamic, 8)
  for (size_t i = 0; i < boards.size(); ++i) {
    CardMask b = boards[i];
    for (int p = 0; p < 2; ++p) {
      auto& list = river_boards_[i].sorted[p];
      list.reserve(hands_[p].size());
      for (size_t h = 0; h < hands_[p].size(); ++h) {
        const Hand& hd = hands_[p][h];
        CardMask hm = card_bit(hd.c1) | card_bit(hd.c2);
        if (hm & b) continue;
        list.push_back({evaluate_mask(b | hm), static_cast<int16_t>(h), hd.c1, hd.c2});
      }
      std::sort(list.begin(), list.end(),
                [](const SortedEntry& x, const SortedEntry& y) { return x.strength < y.strength; });
    }
  }
}

const Solver::RiverBoard& Solver::river_board(CardMask board) const {
  auto it = river_index_.find(board);
  if (it == river_index_.end()) throw std::logic_error("river board not precomputed");
  return river_boards_[it->second];
}

size_t Solver::memory_bytes() const {
  size_t bytes = (regret_.size() + cum_strategy_.size() + pred_.size()) * sizeof(float) +
                 (regret_h_.size() + cum_h_.size() + pred_h_.size()) * sizeof(_Float16) +
                 (regret_scale_.size() + cum_scale_.size() + pred_scale_.size()) * sizeof(float);
  bytes += nodes_.size() * sizeof(Node) + children_.size() * (sizeof(int32_t) + sizeof(Action) + 1);
  for (const auto& rb : river_boards_) bytes += (rb.sorted[0].size() + rb.sorted[1].size()) * sizeof(SortedEntry);
  return bytes;
}

// ---------------------------------------------------------------------------
// Tree building
// ---------------------------------------------------------------------------

std::vector<std::pair<Action, Solver::BuildState>> Solver::legal_actions(const BuildState& s) const {
  std::vector<std::pair<Action, BuildState>> out;
  const int p = s.to_act, o = 1 - p;
  const double to_call = s.wager[o] - s.wager[p];
  const double stack = s.stack[p];

  auto apply = [&](double added) {
    BuildState n = s;
    n.stack[p] -= added;
    n.pot += added;
    n.contrib[p] += added;
    n.wager[p] += added;
    return n;
  };

  // Candidate opening bets / raises as "chips added" amounts, then filtered.
  auto finalize = [&](std::vector<double> adds, double pot_ref, bool raising) {
    // Force all-in when the remaining stack would be tiny relative to the pot.
    for (double& d : adds) {
      d = std::min(d, stack);
      double opp_call = s.wager[p] + d - s.wager[o];
      double pot_after = s.pot + d + opp_call;
      if (stack - d <= cfg_.force_allin_threshold * pot_after + 1e-9) d = stack;
    }
    double allin_ref = raising ? (s.wager[p] + stack - s.wager[o]) : stack;
    if (allin_ref <= cfg_.add_allin_threshold * pot_ref + 1e-9) adds.push_back(stack);
    std::sort(adds.begin(), adds.end(), std::greater<double>());
    std::vector<double> kept;
    for (double d : adds) {
      if (d <= 0) continue;
      if (!kept.empty() && kept.back() - d <= cfg_.merge_threshold * pot_ref + 1e-9) continue;
      kept.push_back(d);
    }
    std::reverse(kept.begin(), kept.end());
    for (double d : kept) {
      BuildState n = apply(d);
      Action a{};
      a.type = raising ? Action::RAISE : Action::BET;
      a.amount = n.wager[p];
      a.added = d;
      a.all_in = n.stack[p] <= 1e-9;
      if (a.all_in) n.stack[p] = 0;
      n.last_raise_inc = n.wager[p] - s.wager[o];
      n.num_bets = s.num_bets + 1;
      n.street_aggressor = p;
      n.to_act = o;
      out.push_back({a, n});
    }
  };

  auto geometric_fraction = [&](double pot, double eff_stack, double streets) {
    if (pot <= 0 || eff_stack <= 0) return 0.0;
    return (std::pow(1.0 + 2.0 * eff_stack / pot, 1.0 / streets) - 1.0) / 2.0;
  };

  if (to_call > 1e-9) {
    Action fold{Action::FOLD, 0, 0, false};
    out.push_back({fold, s});
    double added = std::min(to_call, stack);
    BuildState n = apply(added);
    Action call{Action::CALL, n.wager[p], added, n.stack[p] <= 1e-9};
    if (call.all_in) n.stack[p] = 0;
    out.push_back({call, n});

    bool can_raise = stack > to_call + 1e-9 && s.stack[o] > 1e-9 && (s.num_bets - 1) < cfg_.max_raises;
    if (can_raise) {
      const auto& sizes = cfg_.sizes[p][s.street].raise;
      double pot_after_call = s.pot + to_call;
      double min_to = s.wager[o] + std::max(s.last_raise_inc, cfg_.min_bet);
      std::vector<double> adds;
      for (const auto& bs : sizes) {
        double to = 0;
        switch (bs.kind) {
          case BetSize::POT_FRACTION: to = s.wager[o] + bs.value * pot_after_call; break;
          case BetSize::PREV_BET_MULT: to = bs.value * s.wager[o]; break;
          case BetSize::ALL_IN: to = s.wager[p] + stack; break;
          case BetSize::GEOMETRIC: {
            double streets = bs.value > 0 ? bs.value : 3 - s.street;
            to = s.wager[o] + geometric_fraction(pot_after_call, stack - to_call, streets) * pot_after_call;
            break;
          }
        }
        to = std::max(to, min_to);
        adds.push_back(to - s.wager[p]);
      }
      finalize(adds, pot_after_call, true);
    }
  } else {
    Action check{Action::CHECK, 0, 0, false};
    out.push_back({check, s});
    if (stack > 1e-9 && s.stack[o] > 1e-9) {
      bool donk = s.street > 0 && p == 0 && s.prev_aggressor == 1 && s.num_bets == 0;
      const auto& sizes = donk ? cfg_.sizes[p][s.street].donk : cfg_.sizes[p][s.street].bet;
      double eff = std::min(s.stack[0], s.stack[1]);
      std::vector<double> adds;
      for (const auto& bs : sizes) {
        double d = 0;
        switch (bs.kind) {
          case BetSize::POT_FRACTION: d = bs.value * s.pot; break;
          case BetSize::PREV_BET_MULT: continue;  // meaningless for an opening bet
          case BetSize::ALL_IN: d = stack; break;
          case BetSize::GEOMETRIC: {
            double streets = bs.value > 0 ? bs.value : 3 - s.street;
            d = geometric_fraction(s.pot, eff, streets) * s.pot;
            break;
          }
        }
        adds.push_back(std::max(d, cfg_.min_bet));
      }
      // Without any configured size the all-in threshold rule still applies.
      if (!sizes.empty() || stack <= cfg_.add_allin_threshold * s.pot) finalize(adds, s.pot, false);
    }
  }
  return out;
}

int Solver::build(const BuildState& s, uint8_t dealt_suits) {
  int id = static_cast<int>(nodes_.size());
  Node node{};
  node.type = NodeType::ACTION;
  node.player = static_cast<int8_t>(s.to_act);
  node.street = static_cast<int8_t>(s.street);
  node.pot = s.pot;
  node.contrib[0] = s.contrib[0];
  node.contrib[1] = s.contrib[1];
  node.stack[0] = s.stack[0];
  node.stack[1] = s.stack[1];
  node.board = s.board;
  nodes_.push_back(node);
  add_action_children(id, s, dealt_suits);
  return id;
}

void Solver::add_action_children(int id, const BuildState& s, uint8_t dealt_suits) {
  auto acts = legal_actions(s);
  std::vector<int32_t> kids;
  std::vector<Action> labels;
  const int p = s.to_act;
  for (auto& [a, next] : acts) {
    int child;
    if (a.type == Action::FOLD) {
      child = static_cast<int>(nodes_.size());
      Node t{};
      t.type = NodeType::FOLD;
      t.player = static_cast<int8_t>(p);
      t.street = static_cast<int8_t>(s.street);
      t.pot = s.pot;
      t.contrib[0] = s.contrib[0];
      t.contrib[1] = s.contrib[1];
      t.stack[0] = s.stack[0];
      t.stack[1] = s.stack[1];
      t.board = s.board;
      nodes_.push_back(t);
    } else if (a.type == Action::CALL || (a.type == Action::CHECK && p == 1)) {
      child = make_terminal_or_next(next, dealt_suits);
    } else {
      BuildState n = next;
      n.to_act = 1 - p;
      child = build(n, dealt_suits);
    }
    kids.push_back(child);
    labels.push_back(a);
  }
  Node& node = nodes_[id];
  node.child_begin = static_cast<int32_t>(children_.size());
  node.num_children = static_cast<int32_t>(kids.size());
  for (size_t i = 0; i < kids.size(); ++i) {
    children_.push_back(kids[i]);
    actions_.push_back(labels[i]);
    chance_cards_.push_back(-1);
  }
}

int Solver::make_terminal_or_next(const BuildState& s, uint8_t dealt_suits) {
  bool someone_all_in = s.stack[0] <= 1e-9 || s.stack[1] <= 1e-9;
  if (someone_all_in || s.street == 2) {
    int id = static_cast<int>(nodes_.size());
    Node t{};
    t.type = (s.street == 2) ? NodeType::SHOWDOWN : NodeType::ALLIN;
    t.player = -1;
    t.street = static_cast<int8_t>(s.street);
    t.pot = s.pot;
    t.contrib[0] = s.contrib[0];
    t.contrib[1] = s.contrib[1];
    t.stack[0] = s.stack[0];
    t.stack[1] = s.stack[1];
    t.board = s.board;
    nodes_.push_back(t);
    return id;
  }

  if (cfg_.leaf_street == s.street + 1) {
    int id = static_cast<int>(nodes_.size());
    Node t{};
    t.type = NodeType::LEAF;
    t.player = -1;
    t.street = static_cast<int8_t>(s.street);
    t.pot = s.pot;
    t.contrib[0] = s.contrib[0];
    t.contrib[1] = s.contrib[1];
    t.stack[0] = s.stack[0];
    t.stack[1] = s.stack[1];
    t.board = s.board;
    nodes_.push_back(t);
    return id;
  }

  // Chance node: deal the next street.
  int id = static_cast<int>(nodes_.size());
  Node c{};
  c.type = NodeType::CHANCE;
  c.player = -1;
  c.street = static_cast<int8_t>(s.street);
  c.pot = s.pot;
  c.contrib[0] = s.contrib[0];
  c.contrib[1] = s.contrib[1];
  c.stack[0] = s.stack[0];
  c.stack[1] = s.stack[1];
  c.board = s.board;
  nodes_.push_back(c);

  // Suits that are interchangeable here: swaps valid at the root that do not
  // move any card dealt since the root.
  int rep_suit[4] = {0, 1, 2, 3};
  int rep_swap[4] = {-1, -1, -1, -1};
  for (int k = 0; k < 6; ++k) {
    if (!valid_swap_[k]) continue;
    auto [a, b] = swap_pairs_[k];
    if ((dealt_suits >> a & 1) || (dealt_suits >> b & 1)) continue;
    // a < b: b maps to the smallest equivalent suit.
    if (rep_suit[b] == b || a < rep_suit[b]) {
      if (a < rep_suit[b]) {
        rep_suit[b] = a;
        rep_swap[b] = k;
      }
    }
  }

  BuildState next = s;
  next.street = s.street + 1;
  next.wager[0] = next.wager[1] = 0;
  next.last_raise_inc = 0;
  next.num_bets = 0;
  next.prev_aggressor = s.street_aggressor;
  next.street_aggressor = -1;
  next.to_act = 0;

  std::vector<int32_t> kids;
  std::vector<int8_t> cards;
  std::vector<std::pair<int, int>> skipped;  // (card, swap id)
  for (int card = 0; card < NUM_CARDS; ++card) {
    if (s.board & card_bit(card)) continue;
    int suit = card_suit(card);
    if (rep_suit[suit] != suit) {
      skipped.push_back({card, rep_swap[suit]});
      continue;
    }
    BuildState n = next;
    n.board = s.board | card_bit(card);
    int child = build(n, static_cast<uint8_t>(dealt_suits | (1u << suit)));
    kids.push_back(child);
    cards.push_back(static_cast<int8_t>(card));
  }

  Node& node = nodes_[id];
  node.child_begin = static_cast<int32_t>(children_.size());
  node.num_children = static_cast<int32_t>(kids.size());
  for (size_t i = 0; i < kids.size(); ++i) {
    children_.push_back(kids[i]);
    chance_cards_.push_back(cards[i]);
    actions_.push_back(Action{});
  }
  node.iso_begin = static_cast<int32_t>(iso_.size());
  node.num_iso = static_cast<int32_t>(skipped.size());
  for (auto [card, swap_id] : skipped) {
    auto [a, b] = swap_pairs_[swap_id];
    std::array<int, 4> perm = {0, 1, 2, 3};
    perm[a] = b;
    perm[b] = a;
    int rep_card = permute_card(card, perm);
    int rep_child = -1;
    for (size_t i = 0; i < cards.size(); ++i)
      if (cards[i] == rep_card) rep_child = static_cast<int>(i);
    if (rep_child < 0) throw std::logic_error("isomorphism: representative card missing");
    iso_.push_back({static_cast<int8_t>(card), rep_child, static_cast<int8_t>(swap_id)});
  }
  return id;
}

// ---------------------------------------------------------------------------
// Strategy helpers
// ---------------------------------------------------------------------------

namespace {
// Half floats normalized by the node's largest magnitude: ~0.05% relative precision
// down to 1e-4 of the max, with subnormals reaching ~6e-8.
void encode_half(const float* in, size_t len, _Float16* out, float& scale) {
  float mx = 0;
  for (size_t i = 0; i < len; ++i) mx = std::max(mx, std::fabs(in[i]));
  scale = mx;
  const float inv = mx > 0 ? 1.0f / mx : 0.0f;
  size_t i = 0;
#ifdef __F16C__
  const __m256 vinv = _mm256_set1_ps(inv);
  for (; i + 8 <= len; i += 8) {
    __m128i h = _mm256_cvtps_ph(_mm256_mul_ps(_mm256_loadu_ps(in + i), vinv), _MM_FROUND_TO_NEAREST_INT);
    _mm_storeu_si128(reinterpret_cast<__m128i*>(out + i), h);
  }
#endif
  for (; i < len; ++i) out[i] = static_cast<_Float16>(in[i] * inv);
}
void decode_half(const _Float16* in, size_t len, float scale, float* out) {
  size_t i = 0;
#ifdef __F16C__
  const __m256 vs = _mm256_set1_ps(scale);
  for (; i + 8 <= len; i += 8) {
    __m256 f = _mm256_cvtph_ps(_mm_loadu_si128(reinterpret_cast<const __m128i*>(in + i)));
    _mm256_storeu_ps(out + i, _mm256_mul_ps(f, vs));
  }
#endif
  for (; i < len; ++i) out[i] = static_cast<float>(in[i]) * scale;
}
}  // namespace

void Solver::load_regret(const Node& n, float* out) const {
  const size_t len = static_cast<size_t>(n.num_children) * hands_[n.player].size();
  if (!cfg_.compress) {
    std::copy(regret_.begin() + n.storage, regret_.begin() + n.storage + len, out);
    return;
  }
  decode_half(regret_h_.data() + n.storage, len, regret_scale_[n.slot], out);
}

void Solver::store_regret(const Node& n, const float* in) {
  const size_t len = static_cast<size_t>(n.num_children) * hands_[n.player].size();
  if (!cfg_.compress) {
    std::copy(in, in + len, regret_.begin() + n.storage);
    return;
  }
  encode_half(in, len, regret_h_.data() + n.storage, regret_scale_[n.slot]);
}

void Solver::load_cum(const Node& n, float* out) const {
  const size_t len = static_cast<size_t>(n.num_children) * hands_[n.player].size();
  if (!cfg_.compress) {
    std::copy(cum_strategy_.begin() + n.storage, cum_strategy_.begin() + n.storage + len, out);
    return;
  }
  decode_half(cum_h_.data() + n.storage, len, cum_scale_[n.slot], out);
}

void Solver::store_cum(const Node& n, const float* in) {
  const size_t len = static_cast<size_t>(n.num_children) * hands_[n.player].size();
  if (!cfg_.compress) {
    std::copy(in, in + len, cum_strategy_.begin() + n.storage);
    return;
  }
  encode_half(in, len, cum_h_.data() + n.storage, cum_scale_[n.slot]);
}

void Solver::load_pred(const Node& n, float* out) const {
  const size_t len = static_cast<size_t>(n.num_children) * hands_[n.player].size();
  if (!cfg_.compress) {
    std::copy(pred_.begin() + n.storage, pred_.begin() + n.storage + len, out);
    return;
  }
  decode_half(pred_h_.data() + n.storage, len, pred_scale_[n.slot], out);
}

void Solver::store_pred(const Node& n, const float* in) {
  const size_t len = static_cast<size_t>(n.num_children) * hands_[n.player].size();
  if (!cfg_.compress) {
    std::copy(in, in + len, pred_.begin() + n.storage);
    return;
  }
  encode_half(in, len, pred_h_.data() + n.storage, pred_scale_[n.slot]);
}

void Solver::current_strategy(const Node& n, float* out) const {
  const int na = n.num_children;
  const size_t nh = hands_[n.player].size();
  thread_local std::vector<float> buf, sum;
  const float* r;
  if (cfg_.compress) {
    buf.resize(static_cast<size_t>(na) * nh);
    load_regret(n, buf.data());
    r = buf.data();
  } else {
    r = regret_.data() + n.storage;
  }
  if (cfg_.predictive) {
    // Strategy from the discounted regrets plus the predicted (last) instantaneous regret.
    thread_local std::vector<float> q, m;
    const size_t len = static_cast<size_t>(na) * nh;
    q.resize(len);
    m.resize(len);
    load_pred(n, m.data());
    for (size_t i = 0; i < len; ++i) q[i] = r[i] * pred_pos_ + m[i];
    r = q.data();
  }
  sum.resize(nh);
  for (size_t h = 0; h < nh; ++h) sum[h] = std::max(r[h], 0.0f);
  for (int a = 1; a < na; ++a) {
    const float* ra = r + a * nh;
    for (size_t h = 0; h < nh; ++h) sum[h] += std::max(ra[h], 0.0f);
  }
  const float uniform = 1.0f / na;
  for (size_t h = 0; h < nh; ++h) sum[h] = sum[h] > 0 ? 1.0f / sum[h] : 0.0f;
  for (int a = 0; a < na; ++a) {
    const float* ra = r + a * nh;
    float* oa = out + a * nh;
    for (size_t h = 0; h < nh; ++h) oa[h] = sum[h] > 0 ? std::max(ra[h], 0.0f) * sum[h] : uniform;
  }
}

void Solver::average_strategy(const Node& n, float* out) const {
  const int na = n.num_children;
  const size_t nh = hands_[n.player].size();
  thread_local std::vector<float> buf, sum;
  const float* c;
  if (cfg_.compress) {
    buf.resize(static_cast<size_t>(na) * nh);
    load_cum(n, buf.data());
    c = buf.data();
  } else {
    c = cum_strategy_.data() + n.storage;
  }
  sum.resize(nh);
  std::copy(c, c + nh, sum.begin());
  for (int a = 1; a < na; ++a)
    for (size_t h = 0; h < nh; ++h) sum[h] += c[a * nh + h];
  bool any_empty = false;
  for (size_t h = 0; h < nh; ++h) {
    any_empty |= !(sum[h] > 0);
    sum[h] = sum[h] > 0 ? 1.0f / sum[h] : 0.0f;
  }
  for (int a = 0; a < na; ++a)
    for (size_t h = 0; h < nh; ++h) out[a * nh + h] = c[a * nh + h] * sum[h];
  if (any_empty) {
    // Hands that (almost) never reach this node have no strategy sum: use the
    // current regret-matching strategy instead of a uniform guess.
    thread_local std::vector<float> cur;
    cur.resize(static_cast<size_t>(na) * nh);
    current_strategy(n, cur.data());
    for (size_t h = 0; h < nh; ++h)
      if (!(sum[h] > 0))
        for (int a = 0; a < na; ++a) out[a * nh + h] = cur[a * nh + h];
  }
}

double Solver::rake(double pot) const {
  double r = pot * cfg_.rake_rate;
  if (cfg_.rake_cap > 0) r = std::min(r, cfg_.rake_cap);
  return r;
}

bool Solver::parallel_here(int depth) const { return depth < PARALLEL_DEPTH && omp_in_parallel(); }

// ---------------------------------------------------------------------------
// Terminal values
// ---------------------------------------------------------------------------

void Solver::nonconflict_mass(int p, const float* opp_reach, float* S) const {
  const int o = 1 - p;
  float total = 0;
  float per_card[NUM_CARDS] = {0};
  const auto& oh = hands_[o];
  for (size_t i = 0; i < oh.size(); ++i) {
    float r = opp_reach[i];
    total += r;
    per_card[oh[i].c1] += r;
    per_card[oh[i].c2] += r;
  }
  const auto& ph = hands_[p];
  const int* same = same_idx_[p].data();
  for (size_t h = 0; h < ph.size(); ++h) {
    float s = total - per_card[ph[h].c1] - per_card[ph[h].c2];
    if (same[h] >= 0) s += opp_reach[same[h]];
    S[h] = s;
  }
}

// diff[h] = (opp mass h beats) - (opp mass that beats h), card removal aware.
// One sweep over both strength-sorted lists, handling ties as groups.
void Solver::showdown_diff(int p, const float* opp_reach, const RiverBoard& rb, float* diff, float* S) const {
  const SortedEntry* mine = rb.sorted[p].data();
  const SortedEntry* theirs = rb.sorted[1 - p].data();
  const long nm = static_cast<long>(rb.sorted[p].size());
  const long nt = static_cast<long>(rb.sorted[1 - p].size());
  thread_local std::vector<float> reach;
  reach.resize(nt);
  float total = 0, card_total[NUM_CARDS] = {0};
  for (long k = 0; k < nt; ++k) {
    float r = opp_reach[theirs[k].idx];
    reach[k] = r;
    total += r;
    card_total[theirs[k].c1] += r;
    card_total[theirs[k].c2] += r;
  }
  float lt = 0, lt_card[NUM_CARDS] = {0};
  float eq_card[NUM_CARDS] = {0};
  long i = 0, j = 0;
  while (i < nm) {
    const uint32_t s = mine[i].strength;
    while (j < nt && theirs[j].strength < s) {
      float r = reach[j];
      lt += r;
      lt_card[theirs[j].c1] += r;
      lt_card[theirs[j].c2] += r;
      ++j;
    }
    long k = j;
    float eq = 0;
    while (k < nt && theirs[k].strength == s) {
      float r = reach[k];
      eq += r;
      eq_card[theirs[k].c1] += r;
      eq_card[theirs[k].c2] += r;
      ++k;
    }
    const float gt_total = total - lt - eq;
    for (; i < nm && mine[i].strength == s; ++i) {
      const int a = mine[i].c1, b = mine[i].c2;
      float win = lt - lt_card[a] - lt_card[b];
      float lose = gt_total - (card_total[a] - lt_card[a] - eq_card[a]) - (card_total[b] - lt_card[b] - eq_card[b]);
      diff[mine[i].idx] = win - lose;
      if (S) {
        int same = same_idx_[p][mine[i].idx];
        S[mine[i].idx] = total - card_total[a] - card_total[b] + (same >= 0 ? opp_reach[same] : 0.0f);
      }
    }
    // Fold the tie group into the "less than" totals for stronger hands.
    for (long q = j; q < k; ++q) {
      float r = reach[q];
      lt += r;
      lt_card[theirs[q].c1] += r;
      lt_card[theirs[q].c2] += r;
      eq_card[theirs[q].c1] = 0;
      eq_card[theirs[q].c2] = 0;
    }
    j = k;
  }
}

void Solver::allin_diff(int p, const float* opp_reach, CardMask board, float* diff) const {
  const size_t np = hands_[p].size();
  std::fill(diff, diff + np, 0.0f);
  int on_board = __builtin_popcountll(board);
  if (on_board == 5) {
    showdown_diff(p, opp_reach, river_board(board), diff);
    return;
  }
  int need = 5 - on_board;
  double w = 1.0 / choose(NUM_CARDS - on_board - 4, need);
  std::vector<double> acc(np, 0.0);
  std::vector<float> tmp(np);
  std::vector<int> free_cards;
  for (int c = 0; c < NUM_CARDS; ++c)
    if (!(board & card_bit(c))) free_cards.push_back(c);
  auto add_board = [&](CardMask b) {
    std::fill(tmp.begin(), tmp.end(), 0.0f);
    showdown_diff(p, opp_reach, river_board(b), tmp.data());
    for (size_t h = 0; h < np; ++h) acc[h] += tmp[h];
  };
  if (need == 1) {
    for (int c : free_cards) add_board(board | card_bit(c));
  } else {
    for (size_t i = 0; i < free_cards.size(); ++i)
      for (size_t k = i + 1; k < free_cards.size(); ++k)
        add_board(board | card_bit(free_cards[i]) | card_bit(free_cards[k]));
  }
  for (size_t h = 0; h < np; ++h) diff[h] = static_cast<float>(acc[h] * w);
}

void Solver::terminal_value(const Node& n, int p, const float* opp_reach, float* out) const {
  const size_t np = hands_[p].size();
  thread_local std::vector<float> S, diff;
  S.resize(np);
  const double P = n.pot;
  const double R = rake(P);
  const double c = n.contrib[p];
  if (n.type == NodeType::FOLD) {
    nonconflict_mass(p, opp_reach, S.data());
    const float payoff = static_cast<float>((n.player == p) ? -c : (P - R - c));
    for (size_t h = 0; h < np; ++h) out[h] = payoff * S[h];
    return;
  }
  diff.resize(np);
  if (n.type == NodeType::SHOWDOWN) {
    // Hands blocked by the board are not in the sorted lists: zero them first.
    for (int h : board_blocked(p, n.board)) diff[h] = S[h] = 0.0f;
    showdown_diff(p, opp_reach, river_board(n.board), diff.data(), S.data());
  } else {
    nonconflict_mass(p, opp_reach, S.data());
    allin_diff(p, opp_reach, n.board, diff.data());
  }
  const float half = static_cast<float>((P - R) / 2.0);
  const float cf = static_cast<float>(c);
  for (size_t h = 0; h < np; ++h) out[h] = half * (S[h] + diff[h]) - cf * S[h];
}

// ---------------------------------------------------------------------------
// Depth-limited leaves (value network)
// ---------------------------------------------------------------------------

void Solver::init_leaf() {
  if (cfg_.leaf_street != 2 || root_board_.size() != 4)
    throw std::invalid_argument("leaves are supported at the river of a turn solve");
  if (cfg_.leaf_k <= 0 || cfg_.leaf_w.empty() || cfg_.leaf_w.size() != cfg_.leaf_b.size() ||
      cfg_.leaf_alpha.size() + 1 != cfg_.leaf_w.size())
    throw std::invalid_argument("leaf network missing or malformed");
  // Percentile of every live combo's river strength (ties share their mid-rank), per river card.
  for (int p = 0; p < 2; ++p) leaf_rank_[p].assign(NUM_CARDS, {});
  std::vector<int> cards;
  for (int c = 0; c < NUM_CARDS; ++c)
    if (!(root_mask_ & card_bit(c))) cards.push_back(c);
#pragma omp parallel for schedule(dynamic, 2)
  for (size_t i = 0; i < cards.size(); ++i) {
    const int c = cards[i];
    const CardMask b = root_mask_ | card_bit(c);
    std::vector<std::pair<uint32_t, int>> all;
    all.reserve(NUM_COMBOS);
    for (int combo = 0; combo < NUM_COMBOS; ++combo) {
      CardMask hm = combo_mask(combo);
      if (hm & b) continue;
      all.push_back({evaluate_mask(b | hm), combo});
    }
    std::sort(all.begin(), all.end());
    std::vector<float> pct(NUM_COMBOS, -1.0f);
    const double total = static_cast<double>(all.size());
    for (size_t a = 0; a < all.size();) {
      size_t z = a;
      while (z + 1 < all.size() && all[z + 1].first == all[a].first) ++z;
      const float r = static_cast<float>(((a + z) / 2.0 + 0.5) / total);
      for (size_t t = a; t <= z; ++t) pct[all[t].second] = r;
      a = z + 1;
    }
    for (int p = 0; p < 2; ++p) {
      auto& v = leaf_rank_[p][c];
      v.resize(hands_[p].size());
      for (size_t h = 0; h < hands_[p].size(); ++h) v[h] = pct[hands_[p][h].combo];
    }
  }
}

void Solver::leaf_net(const float* in, float* out) const {
  thread_local std::vector<float> a, b;
  const size_t nl = cfg_.leaf_w.size();
  size_t dim = 2 * static_cast<size_t>(cfg_.leaf_k) + 1;
  a.assign(in, in + dim);
  for (size_t l = 0; l < nl; ++l) {
    const auto& W = cfg_.leaf_w[l];
    const auto& B = cfg_.leaf_b[l];
    const size_t od = B.size();
    b.assign(od, 0.0f);
    for (size_t j = 0; j < od; ++j) {
      const float* row = W.data() + j * dim;
      const float* av = a.data();
      float s = 0.0f;
#pragma omp simd reduction(+ : s)
      for (size_t i = 0; i < dim; ++i) s += row[i] * av[i];
      s += B[j];
      if (l + 1 < nl && s < 0) s *= cfg_.leaf_alpha[l];
      b[j] = s;
    }
    a.swap(b);
    dim = od;
  }
  std::copy(a.begin(), a.end(), out);
}

void Solver::leaf_value(const Node& n, int p, const float* opp_reach, const float* own_reach, float* out) const {
  const int o = 1 - p;
  const int K = cfg_.leaf_k;
  const size_t np = hands_[p].size();
  const size_t no = hands_[o].size();
  std::fill(out, out + np, 0.0f);
  const float w = 1.0f / static_cast<float>(NUM_CARDS - __builtin_popcountll(n.board) - 4);
  const double P = n.pot;
  const float spr = static_cast<float>(std::min(n.stack[0], n.stack[1]) / P);
  const float cf = static_cast<float>(n.contrib[p]);
  thread_local std::vector<float> opp, S, x, v;
  opp.resize(no);
  S.resize(np);
  x.resize(2 * K + 1);
  v.resize(2 * K);
  for (int c = 0; c < NUM_CARDS; ++c) {
    if (n.board & card_bit(c)) continue;
    const auto& rp = leaf_rank_[p][c];
    const auto& ro = leaf_rank_[o][c];
    std::fill(x.begin(), x.end(), 0.0f);
    float* mp = x.data() + p * K;
    float* mo = x.data() + o * K;
    double sp = 0, so = 0;
    for (size_t h = 0; h < np; ++h) {
      if (rp[h] < 0) continue;
      mp[std::min(static_cast<int>(rp[h] * K), K - 1)] += own_reach[h];
      sp += own_reach[h];
    }
    for (size_t i = 0; i < no; ++i) {
      opp[i] = ro[i] < 0 ? 0.0f : opp_reach[i] * w;
      if (ro[i] < 0) continue;
      mo[std::min(static_cast<int>(ro[i] * K), K - 1)] += opp_reach[i];
      so += opp_reach[i];
    }
    if (so <= 0) continue;
    for (int k = 0; k < K; ++k) mo[k] = static_cast<float>(mo[k] / so);
    if (sp > 0) {
      for (int k = 0; k < K; ++k) mp[k] = static_cast<float>(mp[k] / sp);
    } else {
      for (int k = 0; k < K; ++k) mp[k] = 1.0f / K;  // no own range here: values for a neutral range
    }
    x[2 * K] = std::log1p(spr);
    leaf_net(x.data(), v.data());
    // Zero-sum correction: range-weighted values of both players add up to the pot.
    double tot = 0;
    for (int k = 0; k < 2 * K; ++k) tot += static_cast<double>(x[k]) * v[k];
    const float err = static_cast<float>((tot - 1.0) / 2.0);
    const float* vp = v.data() + p * K;
    nonconflict_mass(p, opp.data(), S.data());
    for (size_t h = 0; h < np; ++h) {
      if (rp[h] < 0) continue;
      float pos = rp[h] * K - 0.5f;
      int lo = static_cast<int>(std::floor(pos));
      float f = pos - lo;
      if (lo < 0) { lo = 0; f = 0; }
      if (lo >= K - 1) { lo = K - 1; f = 0; }
      const float val = (lo + 1 < K ? vp[lo] * (1 - f) + vp[lo + 1] * f : vp[lo]) - err;
      out[h] += (val * static_cast<float>(P) - cf) * S[h];
    }
  }
}

// ---------------------------------------------------------------------------
// CFR traversal
// ---------------------------------------------------------------------------

namespace {
// Per-thread bump allocator for traversal temporaries. Recursion (and tied
// OpenMP tasks) release buffers in strict LIFO order.
struct Arena {
  std::vector<float> buf;
  size_t top = 0;
};
thread_local Arena g_arena;

class Scratch {
 public:
  explicit Scratch(size_t n) : mark_(g_arena.top) {
    Arena& a = g_arena;
    if (a.buf.empty()) a.buf.resize(size_t{1} << 23);  // 32 MB per thread, grown on demand below
    size_t need = (n + 15) & ~size_t{15};
    if (a.top + need > a.buf.size()) {
      heap_.resize(n);
      ptr_ = heap_.data();
      return;
    }
    ptr_ = a.buf.data() + a.top;
    a.top += need;
  }
  ~Scratch() { g_arena.top = mark_; }
  Scratch(const Scratch&) = delete;
  Scratch& operator=(const Scratch&) = delete;
  float* get() { return ptr_; }
  float& operator[](size_t i) { return ptr_[i]; }

 private:
  size_t mark_;
  float* ptr_ = nullptr;
  std::vector<float> heap_;
};
}  // namespace

const std::vector<int>& Solver::board_blocked(int p, CardMask board) const {
  thread_local std::vector<int> out;
  out.clear();
  CardMask m = board;
  while (m) {
    int c = __builtin_ctzll(m);
    m &= m - 1;
    for (int h : hands_with_card_[p][c]) out.push_back(h);
  }
  return out;
}

// Chance node helper: child reach = parent reach * scale, zero for hands holding `card`.
static inline void deal_reach(const float* in, float* out, size_t n, float scale, const std::vector<int>& blocked) {
  for (size_t i = 0; i < n; ++i) out[i] = in[i] * scale;
  for (int h : blocked) out[h] = 0.0f;
}

void Solver::chance_combine(const Node& n, int p, const float* results, float* out) const {
  const size_t np = hands_[p].size();
  const int K = n.num_children;
  Scratch acc_s(np * 2);
  double* acc = reinterpret_cast<double*>(acc_s.get());
  std::fill(acc, acc + np, 0.0);
  for (int k = 0; k < K; ++k) {
    const float* r = results + k * np;
    for (size_t h = 0; h < np; ++h) acc[h] += r[h];
    for (int h : hands_with_card_[p][chance_cards_[n.child_begin + k]]) acc[h] -= r[h];
  }
  for (int e = 0; e < n.num_iso; ++e) {
    const IsoEntry& iso = iso_[n.iso_begin + e];
    const float* r = results + static_cast<size_t>(iso.rep_child) * np;
    const int32_t* perm = swap_perm_[iso.swap_id][p].data();
    for (size_t h = 0; h < np; ++h) acc[h] += r[perm[h]];
    for (int h : hands_with_card_[p][iso.card]) acc[h] -= r[perm[h]];
  }
  for (size_t h = 0; h < np; ++h) out[h] = static_cast<float>(acc[h]);
}

void Solver::cfr(int node_id, int p, const float* opp_reach, const float* own_reach, float* out,
                 const Discount& d, int depth) {
  const Node& n = nodes_[node_id];
  const int o = 1 - p;
  const size_t np = hands_[p].size();
  const size_t no = hands_[o].size();

  if (n.type == NodeType::FOLD || n.type == NodeType::SHOWDOWN || n.type == NodeType::ALLIN) {
    terminal_value(n, p, opp_reach, out);
    return;
  }
  if (n.type == NodeType::LEAF) {
    leaf_value(n, p, opp_reach, own_reach, out);
    return;
  }

  float opp_total = 0;
  for (size_t i = 0; i < no; ++i) opp_total += opp_reach[i];
  if (opp_total <= 0) {
    std::fill(out, out + np, 0.0f);
    return;
  }

  if (n.type == NodeType::CHANCE) {
    const int K = n.num_children;
    const float w = 1.0f / static_cast<float>(NUM_CARDS - __builtin_popcountll(n.board) - 4);
    Scratch results(static_cast<size_t>(K) * np);
    auto run_child = [&](int k) {
      int card = chance_cards_[n.child_begin + k];
      Scratch child_opp(no), child_own(np);
      deal_reach(opp_reach, child_opp.get(), no, w, hands_with_card_[o][card]);
      deal_reach(own_reach, child_own.get(), np, 1.0f, hands_with_card_[p][card]);
      cfr(children_[n.child_begin + k], p, child_opp.get(), child_own.get(), results.get() + k * np, d, depth + 1);
    };
    if (parallel_here(depth)) {
#pragma omp taskloop grainsize(1)
      for (int k = 0; k < K; ++k) run_child(k);
    } else {
      for (int k = 0; k < K; ++k) run_child(k);
    }
    chance_combine(n, p, results.get(), out);
    return;
  }

  // Action node.
  const int q = n.player;
  const int na = n.num_children;
  const size_t nq = hands_[q].size();
  Scratch sigma(static_cast<size_t>(na) * nq);
  current_strategy(n, sigma.get());

  if (q == p) {
    Scratch cfv(static_cast<size_t>(na) * np);
    auto run_child = [&](int a) {
      Scratch child_own(np);
      const float* sa = sigma.get() + a * np;
      for (size_t h = 0; h < np; ++h) child_own[h] = own_reach[h] * sa[h];
      cfr(children_[n.child_begin + a], p, opp_reach, child_own.get(), cfv.get() + a * np, d, depth + 1);
    };
    if (parallel_here(depth) && na > 1) {
#pragma omp taskloop grainsize(1)
      for (int a = 0; a < na; ++a) run_child(a);
    } else {
      for (int a = 0; a < na; ++a) run_child(a);
    }
    std::fill(out, out + np, 0.0f);
    for (int a = 0; a < na; ++a) {
      const float* sa = sigma.get() + a * np;
      const float* ca = cfv.get() + a * np;
      for (size_t h = 0; h < np; ++h) out[h] += sa[h] * ca[h];
    }
    const bool packed = cfg_.compress;
    Scratch reg_s(packed ? static_cast<size_t>(na) * np : 0), cum_s(packed ? static_cast<size_t>(na) * np : 0);
    float* reg = packed ? reg_s.get() : regret_.data() + n.storage;
    float* cum = packed ? cum_s.get() : cum_strategy_.data() + n.storage;
    if (packed) {
      load_regret(n, reg);
      load_cum(n, cum);
    }
    if (cfg_.predictive) {
      Scratch pred_s(static_cast<size_t>(na) * np);
      float* pred = pred_s.get();
      for (int a = 0; a < na; ++a) {
        float* ra = reg + a * np;
        float* ma = cum + a * np;
        float* pa = pred + a * np;
        const float* sa = sigma.get() + a * np;
        const float* ca = cfv.get() + a * np;
        for (size_t h = 0; h < np; ++h) {
          const float inst = ca[h] - out[h];
          ra[h] = std::max(ra[h] * d.pos + inst, 0.0f);
          pa[h] = inst;
          ma[h] = ma[h] * d.strat + sa[h] * own_reach[h];
        }
      }
      store_pred(n, pred);
    } else {
      for (int a = 0; a < na; ++a) {
        float* ra = reg + a * np;
        float* ma = cum + a * np;
        const float* sa = sigma.get() + a * np;
        const float* ca = cfv.get() + a * np;
        for (size_t h = 0; h < np; ++h) {
          float r = ra[h];
          r *= (r >= 0) ? d.pos : d.neg;
          ra[h] = r + (ca[h] - out[h]);
          ma[h] = ma[h] * d.strat + sa[h] * own_reach[h];
        }
      }
    }
    if (packed) {
      store_regret(n, reg);
      store_cum(n, cum);
    }
  } else {
    Scratch results(static_cast<size_t>(na) * np);
    auto run_child = [&](int a) {
      Scratch child_opp(no);
      const float* sa = sigma.get() + a * no;
      for (size_t i = 0; i < no; ++i) child_opp[i] = opp_reach[i] * sa[i];
      cfr(children_[n.child_begin + a], p, child_opp.get(), own_reach, results.get() + a * np, d, depth + 1);
    };
    if (parallel_here(depth) && na > 1) {
#pragma omp taskloop grainsize(1)
      for (int a = 0; a < na; ++a) run_child(a);
    } else {
      for (int a = 0; a < na; ++a) run_child(a);
    }
    std::copy(results.get(), results.get() + np, out);
    for (int a = 1; a < na; ++a) {
      const float* ra = results.get() + a * np;
      for (size_t h = 0; h < np; ++h) out[h] += ra[h];
    }
  }
}

void Solver::evaluate(int node_id, int p, const float* opp_reach, const float* own_reach, float* out,
                      EvalMode mode, int depth) {
  const Node& n = nodes_[node_id];
  const int o = 1 - p;
  const size_t np = hands_[p].size();
  const size_t no = hands_[o].size();

  if (n.type == NodeType::FOLD || n.type == NodeType::SHOWDOWN || n.type == NodeType::ALLIN) {
    terminal_value(n, p, opp_reach, out);
    return;
  }
  if (n.type == NodeType::LEAF) {
    leaf_value(n, p, opp_reach, own_reach, out);
    return;
  }
  float opp_total = 0;
  for (size_t i = 0; i < no; ++i) opp_total += opp_reach[i];
  if (opp_total <= 0) {
    std::fill(out, out + np, 0.0f);
    return;
  }

  if (n.type == NodeType::CHANCE) {
    const int K = n.num_children;
    const float w = 1.0f / static_cast<float>(NUM_CARDS - __builtin_popcountll(n.board) - 4);
    Scratch results(static_cast<size_t>(K) * np);
    auto run_child = [&](int k) {
      int card = chance_cards_[n.child_begin + k];
      Scratch child_opp(no), child_own(np);
      deal_reach(opp_reach, child_opp.get(), no, w, hands_with_card_[o][card]);
      deal_reach(own_reach, child_own.get(), np, 1.0f, hands_with_card_[p][card]);
      evaluate(children_[n.child_begin + k], p, child_opp.get(), child_own.get(), results.get() + k * np, mode,
               depth + 1);
    };
    if (parallel_here(depth)) {
#pragma omp taskloop grainsize(1)
      for (int k = 0; k < K; ++k) run_child(k);
    } else {
      for (int k = 0; k < K; ++k) run_child(k);
    }
    chance_combine(n, p, results.get(), out);
    return;
  }

  const int q = n.player;
  const int na = n.num_children;
  const size_t nq = hands_[q].size();
  Scratch sigma(static_cast<size_t>(na) * nq);
  average_strategy(n, sigma.get());
  Scratch results(static_cast<size_t>(na) * np);
  auto run_child = [&](int a) {
    if (q == p) {
      Scratch child_own(np);
      const float* sa = sigma.get() + a * np;
      for (size_t h = 0; h < np; ++h) child_own[h] = own_reach[h] * sa[h];
      evaluate(children_[n.child_begin + a], p, opp_reach, child_own.get(), results.get() + a * np, mode, depth + 1);
    } else {
      Scratch child_opp(no);
      const float* sa = sigma.get() + a * no;
      for (size_t i = 0; i < no; ++i) child_opp[i] = opp_reach[i] * sa[i];
      evaluate(children_[n.child_begin + a], p, child_opp.get(), own_reach, results.get() + a * np, mode, depth + 1);
    }
  };
  if (parallel_here(depth) && na > 1) {
#pragma omp taskloop grainsize(1)
    for (int a = 0; a < na; ++a) run_child(a);
  } else {
    for (int a = 0; a < na; ++a) run_child(a);
  }
  if (q == p && mode == EvalMode::BEST_RESPONSE) {
    std::copy(results.get(), results.get() + np, out);
    for (int a = 1; a < na; ++a)
      for (size_t h = 0; h < np; ++h) out[h] = std::max(out[h], results[a * np + h]);
  } else if (q == p) {
    std::fill(out, out + np, 0.0f);
    for (int a = 0; a < na; ++a)
      for (size_t h = 0; h < np; ++h) out[h] += sigma[a * np + h] * results[a * np + h];
  } else {
    std::copy(results.get(), results.get() + np, out);
    for (int a = 1; a < na; ++a)
      for (size_t h = 0; h < np; ++h) out[h] += results[a * np + h];
  }
}

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------

void Solver::iterate(int iterations) {
  if (nodes_.empty()) return;
  for (int it = 0; it < iterations && !stop_flag_; ++it) {
    ++iteration_;
    double t = iteration_;
    double ta = std::pow(t - 1, cfg_.dcfr_alpha);
    Discount d;
    d.pos = static_cast<float>(ta / (ta + 1));
    d.neg = static_cast<float>(cfg_.dcfr_neg);
    // Predictive mode: the strategy this iteration uses the regrets as they'll be discounted now.
    pred_pos_ = d.pos;
    if (cfg_.averaging == 1) {
      // gamma = 3 with the average restarted at every power of 4 (t counted from 0),
      // which discards the noisy early iterations (as in b-inary/postflop-solver).
      long t0 = iteration_ - 1;
      long p4 = 0;
      if (t0 > 0) {
        p4 = 1;
        while (p4 * 4 <= t0) p4 *= 4;
      }
      double tg = static_cast<double>(t0 - p4);
      d.strat = static_cast<float>(std::pow(tg / (tg + 1.0), 3.0));
    } else {
      d.strat = static_cast<float>(std::pow((t - 1) / t, cfg_.dcfr_gamma));
    }
    for (int p = 0; p < 2; ++p) {
      std::vector<float> out(hands_[p].size());
#pragma omp parallel
#pragma omp single
      cfr(0, p, init_weight_[1 - p].data(), init_weight_[p].data(), out.data(), d, 0);
    }
  }
}

std::array<double, 2> Solver::root_ev() {
  std::array<double, 2> ev{};
  for (int p = 0; p < 2; ++p) {
    std::vector<float> out(hands_[p].size());
#pragma omp parallel
#pragma omp single
    evaluate(0, p, init_weight_[1 - p].data(), init_weight_[p].data(), out.data(), EvalMode::AVERAGE, 0);
    double s = 0;
    for (size_t h = 0; h < out.size(); ++h) s += static_cast<double>(init_weight_[p][h]) * out[h];
    ev[p] = s / pair_mass_;
  }
  return ev;
}

double Solver::exploitability() {
  double gap = 0;
  auto ev = root_ev();
  for (int p = 0; p < 2; ++p) {
    std::vector<float> out(hands_[p].size());
#pragma omp parallel
#pragma omp single
    evaluate(0, p, init_weight_[1 - p].data(), init_weight_[p].data(), out.data(), EvalMode::BEST_RESPONSE, 0);
    double s = 0;
    for (size_t h = 0; h < out.size(); ++h) s += static_cast<double>(init_weight_[p][h]) * out[h];
    gap += s / pair_mass_ - ev[p];
  }
  return gap / 2.0;
}

SolveStatus Solver::solve(int max_iterations, double target_pct, int check_every,
                          const std::function<bool(const SolveStatus&)>& callback) {
  auto start = std::chrono::steady_clock::now();
  stop_flag_ = false;
  SolveStatus st;
  check_every = std::max(1, check_every);
  while (iteration_ < max_iterations && !stop_flag_) {
    int step = std::min(check_every, max_iterations - iteration_);
    iterate(step);
    st.iteration = iteration_;
    st.exploitability = exploitability();
    st.exploitability_pct = 100.0 * st.exploitability / cfg_.starting_pot;
    st.seconds = std::chrono::duration<double>(std::chrono::steady_clock::now() - start).count();
    if (callback && !callback(st)) break;
    if (st.exploitability_pct <= target_pct) break;
  }
  if (st.iteration == 0) {
    st.exploitability = exploitability();
    st.exploitability_pct = 100.0 * st.exploitability / cfg_.starting_pot;
  }
  st.seconds = std::chrono::duration<double>(std::chrono::steady_clock::now() - start).count();
  return st;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

std::vector<float> Solver::equity_vs(int p, const std::vector<float>& opp_reach, CardMask board) const {
  const size_t np = hands_[p].size();
  std::vector<float> S(np), diff(np, 0.0f), eq(np, 0.0f);
  nonconflict_mass(p, opp_reach.data(), S.data());
  allin_diff(p, opp_reach.data(), board, diff.data());
  for (size_t h = 0; h < np; ++h) {
    const Hand& hd = hands_[p][h];
    if ((card_bit(hd.c1) | card_bit(hd.c2)) & board) continue;
    eq[h] = S[h] > 1e-12f ? 0.5f * (S[h] + diff[h]) / S[h] : 0.0f;
  }
  return eq;
}

NodeInfo Solver::query(const std::vector<std::string>& path, bool with_equity, bool with_ev) {
  if (nodes_.empty()) throw std::logic_error("empty tree");
  int node_id = 0;
  std::array<int, 4> perm = {0, 1, 2, 3};  // real suit -> tree suit
  std::array<std::vector<float>, 2> reach = init_weight_;
  std::vector<int> real_board = root_board_;

  for (const std::string& tok : path) {
    const Node& n = nodes_[node_id];
    if (n.type == NodeType::ACTION) {
      int a = std::stoi(tok);
      if (a < 0 || a >= n.num_children) throw std::invalid_argument("action index out of range: " + tok);
      const int q = n.player;
      const size_t nq = hands_[q].size();
      std::vector<float> sigma(static_cast<size_t>(n.num_children) * nq);
      average_strategy(n, sigma.data());
      for (size_t h = 0; h < nq; ++h) reach[q][h] *= sigma[a * nq + h];
      node_id = children_[n.child_begin + a];
    } else if (n.type == NodeType::CHANCE) {
      int real_card = parse_card(tok);
      int t = permute_card(real_card, perm);
      if (n.board & card_bit(t)) throw std::invalid_argument("card already on board: " + tok);
      int k = -1;
      for (int i = 0; i < n.num_children; ++i)
        if (chance_cards_[n.child_begin + i] == t) k = i;
      if (k < 0) {
        for (int e = 0; e < n.num_iso && k < 0; ++e) {
          const IsoEntry& iso = iso_[n.iso_begin + e];
          if (iso.card != t) continue;
          k = iso.rep_child;
          auto [a, b] = swap_pairs_[iso.swap_id];
          std::array<int, 4> sw = {0, 1, 2, 3};
          sw[a] = b;
          sw[b] = a;
          for (int s = 0; s < 4; ++s) perm[s] = sw[perm[s]];
        }
      }
      if (k < 0) throw std::logic_error("card not found at chance node: " + tok);
      t = chance_cards_[n.child_begin + k];
      for (int p = 0; p < 2; ++p)
        for (size_t h = 0; h < hands_[p].size(); ++h)
          if (hand_has(hands_[p][h].c1, hands_[p][h].c2, t)) reach[p][h] = 0;
      real_board.push_back(real_card);
      node_id = children_[n.child_begin + k];
    } else {
      throw std::invalid_argument("cannot move past a terminal node");
    }
  }

  const Node& n = nodes_[node_id];
  NodeInfo info;
  info.type = n.type;
  info.player = n.player;
  info.street = n.street;
  info.pot = n.pot;
  for (int p = 0; p < 2; ++p) {
    info.contrib[p] = n.contrib[p];
    info.stack[p] = n.stack[p];
  }
  info.board = real_board;

  // Tree-space hand index for each real-space hand index.
  std::array<std::vector<int>, 2> to_tree;
  for (int p = 0; p < 2; ++p) {
    to_tree[p].resize(hands_[p].size());
    for (size_t h = 0; h < hands_[p].size(); ++h)
      to_tree[p][h] = combo_to_idx_[p][permute_combo(hands_[p][h].combo, perm)];
    info.combos[p] = hand_combo_[p];
  }
  auto to_real = [&](int p, const std::vector<float>& tree_vals) {
    std::vector<float> real(hands_[p].size());
    for (size_t h = 0; h < real.size(); ++h) real[h] = tree_vals[to_tree[p][h]];
    return real;
  };

  std::array<std::vector<float>, 2> S;
  for (int p = 0; p < 2; ++p) {
    S[p].resize(hands_[p].size());
    nonconflict_mass(p, reach[1 - p].data(), S[p].data());
  }
  auto normalize_ev = [&](int p, std::vector<float>& cfv) {
    for (size_t h = 0; h < cfv.size(); ++h)
      cfv[h] = S[p][h] > 1e-12f ? static_cast<float>(cfv[h] / S[p][h] + n.contrib[p]) : 0.0f;
  };

  std::array<std::vector<float>, 2> ev_tree;
  if (!with_ev) {
    // Navigation only: actions and average strategy, no EV passes.
    for (int p = 0; p < 2; ++p) ev_tree[p].assign(hands_[p].size(), 0.0f);
    if (n.type == NodeType::ACTION) {
      const int q = n.player;
      const size_t nq = hands_[q].size();
      std::vector<float> sigma(static_cast<size_t>(n.num_children) * nq);
      average_strategy(n, sigma.data());
      info.strategy.resize(sigma.size());
      info.action_ev.assign(sigma.size(), 0.0f);
      for (int a = 0; a < n.num_children; ++a) {
        info.actions.push_back(actions_[n.child_begin + a]);
        for (size_t h = 0; h < nq; ++h) info.strategy[a * nq + h] = sigma[a * nq + to_tree[q][h]];
      }
    }
  } else if (n.type == NodeType::ACTION) {
    const int q = n.player;
    const int na = n.num_children;
    const size_t nq = hands_[q].size();
    std::vector<float> sigma(static_cast<size_t>(na) * nq);
    average_strategy(n, sigma.data());
    std::vector<float> aev(static_cast<size_t>(na) * nq);
    for (int a = 0; a < na; ++a) {
      info.actions.push_back(actions_[n.child_begin + a]);
      std::vector<float> cfv(nq), own(nq);
      for (size_t h = 0; h < nq; ++h) own[h] = reach[q][h] * sigma[a * nq + h];
#pragma omp parallel
#pragma omp single
      evaluate(children_[n.child_begin + a], q, reach[1 - q].data(), own.data(), cfv.data(), EvalMode::AVERAGE, 0);
      normalize_ev(q, cfv);
      std::copy(cfv.begin(), cfv.end(), aev.begin() + a * nq);
    }
    ev_tree[q].assign(nq, 0.0f);
    for (int a = 0; a < na; ++a)
      for (size_t h = 0; h < nq; ++h) ev_tree[q][h] += sigma[a * nq + h] * aev[a * nq + h];
    info.strategy.resize(sigma.size());
    info.action_ev.resize(aev.size());
    for (int a = 0; a < na; ++a) {
      for (size_t h = 0; h < nq; ++h) {
        info.strategy[a * nq + h] = sigma[a * nq + to_tree[q][h]];
        info.action_ev[a * nq + h] = aev[a * nq + to_tree[q][h]];
      }
    }
    const int o = 1 - q;
    ev_tree[o].resize(hands_[o].size());
#pragma omp parallel
#pragma omp single
    evaluate(node_id, o, reach[q].data(), reach[o].data(), ev_tree[o].data(), EvalMode::AVERAGE, 0);
    normalize_ev(o, ev_tree[o]);
  } else {
    for (int p = 0; p < 2; ++p) {
      ev_tree[p].resize(hands_[p].size());
#pragma omp parallel
#pragma omp single
      evaluate(node_id, p, reach[1 - p].data(), reach[p].data(), ev_tree[p].data(), EvalMode::AVERAGE, 0);
      normalize_ev(p, ev_tree[p]);
    }
  }
  if (n.type == NodeType::CHANCE) {
    CardMask real_mask = cards_mask(real_board);
    for (int c = 0; c < NUM_CARDS; ++c)
      if (!(real_mask & card_bit(c))) info.deal_cards.push_back(c);
  }

  for (int p = 0; p < 2; ++p) {
    info.reach[p] = to_real(p, reach[p]);
    std::vector<float> wt(hands_[p].size());
    for (size_t h = 0; h < wt.size(); ++h) wt[h] = reach[p][h] * S[p][h];
    info.weight[p] = to_real(p, wt);
    info.ev[p] = to_real(p, ev_tree[p]);
    if (with_equity) info.equity[p] = to_real(p, equity_vs(p, reach[1 - p], n.board));
  }
  return info;
}

}  // namespace flipup

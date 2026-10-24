#include "flipup/multiway.h"

#include <omp.h>

#include <algorithm>
#include <cmath>
#include <stdexcept>

#include "flipup/eval.h"

namespace flipup {

namespace {

// One card per rank clear of the board, suits rotating: a small, even spread of the deck.
std::vector<int> spread_cards(CardMask board) {
  std::vector<int> out;
  for (int rank = 0; rank < 13; ++rank) {
    for (int k = 0; k < 4; ++k) {
      int c = make_card(rank, (rank + k) % 4);
      if (!(board & card_bit(c))) {
        out.push_back(c);
        break;
      }
    }
  }
  return out;
}

inline int popcount8(uint8_t x) { return __builtin_popcount(x); }
inline bool has(uint8_t mask, int p) { return (mask >> p) & 1; }

// Each player's compatible range mass for every combo (zero where the combo touches `board`).
// tot - mass holding either card + the combo itself (counted twice).
void compatible_mass(const float* r, CardMask board, float* out) {
  const auto& t = combo_table();
  double tot = 0;
  double card[NUM_CARDS] = {0};
  for (int c = 0; c < NUM_COMBOS; ++c) {
    float w = r[c];
    if (w == 0) continue;
    tot += w;
    card[t.cards[c][0]] += w;
    card[t.cards[c][1]] += w;
  }
  for (int c = 0; c < NUM_COMBOS; ++c) {
    if (combo_mask(c) & board) {
      out[c] = 0;
      continue;
    }
    out[c] = static_cast<float>(tot - card[t.cards[c][0]] - card[t.cards[c][1]] + r[c]);
  }
}

}  // namespace

MultiwaySolver::MultiwaySolver(const MWConfig& cfg) : cfg_(cfg) {
  np_ = cfg_.players;
  if (np_ < 2 || np_ > MW_MAX_PLAYERS) throw std::invalid_argument("2 to 4 players");
  if (cfg_.board.size() < 3 || cfg_.board.size() > 5) throw std::invalid_argument("board must have 3-5 cards");
  if (static_cast<int>(cfg_.range.size()) != np_) throw std::invalid_argument("one range per player");
  const int street = static_cast<int>(cfg_.board.size()) - 3;
  if (cfg_.end_street < street || cfg_.end_street > 2) throw std::invalid_argument("bad end_street");
  if (cfg_.end_street < 1) throw std::invalid_argument("a flop root must be solved through at least the turn");
  root_board_ = cards_mask(cfg_.board);
  if (static_cast<int>(__builtin_popcountll(root_board_)) != static_cast<int>(cfg_.board.size()))
    throw std::invalid_argument("repeated board card");

  root_reach_.assign(static_cast<size_t>(np_) * NUM_COMBOS, 0.0f);
  for (int p = 0; p < np_; ++p) {
    if (cfg_.range[p].size() != NUM_COMBOS) throw std::invalid_argument("ranges need 1326 weights");
    for (int c = 0; c < NUM_COMBOS; ++c) {
      if (cfg_.range[p][c] > 0 && !(combo_mask(c) & root_board_)) {
        hands_[p].push_back(static_cast<int16_t>(c));
        root_reach_[p * NUM_COMBOS + c] = cfg_.range[p][c];
      }
    }
    if (hands_[p].empty()) throw std::invalid_argument("empty range");
  }
  in_any_.assign(NUM_COMBOS, 0);
  for (int p = 0; p < np_; ++p)
    for (int16_t c : hands_[p]) in_any_[c] = 1;

  BuildState s{};
  s.street = street;
  s.active = static_cast<uint8_t>((1 << np_) - 1);
  s.allin = 0;
  s.acted = 0;
  s.pot = cfg_.pot;
  for (int p = 0; p < np_; ++p) {
    s.contrib[p] = 0;
    s.wager[p] = 0;
    s.stack[p] = cfg_.stack;
  }
  s.to_act = 0;
  s.num_bets = 0;
  s.last_inc = 0;
  s.board = root_board_;
  nodes_.reserve(1 << 16);
  build(s);

  int64_t off = 0;
  for (auto& n : nodes_) {
    if (n.type != 0) continue;
    n.storage = off;
    off += static_cast<int64_t>(hands_[n.actor].size()) * n.num_children;
    ++num_action_;
  }
  double mb = 2.0 * off * sizeof(float) / (1024.0 * 1024.0);
  if (cfg_.max_memory_mb > 0 && mb > cfg_.max_memory_mb)
    throw std::runtime_error("tree too large: " + std::to_string(static_cast<int>(mb)) + " MB");
  regret_.assign(off, 0.0f);
  cum_.assign(off, 0.0f);
}

int MultiwaySolver::next_actor(const BuildState& s, int from) const {
  double maxw = 0;
  for (int p = 0; p < np_; ++p)
    if (has(s.active, p)) maxw = std::max(maxw, s.wager[p]);
  for (int k = 0; k < np_; ++k) {
    int p = (from + k) % np_;
    if (!has(s.active, p) || has(s.allin, p)) continue;
    if (!has(s.acted, p) || s.wager[p] < maxw - 1e-9) return p;
  }
  return -1;
}

int MultiwaySolver::build(const BuildState& s) {
  if (popcount8(s.active) == 1) {
    Node n{};
    n.type = 2;
    n.actor = -1;
    n.street = static_cast<int8_t>(s.street);
    n.active = s.active;
    n.allin = s.allin;
    n.pot = s.pot;
    for (int p = 0; p < np_; ++p) {
      n.contrib[p] = s.contrib[p];
      n.wager[p] = s.wager[p];
    }
    n.board = s.board;
    nodes_.push_back(n);
    return static_cast<int>(nodes_.size()) - 1;
  }
  int actor = next_actor(s, s.to_act);
  // Nobody left to respond: a lone player with chips behind who has already matched skips betting.
  int can_bet = popcount8(static_cast<uint8_t>(s.active & ~s.allin));
  if (actor >= 0 && can_bet <= 1) {
    double maxw = 0;
    for (int p = 0; p < np_; ++p)
      if (has(s.active, p)) maxw = std::max(maxw, s.wager[p]);
    if (s.wager[actor] >= maxw - 1e-9) actor = -1;
  }
  if (actor < 0) return after_betting(s);

  BuildState cur = s;
  cur.to_act = actor;
  auto acts = legal_actions(cur);
  Node n{};
  n.type = 0;
  n.actor = static_cast<int8_t>(actor);
  n.street = static_cast<int8_t>(s.street);
  n.active = s.active;
  n.allin = s.allin;
  n.pot = s.pot;
  for (int p = 0; p < np_; ++p) {
    n.contrib[p] = s.contrib[p];
    n.wager[p] = s.wager[p];
  }
  n.board = s.board;
  n.child_begin = static_cast<int32_t>(children_.size());
  n.num_children = static_cast<int32_t>(acts.size());
  nodes_.push_back(n);
  int id = static_cast<int>(nodes_.size()) - 1;
  children_.resize(children_.size() + acts.size(), -1);
  actions_.resize(children_.size());
  deal_.resize(children_.size(), -1);
  for (size_t k = 0; k < acts.size(); ++k) {
    BuildState ns = acts[k].second;
    ns.to_act = (actor + 1) % np_;
    int child = build(ns);
    children_[n.child_begin + k] = child;
    actions_[n.child_begin + k] = acts[k].first;
  }
  return id;
}

int MultiwaySolver::after_betting(const BuildState& s) {
  Node n{};
  n.street = static_cast<int8_t>(s.street);
  n.active = s.active;
  n.allin = s.allin;
  n.pot = s.pot;
  n.actor = -1;
  for (int p = 0; p < np_; ++p) {
    n.contrib[p] = s.contrib[p];
    n.wager[p] = s.wager[p];
  }
  n.board = s.board;
  if (s.street >= cfg_.end_street) {
    n.type = 3;
    int cards = __builtin_popcountll(s.board);
    if (cards == 5) {
      ensure_board_rank(s.board);
    } else if (!cfg_.deal_subset.empty()) {
      for (int c : spread_cards(s.board)) ensure_board_rank(s.board | card_bit(c));
    } else {
      for (int c = 0; c < NUM_CARDS; ++c)
        if (!(s.board & card_bit(c))) ensure_board_rank(s.board | card_bit(c));
    }
    nodes_.push_back(n);
    return static_cast<int>(nodes_.size()) - 1;
  }
  n.type = 1;
  std::vector<int> cards;
  const bool sample = s.street == static_cast<int>(cfg_.board.size()) - 3 && !cfg_.deal_subset.empty();
  for (int c = 0; c < NUM_CARDS; ++c) {
    if (s.board & card_bit(c)) continue;
    if (sample && std::find(cfg_.deal_subset.begin(), cfg_.deal_subset.end(), c) == cfg_.deal_subset.end()) continue;
    cards.push_back(c);
  }
  n.child_begin = static_cast<int32_t>(children_.size());
  n.num_children = static_cast<int32_t>(cards.size());
  nodes_.push_back(n);
  int id = static_cast<int>(nodes_.size()) - 1;
  children_.resize(children_.size() + cards.size(), -1);
  actions_.resize(children_.size());
  deal_.resize(children_.size(), -1);
  for (size_t k = 0; k < cards.size(); ++k) {
    BuildState ns = s;
    ns.street = s.street + 1;
    ns.board = s.board | card_bit(cards[k]);
    ns.acted = 0;
    ns.num_bets = 0;
    ns.last_inc = 0;
    ns.to_act = 0;
    for (int p = 0; p < np_; ++p) ns.wager[p] = 0;
    int child = build(ns);
    children_[n.child_begin + k] = child;
    deal_[n.child_begin + k] = static_cast<int8_t>(cards[k]);
  }
  return id;
}

std::vector<std::pair<MWAction, MultiwaySolver::BuildState>> MultiwaySolver::legal_actions(const BuildState& s) const {
  std::vector<std::pair<MWAction, BuildState>> out;
  const int p = s.to_act;
  double maxw = 0;
  for (int q = 0; q < np_; ++q)
    if (has(s.active, q)) maxw = std::max(maxw, s.wager[q]);
  const double to_call = maxw - s.wager[p];
  const double stack = s.stack[p];
  bool others = false;
  for (int q = 0; q < np_; ++q)
    if (q != p && has(s.active, q) && !has(s.allin, q)) others = true;

  auto apply = [&](double added) {
    BuildState n = s;
    n.stack[p] -= added;
    n.pot += added;
    n.contrib[p] += added;
    n.wager[p] += added;
    n.acted = static_cast<uint8_t>(s.acted | (1 << p));
    if (n.stack[p] <= 1e-9) {
      n.stack[p] = 0;
      n.allin = static_cast<uint8_t>(n.allin | (1 << p));
    }
    return n;
  };

  // The full menu is only needed on the street this solve answers: later streets get their own solve.
  const bool hero = p == cfg_.hero && s.street == static_cast<int>(cfg_.board.size()) - 3;
  auto finalize = [&](std::vector<double> adds, double pot_ref, bool raising) {
    for (double& d : adds) {
      d = std::min(d, stack);
      double call = s.wager[p] + d - maxw;
      double pot_after = s.pot + d + call;
      if (stack - d <= cfg_.force_allin_threshold * pot_after + 1e-9) d = stack;
    }
    double allin_ref = raising ? (s.wager[p] + stack - maxw) : stack;
    if (hero || allin_ref <= cfg_.add_allin_threshold * pot_ref + 1e-9) adds.push_back(stack);
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
      n.acted = static_cast<uint8_t>(1 << p);  // everyone else has to answer the bet
      MWAction a{};
      a.type = raising ? MWAction::RAISE : MWAction::BET;
      a.amount = n.wager[p];
      a.added = d;
      a.all_in = has(n.allin, p);
      n.last_inc = n.wager[p] - maxw;
      n.num_bets = s.num_bets + 1;
      out.push_back({a, n});
    }
  };

  if (to_call > 1e-9) {
    BuildState f = s;
    f.active = static_cast<uint8_t>(s.active & ~(1 << p));
    f.acted = static_cast<uint8_t>(s.acted | (1 << p));
    out.push_back({MWAction{MWAction::FOLD, 0, 0, false}, f});
    double added = std::min(to_call, stack);
    BuildState c = apply(added);
    out.push_back({MWAction{MWAction::CALL, c.wager[p], added, has(c.allin, p)}, c});
    if (others && stack > to_call + 1e-9 && (s.num_bets - 1) < cfg_.max_raises) {
      double pot_after_call = s.pot + to_call;
      double min_to = maxw + std::max(s.last_inc, cfg_.min_bet);
      std::vector<double> adds;
      for (double frac : hero ? cfg_.hero_raise[s.street] : cfg_.raise[s.street]) {
        double to = std::max(maxw + frac * pot_after_call, min_to);
        adds.push_back(to - s.wager[p]);
      }
      finalize(adds, pot_after_call, true);
    } else if (hero && others && stack > to_call + 1e-9) {
      // Past the raise cap the quiz player can still move all in.
      finalize({}, s.pot + to_call, true);
    }
  } else {
    BuildState c = s;
    c.acted = static_cast<uint8_t>(s.acted | (1 << p));
    out.push_back({MWAction{MWAction::CHECK, 0, 0, false}, c});
    if (others && stack > 1e-9) {
      std::vector<double> adds;
      for (double frac : hero ? cfg_.hero_bet[s.street] : cfg_.bet[s.street]) adds.push_back(std::max(frac * s.pot, cfg_.min_bet));
      if (hero || !adds.empty() || stack <= cfg_.add_allin_threshold * s.pot) finalize(adds, s.pot, false);
    }
  }
  return out;
}

void MultiwaySolver::ensure_board_rank(CardMask board) {
  if (ranks_.count(board)) return;
  std::vector<std::pair<uint32_t, int16_t>> v;
  v.reserve(NUM_COMBOS);
  for (int c = 0; c < NUM_COMBOS; ++c) {
    CardMask m = combo_mask(c);
    if (!in_any_[c] || (m & board)) continue;
    v.push_back({evaluate_mask(board | m), static_cast<int16_t>(c)});
  }
  std::sort(v.begin(), v.end());
  BoardRank br;
  br.sorted.reserve(v.size());
  for (size_t k = 0; k < v.size(); ++k) {
    int c = v[k].second;
    br.sorted.push_back({static_cast<int16_t>(c), static_cast<uint8_t>(combo_card(c, 0)), static_cast<uint8_t>(combo_card(c, 1))});
    if (k == 0 || v[k].first != v[k - 1].first) br.groups.push_back(static_cast<int32_t>(k));
  }
  br.groups.push_back(static_cast<int32_t>(v.size()));
  ranks_.emplace(board, std::move(br));
}

const MultiwaySolver::BoardRank& MultiwaySolver::board_rank(CardMask board) const { return ranks_.at(board); }

void MultiwaySolver::current_strategy(const Node& n, float* out) const {
  const size_t H = hands_[n.actor].size();
  const int A = n.num_children;
  const float* r = regret_.data() + n.storage;
  for (size_t h = 0; h < H; ++h) {
    float sum = 0;
    for (int a = 0; a < A; ++a) sum += std::max(r[a * H + h], 0.0f);
    if (sum > 0) {
      for (int a = 0; a < A; ++a) out[a * H + h] = std::max(r[a * H + h], 0.0f) / sum;
    } else {
      for (int a = 0; a < A; ++a) out[a * H + h] = 1.0f / A;
    }
  }
}

void MultiwaySolver::average_strategy(const Node& n, float* out) const {
  const size_t H = hands_[n.actor].size();
  const int A = n.num_children;
  const float* s = cum_.data() + n.storage;
  for (size_t h = 0; h < H; ++h) {
    float sum = 0;
    for (int a = 0; a < A; ++a) sum += s[a * H + h];
    if (sum > 0) {
      for (int a = 0; a < A; ++a) out[a * H + h] = s[a * H + h] / sum;
    } else {
      for (int a = 0; a < A; ++a) out[a * H + h] = 1.0f / A;
    }
  }
}

void MultiwaySolver::others_mass(const Node& n, int i, const float* reach, float* out) const {
  std::fill(out, out + NUM_COMBOS, 1.0f);
  std::vector<float> m(NUM_COMBOS);
  for (int j = 0; j < np_; ++j) {
    if (j == i) continue;
    compatible_mass(reach + j * NUM_COMBOS, n.board, m.data());
    for (int c = 0; c < NUM_COMBOS; ++c) out[c] *= m[c];
  }
}

// Showdown on a complete board: adds each combo's value for player i to `out`.
void MultiwaySolver::showdown_board(const Node& n, int i, const float* reach, const BoardRank& br, float* out,
                                    bool count_folded) const {
  const size_t L = br.sorted.size();
  // Scratch space reused across calls (one set per thread).
  thread_local std::vector<float> coef, allm, fm, W, T, M;
  coef.assign(MW_MAX_PLAYERS * L, 0.0f);  // share polynomial: coef[m * L + q] for m ties
  allm.assign(L, 1.0f);
  fm.assign(L, 1.0f);
  W.resize(L);
  T.resize(L);
  M.resize(L);
  for (size_t q = 0; q < L; ++q) coef[q] = 1.0f;
  int deg = 0;
  const RankEntry* e = br.sorted.data();
  for (int j = 0; j < np_; ++j) {
    if (j == i || (!count_folded && !has(n.active, j))) continue;
    const float* r = reach + j * NUM_COMBOS;
    double tot = 0;
    double card[NUM_CARDS] = {0};
    for (size_t q = 0; q < L; ++q) {
      float w = r[e[q].combo];
      tot += w;
      card[e[q].a] += w;
      card[e[q].b] += w;
    }
    for (size_t q = 0; q < L; ++q)
      M[q] = static_cast<float>(tot - card[e[q].a] - card[e[q].b] + r[e[q].combo]);
    if (!has(n.active, j)) {
      for (size_t q = 0; q < L; ++q) fm[q] *= M[q];
      continue;
    }
    // Mass below (W) and tied (T), group by group of equal strength.
    double below = 0;
    double bcard[NUM_CARDS] = {0};
    double gcard[NUM_CARDS] = {0};
    for (size_t g = 0; g + 1 < br.groups.size(); ++g) {
      const size_t k0 = br.groups[g], k1 = br.groups[g + 1];
      double gtot = 0;
      for (size_t q = k0; q < k1; ++q) {
        float w = r[e[q].combo];
        gtot += w;
        gcard[e[q].a] += w;
        gcard[e[q].b] += w;
      }
      for (size_t q = k0; q < k1; ++q) {
        W[q] = static_cast<float>(below - bcard[e[q].a] - bcard[e[q].b]);
        T[q] = static_cast<float>(gtot - gcard[e[q].a] - gcard[e[q].b] + r[e[q].combo]);
      }
      for (size_t q = k0; q < k1; ++q) {
        float w = r[e[q].combo];
        below += w;
        bcard[e[q].a] += w;
        bcard[e[q].b] += w;
        gcard[e[q].a] = 0;
        gcard[e[q].b] = 0;
      }
    }
    // Multiply the polynomial by (W + T x).
    for (size_t q = 0; q < L; ++q) {
      float w = std::max(W[q], 0.0f), tt = std::max(T[q], 0.0f);
      for (int m = deg + 1; m >= 1; --m) coef[m * L + q] = coef[m * L + q] * w + coef[(m - 1) * L + q] * tt;
      coef[q] *= w;
      allm[q] *= M[q];
    }
    ++deg;
  }
  const double pot = n.pot, mine = n.contrib[i];
  for (size_t q = 0; q < L; ++q) {
    double share = coef[q];
    for (int m = 1; m <= deg; ++m) share += coef[m * L + q] / (m + 1.0);
    out[e[q].combo] += static_cast<float>(fm[q] * (pot * share - mine * allm[q]));
  }
}

void MultiwaySolver::terminal_value(const Node& n, int i, const float* reach, float* out) const {
  std::fill(out, out + NUM_COMBOS, 0.0f);
  if (n.type == 2 || !has(n.active, i)) {
    std::vector<float> m(NUM_COMBOS);
    others_mass(n, i, reach, m.data());
    double v = has(n.active, i) ? n.pot - n.contrib[i] : -n.contrib[i];
    for (int c = 0; c < NUM_COMBOS; ++c) out[c] = static_cast<float>(v * m[c]);
    return;
  }
  int cards = __builtin_popcountll(n.board);
  if (cards == 5) {
    showdown_board(n, i, reach, board_rank(n.board), out);
    return;
  }
  // One card to come, checked down: average over it (over a spread of cards when the solve samples).
  const int D = NUM_CARDS - cards;
  if (!cfg_.deal_subset.empty()) {
    std::vector<int> rivers = spread_cards(n.board);
    CardMask dealt = 0;
    for (int c : rivers) {
      showdown_board(n, i, reach, board_rank(n.board | card_bit(c)), out);
      dealt |= card_bit(c);
    }
    const int K = static_cast<int>(rivers.size());
    for (int c = 0; c < NUM_COMBOS; ++c) {
      int usable = K - __builtin_popcountll(combo_mask(c) & dealt);
      out[c] *= usable > 0 ? static_cast<float>(D - 2) / (usable * static_cast<float>(D - 2 * np_)) : 0.0f;
    }
    return;
  }
  for (int c = 0; c < NUM_CARDS; ++c) {
    if (n.board & card_bit(c)) continue;
    showdown_board(n, i, reach, board_rank(n.board | card_bit(c)), out);
  }
  float scale = 1.0f / static_cast<float>(D - 2 * np_);
  for (int c = 0; c < NUM_COMBOS; ++c) out[c] *= scale;
}

void MultiwaySolver::walk(int node, int i, const float* reach, float* out, const Discount& d, int mode, int depth) {
  const Node& n = nodes_[node];
  if (n.type >= 2) {
    terminal_value(n, i, reach, out);
    return;
  }
  const size_t R = static_cast<size_t>(np_) * NUM_COMBOS;
  if (n.type == 1) {
    const int K = n.num_children;
    std::fill(out, out + NUM_COMBOS, 0.0f);
    std::vector<std::vector<float>> res(K);
    auto run = [&](int k) {
      int card = deal_[n.child_begin + k];
      std::vector<float> r(reach, reach + R);
      for (int c = 0; c < NUM_COMBOS; ++c)
        if (combo_mask(c) & card_bit(card))
          for (int p = 0; p < np_; ++p) r[p * NUM_COMBOS + c] = 0;
      res[k].assign(NUM_COMBOS, 0.0f);
      walk(children_[n.child_begin + k], i, r.data(), res[k].data(), d, mode, depth + 1);
      for (int c = 0; c < NUM_COMBOS; ++c)
        if (combo_mask(c) & card_bit(card)) res[k][c] = 0;
    };
    // The first cards dealt after the root split the work across threads.
    if (n.street == static_cast<int>(cfg_.board.size()) - 3 && omp_in_parallel()) {
      for (int k = 0; k < K; ++k) {
#pragma omp task shared(res) firstprivate(k)
        run(k);
      }
#pragma omp taskwait
    } else {
      for (int k = 0; k < K; ++k) run(k);
    }
    for (int k = 0; k < K; ++k)
      for (int c = 0; c < NUM_COMBOS; ++c) out[c] += res[k][c];
    const int D = NUM_CARDS - __builtin_popcountll(n.board);
    const int free = D - 2;  // cards that can come for a given hand of ours
    if (K < free) {
      // A sample of the deck: scale each hand's sum up to the whole deck, (D-2) / |sample not touching it|.
      CardMask dealt = 0;
      for (int k = 0; k < K; ++k) dealt |= card_bit(deal_[n.child_begin + k]);
      for (int c = 0; c < NUM_COMBOS; ++c) {
        int usable = K - __builtin_popcountll(combo_mask(c) & dealt);
        out[c] *= usable > 0 ? static_cast<float>(free) / (usable * static_cast<float>(D - 2 * np_)) : 0.0f;
      }
    } else {
      float scale = 1.0f / static_cast<float>(D - 2 * np_);
      for (int c = 0; c < NUM_COMBOS; ++c) out[c] *= scale;
    }
    return;
  }

  const int a = n.actor;
  const auto& H = hands_[a];
  const size_t HN = H.size();
  const int A = n.num_children;
  std::vector<float> sigma(static_cast<size_t>(A) * HN);
  if (mode == 0)
    current_strategy(n, sigma.data());
  else
    average_strategy(n, sigma.data());

  if (a != i) {
    std::fill(out, out + NUM_COMBOS, 0.0f);
    std::vector<float> r(reach, reach + R);
    std::vector<float> child(NUM_COMBOS);
    for (int k = 0; k < A; ++k) {
      float* ra = r.data() + a * NUM_COMBOS;
      const float* base = reach + a * NUM_COMBOS;
      for (size_t h = 0; h < HN; ++h) ra[H[h]] = base[H[h]] * sigma[k * HN + h];
      walk(children_[n.child_begin + k], i, r.data(), child.data(), d, mode, depth + 1);
      for (int c = 0; c < NUM_COMBOS; ++c) out[c] += child[c];
    }
    return;
  }

  std::vector<float> child(static_cast<size_t>(A) * NUM_COMBOS);
  std::vector<float> r(reach, reach + R);
  for (int k = 0; k < A; ++k) {
    float* co = child.data() + static_cast<size_t>(k) * NUM_COMBOS;
    if (actions_[n.child_begin + k].type == MWAction::FOLD) {
      std::vector<float> m(NUM_COMBOS);
      others_mass(n, i, reach, m.data());
      float v = static_cast<float>(-n.contrib[i]);
      for (int c = 0; c < NUM_COMBOS; ++c) co[c] = v * m[c];
      continue;
    }
    float* ri = r.data() + i * NUM_COMBOS;
    const float* base = reach + i * NUM_COMBOS;
    for (size_t h = 0; h < HN; ++h) ri[H[h]] = base[H[h]] * sigma[k * HN + h];
    walk(children_[n.child_begin + k], i, r.data(), co, d, mode, depth + 1);
  }
  std::fill(out, out + NUM_COMBOS, 0.0f);
  if (mode == 2) {
    for (size_t h = 0; h < HN; ++h) {
      float best = -1e30f;
      for (int k = 0; k < A; ++k) best = std::max(best, child[static_cast<size_t>(k) * NUM_COMBOS + H[h]]);
      out[H[h]] = best;
    }
    return;
  }
  for (size_t h = 0; h < HN; ++h) {
    float v = 0;
    for (int k = 0; k < A; ++k) v += sigma[k * HN + h] * child[static_cast<size_t>(k) * NUM_COMBOS + H[h]];
    out[H[h]] = v;
  }
  if (mode != 0) return;
  float* rg = regret_.data() + n.storage;
  float* cs = cum_.data() + n.storage;
  const float* own = reach + i * NUM_COMBOS;
  for (int k = 0; k < A; ++k) {
    for (size_t h = 0; h < HN; ++h) {
      size_t x = k * HN + h;
      float prev = rg[x];
      rg[x] = (prev > 0 ? prev * d.pos : 0.0f) + child[static_cast<size_t>(k) * NUM_COMBOS + H[h]] - out[H[h]];
      cs[x] = cs[x] * d.strat + own[H[h]] * sigma[x];
    }
  }
}

void MultiwaySolver::iterate(int iterations) {
  for (int it = 0; it < iterations && !stop_; ++it) {
    ++iteration_;
    double t = iteration_;
    double ta = std::pow(t - 1, cfg_.dcfr_alpha);
    Discount d{static_cast<float>(ta / (ta + 1)), static_cast<float>(std::pow((t - 1) / t, cfg_.dcfr_gamma))};
    for (int p = 0; p < np_; ++p) {
      std::vector<float> out(NUM_COMBOS);
#pragma omp parallel
#pragma omp single
      walk(0, p, root_reach_.data(), out.data(), d, 0, 0);
    }
  }
}

std::vector<double> MultiwaySolver::root_ev() {
  std::vector<double> ev(np_);
  Discount d{1, 1};
  for (int p = 0; p < np_; ++p) {
    std::vector<float> out(NUM_COMBOS), m(NUM_COMBOS);
#pragma omp parallel
#pragma omp single
    walk(0, p, root_reach_.data(), out.data(), d, 1, 0);
    others_mass(nodes_[0], p, root_reach_.data(), m.data());
    double num = 0, den = 0;
    for (int c = 0; c < NUM_COMBOS; ++c) {
      float w = root_reach_[p * NUM_COMBOS + c];
      num += w * out[c];
      den += w * m[c];
    }
    ev[p] = den > 0 ? num / den : 0;
  }
  return ev;
}

double MultiwaySolver::exploitability_pct() {
  Discount d{1, 1};
  double gain = 0;
  for (int p = 0; p < np_; ++p) {
    std::vector<float> avg(NUM_COMBOS), br(NUM_COMBOS), m(NUM_COMBOS);
#pragma omp parallel
#pragma omp single
    {
      walk(0, p, root_reach_.data(), avg.data(), d, 1, 0);
      walk(0, p, root_reach_.data(), br.data(), d, 2, 0);
    }
    others_mass(nodes_[0], p, root_reach_.data(), m.data());
    double num = 0, den = 0;
    for (int c = 0; c < NUM_COMBOS; ++c) {
      float w = root_reach_[p * NUM_COMBOS + c];
      num += w * (br[c] - avg[c]);
      den += w * m[c];
    }
    if (den > 0) gain += num / den;
  }
  return 100.0 * gain / np_ / cfg_.pot;
}

MWNodeInfo MultiwaySolver::query(const std::vector<int>& path, bool with_ev, bool with_equity) {
  std::vector<float> reach(root_reach_);
  int node = 0;
  for (int step : path) {
    const Node& n = nodes_[node];
    if (n.type == 0) {
      if (step < 0 || step >= n.num_children) throw std::invalid_argument("bad action index");
      const auto& H = hands_[n.actor];
      std::vector<float> sigma(static_cast<size_t>(n.num_children) * H.size());
      average_strategy(n, sigma.data());
      float* ra = reach.data() + n.actor * NUM_COMBOS;
      for (size_t h = 0; h < H.size(); ++h) ra[H[h]] *= sigma[step * H.size() + h];
      node = children_[n.child_begin + step];
    } else if (n.type == 1) {
      int k = -1;
      for (int q = 0; q < n.num_children; ++q)
        if (deal_[n.child_begin + q] == step) k = q;
      if (k < 0) throw std::invalid_argument("card can't be dealt here");
      for (int c = 0; c < NUM_COMBOS; ++c)
        if (combo_mask(c) & card_bit(step))
          for (int p = 0; p < np_; ++p) reach[p * NUM_COMBOS + c] = 0;
      node = children_[n.child_begin + k];
    } else {
      throw std::invalid_argument("path continues past the end of the hand");
    }
  }
  const Node& n = nodes_[node];
  MWNodeInfo info;
  info.type = n.type;
  info.player = n.actor;
  info.street = n.street;
  info.pot = n.pot;
  for (int p = 0; p < np_; ++p) {
    info.contrib.push_back(n.contrib[p]);
    info.wager.push_back(n.wager[p]);
    info.active.push_back(has(n.active, p));
    info.reach.emplace_back(reach.begin() + p * NUM_COMBOS, reach.begin() + (p + 1) * NUM_COMBOS);
  }
  for (int c = 0; c < NUM_CARDS; ++c)
    if (n.board & card_bit(c)) info.board.push_back(c);
  if (n.type == 0) {
    const auto& H = hands_[n.actor];
    std::vector<float> sigma(static_cast<size_t>(n.num_children) * H.size());
    average_strategy(n, sigma.data());
    for (int k = 0; k < n.num_children; ++k) {
      info.actions.push_back(actions_[n.child_begin + k]);
      std::vector<float> s(NUM_COMBOS, 0.0f);
      for (size_t h = 0; h < H.size(); ++h) s[H[h]] = sigma[k * H.size() + h];
      info.strategy.push_back(std::move(s));
    }
  } else if (n.type == 1) {
    for (int k = 0; k < n.num_children; ++k) info.deal_cards.push_back(deal_[n.child_begin + k]);
  }
  Discount d{1, 1};
  if (with_ev) {
    for (int p = 0; p < np_; ++p) {
      std::vector<float> out(NUM_COMBOS), m(NUM_COMBOS), ev(NUM_COMBOS, 0.0f);
      if (has(n.active, p)) {
#pragma omp parallel
#pragma omp single
        walk(node, p, reach.data(), out.data(), d, 1, 0);
        others_mass(n, p, reach.data(), m.data());
        for (int c = 0; c < NUM_COMBOS; ++c)
          if (m[c] > 1e-12f && !(combo_mask(c) & n.board)) ev[c] = out[c] / m[c] + static_cast<float>(n.contrib[p]);
      }
      info.ev.push_back(std::move(ev));
    }
    if (n.type == 0) {
      const int a = n.actor;
      std::vector<float> m(NUM_COMBOS);
      others_mass(n, a, reach.data(), m.data());
      for (int k = 0; k < n.num_children; ++k) {
        std::vector<float> ev(NUM_COMBOS, 0.0f);
        if (actions_[n.child_begin + k].type != MWAction::FOLD) {
          std::vector<float> out(NUM_COMBOS);
#pragma omp parallel
#pragma omp single
          walk(children_[n.child_begin + k], a, reach.data(), out.data(), d, 1, 0);
          for (int c = 0; c < NUM_COMBOS; ++c)
            if (m[c] > 1e-12f && !(combo_mask(c) & n.board)) ev[c] = out[c] / m[c] + static_cast<float>(n.contrib[a]);
        }
        info.action_ev.push_back(std::move(ev));
      }
    }
  }
  if (with_equity) {
    // Showdown share against the active opponents' ranges here, over every way the board can finish.
    std::vector<CardMask> boards;
    int cards = __builtin_popcountll(n.board);
    if (cards == 5) {
      boards.push_back(n.board);
    } else if (cards == 4) {
      for (int c = 0; c < NUM_CARDS; ++c)
        if (!(n.board & card_bit(c))) boards.push_back(n.board | card_bit(c));
    } else {
      for (int c = 0; c < NUM_CARDS; ++c)
        for (int e = c + 1; e < NUM_CARDS; ++e)
          if (!(n.board & (card_bit(c) | card_bit(e)))) boards.push_back(n.board | card_bit(c) | card_bit(e));
    }
    for (CardMask b : boards) ensure_board_rank(b);
    // Only the active players count; value with a pot of 1 and nothing put in.
    const std::vector<float>& r = reach;
    Node eqn = n;
    eqn.pot = 1;
    for (int p = 0; p < np_; ++p) eqn.contrib[p] = 0;
    for (int p = 0; p < np_; ++p) {
      std::vector<float> eq(NUM_COMBOS, 0.0f);
      if (has(n.active, p)) {
        std::vector<float> share(NUM_COMBOS, 0.0f), mass(NUM_COMBOS, 0.0f), m(NUM_COMBOS);
        for (CardMask b : boards) {
          showdown_board(eqn, p, r.data(), board_rank(b), share.data(), false);
          // Mass of the active opponents on this board.
          std::fill(m.begin(), m.end(), 1.0f);
          std::vector<float> mj(NUM_COMBOS);
          for (int j = 0; j < np_; ++j) {
            if (j == p || !has(n.active, j)) continue;
            compatible_mass(r.data() + j * NUM_COMBOS, b, mj.data());
            for (int c = 0; c < NUM_COMBOS; ++c) m[c] *= mj[c];
          }
          for (int c = 0; c < NUM_COMBOS; ++c) mass[c] += m[c];
        }
        for (int c = 0; c < NUM_COMBOS; ++c)
          if (mass[c] > 1e-12f) eq[c] = share[c] / mass[c];
      }
      info.equity.push_back(std::move(eq));
    }
  }
  return info;
}

}  // namespace flipup

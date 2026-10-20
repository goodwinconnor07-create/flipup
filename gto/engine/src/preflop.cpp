#include "flipup/preflop.h"

#include <omp.h>

#include <algorithm>
#include <cmath>
#include <numeric>
#include <stdexcept>

namespace flipup {

namespace {
constexpr int C = PF_CLASSES;
constexpr double EPS = 1e-9;
constexpr double kMinAverageReach = 1e-3;

int class_combo_count(int c) {
  int row = c / 13, col = c % 13;
  if (row == col) return 6;
  return col > row ? 4 : 12;
}
}  // namespace

std::vector<std::string> position_names(int n) {
  switch (n) {
    case 2: return {"BTN", "BB"};
    case 3: return {"BTN", "SB", "BB"};
    case 4: return {"CO", "BTN", "SB", "BB"};
    case 5: return {"HJ", "CO", "BTN", "SB", "BB"};
    case 6: return {"UTG", "HJ", "CO", "BTN", "SB", "BB"};
    case 7: return {"UTG", "LJ", "HJ", "CO", "BTN", "SB", "BB"};
    case 8: return {"UTG", "UTG+1", "LJ", "HJ", "CO", "BTN", "SB", "BB"};
    case 9: return {"UTG", "UTG+1", "UTG+2", "LJ", "HJ", "CO", "BTN", "SB", "BB"};
  }
  throw std::invalid_argument("2 to 9 players");
}

struct PreflopSolver::State {
  std::array<double, 9> bet{}, stack{};
  uint16_t folded = 0, allin = 0, acted = 0;
  int to_act = 0;
  double cur_bet = 0, last_raise = 0;
  int raises = 0, limpers = 0, callers = 0, last_raiser = -1;
  int step = 0;  // decisions made so far
};

PreflopSolver::PreflopSolver(const PreflopConfig& cfg) : cfg_(cfg), N_(cfg.num_players) {
  if (N_ < 2 || N_ > 9) throw std::invalid_argument("num_players must be 2..9");
  if (static_cast<int>(cfg_.stacks.size()) != N_) throw std::invalid_argument("stacks: one per player");
  if (static_cast<int>(cfg_.open_size.size()) != N_) throw std::invalid_argument("open_size: one per player");
  if (cfg_.can_limp.empty()) cfg_.can_limp.assign(N_, 0);
  if (static_cast<int>(cfg_.can_limp.size()) != N_) throw std::invalid_argument("can_limp: one per player");
  if (cfg_.equity.size() != C * C || cfg_.pairs.size() != C * C)
    throw std::invalid_argument("equity and pairs tables (169x169) are required");
  if (cfg_.initial_range.empty()) cfg_.initial_range.assign(N_, std::vector<float>(C, 1.0f));
  if (static_cast<int>(cfg_.initial_range.size()) != N_) throw std::invalid_argument("initial_range per player");
  const float neutral = cfg_.eqr_model == 1 ? 0.0f : 1.0f;
  if (cfg_.class_eqr_ip.empty()) cfg_.class_eqr_ip.assign(C, neutral);
  if (cfg_.class_eqr_oop.empty()) cfg_.class_eqr_oop.assign(C, neutral);
  size_t tsize = static_cast<size_t>(C) * cfg_.tensor_rank * C;
  if (cfg_.tensor_rank <= 0 || cfg_.tensor_a.size() != tsize || cfg_.tensor_b.size() != tsize)
    cfg_.max_players_flop = std::min(cfg_.max_players_flop, 2);
  cfg_.max_players_flop = std::clamp(cfg_.max_players_flop, 2, N_);

  class_combos_.resize(C);
  for (int c = 0; c < C; ++c) class_combos_[c] = static_cast<float>(class_combo_count(c));
  Pn_.assign(C * C, 0.0f);
  Weq_.assign(C * C, 0.0f);
  for (int h = 0; h < C; ++h)
    for (int o = 0; o < C; ++o) {
      float pn = cfg_.pairs[h * C + o] / (class_combos_[h] * 1225.0f);
      Pn_[h * C + o] = pn;
      Weq_[h * C + o] = pn * cfg_.equity[h * C + o];
    }
  for (int b = 0; b < 4; ++b) {
    std::vector<float> S(C * C);
    for (int h = 0; h < C; ++h)
      for (int o = 0; o < C; ++o) {
        double e = cfg_.equity[h * C + o];
        // Class adjustments matter less as stacks get shallow (pots play closer to all-in).
        static const double fade[4] = {0.0, 0.5, 0.8, 1.0};
        if (cfg_.eqr_model == 1) {
          // Additive: IP share = equity + (adj_ip[h] - adj_oop[o]). Shares may leave [0, 1]:
          // strong hands win more than the pot on later streets, weak ones less than their equity.
          S[h * C + o] = static_cast<float>(e + fade[b] * (cfg_.class_eqr_ip[h] - cfg_.class_eqr_oop[o]));
          continue;
        }
        double rip = cfg_.eqr_ip[b] * (1.0 + (cfg_.class_eqr_ip[h] - 1.0) * fade[b]);
        double roop = cfg_.eqr_oop[b] * (1.0 + (cfg_.class_eqr_oop[o] - 1.0) * fade[b]);
        double den = e * rip + (1 - e) * roop;
        S[h * C + o] = static_cast<float>(den > 0 ? e * rip / den : 0.5);
      }
    Wip_[b].resize(C * C);
    Woop_[b].resize(C * C);
    for (int h = 0; h < C; ++h)
      for (int o = 0; o < C; ++o) {
        Wip_[b][h * C + o] = Pn_[h * C + o] * S[h * C + o];
        Woop_[b][h * C + o] = Pn_[h * C + o] * (1.0f - S[o * C + h]);
      }
  }
  if (!cfg_.kind_eqr_present.empty()) {
    const size_t need = static_cast<size_t>(kNumPotKinds) * C;
    if (cfg_.kind_eqr_ip.size() != need || cfg_.kind_eqr_oop.size() != need ||
        static_cast<int>(cfg_.kind_eqr_present.size()) != kNumPotKinds)
      throw std::invalid_argument("kind_eqr_*: 7 x 169 adjustments and 7 present flags");
    for (int k = 0; k < kNumPotKinds; ++k) {
      if (!cfg_.kind_eqr_present[k]) continue;
      const float* aip = cfg_.kind_eqr_ip.data() + k * C;
      const float* aoop = cfg_.kind_eqr_oop.data() + k * C;
      Kip_[k].resize(C * C);
      Koop_[k].resize(C * C);
      for (int h = 0; h < C; ++h)
        for (int o = 0; o < C; ++o) {
          // IP's share against OOP's class; OOP's share is one minus IP's share from IP's side.
          float sip = static_cast<float>(cfg_.equity[h * C + o]) + aip[h] - aoop[o];
          float sip_rev = static_cast<float>(cfg_.equity[o * C + h]) + aip[o] - aoop[h];
          Kip_[k][h * C + o] = Pn_[h * C + o] * sip;
          Koop_[k][h * C + o] = Pn_[h * C + o] * (1.0f - sip_rev);
        }
    }
  }

  if (cfg_.max_players_flop >= 3) {
    const int R = cfg_.tensor_rank;
    TA_.resize(static_cast<size_t>(C) * R * C);
    TB_.resize(TA_.size());
    for (int h = 0; h < C; ++h)
      for (int r = 0; r < R; ++r)
        for (int o = 0; o < C; ++o) {
          size_t idx = (static_cast<size_t>(h) * R + r) * C + o;
          TA_[idx] = cfg_.tensor_a[idx] * Pn_[h * C + o];
          TB_[idx] = cfg_.tensor_b[idx] * Pn_[h * C + o];
        }
  }

  State s;
  int sbp = (N_ == 2) ? 0 : N_ - 2, bbp = N_ - 1;
  for (int p = 0; p < N_; ++p) {
    if (cfg_.stacks[p] <= cfg_.ante) throw std::invalid_argument("stack too small");
    s.stack[p] = cfg_.stacks[p] - cfg_.ante;
  }
  auto post = [&](int p, double amt) {
    amt = std::min(amt, s.stack[p]);
    s.bet[p] += amt;
    s.stack[p] -= amt;
    if (s.stack[p] <= EPS) s.allin |= 1u << p;
  };
  post(sbp, cfg_.sb);
  post(bbp, cfg_.bb);
  s.cur_bet = cfg_.bb;
  s.last_raise = cfg_.bb;
  s.to_act = 0;
  build(s);

  long off = 0;
  for (auto& n : nodes_)
    if (n.type == 0) {
      n.storage = off;
      off += static_cast<long>(n.num_children) * C;
      ++num_action_nodes_;
    }
  regret_.assign(off, 0.0f);
  cum_.assign(off, 0.0f);
}

int PreflopSolver::postflop_rank(int p) const {
  if (N_ == 2) return p == 1 ? 0 : 1;
  if (p == N_ - 2) return 0;
  if (p == N_ - 1) return 1;
  return 2 + p;
}

int PreflopSolver::build(const State& s) {
  int id = static_cast<int>(nodes_.size());
  Node node;
  node.type = 0;
  node.player = s.to_act;
  nodes_.push_back(node);

  const int p = s.to_act;
  const double to_call = s.cur_bet - s.bet[p];
  const double max_to = s.bet[p] + s.stack[p];
  std::vector<std::pair<PreflopAction, State>> acts;

  auto finish = [&](State ns, int actor) -> State {
    ns.acted |= 1u << actor;
    return ns;
  };

  int live_others = 0;  // other players who are not folded and not all-in
  for (int q = 0; q < N_; ++q)
    if (q != p && !(s.folded >> q & 1) && !(s.allin >> q & 1)) ++live_others;

  if (to_call > EPS) {
    State ns = s;
    ns.folded |= 1u << p;
    acts.push_back({{PreflopAction::FOLD, s.bet[p], 0}, finish(ns, p)});

    bool limp = s.raises == 0;
    int matched = 0;
    for (int q = 0; q < N_; ++q)
      if (q != p && !(s.folded >> q & 1) && s.bet[q] >= s.cur_bet - EPS) ++matched;
    bool cap_ok = matched + 1 <= cfg_.max_players_flop;
    if (matched + 1 >= 3 && cfg_.multiway_blinds_only && p < N_ - 2 && N_ > 2) cap_ok = false;
    // The cap keeps flops to the players the equity model handles. Calling an all-in never sees
    // a flop decision, and denying it locked raisers out of pots (folding AA to a shove once the
    // blinds had called), which made every 3-bet look like a losing play.
    const bool facing_allin = s.last_raiser >= 0 && (s.allin >> s.last_raiser & 1);
    if (facing_allin) cap_ok = true;
    bool allowed = limp ? (cfg_.can_limp[p] != 0) : (cfg_.allow_cold_call || p >= N_ - 2);
    if (limp && !cap_ok) allowed = false;
    if (!limp && !cap_ok) allowed = false;
    if (allowed) {
      State c = s;
      double amt = std::min(to_call, s.stack[p]);
      c.bet[p] += amt;
      c.stack[p] -= amt;
      if (c.stack[p] <= EPS) c.allin |= 1u << p;
      if (limp) ++c.limpers; else ++c.callers;
      acts.push_back({{PreflopAction::CALL, c.bet[p], amt}, finish(c, p)});
    }
  } else {
    acts.push_back({{PreflopAction::CHECK, s.bet[p], 0}, finish(s, p)});
  }

  bool can_raise = s.raises < cfg_.max_raises && s.stack[p] > to_call + EPS && live_others > 0;
  if (can_raise) {
    double target;
    bool ip = s.last_raiser >= 0 && postflop_rank(p) > postflop_rank(s.last_raiser);
    if (s.raises == 0) {
      if (p == N_ - 1 && s.limpers > 0)
        target = cfg_.bb_raise_vs_limp * cfg_.bb + cfg_.iso_per_limper * cfg_.bb * (s.limpers - 1);
      else
        target = cfg_.open_size[p] * cfg_.bb + cfg_.iso_per_limper * cfg_.bb * s.limpers;
    } else if (s.raises == 1) {
      target = s.cur_bet * ((ip ? cfg_.threebet_ip : cfg_.threebet_oop) + cfg_.squeeze_per_caller * s.callers);
    } else if (s.raises == 2) {
      target = s.cur_bet * (ip ? cfg_.fourbet_ip : cfg_.fourbet_oop);
    } else {
      target = max_to;
    }
    target = std::max(target, s.cur_bet + s.last_raise);
    bool is_allin = target >= cfg_.allin_threshold * max_to - EPS || target >= max_to - EPS;
    if (is_allin) target = max_to;
    std::vector<double> targets = {target};
    bool offer_allin = (max_to <= cfg_.allin_option_stack * cfg_.bb) || s.raises >= 2;
    if (offer_allin && !is_allin) targets.push_back(max_to);
    for (double t : targets) {
      State r = s;
      double amt = t - s.bet[p];
      r.bet[p] = t;
      r.stack[p] -= amt;
      bool all = r.stack[p] <= EPS;
      if (all) {
        r.stack[p] = 0;
        r.allin |= 1u << p;
      }
      if (t > s.cur_bet + EPS) {
        r.last_raise = std::max(s.last_raise, t - s.cur_bet);
        r.cur_bet = t;
        r.raises = s.raises + 1;
        r.last_raiser = p;
        r.callers = 0;
        r.acted = 0;
      }
      acts.push_back({{all ? PreflopAction::ALLIN : PreflopAction::RAISE, t, amt}, finish(r, p)});
    }
  }

  if (s.step < static_cast<int>(cfg_.forced.size())) {
    const PreflopForced& f = cfg_.forced[s.step];
    if (f.player != p)
      throw std::invalid_argument("forced action " + std::to_string(s.step) + " is for player " +
                                  std::to_string(f.player) + " but player " + std::to_string(p) + " acts");
    State ns = s;
    PreflopAction fa{static_cast<PreflopAction::Type>(f.type), s.bet[p], 0};
    if (f.type == PreflopAction::FOLD) {
      if (to_call <= EPS) throw std::invalid_argument("forced fold when checking is free");
      ns.folded |= 1u << p;
    } else if (f.type == PreflopAction::CHECK) {
      if (to_call > EPS) throw std::invalid_argument("forced check facing a bet");
    } else if (f.type == PreflopAction::CALL) {
      double amt = std::min(to_call, s.stack[p]);
      ns.bet[p] += amt;
      ns.stack[p] -= amt;
      if (ns.stack[p] <= EPS) ns.allin |= 1u << p;
      if (s.raises == 0) ++ns.limpers; else ++ns.callers;
      fa = {PreflopAction::CALL, ns.bet[p], amt};
    } else {
      double t = std::min(std::max(f.to, s.cur_bet), max_to);
      double amt = t - s.bet[p];
      ns.bet[p] = t;
      ns.stack[p] -= amt;
      bool all = ns.stack[p] <= EPS;
      if (all) {
        ns.stack[p] = 0;
        ns.allin |= 1u << p;
      }
      if (t > s.cur_bet + EPS) {
        ns.last_raise = std::max(s.last_raise, t - s.cur_bet);
        ns.cur_bet = t;
        ns.raises = s.raises + 1;
        ns.last_raiser = p;
        ns.callers = 0;
        ns.acted = 0;
      }
      fa = {all ? PreflopAction::ALLIN : PreflopAction::RAISE, t, amt};
    }
    acts.clear();
    acts.push_back({fa, finish(ns, p)});
  }
  for (auto& a : acts) a.second.step = s.step + 1;

  std::vector<int> kids;
  std::vector<PreflopAction> labels;
  for (auto& [a, ns] : acts) {
    int alive = 0;
    for (int q = 0; q < N_; ++q)
      if (!(ns.folded >> q & 1)) ++alive;
    int next = -1;
    if (alive > 1) {
      for (int k = 1; k <= N_; ++k) {
        int q = (p + k) % N_;
        if ((ns.folded >> q & 1) || (ns.allin >> q & 1)) continue;
        bool needs = !(ns.acted >> q & 1) || ns.bet[q] < ns.cur_bet - EPS;
        if (needs) {
          next = q;
          break;
        }
      }
      // Nobody else can act but someone still has to match: the round is over
      // only when every live player has matched or is all-in.
    }
    int child;
    if (next < 0) {
      child = make_terminal(ns);
    } else {
      State c = ns;
      c.to_act = next;
      child = build(c);
    }
    kids.push_back(child);
    labels.push_back(a);
  }
  Node& n = nodes_[id];
  n.child_begin = static_cast<int>(children_.size());
  n.num_children = static_cast<int>(kids.size());
  for (size_t i = 0; i < kids.size(); ++i) {
    children_.push_back(kids[i]);
    actions_.push_back(labels[i]);
  }
  return id;
}

int PreflopSolver::make_terminal(const State& s) {
  Node t;
  std::vector<int> live;
  for (int q = 0; q < N_; ++q)
    if (!(s.folded >> q & 1)) live.push_back(q);
  // Return chips nobody can match.
  std::array<double, 9> bet = s.bet, stack = s.stack;
  if (live.size() >= 2) {
    std::vector<double> b;
    for (int q : live) b.push_back(bet[q]);
    std::sort(b.begin(), b.end(), std::greater<double>());
    double cap = b[1];
    for (int q : live)
      if (bet[q] > cap) {
        stack[q] += bet[q] - cap;
        bet[q] = cap;
      }
  }
  t.pot = 0;
  for (int q = 0; q < N_; ++q) {
    t.inv[q] = cfg_.ante + bet[q];
    t.pot += t.inv[q];
  }
  t.folded = s.folded;
  t.player = -1;
  if (live.size() == 1) {
    t.type = 1;
    t.player = live[0];
  } else {
    int with_chips = 0;
    double min_stack = 1e18;
    for (int q : live) {
      if (stack[q] > EPS) ++with_chips;
      min_stack = std::min(min_stack, stack[q]);
    }
    t.type = with_chips <= 1 ? 3 : 2;
    double spr = min_stack / t.pot;
    t.spr_bucket = spr < 1.5 ? 0 : spr < 4 ? 1 : spr < 8 ? 2 : 3;
    if (live.size() == 2 && t.type == 2) {
      const int ip = postflop_rank(live[0]) > postflop_rank(live[1]) ? live[0] : live[1];
      if (s.raises == 0) {
        t.pot_kind = 0;
      } else if (s.last_raiser == live[0] || s.last_raiser == live[1]) {
        t.pot_kind = 1 + 2 * (std::min(s.raises, 3) - 1) + (s.last_raiser == ip ? 0 : 1);
      }
    }
    std::vector<int> order = live;
    std::sort(order.begin(), order.end(), [&](int a, int b) { return postflop_rank(a) < postflop_rank(b); });
    for (size_t i = 0; i < order.size() && i < 3; ++i) t.roles[i] = static_cast<int8_t>(order[i]);
  }
  int id = static_cast<int>(nodes_.size());
  nodes_.push_back(t);
  return id;
}

void PreflopSolver::matvec(const std::vector<float>& M, const std::vector<float>& x, float* out) const {
  for (int h = 0; h < C; ++h) {
    const float* row = M.data() + h * C;
    float s = 0;
    for (int o = 0; o < C; ++o) s += row[o] * x[o];
    out[h] = s;
  }
}

void PreflopSolver::strategy_of(const Node& n, std::vector<float>& out, bool average) const {
  const int na = n.num_children;
  out.resize(static_cast<size_t>(na) * C);
  const float* cum = cum_.data() + n.storage;
  const float* reg = regret_.data() + n.storage;
  for (int h = 0; h < C; ++h) {
    float sum = 0;
    if (average)
      for (int a = 0; a < na; ++a) sum += cum[a * C + h];
    // The average is only meaningful where the hand actually reached this node. A hand whose
    // reach collapsed to zero early keeps whatever (near-uniform) mix it had then forever, so
    // below 0.1% average reach use the current regret-matching strategy instead.
    if (average && sum > 0 && sum >= kMinAverageReach * weight_sum_) {
      for (int a = 0; a < na; ++a) out[a * C + h] = cum[a * C + h] / sum;
      continue;
    }
    // Current strategy (regret matching); also the fallback for classes that
    // never (or almost never) reach this node.
    float rs = 0;
    for (int a = 0; a < na; ++a) rs += std::max(reg[a * C + h], 0.0f);
    for (int a = 0; a < na; ++a) out[a * C + h] = rs > 0 ? std::max(reg[a * C + h], 0.0f) / rs : 1.0f / na;
  }
}

// cfv[i][h]: counterfactual value for player i holding class h (per combo),
// already multiplied by the probability that the other players reach here.
PreflopSolver::Vecs PreflopSolver::reach_mass(const Vecs& reach) const {
  Vecs m(N_, std::vector<float>(C));
  for (int k = 0; k < N_; ++k) matvec(Pn_, reach[k], m[k].data());
  return m;
}

void PreflopSolver::terminal_values(const Node& n, const Vecs& reach, const Vecs& m, Vecs& cfv, int only) const {
  std::vector<int> live;
  for (int q = 0; q < N_; ++q)
    if (!(n.folded >> q & 1)) live.push_back(q);

  double rake = 0;
  if (n.type == 2 || n.type == 3) {
    const bool grows = n.type == 2;
    const int g = n.pot_kind == 0 ? 4 : n.spr_bucket;
    rake = n.pot * cfg_.rake_rate * (grows ? cfg_.rake_growth[g] : 1.0);
    if (cfg_.rake_cap > 0) rake = std::min(rake, cfg_.rake_cap);
  }
  const double pot_eff = n.pot - rake;

  for (int i = 0; i < N_; ++i) {
    if (only >= 0 && i != only) continue;
    auto& out = cfv[i];
    const bool in = !(n.folded >> i & 1);
    // Probability that the folded players (other than i) reach here.
    std::array<float, C> fold_prod;
    fold_prod.fill(1.0f);
    for (int k = 0; k < N_; ++k)
      if (k != i && (n.folded >> k & 1))
        for (int h = 0; h < C; ++h) fold_prod[h] *= m[k][h];

    if (!in || n.type == 1) {
      double payoff = (n.type == 1 && n.player == i) ? n.pot - n.inv[i] : -n.inv[i];
      for (int h = 0; h < C; ++h) {
        float prod = fold_prod[h];
        for (int k : live)
          if (k != i) prod *= m[k][h];
        out[h] = static_cast<float>(payoff * prod);
      }
      continue;
    }

    if (live.size() == 2) {
      int j = live[0] == i ? live[1] : live[0];
      const std::vector<float>* W;
      if (n.type == 3) {
        W = &Weq_;
      } else {
        bool ip = postflop_rank(i) > postflop_rank(j);
        if (n.pot_kind >= 0 && !Kip_[n.pot_kind].empty())
          W = ip ? &Kip_[n.pot_kind] : &Koop_[n.pot_kind];
        else
          W = ip ? &Wip_[n.spr_bucket] : &Woop_[n.spr_bucket];
      }
      std::array<float, C> share;
      matvec(*W, reach[j], share.data());
      for (int h = 0; h < C; ++h)
        out[h] = fold_prod[h] * static_cast<float>(pot_eff * share[h] - n.inv[i] * m[j][h]);
      continue;
    }

    // Three players see the flop (or are all in). With four or more, use the
    // 3-way share against the first two opponents times the heads-up equity
    // against each extra opponent (a rough but monotone approximation).
    int j = -1, k = -1;
    std::vector<int> extra;
    for (int q : live) {
      if (q == i) continue;
      if (j < 0) j = q;
      else if (k < 0) k = q;
      else extra.push_back(q);
    }
    std::array<float, C> extra_factor;
    extra_factor.fill(1.0f);
    for (int q : extra) {
      std::array<float, C> eqm;
      matvec(Weq_, reach[q], eqm.data());
      for (int h = 0; h < C; ++h) extra_factor[h] *= eqm[h];  // = m_q(h) * equity vs q's range
    }
    // The 3-way share times heads-up equities doesn't add up to the whole pot with four or more
    // players (four equal hands get 1/3 * 1/2 = 1/6 each, not 1/4). Rescale so equal hands split
    // the pot evenly: L live players get 1/L instead of (1/3) * (1/2)^(L-3).
    double adj = live.size() > 3 ? 3.0 * std::pow(2.0, static_cast<double>(live.size()) - 3.0) / live.size() : 1.0;
    if (n.type == 2) {
      double mean = (cfg_.multiway_role[0] + cfg_.multiway_role[1] + cfg_.multiway_role[2]) / 3.0;
      for (int r = 0; r < 3; ++r)
        if (n.roles[r] == i) adj *= cfg_.multiway_role[r] / mean;
    }
    // Playability: hands that do well multiway (suited, connected, pairs) gain at the expense of the rest.
    const bool use_class = n.type == 2 && cfg_.eqr_model == 1 && cfg_.multiway_class_weight != 0.0;
    std::vector<int> opps;
    std::vector<std::array<float, C>> oppA;
    const float* own_adj = nullptr;
    if (use_class) {
      int ip_most = live[0];
      for (int q : live)
        if (postflop_rank(q) > postflop_rank(ip_most)) ip_most = q;
      auto adj_of = [&](int q) { return q == ip_most ? cfg_.class_eqr_ip.data() : cfg_.class_eqr_oop.data(); };
      own_adj = adj_of(i);
      for (int q : live) {
        if (q == i) continue;
        opps.push_back(q);
        std::vector<float> ra(C);
        const float* aq = adj_of(q);
        for (int o = 0; o < C; ++o) ra[o] = reach[q][o] * aq[o];
        oppA.emplace_back();
        matvec(Pn_, ra, oppA.back().data());
      }
    }
    const int R = cfg_.tensor_rank;
    const auto& rj = reach[j];
    const auto& rk = reach[k];
    for (int h = 0; h < C; ++h) {
      double acc = 0;
      for (int r = 0; r < R; ++r) {
        const float* a = TA_.data() + (static_cast<size_t>(h) * R + r) * C;
        const float* b = TB_.data() + (static_cast<size_t>(h) * R + r) * C;
        float su = 0, sv = 0;
        for (int o = 0; o < C; ++o) {
          su += a[o] * rj[o];
          sv += b[o] * rk[o];
        }
        acc += static_cast<double>(su) * sv;
      }
      float others = m[j][h] * m[k][h];
      for (int q : extra) others *= m[q][h];
      double playability = 0;
      if (use_class) {
        // a_i[h] * P(all opponents) - mean over opponents q of E[a_q] * P(the other opponents).
        double opp = 0;
        for (size_t t = 0; t < opps.size(); ++t) {
          double rest = 1;
          for (size_t u = 0; u < opps.size(); ++u)
            if (u != t) rest *= m[opps[u]][h];
          opp += oppA[t][h] * rest;
        }
        playability = cfg_.multiway_class_weight * (own_adj[h] * others - opp / opps.size());
      }
      out[h] = fold_prod[h] * static_cast<float>(pot_eff * (adj * acc * extra_factor[h] + playability) -
                                                 n.inv[i] * others);
    }
  }
}

void PreflopSolver::walk(int id, Vecs& reach, Vecs& m, Vecs& cfv, const std::array<float, 3>& d, int depth) {
  const Node& n = nodes_[id];
  if (n.type != 0) {
    terminal_values(n, reach, m, cfv);
    return;
  }
  const int p = n.player, na = n.num_children;
  std::vector<float> sigma;
  strategy_of(n, sigma, false);
  const std::vector<float> saved = reach[p], saved_m = m[p];
  std::vector<Vecs> sub(na, Vecs(N_, std::vector<float>(C)));

  auto run = [&](int a, Vecs& rch, Vecs& mm) {
    for (int h = 0; h < C; ++h) rch[p][h] = saved[h] * sigma[a * C + h];
    matvec(Pn_, rch[p], mm[p].data());
    walk(children_[n.child_begin + a], rch, mm, sub[a], d, depth + 1);
  };
  if (omp_in_parallel() && depth < 4 && na > 1) {
#pragma omp taskloop grainsize(1)
    for (int a = 0; a < na; ++a) {
      Vecs rch = reach, mm = m;
      run(a, rch, mm);
    }
  } else {
    for (int a = 0; a < na; ++a) run(a, reach, m);
    reach[p] = saved;
    m[p] = saved_m;
  }

  for (int q = 0; q < N_; ++q) {
    auto& out = cfv[q];
    if (q == p) {
      for (int h = 0; h < C; ++h) {
        float v = 0;
        for (int a = 0; a < na; ++a) v += sigma[a * C + h] * sub[a][q][h];
        out[h] = v;
      }
    } else {
      std::fill(out.begin(), out.end(), 0.0f);
      for (int a = 0; a < na; ++a)
        for (int h = 0; h < C; ++h) out[h] += sub[a][q][h];
    }
  }
  float* reg = regret_.data() + n.storage;
  float* cum = cum_.data() + n.storage;
  for (int a = 0; a < na; ++a)
    for (int h = 0; h < C; ++h) {
      int idx = a * C + h;
      float r = reg[idx];
      r *= r >= 0 ? d[0] : d[1];
      reg[idx] = r + (sub[a][p][h] - cfv[p][h]);
      cum[idx] = cum[idx] * d[2] + sigma[idx] * saved[h];
    }
}

void PreflopSolver::iterate(int iters) {
  for (int it = 0; it < iters && !stop_; ++it) {
    ++iteration_;
    double t = iteration_;
    double ta = std::pow(t - 1, 1.5);
    std::array<float, 3> d = {static_cast<float>(ta / (ta + 1)), 0.5f,
                              static_cast<float>(std::pow((t - 1) / t, 2.0))};
    weight_sum_ = weight_sum_ * d[2] + 1.0;
    Vecs reach = cfg_.initial_range;
    Vecs m = reach_mass(reach);
    Vecs cfv(N_, std::vector<float>(C));
#pragma omp parallel
#pragma omp single
    walk(0, reach, m, cfv, d, 0);
  }
}

void PreflopSolver::eval(int id, Vecs& reach, Vecs& m, std::vector<float>& out, int br_player, int target) {
  const Node& n = nodes_[id];
  if (n.type != 0) {
    Vecs cfv(N_, std::vector<float>(C));
    terminal_values(n, reach, m, cfv, target);
    out = cfv[target];
    return;
  }
  const int p = n.player, na = n.num_children;
  std::vector<float> sigma;
  strategy_of(n, sigma, true);
  const std::vector<float> saved = reach[p], saved_m = m[p];
  std::vector<std::vector<float>> sub(na, std::vector<float>(C));
  for (int a = 0; a < na; ++a) {
    if (p != target) {
      for (int h = 0; h < C; ++h) reach[p][h] = saved[h] * sigma[a * C + h];
      matvec(Pn_, reach[p], m[p].data());
    }
    eval(children_[n.child_begin + a], reach, m, sub[a], br_player, target);
  }
  reach[p] = saved;
  m[p] = saved_m;
  out.assign(C, 0.0f);
  for (int h = 0; h < C; ++h) {
    if (p == target && br_player == target) {
      float v = sub[0][h];
      for (int a = 1; a < na; ++a) v = std::max(v, sub[a][h]);
      out[h] = v;
    } else if (p == target) {
      for (int a = 0; a < na; ++a) out[h] += sigma[a * C + h] * sub[a][h];
    } else {
      for (int a = 0; a < na; ++a) out[h] += sub[a][h];
    }
  }
}

std::vector<double> PreflopSolver::player_ev() {
  std::vector<double> ev(N_);
  std::vector<std::array<float, C>> m(N_);
  for (int k = 0; k < N_; ++k) matvec(Pn_, cfg_.initial_range[k], m[k].data());
#pragma omp parallel for
  for (int i = 0; i < N_; ++i) {
    Vecs reach = cfg_.initial_range;
    Vecs mm = reach_mass(reach);
    std::vector<float> out;
    eval(0, reach, mm, out, -1, i);
    double num = 0, den = 0;
    for (int h = 0; h < C; ++h) {
      double w = class_combos_[h] * cfg_.initial_range[i][h];
      double prod = 1;
      for (int k = 0; k < N_; ++k)
        if (k != i) prod *= m[k][h];
      num += w * out[h];
      den += w * prod;
    }
    ev[i] = den > 0 ? num / den : 0;
  }
  return ev;
}

double PreflopSolver::nash_conv(std::vector<double>* per_player) {
  std::vector<double> cur = player_ev();
  std::vector<double> gain(N_);
  std::vector<std::array<float, C>> m(N_);
  for (int k = 0; k < N_; ++k) matvec(Pn_, cfg_.initial_range[k], m[k].data());
#pragma omp parallel for
  for (int i = 0; i < N_; ++i) {
    Vecs reach = cfg_.initial_range;
    Vecs mm = reach_mass(reach);
    std::vector<float> out;
    eval(0, reach, mm, out, i, i);
    double num = 0, den = 0;
    for (int h = 0; h < C; ++h) {
      double w = class_combos_[h] * cfg_.initial_range[i][h];
      double prod = 1;
      for (int k = 0; k < N_; ++k)
        if (k != i) prod *= m[k][h];
      num += w * out[h];
      den += w * prod;
    }
    gain[i] = (den > 0 ? num / den : 0) - cur[i];
  }
  if (per_player) *per_player = gain;
  return std::accumulate(gain.begin(), gain.end(), 0.0);
}

int PreflopSolver::solve(int max_iterations, double target_bb, int check_every,
                         const std::function<bool(int, double)>& callback) {
  stop_ = false;
  check_every = std::max(1, check_every);
  while (iteration_ < max_iterations && !stop_) {
    iterate(std::min(check_every, max_iterations - iteration_));
    double nc = nash_conv();
    if (callback && !callback(iteration_, nc)) break;
    if (nc <= target_bb) break;
  }
  return iteration_;
}

void PreflopSolver::load_cumulative_strategy(const std::vector<float>& cum, int iterations,
                                             const std::vector<float>& regrets) {
  if (cum.size() != cum_.size()) throw std::invalid_argument("saved strategy does not match this tree");
  if (!regrets.empty() && regrets.size() != regret_.size())
    throw std::invalid_argument("saved regrets do not match this tree");
  cum_ = cum;
  if (!regrets.empty()) regret_ = regrets;
  iteration_ = iterations;
  weight_sum_ = 0;
  for (int t = 1; t <= iterations; ++t) weight_sum_ = weight_sum_ * std::pow((t - 1.0) / t, 2.0) + 1.0;
}

PreflopNodeInfo PreflopSolver::query(const std::vector<int>& path) {
  int id = 0;
  std::vector<std::vector<float>> reach = cfg_.initial_range;
  for (int a : path) {
    const Node& n = nodes_[id];
    if (n.type != 0) throw std::invalid_argument("path continues past a terminal");
    if (a < 0 || a >= n.num_children) throw std::invalid_argument("action index out of range");
    std::vector<float> sigma;
    strategy_of(n, sigma, true);
    for (int h = 0; h < C; ++h) reach[n.player][h] *= sigma[a * C + h];
    id = children_[n.child_begin + a];
  }
  const Node& n = nodes_[id];
  PreflopNodeInfo info;
  info.reach = reach;
  info.pot = 0;
  // Investments at this node: replay contributions along the path.
  {
    std::vector<double> inv(N_, cfg_.ante);
    int sbp = (N_ == 2) ? 0 : N_ - 2;
    inv[sbp] += std::min(cfg_.sb, cfg_.stacks[sbp] - cfg_.ante);
    inv[N_ - 1] += std::min(cfg_.bb, cfg_.stacks[N_ - 1] - cfg_.ante);
    std::vector<int> folded(N_, 0);
    int cur = 0;
    for (int a : path) {
      const Node& x = nodes_[cur];
      const PreflopAction& act = actions_[x.child_begin + a];
      inv[x.player] = cfg_.ante + act.to;
      if (act.type == PreflopAction::FOLD) folded[x.player] = 1;
      cur = children_[x.child_begin + a];
    }
    if (n.type != 0)
      for (int q = 0; q < N_; ++q) inv[q] = n.inv[q];
    info.invested = inv;
    info.folded = folded;
    for (double v : inv) info.pot += v;
  }
  Vecs m = reach_mass(reach);
  auto normalize = [&](int i, std::vector<float>& v) {
    for (int h = 0; h < C; ++h) {
      double prod = 1;
      for (int k = 0; k < N_; ++k)
        if (k != i) prod *= m[k][h];
      v[h] = prod > 1e-12 ? static_cast<float>(v[h] / prod) : 0.0f;
    }
  };
  if (n.type != 0) {
    info.terminal = true;
    info.terminal_kind = n.type == 1 ? "fold" : n.type == 2 ? "flop" : "allin";
    Vecs cfv(N_, std::vector<float>(C));
    terminal_values(n, reach, m, cfv);
    for (int i = 0; i < N_; ++i) {
      normalize(i, cfv[i]);
      info.ev.insert(info.ev.end(), cfv[i].begin(), cfv[i].end());
    }
    return info;
  }
  info.player = n.player;
  strategy_of(n, info.strategy, true);
  for (int a = 0; a < n.num_children; ++a) {
    info.actions.push_back(actions_[n.child_begin + a]);
    std::vector<float> out;
    Vecs r = reach, mm = m;
    eval(children_[n.child_begin + a], r, mm, out, -1, n.player);
    normalize(n.player, out);
    info.action_ev.insert(info.action_ev.end(), out.begin(), out.end());
  }
  info.ev.assign(C, 0.0f);
  for (int a = 0; a < n.num_children; ++a)
    for (int h = 0; h < C; ++h) info.ev[h] += info.strategy[a * C + h] * info.action_ev[a * C + h];
  return info;
}

}  // namespace flipup

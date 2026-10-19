#include "flipup/equity.h"

#include <omp.h>

#include <algorithm>
#include <cmath>
#include <stdexcept>

#include "flipup/eval.h"

namespace flipup {

namespace {

struct Rng {
  uint64_t s;
  explicit Rng(uint64_t seed) : s(seed * 0x9E3779B97F4A7C15ull + 0x632BE59BD9B4E019ull) {}
  uint64_t next() {
    uint64_t z = (s += 0x9E3779B97F4A7C15ull);
    z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9ull;
    z = (z ^ (z >> 27)) * 0x94D049BB133111EBull;
    return z ^ (z >> 31);
  }
  int card() { return static_cast<int>(next() % NUM_CARDS); }
};

// Adds `need` random cards to `board`, avoiding `dead`.
CardMask random_fill(Rng& rng, CardMask board, CardMask dead, int need) {
  CardMask used = board | dead;
  while (need > 0) {
    int c = rng.card();
    if (used & card_bit(c)) continue;
    used |= card_bit(c);
    board |= card_bit(c);
    --need;
  }
  return board;
}

double choose(int n, int k) {
  double r = 1;
  for (int i = 1; i <= k; ++i) r = r * (n - k + i) / i;
  return r;
}

// Calls f(board_mask) for every completion of `board` to 5 cards avoiding `dead`.
template <class F>
void for_each_runout(CardMask board, CardMask dead, F&& f) {
  int need = 5 - __builtin_popcountll(board);
  std::vector<int> free_cards;
  for (int c = 0; c < NUM_CARDS; ++c)
    if (!((board | dead) & card_bit(c))) free_cards.push_back(c);
  if (need == 0) {
    f(board);
  } else if (need == 1) {
    for (int c : free_cards) f(board | card_bit(c));
  } else if (need == 2) {
    for (size_t i = 0; i < free_cards.size(); ++i)
      for (size_t j = i + 1; j < free_cards.size(); ++j) f(board | card_bit(free_cards[i]) | card_bit(free_cards[j]));
  } else {
    throw std::invalid_argument("for_each_runout supports boards with 3+ cards");
  }
}

struct Entry {
  uint32_t strength;
  int idx;
  uint8_t c1, c2;
};

// For one 5-card board: accumulates (win - lose) mass of hero hands vs villain weights.
void sweep(const std::vector<Entry>& hero, const std::vector<Entry>& vill, const std::vector<float>& vw,
           std::vector<double>& diff) {
  double card_sum[NUM_CARDS];
  double sum = 0;
  std::fill(card_sum, card_sum + NUM_CARDS, 0.0);
  size_t j = 0;
  for (const auto& h : hero) {
    while (j < vill.size() && vill[j].strength < h.strength) {
      double w = vw[vill[j].idx];
      sum += w;
      card_sum[vill[j].c1] += w;
      card_sum[vill[j].c2] += w;
      ++j;
    }
    diff[h.idx] += sum - card_sum[h.c1] - card_sum[h.c2];
  }
  sum = 0;
  std::fill(card_sum, card_sum + NUM_CARDS, 0.0);
  long k = static_cast<long>(vill.size()) - 1;
  for (long i = static_cast<long>(hero.size()) - 1; i >= 0; --i) {
    const auto& h = hero[i];
    while (k >= 0 && vill[k].strength > h.strength) {
      double w = vw[vill[k].idx];
      sum += w;
      card_sum[vill[k].c1] += w;
      card_sum[vill[k].c2] += w;
      --k;
    }
    diff[h.idx] -= sum - card_sum[h.c1] - card_sum[h.c2];
  }
}

std::vector<Entry> ranked(const std::vector<int>& combos, CardMask board) {
  std::vector<Entry> out;
  out.reserve(combos.size());
  for (int c : combos) {
    CardMask m = combo_mask(c);
    if (m & board) continue;
    out.push_back({evaluate_mask(m | board), c, static_cast<uint8_t>(combo_card(c, 0)),
                   static_cast<uint8_t>(combo_card(c, 1))});
  }
  std::sort(out.begin(), out.end(), [](const Entry& a, const Entry& b) { return a.strength < b.strength; });
  return out;
}

}  // namespace

int combo_class(int combo) {
  int a = combo_card(combo, 0), b = combo_card(combo, 1);
  int ra = card_rank(a), rb = card_rank(b);
  int hi = std::max(ra, rb), lo = std::min(ra, rb);
  if (hi == lo) return (12 - hi) * 14;
  if (card_suit(a) == card_suit(b)) return (12 - hi) * 13 + (12 - lo);
  return (12 - lo) * 13 + (12 - hi);
}

EquityResult equity_vs_range(int combo, const std::vector<float>& range, const std::vector<int>& board_cards,
                             int samples, uint64_t seed) {
  if (range.size() != NUM_COMBOS) throw std::invalid_argument("range needs 1326 weights");
  CardMask board = cards_mask(board_cards);
  CardMask hero = combo_mask(combo);
  if (hero & board) throw std::invalid_argument("hero hand overlaps the board");
  std::vector<int> vill;
  for (int v = 0; v < NUM_COMBOS; ++v)
    if (range[v] > 0 && !(combo_mask(v) & (hero | board))) vill.push_back(v);
  EquityResult r;
  double total = 0;
  auto score = [&](CardMask b5) {
    uint32_t hs = evaluate_mask(hero | b5);
    for (int v : vill) {
      CardMask vm = combo_mask(v);
      if (vm & b5) continue;
      uint32_t vs = evaluate_mask(vm | b5);
      double w = range[v];
      total += w;
      if (hs > vs) r.win += w;
      else if (hs == vs) r.tie += w;
      else r.lose += w;
    }
  };
  if (board_cards.size() >= 3) {
    for_each_runout(board, hero, score);
  } else {
    Rng rng(seed);
    for (int s = 0; s < samples; ++s) score(random_fill(rng, board, hero, 5 - __builtin_popcountll(board)));
  }
  if (total > 0) {
    r.win /= total;
    r.tie /= total;
    r.lose /= total;
  }
  return r;
}

std::vector<float> range_equities(const std::vector<float>& hero_w, const std::vector<float>& vill_w,
                                  const std::vector<int>& board_cards, int samples, uint64_t seed) {
  if (hero_w.size() != NUM_COMBOS || vill_w.size() != NUM_COMBOS)
    throw std::invalid_argument("ranges need 1326 weights");
  CardMask board = cards_mask(board_cards);
  std::vector<int> hero, vill;
  for (int c = 0; c < NUM_COMBOS; ++c) {
    if (combo_mask(c) & board) continue;
    if (hero_w[c] > 0) hero.push_back(c);
    if (vill_w[c] > 0) vill.push_back(c);
  }

  // Compatible villain mass per hero hand on the given board.
  double total = 0, per_card[NUM_CARDS] = {0};
  for (int v : vill) {
    total += vill_w[v];
    per_card[combo_card(v, 0)] += vill_w[v];
    per_card[combo_card(v, 1)] += vill_w[v];
  }

  int nthreads = omp_get_max_threads();
  std::vector<std::vector<double>> diffs(nthreads, std::vector<double>(NUM_COMBOS, 0.0));
  double runouts;
  if (board_cards.size() >= 3) {
    std::vector<CardMask> boards;
    for_each_runout(board, 0, [&](CardMask b) { boards.push_back(b); });
    runouts = choose(NUM_CARDS - static_cast<int>(board_cards.size()) - 4, 5 - static_cast<int>(board_cards.size()));
#pragma omp parallel for schedule(dynamic, 16)
    for (size_t i = 0; i < boards.size(); ++i) {
      auto& d = diffs[omp_get_thread_num()];
      sweep(ranked(hero, boards[i]), ranked(vill, boards[i]), vill_w, d);
    }
  } else {
    // Uniform random full boards; each (hero, villain) pair is scored on the
    // boards that miss both hands, so normalise per pair by the expected count.
    int need = 5 - static_cast<int>(board_cards.size());
    runouts = samples * choose(NUM_CARDS - static_cast<int>(board_cards.size()) - 4, need) /
              choose(NUM_CARDS - static_cast<int>(board_cards.size()), need);
#pragma omp parallel
    {
      auto& d = diffs[omp_get_thread_num()];
      Rng rng(seed + 1000003ull * omp_get_thread_num());
#pragma omp for schedule(static)
      for (int s = 0; s < samples; ++s) {
        CardMask b = random_fill(rng, board, 0, need);
        sweep(ranked(hero, b), ranked(vill, b), vill_w, d);
      }
    }
  }
  std::vector<float> eq(NUM_COMBOS, 0.0f);
  for (int h : hero) {
    double diff = 0;
    for (auto& d : diffs) diff += d[h];
    int a = combo_card(h, 0), b = combo_card(h, 1);
    int same = h;
    double S = total - per_card[a] - per_card[b] + (vill_w[same] > 0 ? vill_w[same] : 0);
    if (S <= 0) continue;
    eq[h] = static_cast<float>(std::clamp(0.5 + diff / (2.0 * S * runouts), 0.0, 1.0));
  }
  return eq;
}

EquityResult preflop_equity_exact(int combo_a, int combo_b) {
  CardMask a = combo_mask(combo_a), b = combo_mask(combo_b);
  if (a & b) throw std::invalid_argument("hands share a card");
  std::vector<int> free_cards;
  for (int c = 0; c < NUM_CARDS; ++c)
    if (!((a | b) & card_bit(c))) free_cards.push_back(c);
  const int n = static_cast<int>(free_cards.size());
  long long win = 0, tie = 0, lose = 0;
#pragma omp parallel for reduction(+ : win, tie, lose) schedule(dynamic)
  for (int i = 0; i < n; ++i)
    for (int j = i + 1; j < n; ++j)
      for (int k = j + 1; k < n; ++k)
        for (int l = k + 1; l < n; ++l) {
          CardMask m4 = card_bit(free_cards[i]) | card_bit(free_cards[j]) | card_bit(free_cards[k]) | card_bit(free_cards[l]);
          for (int q = l + 1; q < n; ++q) {
            CardMask bd = m4 | card_bit(free_cards[q]);
            uint32_t sa = evaluate_mask(a | bd), sb = evaluate_mask(b | bd);
            if (sa > sb) ++win;
            else if (sa == sb) ++tie;
            else ++lose;
          }
        }
  double t = static_cast<double>(win + tie + lose);
  return {win / t, tie / t, lose / t};
}

ClassMatrix preflop_class_matrix(int samples, uint64_t seed) {
  std::vector<std::vector<int>> combos(NUM_CLASSES);
  for (int c = 0; c < NUM_COMBOS; ++c) combos[combo_class(c)].push_back(c);
  ClassMatrix m;
  m.equity.assign(NUM_CLASSES * NUM_CLASSES, 0.5f);
  m.pairs.assign(NUM_CLASSES * NUM_CLASSES, 0.0f);
  std::vector<std::pair<int, int>> todo;
  for (int i = 0; i < NUM_CLASSES; ++i)
    for (int j = i; j < NUM_CLASSES; ++j) todo.push_back({i, j});
#pragma omp parallel for schedule(dynamic, 4)
  for (size_t t = 0; t < todo.size(); ++t) {
    auto [i, j] = todo[t];
    std::vector<std::pair<int, int>> pairs;
    for (int a : combos[i])
      for (int b : combos[j])
        if (!(combo_mask(a) & combo_mask(b))) pairs.push_back({a, b});
    m.pairs[i * NUM_CLASSES + j] = m.pairs[j * NUM_CLASSES + i] = static_cast<float>(pairs.size());
    if (pairs.empty()) continue;
    Rng rng(seed + t * 7919);
    int per = std::max(1, samples / static_cast<int>(pairs.size()));
    double score = 0;
    long n = 0;
    for (auto [a, b] : pairs) {
      CardMask ma = combo_mask(a), mb = combo_mask(b);
      for (int s = 0; s < per; ++s) {
        CardMask bd = random_fill(rng, 0, ma | mb, 5);
        uint32_t sa = evaluate_mask(ma | bd), sb = evaluate_mask(mb | bd);
        score += sa > sb ? 1.0 : (sa == sb ? 0.5 : 0.0);
        ++n;
      }
    }
    double e = score / n;
    if (i == j) e = 0.5;  // exact by symmetry
    m.equity[i * NUM_CLASSES + j] = static_cast<float>(e);
    m.equity[j * NUM_CLASSES + i] = static_cast<float>(1.0 - e);
  }
  return m;
}

std::vector<float> preflop_class_tensor3(int samples, uint64_t seed) {
  std::vector<std::vector<int>> combos(NUM_CLASSES);
  for (int c = 0; c < NUM_COMBOS; ++c) combos[combo_class(c)].push_back(c);
  const size_t N = NUM_CLASSES;
  std::vector<float> out(N * N * N, 1.0f / 3.0f);
#pragma omp parallel for schedule(dynamic, 1)
  for (int i = 0; i < NUM_CLASSES; ++i) {
    Rng rng(seed + 104729ull * i);
    for (int j = i; j < NUM_CLASSES; ++j)
      for (int k = j; k < NUM_CLASSES; ++k) {
        double share[3] = {0, 0, 0};
        long n = 0;
        int tries = 0;
        while (n < samples && tries < samples * 20) {
          ++tries;
          int a = combos[i][rng.next() % combos[i].size()];
          int b = combos[j][rng.next() % combos[j].size()];
          int c = combos[k][rng.next() % combos[k].size()];
          CardMask ma = combo_mask(a), mb = combo_mask(b), mc = combo_mask(c);
          if ((ma & mb) || (ma & mc) || (mb & mc)) continue;
          CardMask bd = random_fill(rng, 0, ma | mb | mc, 5);
          uint32_t s[3] = {evaluate_mask(ma | bd), evaluate_mask(mb | bd), evaluate_mask(mc | bd)};
          uint32_t best = std::max({s[0], s[1], s[2]});
          int winners = (s[0] == best) + (s[1] == best) + (s[2] == best);
          for (int q = 0; q < 3; ++q)
            if (s[q] == best) share[q] += 1.0 / winners;
          ++n;
        }
        if (n == 0) continue;  // impossible triple (e.g. three AA classes)
        for (double& x : share) x /= n;
        int idx[3] = {i, j, k};
        // Store for every ordering of the three classes.
        int perm[6][3] = {{0, 1, 2}, {0, 2, 1}, {1, 0, 2}, {1, 2, 0}, {2, 0, 1}, {2, 1, 0}};
        for (auto& p : perm)
          out[(static_cast<size_t>(idx[p[0]]) * N + idx[p[1]]) * N + idx[p[2]]] = static_cast<float>(share[p[0]]);
      }
  }
  return out;
}

}  // namespace flipup

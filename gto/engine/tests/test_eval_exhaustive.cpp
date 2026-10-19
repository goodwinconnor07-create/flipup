// Exhaustive evaluator check against the known combinatorial counts.
#include <cstdio>
#include <set>
#include <vector>
#include "flipup/eval.h"
using namespace flipup;

int main() {
  int fails = 0;
  // 5-card hands: category counts and 7462 distinct equivalence classes.
  const long long exp5[9] = {1302540, 1098240, 123552, 54912, 10200, 5108, 3744, 624, 40};
  long long c5[9] = {0};
  std::set<uint32_t> distinct5;
  for (int a = 0; a < 52; ++a) for (int b = a + 1; b < 52; ++b) for (int c = b + 1; c < 52; ++c)
  for (int d = c + 1; d < 52; ++d) for (int e = d + 1; e < 52; ++e) {
    uint32_t v = evaluate_mask(card_bit(a) | card_bit(b) | card_bit(c) | card_bit(d) | card_bit(e));
    c5[strength_category(v)]++;
    distinct5.insert(v);
  }
  for (int k = 0; k < 9; ++k) if (c5[k] != exp5[k]) { printf("5-card %s: %lld != %lld\n", category_name(k).c_str(), c5[k], exp5[k]); fails++; }
  if (distinct5.size() != 7462) { printf("distinct 5-card = %zu\n", distinct5.size()); fails++; }

  // 7-card hands: 133,784,560 total.
  const long long exp7[9] = {23294460, 58627800, 31433400, 6461620, 6180020, 4047644, 3473184, 224848, 41584};
  long long c7[9] = {0};
  std::vector<char> seen(1 << 24, 0);
  for (int a = 0; a < 52; ++a) for (int b = a + 1; b < 52; ++b) for (int c = b + 1; c < 52; ++c)
  for (int d = c + 1; d < 52; ++d) for (int e = d + 1; e < 52; ++e) {
    CardMask m5 = card_bit(a) | card_bit(b) | card_bit(c) | card_bit(d) | card_bit(e);
    for (int f = e + 1; f < 52; ++f) for (int g = f + 1; g < 52; ++g) {
      uint32_t v = evaluate_mask(m5 | card_bit(f) | card_bit(g));
      c7[strength_category(v)]++;
      seen[v] = 1;
    }
  }
  long long distinct7 = 0; for (char s : seen) distinct7 += s;
  for (int k = 0; k < 9; ++k) if (c7[k] != exp7[k]) { printf("7-card %s: %lld != %lld\n", category_name(k).c_str(), c7[k], exp7[k]); fails++; }
  if (distinct7 != 4824) { printf("distinct 7-card = %lld\n", distinct7); fails++; }
  printf("%s (5-card distinct %zu, 7-card distinct %lld)\n", fails ? "FAIL" : "PASS", distinct5.size(), distinct7);
  return fails != 0;
}

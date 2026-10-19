#include "flipup/eval.h"

#include <array>

namespace flipup {

namespace {

struct StraightTable {
  // top[mask] = rank of the highest card of the best straight in the 13-bit
  // rank mask, or -1. The wheel (A-2-3-4-5) has top rank 3 (the five).
  std::array<int8_t, 8192> top;
  StraightTable() {
    for (int m = 0; m < 8192; ++m) {
      int best = -1;
      for (int hi = 12; hi >= 4 && best < 0; --hi) {
        int need = 0x1F << (hi - 4);
        if ((m & need) == need) best = hi;
      }
      if (best < 0 && (m & 0x100F) == 0x100F) best = 3;
      top[m] = static_cast<int8_t>(best);
    }
  }
};

const StraightTable& straights() {
  static const StraightTable t;
  return t;
}

inline int top_bit(uint32_t m) { return 31 - __builtin_clz(m); }

// Packs the k highest ranks of mask into nibbles starting at `shift`.
inline uint32_t pack_top(uint32_t mask, int k, int shift) {
  uint32_t out = 0;
  for (int i = 0; i < k && mask; ++i) {
    int r = top_bit(mask);
    mask &= ~(1u << r);
    out |= static_cast<uint32_t>(r) << shift;
    shift -= 4;
  }
  return out;
}

inline uint32_t make_value(int cat, uint32_t payload) {
  return (static_cast<uint32_t>(cat) << 20) | payload;
}

}  // namespace

uint32_t evaluate_mask(CardMask cards) {
  uint32_t s[4] = {0, 0, 0, 0};
  while (cards) {
    int c = __builtin_ctzll(cards);
    cards &= cards - 1;
    s[c & 3] |= 1u << (c >> 2);
  }

  const auto& st = straights();
  int flush_suit = -1;
  for (int k = 0; k < 4; ++k)
    if (__builtin_popcount(s[k]) >= 5) flush_suit = k;
  if (flush_suit >= 0) {
    int sf = st.top[s[flush_suit]];
    if (sf >= 0) return make_value(STRAIGHT_FLUSH, static_cast<uint32_t>(sf) << 16);
  }

  const uint32_t any = s[0] | s[1] | s[2] | s[3];
  const uint32_t two = (s[0] & s[1]) | (s[0] & s[2]) | (s[0] & s[3]) | (s[1] & s[2]) |
                       (s[1] & s[3]) | (s[2] & s[3]);
  const uint32_t three = (s[0] & s[1] & s[2]) | (s[0] & s[1] & s[3]) | (s[0] & s[2] & s[3]) |
                         (s[1] & s[2] & s[3]);
  const uint32_t four = s[0] & s[1] & s[2] & s[3];

  if (four) {
    int q = top_bit(four);
    return make_value(FOUR_OF_A_KIND,
                      (static_cast<uint32_t>(q) << 16) | pack_top(any & ~(1u << q), 1, 12));
  }
  if (three) {
    int t = top_bit(three);
    uint32_t rest = two & ~(1u << t);
    if (rest) {
      int p = top_bit(rest);
      return make_value(FULL_HOUSE, (static_cast<uint32_t>(t) << 16) | (static_cast<uint32_t>(p) << 12));
    }
  }
  if (flush_suit >= 0) return make_value(FLUSH, pack_top(s[flush_suit], 5, 16));
  int straight = st.top[any];
  if (straight >= 0) return make_value(STRAIGHT, static_cast<uint32_t>(straight) << 16);
  if (three) {
    int t = top_bit(three);
    return make_value(THREE_OF_A_KIND,
                      (static_cast<uint32_t>(t) << 16) | pack_top(any & ~(1u << t), 2, 12));
  }
  if (__builtin_popcount(two) >= 2) {
    int p1 = top_bit(two);
    int p2 = top_bit(two & ~(1u << p1));
    uint32_t used = (1u << p1) | (1u << p2);
    return make_value(TWO_PAIR, (static_cast<uint32_t>(p1) << 16) | (static_cast<uint32_t>(p2) << 12) |
                                    pack_top(any & ~used, 1, 8));
  }
  if (two) {
    int p = top_bit(two);
    return make_value(ONE_PAIR, (static_cast<uint32_t>(p) << 16) | pack_top(any & ~(1u << p), 3, 12));
  }
  return make_value(HIGH_CARD, pack_top(any, 5, 16));
}

uint32_t evaluate(const std::vector<int>& cards) {
  if (cards.size() < 5 || cards.size() > 7) throw std::invalid_argument("evaluate needs 5-7 cards");
  CardMask m = cards_mask(cards);
  if (__builtin_popcountll(m) != static_cast<int>(cards.size()))
    throw std::invalid_argument("duplicate cards");
  return evaluate_mask(m);
}

std::string category_name(int category) {
  static const char* names[] = {"High Card",  "One Pair",   "Two Pair",       "Three of a Kind", "Straight",
                                "Flush",      "Full House", "Four of a Kind", "Straight Flush"};
  if (category < 0 || category > 8) return "Unknown";
  return names[category];
}

std::string describe_strength(uint32_t strength) {
  static const char* plural[] = {"Twos", "Threes", "Fours", "Fives",  "Sixes", "Sevens", "Eights",
                                 "Nines", "Tens",  "Jacks", "Queens", "Kings", "Aces"};
  static const char* single[] = {"Two",  "Three", "Four", "Five",  "Six",  "Seven", "Eight",
                                 "Nine", "Ten",   "Jack", "Queen", "King", "Ace"};
  int cat = strength_category(strength);
  int r1 = (strength >> 16) & 0xF, r2 = (strength >> 12) & 0xF;
  switch (cat) {
    case HIGH_CARD: return std::string(single[r1]) + " High";
    case ONE_PAIR: return std::string("Pair of ") + plural[r1];
    case TWO_PAIR: return std::string("Two Pair, ") + plural[r1] + " and " + plural[r2];
    case THREE_OF_A_KIND: return std::string("Three of a Kind, ") + plural[r1];
    case STRAIGHT: return std::string("Straight, ") + single[r1] + " High";
    case FLUSH: return std::string("Flush, ") + single[r1] + " High";
    case FULL_HOUSE: return std::string("Full House, ") + plural[r1] + " full of " + plural[r2];
    case FOUR_OF_A_KIND: return std::string("Four of a Kind, ") + plural[r1];
    case STRAIGHT_FLUSH: return r1 == 12 ? "Royal Flush" : std::string("Straight Flush, ") + single[r1] + " High";
  }
  return "Unknown";
}

}  // namespace flipup

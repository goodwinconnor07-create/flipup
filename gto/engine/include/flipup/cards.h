// Card / combo primitives shared by the whole engine.
//
// Card encoding: card = rank * 4 + suit
//   rank 0..12  = 2,3,4,5,6,7,8,9,T,J,Q,K,A
//   suit 0..3   = c,d,h,s
// Combo (two-card starting hand) index: 0..1325, one per unordered pair of
// distinct cards, ordered so that combo_index(a,b) == combo_index(b,a).
#pragma once

#include <array>
#include <cstdint>
#include <stdexcept>
#include <string>
#include <vector>

namespace flipup {

constexpr int NUM_CARDS = 52;
constexpr int NUM_COMBOS = 1326;

using CardMask = uint64_t;

inline int card_rank(int c) { return c >> 2; }
inline int card_suit(int c) { return c & 3; }
inline int make_card(int rank, int suit) { return rank * 4 + suit; }
inline CardMask card_bit(int c) { return CardMask{1} << c; }

inline const char* RANK_CHARS = "23456789TJQKA";
inline const char* SUIT_CHARS = "cdhs";

int parse_card(const std::string& s);           // "Ah" -> 50
std::string card_to_string(int c);              // 50 -> "Ah"
std::vector<int> parse_cards(const std::string& s);  // "AhKd7c" or "Ah Kd 7c"
std::string cards_to_string(const std::vector<int>& cards);

struct ComboTable {
  std::array<std::array<int16_t, NUM_CARDS>, NUM_CARDS> index;  // -1 on diagonal
  std::array<std::array<uint8_t, 2>, NUM_COMBOS> cards;          // cards[i][0] > cards[i][1]
  ComboTable();
};

const ComboTable& combo_table();

inline int combo_index(int a, int b) { return combo_table().index[a][b]; }
inline int combo_card(int combo, int k) { return combo_table().cards[combo][k]; }
inline CardMask combo_mask(int combo) {
  return card_bit(combo_card(combo, 0)) | card_bit(combo_card(combo, 1));
}

inline CardMask cards_mask(const std::vector<int>& cards) {
  CardMask m = 0;
  for (int c : cards) m |= card_bit(c);
  return m;
}

// Apply a suit permutation (perm[s] = new suit) to a card / combo.
inline int permute_card(int c, const std::array<int, 4>& perm) {
  return make_card(card_rank(c), perm[card_suit(c)]);
}
inline int permute_combo(int combo, const std::array<int, 4>& perm) {
  return combo_index(permute_card(combo_card(combo, 0), perm),
                     permute_card(combo_card(combo, 1), perm));
}

}  // namespace flipup

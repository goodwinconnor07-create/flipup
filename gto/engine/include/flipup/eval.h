// 5/6/7-card hand evaluator.
//
// Returns a 32-bit strength where a larger value is a stronger hand and equal
// values tie. Layout: category << 20 | five 4-bit rank nibbles (most
// significant first), so values are directly comparable.
#pragma once

#include <cstdint>
#include <string>
#include <vector>

#include "flipup/cards.h"

namespace flipup {

enum HandCategory : int {
  HIGH_CARD = 0,
  ONE_PAIR = 1,
  TWO_PAIR = 2,
  THREE_OF_A_KIND = 3,
  STRAIGHT = 4,
  FLUSH = 5,
  FULL_HOUSE = 6,
  FOUR_OF_A_KIND = 7,
  STRAIGHT_FLUSH = 8,
};

uint32_t evaluate_mask(CardMask cards);  // 5..7 cards set in the mask
uint32_t evaluate(const std::vector<int>& cards);

inline int strength_category(uint32_t strength) { return static_cast<int>(strength >> 20); }
std::string category_name(int category);
std::string describe_strength(uint32_t strength);  // e.g. "Two Pair, Kings and Sevens"

}  // namespace flipup

#include "flipup/cards.h"

#include <cctype>
#include <cstring>

namespace flipup {

int parse_card(const std::string& s) {
  if (s.size() != 2) throw std::invalid_argument("bad card: '" + s + "'");
  const char* r = std::strchr(RANK_CHARS, std::toupper(static_cast<unsigned char>(s[0])));
  const char* u = std::strchr(SUIT_CHARS, std::tolower(static_cast<unsigned char>(s[1])));
  if (!r || !u || !*r || !*u) throw std::invalid_argument("bad card: '" + s + "'");
  return make_card(static_cast<int>(r - RANK_CHARS), static_cast<int>(u - SUIT_CHARS));
}

std::string card_to_string(int c) {
  if (c < 0 || c >= NUM_CARDS) throw std::invalid_argument("bad card index");
  return std::string{RANK_CHARS[card_rank(c)], SUIT_CHARS[card_suit(c)]};
}

std::vector<int> parse_cards(const std::string& s) {
  std::string compact;
  for (char ch : s)
    if (!std::isspace(static_cast<unsigned char>(ch)) && ch != ',') compact += ch;
  if (compact.size() % 2) throw std::invalid_argument("bad card list: '" + s + "'");
  std::vector<int> out;
  CardMask seen = 0;
  for (size_t i = 0; i < compact.size(); i += 2) {
    int c = parse_card(compact.substr(i, 2));
    if (seen & card_bit(c)) throw std::invalid_argument("duplicate card in '" + s + "'");
    seen |= card_bit(c);
    out.push_back(c);
  }
  return out;
}

std::string cards_to_string(const std::vector<int>& cards) {
  std::string out;
  for (int c : cards) out += card_to_string(c);
  return out;
}

ComboTable::ComboTable() {
  for (auto& row : index) row.fill(-1);
  int k = 0;
  for (int a = 1; a < NUM_CARDS; ++a) {
    for (int b = 0; b < a; ++b) {
      index[a][b] = index[b][a] = static_cast<int16_t>(k);
      cards[k] = {static_cast<uint8_t>(a), static_cast<uint8_t>(b)};
      ++k;
    }
  }
}

const ComboTable& combo_table() {
  static const ComboTable table;
  return table;
}

}  // namespace flipup

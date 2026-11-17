import SwiftUI

// Playing cards for the Live Activity: a white rounded card with the rank over an SF Symbol suit, hearts and diamonds
// red, spades and clubs black. A dashed outline holds the place of a board card still to come.

enum LivePalette {
  /** The app's deep blue (brand.violet, #2557d6) and its night end, for the activity's background. */
  static let blue = Color(red: 0x25 / 255, green: 0x57 / 255, blue: 0xd6 / 255)
  static let night = Color(red: 0x0d / 255, green: 0x21 / 255, blue: 0x60 / 255)
  /** Gold (brand.gold, #f5b700): your turn and your wins, nothing else. */
  static let gold = Color(red: 0xf5 / 255, green: 0xb7 / 255, blue: 0x00 / 255)
  static let red = Color(red: 0xd9 / 255, green: 0x1e / 255, blue: 0x36 / 255)
  static let quiet = Color.white.opacity(0.72)
}

struct LiveCard: View {
  let card: String
  var width: CGFloat = 26

  var body: some View {
    let rank = Self.rank(card)
    let suit = card.last.map(String.init) ?? "s"
    let red = suit == "h" || suit == "d"
    RoundedRectangle(cornerRadius: width * 0.2, style: .continuous)
      .fill(.white)
      .overlay {
        VStack(spacing: -width * 0.04) {
          Text(rank)
            .font(.system(size: width * 0.5, weight: .bold, design: .rounded))
            .minimumScaleFactor(0.6)
            .lineLimit(1)
          Image(systemName: Self.symbol(suit))
            .font(.system(size: width * 0.36, weight: .semibold))
        }
        .foregroundStyle(red ? LivePalette.red : Color.black)
        .padding(.horizontal, width * 0.06)
      }
      .frame(width: width, height: width * 1.38)
      .accessibilityLabel(Self.spoken(rank: rank, suit: suit))
  }

  static func rank(_ card: String) -> String {
    switch card.first {
    case "T"?: return "10"
    case let c?: return String(c)
    case nil: return ""
    }
  }

  static func symbol(_ suit: String) -> String {
    switch suit {
    case "h": return "suit.heart.fill"
    case "d": return "suit.diamond.fill"
    case "c": return "suit.club.fill"
    default: return "suit.spade.fill"
    }
  }

  static func spoken(rank: String, suit: String) -> String {
    let ranks = ["A": "Ace", "K": "King", "Q": "Queen", "J": "Jack"]
    let suits = ["h": "hearts", "d": "diamonds", "c": "clubs", "s": "spades"]
    return "\(ranks[rank] ?? rank) of \(suits[suit] ?? "spades")"
  }
}

/** A board slot not dealt yet. */
struct EmptySlot: View {
  var width: CGFloat = 26

  var body: some View {
    RoundedRectangle(cornerRadius: width * 0.2, style: .continuous)
      .strokeBorder(Color.white.opacity(0.28), style: StrokeStyle(lineWidth: 1, dash: [3, 2.5]))
      .frame(width: width, height: width * 1.38)
      .accessibilityHidden(true)
  }
}

/** Your hole cards. Face down until the phone is unlocked: anyone can see a Lock Screen. */
struct HoleCards: View {
  let cards: [String]
  var width: CGFloat = 30
  var overlap: CGFloat = 0.18

  var body: some View {
    HStack(spacing: cards.count > 2 ? -width * 0.42 : -width * overlap) {
      ForEach(Array(cards.enumerated()), id: \.offset) { _, card in
        LiveCard(card: card, width: width)
          .shadow(color: .black.opacity(0.25), radius: 1.5, y: 1)
      }
    }
    .privacySensitive()
    .accessibilityElement(children: .combine)
    .accessibilityLabel("Your cards")
  }
}

/** The board: what's landed, then dashed slots up to five. Games with more than five board cards draw them smaller. */
struct BoardRow: View {
  let board: [String]
  var width: CGFloat = 24

  var body: some View {
    let slots = max(5, board.count)
    let w = board.count > 5 ? width * 5.4 / CGFloat(slots) : width
    HStack(spacing: w * 0.16) {
      ForEach(0..<slots, id: \.self) { i in
        if i < board.count { LiveCard(card: board[i], width: w) } else { EmptySlot(width: w) }
      }
    }
    .accessibilityElement(children: .combine)
    .accessibilityLabel(board.isEmpty ? "No board cards yet" : "Board")
  }
}

import SwiftUI

// Playing cards for the Live Activity, drawn like the app's own (playing-card.tsx) in its four-colour deck. The board shows only the cards that have landed.

enum LivePalette {
  /** The app's deep blue (brand.violet, #2557d6), for the FlipUp mark and the island's edge. */
  static let blue = Color(red: 0x25 / 255, green: 0x57 / 255, blue: 0xd6 / 255)
  /** Gold (brand.gold, #f5b700): your turn and your wins, nothing else. */
  static let gold = Color(red: 0xf5 / 255, green: 0xb7 / 255, blue: 0x00 / 255)
  static let quiet = Color.white.opacity(0.62)
  /** The card behind everything: near black, like Flighty's, so the cards and gold carry the colour. */
  static let card = Color(red: 0.03, green: 0.04, blue: 0.08).opacity(0.86)
  /** Your turn: the same card warmed towards gold, so you can tell it's you from across the room. */
  static let turnCard = Color(red: 0.13, green: 0.10, blue: 0.02).opacity(0.9)
  static let hairline = Color.white.opacity(0.14)
  /** Your made hand: a soft light blue, set apart from the plain labels without taking gold's place. */
  static let handBlue = Color(red: 0x9c / 255, green: 0xbe / 255, blue: 1)
}

/** FlipUp's mark: the white spade on the app's blue, a small rounded square like the Home Screen icon. */
struct FlipUpMark: View {
  var size: CGFloat = 18

  var body: some View {
    RoundedRectangle(cornerRadius: size * 0.28, style: .continuous)
      .fill(LivePalette.blue)
      .overlay {
        Image(systemName: "suit.spade.fill")
          .font(.system(size: size * 0.58, weight: .bold))
          .foregroundStyle(.white)
      }
      .frame(width: size, height: size)
      .accessibilityHidden(true)
  }
}

/** A card drawn to the app's own measurements (`playing-card.tsx`): 5:7, corners at a fifth of the width, a faint
 *  edge, the rank top left at 54% of the width in the plain system font and the suit glyph under it at 40%, in the
 *  app's four-colour deck (spades near black, hearts red, diamonds blue, clubs green). */
struct LiveCard: View {
  let card: String
  var width: CGFloat = 26

  var body: some View {
    let rank = Self.rank(card)
    let suit = card.last.map(String.init) ?? "s"
    let small = width < 32
    let rankSize = width * 0.54
    RoundedRectangle(cornerRadius: width / 5, style: .continuous)
      .fill(.white)
      .overlay {
        RoundedRectangle(cornerRadius: width / 5, style: .continuous)
          .strokeBorder(Color(red: 18 / 255, green: 18 / 255, blue: 40 / 255).opacity(0.1), lineWidth: 1)
      }
      .overlay(alignment: .topLeading) {
        VStack(alignment: .leading, spacing: 0) {
          Text(rank)
            .font(.system(size: rankSize, weight: small ? .semibold : .medium))
            .tracking(small ? 0 : -0.04 * rankSize)
            .minimumScaleFactor(0.7)
            .lineLimit(1)
          Spacer(minLength: 0)
          Text(Self.glyph(suit))
            .font(.system(size: width * 0.4))
        }
        .foregroundStyle(Self.ink(suit))
        .padding(.top, width * 0.1)
        .padding(.leading, width * (small ? 0.14 : 0.16))
        .padding(.trailing, width * 0.08)
        .padding(.bottom, width * 0.14)
      }
      .frame(width: width, height: width * 1.4)
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(Self.spoken(rank: rank, suit: suit))
  }

  /** The app's four-colour deck (INK in playing-card.tsx). */
  static func ink(_ suit: String) -> Color {
    switch suit {
    case "h": return Color(red: 0xe5 / 255, green: 0x32 / 255, blue: 0x2d / 255)
    case "d": return Color(red: 0x25 / 255, green: 0x63 / 255, blue: 0xeb / 255)
    case "c": return Color(red: 0x16 / 255, green: 0xa3 / 255, blue: 0x4a / 255)
    default: return Color(red: 0x16 / 255, green: 0x16 / 255, blue: 0x1d / 255)
    }
  }

  /** The same suit glyphs the app draws, held to their text look (never the emoji). */
  static func glyph(_ suit: String) -> String {
    switch suit {
    case "h": return "\u{2665}\u{FE0E}"
    case "d": return "\u{2666}\u{FE0E}"
    case "c": return "\u{2663}\u{FE0E}"
    default: return "\u{2660}\u{FE0E}"
    }
  }

  static func rank(_ card: String) -> String {
    switch card.first {
    case "T"?: return "10"
    case let c?: return String(c)
    case nil: return ""
    }
  }

  static func spoken(rank: String, suit: String) -> String {
    let ranks = ["A": "Ace", "K": "King", "Q": "Queen", "J": "Jack"]
    let suits = ["h": "hearts", "d": "diamonds", "c": "clubs", "s": "spades"]
    return "\(ranks[rank] ?? rank) of \(suits[suit] ?? "spades")"
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
          .shadow(color: .black.opacity(0.35), radius: 2, y: 1)
      }
    }
    .privacySensitive()
    .accessibilityElement(children: .combine)
    .accessibilityLabel("Your cards")
  }
}

/** The board: only what's landed, lined up to the right. Before the flop it says so in grey. Games with more than five
 *  board cards draw them smaller so the row keeps its width. */
struct BoardRow: View {
  let board: [String]
  var width: CGFloat = 24

  var body: some View {
    if board.isEmpty {
      Text("Before the flop")
        .font(.system(.subheadline, design: .rounded).weight(.semibold))
        .foregroundStyle(LivePalette.quiet)
        .frame(height: width * 1.4, alignment: .center)
    } else {
      let w = board.count > 5 ? width * 5.4 / CGFloat(board.count) : width
      HStack(spacing: w * 0.16) {
        ForEach(Array(board.enumerated()), id: \.offset) { _, card in LiveCard(card: card, width: w) }
      }
      .accessibilityElement(children: .combine)
      .accessibilityLabel("Board")
    }
  }
}

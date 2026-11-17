import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

// FlipUp's table on the Lock Screen and in the Dynamic Island, laid out like Flighty's: a small top row (the game and
// the hand), a big middle row (your cards on the left, the board and pot on the right), a hairline, then one status
// line with a pill on the right. On your turn the hairline is the gold clock draining and the pill is Check (or what
// it costs to call). Near-black card, generous padding so nothing meets the rounded corners. Your cards are face down
// until the phone is unlocked. The layout is in docs/DESIGN.md ("Live Activity").

typealias LiveState = TableActivityAttributes.ContentState

extension LiveState {
  var isTurn: Bool { phase == "turn" }
  var won: Bool { phase == "won" }
  var over: Bool { phase == "ended" }

  /** The turn's clock as a range, when it has one that hasn't run out. */
  var clock: ClosedRange<Date>? {
    guard let start = turnStart, let end = turnEnd, end > start else { return nil }
    return Date(timeIntervalSince1970: start)...Date(timeIntervalSince1970: end)
  }

  static func bb(_ n: Double) -> String {
    let whole = n.rounded() == n
    return "\(whole ? String(Int(abs(n))) : String(format: "%.1f", abs(n))) bb"
  }

  var potText: String { "Pot \(Self.bb(pot))" }
  var netText: String { "\(net >= 0 ? "+" : "−")\(Self.bb(net))" }
}

struct TableLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: TableActivityAttributes.self) { context in
      LockScreenView(attrs: context.attributes, state: context.state, stale: context.isStale)
        .activityBackgroundTint(LivePalette.card)
        .activitySystemActionForegroundColor(.white)
    } dynamicIsland: { context in
      let s = context.state
      let a = context.attributes
      return DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          if s.playing {
            YourHand(state: s, width: 28)
              .padding(.leading, 6)
              .dynamicIsland(verticalPlacement: .belowIfTooWide)
          } else {
            TopRow(attrs: a, state: s).padding(.leading, 6)
          }
        }
        DynamicIslandExpandedRegion(.trailing) {
          if s.playing {
            BoardAndPot(state: s, width: 19)
              .padding(.trailing, 6)
              .dynamicIsland(verticalPlacement: .belowIfTooWide)
          }
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(spacing: 10) {
            if !s.playing {
              Text(s.line)
                .font(.system(.title3, design: .rounded).weight(.bold))
                .foregroundStyle(s.over && s.place == 1 ? LivePalette.gold : .white)
                .frame(maxWidth: .infinity, alignment: .leading)
            } else {
              Hairline(state: s)
              StatusRow(attrs: a, state: s, stale: context.isStale)
            }
          }
          .padding(.horizontal, 6)
          .padding(.top, 6)
        }
      } compactLeading: {
        HoleCards(cards: s.cards, width: 15, overlap: 0.1)
      } compactTrailing: {
        CompactStatus(state: s)
      } minimal: {
        if s.isTurn, let clock = s.clock {
          TurnRing(clock: clock, size: 20)
        } else {
          Image(systemName: "suit.spade.fill").foregroundStyle(s.won ? LivePalette.gold : .white)
        }
      }
      .keylineTint(s.isTurn ? LivePalette.gold : LivePalette.blue)
    }
  }
}

extension LiveState {
  /** A hand is on: the middle row shows cards. Not in the lobby or once the table is over. */
  var playing: Bool { !over && phase != "lobby" }
}

// MARK: - Lock Screen

struct LockScreenView: View {
  let attrs: TableActivityAttributes
  let state: LiveState
  let stale: Bool

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      TopRow(attrs: attrs, state: state)
        .padding(.bottom, 14)

      if state.playing {
        HStack(alignment: .top, spacing: 12) {
          YourHand(state: state, width: 38)
          Spacer(minLength: 8)
          BoardAndPot(state: state, width: 26)
        }
        .padding(.bottom, 16)
        Hairline(state: state)
          .padding(.bottom, 14)
        StatusRow(attrs: attrs, state: state, stale: stale)
      } else {
        Text(state.line)
          .font(.system(.title2, design: .rounded).weight(.bold))
          .foregroundStyle(state.over && state.place == 1 ? LivePalette.gold : .white)
          .lineLimit(2)
      }
    }
    .padding(.horizontal, 22)
    .padding(.vertical, 20)
  }
}

/** The small row along the top: the game on the left, the hand or party round on the right. */
struct TopRow: View {
  let attrs: TableActivityAttributes
  let state: LiveState

  var body: some View {
    HStack(spacing: 6) {
      Text(attrs.emoji).font(.subheadline)
      Text(attrs.game)
        .font(.system(.subheadline, design: .rounded).weight(.bold))
        .foregroundStyle(.white)
        .lineLimit(1)
      Spacer(minLength: 8)
      Text(state.round.isEmpty ? (state.hand > 0 ? "Hand \(state.hand)" : attrs.code) : state.round)
        .font(.system(.subheadline, design: .rounded).weight(.semibold))
        .foregroundStyle(LivePalette.quiet)
        .monospacedDigit()
        .lineLimit(1)
    }
    .accessibilityElement(children: .combine)
  }
}

/** Your cards, big, with what they make under them (hidden with the cards while the phone is locked). */
struct YourHand: View {
  let state: LiveState
  let width: CGFloat

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      if state.cards.isEmpty {
        Text("Sitting out")
          .font(.system(.headline, design: .rounded).weight(.bold))
          .foregroundStyle(LivePalette.quiet)
          .frame(height: width * 1.38, alignment: .leading)
      } else {
        HoleCards(cards: state.cards, width: width)
          .opacity(state.phase == "folded" ? 0.4 : 1)
      }
      Text(state.phase == "folded" ? "Folded" : (state.handName.isEmpty ? "Your hand" : state.handName))
        .font(.system(.footnote, design: .rounded).weight(.semibold))
        .foregroundStyle(state.phase == "folded" ? LivePalette.quiet : .white)
        .lineLimit(1)
        .privacySensitive()
    }
  }
}

/** The board on the right with the pot under it, both lined up to the right edge. */
struct BoardAndPot: View {
  let state: LiveState
  let width: CGFloat

  var body: some View {
    VStack(alignment: .trailing, spacing: 6) {
      BoardRow(board: state.board, width: width)
      Text(state.potText)
        .font(.system(.footnote, design: .rounded).weight(.semibold))
        .foregroundStyle(.white)
        .monospacedDigit()
        .lineLimit(1)
    }
  }
}

/** A hairline across the card; on your turn it's the gold clock, draining. */
struct Hairline: View {
  let state: LiveState

  var body: some View {
    if state.isTurn, let clock = state.clock {
      ProgressView(timerInterval: clock, countsDown: true) { EmptyView() } currentValueLabel: { EmptyView() }
        .progressViewStyle(.linear)
        .tint(LivePalette.gold)
        .accessibilityLabel("Time left")
    } else {
      Rectangle().fill(LivePalette.hairline).frame(height: 1).accessibilityHidden(true)
    }
  }
}

// MARK: - The bottom row: what's happening, with a pill on the right

struct StatusRow: View {
  let attrs: TableActivityAttributes
  let state: LiveState
  let stale: Bool

  var body: some View {
    HStack(alignment: .center, spacing: 12) {
      VStack(alignment: .leading, spacing: 3) {
        title
        Text(subline)
          .font(.footnote.weight(.medium))
          .foregroundStyle(LivePalette.quiet)
          .monospacedDigit()
          .lineLimit(1)
      }
      Spacer(minLength: 4)
      pill
    }
  }

  @ViewBuilder private var title: some View {
    if stale {
      Text("Open FlipUp to catch up")
        .font(.system(.headline, design: .rounded).weight(.bold))
        .foregroundStyle(.white)
    } else if state.isTurn {
      HStack(spacing: 6) {
        Text("Your turn")
          .font(.system(.headline, design: .rounded).weight(.bold))
          .foregroundStyle(.white)
        if let clock = state.clock {
          Text(timerInterval: clock, countsDown: true)
            .font(.system(.headline, design: .rounded).weight(.bold))
            .foregroundStyle(LivePalette.gold)
            .monospacedDigit()
            .frame(maxWidth: 56, alignment: .leading)
        }
      }
    } else {
      Text(state.line)
        .font(.system(.headline, design: .rounded).weight(.bold))
        .foregroundStyle(state.won ? LivePalette.gold : .white)
        .lineLimit(1)
    }
  }

  private var subline: String {
    if state.isTurn {
      return state.canCheck ? "Free to check · \(LiveState.bb(state.stack)) behind" : "\(LiveState.bb(state.toCall)) to call · \(LiveState.bb(state.stack)) behind"
    }
    return "\(LiveState.bb(state.stack)) behind"
  }

  @ViewBuilder private var pill: some View {
    if stale {
      EmptyView()
    } else if state.isTurn && state.canCheck && !state.act.isEmpty {
      Button(intent: CheckIntent(origin: attrs.origin, code: attrs.code, act: state.act, hand: state.hand, seq: state.seq)) {
        Text("Check")
          .font(.system(.subheadline, design: .rounded).weight(.heavy))
          .foregroundStyle(.black)
          .padding(.horizontal, 16)
          .padding(.vertical, 8)
          .background(Capsule().fill(LivePalette.gold))
      }
      .buttonStyle(.plain)
    } else if state.isTurn {
      Pill(text: "Call \(LiveState.bb(state.toCall))", tint: LivePalette.gold, filled: false)
    } else if ["won", "lost", "even"].contains(state.phase) || (state.phase == "folded" && state.net != 0) {
      Pill(text: state.netText, tint: state.won ? LivePalette.gold : .white, filled: state.won)
    }
  }
}

/** Flighty's gate pill: a capsule holding one short fact. Filled when it's good news, tinted otherwise. */
struct Pill: View {
  let text: String
  let tint: Color
  let filled: Bool

  var body: some View {
    Text(text)
      .font(.system(.subheadline, design: .rounded).weight(.heavy))
      .monospacedDigit()
      .lineLimit(1)
      .foregroundStyle(filled ? Color.black : tint)
      .padding(.horizontal, 14)
      .padding(.vertical, 7)
      .background(Capsule().fill(filled ? tint : tint.opacity(0.16)))
  }
}

// MARK: - Dynamic Island pieces

struct CompactStatus: View {
  let state: LiveState

  var body: some View {
    if state.isTurn, let clock = state.clock {
      TurnRing(clock: clock, size: 20)
    } else if state.isTurn {
      Image(systemName: "hand.point.up.left.fill").foregroundStyle(LivePalette.gold)
    } else if ["won", "lost", "even"].contains(state.phase) || (state.phase == "folded" && state.net != 0) {
      Text(state.netText)
        .font(.system(.caption, design: .rounded).weight(.bold))
        .monospacedDigit()
        .foregroundStyle(state.won ? LivePalette.gold : .white)
    } else if state.over {
      Text(state.place > 0 ? "#\(state.place)" : "Done").font(.system(.caption, design: .rounded).weight(.bold))
    } else {
      Text(LiveState.bb(state.pot)).font(.system(.caption, design: .rounded).weight(.semibold)).monospacedDigit()
    }
  }
}

/** A gold ring that drains as your turn's clock runs down. */
struct TurnRing: View {
  let clock: ClosedRange<Date>
  let size: CGFloat

  var body: some View {
    ProgressView(timerInterval: clock, countsDown: true) { EmptyView() } currentValueLabel: { EmptyView() }
      .progressViewStyle(.circular)
      .tint(LivePalette.gold)
      .frame(width: size, height: size)
      .accessibilityLabel("Your turn")
  }
}

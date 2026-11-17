import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

// FlipUp's table on the Lock Screen and in the Dynamic Island. It answers one question at a glance: is it my turn?
// Your turn is gold, with the clock draining; every other moment is calm white on the app's deep blue. Your cards are
// face down until the phone is unlocked. The layout is in docs/DESIGN.md ("Live Activity").

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
        .activityBackgroundTint(LivePalette.night)
        .activitySystemActionForegroundColor(.white)
    } dynamicIsland: { context in
      let s = context.state
      return DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          HoleCards(cards: s.cards, width: 30)
            .padding(.leading, 4)
        }
        DynamicIslandExpandedRegion(.trailing) {
          VStack(alignment: .trailing, spacing: 2) {
            Text(s.potText).font(.system(.subheadline, design: .rounded).weight(.semibold)).monospacedDigit()
            Text("\(LiveState.bb(s.stack)) left").font(.caption2).foregroundStyle(LivePalette.quiet).monospacedDigit()
          }
          .padding(.trailing, 4)
        }
        DynamicIslandExpandedRegion(.center) {
          BoardRow(board: s.board, width: 22)
        }
        DynamicIslandExpandedRegion(.bottom) {
          StatusBar(attrs: context.attributes, state: s, stale: context.isStale, compact: true)
            .padding(.top, 4)
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

// MARK: - Lock Screen

struct LockScreenView: View {
  let attrs: TableActivityAttributes
  let state: LiveState
  let stale: Bool

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(spacing: 6) {
        Text(attrs.emoji).font(.footnote)
        Text(attrs.game).font(.system(.footnote, design: .rounded).weight(.semibold))
        Spacer(minLength: 8)
        Text(state.round.isEmpty ? (state.hand > 0 ? "Hand \(state.hand)" : attrs.code) : state.round)
          .font(.caption).foregroundStyle(LivePalette.quiet).monospacedDigit()
      }
      .foregroundStyle(.white.opacity(0.9))
      .accessibilityElement(children: .combine)

      if state.over || state.phase == "lobby" {
        Text(state.line)
          .font(.system(.title3, design: .rounded).weight(.bold))
          .foregroundStyle(state.over && state.place == 1 ? LivePalette.gold : .white)
      } else {
        HStack(alignment: .center, spacing: 14) {
          VStack(alignment: .leading, spacing: 5) {
            if state.cards.isEmpty {
              Text("Not in this hand").font(.footnote).foregroundStyle(LivePalette.quiet)
            } else {
              HoleCards(cards: state.cards, width: 32)
                .opacity(state.phase == "folded" ? 0.45 : 1)
            }
            if !state.handName.isEmpty {
              Text(state.handName)
                .font(.caption.weight(.medium))
                .foregroundStyle(LivePalette.quiet)
                .lineLimit(1)
                .privacySensitive()
            }
          }
          Spacer(minLength: 0)
          BoardRow(board: state.board, width: 25)
        }
      }

      StatusBar(attrs: attrs, state: state, stale: stale, compact: false)
    }
    .padding(16)
  }
}

// MARK: - The bottom line: your turn and its clock, or what's happening

struct StatusBar: View {
  let attrs: TableActivityAttributes
  let state: LiveState
  let stale: Bool
  let compact: Bool

  var body: some View {
    if stale && !state.over {
      Text("Open FlipUp to catch up").font(.footnote).foregroundStyle(LivePalette.quiet)
    } else if state.isTurn {
      VStack(alignment: .leading, spacing: 6) {
        HStack(spacing: 8) {
          Text("YOUR TURN")
            .font(.system(.caption, design: .rounded).weight(.heavy))
            .tracking(0.6)
            .foregroundStyle(LivePalette.gold)
          if let clock = state.clock {
            ProgressView(timerInterval: clock, countsDown: true) { EmptyView() } currentValueLabel: { EmptyView() }
              .progressViewStyle(.linear)
              .tint(LivePalette.gold)
            Text(timerInterval: clock, countsDown: true)
              .font(.system(.caption, design: .rounded).weight(.semibold))
              .monospacedDigit()
              .foregroundStyle(LivePalette.gold)
              .frame(width: 34, alignment: .trailing)
          } else {
            Spacer(minLength: 0)
          }
        }
        HStack(spacing: 8) {
          Text(state.canCheck ? "Check or bet · \(state.potText)" : "\(LiveState.bb(state.toCall)) to call · \(state.potText)")
            .font(.footnote.weight(.medium))
            .foregroundStyle(.white)
            .monospacedDigit()
            .lineLimit(1)
          Spacer(minLength: 4)
          if state.canCheck && !state.act.isEmpty {
            Button(intent: CheckIntent(origin: attrs.origin, code: attrs.code, act: state.act, hand: state.hand, seq: state.seq)) {
              Text("Check").font(.system(.subheadline, design: .rounded).weight(.bold)).padding(.horizontal, 6)
            }
            .buttonStyle(.borderedProminent)
            .buttonBorderShape(.capsule)
            .tint(LivePalette.blue)
            .controlSize(compact ? .small : .regular)
          }
        }
      }
    } else {
      HStack(spacing: 8) {
        Text(state.line)
          .font(.footnote.weight(state.won ? .semibold : .regular))
          .foregroundStyle(state.won ? LivePalette.gold : LivePalette.quiet)
          .lineLimit(1)
        Spacer(minLength: 4)
        if !state.over && state.phase != "lobby" {
          Text(state.potText).font(.footnote.weight(.semibold)).monospacedDigit().foregroundStyle(.white)
        }
      }
    }
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

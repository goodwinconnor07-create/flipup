import ActivityKit
import Foundation

// A FlipUp table's Live Activity. The same struct is in native/targets/live (the widget extension that draws it):
// ActivityKit matches the two by name and shape, so they must stay identical (native/tests/live-activity.test.ts
// checks). ContentState's fields are `LiveState` in src/game/liveActivity.ts, which the server pushes as JSON.
public struct TableActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    public var phase: String
    public var hand: Int
    public var cards: [String]
    public var board: [String]
    public var handName: String
    public var pot: Double
    public var toCall: Double
    public var canCheck: Bool
    public var turnStart: Double?
    public var turnEnd: Double?
    public var line: String
    public var net: Double
    public var stack: Double
    public var place: Int
    public var of: Int
    public var round: String
    public var seq: Int
    public var act: String
  }

  public var code: String
  public var game: String
  public var emoji: String
  /** The FlipUp server the Check button talks to. */
  public var origin: String
}

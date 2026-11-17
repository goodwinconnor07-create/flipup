import AppIntents
import Foundation

// The Live Activity's one button: Check, offered only when checking is free. It runs here in the widget extension and
// tells the table straight away; the table then pushes the new state back to the activity. `act` is the key the table
// gave this phone's activity (never the device id), and `hand`/`seq` pin it to the turn it was shown on, so a stale
// tap can't act on a later turn.
struct CheckIntent: AppIntent {
  static let title: LocalizedStringResource = "Check"
  static let isDiscoverable = false

  @Parameter(title: "Server") var origin: String
  @Parameter(title: "Table") var code: String
  @Parameter(title: "Key") var act: String
  @Parameter(title: "Hand") var hand: Int
  @Parameter(title: "Move") var seq: Int

  init() {}

  init(origin: String, code: String, act: String, hand: Int, seq: Int) {
    self.origin = origin
    self.code = code
    self.act = act
    self.hand = hand
    self.seq = seq
  }

  func perform() async throws -> some IntentResult {
    guard let url = URL(string: "\(origin)/api/tables/\(code)/live/check") else { return .result() }
    var request = URLRequest(url: url, timeoutInterval: 10)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "content-type")
    request.httpBody = try JSONSerialization.data(withJSONObject: ["act": act, "hand": hand, "seq": seq])
    _ = try? await URLSession.shared.data(for: request)
    return .result()
  }
}

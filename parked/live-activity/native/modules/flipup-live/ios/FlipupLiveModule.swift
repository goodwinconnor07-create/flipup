import ActivityKit
import ExpoModulesCore

// Starts, updates and ends FlipUp's table Live Activities. Each activity asks for a push token, and every token Apple
// hands out (it can change while the activity runs) goes to JavaScript as `onPushToken`, which sends it to the table.
public class FlipupLiveModule: Module {
  private var watched = Set<String>()
  private var tokens: [String: String] = [:]

  public func definition() -> ModuleDefinition {
    Name("FlipupLive")

    Events("onPushToken")

    OnCreate {
      // Activities still running from before the app was closed keep reporting their tokens.
      for activity in Activity<TableActivityAttributes>.activities { self.watch(activity) }
    }

    Function("isEnabled") { () -> Bool in
      ActivityAuthorizationInfo().areActivitiesEnabled
    }

    AsyncFunction("start") { (attributes: String, state: String) -> String in
      let attrs = try JSONDecoder().decode(TableActivityAttributes.self, from: Data(attributes.utf8))
      let content = try JSONDecoder().decode(TableActivityAttributes.ContentState.self, from: Data(state.utf8))
      let activity = try Activity.request(attributes: attrs, content: .init(state: content, staleDate: nil), pushType: .token)
      self.watch(activity)
      return activity.id
    }

    AsyncFunction("update") { (id: String, state: String) in
      let content = try JSONDecoder().decode(TableActivityAttributes.ContentState.self, from: Data(state.utf8))
      for activity in Activity<TableActivityAttributes>.activities where activity.id == id {
        await activity.update(.init(state: content, staleDate: nil))
      }
    }

    AsyncFunction("end") { (id: String?, state: String?) in
      let content = try state.map { try JSONDecoder().decode(TableActivityAttributes.ContentState.self, from: Data($0.utf8)) }
      for activity in Activity<TableActivityAttributes>.activities where id == nil || activity.id == id {
        let last = content.map { ActivityContent(state: $0, staleDate: nil) }
        await activity.end(last, dismissalPolicy: last == nil ? .immediate : .after(Date().addingTimeInterval(60)))
      }
    }

    Function("running") { () -> [[String: String]] in
      Activity<TableActivityAttributes>.activities
        .filter { $0.activityState == .active || $0.activityState == .stale }
        .map { ["id": $0.id, "code": $0.attributes.code] }
    }

    Function("tokenOf") { (id: String) -> String? in
      self.tokens[id]
    }
  }

  private func watch(_ activity: Activity<TableActivityAttributes>) {
    guard !watched.contains(activity.id) else { return }
    watched.insert(activity.id)
    let id = activity.id
    let code = activity.attributes.code
    Task { [weak self] in
      for await data in activity.pushTokenUpdates {
        let hex = data.map { String(format: "%02x", $0) }.joined()
        self?.tokens[id] = hex
        self?.sendEvent("onPushToken", ["id": id, "code": code, "token": hex])
      }
    }
  }
}

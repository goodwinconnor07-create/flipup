import CoreHaptics
import ExpoModulesCore

// Plays an AHAP pattern (Apple's JSON haptic format) through Core Haptics. One engine, started on first use and
// restarted after the system stops it (a call, the app going to the background).
public class FlipupHapticsModule: Module {
  private var engine: CHHapticEngine?

  public func definition() -> ModuleDefinition {
    Name("FlipupHaptics")

    Function("isSupported") { () -> Bool in
      CHHapticEngine.capabilitiesForHardware().supportsHaptics
    }

    AsyncFunction("play") { (ahap: String) in
      guard CHHapticEngine.capabilitiesForHardware().supportsHaptics, let data = ahap.data(using: .utf8) else { return }
      try self.readyEngine().playPattern(from: data)
    }
  }

  private func readyEngine() throws -> CHHapticEngine {
    if let engine { try engine.start(); return engine }
    let made = try CHHapticEngine()
    made.playsHapticsOnly = true
    made.isAutoShutdownEnabled = true
    made.resetHandler = { [weak made] in try? made?.start() }
    try made.start()
    engine = made
    return made
  }
}

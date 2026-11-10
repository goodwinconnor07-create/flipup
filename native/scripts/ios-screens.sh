#!/usr/bin/env bash
# Screenshots of the real iPhone app in the iOS Simulator (run by .github/workflows/ios-screens.yml on a Mac, from
# native/): installs the Simulator build, loads the demo data into the app's storage, opens each tab in light and
# dark mode with `simctl`, then lets Maestro tap and scroll for the rest. Writes PNGs to $OUT.
set -euo pipefail
OUT=${OUT:?set OUT}
DEV=${DEV:?set DEV}
mkdir -p "$OUT"
APP=$(ls -d build/Build/Products/Release-iphonesimulator/*.app | head -1)
BID=$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$APP/Info.plist")
echo "App $APP ($BID) on $DEV"

xcrun simctl status_bar "$DEV" override --time "9:41" --dataNetwork wifi --wifiMode active --wifiBars 3 --cellularMode active --cellularBars 4 --batteryState charged --batteryLevel 100 || true
xcrun simctl install "$DEV" "$APP"

seed() {
  (cd .. && npx tsx native/scripts/demoData.ts > "$RUNNER_TEMP/demo.json")
  local data
  data=$(xcrun simctl get_app_container "$DEV" "$BID" data)
  mkdir -p "$data/Documents/SQLite"
  rm -f "$data/Documents/SQLite/ExpoSQLiteStorage"*
  node scripts/seedSql.mjs "$RUNNER_TEMP/demo.json" | sqlite3 "$data/Documents/SQLite/ExpoSQLiteStorage"
}
shot() { sleep "${2:-4}"; xcrun simctl io "$DEV" screenshot "$OUT/$1.png"; echo "shot $1"; }
open_url() { xcrun simctl openurl "$DEV" "$1"; }

for scheme in light dark; do
  xcrun simctl ui "$DEV" appearance "$scheme"
  xcrun simctl terminate "$DEV" "$BID" 2>/dev/null || true
  seed
  xcrun simctl launch "$DEV" "$BID"
  shot "$scheme-1-my-games-bots" 14
  open_url "flipup:///?tab=online"; shot "$scheme-2-my-games-online"
  open_url "flipup:///train?tab=practice"; shot "$scheme-3-training-practice"
  open_url "flipup:///train?tab=history"; shot "$scheme-4-training-history"
  open_url "flipup:///stats?tab=poker"; shot "$scheme-5-stats-poker"
  open_url "flipup:///stats?tab=training"; shot "$scheme-6-stats-training"
done

# Taps and scrolls (the Start a Game menu, the bottom of Stats), light mode. Best effort: the shots above stand alone.
xcrun simctl ui "$DEV" appearance light
xcrun simctl terminate "$DEV" "$BID" 2>/dev/null || true
seed
if command -v maestro >/dev/null; then
  cat > "$RUNNER_TEMP/flow.yaml" <<YAML
appId: $BID
---
- launchApp:
    stopApp: false
- waitForAnimationToEnd:
    timeout: 15000
- tapOn: "Start a Game"
- waitForAnimationToEnd
- takeScreenshot: "$OUT/light-7-start-a-game-menu"
- tapOn:
    point: "50%,90%"
- openLink: "flipup:///stats?tab=poker"
- waitForAnimationToEnd
- scrollUntilVisible:
    element: "Most played game"
    direction: DOWN
- waitForAnimationToEnd
- takeScreenshot: "$OUT/light-8-stats-poker-middle"
- scrollUntilVisible:
    element: "Games You Play"
    direction: DOWN
- scroll
- waitForAnimationToEnd
- takeScreenshot: "$OUT/light-9-stats-poker-bottom"
- openLink: "flipup:///train?tab=practice"
- waitForAnimationToEnd
- scrollUntilVisible:
    element: "Every spot"
    direction: DOWN
- scroll
- waitForAnimationToEnd
- takeScreenshot: "$OUT/light-10-training-every-spot"
YAML
  maestro --device "$DEV" test "$RUNNER_TEMP/flow.yaml" || echo "::warning::Maestro flow didn't finish; the simctl shots are still there"
fi
ls -la "$OUT"

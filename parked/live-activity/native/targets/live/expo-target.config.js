// The widget extension that draws FlipUp's table Live Activity on the Lock Screen and in the Dynamic Island.
// @bacons/apple-targets turns this folder into an Xcode target at prebuild (see docs/LIVE_ACTIVITY.md).
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = () => ({
  type: 'widget',
  name: 'FlipUpLive',
  displayName: 'FlipUp',
  bundleIdentifier: '.live',
  deploymentTarget: '18.0',
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit', 'AppIntents'],
  colors: {
    $accent: '#2557d6',
    $widgetBackground: '#0d2160',
  },
});

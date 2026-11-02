# Motion and touch (iPhone app)

Phase 4 of the native rebuild. Every decision here went through the `expo-animation` skill's sequence: should it
animate at all, what is it for, the cheapest tool, which properties, spring or curve. The numbers live in
`src/design/tokens.ts` (`motion`) and `native/src/motion/presets.ts`; nothing is tuned by eye.

## What moves, and why

| Thing | How often | Purpose | Decision |
|---|---|---|---|
| Pressing any button or tile | Tens of times a game | Feedback | Dips to 97% and dims to 85% in 80ms (ease-out) on press-in; springs back on release (mass 1, stiffness 450, damping 30, about 220ms). Transform and opacity only, on the UI thread (`PressableScale`). A re-press picks up mid-spring. |
| Pressing a Settings row | Often | Feedback | No movement: the row's fill goes to `cellPressed` while held, as Settings rows do. |
| Switches, segmented controls, steppers | Often | State | Apple's own controls (SwiftUI through `@expo/ui`) with their own animation. Nothing added. |
| Pushing a screen | Often | Spatial | The native stack's own push from the right (350ms) and swipe back from the left edge. Never rebuilt in JS. |
| Sheets | Occasional | Spatial | Real iOS form sheets (`presentation: 'formSheet'`) with half and full detents and a grab handle. Dismissed by a swipe down or the handle. |
| Scrolling | Constant | — | Native scroll views: system indicators and rubber-band bounce. No custom physics. |
| Tab switches (Phase 5) | 100+ a day | — | No animation. Tabs are peers; they never slide. |
| Toasts and small banners | Occasional | State | Rise 8pt and fade in over 250ms (ease-out), leave in 160ms (`enter()`/`exit()` in `presets.ts`). |

Rejected: animating the header into a large title by hand (the native stack's `headerLargeTitleEnabled` does
it), any slide between tabs, and scaling an element in from nothing.

## Haptics

`native/src/components/haptics.ts`, iPhone only:

| Moment | Haptic |
|---|---|
| A button or row is tapped (on release, as it commits) | `tap`: light impact |
| A choice changes (switch, segmented control, stepper) | `select`: selection tick |
| Something worked | `success` notification |
| Something failed | `failure` notification |

Never on scrolling, never on an entrance the person didn't cause, and never the only feedback: each one comes
with something to see. Many people turn haptics off.

## Reduce Motion

`useReduceMotion()` (`native/src/motion/use-reduce-motion.ts`) reads `AccessibilityInfo.isReduceMotionEnabled()`
and follows the setting live. With it on:

- presses only dim (no scale),
- toasts fade (no rise),
- pushed screens fade instead of sliding (`animation: 'fade'` on the stack).

Colour and opacity changes that explain a state stay; translation, scale and overshoot go.

## 120fps

`CADisableMinimumFrameDurationOnPhone` is set in `app.config.ts` (Expo's template also sets it), so animations
run at 120fps on ProMotion iPhones. The frame budget is then about 8ms, which is why everything above runs on the
UI thread.

## Speed targets: measure on a real phone

The plan's targets can only be checked on a device, in a release build (not Expo Go, not the simulator):

| Target | Built to meet it | How to measure |
|---|---|---|
| Screen transition about 350ms | It is the system push | Instruments, Animation Hitches template: push and pop five times; no hitches, and the transition interval reads about 350ms |
| Sheet opens in about 350ms | It is the system sheet | Same template: open and close the sample sheet five times |
| Press response under 100ms | The dip starts on touch-down, on the UI thread, and lasts 80ms | Record the screen at 240fps (Settings › Camera › Record Slo-mo) while tapping; count frames from the finger landing to the first visible dip |
| No dropped frames on an older phone | Transform and opacity only, no work per frame on the JS thread | Instruments, Time Profiler and Animation Hitches on the oldest iPhone that runs iOS 18 (iPhone XS / XR class) |

**Status:** not measured yet. Nothing in this repository has run on a phone; the web build and the iOS bundle
compile, and the screens were checked in a browser. Fill in this table with dates and results after the first
on-device run.

Feel-check on the phone:

- Tap a button quickly twice: the second press must pick up mid-spring, with no snap.
- Press, drag your finger a little, and let go: the press must still count (16pt of drift is allowed).
- Swipe back from the left edge slowly, stop halfway, then let go: the screen must follow your finger and settle.
- Pull the sheet from half to full and flick it down.
- Turn on Reduce Motion with the app open: presses stop scaling at once, and pushes fade.

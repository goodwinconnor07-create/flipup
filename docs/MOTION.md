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
| Toasts and small banners | Occasional | State | Rise 8pt and fade in over 250ms (ease-out), leave in 200ms (`enter()`/`exit()` in `presets.ts`). |
| A verdict, letter, count or menu appearing in place | Often | State | `popIn()`: grows from 95% and fades in over 250ms, ease-out, no overshoot. Never from nothing, never a bounce. |

Rejected: animating the header into a large title by hand (the native stack's `headerLargeTitleEnabled` does
it), any slide between tabs, and scaling an element in from nothing.

## The 20 rules

From a reel, "20 Ways to Make Beautiful AI Animations", and **binding on everything that moves, now and in every
later change** (the owner's instruction, 6 November 2026). Each one says where it lives in the code. The numbers
are in `motion` (`src/design/tokens.ts`), the pure helpers in `native/src/motion/rules.ts`, the presets in
`native/src/motion/presets.ts`, the web's in `:root` of `global.css` (`--ease-out`, `--dur-exit`, `--stagger`,
`--pop-from`), and `native/tests/motion-rules.test.ts` fails when code breaks the ones a test can see.

| # | Rule | In this app |
|---|---|---|
| 1 | Ease-out for entrances | `EASE_OUT` (0.23, 1, 0.32, 1), `--ease-out`. No `Easing.in`, no plain `ease-in` on something arriving |
| 2 | Dropdowns open in 150 to 250ms | `motion.dropdown`; `popIn()` is 250 |
| 3 | Stagger list rows by 30ms | `stagger(i)` (30ms a step, at most 8 steps), `--stagger` |
| 4 | Scale to 0.97 on press | `motion.pressScale`, `PressableScale` |
| 5 | Stretch a moving knob 12% (its other side shrinks so its area stays the same) | `knobStretch()`; the bet slider's thumb while held |
| 6 | Stagger details as a card settles | `stagger(i)` on a card's parts (the deal wipe's suits) |
| 7 | Arcs for objects that travel | `arcPoint()` (32px bow, `motion.arc`); the web's `flyChips()` already arcs |
| 8 | Pulse to confirm success | out to 108% and back (`PotChips`, `chip-pop`), never a bounce |
| 9 | Ease-in-out for moves across the screen | `EASE_IN_OUT`, `--ease-in-out` |
| 10 | Popovers start at 0.95, never 0 | `popIn()`, `motion.popFrom`, `--pop-from`; `ZoomIn` is only allowed inside `presets.ts` |
| 11 | Enter from the trigger | set `transformOrigin` to the trigger's corner (the web build's `Menu`) |
| 12 | Exit toward the trigger | the same origin on the way out |
| 13 | No bounce on everyday UI | `SETTLE` (critically damped) and `popIn()`; any spring in numbers keeps a damping ratio of 0.7 or more; no easing curve with a y above 1 |
| 14 | Don't tween while held | while a finger is down, a thing is exactly under it (the bet slider, the hand fan, `SwipeAway`); springs only on release |
| 15 | Exits 20% shorter than entrances | `motion.exit` (200) against `motion.base` (250), `exitMs()`, `--dur-exit` |
| 16 | Overlap the old and the new state | no blank beat: start the new state while the old one leaves |
| 17 | Masks for reveals and colour | clip content or a gradient to reveal text and colour changes; don't crossfade two copies of text |
| 18 | Crossfade icons with scale and blur | when an icon swaps for another (copy to check), fade both with a small scale and blur, not a hard swap |
| 19 | Rubber band past bounds | `rubber()`: exact to the limit, then diminishing resistance, never a wall (`SwipeAway`) |
| 20 | Reuse the same layout id | when a thing opens into a bigger version of itself, animate the same view (shared element, Reanimated layout transitions, or the web's View Transitions), not a replacement |

Rules 1 to 15 and 19 are in the code and checked by tests. Rules 16 to 18 and 20 are the way to build new
things; use them whenever a screen changes an icon, a label or a panel, and say in the change which rules it
touched. Reduce Motion still wins over all of them. Where a rule and a celebration collide (the confetti and the
win banner), the rule stays and the celebration comes from colour, confetti and haptics, not from overshoot.

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

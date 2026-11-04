# Gradients in the iPhone app (Stage 5)

Softer and slowly alive. Only `native/` changed; the web tokens and `global.css` are untouched (the app maps its
own values in `native/src/theme/brand.ts`). White text on the lightest stop of each violet card is about 4:1 as
before, and every use is large or bold text.

## Before and after

| Where | Before | After |
| --- | --- | --- |
| `cardColors.violet` (start tile, invite ticket, Friends, Party, stats) | `#8263ff #4a26d9 #2a1290` | `#8468ee #5a40cc #3a2796` |
| `cardColors.night` (bots tile, passport, deal wipe, share picture) | `#2b1a80 #170c4a #0b0626` | `#2d2078 #1b1250 #0e0a2c` |
| `cardColors.gold` | `#ffd65a #f5b700 #c77d00` | `#fbd872 #eebb2a #c98a14` |
| `gradients.blue/green/pink` (play tiles) | `#7d5cff` to `#3c1fc2` | `#8468ee` to `#4a32b4` |
| `gradients.gold` (Premium) | `#ffcf3f` to `#d48a00` | `#f8d062` to `#d49a1a` |
| LivingCard glow 1 / glow 2 | white 0.28 / violet 0.38 | white 0.20 / violet 0.26 |
| Deal wipe bottom sheen | white 0.18 | white 0.12 |
| Premium page | flat obsidian gradient | same colours on `GrainBackground`, glows 0.16 / 0.06 |

Left alone: game pictures and thumbs (`gameArt.ts` colours), table felts, rails, card backs and bubble looks
(game and Premium identities, shared with the web), fold red, the Raise green, and the party belts' edge fades
(they match the page colour).

## What moves

All of it: one `useDrift()` clock (`native/src/motion/use-drift.ts`) per layer, Reanimated on the UI thread,
transform only, 24s to 40s a leg. It stops (and nothing runs) when the screen isn't focused, the app isn't in the
foreground, Reduce Motion or "Animations off" is on. A stopped layer rests in the middle of its path.

| Moves | How |
| --- | --- |
| Every `LivingCard` (tiles, banners, ticket, stats, Party buttons, deal wipe, challenge result) | two glow layers, 24s and 34s a leg (was 9s and 13s, and never paused) |
| `GrainBackground` (Premium page now; Play with friends and bots in Stage 6) | one oversized layer holding both glows, drift and a slow turn, 40s a leg |
| Party belts | already drift sideways, unchanged |

| Still, and why |
| --- |
| Play tiles, game thumbs and pictures, bubbles, the Fold button, seat preview, felts and rails: small or many on screen at once, or a game's own picture. A moving layer in each would cost more than it shows. |
| The share picture (`still`): it's a screenshot. |
| Edge fades, texture overlays (felt weave, wood grain): they're textures, not colour fields. |

## Battery

One animated layer per card or page, transform only, no blur, no `backgroundImage` changes, no JavaScript per
frame (`.get()` runs in the worklet). The grain is a small static tile with an overlay blend and never moves.
Unfocused tabs and a backgrounded app cancel their animations. Not measured on a device: see TODO.

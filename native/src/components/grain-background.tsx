import { type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { useDrift } from '@/motion/use-drift';
import { gradient } from '@/theme';

/** Dark on purpose: white text and emoji have to stay clear on every part of it, whatever the light is doing. */
export const GRAIN_NIGHT = ['#070f2a', '#0b1533', '#040914'] as const;

/**
 * The deep blue moving background for whole pages (Play with friends, Play with bots, the lobby, Premium, Range
 * training): three soft lights, a bright blue, a cyan and a faint gold, each on its own slow clock (9s, 12s and
 * 16s a leg, dimmer but quicker since 9 Nov 2026, so the drift can be seen), so they wander, cross and part and never repeat the same picture. (It replaced a film-grain texture
 * in November 2026; the name stayed.) Cheap by design:
 *  - each light is one oversized radial gradient and only its transform changes, on the UI thread, so nothing
 *    re-renders, blurs or repaints;
 *  - it pauses off screen and in the background, and sits still under Reduce Motion (see `useDrift`).
 * The lights stay far darker than the cards, so white text reads anywhere on the page.
 */
export function GrainBackground({
  colors = GRAIN_NIGHT,
  glow = 'rgba(60, 120, 255, 0.24)',
  glow2 = 'rgba(245, 183, 0, 0.06)',
  still,
  style,
  children,
}: {
  /** Base gradient, top-left to bottom-right: keep all three dark. */
  colors?: readonly [string, string, string];
  /** The main blue light. */
  glow?: string;
  /** A fainter light (gold by default) on its own path. */
  glow2?: string;
  /** No movement (for a picture taken of the page). */
  still?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const [a, b, c] = colors;
  const { t } = useDrift(9000, !still);
  const { t: u } = useDrift(12000, !still);
  const { t: v } = useDrift(16000, !still);
  const blue = useAnimatedStyle(() => ({
    transform: [{ translateX: `${-40 + 80 * t.get()}%` }, { translateY: `${-24 + 48 * u.get()}%` }, { scale: 0.9 + 0.35 * v.get() }],
  }));
  const cyan = useAnimatedStyle(() => ({
    transform: [{ translateX: `${36 - 72 * u.get()}%` }, { translateY: `${28 - 56 * v.get()}%` }, { scale: 1.1 - 0.3 * t.get() }],
  }));
  const gold = useAnimatedStyle(() => ({
    transform: [{ translateX: `${-28 + 56 * v.get()}%` }, { translateY: `${30 - 40 * t.get()}%` }],
  }));
  const light = (colour: string) => gradient(`radial-gradient(circle at center, ${colour} 0%, transparent 62%)`);
  return (
    <View style={[{ flex: 1, overflow: 'hidden', ...gradient(`linear-gradient(160deg, ${a} 0%, ${b} 50%, ${c} 100%)`) }, style]}>
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
        <Animated.View style={[{ position: 'absolute', left: '-35%', top: '-20%', width: '120%', aspectRatio: 1, ...light(glow) }, blue]} />
        <Animated.View style={[{ position: 'absolute', right: '-40%', top: '25%', width: '110%', aspectRatio: 1, ...light('rgba(40, 200, 255, 0.11)') }, cyan]} />
        <Animated.View style={[{ position: 'absolute', left: '10%', bottom: '-30%', width: '90%', aspectRatio: 1, ...light(glow2) }, gold]} />
      </View>
      {children}
    </View>
  );
}

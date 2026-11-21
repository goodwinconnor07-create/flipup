import { type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { useDrift } from '@/motion/use-drift';
import { gradient, radius as radii, useShadows } from '@/theme';

/**
 * Every coloured surface in the app (the start tiles, the stats card, banners, the invite ticket, Premium): a
 * three-stop gradient with two soft glows that drift across it slowly, so colour never looks flat. No grain (the
 * owner's call, November 2026). Under Reduce Motion the glows stay put.
 *
 * Shadows: iOS clips a view's shadow when the same view clips its content, and a rounded card has to clip. So the
 * shadow sits on an outer layer and the clipping on an inner one; that's why a card's shadow was missing before.
 */
export function LivingCard({
  colors: [a, b, c],
  glow = 'rgba(255, 255, 255, 0.2)',
  glow2 = 'rgba(90, 160, 255, 0.3)',
  radius = radii.xl,
  shadow = true,
  still,
  style,
  outerStyle,
  children,
}: {
  colors: readonly [string, string, string];
  /** The glow that drifts top left to bottom right. */
  glow?: string;
  /** The second glow, which drifts the other way. */
  glow2?: string;
  radius?: number;
  /** true for the coloured-card shadow, 'soft' for a button's, false for none. */
  shadow?: boolean | 'soft';
  /** No drift: for a picture taken of the card (sharing). */
  still?: boolean;
  /** Padding and layout of the content. */
  style?: StyleProp<ViewStyle>;
  /** Size and placement of the card itself. */
  outerStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const shadows = useShadows();
  // Two slow clocks (24s and 34s each way) so the glows never line up twice; paused off screen and in the background.
  const { t } = useDrift(24000, !still);
  const { t: u } = useDrift(34000, !still);
  const drift1 = useAnimatedStyle(() => ({ transform: [{ translateX: `${-20 + 40 * t.get()}%` }, { translateY: `${-15 + 30 * u.get()}%` }, { scale: 1 + 0.15 * u.get() }] }));
  const drift2 = useAnimatedStyle(() => ({ transform: [{ translateX: `${20 - 40 * u.get()}%` }, { translateY: `${15 - 30 * t.get()}%` }] }));
  return (
    <View style={[{ borderRadius: radius, borderCurve: 'continuous', boxShadow: shadow === 'soft' ? shadows.soft : shadow ? shadows.raised : undefined }, outerStyle]}>
      <View style={[{ flexGrow: 1, borderRadius: radius, borderCurve: 'continuous', overflow: 'hidden', ...gradient(`linear-gradient(150deg, ${a} 0%, ${b} 55%, ${c} 100%)`) }]}>
        <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
          <Animated.View style={[{ position: 'absolute', left: '-40%', top: '-60%', width: '120%', aspectRatio: 1, ...gradient(`radial-gradient(circle at center, ${glow} 0%, transparent 65%)`) }, drift1]} />
          <Animated.View style={[{ position: 'absolute', right: '-45%', bottom: '-70%', width: '130%', aspectRatio: 1, ...gradient(`radial-gradient(circle at center, ${glow2} 0%, transparent 65%)`) }, drift2]} />
        </View>
        <View style={style}>{children}</View>
      </View>
    </View>
  );
}

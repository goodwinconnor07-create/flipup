import { type ReactNode } from 'react';
import { Image, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { useDrift } from '@/motion/use-drift';
import { gradient } from '@/theme';

const GRAIN = require('../../assets/images/grain.png');

/** Dark on purpose: white text and emoji have to stay clear on every part of it, whatever the glow is doing. */
export const GRAIN_NIGHT = ['#0d0a24', '#150f3a', '#07051a'] as const;

/**
 * A dark, slowly moving, grainy field for whole pages (Play with friends, Play with bots). Cheap by design:
 *  - one oversized layer holds both glows in a single gradient and only its transform changes (drift and a slow
 *    turn, 40s a leg), on the UI thread, so nothing re-renders and nothing is blurred or repainted;
 *  - the grain is a small static tile that never moves;
 *  - it pauses off screen and in the background, and sits still under Reduce Motion (see `useDrift`).
 * The colours stay far darker than the cards': glows are at most about a fifth as bright as the base.
 */
export function GrainBackground({
  colors = GRAIN_NIGHT,
  glow = 'rgba(120, 90, 255, 0.22)',
  glow2 = 'rgba(245, 183, 0, 0.07)',
  grain = 0.1,
  still,
  style,
  children,
}: {
  /** Base gradient, top-left to bottom-right: keep all three dark. */
  colors?: readonly [string, string, string];
  /** The violet glow that drifts across. */
  glow?: string;
  /** A fainter second glow (gold by default) at the far side of the same layer. */
  glow2?: string;
  /** Strength of the grain tile. */
  grain?: number;
  /** No drift (for a picture taken of the page). */
  still?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const [a, b, c] = colors;
  const { t } = useDrift(40000, !still);
  const layer = useAnimatedStyle(() => ({
    transform: [{ translateX: `${-12 + 24 * t.get()}%` }, { translateY: `${10 - 20 * t.get()}%` }, { rotate: `${-8 + 16 * t.get()}deg` }],
  }));
  return (
    <View style={[{ flex: 1, overflow: 'hidden', ...gradient(`linear-gradient(160deg, ${a} 0%, ${b} 50%, ${c} 100%)`) }, style]}>
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: '-50%',
              top: '-25%',
              width: '200%',
              height: '150%',
              ...gradient(`radial-gradient(circle at 30% 30%, ${glow} 0%, transparent 38%), radial-gradient(circle at 75% 72%, ${glow2} 0%, transparent 36%)`),
            },
            layer,
          ]}
        />
        <Image source={GRAIN} resizeMode="repeat" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: grain, mixBlendMode: 'overlay' }} />
      </View>
      {children}
    </View>
  );
}

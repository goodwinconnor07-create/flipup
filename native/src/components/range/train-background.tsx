// Range training's page: the app's moving blue light field (GrainBackground), dimmer and nearly twice as slow, so it
// breathes rather than moves; a training room needs focus. It also answers how you're doing: a best play warms the
// room with a gold light from below, also good warms it a little, a miss cools it, and a finished daily quiz settles
// into a still, calm glow. The mood is a fade of two fixed layers (opacity only), so it costs nothing, and it's the
// same under Reduce Motion, where the lights themselves stand still.
import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { GrainBackground } from '@/components/grain-background';
import { EASE_OUT } from '@/motion/presets';
import { gradient } from '@/theme';

export type TrainMood = 'idle' | 'best' | 'ok' | 'mistake' | 'done';

const WARM: Record<TrainMood, number> = { idle: 0, best: 1, ok: 0.4, mistake: 0, done: 0.55 };
const COOL: Record<TrainMood, number> = { idle: 0, best: 0, ok: 0, mistake: 1, done: 0 };
const FADE_MS = 900;

export function TrainBackground({ mood = 'idle', still, children }: { mood?: TrainMood; /** Lights stand still (while a hand is being read). */ still?: boolean; children?: ReactNode }) {
  const warm = useSharedValue(WARM[mood]);
  const cool = useSharedValue(COOL[mood]);
  useEffect(() => {
    warm.set(withTiming(WARM[mood], { duration: FADE_MS, easing: EASE_OUT }));
    cool.set(withTiming(COOL[mood], { duration: FADE_MS, easing: EASE_OUT }));
  }, [mood, warm, cool]);
  const warmStyle = useAnimatedStyle(() => ({ opacity: warm.get() }));
  const coolStyle = useAnimatedStyle(() => ({ opacity: cool.get() }));
  return (
    <GrainBackground glow="rgba(60, 120, 255, 0.15)" glow2="rgba(245, 183, 0, 0.04)" glow3="rgba(40, 200, 255, 0.06)" slow={1.8} still={still}>
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
        <Animated.View style={[{ position: 'absolute', inset: 0, ...gradient('radial-gradient(ellipse at 50% 100%, rgba(245, 183, 0, 0.2) 0%, rgba(245, 183, 0, 0.06) 45%, transparent 75%)') }, warmStyle]} />
        <Animated.View style={[{ position: 'absolute', inset: 0, backgroundColor: 'rgba(2, 5, 16, 0.42)' }, coolStyle]} />
      </View>
      {children}
    </GrainBackground>
  );
}

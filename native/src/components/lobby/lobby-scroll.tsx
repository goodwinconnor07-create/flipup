import { BlurView } from 'expo-blur';
import { type ScrollViewProps } from 'react-native';
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLobbyTint, useReduceTransparency } from '@/theme';

import { GRAIN_NIGHT } from '../grain-background';

/**
 * A lobby page's scroll view, with the top edge to match Start game's bar at the bottom: once the page scrolls, a dark
 * blur tinted with the page's darkest colour fades in under the status bar, so the cards never run under the clock
 * (solid under Reduce Transparency). Used by Play with bots, Play with friends and the table lobby.
 */
export function LobbyScroll({ children, ...rest }: ScrollViewProps) {
  const insets = useSafeAreaInsets();
  const tint = useLobbyTint();
  const night = tint.night ?? GRAIN_NIGHT[2];
  const solid = useReduceTransparency();
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.set(e.contentOffset.y);
  });
  const veil = useAnimatedStyle(() => ({ opacity: interpolate(y.get(), [0, 24], [0, 1], 'clamp') }));
  return (
    <>
      <Animated.ScrollView contentInsetAdjustmentBehavior="never" scrollEventThrottle={16} {...rest} onScroll={onScroll}>
        {children}
      </Animated.ScrollView>
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, overflow: 'hidden', borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.12)' }, veil]}
      >
        {solid ? (
          <Animated.View style={{ position: 'absolute', inset: 0, backgroundColor: night }} />
        ) : (
          <>
            <BlurView tint="systemChromeMaterialDark" intensity={80} style={{ position: 'absolute', inset: 0 }} />
            <Animated.View style={{ position: 'absolute', inset: 0, backgroundColor: night, opacity: 0.6 }} />
          </>
        )}
      </Animated.View>
    </>
  );
}

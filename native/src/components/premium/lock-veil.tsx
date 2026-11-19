import { BlurView } from 'expo-blur';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { motion } from '@design/tokens';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { EASE_OUT } from '@/motion/presets';
import { ROUNDED, spacing, useReduceTransparency } from '@/theme';

/**
 * The lock over a Premium game's buttons, for someone without Premium: a dark blur (a solid shade under Reduce
 * Transparency) with a lock, "Unlock Premium to play" and a line saying friends who join play the game free. A tap
 * anywhere on it opens the offer. It covers whatever it sits in (`position: absolute`, the parent clips the corners).
 * The game sheet puts it over its buttons; Home puts the compact one over Host a game; the Train tab puts it over
 * Endless, Sets and Gaps with its own words (`title`, `line`). It fades in and out (250ms in, 200ms out, ease-out) as
 * Home's games are swiped past.
 */
export function LockVeil({ game, onPress, compact = false, title = 'Unlock Premium to play', line }: { game?: string; onPress: () => void; compact?: boolean; title?: string; line?: string }) {
  const sub = line ?? `Friends who join play ${game ?? 'it'} free`;
  const solid = useReduceTransparency();
  const shell = { flex: 1, alignItems: 'center', justifyContent: 'center', gap: compact ? 2 : spacing.xs, paddingHorizontal: spacing.md } as const;
  const words = (
    <>
      {compact ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Icon name="lock.fill" size={20} color="#ffffff" />
          <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: ROUNDED, fontSize: 20, fontWeight: '800', color: '#ffffff' }}>
            {title}
          </Text>
        </View>
      ) : (
        <>
          <Icon name="lock.fill" size={30} color="#ffffff" />
          <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: ROUNDED, fontSize: 20, fontWeight: '800', color: '#ffffff' }}>
            {title}
          </Text>
        </>
      )}
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255, 255, 255, 0.8)' }}>
        {sub}
      </Text>
    </>
  );
  return (
    <Animated.View entering={FadeIn.duration(motion.base).easing(EASE_OUT)} exiting={FadeOut.duration(motion.exit).easing(EASE_OUT)} style={{ position: 'absolute', inset: 0 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${sub}`}
        onPress={() => {
          haptic.tap();
          onPress();
        }}
        style={{ flex: 1 }}
      >
        {solid ? (
          <View style={[shell, { backgroundColor: 'rgba(0, 0, 0, 0.78)' }]}>{words}</View>
        ) : (
          // Over Home's white button the sheet's light shade left white words on light grey: the compact one is darker.
          <BlurView intensity={40} tint="dark" style={[shell, { backgroundColor: compact ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.25)' }]}>
            {words}
          </BlurView>
        )}
      </Pressable>
    </Animated.View>
  );
}

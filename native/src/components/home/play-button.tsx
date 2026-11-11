import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { useDrift } from '@/motion/use-drift';
import { gradient, ROUNDED } from '@/theme';

import { haptic } from '../haptics';
import { PressableScale } from '../pressable-scale';

/**
 * The one big button on Home: solid white so it stands out on every game's colour, PLAY in the game's dark ink, a
 * soft glow behind it that breathes, and a band of the game's colour sweeping slowly across its face. A firm haptic
 * when pressed. The glow and the band are opacity and transform on the UI thread and stop off screen, in the
 * background and under Reduce Motion (`useDrift`).
 */
export function PlayButton({ line, ink, tint, label, onPress }: { line: string; ink: string; /** The sweeping band's colour. */ tint: string; label: string; onPress: () => void }) {
  const { t } = useDrift(1700);
  const { t: s } = useDrift(2800);
  const glow = useAnimatedStyle(() => ({ opacity: 0.35 + 0.4 * t.get(), transform: [{ scale: 0.98 + 0.04 * t.get() }] }));
  const band = useAnimatedStyle(() => ({ transform: [{ translateX: `${-120 + 440 * s.get()}%` }, { skewX: '-18deg' }] }));
  return (
    <View>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 4, right: 4, top: 4, bottom: 4, borderRadius: 24, boxShadow: '0 0 30px 8px rgba(255, 255, 255, 0.6)' }, glow]} />
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => {
          haptic.turn();
          onPress();
        }}
        haptics={false}
        style={{ minHeight: 76, borderRadius: 26, borderCurve: 'continuous', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}
      >
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '30%', ...gradient(`linear-gradient(90deg, transparent 0%, ${tint} 50%, transparent 100%)`) }, band]} />
        <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: ROUNDED, fontSize: 32, lineHeight: 36, fontWeight: '900', letterSpacing: 1.5, color: ink }}>
          PLAY
        </Text>
        <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontSize: 13, fontWeight: '700', color: ink, opacity: 0.7 }}>
          {line}
        </Text>
      </PressableScale>
    </View>
  );
}

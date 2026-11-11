import { Text } from 'react-native';

import { ROUNDED } from '@/theme';

import { haptic } from '../haptics';
import { PressableScale } from '../pressable-scale';

/**
 * The one big button on Home: plain solid white so it stands out on every game's colour, "Host a game" in the game's
 * dark ink with a short line under it. No glow and no moving shine. A firm haptic when pressed.
 */
export function PlayButton({ line, ink, label, onPress }: { line: string; ink: string; label: string; onPress: () => void; /** Kept so callers needn't change; the button no longer has a band. */ tint?: string }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptic.turn();
        onPress();
      }}
      haptics={false}
      style={{ minHeight: 76, borderRadius: 26, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}
    >
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontFamily: ROUNDED, fontSize: 30, lineHeight: 36, fontWeight: '900', letterSpacing: 0.3, color: ink }}>
        Host a game
      </Text>
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontSize: 13, fontWeight: '700', color: ink, opacity: 0.7 }}>
        {line}
      </Text>
    </PressableScale>
  );
}

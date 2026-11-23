import { Text, useWindowDimensions } from 'react-native';

import { ROUNDED } from '@/theme';

import { haptic } from '../haptics';
import { PressableScale } from '../pressable-scale';

/**
 * The one big button on Home: plain solid white so it stands out on every game's colour, its label ("Host Pittsburgh"
 * on Home, "Host a game" on the game sheet) in one fixed dark ink with a short line under it. No glow and no moving
 * shine. A firm haptic when pressed. Words only, like the buttons under it (23 Nov 2026, the owner's call).
 */
// Near-black, not navy: a blue ink fought every game's colour (23 Nov 2026). The button stays white on purpose, so the
// one thing you press doesn't change colour while you flick through games.
const INK = '#111111';
/** Shared with the small buttons under it, so the three read as one set. */
export const BUTTON_RADIUS = 24;

export function PlayButton({ line, label, onPress }: { line: string; label: string; onPress: () => void; /** Kept so callers needn't change; the button no longer has a band. */ tint?: string }) {
  // On the narrowest phones (320pt) the label steps down a size so "Play with friends" fits whole.
  const narrow = useWindowDimensions().width < 360;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptic.turn();
        onPress();
      }}
      haptics={false}
      style={{ minHeight: 86, borderRadius: BUTTON_RADIUS, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}
    >
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ paddingHorizontal: 16, fontFamily: ROUNDED, fontSize: narrow ? 26 : 30, lineHeight: narrow ? 32 : 36, fontWeight: '900', letterSpacing: 0.3, color: INK }}>
        {label}
      </Text>
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontSize: 13, fontWeight: '700', color: INK, opacity: 0.7 }}>
        {line}
      </Text>
    </PressableScale>
  );
}

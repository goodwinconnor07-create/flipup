import { Text, useWindowDimensions, View } from 'react-native';

import { ROUNDED } from '@/theme';

import { haptic } from '../haptics';
import { Icon, type IconName } from '../icon';
import { PressableScale } from '../pressable-scale';

/**
 * The one big button on Home: plain solid white so it stands out on every game's colour, its label ("Host Pittsburgh"
 * on Home, "Host a game" on the game sheet) in one fixed dark ink with a short line under it. No glow and no moving
 * shine. A firm haptic when pressed. An icon may sit left of the label (two people for Play with friends, 23 Nov 2026,
 * the owner's ask: Play bots and Join a game under it both had one), the label and icon centred together.
 */
const INK = '#0b1220';

export function PlayButton({ line, label, icon, onPress }: { line: string; label: string; icon?: IconName; onPress: () => void; /** Kept so callers needn't change; the button no longer has a band. */ tint?: string }) {
  // On the narrowest phones (320pt) the label and its icon step down a size so "Play with friends" fits whole.
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
      style={{ minHeight: 86, borderRadius: 26, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: narrow ? 8 : 10, maxWidth: '100%', paddingHorizontal: 16 }}>
        {icon && <Icon name={icon} size={narrow ? 22 : 26} color={INK} />}
        <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ flexShrink: 1, fontFamily: ROUNDED, fontSize: narrow ? 25 : 30, lineHeight: narrow ? 30 : 36, fontWeight: '900', letterSpacing: 0.3, color: INK }}>
          {label}
        </Text>
      </View>
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontSize: 13, fontWeight: '700', color: INK, opacity: 0.7 }}>
        {line}
      </Text>
    </PressableScale>
  );
}

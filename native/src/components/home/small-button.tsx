import { Text } from 'react-native';

import { ROUNDED, spacing } from '@/theme';

import { Icon, type IconName } from '../icon';
import { PressableScale } from '../pressable-scale';
import { BUTTON_RADIUS } from './play-button';

/** The quieter button under PLAY (Play bots, Join a game): see-through white with a clear edge, an icon left of its words (back 23 Nov 2026, the owner: words alone looked flat). */
export function SmallButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      haptics={false}
      outerStyle={{ flex: 1 }}
      style={{ minHeight: 54, flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: BUTTON_RADIUS, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.22)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.28)' }}
    >
      <Icon name={icon} size={18} color="#ffffff" />
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ flexShrink: 1, fontFamily: ROUNDED, fontSize: 17, fontWeight: '800', color: '#ffffff' }}>
        {label}
      </Text>
    </PressableScale>
  );
}

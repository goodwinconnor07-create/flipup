import { Text } from 'react-native';

import { ROUNDED, spacing } from '@/theme';

import { Icon, type IconName } from '../icon';
import { PressableScale } from '../pressable-scale';

/** The quieter button under PLAY (Play bots, Join a game): see-through white with a thin edge. */
export function SmallButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      haptics={false}
      outerStyle={{ flex: 1 }}
      style={{ minHeight: 54, flexDirection: 'row', gap: spacing.xs, borderRadius: 20, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.14)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)' }}
    >
      <Icon name={icon} size={18} color="#ffffff" />
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontFamily: ROUNDED, fontSize: 17, fontWeight: '800', color: '#ffffff' }}>
        {label}
      </Text>
    </PressableScale>
  );
}

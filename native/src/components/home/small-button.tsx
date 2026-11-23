import { Text } from 'react-native';

import { ROUNDED } from '@/theme';

import { PressableScale } from '../pressable-scale';
import { BUTTON_RADIUS } from './play-button';

/** The quieter button under PLAY (Play bots, Join a game): see-through white with a clear edge (brighter since 23 Nov 2026: fainter read as disabled), words only (23 Nov 2026, the owner: no icons on Home's buttons). */
export function SmallButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      haptics={false}
      outerStyle={{ flex: 1 }}
      style={{ minHeight: 54, borderRadius: BUTTON_RADIUS, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.22)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.28)' }}
    >
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontFamily: ROUNDED, fontSize: 17, fontWeight: '800', color: '#ffffff' }}>
        {label}
      </Text>
    </PressableScale>
  );
}

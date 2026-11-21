import { Text, View } from 'react-native';

import { INK } from '@design/gameArt';
import { type Variant } from '@/engine';
import { radius, spacing } from '@/theme';

import { GamePicture } from '@/components/game-picture';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';

import { showDemo } from './show';

/**
 * A game's wide picture with a Demo pill on it; a tap opens the Demo, a hand of the game on the real table with the
 * coach over it (free, Premium games included). Used by the game sheet; the Demo closes back to the sheet.
 */
export function DemoPicture({ variant, name, width }: { variant: Variant; name: string; width: number }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Demo: play a hand of ${name}`}
      haptics={false}
      onPress={() => showDemo(variant)}
      style={{ borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden' }}
    >
      <GamePicture variant={variant} width={width} height={(width * 120) / 200} rounded={radius.lg} />
      {/* A solid white pill in the corner: flat like the picture, and clear of the subject in the middle. */}
      <View style={{ position: 'absolute', left: spacing.sm, bottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: spacing.sm, borderRadius: radius.full, backgroundColor: '#ffffff' }}>
        <Icon name="play.fill" size={12} color={INK} />
        <Text maxFontSizeMultiplier={1.3} style={{ color: INK, fontSize: 15, fontWeight: '700' }}>
          Demo
        </Text>
      </View>
    </PressableScale>
  );
}

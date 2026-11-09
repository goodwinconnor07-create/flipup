import { Text, View } from 'react-native';

import { variantInfo, type Variant } from '@/engine';
import { radius, spacing, useColors } from '@/theme';

import { haptic } from '../haptics';
import { Icon } from '../icon';
import { PressableScale } from '../pressable-scale';
import { Swap } from '../swap';
import { ThemedText } from '../themed-text';

/**
 * Beside Play again, for the host: the mode the next table will be in. A tap steps to the next one (games not played
 * tonight come first, see `nextModes`); stepping past the last returns to the same game. The label changes through
 * `Swap`, so it slides rather than jumps.
 */
export function NextModeChip({ current, pick, onStep }: { current: Variant; pick: Variant | null; onStep: () => void }) {
  const colors = useColors();
  const shown = variantInfo(pick ?? current);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Next game: ${shown.name}${pick ? '' : ', the same game'}. Double tap to try another mode.`}
      onPress={() => {
        haptic.tap();
        onStep();
      }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: colors.cell }}
    >
      <Icon name="shuffle" size={18} color={colors.secondaryLabel} />
      <Swap id={pick ?? current} kind="text" style={{ flex: 1, alignItems: 'flex-start' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text accessible={false} maxFontSizeMultiplier={1.2} style={{ fontSize: 18 }}>
            {shown.emoji}
          </Text>
          <ThemedText variant="headline" numberOfLines={1}>
            {shown.name}
          </ThemedText>
        </View>
      </Swap>
      <ThemedText variant="footnote" tone="tertiaryLabel">
        Change
      </ThemedText>
    </PressableScale>
  );
}

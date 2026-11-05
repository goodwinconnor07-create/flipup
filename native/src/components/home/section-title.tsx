import { Pressable, Text, View } from 'react-native';

import { useColors } from '@/theme';

import { haptic } from '../haptics';
import { Icon, type IconName } from '../icon';
import { ThemedText } from '../themed-text';

/**
 * A section's heading, the Games app's way (docs/DESIGN_DIRECTION.md): an optional small eyebrow with its symbol in
 * the brand colour, then the bold title. When the section opens a full list, the title itself is the button, with a
 * chevron after it.
 */
export function SectionTitle({ title, eyebrow, symbol, onMore }: { title: string; eyebrow?: string; symbol?: IconName; onMore?: () => void }) {
  const colors = useColors();
  const heading = (
    <View style={{ gap: 1 }}>
      {eyebrow && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          {symbol && <Icon name={symbol} size={13} color={colors.accent} />}
          <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontSize: 15, fontWeight: '600', color: colors.accent }}>
            {eyebrow}
          </Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 }}>
        <ThemedText variant="title2" accessibilityRole="header" numberOfLines={1} style={{ flexShrink: 1 }}>
          {title}
        </ThemedText>
        {onMore && <Icon name="chevron.right" size={17} color={colors.tertiaryLabel} weight="bold" />}
      </View>
    </View>
  );
  if (!onMore) return heading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`See all: ${title}`}
      hitSlop={8}
      onPress={() => {
        haptic.tap();
        onMore();
      }}
      style={({ pressed }) => ({ alignSelf: 'flex-start', opacity: pressed ? 0.55 : 1 })}
    >
      {heading}
    </Pressable>
  );
}

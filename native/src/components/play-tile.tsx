import { View, type StyleProp, type ViewStyle } from 'react-native';

import { gradient, gradients, party, radius, spacing, useShadows } from '@/theme';

import { PressableScale } from './pressable-scale';
import { ThemedText } from './themed-text';

/**
 * The loud card for something you tap to play (Play with friends, Play with bots): a party gradient, a darker
 * bottom edge, a big emoji in the corner, a heavy title and a line under it.
 */
export function PlayTile({
  title,
  subtitle,
  emoji,
  tint,
  onPress,
  style,
}: {
  title: string;
  subtitle: string;
  emoji: string;
  tint: keyof typeof gradients;
  onPress: () => void;
  /** Layout around the tile (flex, width). */
  style?: StyleProp<ViewStyle>;
}) {
  const shadow = useShadows();
  const [top, bottom] = gradients[tint];
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={onPress}
      outerStyle={style}
      style={[
        {
          minHeight: 132,
          padding: spacing.md,
          justifyContent: 'flex-end',
          gap: 2,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          borderBottomWidth: 4,
          borderBottomColor: party.edge,
          overflow: 'hidden',
          ...gradient(`linear-gradient(160deg, ${top} 0%, ${bottom} 100%)`),
          boxShadow: shadow.soft,
        },
      ]}
    >
      <View style={{ position: 'absolute', top: spacing.sm, right: spacing.sm }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <ThemedText style={{ fontSize: 44, lineHeight: 52 }} maxFontSizeMultiplier={1}>
          {emoji}
        </ThemedText>
      </View>
      <ThemedText variant="title3" tone="onColor">
        {title}
      </ThemedText>
      <ThemedText variant="subhead" tone="onColor" style={{ opacity: 0.9 }}>
        {subtitle}
      </ThemedText>
    </PressableScale>
  );
}

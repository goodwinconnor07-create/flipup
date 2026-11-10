import { View } from 'react-native';

import { spacing } from '@/theme';

import { ThemedText } from './themed-text';

/**
 * A list of short points, each with a dot in its own column so a line that wraps starts under the words above it,
 * never under the dot. VoiceOver reads each point once, without "bullet".
 */
export function Bullets({ items }: { items: readonly string[] }) {
  return (
    <View style={{ gap: spacing.xs }}>
      {items.map((item) => (
        <View key={item} accessible accessibilityLabel={item} style={{ flexDirection: 'row', gap: spacing.xs }}>
          <ThemedText variant="body" tone="tertiaryLabel" style={{ width: 12, textAlign: 'center' }}>
            •
          </ThemedText>
          <ThemedText variant="body" style={{ flex: 1 }}>
            {item}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

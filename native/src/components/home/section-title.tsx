import { Pressable, View } from 'react-native';

import { haptic } from '../haptics';
import { ThemedText } from '../themed-text';

/** A section's heading on Home, in the rounded title face, with "See all" on the right when there's more. */
export function SectionTitle({ title, more, onMore }: { title: string; more?: string; onMore?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 }}>
      <ThemedText variant="title2" accessibilityRole="header">
        {title}
      </ThemedText>
      {onMore && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${more ?? 'See all'} ${title}`}
          hitSlop={12}
          onPress={() => {
            haptic.tap();
            onMore();
          }}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <ThemedText variant="body" tone="accent">
            {more ?? 'See all'}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

import { Stack } from 'expo-router';
import { Text } from 'react-native';

import { SheetScroll } from '@/components/sheet-scroll';
import { MenuRow, MenuSection, useMenuColors } from '@/components/menu-list';
import { haptic } from '@/components/haptics';
import { ThemedText } from '@/components/themed-text';
import { unblock, useBlocked } from '@/state/blocks';
import { spacing } from '@/theme';

/** Everyone you've blocked, newest first, each with Unblock. The list lives only on this phone. */
export default function BlockedSheet() {
  const menu = useMenuColors();
  const list = [...useBlocked()].sort((a, b) => b.at - a.at);
  return (
    <SheetScroll contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md }} style={{ backgroundColor: menu.page }}>
      <Stack.Screen options={{ title: 'Blocked players' }} />
      {list.length === 0 ? (
        <ThemedText tone="tertiaryLabel" style={{ textAlign: 'center', paddingTop: spacing.xl }}>
          You haven&apos;t blocked anyone. To block someone, tap their seat at a table or their row on a party board.
        </ThemedText>
      ) : (
        <MenuSection footer="Blocked players' names, pictures and messages are hidden on this phone, and you aren't seated at their tables. They aren't told.">
          {list.map((b) => (
            <MenuRow
              key={b.key}
              leading={
                <Text style={{ fontSize: 26 }} maxFontSizeMultiplier={1.2} accessible={false}>
                  {b.emoji}
                </Text>
              }
              title={b.name}
              subtitle={`Blocked ${new Date(b.at).toLocaleDateString()}`}
              chevron={false}
              trailing={
                <ThemedText
                  tone="accent"
                  accessibilityRole="button"
                  onPress={() => {
                    haptic.tap();
                    unblock(b.key);
                  }}
                >
                  Unblock
                </ThemedText>
              }
            />
          ))}
        </MenuSection>
      )}
    </SheetScroll>
  );
}

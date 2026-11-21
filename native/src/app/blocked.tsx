import { Stack } from 'expo-router';

import { NativeMenu } from '@/components/native-menu';
import { ThemedText } from '@/components/themed-text';
import { SheetScroll } from '@/components/sheet-scroll';
import { unblock, useBlocked } from '@/state/blocks';
import { spacing } from '@/theme';

/** Everyone you've blocked, newest first, each with Unblock. The list lives only on this phone. */
export default function BlockedSheet() {
  const list = [...useBlocked()].sort((a, b) => b.at - a.at);
  if (list.length === 0) {
    return (
      <SheetScroll contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}>
        <Stack.Screen options={{ title: 'Blocked players' }} />
        <ThemedText tone="tertiaryLabel" style={{ textAlign: 'center', paddingTop: spacing.xl }}>
          You haven&apos;t blocked anyone. To block someone, tap their seat at a table or their row on a party board.
        </ThemedText>
      </SheetScroll>
    );
  }
  return (
    <>
      <Stack.Screen options={{ title: 'Blocked players' }} />
      <NativeMenu
        groups={[
          {
            id: 'blocked',
            footer: "Blocked players' names, pictures and messages are hidden on this phone, and you aren't seated at their tables. They aren't told.",
            items: list.map((b) => ({
              kind: 'link' as const,
              id: b.key,
              title: `${b.emoji}  ${b.name}`,
              subtitle: `Blocked ${new Date(b.at).toLocaleDateString()}`,
              detail: 'Unblock',
              chevron: false,
              onPress: () => unblock(b.key),
            })),
          },
        ]}
      />
    </>
  );
}

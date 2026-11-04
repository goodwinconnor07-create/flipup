import { router, Stack } from 'expo-router';
import { useEffect } from 'react';

import { RequestList } from '@/components/friend-requests';
import { SheetScroll } from '@/components/sheet-scroll';
import { ThemedText } from '@/components/themed-text';
import { useFriendBox } from '@/state/pals';
import { spacing, useColors } from '@/theme';

/** The small sheet behind the red requests pill: each request with Deny and Accept. It closes once none are left. */
export default function FriendRequestsSheet() {
  const colors = useColors();
  const { requests } = useFriendBox();
  const empty = requests.length === 0;
  useEffect(() => {
    if (!empty) return;
    // Let the last row fade out before the sheet goes.
    const t = setTimeout(() => router.canGoBack() && router.back(), 350);
    return () => clearTimeout(t);
  }, [empty]);
  return (
    <SheetScroll contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md }} style={{ backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Friend requests' }} />
      {empty ? (
        <ThemedText tone="tertiaryLabel" style={{ textAlign: 'center', paddingTop: spacing.xl }}>
          No requests waiting.
        </ThemedText>
      ) : (
        <RequestList requests={requests} />
      )}
    </SheetScroll>
  );
}

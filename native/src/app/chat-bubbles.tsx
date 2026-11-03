import { Stack } from 'expo-router';
import { ScrollView } from 'react-native';

import { LookGrid } from '@/components/premium/look-grid';
import { MoveBubble } from '@/components/table/bubbles';
import { ThemedText } from '@/components/themed-text';
import { BUBBLE_STYLES } from '@/engine';
import { usePremium } from '@/state/premium';
import { saveProfile, useProfile } from '@/state/profile';
import { syncLook } from '@/state/session';
import { spacing, useColors } from '@/theme';

/** Chat bubbles: the colour of your bubbles at the table. Blue and grey and Green are free; the rest are Premium. */
export default function ChatBubbles() {
  const colors = useColors();
  const premium = usePremium();
  const profile = useProfile();
  const value = profile.bubble && (premium || BUBBLE_STYLES.find((b) => b.id === profile.bubble)?.free) ? profile.bubble : null;
  const choices = [
    { id: null, name: 'Classic', note: 'Blue and grey', locked: false, preview: <MoveBubble text="Raise 40" tone="blue" big /> },
    ...BUBBLE_STYLES.map((b) => ({ id: b.id, name: b.name, note: b.note, locked: !premium && !b.free, preview: <MoveBubble text="Raise 40" tone="blue" fx={b.id} big /> })),
  ];
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md }} style={{ backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Chat bubbles' }} />
      <ThemedText tone="tertiaryLabel">Your moves and messages show in this colour for everyone at the table.</ThemedText>
      <LookGrid
        choices={choices}
        value={value}
        onPick={(id) => {
          saveProfile({ bubble: id ?? undefined });
          syncLook();
        }}
      />
    </ScrollView>
  );
}

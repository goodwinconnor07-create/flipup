import { Stack } from 'expo-router';
import { View } from 'react-native';

import { SheetScroll } from '@/components/sheet-scroll';
import { LookGrid } from '@/components/premium/look-grid';
import { PlayingCard } from '@/components/table/playing-card';
import { ThemedText } from '@/components/themed-text';
import { CARD_PACKS } from '@/engine';
import { usePremium } from '@/state/premium';
import { saveProfile, useProfile } from '@/state/profile';
import { syncLook } from '@/state/session';
import { spacing, useColors } from '@/theme';

/** Card packs: the back of your cards, which everyone at the table sees. The plain back is free, the rest Premium. */
export default function CardPacks() {
  const colors = useColors();
  const premium = usePremium();
  const profile = useProfile();
  const value = premium ? (profile.cardPack ?? null) : null;
  const preview = (pack?: string) => (
    <View style={{ flexDirection: 'row' }}>
      <View style={{ transform: [{ rotate: '-8deg' }, { translateX: 8 }] }}>
        <PlayingCard back size="md" pack={pack} />
      </View>
      <View style={{ transform: [{ rotate: '8deg' }, { translateX: -8 }] }}>
        <PlayingCard back size="md" pack={pack} />
      </View>
    </View>
  );
  const choices = [
    { id: null, name: 'Classic', note: 'The plain back', locked: false, preview: preview() },
    ...CARD_PACKS.filter((p) => !p.venue).map((p) => ({ id: p.id, name: p.name, note: p.note, locked: !premium, preview: preview(p.id) })),
  ];
  return (
    <SheetScroll contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md }} style={{ backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Card packs' }} />
      <ThemedText tone="tertiaryLabel">Everyone at your table sees your pack on the back of your cards.</ThemedText>
      <LookGrid
        choices={choices}
        value={value}
        onPick={(id) => {
          saveProfile({ cardPack: id ?? undefined });
          syncLook();
        }}
      />
    </SheetScroll>
  );
}

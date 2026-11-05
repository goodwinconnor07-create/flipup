import { router, Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { SheetHeader } from '@/components/sheet-header';
import { SheetScroll } from '@/components/sheet-scroll';
import { ThemedText } from '@/components/themed-text';
import { gameLook } from '@design/gameArt';
import { isPremiumVariant, isVariant, variantInfo, variantNote, withVariant, type Variant } from '@/engine';
import { usePremium } from '@/state/premium';
import { setDraft, useDraft } from '@/state/setup-draft';
import { needsUnlock, unlockToHost } from '@/state/unlock';
import { spacing, useColors } from '@/theme';

/**
 * The game popup on Play with friends: what the game is (its picture with How to Play, its mood, how it plays)
 * and two choices, Select or Close. Select picks it for the table being set up. A Premium game without Premium is
 * still picked (anyone may set one up), and the Premium offer opens at once, the same gate Open table uses.
 */
export default function SetupGameSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const variant: Variant = isVariant(id) ? id : 'holdem';
  const info = variantInfo(variant);
  const draft = useDraft();
  const premium = usePremium();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const chosen = (draft.variant ?? 'holdem') === variant;
  const locked = needsUnlock([variant], premium);

  const select = () => {
    haptic.select();
    if (!chosen) setDraft(withVariant(draft, variant));
    router.back();
    if (locked) unlockToHost([variant], premium);
  };

  return (
    <View style={{ flex: 1 }}>
      <SheetScroll
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.md, paddingTop: 0, paddingBottom: spacing.xl, gap: spacing.lg }}
      >
        <Stack.Screen options={{ title: info.name, headerShown: false }} />
        <SheetHeader id={variant} title={info.name} line={gameLook(variant).mood} howTo={variant} />
        <View style={{ gap: spacing.xs }}>
          <ThemedText variant="headline">How it plays</ThemedText>
          {info.rules.map((r) => (
            <ThemedText key={r} variant="body">
              {'•  '}
              {r}
            </ThemedText>
          ))}
          <ThemedText variant="footnote" tone="tertiaryLabel" style={{ marginTop: spacing.xs }}>
            {variantNote(variant)}
          </ThemedText>
        </View>
        {isPremiumVariant(variant) && !premium && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Icon name="crown.fill" size={15} color={colors.gold} />
            <ThemedText variant="footnote" tone="secondaryLabel" style={{ flex: 1 }}>
              Premium to host. Friends who join play free.
            </ThemedText>
          </View>
        )}
      </SheetScroll>
      {/* The two choices stay in view however long the rules are. */}
      <View
        style={{
          flexDirection: 'row',
          gap: spacing.sm,
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          paddingBottom: Math.max(insets.bottom, spacing.md),
          backgroundColor: colors.background,
          borderTopWidth: 0.5,
          borderTopColor: colors.separator,
        }}
      >
        <Button variant="secondary" size="lg" title="Close" onPress={() => router.back()} style={{ flex: 1 }} />
        <View style={{ flex: 2 }}>
          <Button variant="party" size="lg" title={chosen ? 'Selected' : 'Select'} onPress={select} />
        </View>
      </View>
    </View>
  );
}

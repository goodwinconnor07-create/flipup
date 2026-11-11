import { router, useLocalSearchParams } from 'expo-router';
import { PANEL_RADIUS, usePanel } from '@/components/grouped-list';
import { Fragment } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameThumb } from '@/components/game-picture';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { SheetScroll } from '@/components/sheet-scroll';
import { ThemedText } from '@/components/themed-text';
import { freeThisWeek, isPremiumVariant, VARIANTS, withVariant, type VariantInfo } from '@/engine';
import { usePremium } from '@/state/premium';
import { dispatch, useTable } from '@/state/session';
import { setDraft, useDraft } from '@/state/setup-draft';
import { needsUnlock } from '@/state/unlock';
import { brand, ROUNDED, spacing, useColors } from '@/theme';

/**
 * Play with friends' Change on the game card: every game in one scrolling list, the free ones first, then a gold
 * line with a crown that sets the Premium games apart. A tap picks the game and closes the sheet; a Premium game
 * without Premium isn't picked: its game sheet explains it, and Continue there opens the offer (`unlockToHost()`).
 */
export default function LobbyGameSheet() {
  const colors = useColors();
  const panel = usePanel();
  const insets = useSafeAreaInsets();
  const premium = usePremium();
  const draft = useDraft();
  // From an open table's lobby (Play again), the game changes on the table itself.
  const table = useLocalSearchParams<{ table?: string }>().table === '1';
  const tableSettings = useTable().game?.settings;
  const current = (table ? tableSettings?.variant : draft.variant) ?? 'holdem';
  const free = VARIANTS.filter((v) => !isPremiumVariant(v.id));
  const paid = VARIANTS.filter((v) => isPremiumVariant(v.id));

  const pick = (v: VariantInfo) => {
    haptic.select();
    // A locked game isn't picked: its sheet explains it first, and Continue there opens the offer.
    if (needsUnlock([v.id], premium)) {
      router.back();
      router.push(`/game/${v.id}`);
      return;
    }
    if (v.id !== current) {
      if (table && tableSettings) dispatch({ type: 'settings', settings: withVariant(tableSettings, v.id) });
      else setDraft(withVariant(draft, v.id));
    }
    router.back();
  };

  const list = (games: VariantInfo[]) => (
    <View style={{ borderRadius: PANEL_RADIUS, borderCurve: 'continuous', backgroundColor: panel.fill, borderWidth: 1, borderColor: panel.edge, overflow: 'hidden' }}>
      {games.map((v, i) => (
        <Fragment key={v.id}>
          {i > 0 && <View style={{ height: 0.5, marginLeft: 76, backgroundColor: colors.separator }} />}
          <GameRow info={v} chosen={v.id === current} locked={needsUnlock([v.id], premium)} onPress={() => pick(v)} />
        </Fragment>
      ))}
    </View>
  );

  return (
    <SheetScroll
      contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.xl, paddingBottom: insets.bottom + spacing.xl, gap: spacing.md }}
    >
      <View style={{ gap: spacing.xxs }}>
        <ThemedText variant="title1" accessibilityRole="header" style={{ fontFamily: ROUNDED, fontWeight: '800' }}>
          Change the game.
        </ThemedText>
        <ThemedText variant="callout" tone="secondaryLabel">
          Pick the game for this table.
        </ThemedText>
      </View>

      {list(free)}

      {/* The cut: a gold line with a crown, so the Premium games read as their own set. */}
      <View
        accessibilityRole="header"
        accessibilityLabel="Premium games"
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs }}
      >
        <View style={{ flex: 1, height: 2, borderRadius: 1, backgroundColor: brand.gold }} />
        <Icon name="crown.fill" size={14} color={brand.gold} />
        <ThemedText variant="footnote" style={{ color: brand.gold, fontWeight: '800', letterSpacing: 1.4 }}>
          PREMIUM
        </ThemedText>
        <View style={{ flex: 1, height: 2, borderRadius: 1, backgroundColor: brand.gold }} />
      </View>

      {list(paid)}

      <Pressable
        accessibilityRole="button"
        onPress={() => router.back()}
        style={({ pressed }) => ({
          alignSelf: 'center',
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.xl,
          opacity: pressed ? 0.5 : 1,
        })}
      >
        <ThemedText variant="body" style={{ fontWeight: '600', color: colors.accent as string }}>
          Cancel
        </ThemedText>
      </Pressable>
    </SheetScroll>
  );
}

function GameRow({ info, chosen, locked, onPress }: { info: VariantInfo; chosen: boolean; locked: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${info.name}. ${info.tagline}${locked ? '. Needs Premium' : ''}`}
      accessibilityState={{ selected: chosen }}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: pressed ? colors.cellPressed : 'transparent',
      })}
    >
      <GameThumb variant={info.id} size={48} />
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText variant="headline" numberOfLines={1}>
          {info.name}
        </ThemedText>
        <ThemedText variant="footnote" tone="secondaryLabel" numberOfLines={2}>
          {info.tagline}
        </ThemedText>
        {isPremiumVariant(info.id) && info.id === freeThisWeek() && (
          <ThemedText variant="caption1" style={{ color: brand.gold, fontWeight: '700' }}>
            Free this week
          </ThemedText>
        )}
      </View>
      {chosen ? (
        <Icon name="checkmark" size={18} color={colors.accent} weight="bold" />
      ) : locked ? (
        <Icon name="crown.fill" size={16} color={brand.gold} />
      ) : (
        <Icon name="chevron.right" size={14} color={colors.tertiaryLabel} />
      )}
    </Pressable>
  );
}

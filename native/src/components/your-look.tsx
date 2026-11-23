import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { FELTS, RAILS } from '@design/tableLooks';
import { CARD_PACKS } from '@/engine';
import { usePremium } from '@/state/premium';
import { setGoldName, useGoldName, useProfile, wornLook } from '@/state/profile';
import { useTableLook } from '@/state/prefs';
import { brand, ROUNDED, spacing, useColors } from '@/theme';

import { Icon } from './icon';
import { PressableScale } from './pressable-scale';
import { PlayingCard } from './table/playing-card';
import { ThemedText } from './themed-text';

/**
 * Your look, on the You tab (23 Nov 2026, after EasyPoker's Styles row on its home): the things other players see,
 * each a tile showing what you wear now: your card backs, your gold name and your table's felt. A crown marks one
 * that needs Premium; a tap opens its page, and Gold name switches on and off in place (the offer without Premium).
 */
export function YourLook() {
  const premium = usePremium();
  const profile = useProfile();
  const worn = wornLook(profile, premium);
  const pack = CARD_PACKS.find((p) => p.id === worn.cardPack);
  const gold = useGoldName();
  const look = useTableLook();
  const felt = FELTS.find((f) => f.felt === look.felt)?.name ?? 'Your colour';
  const rail = RAILS.find((r) => r.id === look.rail) ?? RAILS[0];
  const name = profile.name || 'You';
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: spacing.xxs, gap: spacing.sm }}>
        <ThemedText variant="title2" accessibilityRole="header" style={{ fontFamily: ROUNDED, fontWeight: '800' }}>
          Your look
        </ThemedText>
        <ThemedText variant="footnote" tone="secondaryLabel" style={{ flexShrink: 1, textAlign: 'right' }}>
          Everyone at your table sees it
        </ThemedText>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Tile title="Card backs" value={pack?.name ?? 'Classic'} onPress={() => router.push('/card-packs')}>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ transform: [{ rotate: '-8deg' }, { translateX: 6 }] }}>
              <PlayingCard back size="sm" pack={worn.cardPack} />
            </View>
            <View style={{ transform: [{ rotate: '8deg' }, { translateX: -6 }] }}>
              <PlayingCard back size="sm" pack={worn.cardPack} />
            </View>
          </View>
        </Tile>
        <Tile
          title="Gold name"
          value={premium ? (gold ? 'On' : 'Off') : 'Premium'}
          crown={!premium}
          onPress={() => (premium ? setGoldName(!gold) : router.push({ pathname: '/premium', params: { reason: 'gold' } }))}
        >
          <ThemedText
            variant="headline"
            numberOfLines={1}
            adjustsFontSizeToFit
            maxFontSizeMultiplier={1.2}
            style={{ fontFamily: ROUNDED, fontWeight: '900', color: premium && !gold ? '#ffffff' : brand.gold, textShadowColor: 'rgba(245,183,0,0.45)', textShadowRadius: 10 }}
          >
            {name}
          </ThemedText>
        </Tile>
        <Tile title="Table" value={felt} onPress={() => router.push('/table-theme')}>
          <View style={{ width: 64, height: 36, borderRadius: 18, backgroundColor: look.felt, borderWidth: 4, borderColor: rail.colors[1] }} />
        </Tile>
      </View>
    </View>
  );
}

function Tile({ title, value, crown, onPress, children }: { title: string; value: string; crown?: boolean; onPress: () => void; children: ReactNode }) {
  const colors = useColors();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${value}${crown ? ', Premium' : ''}`}
      onPress={onPress}
      outerStyle={{ flex: 1 }}
      style={{ borderRadius: 22, borderCurve: 'continuous', backgroundColor: colors.cell, padding: spacing.sm, gap: spacing.xs }}
    >
      <View style={{ height: 68, borderRadius: 14, borderCurve: 'continuous', backgroundColor: 'rgba(8, 20, 51, 0.85)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', paddingHorizontal: spacing.xs }}>
        {children}
      </View>
      <View>
        <ThemedText variant="subhead" numberOfLines={1} style={{ fontWeight: '800' }}>
          {title}
        </ThemedText>
        <ThemedText variant="footnote" tone="secondaryLabel" numberOfLines={1}>
          {value}
        </ThemedText>
      </View>
      {crown && (
        <View style={{ position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.gold }}>
          <Icon name="crown.fill" size={12} color={brand.goldInk} />
        </View>
      )}
    </PressableScale>
  );
}

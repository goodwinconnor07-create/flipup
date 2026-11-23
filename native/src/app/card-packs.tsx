import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/button';
import { haptic } from '@/components/haptics';
import { SheetScroll } from '@/components/sheet-scroll';
import { LookGrid } from '@/components/premium/look-grid';
import { Swap } from '@/components/swap';
import { PlayingCard } from '@/components/table/playing-card';
import { ThemedText } from '@/components/themed-text';
import { CARD_PACKS } from '@/engine';
import { enter, exit } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { usePremium } from '@/state/premium';
import { saveProfile, useProfile } from '@/state/profile';
import { syncLook } from '@/state/session';
import { cardColors, gradient, spacing } from '@/theme';

/**
 * Card packs: the back of your cards, which everyone at the table sees. The plain back is free, the rest Premium.
 * At the top (23 Nov 2026, after EasyPoker's card face picker) the pack you wear, fanned big; without Premium a tap on
 * a crowned pack tries it on there, with Unlock with Premium under it, before it asks.
 */
export default function CardPacks() {
  const premium = usePremium();
  const profile = useProfile();
  const value = premium ? (profile.cardPack ?? null) : null;
  const reduce = useReduceMotion();
  const [trying, setTrying] = useState<string | null>(null);
  const shown = trying ?? value;
  const shownName = CARD_PACKS.find((p) => p.id === shown)?.name ?? 'Classic';
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
    ...CARD_PACKS.map((p) => ({ id: p.id, name: p.name, note: p.note, locked: !premium, preview: preview(p.id) })),
  ];
  const [a, b, c] = cardColors.night;
  return (
    <SheetScroll contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md }}>
      <Stack.Screen options={{ title: 'Card packs' }} />
      <View
        accessible
        accessibilityLabel={trying ? `Trying on ${shownName}` : `Wearing ${shownName}`}
        style={{ borderRadius: 24, borderCurve: 'continuous', padding: spacing.md, gap: spacing.md, ...gradient(`linear-gradient(150deg, ${a} 0%, ${b} 55%, ${c} 100%)`) }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
          <View style={{ flexDirection: 'row', paddingHorizontal: spacing.xs }}>
            <View style={{ transform: [{ rotate: '-8deg' }, { translateX: 12 }] }}>
              <PlayingCard back size="lg" pack={shown ?? undefined} />
            </View>
            <View style={{ transform: [{ rotate: '8deg' }, { translateX: -12 }] }}>
              <PlayingCard back size="lg" pack={shown ?? undefined} />
            </View>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText variant="footnote" style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '800', letterSpacing: 0.6 }}>
              {trying ? 'TRYING ON' : 'WEARING NOW'}
            </ThemedText>
            <Swap id={shownName} kind="text" style={{ alignItems: 'flex-start' }}>
              <ThemedText variant="title2" style={{ color: '#ffffff' }}>
                {shownName}
              </ThemedText>
            </Swap>
            <ThemedText variant="subhead" style={{ color: 'rgba(255,255,255,0.85)' }}>
              On the back of your cards, at every table
            </ThemedText>
          </View>
        </View>
        {trying && (
          <Animated.View entering={enter(reduce)} exiting={exit(reduce)}>
          <Button
            variant="party"
            tint="gold"
            title="Unlock with Premium"
            onPress={() => {
              haptic.tap();
              router.push({ pathname: '/premium', params: { reason: 'pack' } });
            }}
          />
          </Animated.View>
        )}
      </View>
      <ThemedText tone="tertiaryLabel">
        {premium ? 'Everyone at your table sees your pack on the back of your cards.' : 'Tap a crowned pack to try it on. They come with Premium.'}
      </ThemedText>
      <LookGrid
        reason="pack"
        choices={choices}
        value={value}
        trying={trying}
        onTry={premium ? undefined : setTrying}
        onPick={(id) => {
          saveProfile({ cardPack: id ?? undefined });
          syncLook();
        }}
      />
    </SheetScroll>
  );
}

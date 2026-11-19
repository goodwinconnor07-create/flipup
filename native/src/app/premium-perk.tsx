import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { GameThumb } from '@/components/game-picture';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { perkById, type PerkId } from '@/components/premium/perks';
import { PressableScale } from '@/components/pressable-scale';
import { SheetScroll } from '@/components/sheet-scroll';
import { PlayingCard } from '@/components/table/playing-card';
import { ThemedText } from '@/components/themed-text';
import { CARD_PACKS, FAMILIAR_COUNT, FREE_BOT_NAMES, FREE_VARIANTS, LAB_DIALS, VARIANTS } from '@/engine';
import { usePremium } from '@/state/premium';
import { brand, radius, ROUNDED, spacing } from '@/theme';

/**
 * One Premium perk shown properly, from a tile on the Premium page: what it is and a look at it (the games, every
 * card back, a gold name at the table). With Premium it also
 * takes you there (open your saved hands, pick a card back...).
 */
export default function PerkSheet() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const perk = perkById(id);
  const has = usePremium();
  const insets = useSafeAreaInsets();
  if (!perk) return null;
  const go = GO[perk.id];
  return (
    // The scroll view is the screen itself, like every other sheet: a plain View around it left iOS drawing a blank sheet.
    <SheetScroll style={{ backgroundColor: '#070b1c' }} contentContainerStyle={{ flexGrow: 1, padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.md, gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.gold }}>
            <Icon name={perk.icon} size={20} color={brand.goldInk} />
          </View>
          <ThemedText accessibilityRole="header" style={{ flex: 1, fontFamily: ROUNDED, fontSize: 26, lineHeight: 34, fontWeight: '800', color: '#ffffff' }}>
            {perk.title}
          </ThemedText>
        </View>
        <ThemedText variant="callout" style={{ color: 'rgba(255,255,255,0.8)' }}>
          {perk.about}
        </ThemedText>
      </View>
      <Preview id={perk.id} />
      {has && go ? <Button title={go.title} variant="party" tint="gold" size="lg" onPress={() => (router.back(), go.run())} /> : <Button title="Back" variant="secondary" size="lg" onPress={() => router.back()} />}
    </SheetScroll>
  );
}

const GO: Partial<Record<PerkId, { title: string; run: () => void }>> = {
  packs: { title: 'Pick a card back', run: () => router.push('/card-packs') },
  range: { title: 'Start training', run: () => router.push('/range-session') },
  gold: { title: 'Gold name settings', run: () => router.push('/settings') },
  botlab: { title: 'Open Bot Lab', run: () => router.push('/bot-lab') },
};

function Preview({ id }: { id: PerkId }) {
  const box = { padding: spacing.md, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.06)' } as const;
  switch (id) {
    case 'games':
      return (
        <View style={{ gap: spacing.xs }}>
          {VARIANTS.slice(FREE_VARIANTS).map((g) => (
            <PressableScale
              key={g.id}
              accessibilityRole="button"
              accessibilityLabel={`${g.name}. ${g.tagline}. See how it plays.`}
              onPress={() => (haptic.select(), router.push(`/how-to-play/${g.id}`))}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.xs, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.06)' }}
            >
              <GameThumb variant={g.id} size={44} />
              <View style={{ flex: 1 }}>
                <ThemedText variant="headline" style={{ color: '#ffffff' }}>
                  {g.name}
                </ThemedText>
                <ThemedText variant="footnote" numberOfLines={2} style={{ color: 'rgba(255,255,255,0.65)' }}>
                  {g.tagline}
                </ThemedText>
              </View>
              <Icon name="chevron.right" size={13} color="rgba(255,255,255,0.4)" />
            </PressableScale>
          ))}
        </View>
      );
    case 'gold':
      return (
        <View style={{ ...box, alignItems: 'center', gap: spacing.md }}>
          <View style={{ flexDirection: 'row', gap: spacing.xl }}>
            {[
              { e: '😎', n: 'You', g: true },
              { e: '🦊', n: 'Sam', g: false },
              { e: '🐼', n: 'Ria', g: false },
            ].map((p) => (
              <View key={p.n} style={{ alignItems: 'center', gap: 2 }}>
                <ThemedText style={{ fontSize: 34 }}>{p.e}</ThemedText>
                <ThemedText variant="callout" style={{ fontWeight: p.g ? '800' : '700', color: p.g ? brand.gold : 'rgba(255,255,255,0.55)' }}>
                  {p.n}
                </ThemedText>
                <ThemedText variant="callout" style={{ color: '#ffffff', fontWeight: '700' }}>
                  1,000
                </ThemedText>
              </View>
            ))}
          </View>
          <ThemedText variant="footnote" style={{ color: 'rgba(255,255,255,0.65)', textAlign: 'center' }}>
            How the table sees you. Settings › Gold name turns it off.
          </ThemedText>
        </View>
      );
    case 'range':
      return (
        <View style={{ ...box, gap: spacing.xs }}>
          <ThemedText variant="callout" style={{ color: '#ffffff', fontWeight: '700' }}>
            Free: one hand a day.
          </ThemedText>
          <ThemedText variant="callout" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Premium: every hand, Endless mode, any number of sets, and Gaps, practice built from the spots you miss.
          </ThemedText>
        </View>
      );
    case 'botlab':
      // The eight dials, each from one end to the other, then the roster line.
      return (
        <View style={{ gap: spacing.sm }}>
          <View style={{ ...box, gap: spacing.sm }}>
            {LAB_DIALS.map((d) => (
              <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <ThemedText variant="callout" style={{ flex: 1, color: '#ffffff', fontWeight: '700' }}>
                  {d.name}
                </ThemedText>
                <ThemedText variant="footnote" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {d.low} to {d.high}
                </ThemedText>
              </View>
            ))}
          </View>
          <ThemedText variant="footnote" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Premium also opens all {FAMILIAR_COUNT} characters and hundreds of regulars. Free tables get {FREE_BOT_NAMES.join(', ')}.
          </ThemedText>
        </View>
      );
    case 'packs':
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' }}>
          {CARD_PACKS.map((p) => (
            <View key={p.id} style={{ alignItems: 'center', gap: 4, width: 72 }}>
              <PlayingCard back size="md" pack={p.id} />
              <ThemedText variant="caption2" numberOfLines={1} style={{ color: '#ffffff' }}>
                {p.name}
              </ThemedText>
            </View>
          ))}
        </View>
      );
  }
}

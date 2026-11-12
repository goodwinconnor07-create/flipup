import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { GameThumb } from '@/components/game-picture';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { perkById, type PerkId } from '@/components/premium/perks';
import { PressableScale } from '@/components/pressable-scale';
import { statsData } from '@/components/share/data';
import { CARD_H, CARD_W, SHARE_DESIGNS, ShareCard } from '@/components/share/designs';
import { PlayingCard } from '@/components/table/playing-card';
import { ThemedText } from '@/components/themed-text';
import { CARD_PACKS, FAMILIAR_COUNT, FREE_BOT_NAMES, FREE_VARIANTS, VARIANTS } from '@/engine';
import { usePremium } from '@/state/premium';
import { brand, radius, ROUNDED, spacing } from '@/theme';

const SAMPLE = statsData(
  { hands: 1284, won: 402, biggestPot: 6420, best: { score: 0, name: 'Full house', cards: ['Ks', 'Kd', 'Kh', '5c', '5s'], variant: 'holdem' }, games: [], played: [], seen: [] },
  9,
  { name: 'You', emoji: '😎', username: 'you' },
);

/**
 * One Premium perk shown properly, from a tile on the Premium page: what it is and a look at it (the games, every
 * card back, the five share designs, a gold name at the table). With Premium it also
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
    <View style={{ flex: 1, backgroundColor: '#070b1c' }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <View style={{ gap: spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.gold }}>
              <Icon name={perk.icon} size={20} color={brand.goldInk} />
            </View>
            <ThemedText accessibilityRole="header" style={{ flex: 1, fontFamily: ROUNDED, fontSize: 26, fontWeight: '800', color: '#ffffff' }}>
              {perk.title}
            </ThemedText>
          </View>
          <ThemedText variant="callout" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {perk.about}
          </ThemedText>
        </View>
        <Preview id={perk.id} />
      </ScrollView>
      <View style={{ padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: Math.max(insets.bottom, spacing.md) }}>
        {has && go ? <Button title={go.title} variant="party" tint="gold" size="lg" onPress={() => (router.back(), go.run())} /> : <Button title="Back" variant="secondary" size="lg" onPress={() => router.back()} />}
      </View>
    </View>
  );
}

const GO: Partial<Record<PerkId, { title: string; run: () => void }>> = {
  replay: { title: 'Open Saved hands', run: () => router.push('/replays') },
  share: { title: 'Make a share card', run: () => router.push('/share') },
  packs: { title: 'Pick a card back', run: () => router.push('/card-packs') },
  range: { title: 'Start training', run: () => router.push('/range-session') },
  gold: { title: 'Gold name settings', run: () => router.push('/settings') },
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
    case 'replay':
      return (
        <View style={{ ...box, gap: spacing.sm }}>
          {[
            ['bookmark.fill', 'Save hand', 'The bookmark in the table bar keeps the hand that just finished.'],
            ['play.fill', 'Watch it back', 'Every move in order, the board street by street, the cards that were shown.'],
            ['star.fill', 'Star the big ones', 'Starred hands sit at the top of Share, ready to send.'],
          ].map(([icon, t, l]) => (
            <View key={t} style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Icon name={icon as never} size={18} color={brand.gold} />
              <View style={{ flex: 1 }}>
                <ThemedText variant="headline" style={{ color: '#ffffff' }}>
                  {t}
                </ThemedText>
                <ThemedText variant="footnote" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {l}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>
      );
    case 'share': {
      const k = 0.42;
      return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {SHARE_DESIGNS.map((d) => (
            <View key={d.id} style={{ alignItems: 'center', gap: 4 }}>
              <View style={{ width: CARD_W * k, height: CARD_H * k, borderRadius: 10, overflow: 'hidden' }}>
                <View style={{ width: CARD_W, height: CARD_H, transform: [{ scale: k }], transformOrigin: 'top left' }}>
                  <ShareCard design={d.id} data={SAMPLE} />
                </View>
              </View>
              <ThemedText variant="caption1" style={{ color: '#ffffff' }}>
                {d.name}
                {d.premium ? '' : ' · free'}
              </ThemedText>
            </View>
          ))}
        </ScrollView>
      );
    }
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
            Free: one set of five hands a day.
          </ThemedText>
          <ThemedText variant="callout" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Premium: every hand, any number of sets, and practice sets built from the spots you miss.
          </ThemedText>
        </View>
      );
    case 'bots':
      return (
        <View style={{ ...box, gap: spacing.xs }}>
          <ThemedText variant="callout" style={{ color: '#ffffff', fontWeight: '700' }}>
            Free: {FREE_BOT_NAMES.join(', ')}.
          </ThemedText>
          <ThemedText variant="callout" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Premium: all {FAMILIAR_COUNT} characters and hundreds of regulars, in every playing style.
          </ThemedText>
        </View>
      );
    case 'packs':
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' }}>
          {CARD_PACKS.filter((p) => !p.venue).map((p) => (
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

import { router } from 'expo-router';
import { Text, useWindowDimensions, View } from 'react-native';

import { Icon } from '@/components/icon';
import { LivingCard } from '@/components/living-card';
import { PressableScale } from '@/components/pressable-scale';
import { MiniRing } from '@/components/ranges/dial';
import { Kicker, NightSheet, SheetHeading } from '@/components/ranges/night-sheet';
import { FAMILY, trickOf, type Family } from '@/components/ranges/words';
import { allHands, LESSON_GOAL, trickProgress, useRangeGrades } from '@/state/ranges';
import { brand, cardColors, radius, ROUNDED, spacing } from '@/theme';

const ORDER: Family[] = ['reads', 'calls', 'value', 'bluffs'];

/**
 * Your tricks: every hand's idea as a card to collect, in four families. A card you've mastered (the best play on
 * its hands) turns gold with a crown; one you've half got is violet with its ring part filled; the rest wait on the
 * night. Tap any card to play its lesson.
 */
export default function RangeTricksSheet() {
  const grades = useRangeGrades();
  const progress = trickProgress(grades);
  const { width } = useWindowDimensions();
  const tile = (Math.min(width, 600) - spacing.md * 2 - spacing.sm) / 2;
  const concepts = [...new Set(allHands().map((s) => s.concept))];
  const mastered = concepts.filter((c) => progress[c]?.best).length;
  return (
    <NightSheet>
      <SheetHeading kicker="Range training" title="Your tricks" line={`${mastered} of ${concepts.length} collected. Get the best play on ${LESSON_GOAL} of a trick’s hands to win its card.`} />
      <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
        <View style={{ height: 8, borderRadius: 4, width: `${Math.round((mastered / Math.max(1, concepts.length)) * 100)}%`, backgroundColor: brand.gold }} />
      </View>
      {ORDER.map((family) => {
        const mine = concepts.filter((c) => trickOf(c).family === family);
        if (!mine.length) return null;
        return (
          <View key={family} style={{ gap: spacing.sm }}>
            <Kicker>{FAMILY[family].name}</Kicker>
            <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: -6 }}>
              {FAMILY[family].line}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {mine.map((c) => {
                const p = progress[c];
                const t = trickOf(c);
                const f = p ? p.done / p.goal : 0;
                const state = p?.best ? 'gold' : f > 0 ? 'violet' : 'night';
                const ink = state === 'gold' ? brand.goldInk : '#ffffff';
                return (
                  <PressableScale
                    key={c}
                    accessibilityRole="button"
                    accessibilityLabel={`${t.nick}${p?.best ? ', collected' : ''}. ${t.line} Play its lesson`}
                    onPress={() => {
                      if (!p) return;
                      router.dismissAll();
                      router.push({ pathname: '/ranges', params: { mode: 'lesson', concept: c } });
                    }}
                    outerStyle={{ width: tile }}
                  >
                    <LivingCard colors={cardColors[state]} radius={radius.lg} grain={0} shadow="soft" still={state === 'night'} style={{ padding: spacing.sm, gap: spacing.xs, minHeight: 150 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: state === 'gold' ? 'rgba(59,38,0,0.12)' : 'rgba(255,255,255,0.14)' }}>
                          <Icon name={t.icon} size={18} color={state === 'gold' ? brand.goldInk : brand.gold} />
                        </View>
                        {p?.best ? <Icon name="crown.fill" size={18} color={brand.goldInk} /> : <MiniRing value={f} size={24} />}
                      </View>
                      <Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={{ fontFamily: ROUNDED, fontSize: 17, lineHeight: 21, fontWeight: '800', color: ink }}>
                        {t.nick}
                      </Text>
                      <Text maxFontSizeMultiplier={1.3} numberOfLines={3} style={{ fontSize: 12, lineHeight: 16, color: state === 'gold' ? 'rgba(59,38,0,0.75)' : 'rgba(255,255,255,0.68)' }}>
                        {t.line}
                      </Text>
                    </LivingCard>
                  </PressableScale>
                );
              })}
            </View>
          </View>
        );
      })}
    </NightSheet>
  );
}

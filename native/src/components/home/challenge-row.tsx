import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { CHALLENGES, type ChallengeDef } from '@/engine';
import { useChallengeBests, type ChallengeBest } from '@/state/challenges';
import { radius, ROUNDED, spacing, useColors, useShadows } from '@/theme';

import { ChallengePicture } from '../challenge-picture';
import { haptic } from '../haptics';
import { Icon } from '../icon';
import { PressableScale } from '../pressable-scale';
import { SectionTitle } from './section-title';

const CARD = 184;
const PICTURE = 110;

/**
 * Challenges on Home: scored solo games as cards on the grey card surface, each with its own picture (a short
 * stack, a magnifying glass over the cards, a rewind arrow), "Solo", its name and one big number, your best in gold
 * (or "Try it" before you've played it). With more than four there'd be a See all;
 * with three there isn't.
 */
export function ChallengeRow() {
  const bests = useChallengeBests();
  return (
    <View style={{ gap: spacing.sm }}>
      <SectionTitle title="Challenges" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.md }} contentContainerStyle={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs, gap: spacing.sm }}>
        {CHALLENGES.map((c) => (
          <ChallengeCard key={c.id} challenge={c} best={bests[c.id]} />
        ))}
      </ScrollView>
    </View>
  );
}

function ChallengeCard({ challenge, best }: { challenge: ChallengeDef; best?: ChallengeBest }) {
  const colors = useColors();
  const shadows = useShadows();
  const played = !!best && best.plays > 0;
  const unit = challenge.unit === 'bb' ? 'big blinds' : challenge.unit;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${challenge.name}, a solo challenge. ${played ? `Your best: ${best.best} ${unit}` : 'Not played yet'}`}
      accessibilityHint="Shows how it plays"
      haptics={false}
      onPress={() => {
        haptic.tap();
        router.push(`/challenge/${challenge.id}`);
      }}
      style={{ width: CARD, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell, boxShadow: shadows.card }}
    >
      {/* The shadow sits on the press area; the picture and text are clipped to the rounded card inside it. */}
      <View style={{ borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden' }}>
        <ChallengePicture id={challenge.id} width={CARD} height={PICTURE} rounded={0} />
        <View style={{ padding: spacing.sm, paddingTop: spacing.xs, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs }}>
            <Icon name="person.fill" size={11} color={colors.secondaryLabel} />
            <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 13, lineHeight: 16, fontWeight: '600', color: colors.secondaryLabel }}>
              Solo
            </Text>
          </View>
          <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={{ fontFamily: ROUNDED, fontSize: 19, lineHeight: 23, fontWeight: '700', color: colors.label }}>
            {challenge.name}
          </Text>
          {played ? (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xxs }}>
              <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 32, lineHeight: 38, fontWeight: '800', fontVariant: ['tabular-nums'], color: colors.gold }}>
                {best.best}
              </Text>
              <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={{ flexShrink: 1, fontSize: 13, fontWeight: '600', color: colors.secondaryLabel }}>
                best · {challenge.unit}
              </Text>
            </View>
          ) : (
            <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 26, lineHeight: 38, fontWeight: '800', color: colors.tertiaryLabel }}>
              Try it
            </Text>
          )}
        </View>
      </View>
    </PressableScale>
  );
}

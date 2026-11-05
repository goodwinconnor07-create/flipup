import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';

import type { SoloId } from '@design/challengeArt';

import { CHALLENGES, type ChallengeDef } from '@/engine';
import { useChallengeBests, type ChallengeBest } from '@/state/challenges';
import { flameOf, SCENARIOS, solvedCount, useRangeGrades, useRangePlay } from '@/state/ranges';
import { radius, ROUNDED, spacing, useColors, useShadows } from '@/theme';

import { ChallengePicture } from '../challenge-picture';
import { haptic } from '../haptics';
import { Icon } from '../icon';
import { PressableScale } from '../pressable-scale';
import { RangeTeaser } from '../ranges/teaser';
import { SectionTitle } from './section-title';

const CARD = 184;
const PICTURE = 110;

/**
 * Challenges on Home: scored solo games as cards on the grey card surface, each with its own picture (a short
 * stack, a magnifying glass over the cards, a rewind arrow), "Solo", its name and one big number, your best in gold
 * (or "Try it" before you've played it). Range training is the last card: not a challenge (no table, no score), but
 * solo and on the same shelf, its number how many hands you've played the best way.
 */
export function ChallengeRow() {
  const bests = useChallengeBests();
  return (
    <View style={{ gap: spacing.sm }}>
      <SectionTitle title="Challenges" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.md, marginTop: -8 + spacing.xs, marginBottom: -28 + spacing.xs }} contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: 8, paddingBottom: 28, gap: spacing.sm }}>
        {CHALLENGES.map((c) => (
          <ChallengeCard key={c.id} challenge={c} best={bests[c.id]} />
        ))}
        <RangeCard />
      </ScrollView>
    </View>
  );
}

function ChallengeCard({ challenge, best }: { challenge: ChallengeDef; best?: ChallengeBest }) {
  const played = !!best && best.plays > 0;
  const unit = challenge.unit === 'bb' ? 'big blinds' : challenge.unit;
  return (
    <SoloCard
      picture={challenge.id}
      name={challenge.name}
      score={played ? { value: best.best, unit: `best · ${challenge.unit}` } : undefined}
      accessibilityLabel={`${challenge.name}, a solo challenge. ${played ? `Your best: ${best.best} ${unit}` : 'Not played yet'}`}
      href={`/challenge/${challenge.id}`}
    />
  );
}

/**
 * Range training: one card more in the row. Its picture is live (today's hand, or today's three squares once
 * played, and the flame), its number how many hands you've played the best way.
 */
function RangeCard() {
  const grades = useRangeGrades();
  const play = useRangePlay();
  const solved = solvedCount(grades);
  const played = Object.keys(grades).length > 0;
  const flame = flameOf(play).days;
  return (
    <SoloCard
      picture="ranges"
      art={<RangeTeaser width={CARD} height={PICTURE} />}
      name="Range training"
      score={played ? { value: solved, unit: `of ${SCENARIOS.length} best` } : undefined}
      accessibilityLabel={`Range training: read what they could have, then make one call. ${played ? `${solved} of ${SCENARIOS.length} hands played the best way` : 'Not played yet'}${flame ? `. ${flame}-day streak` : ''}`}
      href="/range-training"
    />
  );
}

function SoloCard({ picture, art, name, score, accessibilityLabel, href }: { picture: SoloId; art?: ReactNode; name: string; score?: { value: number; unit: string }; accessibilityLabel: string; href: Href }) {
  const colors = useColors();
  const shadows = useShadows();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Shows how it plays"
      haptics={false}
      onPress={() => {
        haptic.tap();
        router.push(href);
      }}
      style={{ width: CARD, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell, boxShadow: shadows.card }}
    >
      {/* The shadow sits on the press area; the picture and text are clipped to the rounded card inside it. */}
      <View style={{ borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden' }}>
        {art ?? <ChallengePicture id={picture} width={CARD} height={PICTURE} rounded={0} />}
        <View style={{ padding: spacing.sm, paddingTop: spacing.xs, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs }}>
            <Icon name="person.fill" size={11} color={colors.secondaryLabel} />
            <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 13, lineHeight: 16, fontWeight: '600', color: colors.secondaryLabel }}>
              Solo
            </Text>
          </View>
          <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={{ fontFamily: ROUNDED, fontSize: 19, lineHeight: 23, fontWeight: '700', color: colors.label }}>
            {name}
          </Text>
          {score ? (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xxs }}>
              <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 32, lineHeight: 38, fontWeight: '800', fontVariant: ['tabular-nums'], color: colors.gold }}>
                {score.value}
              </Text>
              <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={{ flexShrink: 1, fontSize: 13, fontWeight: '600', color: colors.secondaryLabel }}>
                {score.unit}
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

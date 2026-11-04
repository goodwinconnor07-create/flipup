import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';

import { haptic } from '@/components/haptics';
import { Icon, type IconName } from '@/components/icon';
import { LivingCard } from '@/components/living-card';
import { PressableScale } from '@/components/pressable-scale';
import { Kicker, NightSheet, panel } from '@/components/ranges/night-sheet';
import { SQUARE_COLOUR } from '@/components/ranges/share';
import { RangeTeaser } from '@/components/ranges/teaser';
import { SegmentedControl } from '@/components/segmented-control';
import type { Mode } from '@/state/range-logic';
import { dailyToday, flameOf, SCENARIOS, setLevel, solvedCount, trickProgress, useRangeGrades, useRangePlay } from '@/state/ranges';
import { brand, cardColors, radius, ROUNDED, spacing } from '@/theme';

/**
 * Range training's door, on the room's night page: today's hand as a live picture with your flame, the name and
 * one line, then three ways in (a round of five, today's three, Blitz), Easy or Pro, your tricks and the poker
 * words, and how you're doing.
 */
export default function RangeTrainingSheet() {
  const grades = useRangeGrades();
  const play = useRangePlay();
  const { width } = useWindowDimensions();
  const w = Math.min(width, 600) - spacing.md * 2;
  const solved = solvedCount(grades);
  const today = dailyToday(play);
  const flame = flameOf(play);
  const progress = trickProgress(grades);
  const concepts = Object.keys(progress);
  const mastered = concepts.filter((c) => progress[c].best).length;

  const go = (mode: Mode) => {
    haptic.tap();
    router.back();
    router.push({ pathname: '/ranges', params: { mode } });
  };
  const open = (href: Href) => {
    haptic.tap();
    router.push(href);
  };

  return (
    <NightSheet>
      <View style={{ borderRadius: radius.lg, boxShadow: '0 20px 40px -20px rgba(0,0,0,0.9)' }}>
        <RangeTeaser width={w} height={Math.round((w * 120) / 200)} rounded={radius.lg} />
      </View>

      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="person.fill" size={12} color="rgba(255,255,255,0.6)" />
          <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.6)' }}>
            Solo training
          </Text>
          {flame.days > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto' }}>
              <Icon name="flame.fill" size={14} color={brand.gold} />
              <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 14, fontWeight: '800', color: brand.gold }}>
                {flame.days}-day streak
              </Text>
            </View>
          )}
        </View>
        <Text maxFontSizeMultiplier={1.3} accessibilityRole="header" style={{ fontFamily: ROUNDED, fontSize: 36, lineHeight: 42, fontWeight: '800', color: '#ffffff' }}>
          Range training
        </Text>
        <Text maxFontSizeMultiplier={1.5} style={{ fontSize: 17, lineHeight: 23, color: 'rgba(255,255,255,0.72)' }}>
          Read what they could have from how they bet, then make the call.
        </Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        <ModeCard colors={cardColors.violet} icon="play.fill" title="Play a round" line="5 hands · ones you haven’t got yet first" onPress={() => go('round')} big />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <ModeCard
            colors={cardColors.gold}
            ink={brand.goldInk}
            icon="calendar"
            title="Today’s three"
            line={today.done ? 'Done. See it and share' : today.grades.length ? `${today.grades.length} of 3 played` : 'Same hands for everyone'}
            onPress={() => go('daily')}
            extra={
              today.grades.length > 0 ? (
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {today.ids.map((_, i) => (
                    <View key={i} style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: today.grades[i] ? SQUARE_COLOUR[today.grades[i]] : 'rgba(59,38,0,0.18)' }} />
                  ))}
                </View>
              ) : null
            }
          />
          <ModeCard colors={cardColors.night} icon="bolt.fill" title="Blitz" line={play.blitzBest ? `60 seconds · best ${play.blitzBest}` : '60 seconds, as many as you can'} onPress={() => go('blitz')} />
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Kicker>How much to show</Kicker>
        <SegmentedControl
          label="Level"
          options={[
            { value: 'easy', label: 'Easy' },
            { value: 'pro', label: 'Pro' },
          ]}
          value={play.level}
          onChange={(v) => {
            haptic.select();
            setLevel(v);
          }}
        />
        <Text maxFontSizeMultiplier={1.5} style={{ fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.65)' }}>
          {play.level === 'easy'
            ? 'Plain words, and a hint about the bettor when it’s your move. The numbers are a tap away.'
            : 'Every number open, Lock it in for double points, and guess your chance to win before the answer.'}
        </Text>
      </View>

      <View style={panel}>
        <Row icon="square.grid.2x2.fill" title="Your tricks" detail={`${mastered} of ${concepts.length}`} onPress={() => open('/range-tricks')} />
        <View style={{ height: 0.5, backgroundColor: 'rgba(255,255,255,0.12)' }} />
        <Row icon="book.fill" title="Poker words" detail="Plain English" onPress={() => open('/range-glossary')} />
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Tile value={`${solved}/${SCENARIOS.length}`} line="best plays" />
        <Tile value={play.points.toLocaleString('en-US')} line="points" />
        <Tile value={String(play.roundBest)} line="best round" />
      </View>

      <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 13, textAlign: 'center', color: 'rgba(255,255,255,0.45)' }}>
        Free, on this phone. A finished round counts for your daily streak.
      </Text>
    </NightSheet>
  );
}

function ModeCard({ colors, ink = '#ffffff', icon, title, line, onPress, big, extra }: { colors: readonly [string, string, string]; ink?: string; icon: IconName; title: string; line: string; onPress: () => void; big?: boolean; extra?: ReactNode }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${title}. ${line}`} haptics={false} onPress={onPress} outerStyle={{ flex: 1 }}>
      <LivingCard colors={colors} radius={radius.lg} grain={0} shadow="soft" style={{ padding: spacing.md, gap: spacing.xs, minHeight: big ? 104 : 132, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ width: big ? 40 : 34, height: big ? 40 : 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: ink === '#ffffff' ? 'rgba(255,255,255,0.18)' : 'rgba(59,38,0,0.12)' }}>
            <Icon name={icon} size={big ? 19 : 16} color={ink} />
          </View>
          {extra ?? (big ? <Icon name="chevron.right" size={16} color={ink} /> : null)}
        </View>
        <View>
          <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontFamily: ROUNDED, fontSize: big ? 24 : 19, lineHeight: big ? 29 : 23, fontWeight: '800', color: ink }}>
            {title}
          </Text>
          <Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={{ fontSize: 13, lineHeight: 17, fontWeight: '600', color: ink === '#ffffff' ? 'rgba(255,255,255,0.78)' : 'rgba(59,38,0,0.75)' }}>
            {line}
          </Text>
        </View>
      </LivingCard>
    </PressableScale>
  );
}

function Row({ icon, title, detail, onPress }: { icon: IconName; title: string; detail: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${title}, ${detail}`} haptics={false} onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 }}>
      <View style={{ width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.violet }}>
        <Icon name={icon} size={15} color="#ffffff" />
      </View>
      <Text maxFontSizeMultiplier={1.4} style={{ flex: 1, fontSize: 17, fontWeight: '600', color: '#ffffff' }}>
        {title}
      </Text>
      <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)' }}>
        {detail}
      </Text>
      <Icon name="chevron.right" size={13} color="rgba(255,255,255,0.35)" />
    </PressableScale>
  );
}

function Tile({ value, line }: { value: string; line: string }) {
  return (
    <View style={{ flex: 1, padding: spacing.sm, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: 'rgba(255,255,255,0.07)' }}>
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: ROUNDED, fontSize: 24, lineHeight: 29, fontWeight: '800', color: brand.gold, fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.6)' }}>
        {line}
      </Text>
    </View>
  );
}

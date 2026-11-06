import { router, Stack, type Href } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { ChallengePicture } from '@/components/challenge-picture';
import { Row, Section } from '@/components/grouped-list';
import { haptic } from '@/components/haptics';
import { Icon, type IconName } from '@/components/icon';
import { LivingCard } from '@/components/living-card';
import { PressableScale } from '@/components/pressable-scale';
import { ProfileMenu } from '@/components/profile-menu';
import { SegmentedControl } from '@/components/segmented-control';
import { TabScreen } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { LessonPath } from '@/components/train/lesson-path';
import { buildPath, type Lesson } from '@/components/train/path';
import { trainStats } from '@/components/train/stats';
import { StatsView } from '@/components/train/stats-view';
import { CHALLENGES } from '@/engine';
import { useChallengeBests } from '@/state/challenges';
import type { Mode } from '@/state/range-logic';
import {
  allHands,
  DAILY_GOAL,
  dailyToday,
  flameOf,
  setLevel,
  solvedCount,
  trickProgress,
  useRangeGrades,
  useRangePlay,
  xpToday,
} from '@/state/ranges';
import { brand, cardColors, radius, ROUNDED, spacing, useColors } from '@/theme';

/**
 * The Train tab: simple on purpose. Three small counters (your flame, today's points against the daily goal, tricks
 * collected), then one big Keep going that drops you into hand after hand (close it whenever; the points are banked).
 * Under it the tricks as a path to pick from, then a short More list: today's three, Blitz, a round, your tricks, poker
 * words, how much to show (Easy or Pro) and the table challenges.
 */
export default function TrainTab() {
  const grades = useRangeGrades();
  const play = useRangePlay();
  const progress = trickProgress(grades);
  const path = buildPath(
    allHands().map((s) => s.concept),
    progress,
  );
  const flame = flameOf(play);
  const xp = xpToday(play);
  const today = dailyToday(play);
  const [view, setView] = useState<'practice' | 'stats'>('practice');

  const start = (mode: Mode, extra: Record<string, string> = {}) => {
    haptic.tap();
    router.push({ pathname: '/ranges', params: { mode, ...extra } });
  };
  const lesson = (l: Lesson) => start('lesson', { concept: l.concept });
  const open = (href: Href) => {
    haptic.tap();
    router.push(href);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Train', headerShown: false }} />
      <TabScreen title="Train" accessory={<ProfileMenu />}>
        <SegmentedControl
          label="View"
          options={[
            { value: 'practice', label: 'Practice' },
            { value: 'stats', label: 'Stats' },
          ]}
          value={view}
          onChange={(v) => {
            haptic.select();
            setView(v);
          }}
        />
        {view === 'stats' ? (
          <StatsView stats={trainStats(grades, allHands(), play)} />
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              <Counter icon="flame.fill" lit={flame.today} value={String(flame.days)} label={`${flame.days}-day streak`} />
              <Counter
                icon="bolt.fill"
                lit={xp >= DAILY_GOAL}
                value={`${Math.min(xp, 9999)}`}
                label={`${xp} of ${DAILY_GOAL} points today`}
              />
              <Counter
                icon="crown.fill"
                lit={path.collected > 0}
                value={`${path.collected}/${path.total}`}
                label={`${path.collected} of ${path.total} tricks collected`}
              />
            </View>

            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Keep going. Hand after hand, close it whenever."
              haptics={false}
              onPress={() => start('endless')}
            >
              <LivingCard
                colors={cardColors.violet}
                radius={radius.xl}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, minHeight: 128 }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    maxFontSizeMultiplier={1.3}
                    style={{ fontFamily: ROUNDED, fontSize: 32, lineHeight: 37, fontWeight: '800', color: '#ffffff' }}
                  >
                    Keep going
                  </Text>
                  <Text
                    maxFontSizeMultiplier={1.3}
                    style={{ fontSize: 15, lineHeight: 20, fontWeight: '600', color: 'rgba(255,255,255,0.8)' }}
                  >
                    One hand after another. Stop whenever.
                  </Text>
                </View>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: brand.paper,
                  }}
                >
                  <Icon name="play.fill" size={22} color={brand.violet} />
                </View>
              </LivingCard>
            </PressableScale>

            <View style={{ gap: spacing.xs }}>
              <ThemedText variant="title3" accessibilityRole="header" style={{ paddingHorizontal: spacing.xxs }}>
                Pick a trick
              </ThemedText>
              <ThemedText variant="footnote" tone="secondaryLabel" style={{ paddingHorizontal: spacing.xxs }}>
                Collect one to unlock the next.
              </ThemedText>
            </View>
            <LessonPath units={path.units} onStart={lesson} onTricks={() => open('/range-tricks')} />

            <Section header="More">
              <Row
                title="Today’s three"
                detail={today.done ? 'Done' : today.grades.length ? `${today.grades.length} of 3` : 'Same for everyone'}
                icon={{ symbol: 'calendar', color: brand.gold }}
                onPress={() => start('daily')}
              />
              <Row
                title="Blitz"
                detail={play.blitzBest ? `Best ${play.blitzBest}` : '60 seconds'}
                icon={{ symbol: 'bolt.fill', color: brand.violet }}
                onPress={() => start('blitz')}
              />
              <Row
                title="Play a round"
                detail="5 hands"
                icon={{ symbol: 'play.fill', color: brand.violet }}
                onPress={() => start('round')}
              />
              <Row
                title="Your tricks"
                detail={`${path.collected} of ${path.total}`}
                icon={{ symbol: 'square.grid.2x2.fill', color: brand.violet }}
                onPress={() => open('/range-tricks')}
              />
              <Row
                title="Poker words"
                detail="Plain English"
                icon={{ symbol: 'book.fill', color: brand.violet }}
                onPress={() => open('/range-glossary')}
              />
            </Section>

            <View style={{ gap: spacing.xs }}>
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
              <ThemedText variant="footnote" tone="tertiaryLabel" style={{ paddingHorizontal: spacing.md }}>
                {play.level === 'easy'
                  ? 'Plain words, and a hint about the bettor when it’s your move. The numbers are a tap away.'
                  : 'Every number open, Lock it in for double points, and guess your chance to win before the answer.'}
              </ThemedText>
            </View>

            <TableChallenges />
          </>
        )}
      </TabScreen>
    </>
  );
}

/** One of the three counters along the top: an icon that lights up in gold, and a number. */
function Counter({ icon, lit, value, label }: { icon: IconName; lit: boolean; value: string; label: string }) {
  const colors = useColors();
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        minHeight: 44,
        borderRadius: radius.full,
        backgroundColor: colors.cell,
      }}
    >
      <Icon name={icon} size={18} color={lit ? brand.gold : (colors.tertiaryLabel as string)} />
      <Text
        maxFontSizeMultiplier={1.3}
        numberOfLines={1}
        style={{
          fontFamily: ROUNDED,
          fontSize: 17,
          fontWeight: '800',
          fontVariant: ['tabular-nums'],
          color: lit ? colors.label : colors.secondaryLabel,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

/** The scored solo tables (Short Stack, Style Detective, Rewind), which used to be Home's Challenges row. */
function TableChallenges() {
  const bests = useChallengeBests();
  return (
    <Section header="Table challenges" footer="Scored solo games at a real table against the bots.">
      {CHALLENGES.map((c) => {
        const best = bests[c.id];
        return (
          <Row
            key={c.id}
            title={c.name}
            detail={best && best.plays > 0 ? `Best ${best.best} ${c.unit}` : 'Try it'}
            leading={
              <View style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden' }}>
                <ChallengePicture id={c.id} width={40} height={40} rounded={10} />
              </View>
            }
            onPress={() => {
              haptic.tap();
              router.push(`/challenge/${c.id}`);
            }}
          />
        );
      })}
    </Section>
  );
}

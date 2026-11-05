import { router, Stack, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { ChallengePicture } from '@/components/challenge-picture';
import { Row, Section } from '@/components/grouped-list';
import { haptic } from '@/components/haptics';
import { Icon, type IconName } from '@/components/icon';
import { LivingCard } from '@/components/living-card';
import { PressableScale } from '@/components/pressable-scale';
import { ProfileMenu } from '@/components/profile-menu';
import { SQUARE_COLOUR } from '@/components/ranges/share';
import { SegmentedControl } from '@/components/segmented-control';
import { TabScreen } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { LessonPath } from '@/components/train/lesson-path';
import { buildPath, handsLabel, lastWeek, type Lesson } from '@/components/train/path';
import { CHALLENGES } from '@/engine';
import { useChallengeBests } from '@/state/challenges';
import type { Mode } from '@/state/range-logic';
import { allHands, DAILY_GOAL, dailyToday, flameOf, setLevel, solvedCount, trickProgress, useRangeGrades, useRangePlay, xpToday } from '@/state/ranges';
import { brand, cardColors, radius, ROUNDED, spacing, useColors, useShadows } from '@/theme';

/**
 * The Train tab: Range training as its own screen, built like a language app's home. Up top, three counters (your
 * flame, today's points against the daily goal, tricks collected), then the streak card with the week and the
 * daily goal bar, a big Continue for the lesson you're on, and today's three and Blitz. Then the path: every trick
 * as a lesson, unit by unit, each one opening once the one before is collected. Under it, how much to show (Easy or
 * Pro), your tricks, poker words, your numbers, and the table challenges (Short Stack, Style Detective, Rewind).
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
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <Counter icon="flame.fill" lit={flame.today} value={String(flame.days)} label={`${flame.days}-day streak`} />
          <Counter icon="bolt.fill" lit={xp >= DAILY_GOAL} value={`${Math.min(xp, 9999)}`} label={`${xp} of ${DAILY_GOAL} points today`} />
          <Counter icon="crown.fill" lit={path.collected > 0} value={`${path.collected}/${path.total}`} label={`${path.collected} of ${path.total} tricks collected`} />
        </View>

        <StreakCard days={flame.days} today={flame.today} trained={play.days} xp={xp} />

        {path.current && <ContinueCard lesson={path.current} onPress={() => lesson(path.current!)} />}

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <ModeCard
            colors={cardColors.gold}
            ink={brand.goldInk}
            icon="calendar"
            title="Today’s three"
            line={today.done ? 'Done. See it and share' : today.grades.length ? `${today.grades.length} of 3 played` : 'Same hands for everyone'}
            onPress={() => start('daily')}
            extra={
              today.grades.length > 0 ? (
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {today.ids.map((_, i) => (
                    <View key={i} style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: today.grades[i] ? SQUARE_COLOUR[today.grades[i]] : 'rgba(59,38,0,0.18)' }} />
                  ))}
                </View>
              ) : null
            }
          />
          <ModeCard colors={cardColors.night} icon="bolt.fill" title="Blitz" line={play.blitzBest ? `60 seconds · best ${play.blitzBest}` : '60 seconds, as many as you can'} onPress={() => start('blitz')} />
        </View>

        <LessonPath units={path.units} onStart={lesson} onTricks={() => open('/range-tricks')} />

        <View style={{ gap: spacing.xs }}>
          <ThemedText variant="footnote" tone="tertiaryLabel" accessibilityRole="header" style={{ textTransform: 'uppercase', paddingHorizontal: spacing.md }}>
            How much to show
          </ThemedText>
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

        <Section header="Practice">
          <Row title="Play a round" subtitle="5 hands, ones you haven’t got yet first" icon={{ symbol: 'play.fill', color: brand.violet }} onPress={() => start('round')} />
          <Row title="Your tricks" detail={`${path.collected} of ${path.total}`} icon={{ symbol: 'square.grid.2x2.fill', color: brand.violet }} onPress={() => open('/range-tricks')} />
          <Row title="Poker words" detail="Plain English" icon={{ symbol: 'book.fill', color: brand.violet }} onPress={() => open('/range-glossary')} />
        </Section>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Tile value={String(solvedCount(grades))} line="best plays" />
          <Tile value={play.points.toLocaleString('en-US')} line="points" />
          <Tile value={String(play.roundBest)} line="best round" />
        </View>

        <TableChallenges />

        <ThemedText variant="footnote" tone="tertiaryLabel" style={{ textAlign: 'center' }}>
          Free, on this phone. A finished lesson counts for your daily streak.
        </ThemedText>
      </TabScreen>
    </>
  );
}

/** One of the three counters along the top: an icon that lights up in gold, and a number. */
function Counter({ icon, lit, value, label }: { icon: IconName; lit: boolean; value: string; label: string }) {
  const colors = useColors();
  return (
    <View accessible accessibilityLabel={label} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, borderRadius: radius.full, backgroundColor: colors.cell }}>
      <Icon name={icon} size={18} color={lit ? brand.gold : (colors.tertiaryLabel as string)} />
      <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontFamily: ROUNDED, fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'], color: lit ? colors.label : colors.secondaryLabel }}>
        {value}
      </Text>
    </View>
  );
}

/**
 * The streak: the flame and its number big, a line on what to do today, the last seven days as circles (a flame in
 * each day you trained), and today's points filling the bar towards the daily goal.
 */
function StreakCard({ days, today, trained, xp }: { days: number; today: boolean; trained: string[]; xp: number }) {
  const have = new Set(trained);
  const week = lastWeek();
  const goal = Math.min(1, xp / DAILY_GOAL);
  const line = today ? (xp >= DAILY_GOAL ? 'Daily goal hit. See you tomorrow.' : 'Streak safe for today. Finish the goal?') : days > 0 ? 'Finish a lesson today to keep it going.' : 'Finish a lesson to light your first flame.';
  return (
    <LivingCard colors={cardColors.night} radius={radius.xl} style={{ padding: spacing.md, gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: today ? 'rgba(245,183,0,0.18)' : 'rgba(255,255,255,0.08)' }}>
          <Icon name="flame.fill" size={36} color={today ? brand.gold : 'rgba(255,255,255,0.4)'} />
        </View>
        <View style={{ flex: 1 }}>
          <Text maxFontSizeMultiplier={1.3} accessibilityRole="header" style={{ fontFamily: ROUNDED, fontSize: 30, lineHeight: 35, fontWeight: '800', color: '#ffffff' }}>
            {days} day{days === 1 ? '' : 's'}
          </Text>
          <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 15, lineHeight: 20, color: 'rgba(255,255,255,0.75)' }}>
            {line}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} accessible accessibilityLabel={`This week: trained on ${week.filter((d) => have.has(d.key)).length} of 7 days`}>
        {week.map((d) => {
          const on = have.has(d.key);
          return (
            <View key={d.key} style={{ alignItems: 'center', gap: 4 }}>
              <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 12, fontWeight: '700', color: d.today ? brand.gold : 'rgba(255,255,255,0.55)' }}>
                {d.letter}
              </Text>
              <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? brand.gold : 'rgba(255,255,255,0.08)', borderWidth: d.today && !on ? 2 : 0, borderColor: brand.gold }}>
                {on && <Icon name="flame.fill" size={16} color={brand.goldInk} />}
              </View>
            </View>
          );
        })}
      </View>

      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 13, fontWeight: '800', letterSpacing: 1, color: 'rgba(255,255,255,0.65)' }}>
            DAILY GOAL
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'], color: '#ffffff' }}>
            {Math.min(xp, DAILY_GOAL)} / {DAILY_GOAL}
          </Text>
        </View>
        <View style={{ height: 14, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }} accessible accessibilityLabel={`Daily goal: ${xp} of ${DAILY_GOAL} points`}>
          <View style={{ width: `${goal * 100}%`, height: 14, borderRadius: 7, backgroundColor: brand.gold }} />
        </View>
      </View>
    </LivingCard>
  );
}

/** The lesson you're on, one tap from playing: the biggest thing on the screen after the streak. */
function ContinueCard({ lesson, onPress }: { lesson: Lesson; onPress: () => void }) {
  const started = lesson.done > 0;
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${started ? 'Keep going' : 'Start'}: ${lesson.trick.nick}. ${handsLabel(lesson.hands)}`} haptics={false} onPress={onPress}>
      <LivingCard colors={cardColors.violet} radius={radius.xl} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, minHeight: 112 }}>
        <View style={{ width: 60, height: 60, borderRadius: 18, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' }}>
          <Icon name={lesson.trick.icon} size={28} color={brand.gold} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 13, fontWeight: '800', letterSpacing: 1.1, color: 'rgba(255,255,255,0.75)' }}>
            {started ? 'KEEP GOING' : 'UP NEXT'}
          </Text>
          <Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={{ fontFamily: ROUNDED, fontSize: 24, lineHeight: 28, fontWeight: '800', color: '#ffffff' }}>
            {lesson.trick.nick}
          </Text>
          <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.78)' }}>
            {handsLabel(lesson.hands)} · {Math.floor(lesson.done)} of {lesson.goal} best play{lesson.goal === 1 ? '' : 's'}
          </Text>
        </View>
        <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.paper }}>
          <Icon name="play.fill" size={18} color={brand.violet} />
        </View>
      </LivingCard>
    </PressableScale>
  );
}

function ModeCard({ colors, ink = '#ffffff', icon, title, line, onPress, extra }: { colors: readonly [string, string, string]; ink?: string; icon: IconName; title: string; line: string; onPress: () => void; extra?: ReactNode }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${title}. ${line}`} haptics={false} onPress={onPress} outerStyle={{ flex: 1 }}>
      <LivingCard colors={colors} radius={radius.lg} shadow="soft" style={{ padding: spacing.md, gap: spacing.xs, minHeight: 132, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: ink === '#ffffff' ? 'rgba(255,255,255,0.18)' : 'rgba(59,38,0,0.12)' }}>
            <Icon name={icon} size={16} color={ink} />
          </View>
          {extra}
        </View>
        <View>
          <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontFamily: ROUNDED, fontSize: 19, lineHeight: 23, fontWeight: '800', color: ink }}>
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

function Tile({ value, line }: { value: string; line: string }) {
  const colors = useColors();
  const shadows = useShadows();
  return (
    <View style={{ flex: 1, padding: spacing.sm, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.cell, boxShadow: shadows.card }}>
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: ROUNDED, fontSize: 24, lineHeight: 29, fontWeight: '800', color: colors.gold, fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 12, fontWeight: '600', color: colors.secondaryLabel }}>
        {line}
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

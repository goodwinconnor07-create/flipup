// Range training's start screen, the Train tab. Two layouts:
// - Free: one hand a day (the daily hand, since 12 Nov 2026) is the hero: a dated card (Start, then your result and
//   the countdown to tomorrow's), then the ways to train as tiles (`ModeTiles`: the daily hand free, Endless, Sets and
//   Gaps with a crown), How it works, your streak and numbers.
// - Premium: the tiles first, then the spots worth working on, how much of the library you've mastered, and the daily
//   hand as one row, so the streak and sharing work for everyone.
// Nothing is dealt here; sets play full screen in app/range-session.tsx.
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Share, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Row, Section, usePanel } from '@/components/grouped-list';
import { Switch } from '@/components/switch';
import { setReminder, useReminder } from '@/state/reminder';
import { haptic } from '@/components/haptics';
import { Icon, type IconName } from '@/components/icon';
import { LivingCard } from '@/components/living-card';
import { PressableScale } from '@/components/pressable-scale';
import { Swap, SwapIcon } from '@/components/swap';
import { ThemedText } from '@/components/themed-text';
import { popIn } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { countdown, DAILY_HANDS, GRADE_WORDS, msUntilTomorrow, shareText } from '@/state/daily-quiz';
import { hasPremium, usePremium } from '@/state/premium';
import { useDaily, type DailyQuiz } from '@/state/range-daily';
import { libraryProgress, longestRun, missedHands, rangeStats, type Answer } from '@/state/range-history';
import { unlockToTrain } from '@/state/unlock';
import { brand, cardColors, radius, ROUNDED, spacing } from '@/theme';
import type { Grade } from '@train/ranges/model';

import { ModeTiles, type TrainMode } from './mode-tiles';

const NUM = { fontVariant: ['tabular-nums' as const] };
const DOT: Record<Grade, string> = { best: brand.gold, ok: brand.violetDark, mistake: 'rgba(255,255,255,0.28)' };

/** Opens a set of five hands, full screen; `focus` limits it to some kinds of spot or single hands. Premium only. */
export function startSet(focus?: string[]) {
  haptic.select();
  if (!unlockToTrain(false, hasPremium())) return;
  router.push(focus?.length ? { pathname: '/range-session', params: { focus: JSON.stringify(focus) } } : '/range-session');
}

/** Endless mode: hand after hand until you go back. Premium only. */
export function startEndless() {
  haptic.select();
  if (!unlockToTrain(false, hasPremium())) return;
  router.push({ pathname: '/range-session', params: { endless: '1' } });
}

/** Opens today's hand, or your answer once it's done. Free for everyone. */
export function startDaily() {
  haptic.select();
  router.push({ pathname: '/range-session', params: { daily: '1' } });
}

export function shareDaily(q: DailyQuiz) {
  haptic.select();
  void Share.share({ message: shareText(new Date(), q.answers.map((a) => a.grade)) }).catch(() => {});
}

/** Minutes until tomorrow's quiz, refreshed every 30s while it's on screen. */
function useCountdown(on: boolean): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [on]);
  return countdown(msUntilTomorrow(new Date(now)));
}

function Stat({ value, label, icon }: { value: string; label: string; icon?: IconName }) {
  const panel = usePanel();
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={{ flex: 1, gap: 2, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: panel.fill, borderWidth: 1, borderColor: panel.edge }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {icon && <Icon name={icon} size={18} color={brand.gold} />}
        <ThemedText variant="title2" style={[{ fontFamily: ROUNDED, fontWeight: '800' }, NUM]}>
          {value}
        </ThemedText>
      </View>
      <ThemedText variant="footnote" tone="secondaryLabel">
        {label}
      </ThemedText>
    </View>
  );
}

/** Five dots, one a hand: gold for the best play, blue for also good, dim for a miss, outlined while still to come. */
function QuizDots({ q, size = 'lg' }: { q: DailyQuiz; size?: 'lg' | 'sm' }) {
  const w = size === 'lg' ? 40 : 14;
  const h = size === 'lg' ? 10 : 6;
  const n = Math.min(DAILY_HANDS, q.hands.length) || DAILY_HANDS;
  return (
    <View accessible accessibilityLabel={`${q.answers.length} of ${n} answered${q.finished ? `, ${q.answers.filter((a) => a.grade === 'best').length} best plays` : ''}`} style={{ flexDirection: 'row', gap: size === 'lg' ? 8 : 4 }}>
      {Array.from({ length: n }, (_, i) => {
        const a = q.answers[i];
        const next = !q.finished && i === q.answers.length;
        return <View key={i} style={{ width: w, height: h, borderRadius: h / 2, backgroundColor: a ? DOT[a.grade] : 'rgba(255,255,255,0.14)', borderWidth: next ? 1.5 : 0, borderColor: 'rgba(255,255,255,0.7)' }} />;
      })}
    </View>
  );
}

/** A solid light button on the night card (the app's Open table look). */
function CardButton({ title, icon, onPress, label }: { title?: string; icon: IconName; onPress: () => void; label?: string }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label ?? title}
      onPress={onPress}
      outerStyle={title ? { flex: 1 } : undefined}
      style={{ minHeight: 52, minWidth: 52, paddingHorizontal: title ? spacing.md : 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderRadius: radius.full, backgroundColor: brand.paper, boxShadow: '0 6px 16px rgba(8,20,51,0.28)' }}
    >
      {/* Start, Continue and Your answers swap in place (rules 16 to 18): the icon crossfades, the word slides through. */}
      <SwapIcon name={icon} size={18} color={brand.violet} />
      {title && (
        <Swap id={title} kind="text">
          <ThemedText variant="headline" style={{ color: brand.violet, fontWeight: '800' }}>
            {title}
          </ThemedText>
        </Swap>
      )}
    </PressableScale>
  );
}

/** The daily quiz as the screen's hero: the date, the five dots, and one thing to do. */
function DailyCard({ q, premium }: { q: DailyQuiz; premium: boolean }) {
  const reduce = useReduceMotion();
  const left = useCountdown(q.finished);
  const best = q.answers.filter((a) => a.grade === 'best').length;
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const one = q.hands.length <= 1;
  const title = q.finished
    ? one
      ? GRADE_WORDS[q.answers[0]?.grade ?? 'mistake']
      : `${best} of ${q.answers.length} best plays`
    : q.started
      ? 'Keep going'
      : one
        ? 'Today’s hand'
        : 'Today’s five';
  const line = q.finished
    ? `Next hand in ${left}.`
    : q.started
      ? `${q.answers.length} of ${q.hands.length} done. Pick up where you left off.`
      : one
        ? 'One free hand a day, the same for everyone. Read the spot, make your call, see why.'
        : 'The same five hands for everyone today. Read the spot, make your call, see why.';
  return (
    <LivingCard colors={q.finished ? cardColors.night : cardColors.violet} radius={radius.xl} style={{ padding: spacing.lg, gap: spacing.md }}>
      <View style={{ gap: spacing.xs }}>
        <ThemedText variant="caption1" tone="onColor" style={{ fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', opacity: 0.85 }}>
          {one ? 'Daily hand' : 'Daily quiz'} · {date}
        </ThemedText>
        <ThemedText variant="title2" tone="onColor" style={{ fontFamily: ROUNDED, fontWeight: '800' }}>
          {title}
        </ThemedText>
      </View>
      {/* One hand a day: no row of dots to fill until there's an answer to colour. */}
      {(!one || q.finished) && <QuizDots q={q} />}
      <ThemedText variant="subhead" tone="onColor" style={{ opacity: 0.9 }}>
        {line}
      </ThemedText>
      {/* One button that becomes the next thing to do (rule 20), with Share popping in beside it once you're done. */}
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        <CardButton title={q.finished ? (one ? 'Your answer' : 'Your answers') : q.started ? 'Continue' : 'Start'} icon={q.finished ? 'list.bullet' : 'play.fill'} onPress={startDaily} />
        {q.finished && (
          <Animated.View entering={reduce ? undefined : popIn()}>
            <CardButton icon="square.and.arrow.up" label="Share your result" onPress={() => shareDaily(q)} />
          </Animated.View>
        )}
      </View>
      {!premium && q.finished && (
        <PressableScale accessibilityRole="button" onPress={() => router.push({ pathname: '/premium', params: { reason: 'training' } })} style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}>
          <Icon name="crown.fill" size={13} color={brand.gold} />
          <ThemedText variant="footnote" tone="onColor" style={{ fontWeight: '700' }}>
            Want more hands now? Premium opens every hand.
          </ThemedText>
        </PressableScale>
      )}
    </LivingCard>
  );
}

export function TrainHome({ history, grades }: { history: Answer[]; grades: Record<string, Grade> }) {
  const st = rangeStats(history);
  const lib = libraryProgress(grades);
  const missed = missedHands(history);
  const first = history.length === 0;
  const premium = usePremium();
  const reminder = useReminder();
  const q = useDaily();
  const left = useCountdown(premium && q.finished);
  const crown = premium ? undefined : <Icon name="crown.fill" size={15} color={brand.gold} />;
  const locked = () => {
    haptic.select();
    router.push({ pathname: '/premium', params: { reason: 'training' } });
  };
  // Gaps: a set from the kinds of spot you get wrong most and the hands you missed (a plain set until there are any).
  const gaps = [...st.weakest.map((w) => w.label), ...missed.map((m) => `id:${m.id}`)];
  const pick = (mode: TrainMode) => {
    if (mode === 'daily') return startDaily();
    if (!premium) return locked();
    if (mode === 'endless') return startEndless();
    if (mode === 'sets') return startSet();
    return startSet(gaps.length ? gaps : undefined);
  };
  const tiles = <ModeTiles locked={!premium} done={q.finished} onPick={pick} />;

  const numbers = (
    <View style={{ flexDirection: 'row', gap: spacing.xs }}>
      <Stat value={`${q.streak}`} label="Day streak" icon="flame.fill" />
      <Stat value={first ? '–' : `${Math.round(st.rate * 100)}%`} label="Best plays" />
      <Stat value={`${longestRun(history)}`} label="Best run" />
    </View>
  );

  // What to work on, from your own answers. Without Premium it's a preview: greyed, with a crown, and a tap opens the offer.
  const workOn = (st.weakest.length > 0 || missed.length > 0 || !premium) && (
    <View style={{ opacity: premium ? 1 : 0.6 }}>
      <Section header="Work on" footer={premium ? undefined : 'Premium builds practice sets from the spots you miss.'}>
        {st.weakest.map((t) => (
          <Row key={t.label} title={t.label} detail={`${t.best} of ${t.total} best plays so far`} icon={{ symbol: 'lightbulb.fill', color: brand.violet }} trailing={crown} onPress={premium ? () => startSet([t.label]) : locked} />
        ))}
        {missed.length > 0 && (
          <Row title="Retry your misses" detail={`${missed.length} hand${missed.length === 1 ? '' : 's'} to try again`} icon={{ symbol: 'arrow.counterclockwise', color: brand.violet }} trailing={crown} onPress={premium ? () => startSet(missed.map((m) => `id:${m.id}`)) : locked} />
        )}
        {!premium && st.weakest.length === 0 && missed.length === 0 && (
          <Row title="Practise the spots you miss" detail="After a few quizzes" icon={{ symbol: 'lightbulb.fill', color: brand.violet }} trailing={crown} onPress={locked} />
        )}
      </Section>
    </View>
  );

  // Optional, off until turned on: a nudge at six each evening, so a streak survives its first week.
  const remind =
    Platform.OS === 'web' ? null : (
      <Section footer="One notification a day at 6 pm when the new quiz is ready. Nothing else.">
        <Row
          title="Daily reminder"
          icon={{ symbol: 'bell.fill', color: brand.violet }}
          chevron={false}
          trailing={
            <Switch
              label="Daily reminder"
              value={reminder.on}
              onValueChange={(on) => {
                haptic.select();
                void setReminder(on);
              }}
            />
          }
        />
      </Section>
    );

  if (!premium)
    return (
      <View style={{ gap: spacing.xl }}>
        <DailyCard q={q} premium={false} />
        {tiles}
        <HowItWorks />
        {numbers}
        {remind}
        <Footnote />
      </View>
    );

  return (
    <View style={{ gap: spacing.xl }}>
      {tiles}
      <HowItWorks />
      {workOn}
      <Section header="Library">
        <Row title={`${lib.best} of ${lib.total} mastered`} subtitle="Hands you've played the best way" accessory={<LibraryBar share={lib.total ? lib.best / lib.total : 0} />} icon={{ symbol: 'book.fill', color: brand.violet }} />
        <Row
          title="Today’s hand"
          detail={q.finished ? `${q.answers.length === 1 ? GRADE_WORDS[q.answers[0].grade] : `${q.answers.filter((a) => a.grade === 'best').length}/${q.answers.length}`} · next in ${left}` : q.started ? `${q.answers.length} of ${q.hands.length}` : 'Same for everyone'}
          icon={{ symbol: 'calendar', color: brand.gold }}
          onPress={startDaily}
        />
      </Section>
      {numbers}
      {remind}
      <Footnote />
    </View>
  );
}

function LibraryBar({ share }: { share: number }) {
  return (
    <View style={{ width: 56, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden' }}>
      <View style={{ width: `${Math.round(share * 100)}%`, height: 6, borderRadius: 3, backgroundColor: brand.gold }} />
    </View>
  );
}

/** A small, quiet button for anyone new: what Range training is, in four steps (the `range-how` sheet). */
function HowItWorks() {
  const panel = usePanel();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="How Range training works"
      onPress={() => {
        haptic.select();
        router.push('/range-how');
      }}
      outerStyle={{ alignSelf: 'flex-start' }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: panel.fill, borderWidth: 1, borderColor: panel.edge }}
    >
      <Icon name="questionmark.circle.fill" size={17} color={brand.gold} />
      <ThemedText variant="subhead" style={{ fontWeight: '700' }}>
        New here? How it works
      </ThemedText>
      <Icon name="chevron.right" size={12} color="rgba(255,255,255,0.5)" />
    </PressableScale>
  );
}

function Footnote() {
  return (
    <ThemedText variant="footnote" tone="tertiaryLabel" style={{ paddingHorizontal: spacing.xxs }}>
      Every hand comes from a published breakdown by a pro or coach. Breakdown on each answer links to it.
    </ThemedText>
  );
}

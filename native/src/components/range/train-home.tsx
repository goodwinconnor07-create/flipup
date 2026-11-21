// Range training's start screen, the Train tab (19 Nov 2026, the owner's pick from a mock-up). One layout for
// everyone: today's hand is the wide card at the top, the one thing to do each day (`DailyCard`: play it, then your
// result, the countdown to the next, Share, and the offer of a reminder), How it works while you're new, then Endless,
// Sets and Gaps in a row under "Keep training" (under the blurred Premium lock without it), what to work on (Premium, once there's
// something), your numbers once you've played, and the library. Nothing is dealt here; hands play full screen in
// app/range-session.tsx.
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Share, View } from 'react-native';
import Svg from 'react-native-svg';

import { trainThumb } from '@design/trainArt';
import { draw } from '@/components/game-picture';
import { Row, Section, usePanel } from '@/components/grouped-list';
import { useReminder } from '@/state/reminder';
import { haptic } from '@/components/haptics';
import { Icon, type IconName } from '@/components/icon';
import { LivingCard } from '@/components/living-card';
import { LockVeil } from '@/components/premium/lock-veil';
import { PressableScale } from '@/components/pressable-scale';
import { Swap, SwapIcon } from '@/components/swap';
import { ThemedText } from '@/components/themed-text';
import { countdown, DAILY_HANDS, GRADE_WORDS, msUntilTomorrow, shareText } from '@/state/daily-quiz';
import { hasPremium, usePremium } from '@/state/premium';
import { useDaily, type DailyQuiz } from '@/state/range-daily';
import { libraryProgress, longestRun, missedHands, rangeStats, type Answer } from '@/state/range-history';
import { toggleReminder } from './reminder-switch';
import { unlockToTrain } from '@/state/unlock';
import { brand, cardColors, radius, ROUNDED, spacing } from '@/theme';
import type { Grade } from '@train/ranges/model';

import { ModeTiles } from './mode-tiles';

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

/** Minutes until tomorrow's hand, refreshed every 30s while it's on screen. */
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

/** A button on the daily card: solid white (the app's Open table look), or `quiet`, see-through white. */
function CardButton({ title, icon, onPress, label, quiet }: { title?: string; icon: IconName; onPress: () => void; label?: string; quiet?: boolean }) {
  const ink = quiet ? '#ffffff' : brand.violet;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label ?? title}
      onPress={onPress}
      outerStyle={title ? { flex: 1 } : undefined}
      style={{ minHeight: 52, minWidth: 52, paddingHorizontal: title ? spacing.md : 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderRadius: radius.full, backgroundColor: quiet ? 'rgba(255,255,255,0.16)' : brand.paper, boxShadow: quiet ? undefined : '0 6px 16px rgba(8,20,51,0.28)' }}
    >
      {/* Play becomes Your answer in place once you've played (rules 16 to 18): the icon crossfades, the word slides through. */}
      <SwapIcon name={icon} size={18} color={ink} />
      {title && (
        <Swap id={title} kind="text">
          <ThemedText variant="headline" numberOfLines={1} style={{ color: ink, fontWeight: '800' }}>
            {title}
          </ThemedText>
        </Swap>
      )}
    </PressableScale>
  );
}

/** Your streak beside Play: a gold flame and the days in a row. */
function StreakChip({ days }: { days: number }) {
  return (
    <View accessible accessibilityLabel={`${days} ${days === 1 ? 'day' : 'days'} in a row`} style={{ minHeight: 52, paddingHorizontal: spacing.sm, borderRadius: radius.full, backgroundColor: 'rgba(8,20,51,0.35)', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Icon name="flame.fill" size={16} color={brand.gold} />
      <ThemedText variant="subhead" tone="onColor" style={[{ fontWeight: '700' }, NUM]}>
        {days} {days === 1 ? 'day' : 'days'}
      </ThemedText>
    </View>
  );
}

const GRADE_MARK: Record<Grade, { icon: IconName; fill: string; ink: string }> = {
  best: { icon: 'checkmark', fill: brand.gold, ink: brand.goldInk },
  ok: { icon: 'checkmark', fill: brand.violetDark, ink: '#ffffff' },
  mistake: { icon: 'xmark', fill: 'rgba(255,255,255,0.28)', ink: '#ffffff' },
};

/**
 * Today's hand, the Train tab's one thing to do: the date, then Play (your streak beside it); once played, how you did,
 * when the next comes, Your answer and Share, and along its bottom edge the offer of a reminder (on, it says so; it's
 * turned off in Settings).
 */
function DailyCard({ q, premium, first, reminderOn }: { q: DailyQuiz; premium: boolean; first: boolean; reminderOn: boolean }) {
  const left = useCountdown(q.finished);
  const best = q.answers.filter((a) => a.grade === 'best').length;
  const date = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const one = q.hands.length <= 1;
  const grade = q.answers[0]?.grade ?? 'mistake';
  const mark = q.finished && one ? GRADE_MARK[grade] : null;
  const title = q.finished ? (one ? GRADE_WORDS[grade] : `${best} of ${q.answers.length} best plays`) : q.started ? 'Keep going' : first ? 'Your first hand' : 'One spot. Your call.';
  const line = q.finished
    ? `Next hand in ${left}.`
    : q.started
      ? `${q.answers.length} of ${q.hands.length} done. Pick up where you left off.`
      : first
        ? 'A real spot and one decision. It takes about a minute.'
        : 'The same hand for everyone today.';
  const play = first ? 'Play your first hand' : q.started ? 'Continue' : one ? 'Play today’s hand' : 'Play today’s hands';
  return (
    <LivingCard colors={cardColors.violet} radius={radius.xl} style={{ padding: spacing.lg, gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <ThemedText variant="caption1" tone="onColor" style={{ fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', opacity: 0.85 }}>
            {one ? 'Today’s hand' : 'Today’s hands'} · {date}
          </ThemedText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            {mark && (
              <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: mark.fill }}>
                <Icon name={mark.icon} size={15} color={mark.ink} />
              </View>
            )}
            <ThemedText variant="title1" tone="onColor" style={{ flexShrink: 1, fontFamily: ROUNDED, fontWeight: '900' }}>
              {title}
            </ThemedText>
          </View>
          <ThemedText variant="subhead" tone="onColor" style={{ opacity: 0.9 }}>
            {line}
          </ThemedText>
        </View>
        <Svg width={84} height={84} viewBox="0 0 100 100" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {trainThumb('daily').map(draw)}
        </Svg>
      </View>
      {!one && <QuizDots q={q} />}
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        <CardButton title={q.finished ? (one ? 'Your answer' : 'Your answers') : play} icon={q.finished ? 'list.bullet' : 'play.fill'} onPress={startDaily} />
        {q.finished ? (
          <CardButton title="Share" icon="square.and.arrow.up" label="Share your result" quiet onPress={() => shareDaily(q)} />
        ) : (
          q.streak > 0 && <StreakChip days={q.streak} />
        )}
      </View>
      {q.finished && Platform.OS !== 'web' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)' }}>
          <Icon name="bell.fill" size={17} color="#ffffff" />
          <View style={{ flex: 1 }}>
            <Swap id={reminderOn ? 'on' : 'off'} kind="text" style={{ alignItems: 'flex-start' }}>
              <ThemedText variant="subhead" tone="onColor" style={{ fontWeight: '600' }}>
                {reminderOn ? 'Reminder on for 6 pm' : 'Remind me tomorrow at 6 pm?'}
              </ThemedText>
            </Swap>
          </View>
          {!reminderOn && (
            <PressableScale accessibilityRole="button" accessibilityLabel="Turn on the daily reminder" onPress={() => toggleReminder(true)} style={{ minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.paper }}>
              <ThemedText variant="subhead" style={{ color: brand.violet, fontWeight: '800' }}>
                Turn on
              </ThemedText>
            </PressableScale>
          )}
        </View>
      )}
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
  const crown = premium ? undefined : <Icon name="crown.fill" size={15} color={brand.gold} />;
  const locked = () => {
    haptic.select();
    router.push({ pathname: '/premium', params: { reason: 'training' } });
  };
  // Gaps: a set from the kinds of spot you get wrong most and the hands you missed. With none yet it waits.
  const gaps = [...st.weakest.map((w) => w.label), ...missed.map((m) => `id:${m.id}`)];
  const pick = (mode: 'endless' | 'sets' | 'gaps') => {
    if (!premium) return locked();
    if (mode === 'endless') return startEndless();
    if (mode === 'sets') return startSet();
    return startSet(gaps.length ? gaps : undefined);
  };

  // What to work on, from your own answers: Premium, and only once there's something.
  const workOn = premium && (st.weakest.length > 0 || missed.length > 0) && (
    <Section header="Work on">
      {st.weakest.map((t) => (
        <Row key={t.label} title={t.label} detail={`${t.best} of ${t.total} best plays so far`} icon={{ symbol: 'lightbulb.fill', color: brand.violet }} trailing={crown} onPress={() => startSet([t.label])} />
      ))}
      {missed.length > 0 && (
        <Row title="Retry your misses" detail={`${missed.length} hand${missed.length === 1 ? '' : 's'} to try again`} icon={{ symbol: 'arrow.counterclockwise', color: brand.violet }} onPress={() => startSet(missed.map((m) => `id:${m.id}`))} />
      )}
    </Section>
  );

  return (
    <View style={{ gap: spacing.xl }}>
      <DailyCard q={q} premium={premium} first={first} reminderOn={reminder.on} />
      {history.length < 3 && <HowItWorks />}
      <ModeTiles
        veil={premium ? undefined : <LockVeil title="Unlock Premium to train" line="Endless hands, scored sets and your gaps" onPress={locked} />}
        gapsWaiting={gaps.length === 0}
        onPick={pick}
      />
      {workOn}
      {/* Your numbers only once there are some: a row of zeros and dashes reads as nothing to see. The streak is on the card. */}
      {!first && (
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <Stat value={`${Math.round(st.rate * 100)}%`} label="Best plays" />
          <Stat value={`${longestRun(history)}`} label="Best run" />
          <Stat value={`${history.length}`} label="Hands played" />
        </View>
      )}
      <Section>
        <Row
          title="Library"
          subtitle={first ? `${lib.total} hands to master` : `${lib.best} of ${lib.total} mastered`}
          accessory={first ? undefined : <LibraryBar share={lib.total ? lib.best / lib.total : 0} />}
          icon={{ symbol: 'book.fill', color: brand.violet }}
        />
      </Section>
    </View>
  );
}

function LibraryBar({ share }: { share: number }) {
  return (
    <View style={{ width: 56, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden' }}>
      <View style={{ width: `${Math.round(share * 100)}%`, height: 6, borderRadius: 3, backgroundColor: brand.violetDark }} />
    </View>
  );
}

/** A small, quiet button while you're new (fewer than three hands): what Range training is, in four steps (the `range-how` sheet). */
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
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: panel.fill, borderWidth: 1, borderColor: panel.edge }}
    >
      <Icon name="questionmark.circle.fill" size={17} color={brand.gold} />
      <ThemedText variant="subhead" style={{ fontWeight: '700' }}>
        New here? How it works
      </ThemedText>
      <Icon name="chevron.right" size={12} color="rgba(255,255,255,0.5)" />
    </PressableScale>
  );
}

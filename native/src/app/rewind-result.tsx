import { router, Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { Button } from '@/components/button';
import { haptic } from '@/components/haptics';
import { SheetScroll } from '@/components/sheet-scroll';
import { ThemedText } from '@/components/themed-text';
import type { Usually } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { closeWhatIf, pauseTable, usuallyForWhatIf, useTable } from '@/state/session';
import { brand, radius, ROUNDED, spacing, useColors } from '@/theme';

/** "How it usually goes" should take about this long; the run count is set from how fast this phone plays the first few. */
const BUDGET_MS = 3000;
const FIRST = 4;
const MIN_RUNS = 30;
const MAX_RUNS = 200;

const signed = (x: number, unit: string) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x).toLocaleString('en-US')}${unit}`;
const bb1 = (x: number) => Math.round(x * 10) / 10;

/**
 * After a rewound hand: what happened the first time against what happened this time, in chips, then how each line
 * usually goes over many deals of the cards you couldn't see. One hand is luck; the average is the long run. The
 * table waits while this is open.
 */
export default function RewindResult() {
  const t = useTable();
  const w = t.challenge?.whatIf;
  const [usual, setUsual] = useState<Usually | null>(null);
  const [stopped, setStopped] = useState(false);
  const stop = useRef(false);

  useEffect(() => {
    pauseTable(true);
    return () => {
      stop.current = true;
      pauseTable(false);
    };
  }, []);

  // Runs a few at a time so the screen stays live, with a progress bar and Stop.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const probe = usuallyForWhatIf(FIRST);
    if (!probe) return;
    const t0 = Date.now();
    probe.step(FIRST);
    const each = Math.max(1, Date.now() - t0) / FIRST;
    const runs = Math.max(MIN_RUNS, Math.min(MAX_RUNS, Math.round(BUDGET_MS / each)));
    const sim = usuallyForWhatIf(runs);
    if (!sim) return;
    const chunk = Math.max(1, Math.round(60 / each));
    const tick = () => {
      if (stop.current) return;
      const now = sim.step(chunk);
      setUsual(now);
      if (now.done < now.total) timer = setTimeout(tick, 0);
    };
    timer = setTimeout(tick, 0);
    return () => clearTimeout(timer);
  }, [w?.hand, w?.now]);

  if (!w) return null;
  const finished = !!usual && usual.done >= usual.total;
  const done = () => {
    haptic.tap();
    stop.current = true;
    closeWhatIf();
    router.back();
  };
  return (
    <SheetScroll contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg }}>
      <Stack.Screen options={{ title: `Hand ${w.hand}` }} />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Side title="What happened" sub={w.did} value={signed(w.was, '')} />
        <Side title="What if" sub={w.tried} value={signed(w.now, '')} highlight />
      </View>
      <ThemedText variant="footnote" tone="tertiaryLabel" style={{ textAlign: 'center' }}>
        Chips won or lost in the hand. The What if result is the one that counts now.
      </ThemedText>

      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="title2" accessibilityRole="header">
          How it usually goes
        </ThemedText>
        <ThemedText tone="secondaryLabel">The cards you couldn&apos;t see, dealt again many times, with the bots playing on.</ThemedText>
        <Line label={w.did} value={usual?.avg[0]} />
        <Line label={w.tried} value={usual?.avg[1]} />
        {!finished && !stopped && <Progress done={usual?.done ?? 0} total={usual?.total ?? 1} />}
        {usual && usual.done > 0 && (
          <ThemedText variant="footnote" tone="tertiaryLabel">
            Average change over the hand, from {usual.done} deal{usual.done === 1 ? '' : 's'}
            {stopped && !finished ? ' (stopped early)' : ''}.
          </ThemedText>
        )}
        <ThemedText variant="headline">One hand is luck; this is the long run.</ThemedText>
        {!finished && !stopped && (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              haptic.tap();
              stop.current = true;
              setStopped(true);
            }}
            hitSlop={8}
            style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' }}
          >
            <ThemedText tone="accent">Stop</ThemedText>
          </Pressable>
        )}
      </View>
      <Button title="Back to the table" variant="party" size="lg" onPress={done} />
    </SheetScroll>
  );
}

function Side({ title, sub, value, highlight }: { title: string; sub: string; value: string; highlight?: boolean }) {
  const colors = useColors();
  return (
    <View accessible accessibilityLabel={`${title}: ${sub}, ${value} chips`} style={{ flex: 1, gap: 2, padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell, borderWidth: 2, borderColor: highlight ? brand.violet : 'transparent' }}>
      <ThemedText variant="subhead" tone="secondaryLabel" style={{ fontWeight: '600' }}>
        {title}
      </ThemedText>
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 30, lineHeight: 36, fontWeight: '800', fontVariant: ['tabular-nums'], color: colors.label }}>
        {value}
      </Text>
      <ThemedText variant="subhead" tone="secondaryLabel">
        {sub}
      </ThemedText>
    </View>
  );
}

function Line({ label, value }: { label: string; value?: number }) {
  const colors = useColors();
  const ready = value !== undefined && Number.isFinite(value);
  return (
    <View accessible accessibilityLabel={`${label}: ${ready ? `${signed(bb1(value), ' big blinds')} on average` : 'working it out'}`} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: spacing.md, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.cell }}>
      <ThemedText variant="headline" style={{ flex: 1 }}>
        {label}
      </ThemedText>
      <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'], color: ready ? colors.label : colors.tertiaryLabel }}>
        {ready ? signed(bb1(value), ' bb') : '…'}
      </Text>
    </View>
  );
}

function Progress({ done, total }: { done: number; total: number }) {
  const colors = useColors();
  const reduce = useReduceMotion();
  const share = Math.max(0, Math.min(1, done / Math.max(1, total)));
  const bar = useAnimatedStyle(() => ({ width: reduce ? `${share * 100}%` : withTiming(`${share * 100}%`, { duration: 120 }) }));
  return (
    <View accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: done }} style={{ height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.cell }}>
      <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: brand.violet }, bar]} />
    </View>
  );
}

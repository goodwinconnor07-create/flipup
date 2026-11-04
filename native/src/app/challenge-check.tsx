import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { haptic } from '@/components/haptics';
import { SheetScroll } from '@/components/sheet-scroll';
import { ThemedText } from '@/components/themed-text';
import { DETECTIVE, LABELS, type Label } from '@/engine';
import { answerCheck, closeCheck, suspects, useTable } from '@/state/session';
import { brand, minTap, radius, ROUNDED, spacing, useColors } from '@/theme';

/**
 * Style Detective's "Read the table", after hands 20, 40 and 60: a style for every bot (your tags filled in), then
 * how many of the five are right. Never which ones. The table waits while it's open.
 */
export default function ChallengeCheck() {
  const t = useTable();
  const colors = useColors();
  const view = t.challenge;
  const [answers, setAnswers] = useState<Record<string, Label>>(() => ({ ...(view?.tags ?? {}) }));
  const [right, setRight] = useState<number | null>(null);
  const bots = suspects();
  if (!view || view.id !== 'detective') return null;
  const index = view.checkWaiting >= 0 ? view.checkWaiting : view.checks - 1;
  const last = index === DETECTIVE.checks.length - 1;
  const ready = bots.every((b) => answers[b.id]);
  const submit = () => {
    const n = answerCheck(answers);
    haptic.success();
    setRight(n);
  };
  const close = () => {
    haptic.tap();
    router.back();
    closeCheck();
  };
  return (
    <SheetScroll contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.lg }}>
      <Stack.Screen options={{ title: 'Read the table', headerShown: false }} />
      <View style={{ gap: spacing.xxs }}>
        <ThemedText variant="subhead" tone="secondaryLabel" style={{ fontWeight: '600' }}>
          After hand {DETECTIVE.checks[index]} of {DETECTIVE.hands}
        </ThemedText>
        <ThemedText variant="largeTitle" accessibilityRole="header">
          Read the table
        </ThemedText>
      </View>
      {right === null ? (
        <>
          <ThemedText tone="secondaryLabel">Pick a style for each bot. You&apos;ll hear how many you have right, not which.</ThemedText>
          {bots.map((b) => (
            <View key={b.id} style={{ gap: spacing.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Text style={{ fontSize: 28 }} maxFontSizeMultiplier={1} accessible={false}>
                  {b.emoji}
                </Text>
                <ThemedText variant="headline">{b.name}</ThemedText>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }} accessibilityRole="radiogroup" accessibilityLabel={`${b.name}'s style`}>
                {LABELS.map((l) => {
                  const on = answers[b.id] === l.id;
                  return (
                    <Pressable
                      key={l.id}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={l.name}
                      onPress={() => {
                        haptic.select();
                        setAnswers((a) => ({ ...a, [b.id]: l.id }));
                      }}
                      style={{ minHeight: minTap, justifyContent: 'center', paddingHorizontal: spacing.sm, borderRadius: radius.full, backgroundColor: on ? brand.violet : colors.cell }}
                    >
                      <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 15, fontWeight: '700', color: on ? '#ffffff' : colors.label }}>
                        {l.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          <Button title={ready ? 'Check' : 'Pick a style for each bot'} variant="party" size="lg" disabled={!ready} onPress={submit} />
        </>
      ) : (
        <View style={{ gap: spacing.lg, alignItems: 'center' }}>
          <View accessible accessibilityLabel={`${right} of 5 right`} style={{ alignItems: 'center' }}>
            <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: ROUNDED, fontSize: 88, lineHeight: 96, fontWeight: '800', fontVariant: ['tabular-nums'], color: right === 5 ? colors.gold : colors.label }}>
              {right} of 5
            </Text>
            <ThemedText variant="title3" tone="secondaryLabel">
              right
            </ThemedText>
          </View>
          <ThemedText tone="secondaryLabel" style={{ textAlign: 'center' }}>
            {last ? 'That was the last check. Time to see who was who.' : 'Keep watching. You can change your tags any time before the next check.'}
          </ThemedText>
          <Button title={last ? 'See who was who' : 'Keep playing'} variant="party" size="lg" onPress={close} style={{ alignSelf: 'stretch' }} />
        </View>
      )}
    </SheetScroll>
  );
}

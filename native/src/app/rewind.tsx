import { router, Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/button';
import { haptic } from '@/components/haptics';
import { SwapIcon } from '@/components/swap';
import { SheetScroll } from '@/components/sheet-scroll';
import { ThemedText } from '@/components/themed-text';
import type { Choice } from '@/engine';
import { pauseTable, rewindSpots, rewindTo, useTable } from '@/state/session';
import { brand, minTap, radius, spacing, useColors } from '@/theme';

const STREET: Record<string, string> = { preflop: 'Before the flop', flop: 'On the flop', turn: 'On the turn', river: 'On the river' };
const chips = (n: number) => Math.round(n).toLocaleString('en-US');

/**
 * Rewind: your decisions in the hand just played, as a timeline. Pick one, pick something else to do there, and the
 * hand plays again from that moment with the same cards. The new result counts, better or worse. The table waits
 * while this is open.
 */
export default function RewindSheet() {
  const colors = useColors();
  const t = useTable();
  // The spots are worked out once: the table is paused while the sheet is open.
  const spots = useMemo(() => rewindSpots(), []);
  const [at, setAt] = useState(spots.length === 1 ? 0 : -1);
  const [choice, setChoice] = useState<Choice | null>(null);
  useEffect(() => {
    pauseTable(true);
    return () => pauseTable(false);
  }, []);
  const left = t.challenge?.rewindsLeft ?? 0;
  const spot = at >= 0 ? spots[at] : undefined;
  const go = () => {
    if (!spot || !choice) return;
    haptic.tap();
    if (rewindTo(spot.index, choice)) router.back();
  };
  return (
    <SheetScroll contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg }}>
      <Stack.Screen options={{ title: 'Rewind' }} />
      <ThemedText tone="secondaryLabel">
        Pick a moment and play it another way. The same cards come, and the new result counts, better or worse. {left} Rewind{left === 1 ? '' : 's'} left.
      </ThemedText>
      {spots.length === 0 ? (
        <ThemedText>There&apos;s nothing to rewind right now.</ThemedText>
      ) : (
        <View style={{ gap: spacing.xs }} accessibilityRole="radiogroup" accessibilityLabel="Your decisions in that hand">
          {spots.map((s, i) => {
            const on = i === at;
            return (
              <Pressable
                key={s.index}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${STREET[s.street]}. Pot ${chips(s.pot)}. You chose ${s.did}.`}
                onPress={() => {
                  haptic.select();
                  setAt(i);
                  setChoice(null);
                }}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: minTap + 12, padding: spacing.sm, paddingLeft: spacing.md, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: on ? brand.violet : pressed ? colors.cellPressed : colors.cell })}
              >
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: on ? '#ffffff' : colors.tertiaryLabel }} />
                <View style={{ flex: 1, gap: 2 }}>
                  <ThemedText variant="headline" style={on ? { color: '#ffffff' } : undefined}>
                    {STREET[s.street]}: {s.did}
                  </ThemedText>
                  <ThemedText variant="subhead" tone="secondaryLabel" style={on ? { color: 'rgba(255,255,255,0.8)' } : undefined}>
                    Pot {chips(s.pot)}
                    {s.toCall > 0 ? ` · ${chips(s.toCall)} to call` : ''}
                  </ThemedText>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
      {spot && (
        <View style={{ gap: spacing.xs }}>
          <ThemedText variant="headline" accessibilityRole="header">
            Instead, I&apos;ll…
          </ThemedText>
          {spot.choices.map((c) => {
            const on = choice?.key === c.key;
            const fold = c.key === 'fold';
            return (
              <Pressable
                key={c.key}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={c.label}
                onPress={() => {
                  haptic.select();
                  setChoice(c);
                }}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', minHeight: minTap + 8, paddingHorizontal: spacing.md, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: pressed ? colors.cellPressed : colors.cell, borderWidth: 2, borderColor: on ? brand.violet : 'transparent' })}
              >
                <ThemedText variant="headline" style={{ flex: 1 }} tone={fold ? 'red' : 'label'}>
                  {c.label}
                </ThemedText>
                <SwapIcon name={on ? 'checkmark' : null} size={18} color={brand.violet} />
              </Pressable>
            );
          })}
        </View>
      )}
      <Button title={choice ? 'Rewind and play it' : 'Pick a moment and a move'} variant="party" size="lg" disabled={!choice || left <= 0} onPress={go} />
    </SheetScroll>
  );
}

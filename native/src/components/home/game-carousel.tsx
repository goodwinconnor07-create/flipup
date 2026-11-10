import { router, useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, ScrollView, Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { VARIANTS, type Variant } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { usePokerRecord } from '@/state/record';
import { spacing } from '@/theme';

import { GameThumb } from '../game-picture';
import { haptic } from '../haptics';
import { Icon } from '../icon';
import { PressableScale } from '../pressable-scale';

const SIZE = 60;
const GAP = 10;
/** Points a second: slow enough to read each game as it passes. */
const SPEED = 26;

const open = (v: Variant) => {
  haptic.tap();
  router.push(`/game/${v}`);
};

function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => sub.remove();
  }, []);
  return active;
}

/**
 * Every game's icon rolling slowly past on a quiet see-through card (where the reference has its OG banner), with
 * "13 game modes" and See all over it. A tap on an icon opens that game's sheet. The roll is one transform on the UI
 * thread at a steady speed; it stops off screen and in the background, and under Reduce Motion the row stands still
 * and you swipe it instead.
 */
export function GameCarousel() {
  const reduce = useReduceMotion();
  const focused = useIsFocused();
  const active = useAppActive();
  const moving = !reduce && focused && active;
  // The game you played last leads the row.
  const last = usePokerRecord().games.at(-1)?.variant;
  const games = last ? [...VARIANTS.filter((v) => v.id === last), ...VARIANTS.filter((v) => v.id !== last)] : VARIANTS;
  const loop = games.length * (SIZE + GAP);
  const x = useSharedValue(0);
  useEffect(() => {
    if (!moving) return;
    const lap = (loop / SPEED) * 1000;
    // Carry on from wherever it stopped, then lap for good.
    const left = ((loop + x.get()) / loop) * lap;
    x.set(
      withSequence(
        withTiming(-loop, { duration: Math.max(0, left), easing: Easing.linear }),
        withRepeat(withSequence(withTiming(0, { duration: 0 }), withTiming(-loop, { duration: lap, easing: Easing.linear })), -1, false),
      ),
    );
    return () => cancelAnimation(x);
  }, [moving, loop, x]);
  const roll = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  const icon = (v: (typeof VARIANTS)[number], copy: number) => (
    <PressableScale key={`${copy}-${v.id}`} accessibilityRole="button" accessibilityLabel={v.name} accessibilityElementsHidden={copy > 0} importantForAccessibility={copy > 0 ? 'no-hide-descendants' : 'auto'} onPress={() => open(v.id)} haptics={false}>
      <GameThumb variant={v.id} size={SIZE} />
    </PressableScale>
  );

  return (
    <View style={{ borderRadius: 24, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.09)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', paddingVertical: spacing.md, gap: spacing.sm }}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${VARIANTS.length} game modes. See all`}
        onPress={() => {
          haptic.tap();
          router.push('/games');
        }}
        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md }}
      >
        <Text maxFontSizeMultiplier={1.2} style={{ flex: 1, fontSize: 13, fontWeight: '700', letterSpacing: 0.8, color: 'rgba(255, 255, 255, 0.62)' }}>
          {VARIANTS.length} GAME MODES
        </Text>
        <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 15, fontWeight: '600', color: 'rgba(255, 255, 255, 0.85)' }}>
          See all
        </Text>
        <Icon name="chevron.right" size={13} color="rgba(255, 255, 255, 0.85)" />
      </PressableScale>
      {reduce ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: GAP }}>
          {games.map((v) => icon(v, 0))}
        </ScrollView>
      ) : (
        <Animated.View style={[{ flexDirection: 'row', gap: GAP, paddingLeft: spacing.md }, roll]}>
          {games.map((v) => icon(v, 0))}
          {games.map((v) => icon(v, 1))}
        </Animated.View>
      )}
    </View>
  );
}

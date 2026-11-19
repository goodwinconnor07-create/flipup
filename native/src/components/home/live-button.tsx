import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { useDrift } from '@/motion/use-drift';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { brand, ROUNDED, spacing } from '@/theme';

/** The green of the app's one green (Raise), as the pieces of the glow. */
const GREEN = '34, 179, 94';
const RADIUS = 20;
/** How fast the words slide, in points a second: slow enough to read. */
const SPEED = 36;
/** Room an unwrapped line may take while it's measured. */
const MEASURE = 4000;

/**
 * The on-air light: a green dot that blinks softly, with a ring that grows out of it and fades, so the game you're
 * in reads as running. Transform and opacity only; under Reduce Motion the dot just stays lit.
 */
function LiveDot() {
  const reduce = useReduceMotion();
  const beat = useSharedValue(0);
  useEffect(() => {
    if (reduce) {
      cancelAnimation(beat);
      beat.set(0);
      return;
    }
    beat.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false));
    return () => cancelAnimation(beat);
  }, [reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  const ring = useAnimatedStyle(() => ({ opacity: 0.7 * (1 - beat.get()), transform: [{ scale: 1 + 1.4 * beat.get() }] }));
  const dot = useAnimatedStyle(() => ({ opacity: 1 - 0.45 * Math.sin(Math.PI * beat.get()) }));
  return (
    <View style={{ width: 8, height: 8 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[{ position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: brand.raise }, ring]} />
      <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: brand.raise }, dot]} />
    </View>
  );
}

const TEXT = { fontFamily: ROUNDED, fontSize: 16, fontWeight: '800', color: '#ffffff' } as const;

/**
 * One line of words that slides left for ever when it's longer than its room (a loop with the words repeated, so
 * there's no jump). Linear, since it's a steady belt and not a move to a place. It stands still under Reduce Motion
 * and while the page isn't on screen, and then shows the short line with an ellipsis.
 */
function Ticker({ text, short }: { text: string; short: string }) {
  const reduce = useReduceMotion();
  const focused = useIsFocused();
  const [room, setRoom] = useState(0);
  const [wide, setWide] = useState(0);
  const x = useSharedValue(0);
  const copy = `${text}     ·     `;
  const run = !reduce && focused && room > 0 && wide > room;
  useEffect(() => {
    cancelAnimation(x);
    x.set(0);
    if (!run) return;
    x.set(withRepeat(withTiming(-wide, { duration: (wide / SPEED) * 1000, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(x);
  }, [run, wide, x]);
  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  return (
    <View style={{ flex: 1, overflow: 'hidden', justifyContent: 'center' }} onLayout={(e) => setRoom(e.nativeEvent.layout.width)}>
      {/* The line at its natural length, unseen, to know whether it fits. */}
      <View pointerEvents="none" style={{ position: 'absolute', opacity: 0, flexDirection: 'row', width: MEASURE }}>
        <Text numberOfLines={1} style={TEXT} onLayout={(e) => setWide(e.nativeEvent.layout.width)}>
          {copy}
        </Text>
      </View>
      {run ? (
        <Animated.View style={[{ flexDirection: 'row', width: MEASURE * 2 }, slide]}>
          <Text numberOfLines={1} style={TEXT}>
            {copy}
          </Text>
          <Text numberOfLines={1} style={TEXT}>
            {copy}
          </Text>
        </Animated.View>
      ) : (
        <Text numberOfLines={1} style={TEXT}>
          {room > 0 && wide <= room ? text : short}
        </Text>
      )}
    </View>
  );
}

/**
 * The way back to a table or party you're in, on Home's second small button: the whole button glows green, softly
 * breathing (an opacity-only layer behind it, still under Reduce Motion), with the live dot and one line that
 * carries everything (who, what game, how many, whose turn) sliding past. The label for VoiceOver says it in full.
 */
export function LiveButton({ text, short, label, onPress }: { text: string; short: string; label: string; onPress: () => void }) {
  const { t } = useDrift(1500);
  const breathe = useAnimatedStyle(() => ({ opacity: 0.55 + 0.45 * t.get() }));
  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: RADIUS, borderCurve: 'continuous', boxShadow: `0 0 18px 1px rgba(${GREEN}, 0.6)` }, breathe]}
      />
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        haptics={false}
        style={{
          minHeight: 54,
          flexDirection: 'row',
          gap: spacing.xs,
          paddingHorizontal: spacing.sm,
          borderRadius: RADIUS,
          borderCurve: 'continuous',
          alignItems: 'center',
          backgroundColor: `rgba(${GREEN}, 0.24)`,
          borderWidth: 1.5,
          borderColor: `rgba(${GREEN}, 0.9)`,
        }}
      >
        <LiveDot />
        <Ticker text={text} short={short} />
      </PressableScale>
    </View>
  );
}

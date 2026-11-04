// The pieces both rows on Play with friends (and the lobby) are made of: a big round face with the name under it,
// in a row that scrolls sideways; purple rings that ripple out of a face when you invite them (green when they
// join); the pill on the face ("Invited…", "Joined"); the small BOT pill; and a bot's first word over its face.
import { useEffect, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';

import type { Message } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { brand, radius, spacing, useColors } from '@/theme';

import { haptic } from '../haptics';
import { Icon } from '../icon';
import { PressableScale } from '../pressable-scale';
import { pinned, Thread } from '../table/bubbles';
import { ThemedText } from '../themed-text';

/** A face in the rows: big enough to read as a person across the room. */
export const FACE = 76;
/** Each face's column: the face plus a little air, so names have room. */
const SLOT = FACE + spacing.md;
/** Room over the faces for a bot's bubble, so the row's scroll view doesn't clip it. */
export const BUBBLE_ROOM = 32;

/** The row: faces side by side, scrolling sideways edge to edge. `top` leaves room above for bubbles. */
export function FaceRow({ children, top = spacing.xs }: { children: ReactNode; top?: number }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -spacing.md }}
      contentContainerStyle={{ gap: spacing.xs, paddingHorizontal: spacing.md, paddingTop: top, paddingBottom: spacing.xxs }}
    >
      {children}
    </ScrollView>
  );
}

/**
 * One face: the emoji in a round cell, the name under it, and whatever sits on it (rings behind, a pill on the
 * bottom edge, a bubble above). Tapping it presses like a button.
 */
export function Face({
  emoji,
  name,
  label,
  onPress,
  ring,
  pill,
  bubble,
  dim,
  selected,
}: {
  emoji: string;
  name: string;
  label: string;
  onPress?: () => void;
  /** Rings behind the face. */
  ring?: ReactNode;
  /** A pill over the face's bottom edge. */
  pill?: ReactNode;
  /** A bubble over the face. */
  bubble?: ReactNode;
  /** Quieter: a face you can't tap right now. */
  dim?: boolean;
  /** An outline in this colour: invited or joined. */
  selected?: string;
}) {
  const colors = useColors();
  const face = (
    <View style={{ width: SLOT, alignItems: 'center', gap: spacing.xs, opacity: dim ? 0.45 : 1 }}>
      <View style={{ width: FACE, height: FACE, alignItems: 'center', justifyContent: 'center' }}>
        {ring}
        <View
          style={{
            width: FACE,
            height: FACE,
            borderRadius: FACE / 2,
            backgroundColor: colors.cell,
            borderWidth: 3,
            borderColor: selected ?? 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text maxFontSizeMultiplier={1} style={{ fontSize: 44, lineHeight: 52 }}>
            {emoji}
          </Text>
        </View>
        {pill && <View style={{ position: 'absolute', bottom: -spacing.xs, alignItems: 'center', left: -spacing.md, right: -spacing.md }}>{pill}</View>}
        {bubble && <View pointerEvents="none" style={{ position: 'absolute', top: -spacing.xxs, left: -60, right: -60, height: 0 }}>{bubble}</View>}
      </View>
      <ThemedText variant="subhead" numberOfLines={1} style={{ fontWeight: '600', maxWidth: SLOT, marginTop: pill ? spacing.xxs : 0 }}>
        {name}
      </ThemedText>
    </View>
  );
  if (!onPress) return <View accessibilityLabel={label}>{face}</View>;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
    >
      {face}
    </PressableScale>
  );
}

/** The add circle at the end of the bots row: a dashed ring with a plus. */
export function AddFace({ label, name, onPress, tint }: { label: string; name: string; onPress: () => void; tint: string }) {
  const colors = useColors();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
    >
      <View style={{ width: SLOT, alignItems: 'center', gap: spacing.xs }}>
        <View
          style={{
            width: FACE,
            height: FACE,
            borderRadius: FACE / 2,
            borderWidth: 2.5,
            borderStyle: 'dashed',
            borderColor: tint,
            backgroundColor: colors.cell,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="plus" size={30} color={tint} />
        </View>
        <ThemedText variant="subhead" tone="secondaryLabel" numberOfLines={1} style={{ fontWeight: '600' }}>
          {name}
        </ThemedText>
      </View>
    </PressableScale>
  );
}

/** How long one ring takes to grow and fade, and the gap between rings. Three rings: done in about three seconds. */
const RING_MS = 1600;
const RING_GAP = 520;

/**
 * Rings rippling out of a face for about three seconds, each time `play` goes up: three in turn, each growing from
 * the face's edge to nearly twice its size as it fades. Transform and opacity only, on the UI thread. Nothing under
 * Reduce Motion (the pill still says what happened).
 */
export function Ripples({ play, color }: { play: number; color: string }) {
  const reduce = useReduceMotion();
  if (reduce || play < 1) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', width: FACE, height: FACE }}>
      {[0, 1, 2].map((i) => (
        <Ring key={`${play}-${i}`} delay={i * RING_GAP} color={color} />
      ))}
    </View>
  );
}

function Ring({ delay, color }: { delay: number; color: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(delay, withTiming(1, { duration: RING_MS, easing: Easing.out(Easing.cubic) })));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({
    opacity: t.get() === 0 ? 0 : 0.85 * (1 - t.get()),
    transform: [{ scale: 1 + 0.85 * t.get() }],
  }));
  return <Animated.View style={[{ position: 'absolute', width: FACE, height: FACE, borderRadius: FACE / 2, borderWidth: 3, borderColor: color }, style]} />;
}

/** Wide enough for the longest word the pill says, so it never changes size as the dots come and go. */
const PILL_W = 84;

/**
 * The pill on a face: "Invited" with three dots that fill in one, two, three and start again (the dots that aren't
 * on yet keep their place, so the pill never changes size), "Joined", or a word that shows for a moment.
 */
export function StatusPill({ text, color, dots }: { text: string; color: string; dots?: boolean }) {
  const colors = useColors();
  return (
    <View
      accessibilityLabel={dots ? `${text}, waiting` : text}
      style={{
        width: PILL_W,
        height: 24,
        borderRadius: radius.full,
        backgroundColor: color,
        borderWidth: 2,
        borderColor: colors.background,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text maxFontSizeMultiplier={1} numberOfLines={1} style={{ fontSize: 12, lineHeight: 15, fontWeight: '800', color: colors.onColor, fontVariant: ['tabular-nums'] }}>
        {text}
      </Text>
      {dots && <Dots color={colors.onColor as string} />}
    </View>
  );
}

/** Three dots that come on one by one, a step every 0.45s, on the UI thread. All three, still, under Reduce Motion. */
function Dots({ color }: { color: string }) {
  const reduce = useReduceMotion();
  const step = useSharedValue(3);
  useEffect(() => {
    if (reduce) {
      step.set(3);
      return;
    }
    step.set(0);
    step.set(withRepeat(withTiming(3, { duration: 1350, easing: Easing.linear }), -1, false));
  }, [reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={{ width: 15, flexDirection: 'row', alignItems: 'flex-end', gap: 2, paddingLeft: 2, height: 10 }}>
      {[0, 1, 2].map((i) => (
        <Dot key={i} i={i} step={step} color={color} />
      ))}
    </View>
  );
}

function Dot({ i, step, color }: { i: number; step: SharedValue<number>; color: string }) {
  const style = useAnimatedStyle(() => ({ opacity: Math.floor(step.get()) >= i || step.get() >= 3 ? 1 : 0 }));
  return <Animated.View style={[{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: color, marginBottom: 1 }, style]} />;
}

/** The small BOT pill, just over the bottom edge of a bot's face. */
export function BotPill() {
  const colors = useColors();
  return (
    <View style={{ height: 18, paddingHorizontal: 7, borderRadius: radius.full, backgroundColor: colors.label, borderWidth: 2, borderColor: colors.background, justifyContent: 'center' }}>
      <Text maxFontSizeMultiplier={1} style={{ fontSize: 10, lineHeight: 12, fontWeight: '800', letterSpacing: 0.6, color: colors.background as string }}>
        BOT
      </Text>
    </View>
  );
}

/** What a bot is saying over its face: the typing dots, then its line through the table's own bubble. */
export function FaceBubble({ say }: { say: { typing: boolean; message: Message | null } }) {
  return <Thread talk={{ typing: say.typing, shown: say.message ? [say.message] : [] }} room={150} place={pinned('center')} />;
}

/** The colours of the rows' moments: violet to invite, the app's one green for joined (the owner asked for green here). */
export const RING = { invited: brand.violetDark, joined: brand.raise } as const;

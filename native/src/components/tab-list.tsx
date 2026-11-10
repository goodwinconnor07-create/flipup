// The pieces the three tabs share, after Flighty's My Flights, Friends and Passport: pill tabs with one blue action
// beside them, plain list rows (a small grey line, a big title, a line of detail), a live dot, a thin divider and a
// quiet empty state. White page, no cards, no colour but the blue.
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import { useIsFocused } from 'expo-router';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { EASE_IN_OUT, EASE_OUT } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { brand, motion, spacing, useColors, useScheme } from '@/theme';

import { haptic } from './haptics';
import { Icon } from './icon';
import { PressableScale } from './pressable-scale';

/** Flighty's text sizes, in points: the pills and the action, a row's small line, a row's title. */
export const SIZE = { pill: 17, small: 15, title: 20 } as const;

/**
 * Pill tabs (Flighty's Everyone / Today): the chosen one sits in a soft white capsule, the rest are grey words.
 * The capsule slides to the tab you pick (one object moving, rule 20), or jumps under Reduce Motion. `action` goes
 * after the tabs on the same line (the blue + button).
 */
export function PillTabs<T extends string>({ tabs, value, onChange, action }: { tabs: { id: T; label: string }[]; value: T; onChange: (id: T) => void; action?: ReactNode }) {
  const colors = useColors();
  const dark = useScheme() === 'dark';
  const reduce = useReduceMotion();
  const [frames, setFrames] = useState<Partial<Record<T, { x: number; w: number }>>>({});
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const at = frames[value];
  useEffect(() => {
    if (!at) return;
    // The first placement never animates; after that the capsule glides.
    const first = w.get() === 0;
    const go = (v: number) => (first || reduce ? v : withTiming(v, { duration: motion.base, easing: EASE_OUT }));
    x.set(go(at.x));
    w.set(go(at.w));
  }, [at, reduce, x, w]);
  const capsule = useAnimatedStyle(() => ({ width: w.get(), transform: [{ translateX: x.get() }], opacity: w.get() > 0 ? 1 : 0 }));
  const measure = (id: T) => (e: LayoutChangeEvent) => {
    const { x: px, width } = e.nativeEvent.layout;
    setFrames((f) => (f[id]?.x === px && f[id]?.w === width ? f : { ...f, [id]: { x: px, w: width } }));
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -spacing.sm - 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }} accessibilityRole="tablist">
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 999, borderCurve: 'continuous', backgroundColor: dark ? '#2c2c2e' : '#ffffff', boxShadow: dark ? undefined : '0 3px 14px rgba(0, 0, 0, 0.09)' },
            capsule,
          ]}
        />
        {tabs.map((t) => {
          const on = t.id === value;
          return (
            <Pressable
              key={t.id}
              onLayout={measure(t.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => {
                if (on) return;
                haptic.select();
                onChange(t.id);
              }}
              style={{ minHeight: 40, paddingHorizontal: spacing.md, justifyContent: 'center' }}
            >
              <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontSize: SIZE.pill, fontWeight: on ? '500' : '400', color: on ? colors.label : colors.secondaryLabel }}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {action ? <View style={{ marginLeft: spacing.xs }}>{action}</View> : null}
    </View>
  );
}

/** The blue action beside the pills (Flighty's "+ Add Friend"): a filled blue circle with a plus, and the words. */
export function PlusAction({ label }: { label: string }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 40, paddingHorizontal: spacing.xxs }}>
      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="plus" size={14} color="#ffffff" weight="bold" />
      </View>
      <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontSize: SIZE.pill, fontWeight: '500', color: colors.accent }}>
        {label}
      </Text>
    </View>
  );
}

/** The same action as a plain button. */
export function PlusButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
      <PlusAction label={label} />
    </PressableScale>
  );
}

/**
 * A green dot that slowly blinks: this game is going on now. It stops while the tab is out of sight, and holds
 * still under Reduce Motion.
 */
export function LiveDot({ size = 8 }: { size?: number }) {
  const reduce = useReduceMotion();
  const focused = useIsFocused();
  const o = useSharedValue(1);
  useEffect(() => {
    if (reduce || !focused) {
      cancelAnimation(o);
      o.set(1);
      return;
    }
    o.set(withRepeat(withTiming(0.25, { duration: 900, easing: EASE_IN_OUT }), -1, true));
    return () => cancelAnimation(o);
  }, [reduce, focused, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.get() }));
  return <Animated.View accessible={false} style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: brand.raise }, style]} />;
}

/**
 * One row, as in Flighty's Past Flights: a picture on the left, then a small grey line with something on its right
 * (a day, a hand number), a big title, and a line of detail under it. `tint` colours the title (blue for a game going
 * on now); `dim` greys out the whole row a little (a game that's over). It highlights while pressed, as list rows do.
 */
export function ListRow({
  leading,
  eyebrow,
  eyebrowLead,
  when,
  title,
  tint,
  detail,
  dim,
  separator,
  label,
  onPress,
}: {
  leading: ReactNode;
  eyebrow: string;
  /** Drawn before the small line (the live dot). */
  eyebrowLead?: ReactNode;
  /** Right of the small line: a day, or Flighty's two-part status ("Arrived 20m late"). */
  when?: ReactNode;
  title: string;
  tint?: string;
  detail?: ReactNode;
  dim?: boolean;
  /** A hairline under the text, as between rows of one list. */
  separator?: boolean;
  label: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: -spacing.md, paddingLeft: spacing.md, backgroundColor: pressed ? colors.cellPressed : 'transparent' })}
    >
      <View style={{ opacity: dim ? 0.55 : 1 }}>{leading}</View>
      <View style={{ flex: 1, paddingVertical: 14, paddingRight: spacing.md, gap: 3, borderBottomWidth: separator ? 0.5 : 0, borderBottomColor: colors.separator }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          {eyebrowLead}
          <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ flex: 1, fontSize: SIZE.small, color: colors.secondaryLabel, fontWeight: '500' }}>
            {eyebrow}
          </Text>
          {when && typeof when !== 'string' ? when : when ? (
            <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontSize: SIZE.small, color: colors.secondaryLabel, fontVariant: ['tabular-nums'] }}>
              {when}
            </Text>
          ) : null}
        </View>
        <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontSize: SIZE.title, lineHeight: 25, fontWeight: '600', color: tint ?? (dim ? colors.secondaryLabel : colors.label) }}>
          {title}
        </Text>
        {detail}
      </View>
    </Pressable>
  );
}

/** The very thin line between what's going on now and what's over. Edge to edge, so it reads as a break. */
export function ListDivider() {
  const colors = useColors();
  return <View style={{ height: 0.5, marginHorizontal: -spacing.md, marginVertical: spacing.xs, backgroundColor: colors.separator }} />;
}

/** Flighty's "2026 ......... 8 FLIGHTS" over a list. */
export function ListHeader({ title, count }: { title: string; count?: string }) {
  const colors = useColors();
  return (
    <View accessibilityRole="header" style={{ flexDirection: 'row', alignItems: 'baseline', paddingTop: spacing.md, paddingBottom: spacing.xs, borderBottomWidth: 0.5, borderBottomColor: colors.separator, marginHorizontal: -spacing.md, paddingHorizontal: spacing.md }}>
      <Text maxFontSizeMultiplier={1.3} style={{ flex: 1, fontSize: SIZE.title, fontWeight: '600', color: colors.label }}>
        {title}
      </Text>
      {count ? (
        <Text maxFontSizeMultiplier={1.3} style={{ fontSize: SIZE.small, fontWeight: '600', letterSpacing: 0.4, color: colors.secondaryLabel, textTransform: 'uppercase' }}>
          {count}
        </Text>
      ) : null}
    </View>
  );
}

/** Flighty's empty page: a bold grey line and a plain one, in the middle of the page. */
export function EmptyState({ title, line }: { title: string; line: string }) {
  const colors = useColors();
  return (
    <View style={{ alignItems: 'center', gap: 4, paddingTop: 180, paddingBottom: spacing.xxl, paddingHorizontal: spacing.md }}>
      <Text maxFontSizeMultiplier={1.3} style={{ fontSize: SIZE.title - 2, fontWeight: '600', color: colors.secondaryLabel, textAlign: 'center' }}>
        {title}
      </Text>
      <Text maxFontSizeMultiplier={1.3} style={{ fontSize: SIZE.pill, lineHeight: 23, color: colors.secondaryLabel, textAlign: 'center' }}>
        {line}
      </Text>
    </View>
  );
}
